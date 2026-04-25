"""Parse course prerequisite text into requirement groups and edges."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL is not set.")

COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,10})\s*[- ]?\s*(\d{3}[A-Z]?)\b", re.IGNORECASE)
NON_COURSE_SUBJECTS = {"ADDITIONAL", "AND", "ANY", "BOTH", "EITHER", "ONE", "OR"}


@dataclass
class ParsedGroup:
    group_type: str  # ALL_OF, ANY_OF, PREREQ, COREQ, UNKNOWN
    relation_type: str  # PREREQ or COREQ
    course_codes: List[str]
    requirement_texts: List[str] = field(default_factory=list)
    display_label: Optional[str] = None
    raw_fragment: Optional[str] = None
    visual_style: Optional[str] = None
    item_order: list[int] = field(default_factory=list)


@dataclass
class ParsedPath:
    path_label: str
    groups: list[ParsedGroup]


def split_requirement_fragments(text: str) -> list[str]:
    """Split a large prerequisite string into smaller pieces."""
    if not text:
        return []

    fragments = [part.strip() for part in text.split(";")]
    return [fragment for fragment in fragments if fragment]


def normalize_fragment_prefix(text: str) -> str:
    """Remove leading conjunction noise from a fragment."""
    if not text:
        return ""

    normalized = normalize_text(text).strip(" ,")
    normalized = re.sub(r"^(and|or)\s+", "", normalized, flags=re.IGNORECASE)
    return normalized.strip(" ,")


def split_mixed_logic_fragment(text: str) -> list[str]:
    """
    Split simple mixed logic like "A or B, and C" into separate top-level groups.

    This keeps the parser intentionally lightweight while preserving the common
    pattern of an OR choice that is additionally required alongside another
    prerequisite.
    """
    if not text:
        return []

    normalized = normalize_fragment_prefix(text)
    lowered = normalized.lower()

    if " and " not in lowered:
        return [normalized]

    if " or " not in lowered and "one of" not in lowered:
        return [normalized]

    one_of_split = re.match(
        r"^(?P<prefix>.+?),\s+and\s+(?P<suffix>one of .+)$",
        normalized,
        flags=re.IGNORECASE,
    )
    if one_of_split:
        return [
            one_of_split.group("prefix").strip(" ,"),
            one_of_split.group("suffix").strip(" ,"),
        ]

    parts = [
        normalize_fragment_prefix(part)
        for part in re.split(r"(?:,\s+|\s+)and\s+", normalized, flags=re.IGNORECASE)
        if part.strip(" ,")
    ]

    return parts if len(parts) > 1 else [normalized]


def expand_shortened_course_codes(text: str) -> str:
    """
    Expand shortened course references.

    Examples:
    - CMPUT 201 or 275 -> CMPUT 201 or CMPUT 275
    - MATH 100, 114, 117 -> MATH 100, MATH 114, MATH 117
    """
    tokens = re.split(r"(,|\bor\b|\band\b)", text, flags=re.IGNORECASE)

    last_subject = None
    expanded = []

    for token in tokens:
        stripped = token.strip()

        full_match = re.match(
            r"^(?:(one of|both|either)\s+)?([A-Z]{2,10})\s+(\d{3}[A-Z]?)$",
            stripped,
            re.IGNORECASE,
        )

        short_match = re.match(
            r"^(\d{3}[A-Z]?)$",
            stripped,
            re.IGNORECASE,
        )

        prefixed_short_match = re.match(
            r"^(both|either)\s+(\d{3}[A-Z]?)$",
            stripped,
            re.IGNORECASE,
        )

        if prefixed_short_match and last_subject:
            expanded.append(
                f"{prefixed_short_match.group(1).lower()} {last_subject} {prefixed_short_match.group(2).upper()}"
            )
        elif full_match:
            prefix = full_match.group(1)
            last_subject = full_match.group(2).upper()
            expanded_code = f"{last_subject} {full_match.group(3).upper()}"
            if prefix:
                expanded.append(f"{prefix.lower()} {expanded_code}")
            else:
                expanded.append(expanded_code)
        elif short_match and last_subject:
            expanded.append(f"{last_subject} {short_match.group(1).upper()}")
        else:
            full_codes_in_token = [
                match
                for match in COURSE_CODE_RE.findall(stripped)
                if match[0].upper() not in NON_COURSE_SUBJECTS
            ]
            if full_codes_in_token:
                last_subject = full_codes_in_token[-1][0].upper()
            expanded.append(token)

    return " ".join(expanded)


def normalize_text(text: Optional[str]) -> str:
    """Normalize whitespace, phrases, and course code formatting."""
    if not text:
        return ""

    t = text.strip()
    t = t.replace("\xa0", " ")
    t = re.sub(r"\s+", " ", t)
    t = re.split(r"\bNote\s*:", t, maxsplit=1, flags=re.IGNORECASE)[0]
    t = re.split(r"\bCredit will be granted\b", t, maxsplit=1, flags=re.IGNORECASE)[0]
    t = re.split(r"\bCredit (?:can|may) be (?:obtained|granted)\b", t, maxsplit=1, flags=re.IGNORECASE)[0]
    t = t.strip(" .;")

    t = re.sub(r"\bone\s+of\b", "one of", t, flags=re.IGNORECASE)
    t = re.sub(r"\bco[\- ]?requisite[s]?\b", "co-requisite", t, flags=re.IGNORECASE)
    t = re.sub(r"\bprerequisite[s]?\b", "prerequisite", t, flags=re.IGNORECASE)

    t = re.sub(r"\b([A-Z]{2,10})\s*[- ]?(\d{3}[A-Z]?)\b", r"\1 \2", t, flags=re.IGNORECASE)

    return t.strip()


def canonical_course_code(subject: str, number: str) -> str:
    """Return a standardized subject-number course code."""
    return f"{subject.upper()} {number.upper()}"


def extract_course_codes(text: str) -> List[str]:
    """Extract unique course codes from freeform text while preserving order."""
    seen = set()
    results = []

    for subject, number in COURSE_CODE_RE.findall(text):
        if subject.upper() in NON_COURSE_SUBJECTS:
            continue

        code = canonical_course_code(subject, number)
        if code not in seen:
            seen.add(code)
            results.append(code)

    return results


def extract_requirement_texts(text: str) -> List[str]:
    """Extract generic non-course requirements that should still appear in the graph."""
    requirements = []

    for match in re.finditer(
        r"\b(a|an|any|one)\s+(\d00)-level\s+(Computing Science|[A-Z]{2,10})\s+course\b",
        text,
        flags=re.IGNORECASE,
    ):
        subject = match.group(3)
        subject_label = subject.upper() if subject.isupper() else subject
        quantity_label = "One" if match.group(1).lower() == "one" else "Any"
        requirements.append(f"{quantity_label} {match.group(2)}-level {subject_label} course")

    for match in re.finditer(
        r"\ban\s+additional\s+(\d00)-level\s+course\s+in\s+any\s+of\s+the\s+following\s+(.+)$",
        text,
        flags=re.IGNORECASE,
    ):
        subject_list = match.group(2).strip(" .")
        subject_list = re.sub(r"\s*,\s*", ", ", subject_list)
        subject_list = re.sub(r"\s+", " ", subject_list)
        requirements.append(f"Additional {match.group(1)}-level course in {subject_list}")

    return requirements


def split_coreq_from_prereq(prereq_text: str, coreq_text: str) -> tuple[str, str]:
    """Normalize prerequisite and corequisite text fields."""
    prereq = normalize_text(prereq_text or "")
    coreq = normalize_text(coreq_text or "")
    return prereq, coreq


def infer_group_display_label(group_type: str, relation_type: str, lowered_text: str) -> str:
    """Return a consistent frontend-friendly display label."""
    if group_type == "PREREQ":
        return "PREREQ"

    if relation_type == "COREQ":
        return "COREQ"

    if group_type == "ANY_OF":
        return "ANY_OF"

    if group_type == "ALL_OF":
        return "ALL_OF"

    if group_type == "COREQ":
        return "COREQ"

    return "UNKNOWN"


def infer_visual_style(group_type: str, relation_type: str, lowered_text: str, course_count: int) -> str:
    """Store a lightweight visual classification for frontend rendering."""
    if relation_type == "COREQ":
        return "coreq"

    if group_type == "ANY_OF":
        return "or"

    if group_type == "ALL_OF":
        if course_count == 1:
            return "single"
        return "and"

    return "unknown"


def parse_fragment(text: str, relation_type: str) -> list[ParsedGroup]:
    """
    Parse a single requirement fragment into one ParsedGroup.

    Handles simple single-fragment logic:
    - CMPUT 174
    - CMPUT 174 and CMPUT 175
    - CMPUT 174 or CMPUT 274
    - one of MATH 100, 114, 117
    """
    groups: list[ParsedGroup] = []

    if not text:
        return groups

    normalized = normalize_fragment_prefix(text)
    normalized = expand_shortened_course_codes(normalized)

    lowered = normalized.lower()
    course_codes = extract_course_codes(normalized)
    requirement_texts = extract_requirement_texts(normalized)
    item_order = list(range(len(course_codes) + len(requirement_texts)))

    if not course_codes and not requirement_texts:
        groups.append(
            ParsedGroup(
                group_type="UNKNOWN",
                relation_type=relation_type,
                course_codes=[],
                display_label="unknown",
                raw_fragment=normalized,
                visual_style="unknown",
                item_order=[],
            )
        )
        return groups

    if requirement_texts and not course_codes:
        single_group_type = "COREQ" if relation_type == "COREQ" else "PREREQ"
        groups.append(
            ParsedGroup(
                group_type=single_group_type,
                relation_type=relation_type,
                course_codes=[],
                requirement_texts=requirement_texts,
                display_label=infer_group_display_label(single_group_type, relation_type, lowered),
                raw_fragment=normalized,
                visual_style="requirement",
                item_order=item_order,
            )
        )
        return groups

    if "one of" in lowered:
        groups.append(
            ParsedGroup(
                group_type="ANY_OF",
                relation_type=relation_type,
                course_codes=course_codes,
                requirement_texts=requirement_texts,
                display_label="ANY_OF",
                raw_fragment=normalized,
                visual_style="or",
                item_order=item_order,
            )
        )
        return groups

    if re.search(r"\bor\b", lowered):
        groups.append(
            ParsedGroup(
                group_type="ANY_OF",
                relation_type=relation_type,
                course_codes=course_codes,
                requirement_texts=requirement_texts,
                display_label="ANY_OF",
                raw_fragment=normalized,
                visual_style="or",
                item_order=item_order,
            )
        )
        return groups

    if re.search(r"\band\b", lowered):
        groups.append(
            ParsedGroup(
                group_type="ALL_OF",
                relation_type=relation_type,
                course_codes=course_codes,
                requirement_texts=requirement_texts,
                display_label="ALL_OF",
                raw_fragment=normalized,
                visual_style="and",
                item_order=item_order,
            )
        )
        return groups

    if len(course_codes) > 1:
        groups.append(
            ParsedGroup(
                group_type="ALL_OF",
                relation_type=relation_type,
                course_codes=course_codes,
                requirement_texts=requirement_texts,
                display_label="ALL_OF",
                raw_fragment=normalized,
                visual_style="and",
                item_order=item_order,
            )
        )
        return groups

    if len(course_codes) == 1:
        single_group_type = "COREQ" if relation_type == "COREQ" else "PREREQ"

        groups.append(
            ParsedGroup(
                group_type=single_group_type,
                relation_type=relation_type,
                course_codes=course_codes,
                requirement_texts=requirement_texts,
                display_label=infer_group_display_label(single_group_type, relation_type, lowered),
                raw_fragment=normalized,
                visual_style=infer_visual_style(single_group_type, relation_type, lowered, len(course_codes)),
                item_order=item_order,
            )
        )
        return groups

    return groups


def parse_requirement_paths(text: str, relation_type: str) -> list[ParsedPath]:
    """
    Parse an entire prerequisite sentence into one or more paths.

    Intentionally lightweight:
    - returns one path
    - delegates mixed logic splitting to split_mixed_logic_fragment()
    """
    if not text:
        return []

    normalized = normalize_text(text)
    if re.search(r"\bis restricted to students\b", normalized, flags=re.IGNORECASE):
        return []

    normalized = expand_shortened_course_codes(normalized)
    groups = []
    for fragment in split_requirement_fragments(normalized):
        for subfragment in split_mixed_logic_fragment(fragment):
            groups.extend(parse_fragment(subfragment, relation_type))

    return [ParsedPath(path_label="Default Path", groups=groups)]


def determine_course_parse_status(
    prereq_groups: List[ParsedGroup],
    coreq_groups: List[ParsedGroup],
) -> str:
    """Classify parse results as parsed, partial, or unparsed."""
    all_groups = prereq_groups + coreq_groups

    has_known = any(g.group_type in {"ALL_OF", "ANY_OF", "PREREQ", "COREQ"} for g in all_groups)
    has_unknown = any(g.group_type == "UNKNOWN" for g in all_groups)
    has_items = any(len(g.course_codes) > 0 for g in all_groups)

    if has_known and not has_unknown:
        return "parsed"
    if has_items:
        return "partial"
    if not all_groups:
        return "parsed"

    return "unparsed"


def get_course_code_to_id(conn) -> dict[str, int]:
    """Build a lookup from normalized course code to database ID."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, code FROM courses")
        rows = cur.fetchall()

    mapping = {}
    for course_id, code in rows:
        if code:
            mapping[normalize_text(code).upper()] = course_id
    return mapping


def clear_existing_parse_data_for_course(conn, course_id: int) -> None:
    """Remove previously stored parse records for a target course."""
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM course_edges
            WHERE target_course_id = %s
            """,
            (course_id,),
        )

        cur.execute(
            """
            DELETE FROM requirement_items
            WHERE group_id IN (
                SELECT id FROM requirement_groups WHERE course_id = %s
            )
            """,
            (course_id,),
        )

        cur.execute(
            """
            DELETE FROM requirement_groups
            WHERE course_id = %s
            """,
            (course_id,),
        )


def ensure_requirement_item_schema(conn) -> None:
    """Allow requirement items to preserve unresolved course codes."""
    with conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE requirement_items
            ADD COLUMN IF NOT EXISTS missing_course_code TEXT
            """
        )
        cur.execute(
            """
            ALTER TABLE requirement_items
            ADD COLUMN IF NOT EXISTS requirement_text TEXT
            """
        )
        cur.execute(
            """
            ALTER TABLE requirement_items
            ALTER COLUMN required_course_id DROP NOT NULL
            """
        )


def insert_requirement_group(
    conn,
    course_id: int,
    group_type: str,
    parent_group_id: Optional[int],
    display_label: Optional[str],
    visual_style: Optional[str],
) -> int:
    """Insert a requirement group and return its new ID."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO requirement_groups (
                course_id,
                group_type,
                parent_group_id,
                display_label,
                visual_style
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (course_id, group_type, parent_group_id, display_label, visual_style),
        )
        return cur.fetchone()[0]


def insert_requirement_item(
    conn,
    group_id: int,
    required_course_id: Optional[int],
    relation_type: str,
    item_order: int,
    missing_course_code: Optional[str] = None,
    requirement_text: Optional[str] = None,
) -> None:
    """Insert a requirement item for a course within a group."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO requirement_items (
                group_id,
                required_course_id,
                relation_type,
                item_order,
                missing_course_code,
                requirement_text
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (group_id, required_course_id, relation_type, item_order, missing_course_code, requirement_text),
        )


def insert_course_edge(
    conn,
    source_course_id: int,
    target_course_id: int,
    edge_type: str,
    group_id: Optional[int],
    label: Optional[str],
) -> None:
    """Insert a graph edge from a required course to its target course."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO course_edges (
                source_course_id,
                target_course_id,
                edge_type,
                group_id,
                label
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (source_course_id, target_course_id, edge_type, group_id, label),
        )


def resolve_group_edge_type(group: ParsedGroup) -> str:
    """Map a parsed group to the convenience edge type stored in the database."""
    if group.relation_type == "COREQ":
        return "COREQ"
    if group.group_type == "ANY_OF":
        return "OR"
    return "PREREQ"


def _persist_group(
    conn,
    course_id: int,
    course_code: str,
    group: ParsedGroup,
    parent_group_id: Optional[int],
    code_to_id: dict[str, int],
) -> None:
    """Persist a single parsed group with its items and edges."""
    stored_group_type = "COREQ" if group.relation_type == "COREQ" else group.group_type

    display_label = group.display_label or infer_group_display_label(
        stored_group_type,
        group.relation_type,
        (group.raw_fragment or "").lower(),
    )

    visual_style = group.visual_style or infer_visual_style(
        stored_group_type,
        group.relation_type,
        (group.raw_fragment or "").lower(),
        len(group.course_codes),
    )

    group_id = insert_requirement_group(
        conn=conn,
        course_id=course_id,
        group_type=stored_group_type,
        parent_group_id=parent_group_id,
        display_label=display_label,
        visual_style=visual_style,
    )

    for index, code in enumerate(group.course_codes):
        required_course_id = code_to_id.get(code.upper())
        item_order = group.item_order[index] if index < len(group.item_order) else index

        if not required_course_id:
            # print(f"[MISSING REF'D COURSE FOR {course_code}] {code.upper()}")
            insert_requirement_item(
                conn=conn,
                group_id=group_id,
                required_course_id=None,
                relation_type=group.relation_type,
                item_order=item_order,
                missing_course_code=code.upper(),
            )
            continue

        if required_course_id == course_id:
            print(f"[SELF-EDGE DETECTED] {course_code} references itself as {code.upper()}")
            print(f"Parsed fragment: {group.raw_fragment}")
            raise SystemExit(1)

        insert_requirement_item(
            conn=conn,
            group_id=group_id,
            required_course_id=required_course_id,
            relation_type=group.relation_type,
            item_order=item_order,
        )

        insert_course_edge(
            conn=conn,
            source_course_id=required_course_id,
            target_course_id=course_id,
            edge_type=resolve_group_edge_type(group),
            group_id=group_id,
            label=display_label,
        )

    for requirement_index, requirement_text in enumerate(group.requirement_texts):
        insert_requirement_item(
            conn=conn,
            group_id=group_id,
            required_course_id=None,
            relation_type=group.relation_type,
            item_order=len(group.course_codes) + requirement_index,
            requirement_text=requirement_text,
        )


def persist_groups_for_course(
    conn,
    course_id: int,
    course_code: str,
    groups: List[ParsedGroup],
    code_to_id: dict[str, int],
) -> None:
    """Persist parsed requirement groups, items, and edges for a course."""
    prereq_groups = [
        g
        for g in groups
        if g.relation_type != "COREQ" and (g.course_codes or g.requirement_texts)
    ]
    coreq_groups = [g for g in groups if g.relation_type == "COREQ"]

    parent_prereq_id = None
    should_create_parent_all_of = len(prereq_groups) > 1

    if should_create_parent_all_of:
        parent_prereq_id = insert_requirement_group(
            conn=conn,
            course_id=course_id,
            group_type="ALL_OF",
            parent_group_id=None,
            display_label="ALL_OF",
            visual_style="and",
        )

    for group in prereq_groups:
        _persist_group(conn, course_id, course_code, group, parent_prereq_id, code_to_id)

    for group in coreq_groups:
        _persist_group(conn, course_id, course_code, group, None, code_to_id)


def parse_course_row(row: tuple):
    """
    Parse one course row from the database.

    Returns:
    - prereq_paths
    - coreq_paths
    - flattened prereq_groups
    - flattened coreq_groups
    - parse status
    """
    _, _, raw_prereq_text, raw_coreq_text = row

    prereq_text, coreq_text = split_coreq_from_prereq(
        raw_prereq_text or "",
        raw_coreq_text or "",
    )

    prereq_paths = parse_requirement_paths(prereq_text, relation_type="PREREQ")
    coreq_paths = parse_requirement_paths(coreq_text, relation_type="COREQ")

    prereq_groups = []
    for path in prereq_paths:
        prereq_groups.extend(path.groups)

    coreq_groups = []
    for path in coreq_paths:
        coreq_groups.extend(path.groups)

    status = determine_course_parse_status(prereq_groups, coreq_groups)

    return prereq_paths, coreq_paths, prereq_groups, coreq_groups, status


def update_course_parse_status(conn, course_id: int, status: str) -> None:
    """Store the parse status for a course."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE courses
            SET parse_status = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (status, course_id),
        )


def process_all_courses() -> None:
    """
    Parse requirement text for every course and persist the results.

    Supports:
    - prerequisite paths
    - multiple requirement groups
    - co-requisite groups
    - parse status tracking
    - group labels and visual hints
    - preserved item order
    """
    with psycopg.connect(DATABASE_URL) as conn:
        ensure_requirement_item_schema(conn)
        code_to_id = get_course_code_to_id(conn)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, code, raw_prereq_text, raw_coreq_text
                FROM courses
                ORDER BY code
                """
            )
            course_rows = cur.fetchall()

        parsed_count = 0
        partial_count = 0
        unparsed_count = 0

        for row in course_rows:
            course_id, course_code, _, _ = row

            (
                prereq_paths,
                coreq_paths,
                prereq_groups,
                coreq_groups,
                status,
            ) = parse_course_row(row)

            clear_existing_parse_data_for_course(conn, course_id)

            persist_groups_for_course(
                conn,
                course_id,
                course_code,
                prereq_groups + coreq_groups,
                code_to_id,
            )

            update_course_parse_status(conn, course_id, status)

            if status == "parsed":
                parsed_count += 1
            elif status == "partial":
                partial_count += 1
            else:
                unparsed_count += 1

            # if (status.upper()) == "PARTIAL":
            #     print(f"[{status.upper():8}] {course_code}")

        conn.commit()

        print("\nDone.")
        print(f"parsed:   {parsed_count}")
        print(f"partial:  {partial_count}")
        print(f"unparsed: {unparsed_count}")


test_cases = [
    "Prerequisite: CMPUT 174. Co-requisite: CMPUT 175",
    "Prerequisite: CMPUT 201 or 275. Credit may be obtained in only one of CMPUT 229, E E 380 or ECE 212.",
    "Credit may be obtained in only one of CMPUT 229, E E 380 or ECE 212.",
    "CMPUT 201 or 275, and 204, and any 300-level Computing Science course",
]


def run_parser_tests():
    """Print parser behavior for a few hard-coded sample cases."""
    for text in test_cases:
        print("\n" + "=" * 80)
        print("RAW:")
        print(text)

        prereq_text, coreq_text = split_coreq_from_prereq(text, "")

        prereq_paths = parse_requirement_paths(prereq_text, relation_type="PREREQ")
        coreq_paths = parse_requirement_paths(coreq_text, relation_type="COREQ")
        prereq_groups = [group for path in prereq_paths for group in path.groups]
        coreq_groups = [group for path in coreq_paths for group in path.groups]

        print("\nPREREQ TEXT:")
        print(prereq_text)

        print("\nCOREQ TEXT:")
        print(coreq_text)

        print("\nPARSED GROUPS:")
        for group in prereq_groups + coreq_groups:
            print(group)

        status = determine_course_parse_status(prereq_groups, coreq_groups)

        print("\nSTATUS:")
        print(status)


if __name__ == "__main__":
    process_all_courses()
    # run_parser_tests()
