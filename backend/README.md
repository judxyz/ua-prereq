# Backend API

FastAPI service for course lookup and prerequisite/dependency graph payloads.

## Environment

- Required: `DATABASE_URL`
- Optional: values loaded from `.env` through `python-dotenv`

## Run

- `pip install -r requirements.txt`
- `uvicorn app:app --reload`

## Endpoints

- `GET /health`
  - Returns service status metadata.
- `GET /courses`
  - Returns all courses (code/title), ordered by subject/number.
- `GET /courses/{code}`
  - Returns one course record.
  - `404` if course code does not exist.
- `GET /graph/{code}`
  - Query params:
    - `max_depth` (0..8)
    - `include_coreqs` (`true`/`false`)
    - `view` (`prereq` or `dependency`)
  - `404` if course code does not exist.

## Graph Contract Notes

- `view=prereq` returns recursive group/item/course graph with depth controls.
- `view=dependency` returns one-level dependent courses where root is a prerequisite.
- Course-depth limiting applies to course-to-course hops, not requirement group node depth.
