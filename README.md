## UofA Course Graph

This project is an interactive prerequisite and dependency graph explorer for University of Alberta courses.

## Stack

- Frontend: React + TypeScript + Vite + vis.js (`frontend/`)
- Backend: FastAPI + psycopg (`backend/`)
- Data source: Parsed UAlberta course catalogue
- Database: PostgreSQL

See `backend/README.md` and `frontend/README.md`


## Project Layout

- `frontend/` web UI, graph rendering, API clients
- `backend/` API, graph payload builder, scraper/import scripts

## Local Development

### 1) Backend

1. Create and activate a Python virtual environment.
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Set environment variable:
   - `DATABASE_URL=postgresql://...`
4. Start API:
   - `cd backend`
   - `uvicorn app:app --reload`


### 2) Frontend

1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Start dev server:
   - `npm run dev`


## API Overview

- `GET /health` basic API health payload
- `GET /courses` list course code/title entries
- `GET /courses/{code}` fetch one course details object
- `GET /graph/{code}` fetch graph payload
  - Query params:
    - `max_depth` integer, course-depth limit in prerequisite mode
    - `include_coreqs` boolean, include corequisites in prerequisite mode
    - `view` one of `prereq` or `dependency`
