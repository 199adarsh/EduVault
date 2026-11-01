# Project: EduVault Heat-Calendar Attendance Visualizer

## Architecture
- **UI Primitives**: `frontend/src/components/ui/heat-calendar/` (or `heat-calendar.jsx` compound components: `HeatCalendar`, `HeatCalendarGrid`, `HeatCalendarLegend`, `HeatCalendarTooltip`, `HeatCalendarContext`).
- **Domain Container**: `frontend/src/components/Sovereign/SharedAttendanceHeatmap.jsx` transforms live `subjects[].detailedAttendance` into calendar intensity levels, connects active cell state to the preserved inspection sidebar, and preserves existing layout and props.
- **Consumers**: `frontend/src/components/Sovereign/HomeDashboard.jsx` and `frontend/src/components/Sovereign/AttendanceAnalytics.jsx` retain existing usage without breaking changes.
- **Styling**: Apple/GitHub inspired dark-mode coherent palette using emerald shades for attendance intensity and crimson `#FF453A` / `#f85149` for scheduled days with all-absent records. Zero dummy/synthetic data.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | HeatCalendar Compound Primitive | Generic `HeatCalendar`, `HeatCalendarGrid`, `HeatCalendarLegend`, `HeatCalendarTooltip`, and context model with ripple lift and smooth motion | M1 | Reference architecture |
| 2 | Live Attendance Data Adapter | Aggregate `subjects[].detailedAttendance` into date maps, intensity levels (0..1), and scheduled class metadata with strictly zero dummy/sine-wave data | M1 | Survey Explorer 2 |
| 3 | Preserved Sidebar & Layout | Retain existing flex container, subject abbreviation badges (`getSubjectAbbreviation`), attendance counts, and status indicators in sidebar | M1 | Survey Explorer 1 |
| 4 | Clean Color Palette | Dark Apple/GitHub inspired emerald scale (`#15803d` to `#86efac` or `#30D158`), crimson absent highlight, and subtle neutral empty cells | M1 | Survey Explorer 3 |
| 5 | Consumer Compatibility | Seamless drop-in compatibility with `HomeDashboard.jsx` and `AttendanceAnalytics.jsx` with full build verification | M1 | Original Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Heat-Calendar Implementation & Verification | Build compound HeatCalendar primitive, update SharedAttendanceHeatmap with live data & existing sidebar, and verify builds & tests | None | IN_PROGRESS |

## Interface Contracts
### `HeatCalendar`
- Props: `weeks` (number), `unit` (string), `values` (2D number array 0..1), `endDate` (Date), `color` (string/palette), `children` (optional), `className` (string).
- Context: `useHeatCalendar()` exposes `activeCell`, `setActiveCell`, `values`, `weeks`, `unit`, `color`, `selection`.

### `SharedAttendanceHeatmap`
- Props: `subjects` (Array), `weeksCount` (number, default 18), `compact` (boolean), `className` (string).
- Output: Flex container with scrollable HeatCalendar grid on the left/top and lecture inspection sidebar on the right/bottom.

## Code Layout
- `frontend/src/components/ui/heat-calendar.jsx` or `frontend/src/components/ui/heat-calendar/*`: Chart UI compound primitives.
- `frontend/src/components/Sovereign/SharedAttendanceHeatmap.jsx`: EduVault attendance heatmap container.
- `frontend/src/lib/attendanceUtils.js`: Helper functions for date normalization and abbreviations.
