"""Scrape course data and load the results into the database."""

from __future__ import annotations

import os

import psycopg

from dotenv import load_dotenv
from scraper import fetch_html, parse_courses, save_raw_json
from add_to_db import upsert_courses
load_dotenv()

def main() -> None:
    """Run the scrape-and-upsert workflow."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise EnvironmentError("DATABASE_URL is not set.")

    html = fetch_html()
    courses = parse_courses(html)
    save_raw_json(courses)

    with psycopg.connect(database_url) as conn:
        upsert_courses(conn, [course.__dict__ for course in courses])

    print(f"Complete: {len(courses)} courses saved to db.")


if __name__ == "__main__":
    main()
