## UofA Prereq Graph

This project is an interactive prerequisite and dependency graph explorer for University of Alberta courses.

## Stack

- Frontend: React + TypeScript + Vite + vis.js (`frontend/`)
- Backend: FastAPI + psycopg (`backend/`)
- Data source: Parsed UAlberta course catalogue
- Database: Supabase, PostgreSQL

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
4. Start API (listen on your LAN so other devices can reach it):
   - `cd backend`
   - `uvicorn app:app --reload --host 0.0.0.0 --port 8000`

### Phone or tablet on the same Wi‑Fi

1. **Open the frontend URL**, not the API port: `http://YOUR_PC_LAN_IP:5173`. Port `8000` is JSON only unless you deploy a combined setup.
2. **Frontend env** (so the phone calls your PC, not `localhost` on the device):
   - Set `VITE_API_BASE_URL=http://YOUR_PC_LAN_IP:8000` (same IP as above).
   - Restart `npm run dev -- --host` after changing env files.
3. **Backend CORS**: add to your `.env` (same file as `DATABASE_URL`):
   - `CORS_EXTRA_ORIGINS=http://YOUR_PC_LAN_IP:5173`
   - Restart uvicorn after editing.
4. If it still fails, allow **port 8000** (and **5173** if blocked) in **Windows Firewall** for private networks.

### 2) Frontend

1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Start dev server (reachable on LAN):
   - `npm run dev -- --host`


## API Overview

- `GET /health` basic API health payload
- `GET /courses` list course code/title entries
- `GET /courses/{code}` fetch one course details object
- `GET /graph/{code}` fetch graph payload
  - Query params:
    - `max_depth` integer, course-depth limit in prerequisite mode
    - `include_coreqs` boolean, include corequisites in prerequisite mode
    - `view` one of `prereq` or `dependency`
