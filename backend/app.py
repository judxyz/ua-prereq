"""FastAPI application for serving course and prerequisite graph data."""

# app.py
from __future__ import annotations

import os
from collections import defaultdict
from dotenv import load_dotenv

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL is not set.")


app = FastAPI(title="CMPUT Prerequisite Graph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    """Create a database connection using the configured database URL."""
    return psycopg.connect(DATABASE_URL)


# --------------------------------------------------
# Health
# --------------------------------------------------

@app.get("/health")
def health():
    """Return a simple health status payload for the API."""
    return {
        "status": "ok",
        "service": "cmput-prereq-api",
    }


# --------------------------------------------------
# Courses
# --------------------------------------------------

@app.get("/courses")
def get_courses():
    """List CMPUT courses with their codes and titles."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT code, title
                FROM courses
                WHERE subject = 'CMPUT'
                ORDER BY number
                """
            )

            rows = cur.fetchall()

    return [
        {
            "code": code,
            "title": title,
        }
        for code, title in rows
    ]


@app.get("/courses/{code}")
def get_course(code: str):
    """Fetch a single course by code."""
    normalized_code = code.upper().replace("-", " ")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    code,
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

    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    (
        course_id,
        code,
        title,
        description,
        other_notes,
        raw_prereq_text,
        raw_coreq_text,
        catalog_url,
        parse_status,
    ) = row

    return {
        "id": course_id,
        "code": code,
        "title": title,
        "description": description,
        "other_notes": other_notes,
        "raw_prereq_text": raw_prereq_text,
        "raw_coreq_text": raw_coreq_text,
        "catalog_url": catalog_url,
        "parse_status": parse_status,
    }


# --------------------------------------------------
# Graph
# --------------------------------------------------

@app.get("/graph/{code}")
def get_graph(code: str):
    """Build graph data for a course and its requirements."""
    normalized_code = code.upper().replace("-", " ")

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Get focus course
            cur.execute(
                """
                SELECT id, code, title, raw_prereq_text, raw_coreq_text
                FROM courses
                WHERE UPPER(code) = %s
                """,
                (normalized_code,),
            )

            focus_course = cur.fetchone()

            if not focus_course:
                raise HTTPException(status_code=404, detail="Course not found")

            focus_course_id, focus_code, focus_title, raw_prereq_text, raw_coreq_text = focus_course

            # Get requirement groups for this course
            cur.execute(
                """
                SELECT
                    rg.id,
                    rg.group_type,
                    rg.display_label
                FROM requirement_groups rg
                WHERE rg.course_id = %s
                ORDER BY rg.id
                """,
                (focus_course_id,),
            )

            group_rows = cur.fetchall()

            # Get edges + source courses
            cur.execute(
                """
                SELECT
                    ce.id,
                    ce.edge_type,
                    ce.group_id,
                    ce.label,
                    source.id,
                    source.code,
                    source.title
                FROM course_edges ce
                JOIN courses source
                    ON source.id = ce.source_course_id
                WHERE ce.target_course_id = %s
                ORDER BY ce.id
                """,
                (focus_course_id,),
            )

            edge_rows = cur.fetchall()

    nodes = []
    edges = []

    seen_nodes = set()

    # --------------------------------------------------
    # Add focus course node
    # --------------------------------------------------

    nodes.append(
        {
            "id": focus_code,
            "type": "course",
            "label": focus_code,
            "title": focus_title,
        }
    )
    seen_nodes.add(focus_code)

    # --------------------------------------------------
    # Add logic group nodes
    # --------------------------------------------------

    group_node_ids = {}

    for group_id, group_type, display_label in group_rows:
        node_id = f"group-{group_id}"

        group_node_ids[group_id] = node_id

        label = group_type.replace("_", " ")

        nodes.append(
            {
                "id": node_id,
                "type": "logic",
                "label": label,
                "groupType": group_type,
                "displayLabel": display_label,
            }
        )

    # --------------------------------------------------
    # Group edges by requirement group
    # --------------------------------------------------

    grouped_edges = defaultdict(list)

    for row in edge_rows:
        (
            edge_id,
            edge_type,
            group_id,
            label,
            source_course_id,
            source_code,
            source_title,
        ) = row

        grouped_edges[group_id].append(
            {
                "edge_id": edge_id,
                "edge_type": edge_type,
                "group_id": group_id,
                "label": label,
                "source_course_id": source_course_id,
                "source_code": source_code,
                "source_title": source_title,
            }
        )

    # --------------------------------------------------
    # Build graph nodes + edges
    # --------------------------------------------------

    for group_id, group_edges in grouped_edges.items():
        group_node_id = group_node_ids.get(group_id)

        # If no group exists somehow, connect directly to target course
        if not group_node_id:
            for item in group_edges:
                source_code = item["source_code"]

                if source_code not in seen_nodes:
                    nodes.append(
                        {
                            "id": source_code,
                            "type": "course",
                            "label": source_code,
                            "title": item["source_title"],
                        }
                    )
                    seen_nodes.add(source_code)

                edges.append(
                    {
                        "id": f"edge-{item['edge_id']}",
                        "source": source_code,
                        "target": focus_code,
                        "type": item["edge_type"].lower(),
                    }
                )

            continue

        # Add source course nodes
        for item in group_edges:
            source_code = item["source_code"]

            if source_code not in seen_nodes:
                nodes.append(
                    {
                        "id": source_code,
                        "type": "course",
                        "label": source_code,
                        "title": item["source_title"],
                    }
                )
                seen_nodes.add(source_code)

        # Course -> group edges
        for item in group_edges:
            source_code = item["source_code"]

            edges.append(
                {
                    "id": f"edge-source-{item['edge_id']}",
                    "source": source_code,
                    "target": group_node_id,
                    "type": item["edge_type"].lower(),
                }
            )

        # Group -> target course edge
        group_edge_type = "prereq"

        if group_edges[0]["edge_type"] == "COREQ":
            group_edge_type = "coreq"

        edges.append(
            {
                "id": f"group-target-{group_id}",
                "source": group_node_id,
                "target": focus_code,
                "type": group_edge_type,
            }
        )

    return {
        "focusCourse": {
            "id": focus_course_id,
            "code": focus_code,
            "title": focus_title,
        },
        "nodes": nodes,
        "edges": edges,
        "rawPrerequisiteText": raw_prereq_text,
        "rawCorequisiteText": raw_coreq_text,
    }


# --------------------------------------------------
# Optional Admin Endpoints
# --------------------------------------------------

@app.post("/admin/reparse")
def reparse():
    """Re-run requirement parsing for all stored courses."""
    from parse_requirements import process_all_courses

    process_all_courses()

    return {
        "status": "ok",
        "message": "All courses reparsed successfully",
    }


@app.post("/admin/refresh")
def refresh():
    """Refresh catalogue data and reparse requirements for development use."""
    import subprocess

    subprocess.run(["python", "refresh_catalogue.py"], check=True)
    subprocess.run(["python", "parse_requirements.py"], check=True)

    return {
        "status": "ok",
        "message": "Catalogue refreshed and reparsed",
    }
