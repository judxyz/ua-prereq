# Frontend Overview

This frontend is a small Vite + React + TypeScript app centered around a single page: the course prerequisite graph.

## Stack

- `Vite` for dev/build
- `React` + `react-router-dom`
- `TypeScript`
- `vis-network` + `vis-data` for the interactive graph canvas

## High-Level Flow

1. `src/main.tsx`
   Boots the app, loads global CSS, and wraps everything in `BrowserRouter`.
2. `src/App.tsx`
   Defines routes:
   - `/`
   - `/graph/:code`
3. `src/pages/GraphPage.tsx`
   This is the actual page shell.
   - reads the `:code` route param
   - shows the search bar and small top controls
   - uses `useCourseGraph(...)` to fetch graph data
   - passes graph data into `GraphCanvas`
4. `src/components/GraphCanvas.tsx`
   The main renderer for the graph.
   - converts backend graph data into `vis-network` nodes/edges
   - initializes the network
   - handles zoom/reset
   - fetches course details when a course node is clicked

## Important Files

### Page / UI

- [App.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/App.tsx)
- [GraphPage.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/pages/GraphPage.tsx)
- [SearchBar.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/components/SearchBar.tsx)
- [GraphCanvas.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/components/GraphCanvas.tsx)
- [index.css](C:/Users/Judyc/VSProjects/uacourses/frontend/src/index.css)

### Data Fetching

- [useCourseGraph.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/hooks/useCourseGraph.ts)
- [api/client.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/api/client.ts)
- [api/graph.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/api/graph.ts)
- [api/courses.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/api/courses.ts)

### Types

- [types/graph.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/types/graph.ts)
- [types/course.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/types/course.ts)

## Current Data Flow

### Search

- `SearchBar` loads the course list from `/courses`
- when the user submits/selects a course, it navigates to `/graph/:code`
- `GraphPage` reacts to the route change and updates `useCourseGraph`

### Graph Fetch

- `useCourseGraph` calls `fetchCourseGraph(code, params)`
- `fetchCourseGraph` hits `/graph/:code`
- response shape is `GraphResponse`

### Graph Render

- `GraphCanvas` maps `GraphResponse.nodes` into `vis-network` nodes
- `GraphCanvas` maps `GraphResponse.edges` into `vis-network` edges
- node/group styling is decided locally inside `GraphCanvas`
- clicking a course node triggers `fetchCourse(code)` to populate the details panel

## How The Graph Is Modeled

The backend sends two node types:

- `course`
- `group`

Group nodes represent prerequisite logic:

- `ANY_OF` -> rendered as `OR`
- `ALL_OF` -> rendered as `AND`
- `COREQ`

Important detail:

- the graph is not just `course -> course`
- it is generally `course -> group -> course`
- nested logic can also create `group -> group -> course`

That means most graph bugs are usually one of these:

- backend expansion bug
- bad edge routing / edge coloring in `GraphCanvas`
- incorrect depth assignment

## Best Places To Edit

### If you want to change layout / interaction

Start in [GraphCanvas.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/components/GraphCanvas.tsx).

Examples:

- pan/zoom behavior
- edge colors
- node shapes
- click behavior
- details panel logic

### If you want to change page layout / styling

Start in:

- [GraphPage.tsx](C:/Users/Judyc/VSProjects/uacourses/frontend/src/pages/GraphPage.tsx)
- [index.css](C:/Users/Judyc/VSProjects/uacourses/frontend/src/index.css)

### If you want to change fetch behavior

Start in:

- [useCourseGraph.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/hooks/useCourseGraph.ts)
- [api/graph.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/api/graph.ts)
- [api/courses.ts](C:/Users/Judyc/VSProjects/uacourses/frontend/src/api/courses.ts)

## Current Conventions

- route param is the selected course
- backend base URL comes from `VITE_API_BASE_URL`, fallback `http://localhost:8000`
- graph colors and node styling are hardcoded in `GraphCanvas.tsx`
- page-level styling is centralized in `index.css`

## Legacy / Likely Unused Right Now

There are older graph/layout files still in `src/components` and `src/lib`, for example:

- `buildHierarchy.ts`
- `computeLayout.ts`
- `graphUtils.ts`
- `CourseNode.tsx`
- `GroupNode.tsx`
- `EdgePath.tsx`
- `Legend.tsx`
- `Controls.tsx`

These appear to belong to the previous custom graph renderer, not the current `vis-network` implementation.

Treat them as legacy unless you confirm they are still imported somewhere.

## Practical “Where Do I Start?” Advice

If you are about to make a frontend change, this is usually the fastest order:

1. Check `GraphPage.tsx` to see how the page is wired.
2. Check `GraphCanvas.tsx` for the graph behavior itself.
3. Check `types/graph.ts` to understand the backend payload.
4. Check `useCourseGraph.ts` / `api/graph.ts` if the issue feels data-related.
5. Only then dig into the backend graph builder if the structure itself looks wrong.

## Useful Commands

From `frontend/`:

```bash
npm install
npm run dev
npm run build
```

If the graph looks wrong, rebuild the backend response and inspect the `/graph/:code` payload first before assuming it is purely a frontend bug.
