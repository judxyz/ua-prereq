"""Recursive graph builder for frontend prerequisite tree payloads."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEFAULT_MAX_DEPTH = 1


@dataclass(frozen=True)
class CourseRecord:
    """Normalized course record used by the graph builder."""

    id: int
    code: str
    subject: str
    number: int | str | None
    title: str
    description: str | None
    other_notes: str | None
    raw_prereq_text: str | None
    raw_coreq_text: str | None
    catalog_url: str | None
    parse_status: str | None

@dataclass(frozen=True)
class GroupRecord:
    """Requirement group row."""

    id: int
    course_id: int
    group_type: str
    parent_group_id: int | None
    display_label: str | None
    visual_style: str | None


@dataclass(frozen=True)
class ItemRecord:
    """Requirement item row joined with referenced course metadata."""

    id: int
    group_id: int
    required_course_id: int
    relation_type: str
    item_order: int | None
    course_code: str
    course_subject: str
    course_number: int | str | None
    course_title: str
    course_parse_status: str | None

def normalize_course_code(code: str) -> str:
    """Normalize course code for lookup."""
    return code.upper().replace("-", " ").strip()



class GraphBuilder:
    """Build a recursive frontend graph payload for a selected course."""

    def __init__(self, conn, max_depth: int = DEFAULT_MAX_DEPTH, include_coreqs: bool = True):
        self.conn = conn
        # max_depth is course depth: root = 0, first prerequisite courses = 1.
        # Requirement group nodes keep their own visual depth but do not count
        # against this limit.
        self.max_depth = max_depth
        self.include_coreqs = include_coreqs

        self.nodes: list[dict[str, Any]] = []
        self.edges: list[dict[str, Any]] = []
        self.groups: list[dict[str, Any]] = []
        self.items: list[dict[str, Any]] = []

        self._seen_edge_ids: set[str] = set()
        self._seen_group_ids: set[int] = set()
        self._seen_item_ids: set[int] = set()
        self._node_instance_counter = 0
        self._edge_instance_counter = 0

        self._course_cache: dict[int, CourseRecord] = {}
        self._group_cache: dict[int, list[GroupRecord]] = {}
        self._subgroup_cache: dict[int, list[GroupRecord]] = {}
        self._item_cache: dict[int, list[ItemRecord]] = {}

    # --------------------------------------------------
    # Public API
    # --------------------------------------------------

    def build_from_code(self, code: str) -> dict[str, Any]:
        """Build the full graph payload starting from a course code."""
        normalized_code = normalize_course_code(code)
        root_course = self._fetch_course_by_code(normalized_code)

        if root_course is None:
            raise ValueError("Course not found")

        root_course_node_id = self._add_course_node(root_course, depth=0)
        self._expand_course(
            root_course,
            course_node_id=root_course_node_id,
            depth=0,
            course_depth=0,
            path={root_course.id},
        )

        return {
            "rootCourse": self._serialize_root_course(root_course),
            "groups": self.groups,
            "items": self.items,
            "nodes": self.nodes,
            "edges": self.edges,
            "rawPrerequisiteText": root_course.raw_prereq_text,
            "rawCorequisiteText": root_course.raw_coreq_text,
            "meta": {
                "maxDepth": self.max_depth,
                "includeCoreqs": self.include_coreqs,
            },
        }

    # --------------------------------------------------
    # Recursive expansion
    # --------------------------------------------------

    def _expand_course(
        self,
        course: CourseRecord,
        course_node_id: str,
        depth: int,
        course_depth: int,
        path: set[int],
    ) -> None:
        """
        Recursively expand requirement groups/items for a course.

        depth is the actual node depth of the current course node.
        course_depth counts only course-to-course prerequisite hops.

        Node depth pattern:
        - root course: 0
        - its groups: 1
        - direct required courses: 2
        - their groups: 3
        - their required courses: 4
        """
        if course_depth >= self.max_depth:
            return

        group_depth = depth + 1
        groups = self._fetch_groups_for_course(course.id)

        for group in groups:
            if group.group_type == "COREQ" and not self.include_coreqs:
                continue

            items = self._fetch_items_for_group(group.id)
            resolved_group_type = self._resolve_group_type(group, items)

            group_node_id = self._add_group_node(group, depth=group_depth, group_type=resolved_group_type)
            self._add_course_to_group_edge(course_node_id, group_node_id, resolved_group_type)
            self._expand_group_children(group, group_node_id, group_depth, course_depth, path)

    def _expand_group_children(
        self,
        group: GroupRecord,
        group_node_id: str,
        group_depth: int,
        course_depth: int,
        path: set[int],
    ) -> None:
        """Recursively expand a group's children: subgroups or direct course items."""
        items = self._fetch_items_for_group(group.id)
        subgroups = self._fetch_subgroups_for_group(group.id)
        child_course_depth = course_depth + 1

        if subgroups:
            for subgroup in subgroups:
                if subgroup.group_type == "COREQ" and not self.include_coreqs:
                    continue
                sub_items = self._fetch_items_for_group(subgroup.id)
                resolved_sub_type = self._resolve_group_type(subgroup, sub_items)
                subgroup_node_id = self._add_group_node(
                    subgroup, depth=group_depth + 1, group_type=resolved_sub_type
                )
                self._add_group_to_subgroup_edge(group_node_id, subgroup_node_id, resolved_sub_type)
                self._expand_group_children(subgroup, subgroup_node_id, group_depth + 1, course_depth, path)
        else:
            for item in items:
                if item.relation_type == "COREQ" and not self.include_coreqs:
                    continue
                if child_course_depth > self.max_depth:
                    continue
                child_course = self._fetch_course_by_id(item.required_course_id)
                if child_course is None:
                    continue
                self._add_item(item)
                child_course_node_id = self._add_course_node(child_course, depth=group_depth + 1)
                self._add_group_to_course_edge(group_node_id, child_course_node_id, item.id, item.relation_type)
                if child_course.id in path:
                    continue
                next_path = set(path)
                next_path.add(child_course.id)
                self._expand_course(
                    child_course,
                    course_node_id=child_course_node_id,
                    depth=group_depth + 1,
                    course_depth=child_course_depth,
                    path=next_path,
                )

    # --------------------------------------------------
    # Database fetches
    # --------------------------------------------------

    def _fetch_course_by_code(self, normalized_code: str) -> CourseRecord | None:
        """Fetch course by normalized code."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    code,
                    subject,
                    number,
                    title,
                    description,
                    other_notes,
                    raw_prereq_text,
                    raw_coreq_text,
                    catalog_url,
                    parse_status
                FROM courses
                WHERE UPPER(code) = %s
                """,
                (normalized_code,),
            )
            row = cur.fetchone()

        if row is None:
            return None

        return CourseRecord(*row)

    def _fetch_course_by_id(self, course_id: int) -> CourseRecord | None:
        """Fetch course by ID with caching."""
        if course_id in self._course_cache:
            return self._course_cache[course_id]

        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    code,
                    subject,
                    number,
                    title,
                    description,
                    other_notes,
                    raw_prereq_text,
                    raw_coreq_text,
                    catalog_url,
                    parse_status
                FROM courses
                WHERE id = %s
                """,
                (course_id,),
            )
            row = cur.fetchone()

        if row is None:
            return None

        course = CourseRecord(*row)
        self._course_cache[course_id] = course
        return course

    def _fetch_groups_for_course(self, course_id: int) -> list[GroupRecord]:
        """Fetch top-level requirement groups (no parent) for a course."""
        if course_id in self._group_cache:
            return self._group_cache[course_id]

        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    course_id,
                    group_type,
                    parent_group_id,
                    display_label,
                    visual_style
                FROM requirement_groups
                WHERE course_id = %s AND parent_group_id IS NULL
                ORDER BY id
                """,
                (course_id,),
            )
            rows = cur.fetchall()

        groups = [GroupRecord(*row) for row in rows]
        self._group_cache[course_id] = groups
        return groups

    def _fetch_subgroups_for_group(self, group_id: int) -> list[GroupRecord]:
        """Fetch child requirement groups for a parent group."""
        if group_id in self._subgroup_cache:
            return self._subgroup_cache[group_id]

        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    course_id,
                    group_type,
                    parent_group_id,
                    display_label,
                    visual_style
                FROM requirement_groups
                WHERE parent_group_id = %s
                ORDER BY id
                """,
                (group_id,),
            )
            rows = cur.fetchall()

        subgroups = [GroupRecord(*row) for row in rows]
        self._subgroup_cache[group_id] = subgroups
        return subgroups
    def _fetch_items_for_group(self, group_id: int) -> list[ItemRecord]:
        """Fetch all items for a requirement group."""
        if group_id in self._item_cache:
            return self._item_cache[group_id]

        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ri.id,
                    ri.group_id,
                    ri.required_course_id,
                    ri.relation_type,
                    ri.item_order,
                    c.code,
                    c.subject,
                    c.number,
                    c.title,
                    c.parse_status
                FROM requirement_items ri
                JOIN courses c
                    ON c.id = ri.required_course_id
                WHERE ri.group_id = %s
                ORDER BY ri.item_order NULLS LAST, ri.id
                """,
                (group_id,),
            )
            rows = cur.fetchall()

        items = [ItemRecord(*row) for row in rows]
        self._item_cache[group_id] = items
        return items

    # --------------------------------------------------
    # Serializers
    # --------------------------------------------------

    def _serialize_root_course(self, course: CourseRecord) -> dict[str, Any]:
        """Serialize root course payload."""
        return {
            "id": course.id,
            "code": course.code,
            "subject": course.subject,
            "number": course.number,
            "title": course.title,
            "description": course.description,
            "otherNotes": course.other_notes,
            "catalogUrl": course.catalog_url,
            "parseStatus": course.parse_status,
        }

    def _next_node_id(self, prefix: str, entity_id: int) -> str:
        """Create a unique node instance id for each occurrence in the graph."""
        self._node_instance_counter += 1
        return f"{prefix}-{entity_id}-instance-{self._node_instance_counter}"

    def _next_edge_id(self, prefix: str) -> str:
        """Create a unique edge instance id for each occurrence in the graph."""
        self._edge_instance_counter += 1
        return f"{prefix}-{self._edge_instance_counter}"

    def _make_course_node(self, course: CourseRecord, depth: int, node_id: str) -> dict[str, Any]:
        """Create frontend course node."""
        return {
            "id": node_id,
            "type": "course",
            "courseId": course.id,
            "code": course.code,
            "title": course.title,
            "subject": course.subject,
            "number": course.number,
            "parseStatus": course.parse_status,
            "depth": depth,
        }

    def _make_group_node(self, group: GroupRecord, depth: int, node_id: str) -> dict[str, Any]:
        """Create frontend group node."""
        return {
            "id": node_id,
            "type": "group",
            "groupId": group.id,
            "groupType": group.group_type,
            "label": group.display_label,
            "displayLabel": group.display_label,
            "visualStyle": group.visual_style,
            "depth": depth,
        }

    # --------------------------------------------------
    # Graph assembly helpers
    # --------------------------------------------------

    def _resolve_group_type(self, group: GroupRecord, items: list[ItemRecord]) -> str:
        """Map stored group types to the frontend-visible group type."""
        visible_items = [
            item
            for item in items
            if self.include_coreqs or item.relation_type != "COREQ"
        ]

        if group.group_type == "ALL_OF" and len(visible_items) == 1:
            return "PREREQ"

        return group.group_type

    def _resolve_group_label(self, group: GroupRecord, group_type: str) -> str | None:
        """Normalize emitted labels so legacy data matches current frontend wording."""
        if group_type in {"ALL_OF", "ANY_OF", "PREREQ", "COREQ"}:
            return group_type

        return group.display_label

    def _add_course_node(self, course: CourseRecord, depth: int) -> str:
        """Add a unique course node instance and return its node id."""
        node_id = self._next_node_id("course", course.id)
        node = self._make_course_node(course, depth, node_id)
        self.nodes.append(node)
        return node_id

    def _add_group_node(self, group: GroupRecord, depth: int, group_type: str) -> str:
        """Add a unique group node instance and return its node id."""
        node_id = self._next_node_id("group", group.id)
        display_label = self._resolve_group_label(group, group_type)

        if group.id not in self._seen_group_ids:
            self.groups.append(
                {
                    "id": group.id,
                    "nodeId": node_id,
                    "courseId": group.course_id,
                    "groupType": group_type,
                    "parentGroupId": group.parent_group_id,
                    "displayLabel": display_label,
                    "label": display_label,
                    "visualStyle": group.visual_style,
                }
            )
            self._seen_group_ids.add(group.id)

        group_node_data = GroupRecord(
            id=group.id,
            course_id=group.course_id,
            group_type=group_type,
            parent_group_id=group.parent_group_id,
            display_label=display_label,
            visual_style=group.visual_style,
        )
        node = self._make_group_node(group_node_data, depth, node_id)
        self.nodes.append(node)
        return node_id


    def _add_item(self, item: ItemRecord) -> None:
        """Add requirement item metadata if not already present."""
        if item.id in self._seen_item_ids:
            return

        self.items.append(
            {
                "id": item.id,
                "groupId": item.group_id,
                "requiredCourseId": item.required_course_id,
                "relationType": item.relation_type,
                "itemOrder": item.item_order,
                "course": {
                    "id": item.required_course_id,
                    "code": item.course_code,
                    "subject": item.course_subject,
                    "number": item.course_number,
                    "title": item.course_title,
                    "parseStatus": item.course_parse_status,
                },
            }
        )
        self._seen_item_ids.add(item.id)

    def _add_edge(self, edge: dict[str, Any]) -> None:
        """Add edge if not already present."""
        edge_id = edge["id"]
        if edge_id in self._seen_edge_ids:
            return

        self.edges.append(edge)
        self._seen_edge_ids.add(edge_id)

    def _add_course_to_group_edge(self, course_node_id: str, group_node_id: str, group_type: str) -> None:
        """Add root/parent course -> group edge."""
        relation_type = "COREQ" if group_type == "COREQ" else "PREREQ"

        self._add_edge(
            {
                "id": self._next_edge_id("edge-course-group"),
                "source": course_node_id,
                "target": group_node_id,
                "relationType": relation_type,
            }
        )

    def _add_group_to_course_edge(
        self,
        group_node_id: str,
        required_course_node_id: str,
        item_id: int,
        relation_type: str,
    ) -> None:
        """Add group -> required course edge."""
        self._add_edge(
            {
                "id": self._next_edge_id(f"edge-group-course-item-{item_id}"),
                "source": group_node_id,
                "target": required_course_node_id,
                "relationType": relation_type,
            }
        )

    def _add_group_to_subgroup_edge(
        self,
        parent_group_node_id: str,
        child_group_node_id: str,
        child_group_type: str,
    ) -> None:
        """Add parent group -> child subgroup edge."""
        relation_type = "COREQ" if child_group_type == "COREQ" else "PREREQ"
        self._add_edge(
            {
                "id": self._next_edge_id("edge-group-subgroup"),
                "source": parent_group_node_id,
                "target": child_group_node_id,
                "relationType": relation_type,
            }
        )
