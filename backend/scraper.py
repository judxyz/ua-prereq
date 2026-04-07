from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional

import requests
from bs4 import BeautifulSoup, Tag, NavigableString


CATALOG_URL = "https://apps.ualberta.ca/catalogue/course/cmput"
BASE_URL = "https://apps.ualberta.ca"
OUTPUT_PATH = Path("backend/data/data_courses.json")

@dataclass
class RawCourse:
    code: str
    subject: str
    number: str
    title: str
    units: int
    description: str
    raw_prereq_text: Optional[str]
    raw_coreq_text: Optional[str]
    catalog_url: Optional[str]
    


def normalize_whitespace(text: str) -> str:
    # replace any whitespace \s with ' '
    return re.sub(r"\s+", " ", text).strip()

def extract_units(text: str) -> Optional[int]:
    """
    Example:
    '3 units (fi 6)(EITHER, 3-0-3) Open Study: Open, Spring / Summer'
    '0 units (fi 6)(VAR, 3-0-3) ...'
    """
    match = re.search(r"\b(\d+)\s+units?\b", text, flags=re.IGNORECASE)
    return int(match.group(1)) if match else None


def extract_prereq_text(text: str) -> Optional[str]:
    match = re.search(
        r"(Prerequisite[s]?:.*?)(?=(Co-?requisite[s]?:|Corequisite[s]?:|Credit cannot|See Note|$))",
        text,
        flags=re.IGNORECASE,
    )
    # [s]? means s is optional
    # .*? matches any character nongreedily
    # second part is positive lookahead
    return normalize_whitespace(match.group(1)) if match else None


def extract_coreq_text(text: str) -> Optional[str]:
    match = re.search(
        r"((?:Co-?requisite[s]?|Corequisite[s]?):.*?)(?=(Prerequisite[s]?:|Credit cannot|See Note|$))",
        text,
        flags=re.IGNORECASE,
    )
    return normalize_whitespace(match.group(1)) if match else None


def fetch_html(url: str = CATALOG_URL) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Mozilla/5.0"
        },
    )
    response.raise_for_status()
    return response.text



def extract_catalog_url(heading: Tag) -> Optional[str]:
    link = heading.find("a")
    if not link or not link.get("href"):
        return None

    href = link["href"]
    if href.startswith("http"):
        return href
    return f"{BASE_URL}{href}"

def parse_heading(text: str) -> Optional[tuple[str, str, str]]:
    text = normalize_whitespace(text)
    text = re.sub(r"^Effective:\s*\d{4}-\d{2}-\d{2}\s+", "", text)

    match = re.match(r"^(CMPUT)\s+([0-9A-Z]+(?:[A-Z])?)\s+-\s+(.+)$", text)
    if not match:
        return None

    subject, number, title = match.groups()
    code = f"{subject} {number}"
    return code, number, title


def parse_courses(html: str) -> list[RawCourse]:
    soup = BeautifulSoup(html, "html.parser")
    course_blocks = soup.select("div.course")

    courses: list[RawCourse] = []
    seen_codes: set[str] = set()

    for block in course_blocks:
        heading = block.find("h2")
        if not heading:
            continue

        heading_text = normalize_whitespace(heading.get_text(" ", strip=True))
        parsed = parse_heading(heading_text)
        if not parsed:
            continue

        code, number, title = parsed

        # skip duplicate effective versions
        if code in seen_codes:
            continue

        link = heading.find("a", href=True)
        catalog_url = f"{BASE_URL}{link['href']}" if link else None

        body_divs = block.find_all("div", recursive=False)
        if len(body_divs) < 2:
            continue

        content_div = body_divs[1]

        units_text = normalize_whitespace(content_div.get_text(" ", strip=True))
        units = extract_units(units_text)
        if units is None:
            continue

        if units == 0:
            continue

        description_tag = content_div.find("p")
        description = normalize_whitespace(description_tag.get_text(" ", strip=True)) if description_tag else ""

        full_text = normalize_whitespace(content_div.get_text(" ", strip=True))

        course = RawCourse(
            code=code,
            subject="CMPUT",
            number=number,
            title=title,
            units=units,
            description=description,
            raw_prereq_text=extract_prereq_text(full_text),
            raw_coreq_text=extract_coreq_text(full_text),
            catalog_url=catalog_url,
        )

        courses.append(course)
        seen_codes.add(code)

    return courses


def save_raw_json(courses: List[RawCourse], output_path: Path = OUTPUT_PATH) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps([asdict(course) for course in courses], indent=2),
        encoding="utf-8",
    )


def main() -> None:
    html = fetch_html()
    courses = parse_courses(html)
    save_raw_json(courses)

    print(f"Scraped {len(courses)} non-zero-unit CMPUT courses")
    for course in courses[:5]:
        print(f"- {course.code}: {course.title} ({course.units} units)")


if __name__ == "__main__":
    main()