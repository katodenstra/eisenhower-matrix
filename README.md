# Eisenhower Matrix (Angular) - UX Engineer Portfolio

This project is a UX-forward take on the Eisenhower priority matrix. It focuses on interaction design, visual clarity, and responsive behaviors that make task triage feel lightweight and fast.

What it demonstrates from a UX engineering lens:

- Information architecture: 4-quadrant prioritization with a dedicated "Uncategorized" inbox and a Completed lane.
- Interaction design: drag-and-drop across quadrants, reorder within a list, expand/collapse task details, and a one-tap grid reset.
- Progressive disclosure: compact task cards with optional detail panels, date/time affordances, inline editing, and a confirm-before-delete flow.
- Motion and feedback: animated transitions for quadrant expansion, task reveals, and syncing states.
- Resilience and continuity: local persistence (IndexedDB with localStorage fallback) to preserve work.
- Accessibility considerations: semantic structure, ARIA labels, and keyboard-safe behaviors.

UX intent:

- Reduce cognitive load with clear hierarchy and color-coded quadrants.
- Keep primary actions visible, secondary details discoverable.
- Maintain spatial consistency to support drag-drop muscle memory.

## Run

```bash
npm i
npm start
```
