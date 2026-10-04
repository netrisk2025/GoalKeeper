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
| `Docs/` | Standards, SRS, architecture, dispositions, verification and development report | Open |
| `Docs/GSN_STANDARD-VERSION 3.PDF` | GSN Community Standard Version 3 (normative core semantics and geometry) | Read-only |
| `Docs/SRS_GoalKeeper.md` | Current standalone requirements baseline | Open |
| `Docs/ARCHITECTURE_GoalKeeper.md` | GSN/ELK design and SSTPA integration boundary | Open |
| `Docs/VERIFICATION_GoalKeeper.md` | Requirement procedures prepared before implementation | Open |
| `Docs/REQUIREMENT_DISPOSITION.md` | SSTPA/legacy source port and conflict decisions | Open |
| `Docs/REQUIREMENTS_QUALITY.md` | Requirement quality and traceability checks | Open |
| `Docs/requirements.json` | Machine-readable SRS requirement records | Open |
| `Docs/report/` | Development report and storyboard deliverables when generated | Open |
| `Docs/screenshots/` | Application verification and storyboard screenshots when generated | Open |
| `README.md` | Human-oriented project entry | Open |
| `Assets/` | Art Nouveau logo, app icon, and banner-bar artwork | Open |
| `Assets/goalkeeper-logo.jpg` | Primary product mark | Open |
| `Assets/goalkeeper-icon.jpg` | Desktop / window icon source | Open |
| `Assets/goalkeeper-banner.jpg` | Title-bar banner (wide) | Open |
| `src/` | React + TypeScript application (`core/`, `features/`, `state/`, `styles/`) | Open |
| `src/core/` | Pure GSN model, rules, graph, layout, markdown, vault load, export | Open |
| `src/core/presentation/` | Shared GSN symbol geometry, text layout, SVG and model projection helpers | Open |
| `src/examples/` | Loadable example case definitions, including FireSat | Open |
| `src-tauri/` | Tauri 2 native shell (dialog + fs plugins) | Open |
| `public/branding/` | Web-served copies of logo/icon/banner | Open |
| `public/licenses/` | Dependency notices and matching ELK sources; copied into built distribution | Open |
| `scripts/` | Development helpers and offline license verification | Open |
| `scripts/elk-sources.json` | Pinned ELK source/notices/library-file checksums | Open |
| `tests/core/` | Vitest unit tests | Open |
| `examples/sample-vault/` | Sample Root Goal markdown vault | Open |
| `examples/firesat-vault/` | Source-backed FireSat draft GSN case with explicit evidence limits | Open |
| `package.json` | npm scripts and dependencies | Open |

When a new top-level subdirectory is created under GoalKeeper, append it to this FloorPlan.
