# GoalKeeper

Standalone desktop application for building **Goal Structuring Notation (GSN)** assurance arguments as a local markdown vault (Obsidian-compatible).

Adapted from the SSTPA Tools **Goal Keeper** add-on: no graph database, optional Goal Wizard, KerML-inspired canvas nodes, subtle Art Nouveau light/dark chrome.

## Status

| Layer | State |
|-------|--------|
| SRS / Architecture | `Docs/SRS_GoalKeeper.md`, `Docs/ARCHITECTURE_GoalKeeper.md` (v0.2) |
| Core (model, rules, graph, layout, markdown) | Implemented + unit tests |
| Web UI (Vite + React) | Implemented — Structure / Evidence / Validation / Export, Wizard, layout controls |
| Tauri shell | Scaffolded (`src-tauri/`) |
| Demo vault | In-app “Demo vault” + `examples/sample-vault/` |

## Quick start (browser / memory vault)

```bash
cd /home/netrisk/Projects/GoalKeeper
npm install
npm run dev
```

Open http://localhost:1420 → **Open demo vault**.

## Desktop (Tauri)

```bash
npm run tauri:dev
```

Requires Rust toolchain. Use **Open vault** to pick a real directory (markdown files on disk).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production web build |
| `npm run tauri:dev` | Tauri desktop dev |
| `npm run tauri:build` | Package desktop app |

## Features (v0.1)

- Vault open / demo vault; Root Goal list and create
- GSN elements: Goal, Strategy, Solution, Context, Assumption, Justification
- Relationships: SupportedBy, InContextOf (DAG rules)
- Canvas with **progressive node reveal**, **Layout Manager** placement, drag, **Save Layout**, **Last Saved**
- Evidence, Validation, Export (Markdown + JSON)
- Optional non-prescriptive Goal Wizard (Six-Step Method)
- Light / dark theme; Art Nouveau branding assets

## Branding

| Asset | Path |
|-------|------|
| Logo | `Assets/goalkeeper-logo.jpg` |
| Icon | `Assets/goalkeeper-icon.jpg` |
| Banner | `Assets/goalkeeper-banner.jpg` |

## Repository

- **GitHub:** https://github.com/netrisk2025/GoalKeeper.git  
- **Local:** `/home/netrisk/Projects/GoalKeeper`

Read `Agent.md` and `FloorPlan.md` before changing the tree. Do **not** modify the SSTPA Tools project directory.
