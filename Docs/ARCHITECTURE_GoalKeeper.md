# GoalKeeper Application Architecture

| Field | Value |
|-------|--------|
| **Product** | GoalKeeper (standalone desktop) |
| **Version** | 0.2 (implementation baseline after Boss review) |
| **Date** | 2026-07-19 |
| **Status** | Revised — progressive canvas, layout save/restore, Art Nouveau light/dark UI; pairs with `SRS_GoalKeeper.md` v0.2 |
| **Companion SRS** | `Docs/SRS_GoalKeeper.md` |
| **Repository** | https://github.com/netrisk2025/GoalKeeper.git |

This document specifies the **tech stack**, **module boundaries**, **data formats**, **key algorithms**, and **build/test** approach so that coding can start without further architectural discovery. Requirements are not restated here except where needed for design; the SRS is authoritative for *what*, this document for *how*.

---

## 1. Goals of the architecture

1. **Local-first, file-first** — no server, no graph DB; vault markdown is the system of record.
2. **Familiar to SSTPA Goal Keeper users** — same modes, KerML-inspired nodes on a true canvas.
3. **Obsidian-friendly** — wikilinks and readable markdown bodies.
4. **Testable pure core** — GSN rules, markdown I/O, and Layout Manager live in framework-agnostic TypeScript modules.
5. **Thin native shell** — Tauri for windowing and filesystem; UI in React.
6. **Progressive, user-steerable layout** — Layout Manager places new nodes; drag anytime; explicit **Save Layout** / **Last Saved**.
7. **Distinctive chrome** — subtle Art Nouveau light/dark identity with official logo, icon, and banner.

---

## 2. Tech stack (locked for v1)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Desktop shell | **Tauri 2** (Rust) | Native FS dialogs, small binary, same family as SSTPA Tools frontend shell |
| UI | **React 18** + **TypeScript** | Direct skill transfer from SSTPA Goal Keeper tool |
| Bundler | **Vite** | Standard with Tauri + React |
| UI state | **Zustand** | Lightweight; used in SSTPA frontend |
| Graph view | **Cytoscape.js** + **fcose** (or cose-bilkent) | True DAG layout; SSTPA already uses Cytoscape for several tools |
| Markdown | **gray-matter** (YAML frontmatter) + **unified/remark** only if body AST needed; prefer minimal parse | Frontmatter + simple section sync |
| Wikilink parse | Small custom parser for `[[...]]` | Avoid heavy Obsidian deps |
| Icons | Inline SVG component (port minimal set from SSTPA `Icon.tsx` pattern) | No emoji |
| Fonts | IBM Plex Sans (or similar humanist sans) + JetBrains Mono (bundled); optional decorative display face only for branding moments | Legibility on canvas; Art Nouveau reserved for chrome |
| Branding assets | `Assets/goalkeeper-logo.jpg`, `goalkeeper-icon.jpg`, `goalkeeper-banner.jpg` | Art Nouveau key emblem; banner for title bar |
| Unit tests | **Vitest** | Fast TS unit tests |
| E2E (optional v1.1) | Playwright against webview or pure core harness | Not blocking first vertical slice |
| Package manager | **npm** | Align with SSTPA frontend |

### 2.1 Explicit non-choices

| Rejected | Why |
|----------|-----|
| Neo4j / any graph DB | SRS / product intent |
| Electron | Heavier; Tauri preferred |
| Go backend | No multi-user API; FS is enough |
| Full Obsidian plugin as the app | Product is a dedicated GSN graphical tool |
| Tailwind as hard dependency | Prefer CSS variables / theme tokens file; Tailwind optional if it speeds implementation |
| Auto-writing layout on every drag | Explicit **Save Layout** only (SRS FR-71, FR-79) |

### 2.2 Repository layout (to create on implementation)

```
GoalKeeper/
  Agent.md
  FloorPlan.md
  Resource.md
  Assets/
    goalkeeper-logo.jpg        # primary mark
    goalkeeper-icon.jpg        # app / window icon source
    goalkeeper-banner.jpg      # title-bar banner (wide)
  Docs/
    GSN_STANDARD-VERSION 3.PDF
    SRS_GoalKeeper.md
    ARCHITECTURE_GoalKeeper.md
  package.json
  src-tauri/
    tauri.conf.json            # references icon assets
    icons/                     # generated multi-res icons from Assets
    src/main.rs
    capabilities/
  src/
    main.tsx
    App.tsx
    styles/
      tokens.css               # light + dark + Art Nouveau accent tokens
      art-nouveau.css          # subtle filigree/chrome decorations
      app.css
    components/                # shell: BannerBar, ThemeToggle, …
    features/
      vault/
      structure/               # canvas, progressive reveal, drag, layout toolbar
      evidence/
      validation/
      export/
      wizard/
    core/                      # PURE — no React, no Tauri
      model/
      graph/
      rules/
      markdown/
      layout/                  # LayoutDoc types, merge last-saved, Layout Manager
    state/
    lib/tauri/
  tests/
    core/
    fixtures/vaults/
  examples/
    sample-vault/
  README.md
```

---

## 3. Runtime architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri WebView (React)                                      │
│  ┌─────────────┐  ┌──────────────────────────────────────┐  │
│  │ App Shell   │  │ Mode panels: Structure | Evidence |  │  │
│  │ Vault/Root  │  │ Validation | Export + Wizard dialog  │  │
│  └──────┬──────┘  └──────────────────┬───────────────────┘  │
│         │                            │                      │
│         ▼                            ▼                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Zustand stores (ui, selection, dirty, findings)     │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │ core/*  (pure TS: model, graph, rules, markdown)    │    │
│  └──────────────────────────┬──────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │ Tauri invoke / plugin-fs
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Rust host                                                  │
│  - open/select directory                                    │
│  - read/write/rename files (atomic write)                   │
│  - watch directory (optional notify)                        │
│  - app config path (last vault, theme)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    User vault on disk (.md + _layout.json)
```

**No separate backend process.** All validation runs in the UI process on the in-memory graph loaded from files.

---

## 4. Layer responsibilities

### 4.1 `core/model`

Types:

```ts
type GsnType =
  | "GsnGoal" | "GsnStrategy" | "GsnSolution"
  | "GsnContext" | "GsnAssumption" | "GsnJustification";

type ElementType = GsnType | "Evidence";

interface GsnElement {
  filePath: string;          // vault-relative
  gkType: GsnType;
  gsnId: string;
  name: string;
  statement: string;
  isRoot: boolean;
  undeveloped: boolean;
  supportedBy: string[];     // resolved gsnIds or note keys
  inContextOf: string[];
  hasEvidence: string[];     // Solutions only — note keys
  // raw frontmatter passthrough for unknown keys
}

interface EvidenceNote {
  filePath: string;
  name: string;
  statement: string;
  kind: "Analysis" | "Test" | "Inspection" | "Demonstration" | "Document" | "Other";
  artifactPath?: string;
}

interface GoalStructure {
  rootId: string;
  rootDir: string;           // vault-relative
  elements: Map<string, GsnElement>;  // key = gsnId
  evidence: Map<string, EvidenceNote>;
  layout: LayoutDoc;
}
```

**Identity:** Within a Goal Structure, `gsn_id` is the primary key. File basename Should match `gsn_id` (e.g. `G1.md`) for Obsidian clarity.

### 4.2 `core/graph`

Pure functions:

| Function | Behavior |
|----------|----------|
| `buildGraph(structure)` | Adjacency for SupportedBy / InContextOf / has_evidence |
| `reachableFromRoot(root, edges)` | BFS/DFS set |
| `findSupportCycle(nodes)` | DFS three-color on SupportedBy only (and InContextOf for context cycles if desired; SRS prioritizes SupportedBy DAG) |
| `pathToRoot(root, target, edges)` | BFS parent map (same idea as SSTPA GoalKeeperTool) |
| `tierLayout(root, nodes)` | Optional fallback tier columns if Cytoscape unavailable |
| `orphansOnDisk(allFiles, reachable)` | INFO findings |

### 4.3 `core/rules`

Port and adapt validation from `GoalKeeperTool.tsx` `validateStructure` + relationship matrix `relationshipFor`:

```ts
function canLink(sourceType: GsnType, targetType: GsnType, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF"): boolean
function validateStructure(structure: GoalStructure): Finding[]
```

Finding shape:

```ts
interface Finding {
  severity: "ERROR" | "WARNING" | "INFO";
  nodeId?: string;
  message: string;
  code: string;  // e.g. "CYCLE", "DUP_ID", "NO_EVIDENCE"
}
```

**Save gate:** ERROR findings that are *relationship legality* or *cycle* block applying a pending link. Structural incompleteness (no evidence) does **not** block save (WARNING only), matching SSTPA Goal Keeper practice.

### 4.4 `core/markdown`

| Operation | Spec |
|-----------|------|
| `parseElementFile(path, text)` | gray-matter → `GsnElement` or `EvidenceNote` |
| `serializeElement(el)` | Frontmatter + body with synced `## Supported By` / `## In Context Of` / `## Evidence` sections |
| `resolveWikilink(link, vaultIndex)` | Strip `[[ ]]`; match by path or basename |
| `listRootGoals(vaultRoot)` | Scan for directories containing `is_root: true` or `_root` marker |

**Sync policy (statement):** On load, if both frontmatter `statement` and H1/body prose exist, prefer body prose after the title heading for display; on save, write statement to both frontmatter `statement` and body paragraph for robustness.

**Relationship authority:** Frontmatter arrays are authoritative. Body lists are rewritten on every save from frontmatter to prevent drift.

### 4.5 `core/layout` — Layout Manager and last-saved merge

Pure module (no React). Responsibilities:

| API | Behavior |
|-----|----------|
| `loadLayoutDoc(json)` / `serializeLayoutDoc(doc)` | Schema v1 layout file I/O types |
| `placeNewNode(structure, workingPositions, newId, parentId?, relType?)` | **Layout Manager**: assign `{x,y}` for a node lacking a position; bias near parent for SupportedBy (below/offset), lateral for InContextOf; simple collision nudge |
| `mergeLastSaved(structure, lastSaved, options?)` | For each element: if `gsnId` in lastSaved.nodes → use saved `{x,y}`; else `placeNewNode`. Drop saved entries not in structure. Returns working positions + list of stale ids ignored |
| `applyDrag(working, id, x, y)` | Update working position only |
| `toLayoutDoc(rootId, working, viewport, display)` | Build document for **Save Layout** |

**Invariants:**

- Layout never invents relationships or elements.
- **Save Layout** is the only writer of `_layout.json` from the UI (semantic Save does not touch layout by default).
- **Last Saved** = `mergeLastSaved` into working memory only; does not write disk until Save Layout again.

**Default placement algorithm (v1):** hierarchical tier layout:

1. Assign tiers by BFS on SupportedBy from root (InContextOf targets get parent tier, lateral offset).
2. Slot siblings left-to-right with fixed node width/gap constants.
3. Nudge overlaps by small horizontal delta.

fcose may be used as an optional “auto-arrange all without saved positions” later; it must not overwrite last-saved positions unless the user explicitly requests a full re-layout (out of v1 unless promoted).

### 4.6 React features

| Feature | Responsibility |
|---------|----------------|
| `vault` | Startup picker, recent vaults, list Root Goals, create Root Goal dir |
| `structure` | Cytoscape **canvas**, progressive reveal, drag, **Save Layout** / **Last Saved** toolbar, selection, detail pane |
| `evidence` | Solution-centric list (port EvidenceView UX) |
| `validation` | Findings list with jump |
| `export` | Generate MD/JSON via core; write via Tauri or download |
| `wizard` | Six-Step coach; emits *proposals* applied through the same create/link commands as manual edit |
| `theme` | Light/dark toggle; persists preference; applies `data-theme` on root |

### 4.7 Tauri FS API surface

Minimal commands (names illustrative):

| Command | Purpose |
|---------|---------|
| `pick_directory` | Vault select |
| `read_text(path)` | Read file |
| `write_text_atomic(path, contents)` | Temp + rename |
| `list_dir(path)` | Directory listing |
| `create_dir(path)` | mkdir |
| `remove_path(path)` | Delete with confirmation already done in UI |
| `watch_vault(path)` | Optional; emit file-change events |
| `get/set_app_config` | JSON in app config dir |

**Security:** Tauri capabilities restrict FS scope to user-selected vault + config dir after pick (use scope updates when vault changes).

---

## 5. UI architecture

### 5.1 Main window chrome

```
┌──────────────────────────────────────────────────────────────┐
│ [Art Nouveau banner strip + logo]  GoalKeeper                │
│ [Vault ▾] [Root Goal ▾]  Wizard   ☀/☾ Theme   Help           │
├──────────────────────────────────────────────────────────────┤
│ Modes: Structure | Evidence | Validation | Export            │
│ Canvas toolbar: [Save Layout] [Last Saved]  (Structure mode) │
├──────────┬───────────────────────────────────────┬───────────┤
│ Outline  │                                       │ Detail    │
│ / roots  │     Canvas or mode content            │ panel     │
│          │                                       │           │
├──────────┴───────────────────────────────────────┴───────────┤
│ Status: content dirty? | layout dirty? | findings | path     │
└──────────────────────────────────────────────────────────────┘
```

- **Banner bar:** uses `Assets/goalkeeper-banner.jpg` (CSS background or `<img>`) with optional dark-mode scrim for contrast; small logo mark from `goalkeeper-logo.jpg` / icon.
- **Window / desktop icon:** derived from `Assets/goalkeeper-icon.jpg` via Tauri icon pipeline.
- Mode tabs: **Structure | Evidence | Validation | Export**.

### 5.2 Progressive display (Structure canvas)

Implementation sketch:

1. Load structure + `mergeLastSaved` → full position map (not yet all mounted visible).
2. Compute reveal order: BFS tiers from Root Goal (SupportedBy primary; InContextOf nodes after their source is revealed).
3. Cytoscape: add nodes/edges in batches per tier with short staggered timeouts (default ~40–80 ms per node or ~120–200 ms per tier; cap total reveal ~1.5 s then dump remainder).
4. User can skip: pointer down on canvas or Escape → add all remaining immediately.
5. On single new-node create: add one node at Layout Manager position with a short opacity/position transition; do not full re-reveal.

State flags: `revealPhase: 'idle' | 'running' | 'done'`.

### 5.3 Layout UX (Save Layout / Last Saved / drag)

| Control | Action |
|---------|--------|
| **Drag node** | Updates `workingPositions` + Cytoscape position; sets `layoutDirty = true`; does **not** write `_layout.json` |
| **Save Layout** | `serializeLayoutDoc` → atomic write `_layout.json`; clears `layoutDirty`; updates in-memory `lastSaved` snapshot |
| **Last Saved** | `workingPositions = mergeLastSaved(structure, lastSavedFromDiskOrMemory)`; re-apply positions to Cytoscape; progressive micro-reveal for nodes that moved or were newly placed; `layoutDirty = false` if working matches last-saved, else true if Layout Manager placed extras that user may want to save |
| **Open Root Goal** | Same as Last Saved restore path: always open from last-saved file + Layout Manager for missing nodes; then progressive display |

Toolbar placement: Structure mode header, primary buttons labeled **Save Layout** and **Last Saved** (not buried only in menus).

Separate dirty flags:

- `contentDirty` — markdown/element edits  
- `layoutDirty` — working positions ≠ last-saved  

Semantic **Save** (Ctrl/Cmd+S) writes dirty element files only. **Save Layout** writes layout only. A future “Save all” MAY do both; not required for v1.

### 5.4 KerML-inspired nodes + Art Nouveau chrome (not GSN shapes)

**Canvas nodes (Cytoscape):**

- **Shape:** rounded rectangle for all GSN types (KerML feature-style), **not** parallelogram/circle/oval.
- **Chrome:** type color tick + type badge text (`Goal`, `Strategy`, …) + mono `gsn_id` chip + name (2-line clamp) + statement snippet.
- **Edges:** SupportedBy = solid arrow; InContextOf = dashed + label.
- **Selection:** accent border (`--gk-accent`).
- **Errors / undeveloped / no-evidence:** status styling and badges.

**Application chrome (Art Nouveau, subtle):**

- Banner bar artwork; hairline ornamental corners on side panels; soft botanical SVG flourishes in empty states and About dialog.
- Avoid heavy filigree on the canvas grid itself (readability first).
- Light and dark token sets in `tokens.css` under `[data-theme="light"]` / `[data-theme="dark"]`.

Suggested token families (`--gk-*`):

| Token role | Light (direction) | Dark (direction) |
|------------|-------------------|------------------|
| bg / surface | cream–warm gray | deep ink / charcoal with cool teal undertone |
| text / muted | near-black / slate | soft cream / gray |
| accent (selection) | indigo–teal | brighter teal–gold highlight |
| filigree / hairline | muted gold | desaturated gold |
| status ok/warn/error | standard semantic greens/ambers/reds | same, lifted for dark |

### 5.5 Detail panel commands

Port the Goal Keeper detail panel actions:

- Edit name/statement → `contentDirty`
- Add GSN node (type + rel) → create file + link + **Layout Manager** position + progressive entrance
- Link existing
- Add evidence (Solutions)
- Remove relationship (orphan warning)
- Delete node (danger for root)
- Path to root display

### 5.6 Content save model

**Explicit semantic Save** with dirty flag:

- Edits update in-memory `GoalStructure`.
- **Save** (Ctrl/Cmd+S) writes dirty markdown files (atomic).
- Does **not** write `_layout.json` (use **Save Layout**).
- Allows save with validation WARNINGs; blocks only on unrecoverable serialize errors.

Rationale: layout and content lifecycles match Boss-specified Save Layout / Last Saved; works with Obsidian external edits.

### 5.7 Goal Wizard implementation

State machine steps 1–6 (GSN Six-Step). Each step:

1. Shows explanation + example phrasing.
2. Optional text fields for draft claim/strategy/context.
3. Buttons: **Apply to structure** | **Skip** | **Back** | **Close**.

Apply maps to core commands:

| Step | Creates / updates |
|------|-------------------|
| 1 | Root or selected Goal statement |
| 2 | Context (and optional Assumption) + InContextOf |
| 3 | Strategy + SupportedBy from Goal |
| 4 | Justification/Context on Strategy |
| 5 | Child Goals + SupportedBy from Strategy; recurse prompt |
| 6 | Solution + Evidence note stub + links |

Wizard never force-navigates modes; it only mutates model when Apply is pressed.

---

## 6. File formats (implementation detail)

### 6.1 Vault metadata `.goalkeeper/vault.json`

```json
{
  "schemaVersion": 1,
  "name": "My Assurance Vault",
  "created": "2026-07-19T00:00:00Z"
}
```

Created if missing when a vault is opened.

### 6.2 Root Goal discovery

A directory under the vault is a Root Goal directory if:

1. It contains a markdown file with frontmatter `is_root: true`, or  
2. It contains `_goalkeeper.json` with `{ "rootFile": "G1.md" }` (escape hatch).

Ignore: `.obsidian/`, `.goalkeeper/`, `Evidence/` (not a Root Goal).

### 6.3 Atomic write

```
write path.tmp → fsync → rename over path
```

Implemented in Rust for reliability. Used for both markdown and `_layout.json`.

### 6.4 Layout file lifecycle

```
Open Root Goal
  → read _layout.json if present (else empty lastSaved)
  → working = mergeLastSaved(structure, lastSaved)
  → progressiveReveal(working)

Drag / Layout Manager place
  → update working; layoutDirty = true

Save Layout
  → write _layout.json from working; lastSaved = working; layoutDirty = false

Last Saved
  → working = mergeLastSaved(structure, lastSaved)
  → re-apply canvas; optional micro progressive reveal
```

### 6.5 Export JSON schema (versioned)

```json
{
  "schemaVersion": 1,
  "exportedAt": "...",
  "root": { "gsnId": "G1", "name": "..." },
  "elements": [ /* full element DTOs */ ],
  "relationships": [
    { "type": "SUPPORTED_BY", "source": "G1", "target": "S1" }
  ],
  "evidence": [ /* ... */ ],
  "layout": { /* layout doc */ },
  "findings": [ /* validation at export time */ ]
}
```

---

## 7. Algorithms (reference implementations)

### 7.1 Relationship legality

Mirror SSTPA `relationshipFor` extended with Strategy→Solution:

```
SUPPORTED_BY:
  Goal → Goal | Strategy | Solution
  Strategy → Goal | Solution
IN_CONTEXT_OF:
  Goal|Strategy → Context | Assumption | Justification
```

### 7.2 Cycle detection

DFS on SupportedBy adjacency; also reject InContextOf edges that would make a node an ancestor of itself through mixed paths if easily detected — minimum bar is SupportedBy DAG (GSN 1:2.2.2).

### 7.3 Default Root Goal template

On New Root Goal:

1. Slugify name → directory `Press-is-acceptably-safe` or user slug.
2. Allocate `G1.md` with `is_root: true`, empty or wizard-provided statement.
3. Do **not** require a pre-written layout file; first **Save Layout** creates `_layout.json`. Layout Manager places G1 at a default origin on first open.
4. Open Structure mode with progressive display of the Root Goal.

### 7.4 GSN ID allocation

Counters per prefix G/S/Sn/C/A/J within the structure; max existing + 1. User may rename with uniqueness check.

---

## 8. Adaptation notes from SSTPA GoalKeeperTool

Source of behavior (read-only):  
`/home/netrisk/Projects/SSTPA Tools/frontend/src/tools/goalkeeper/GoalKeeperTool.tsx`

| SSTPA function | GoalKeeper core port |
|----------------|----------------------|
| `buildGsnGraph` | `core/graph` BFS from root |
| `validateStructure` | `core/rules` |
| `relationshipFor` | `core/rules.canLink` |
| `pathToRoot` | `core/graph` |
| `unreachableAfterRemoval` | before delete edge |
| `EvidenceView` / `ValidationView` / `ExportView` | React features |
| `layoutSnapshot` / Commit Layout | **Save Layout** → `_layout.json`; **Last Saved** merge |
| Commit via API | Semantic Save + Save Layout via Tauri FS |
| Asset/Loss structure list | Vault Root Goal list |
| Evidence Validation/Verification/Loss | Evidence notes |

Do **not** copy SSTPA CSS class names into a shared package; re-implement tokens under `--gk-*` to avoid coupling.

---

## 9. Build, run, test

### 9.1 Dev

```bash
cd /home/netrisk/Projects/GoalKeeper
npm install
npm run tauri dev
```

### 9.2 Quality gates (definition of done for a change)

```bash
npm run test          # vitest core/
npm run typecheck     # tsc --noEmit
npm run lint          # eslint or oxlint
npm run build         # vite build
npm run tauri build   # when packaging
```

### 9.3 Test matrix (v1)

| Suite | Covers |
|-------|--------|
| `rules.test.ts` | canLink matrix, cycles, duplicate edges, second root, solution outgoing support |
| `markdown.test.ts` | round-trip fixtures, wikilink resolve |
| `graph.test.ts` | reachable, pathToRoot, orphan detection |
| `layout.test.ts` | placeNewNode, mergeLastSaved (saved + new nodes), stale drop, serialize round-trip |
| `wizard.proposals.test.ts` | step Apply produces expected element/edge intents |
| Manual | Progressive open, drag, Save Layout, Last Saved, theme light/dark, Wizard, export, Obsidian |

### 9.4 Sample fixture

Ship `examples/sample-vault/` with a small complete argument (Root Goal → Strategy → two Goals → Solutions → Evidence) for demos and tests.

---

## 10. Implementation plan (PR-sized slices)

Ordered for a vertical slice early.

| Slice | Deliverable | Exit criteria |
|-------|-------------|---------------|
| **P0** | Repo scaffold: Tauri+React+Vite, Art Nouveau tokens (light/dark), banner bar + logo assets, empty shell | App launches with theme toggle |
| **P1** | `core/model` + `markdown` + `rules` + `graph` + `layout` + vitest fixtures | Unit tests green including layout merge |
| **P2** | Vault open/create, Root Goal list/create, load structure into memory | Can open sample vault |
| **P3** | Structure detail panel CRUD + semantic Save | Create chain G→S→G→Sn on disk |
| **P4** | Cytoscape canvas: Layout Manager placement, drag, progressive reveal, **Save Layout**, **Last Saved**, open-from-saved | SRS FR-63–FR-78 satisfied |
| **P5** | Evidence mode + Evidence notes | Solutions show evidence status |
| **P6** | Validation mode | Findings match rules tests |
| **P7** | Export MD/JSON | Golden file tests |
| **P8** | Goal Wizard (Six-Step) | Non-prescriptive Apply/Skip |
| **P9** | Polish: icon packaging, external change detect, README, Linux package | SRS acceptance checklist |

Each slice is independently reviewable and does not require SSTPA Tools.

---

## 11. GitHub repository

- **Remote:** `https://github.com/netrisk2025/GoalKeeper.git`
- **Local path:** `/home/netrisk/Projects/GoalKeeper`
- **Suggested default branch:** `main`
- **First commit content:** scaffolding docs (this Architecture, SRS, Agent/FloorPlan/Resource) + later code
- **Ignore:** `node_modules/`, `dist/`, `src-tauri/target/`, `.env`, editor junk

Initialize and push only when Boss requests; do not force-push.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Wikilink rename breaks edges | Prefer stable gsn_id filenames; provide “Repair links” scan |
| User edits frontmatter badly in Obsidian | Lenient parse + Validation ERROR; never crash on load |
| Layout thrash / surprise moves | Only Layout Manager for nodes without positions; never auto-run global layout over saved positions |
| User loses manual arrangement | **Save Layout** explicit; **Last Saved** always available |
| Progressive reveal feels slow | Cap total duration; skip-to-end on interaction |
| Art Nouveau reduces readability | Confine ornament to chrome; keep canvas cards plain KerML-style |
| Scope creep into modular GSN | Explicit out-of-scope in SRS D-6 |
| Divergence from SSTPA Goal Keeper | Keep adaptation matrix; optional future import from SSTPA export JSON |

---

## 13. Compliance summary

| Concern | Mechanism |
|---------|-----------|
| GSN v3 semantics | `core/rules` + SRS FR-13–FR-23 |
| GSN v3 Six-Step | Wizard feature |
| Non-GSN geometry | Cytoscape style policy §5.4 |
| Progressive display + layout controls | §5.2–§5.3, `core/layout`, SRS FR-63–FR-80 |
| Art Nouveau light/dark | §5.1, §5.4, Assets/, NFR-5–NFR-11-UI |
| No graph DB | Markdown vault only |
| No SSTPA modification | Read-only reference paths |
| Verifiable | Vitest + acceptance checklist in SRS §11 |

---

## 14. Branding assets (checked in)

| File | Role | Notes |
|------|------|-------|
| `Assets/goalkeeper-logo.jpg` | Primary Art Nouveau mark (ornate key / cartouche) | About dialog, docs |
| `Assets/goalkeeper-icon.jpg` | App icon source | Generate Tauri `icons/` multi-res at build |
| `Assets/goalkeeper-banner.jpg` | Wide title-bar banner (16:9 source) | Banner bar background; dark mode scrim as needed |

Successors MAY replace JPEG masters with SVG/PNG exports without changing SRS IDs.

---

## 15. Approval

| Document | Role |
|----------|------|
| `SRS_GoalKeeper.md` v0.2 | What to build |
| `ARCHITECTURE_GoalKeeper.md` v0.2 (this file) | How to build |

**Boss approval of both documents authorizes P0 scaffolding and subsequent implementation slices.**

Decisions closed in this Architecture (including Boss review 2026-07-19):

- **Semantic Save:** explicit Save + `contentDirty` (§5.6); does not write layout.
- **Layout:** Layout Manager for new/missing positions; user drag; **Save Layout** / **Last Saved**; open uses last-saved (§4.5, §5.3, §6.4).
- **Progressive display:** tiered reveal on open; short entrance for new nodes (§5.2).
- **Graph renderer:** Cytoscape.js Structure canvas; outline list as aide.
- **UI identity:** light + dark, subtle Art Nouveau chrome, logo/icon/banner in `Assets/`.
- **Evidence location:** vault-level `Evidence/` and/or per-Root Goal; resolver accepts both.

### Revision history

| Ver | Date | Notes |
|-----|------|-------|
| 0.1 | 2026-07-19 | Initial draft |
| 0.2 | 2026-07-19 | Progressive canvas; Layout Manager; Save Layout / Last Saved; Art Nouveau light/dark; branding assets |
