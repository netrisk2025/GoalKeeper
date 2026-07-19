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

### “Too many open files” / EMFILE

On many Linux desktops the **soft** file-descriptor limit defaults to **1024**. Vite and Tauri open many watchers and hit `EMFILE` / `Too many open files`.

`npm run dev` and `npm run tauri:dev` raise the limit via `scripts/with-raised-nofile.sh` (no root required when the hard limit is higher).

If errors persist in a bare shell (or a parent shell already capped the hard limit):

```bash
ulimit -S -n 65536
# optional permanent: add the same line to ~/.bashrc
npm run dev
```

Note: `ulimit -n 1024` (without `-S`) can lower **both** soft and hard in some shells, after which raising is not permitted without a new login. Prefer `ulimit -S -n …`.

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
