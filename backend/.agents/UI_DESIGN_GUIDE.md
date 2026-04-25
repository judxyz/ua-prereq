# UI Design Guide for Agent-Assisted Development

This document defines the current UI direction for the app and should be treated as the default source of truth when AI agents propose or implement frontend changes.

## Design Principles

- Keep the interface calm, readable, and lightweight.
- Prioritize clarity over visual complexity.
- Use soft surfaces and subtle depth, not heavy skeuomorphic effects.
- Maintain consistency across controls, panels, search, and graph interactions.
- Preserve semantic color meaning in graph nodes/edges.

## Theme Tokens

Use existing CSS custom properties where possible (`frontend/src/index.css`).

### Core Colors

- `--page-bg`: `#faf8f6` (global background)
- `--surface`: `rgba(255, 255, 255, 0.72)` (soft translucent panels)
- `--surface-strong`: `rgba(255, 255, 255, 0.92)` (strong panel background)
- `--text`: `#2f2740` (primary text)
- `--text-muted`: `#6e667c` (secondary text)
- `--accent`: `#275d38` (primary accent and root course green)
- `--accent-soft`: `#68c6cf` (link accent)
- `--accent-warm`: `#e8a72d` (supporting accent)
- `--border`: `rgba(47, 39, 64, 0.14)` (default borders)
- `--shadow`: `0 10px 30px rgba(47, 39, 64, 0.08)` (default panel shadow)

### Semantic Graph Colors

- `OR`: `#27315d`
- `AND`: `#5d274c`
- `COREQ`: `#275d38`
- Neutral group background: `#f3f1ec`
- Neutral group border: `#d7d2c7`
- Default edge fallback: `#9ab4a1`

Do not repurpose graph semantic colors for unrelated UI states.

## Typography

- Base family: `Roboto`
- Base line-height: `1.45`
- Base weight: `400`
- Use stronger weights (`500-700`) for labels, headings, and high-signal values (course code, interactive labels).
- Maintain high readability; avoid decorative fonts.

## Spacing, Shape, and Elevation

- Prefer rounded corners across the UI:
  - Pills/buttons: up to `999px`
  - Controls/cards: `12-22px`
- Use moderate spacing with breathable layouts (common patterns: 8/10/12/16/18/20/24).
- Use subtle shadows and translucent white surfaces to preserve a light visual tone.
- Avoid dense stacking of panels; keep visible negative space.

## Interaction and Accessibility

- Keep focus visibility strong:
  - `outline: 3px solid rgba(39, 93, 56, 0.18)`
  - `outline-offset: 2px`
- Hover states should be subtle and mostly use tint/background shifts.
- Inputs and controls should preserve keyboard accessibility and semantic roles.
- Use descriptive `aria-label`, `aria-expanded`, and region labeling for major interactive sections.
- Avoid color-only status communication when practical.

## Component Style Patterns

### Top Bar

- Search-first layout with supporting actions on the right.
- Links use underline with slight offset for clarity.
- Help/status surfaces should use `--surface-strong`, `--border`, and `--shadow`.

### Search

- Pill-style input shell with prefix label and transparent input field.
- Maintain accent-colored caret and query highlight.
- Results panel should float below input with elevated white background and clear row hover state.

### Graph Surface

- Full-viewport graph area with controls anchored bottom-right.
- Keep graph controls compact and consistent with panel/button styling.
- Preserve smooth fit/reset transitions with restrained animation durations.

### Course Detail Panel

- Anchored bottom-left with clear hierarchy:
  - Course code heading
  - Course title
  - Calendar link
  - Description section
  - Loading/error state
- Loading badge should use the accent palette and pill styling.

## Graph Semantics and Visual Rules

- Root course node:
  - Green solid background (`#275D38`)
  - White text
  - Larger, bolder label
- Non-root course nodes:
  - White background
  - Soft green-gray border
  - Green-accent border on hover/highlight
- Group node mapping:
  - `ALL_OF` -> diamond + `AND` color
  - `ANY_OF` -> ellipse + `OR` color
  - `COREQ` -> dot + `COREQ` color
  - unknown -> neutral box
- Edge mapping:
  - `COREQ` edges are dashed and green
  - `ANY_OF` edges are OR color
  - `ALL_OF` edges are AND color

Do not change semantic mappings unless the product behavior model changes.

## Responsive Behavior

- Target responsive breakpoint around `720px`.
- On small screens:
  - Stack top bar content vertically.
  - Expand search to full width.
  - Keep graph and panel usable at full viewport height.
- Preserve touch-friendly targets for graph controls and key action buttons.

## Agent Implementation Rules

When generating or editing UI code, agents should:

1. Reuse existing CSS variables before introducing new tokens.
2. Keep naming aligned with existing class conventions.
3. Preserve semantic graph colors and shape meanings.
4. Avoid introducing heavy animations, gradients, or dark-mode-only assumptions unless explicitly requested.
5. Keep styles centralized in `frontend/src/index.css` unless a scoped style file is intentionally introduced.
6. Match current visual language (soft surfaces, rounded shapes, subtle depth, clear contrast).
7. Include accessibility attributes and keyboard behavior for new interactive elements.

## Change Control

If a future redesign is intentional, update this file in the same PR as the UI changes so agent-generated code remains aligned with the latest design direction.
