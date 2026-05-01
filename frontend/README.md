# Frontend

React + TypeScript UI that renders course prerequisite/dependency graphs and course detail panels.

## Run

- `npm install`
- `npm run dev -- --host` (omit `-- --host` if you only use the machine running Vite)
- API URL defaults to `http://localhost:8000`. For a phone on your Wi‑Fi, copy `.env.development.example` to `.env.development.local` and set `VITE_API_BASE_URL` to your PC’s LAN address; see the repo root README.
- Optional analytics: set `VITE_GA_MEASUREMENT_ID` in a `.env` file to enable GA4 tracking.

## Key Behavior

- Prerequisite view:
  - Supports selectable depth.
  - Optional corequisite display toggle.
  - Displays logical requirement structures (AND/OR) and course/requirement nodes.
- Dependency view:
  - One-level view only.
  - Arrows point from dependent courses toward the selected root course.

## Data Flow

1. `useCourseGraph` fetches graph payloads from backend.
2. `GraphCanvas` preprocesses graph data for visualization.
3. vis-network renders nodes/edges and manages graph interaction.
4. Clicking course/requirement nodes opens side panel details.

## Testing

- `npm run test` runs unit tests once.
- `npm run test:watch` runs tests in watch mode.
