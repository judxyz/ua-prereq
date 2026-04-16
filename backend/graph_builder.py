"""Recursive graph builder for frontend prerequisite tree payloads."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEFAULT_MAX_DEPTH = 3


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


def default_group_label(group_type: str) -> str:
    """Map group type to UI label."""
    mapping = {
        "ANY_OF": "or",
        "ALL_OF": "and",
        "COREQ": "coreq",
        "UNKNOWN": "unknown",
    }
    return mapping.get(group_type, group_type.lower())


class GraphBuilder:
    """Build a recursive frontend graph payload for a selected course."""

    def __init__(self, conn, max_depth: int = DEFAULT_MAX_DEPTH, include_coreqs: bool = True):
        self.conn = conn
        self.max_depth = max_depth
        self.include_coreqs = include_coreqs

        self.nodes: list[dict[str, Any]] = []
        self.edges: list[dict[str, Any]] = []
        self.groups: list[dict[str, Any]] = []
        self.items: list[dict[str, Any]] = []

        self._seen_node_ids: set[str] = set()
        self._seen_edge_ids: set[str] = set()
        self._seen_group_ids: set[int] = set()
        self._seen_item_ids: set[int] = set()

        self._course_cache: dict[int, CourseRecord] = {}
        self._group_cache: dict[int, list[GroupRecord]] = {}
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

        self._add_course_node(root_course, depth=0)
        self._expand_course(root_course, depth=0, path={root_course.id})

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

    def _expand_course(self, course: CourseRecord, depth: int, path: set[int]) -> None:
        """
        Recursively expand requirement groups/items for a course.

        depth is the actual node depth of the current course node.

        Node depth pattern:
        - root course: 0
        - its groups: 1
        - direct required courses: 2
        - their groups: 3
        - their required courses: 4
        """
        group_depth = depth + 1
        child_course_depth = depth + 2

        # If even the next group layer would exceed max_depth, stop.
        if group_depth > self.max_depth:
            return

        groups = self._fetch_groups_for_course(course.id)

        for group in groups:
            if group.group_type == "COREQ" and not self.include_coreqs:
                continue

            # Only add the group if it fits within max depth.
            if group_depth > self.max_depth:
                continue

            self._add_group_node(group, depth=group_depth)
            self._add_course_to_group_edge(course.id, group.id, group.group_type)

            items = self._fetch_items_for_group(group.id)

            for item in items:
                if item.relation_type == "COREQ" and not self.include_coreqs:
                    continue

                child_course = self._fetch_course_by_id(item.required_course_id)
                if child_course is None:
                    continue

                # Only add child course if it fits within max depth.
                if child_course_depth > self.max_depth:
                    continue

                self._add_item(item)
                self._add_course_node(child_course, depth=child_course_depth)
                self._add_group_to_course_edge(
                    group.id,
                    child_course.id,
                    item.id,
                    item.relation_type,
                )

                # Stop recursion on cycles.
                if child_course.id in path:
                    continue

                next_path = set(path)
                next_path.add(child_course.id)
                self._expand_course(child_course, depth=child_course_depth, path=next_path)
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
        """Fetch all requirement groups for a course."""
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
                WHERE course_id = %s
                ORDER BY id
                """,
                (course_id,),
            )
            rows = cur.fetchall()

        groups = [GroupRecord(*row) for row in rows]
        self._group_cache[course_id] = groups
        return groups
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

    def _make_course_node(self, course: CourseRecord, depth: int) -> dict[str, Any]:
        """Create frontend course node."""
        return {
            "id": f"course-{course.id}",
            "type": "course",
            "courseId": course.id,
            "code": course.code,
            "title": course.title,
            "subject": course.subject,
            "number": course.number,
            "depth": depth,
        }

    def _make_group_node(self, group: GroupRecord, depth: int) -> dict[str, Any]:
        """Create frontend group node."""
        return {
            "id": f"group-{group.id}",
            "type": "group",
            "groupId": group.id,
            "groupType": group.group_type,
            "label": group.display_label or default_group_label(group.group_type),
            "displayLabel": group.display_label,
            "visualStyle": group.visual_style,
            "depth": depth,
        }

    # --------------------------------------------------
    # Graph assembly helpers
    # --------------------------------------------------

    def _add_course_node(self, course: CourseRecord, depth: int) -> None:
        """Add course node if not already present."""
        node = self._make_course_node(course, depth)
        node_id = node["id"]

        if node_id in self._seen_node_ids:
            return

        self.nodes.append(node)
        self._seen_node_ids.add(node_id)

    def _add_group_node(self, group: GroupRecord, depth: int) -> None:
        """Add group metadata and node if not already present."""
        if group.id not in self._seen_group_ids:
            self.groups.append(
                {
                    "id": group.id,
                    "nodeId": f"group-{group.id}",
                    "courseId": group.course_id,
                    "groupType": group.group_type,
                    "parentGroupId": group.parent_group_id,
                    "displayLabel": group.display_label,
                    "label": group.display_label or default_group_label(group.group_type),
                    "visualStyle": group.visual_style,
                }
            )
            self._seen_group_ids.add(group.id)

        node = self._make_group_node(group, depth)
        node_id = node["id"]

        if node_id in self._seen_node_ids:
            return

        self.nodes.append(node)
        self._seen_node_ids.add(node_id)

        
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

    def _add_course_to_group_edge(self, course_id: int, group_id: int, group_type: str) -> None:
        """Add root/parent course -> group edge."""
        relation_type = "COREQ" if group_type == "COREQ" else "PREREQ"

        self._add_edge(
            {
                "id": f"edge-course-{course_id}-group-{group_id}",
                "source": f"course-{course_id}",
                "target": f"group-{group_id}",
                "relationType": relation_type,
            }
        )

    def _add_group_to_course_edge(
        self,
        group_id: int,
        required_course_id: int,
        item_id: int,
        relation_type: str,
    ) -> None:
        """Add group -> required course edge."""
        self._add_edge(
            {
                "id": f"edge-group-{group_id}-item-{item_id}",
                "source": f"group-{group_id}",
                "target": f"course-{required_course_id}",
                "relationType": relation_type,
            }
        )