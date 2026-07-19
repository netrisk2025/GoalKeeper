# FloorPlan — GoalKeeper

Rules:

- Enter only directories related to the current task.
- Do not access any directory named `Archive` unless specifically asked.
- Do not modify `/home/netrisk/Projects/SSTPA Tools` (read-only reference).

Schema: `{path}` — description — Access

| Path | Description | Access |
|------|-------------|--------|
| `Agent.md` | Project directive for agents | Read first |
| `Resource.md` | Imperatives and domain terms | Open |
| `FloorPlan.md` | This map | Open |
| `Docs/` | Standards, SRS, Architecture, future design notes | Open |
| `Docs/GSN_STANDARD-VERSION 3.PDF` | GSN Community Standard Version 3 (normative semantics) | Read-only |
| `Docs/SRS_GoalKeeper.md` | Software Requirements Specification (approve before coding) | Open |
| `Docs/ARCHITECTURE_GoalKeeper.md` | Tech stack and architectural implementation (approve before coding) | Open |
| `README.md` | Human-oriented project entry | Open |
| `Assets/` | Art Nouveau logo, app icon, and banner-bar artwork | Open |
| `Assets/goalkeeper-logo.jpg` | Primary product mark | Open |
| `Assets/goalkeeper-icon.jpg` | Desktop / window icon source | Open |
| `Assets/goalkeeper-banner.jpg` | Title-bar banner (wide) | Open |
| `src/` | React + TypeScript application (`core/`, `features/`, `state/`, `styles/`) | Open |
| `src/core/` | Pure GSN model, rules, graph, layout, markdown, vault load, export | Open |
| `src-tauri/` | Tauri 2 native shell (dialog + fs plugins) | Open |
| `public/branding/` | Web-served copies of logo/icon/banner | Open |
| `tests/core/` | Vitest unit tests | Open |
| `examples/sample-vault/` | Sample Root Goal markdown vault | Open |
| `package.json` | npm scripts and dependencies | Open |

When a new top-level subdirectory is created under GoalKeeper, append it to this FloorPlan.
