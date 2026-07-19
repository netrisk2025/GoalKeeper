# Software Requirements Specification — GoalKeeper Standalone Application

| Field | Value |
|-------|--------|
| **Product** | GoalKeeper (standalone desktop) |
| **Version** | 0.2 (requirements baseline after Boss review) |
| **Date** | 2026-07-19 |
| **Status** | Revised per Boss review — progressive canvas, layout save/restore, Art Nouveau light/dark UI |
| **Imperatives** | Per `/home/netrisk/Projects/Resource.md` and `GoalKeeper/Resource.md` (SHALL / Should / Will / May) |
| **Repository** | https://github.com/netrisk2025/GoalKeeper.git |
| **Development home** | `/home/netrisk/Projects/GoalKeeper` |

---

## 1. Purpose

GoalKeeper is a **local desktop application** that enables a user to **graphically construct, edit, validate, persist, and export** an assurance argument using **Goal Structuring Notation (GSN)** for a user-selected goal.

The product is an adaptation of the **SSTPA Tools Goal Keeper Add-on Tool** (`sstpa.goalkeeper`, SSTPA Tool SRS V7 §6.5.11) as a **standalone** application. SSTPA Tools supplies much of the upstream context (Asset, Loss, Validation, Verification) that the addon consumes. GoalKeeper replaces that upstream with:

1. an optional **Goal Wizard** that guides (but does not force) goal and node formation; and
2. a **markdown vault** on local disk as the sole persistence store (Obsidian-compatible linking).

---

## 2. Scope

### 2.1 In scope (v1)

- Desktop application for Linux (primary), with Windows and macOS packaging paths defined for later builds.
- User-selected vault directory; Root Goal selection or creation at startup.
- Full core GSN element set: Goal, Strategy, Solution, Context, Assumption, Justification.
- Core GSN relationships: SupportedBy, InContextOf (DAG, GSN rules).
- Terminal Solutions with references to Evidence notes (and optional local/relative file paths).
- Graphical structure **canvas** view with **progressive node display**, evidence view, validation view, and export view (modes aligned with SSTPA Goal Keeper).
- **Layout Manager** that places new nodes; user drag-reposition; **Save Layout** and **Last Saved** restore controls.
- Optional Goal Wizard (GSN Six-Step Method guidance; non-prescriptive; available anytime).
- Persistence of all GSN semantic data as `.md` files; layout/presentation as sidecar JSON (last-saved layout).
- Obsidian-compatible wikilinks for relationships so Obsidian can serve as an alternate viewer.
- Structural validation (completeness, legality, cycles, uniqueness).
- Export to Markdown report and JSON snapshot.
- **Light and dark** themes with a **subtle Art Nouveau** visual identity; product logo, app icon, and banner-bar artwork.

### 2.2 Out of scope (v1)

- Neo4j or any graph database.
- SSTPA Tools backend, SoI, HID grammar, Auth, or live interoperability API.
- Modular GSN extensions (Away Goals/Solutions, Modules, Contracts, Module Interfaces) — reserved for a later version unless Boss promotes them.
- Dialectic / defeat extensions of GSN v3 Part 1 extensions beyond core.
- Multi-user concurrent editing, cloud sync, or network services.
- Automatic generation of Root Goals from Asset–Loss pairs (SSTPA-only behavior).
- Modification of the SSTPA Tools codebase.

### 2.3 Normative references

| Reference | Role |
|-----------|------|
| `Docs/GSN_STANDARD-VERSION 3.PDF` — GSN Community Standard Version 3 (SCSC-141C, May 2021) | Normative for GSN **semantics**, element definitions, permitted relationships, DAG rules, and Six-Step Method guidance for the Wizard |
| SSTPA Tool SRS V7 §6.5.11 and Goal Keeper implementation | Informative adaptation source for product features, modes, validation, and **KerML-style visualization** |
| KerML 1.0 (as used by SSTPA Tools GSN presentation) | Normative for **visual presentation** of GSN nodes (not GSN-3 geometric shapes) |

### 2.4 Visualization rule (explicit exception)

The application **SHALL** conform to GSN Community Standard Version 3 for structure and meaning.

The application **SHALL NOT** use GSN-3 prescribed geometric symbols (goal rectangle, strategy parallelogram, solution circle, context “stadium”, assumption/justification ovals with A/J) as the primary diagram rendering.

The application **SHALL** visualize GSN elements using **KerML-inspired feature-style nodes** (typed cards/nodes, type badges, mono identifiers) consistent with the SSTPA Tools Goal Keeper conceptual presentation, rendered on an interactive **canvas** within a **subtle Art Nouveau** chrome (see §7.2) — not classic GSN drawing shapes.

---

## 3. Definitions

See also `Resource.md`.

| Term | Definition |
|------|------------|
| **Vault** | Directory chosen by the user that contains zero or more Root Goal subdirectories and may contain shared Evidence notes. |
| **Root Goal directory** | Subdirectory named for a Root Goal (stable slug); contains all GSN element markdown files for that Goal Structure and a layout sidecar. |
| **Element file** | One `.md` file representing one GSN element (or Evidence note), with YAML frontmatter and body. |
| **Goal Structure** | The DAG of GSN elements reachable from one Root Goal via SupportedBy and InContextOf. |
| **Undeveloped** | GSN decorator/state: a Goal or Strategy intentionally not yet developed (hollow diamond in GSN-3; represented as a boolean flag + visual incomplete marker in the canvas UI). |
| **Complete structure** | A Goal Structure that passes completeness rules for Solutions (each Solution has ≥1 evidence reference) and has no ERROR-level validation findings. Completeness is advisory for editing; export may warn. |
| **Canvas** | The interactive Structure-mode graph surface on which GSN nodes and edges are drawn and manipulated. |
| **Layout Manager** | Application component that computes initial canvas positions for nodes that lack a saved position (new nodes, or nodes missing from the last-saved layout). |
| **Working layout** | The current in-memory node positions on the canvas, including unsaved user drags and Layout Manager placements. |
| **Last-saved layout** | The layout snapshot last written by **Save Layout** into the Root Goal directory (`_layout.json`); used when opening a Root Goal and when the user selects **Last Saved**. |
| **Progressive display** | Nodes (and their connecting edges) appear on the canvas in a staged sequence rather than all at once, ordered from the Root Goal outward (or by tier), so the argument structure is revealed progressively. |

---

## 4. Key decisions (for Boss review)

| ID | Decision | Rationale |
|----|----------|-----------|
| **D-1** | Markdown vault + Obsidian wikilinks replace Neo4j | Standalone weight; alternate viewer in Obsidian |
| **D-2** | KerML-inspired node cards on canvas, not GSN-3 shapes; subtle **Art Nouveau** UI chrome | Match SSTPA Goal Keeper node semantics; Boss visual identity request |
| **D-3** | Tech stack: Tauri 2 + React + TypeScript + Vite (see Architecture) | Reuse SSTPA frontend skills; native FS; no heavy backend |
| **D-4** | Evidence is first-class vault notes (`gk_type: Evidence`), not SSTPA Validation/Verification/Loss | No SSTPA Core Data dependency |
| **D-5** | Strategy → Solution SupportedBy is **allowed** (SSTPA Goal Keeper parity) | GSN core table lists strategy→goal primarily; SSTPA and practical use allow strategy→solution; documented as GoalKeeper relationship rule set RK-1 |
| **D-6** | Modular GSN deferred | Keep v1 implementable |
| **D-7** | Goal Wizard optional and non-prescriptive | User request; Six-Step Method is guidance only |
| **D-8** | Semantic authority is markdown files; layout JSON is non-authoritative | Same split as SSTPA GoalStructure property vs graph |
| **D-9** | Progressive canvas reveal of nodes; Layout Manager places new nodes; user drag anytime; **Save Layout** persists; **Last Saved** restores with Layout Manager for unsaved nodes | Boss review 2026-07-19 |
| **D-10** | Light **and** dark themes required; Art Nouveau logo, icon, and banner assets in `Assets/` | Boss review 2026-07-19 |

---

## 5. Product overview

### 5.1 User goals

1. Open or create a vault and a Root Goal.
2. Build a clear assurance argument as a GSN DAG.
3. Attach evidence to terminal Solutions.
4. Validate structure and fix issues.
5. Export a report or open the same files in Obsidian.
6. Optionally use the Wizard when stuck or learning.

### 5.2 Modes of operation

Aligned with SSTPA Goal Keeper §6.5.11.5:

| Mode | Purpose |
|------|---------|
| **Structure** | Display and edit the GSN DAG; create/link/edit nodes; layout |
| **Evidence** | Focus on Solutions and their evidence references |
| **Validation** | Structural findings (ERROR / WARNING / INFO) with jump-to-node |
| **Export** | Report-oriented rendering; Markdown and JSON download/write |

The Goal Wizard is a **panel or dialog** available from any mode; it does not replace free-form editing.

### 5.3 Startup flow

```
Launch
  → Select or create Vault directory
  → List existing Root Goals (scan vault)
  → User selects existing Root Goal  OR  creates New Root Goal
  → If new: create Root Goal subdirectory + Root Goal markdown + default layout
  → Open main window on that Goal Structure
```

---

## 6. Functional requirements

### 6.1 Application shell and vault

- **FR-1** The application SHALL run as a local desktop application without requiring a network connection for core editing and validation features.
- **FR-2** At startup (and from a File/Vault menu), the application SHALL allow the user to select an existing vault directory or create a new vault directory.
- **FR-3** The application SHALL persist the last-used vault path and recent Root Goals in local application settings (not inside the vault, unless the user opts in to a vault-level settings file).
- **FR-4** When the vault is empty of Root Goals, the application SHALL offer to create a new Root Goal (Wizard optional).
- **FR-5** The application SHALL present a list of Root Goals discovered by scanning the vault for Root Goal directories (see §8 data model).
- **FR-6** Creating a new Root Goal SHALL create a dedicated subdirectory under the vault and write the initial Root Goal markdown file into that subdirectory.
- **FR-7** The application SHALL brand the main window as **GoalKeeper** (not “Goal Keeper Tool”).

### 6.2 Root Goal and Goal Structure

- **FR-8** Each Goal Structure SHALL have exactly one Root Goal, which SHALL be a Goal element (`gk_type: GsnGoal`).
- **FR-9** The Root Goal SHALL have no incoming SupportedBy relationship from another GSN element in the same structure.
- **FR-10** Every non-root GSN element in the structure SHALL be reachable from the Root Goal via SupportedBy and/or InContextOf relationships.
- **FR-11** SupportedBy relationships SHALL form a directed acyclic graph (DAG). The application SHALL reject or prevent cycles (FR-34).
- **FR-12** The user SHALL be able to open only one Goal Structure as the active structure at a time in the main window (switching Root Goals reloads that structure). Multiple windows May be deferred.

### 6.3 GSN element types

- **FR-13** The application SHALL support the following GSN element types, mapped as:

| GSN v3 element | Internal type | Typical GSN ID prefix |
|----------------|---------------|------------------------|
| Goal | `GsnGoal` | G |
| Strategy | `GsnStrategy` | S |
| Solution | `GsnSolution` | Sn |
| Context | `GsnContext` | C |
| Assumption | `GsnAssumption` | A |
| Justification | `GsnJustification` | J |

- **FR-14** Semantics SHALL match GSN v3 Part 1 core definitions: Goals are claims; Strategies describe inference between a goal and supporting goals; Solutions reference evidence; Context supplies context; Assumptions are intentionally unsubstantiated statements; Justifications state rationale.
- **FR-15** Each element SHALL have: unique GSN ID within the Goal Structure, display Name, and type-specific statement text (GoalStatement, StrategyStatement, etc.).
- **FR-16** Goals and Strategies MAY be marked **undeveloped** (GSN undeveloped decorator concept); the UI SHALL visually mark undeveloped elements as incomplete.

### 6.4 GSN relationship rules (RK-1)

- **FR-17** The application SHALL allow SupportedBy only for:

| Source | Target |
|--------|--------|
| GsnGoal | GsnGoal |
| GsnGoal | GsnStrategy |
| GsnGoal | GsnSolution |
| GsnStrategy | GsnGoal |
| GsnStrategy | GsnSolution |

- **FR-18** The application SHALL allow InContextOf only for:

| Source | Target |
|--------|--------|
| GsnGoal | GsnContext, GsnAssumption, GsnJustification |
| GsnStrategy | GsnContext, GsnAssumption, GsnJustification |

- **FR-19** Context, Assumption, and Justification elements SHALL NOT have outgoing SupportedBy relationships that support Goals (they SHALL NOT act as SupportedBy sources).
- **FR-20** A GsnSolution SHALL be terminal with respect to SupportedBy: it SHALL NOT have outgoing SupportedBy relationships.
- **FR-21** A GsnStrategy Should have at least one outgoing SupportedBy to a GsnGoal or GsnSolution (WARNING if missing).
- **FR-22** Duplicate logical relationships (same source, type, target) SHALL be prevented.
- **FR-23** Relationships SHALL be represented in markdown using Obsidian wikilinks per §8.

### 6.5 Evidence

- **FR-24** The application SHALL support Evidence notes (`gk_type: Evidence`) that Solutions can reference.
- **FR-25** A Solution SHALL reference zero or more Evidence notes; a Solution with zero references SHALL be marked incomplete (WARNING) and the structure SHALL NOT be considered complete (FR-16 completeness).
- **FR-26** Evidence notes MAY include: name, description, evidence kind (Analysis | Test | Inspection | Demonstration | Document | Other), optional relative path or URI to an artifact, and free-form body text.
- **FR-27** Evidence notes MAY live in a shared vault folder (e.g. `Evidence/`) or inside a Root Goal directory; links SHALL remain valid as relative wikilinks.
- **FR-28** The Evidence view SHALL list each Solution with its evidence and highlight Solutions without evidence.

### 6.6 Structure mode — create, edit, canvas, and layout

- **FR-29** The user SHALL be able to create GSN elements of any supported type and link them with legal relationships from a selected source element.
- **FR-30** The user SHALL be able to link existing elements and remove relationships, with a warning when removal orphans nodes from the Root Goal.
- **FR-31** The user SHALL be able to edit Name and statement fields; identity fields (stable file id, GSN ID after assignment policy, type) SHALL be controlled (GSN ID editable only with uniqueness validation).
- **FR-32** The user SHALL be able to delete an element with confirmation; deleting the Root Goal SHALL require a danger confirmation that the entire Goal Structure argument is removed.
- **FR-33** The Structure view SHALL display the full DAG rooted at the selected Root Goal on an interactive **canvas**, allow selection, and support search over GSN ID, name, statement, type, and evidence link text.
- **FR-34** The application SHALL prevent creation of relationships that would introduce a SupportedBy or InContextOf cycle, or SHALL reject them at save time with a clear error (prefer prevent-in-UI + validate-on-save).
- **FR-37** The UI SHALL show path-to-root for the selected element (chain from Root Goal to selection).

#### 6.6.1 Progressive canvas display

- **FR-63** When a Root Goal is opened (or the Structure canvas is first populated for that structure), GSN nodes SHALL be **progressively displayed** on the canvas: they appear in a staged sequence rather than all appearing simultaneously.
- **FR-64** Progressive display order SHALL start at the Root Goal and proceed outward along the support structure (tier-by-tier or breadth-first from the Root), so the argument is revealed from claim to support.
- **FR-65** Edges SHALL appear when both endpoints are visible (or immediately with the later endpoint), so the graph does not show dangling links during the reveal.
- **FR-66** Progressive display SHOULD complete within a short, configurable duration suitable for ≤ 200 nodes without blocking interaction once the reveal finishes; the user MAY skip/complete the reveal early (e.g. click canvas or press Escape) if provided.
- **FR-67** When a **new** node is created during an editing session, it SHALL appear on the canvas with a brief progressive entrance (fade/scale or short delay) at the position assigned by the Layout Manager (FR-68), without replaying the full-structure reveal unless the user reopens the Root Goal.

#### 6.6.2 Layout Manager, drag, Save Layout, Last Saved

- **FR-68** The application SHALL include a **Layout Manager** that computes canvas positions for nodes that do not yet have a position in the working layout (including newly created nodes).
- **FR-69** Placement by the Layout Manager SHOULD respect graph structure (e.g. parent above/near children for SupportedBy; context nodes offset laterally for InContextOf) and avoid unreasonable overlap where practical.
- **FR-70** The user SHALL be able, at any time, to **select and drag** one or more nodes on the canvas to revise the working layout. Dragging SHALL update only presentation positions, not GSN semantics.
- **FR-71** The Structure toolbar (or equivalent chrome) SHALL provide a **Save Layout** control. Activating **Save Layout** SHALL write the current working layout (node positions, and SHOULD include viewport/zoom and display toggles) to the Root Goal directory layout file (`_layout.json` or equivalent) as the **last-saved layout**.
- **FR-72** Semantic markdown saves and **Save Layout** MAY be independent: saving node content SHALL NOT be required to save layout, and **Save Layout** SHALL NOT be required to persist markdown content. (Semantic Save remains per FR-55 and Architecture save model.)
- **FR-73** When a GoalKeeper Root Goal is **opened**, the canvas SHALL display nodes according to the **last-saved layout** for that Root Goal, when a layout file exists.
- **FR-74** On open, nodes present in the structure but **absent** from the last-saved layout SHALL be positioned by the Layout Manager; nodes present in the layout file but no longer in the structure SHALL be ignored (stale entries dropped). The application MAY notify the user if stale layout entries were ignored.
- **FR-75** The Structure toolbar (or equivalent) SHALL provide a **Last Saved** control. Activating **Last Saved** SHALL:
  1. restore the working layout for all nodes that have positions in the last-saved layout file; and  
  2. arrange any nodes that exist in the current structure but are **not** in the last-saved layout using the Layout Manager; and  
  3. drop working positions for nodes that no longer exist.  
  **Last Saved** SHALL NOT rewrite the layout file until the user again chooses **Save Layout**.
- **FR-76** After **Last Saved**, the canvas SHOULD apply a short progressive re-display of nodes whose positions changed or were newly placed (consistent with FR-63–FR-67 spirit), without requiring a full Root Goal reopen.
- **FR-77** The layout file SHALL remain **non-authoritative** for semantic GSN relationships and node existence. Semantic relationships SHALL remain authoritative only in markdown (D-8).
- **FR-78** Viewport pan/zoom SHALL be user-controllable; last-saved viewport MAY be restored on open when stored in the layout file.

### 6.7 Validation mode

- **FR-38** Validation SHALL report findings with severity ERROR, WARNING, or INFO.
- **FR-39** ERROR findings SHALL include at least: missing Root Goal; second root Goal; cycle; illegal relationship type; Solution with outgoing SupportedBy; duplicate GSN IDs; unreachable nodes that are still claimed as part of the structure fileset inconsistency.
- **FR-40** WARNING findings SHALL include at least: Goal/Strategy without support; Solution without evidence; Strategy without elaboration; undeveloped elements still open; empty statements.
- **FR-41** INFO findings MAY include: GSN files in the Root Goal directory not reachable from the Root Goal (orphans on disk).
- **FR-42** Findings SHALL be actionable (message text) and SHALL allow jump-to-node when a node is implicated.

### 6.8 Export mode

- **FR-43** The application SHALL export a Markdown report of the Goal Structure (hierarchy, statements, relationships, evidence, validation summary).
- **FR-44** The application SHALL export a JSON snapshot sufficient to reconstruct semantic content and layout (schema versioned).
- **FR-45** PNG/SVG diagram export Should be provided when a canvas/graph renderer is available; if deferred in an early milestone, Export mode SHALL state the limitation clearly (as SSTPA Goal Keeper currently does for DOM-tier view).

### 6.9 Goal Wizard (optional, non-prescriptive)

- **FR-46** The Goal Wizard SHALL be accessible at any time from the main window (e.g. toolbar or menu), and also from the New Root Goal flow.
- **FR-47** The Wizard SHALL NOT block free-form editing; the user SHALL be able to dismiss it, skip steps, or apply only selected suggestions.
- **FR-48** The Wizard SHOULD follow the GSN Six-Step Method (GSN v3 §2:3) as coaching prompts:

  1. Identify the goal(s) to be supported  
  2. Define the basis on which the goals are stated (Context / terms)  
  3. Identify the strategy used to support the goals  
  4. Define the basis on which the strategy is stated (Context / Justification / Assumption)  
  5. Elaborate the strategy (new sub-goals → recurse) **or**  
  6. Identify the basic solution (evidence)

- **FR-49** Wizard steps MAY propose draft node names, statements, and links; applying a proposal SHALL create or update markdown only with explicit user confirmation (Apply / Skip).
- **FR-50** The Wizard SHALL use plain language prompts suitable for users who are not GSN experts, while labeling GSN terms so experts recognize them.
- **FR-51** The Wizard Shall not invent evidence; Solution/evidence steps SHALL prompt the user to attach or create Evidence notes.

### 6.10 Obsidian interoperability

- **FR-52** Relationship edges SHALL be expressible as Obsidian wikilinks so that opening the vault in Obsidian shows navigable links between notes.
- **FR-53** Frontmatter SHALL use stable keys (see §8) so that a future Obsidian plugin or Dataview query can list types; the application SHALL NOT require Obsidian to be installed.
- **FR-54** File names SHOULD be human-readable and stable (prefer GSN ID or slug); renames SHALL update reverse links or provide a repair action if links break.

### 6.11 Persistence and integrity

- **FR-55** All semantic GSN data for a Root Goal SHALL be stored under that Root Goal’s subdirectory as `.md` files (plus shared Evidence as allowed by FR-27).
- **FR-56** Saves SHALL write files atomically (write temp + rename) to reduce corruption risk.
- **FR-57** The application Should detect external vault changes (e.g. Obsidian edit) and offer reload when the active structure’s files change on disk.
- **FR-58** The application SHALL NOT require a graph database.

---

## 7. Non-functional requirements

### 7.1 Platform and performance

- **NFR-1** Core workflows SHALL function fully offline.
- **NFR-2** Opening a Goal Structure of ≤ 200 nodes SHOULD complete in under 2 seconds on a typical developer laptop (SSD).
- **NFR-3** The UI SHOULD remain responsive while saving; long operations (if any) SHALL show progress.
- **NFR-4** Linux packaging is required for v1 verification; Windows and macOS targets SHOULD be buildable from the same codebase (Architecture).

### 7.2 Usability and design language (Art Nouveau + light/dark)

- **NFR-5** The application SHALL provide both a **light mode** and a **dark mode**, user-selectable and persisted in application settings.
- **NFR-6** Visual design SHALL use a **subtle Art Nouveau** style: organic curved line accents, restrained botanical/filigree motifs, refined ornamental framing on chrome (banner, panels, empty states), without obscuring data density or readability on the canvas.
- **NFR-7** Canvas node cards remain **KerML-inspired** (typed feature cards, mono GSN IDs, type badges) for argument legibility; Art Nouveau treatment applies primarily to **application chrome**, empty states, and light decorative accents—not to rewriting nodes as GSN-3 geometric symbols.
- **NFR-8-UI** No emoji as functional UI icons; use SVG glyphs and the official product artwork in `Assets/`.
- **NFR-9-UI** Color tokens SHALL exist for light and dark themes (surfaces, text, muted text, accent, status colors, hairline borders). Accent remains reserved for selection/focus/active state.
- **NFR-10-UI** The application SHALL ship with product artwork:
  - **Logo** — primary mark for about dialogs and documentation (`Assets/goalkeeper-logo.jpg` or successor SVG/PNG exports).
  - **App icon** — desktop/window icon (`Assets/goalkeeper-icon.jpg` or successor multi-resolution icons).
  - **Banner** — artwork used in the application **banner / title bar** region (`Assets/goalkeeper-banner.jpg` or successor).
- **NFR-11-UI** Banner and logo treatment SHOULD remain legible in both light and dark modes (tone adjustment or theme-specific crop/overlay MAY be used).

### 7.3 Security and privacy

- **NFR-12** The application SHALL NOT transmit vault contents over the network as part of normal operation.
- **NFR-13** Optional “check for updates” MAY use the network only with user consent (not required for v1).
- **NFR-14** The application SHALL only access filesystem paths the user has selected (vault) plus application config directory.

### 7.4 Quality

- **NFR-15** Relationship legality, cycle detection, and GSN ID uniqueness SHALL be covered by automated unit tests.
- **NFR-16** Markdown parse/serialize round-trip SHALL be covered by automated tests.
- **NFR-17** Layout Manager placement, last-saved merge (saved positions + Layout Manager for new nodes), and layout file round-trip SHALL be covered by automated tests.
- **NFR-18** Critical user flows (new Root Goal, add support chain, drag nodes, Save Layout, Last Saved, attach evidence, validate, export, theme switch) SHOULD have automated or scripted verification checklists.

---

## 8. Data model (requirements level)

### 8.1 Vault layout

```
<vault>/
  .goalkeeper/                 # optional vault metadata
    vault.json                 # vault id, schema version, display name
  Evidence/                    # optional shared evidence notes
    TR-42.md
  <RootGoalSlug>/              # one Goal Structure
    _root.md                   # OR the Root Goal file itself is G1.md with is_root: true
    G1.md                      # Root Goal (recommended naming by GSN ID)
    S1.md
    G2.md
    Sn1.md
    C1.md
    A1.md
    J1.md
    _layout.json               # last-saved layout (presentation only; FR-71–FR-77)
```

**FR-59** Each Root Goal directory SHALL contain exactly one element file with `is_root: true` (or equivalent documented marker).

### 8.2 Element frontmatter (minimum)

```yaml
---
gk_schema: 1
gk_type: GsnGoal            # GsnGoal | GsnStrategy | GsnSolution | GsnContext | GsnAssumption | GsnJustification | Evidence
gsn_id: G1
name: "System is acceptably safe"
is_root: true               # only on Root Goal
undeveloped: false
statement: "..."            # may live only in body; if both, body wins after last save policy (see Architecture)
supported_by:               # wikilinks to targets (SupportedBy)
  - "[[S1]]"
  - "[[Sn1]]"
in_context_of:              # wikilinks (InContextOf)
  - "[[C1]]"
has_evidence:               # Solutions only
  - "[[Evidence/TR-42]]"
created: "2026-07-19T12:00:00Z"
modified: "2026-07-19T12:05:00Z"
---
# G1 — System is acceptably safe

The system is acceptably safe to operate in the intended environment.

## Supported By
- [[S1]]
- [[Sn1]]

## In Context Of
- [[C1]]
```

- **FR-60** The application SHALL treat frontmatter relationship lists as authoritative for edges when present; body `## Supported By` / `## In Context Of` sections SHALL be kept in sync on save for Obsidian readability.
- **FR-61** Wikilink targets SHALL resolve to notes by file basename or vault-relative path without extension, consistent with Obsidian.

### 8.3 Layout file (last-saved layout; non-authoritative for semantics)

```json
{
  "schemaVersion": 1,
  "rootGsnId": "G1",
  "tool": "goalkeeper",
  "savedAt": "2026-07-19T12:00:00Z",
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": { "G1": { "x": 120, "y": 40 }, "S1": { "x": 120, "y": 160 } },
  "display": { "showEvidenceBadges": true }
}
```

- **FR-62** Layout file SHALL NOT be the source of truth for existence of nodes or relationships.
- **FR-79** The layout file SHALL be updated only when the user activates **Save Layout** (FR-71), not automatically on every drag (working layout may differ from last-saved until Save Layout).
- **FR-80** Semantic content Save (markdown) SHALL NOT overwrite `_layout.json` unless the product later offers a combined “Save all” that explicitly includes layout; Architecture defines the default as separate controls.

---

## 9. Adaptation matrix (SSTPA Goal Keeper → GoalKeeper)

| SSTPA Goal Keeper | Standalone GoalKeeper |
|-------------------|------------------------|
| Neo4j nodes/rels | Markdown files + wikilinks |
| Asset–Loss–Root Goal selection | Vault Root Goal list + New Root Goal |
| Auto Root Goal from Asset/Loss | Goal Wizard / user draft |
| HAS_VALIDATION / HAS_VERIFICATION / HAS_LOSS | `has_evidence` → Evidence notes |
| HID / uuid / SoI | GSN ID + file identity + Root Goal directory |
| Staged Commit via Backend API | Save to disk (immediate or explicit Save; Architecture chooses explicit Save with dirty flag for v1) |
| GoalStructure property / Commit Layout | **Save Layout** → `_layout.json` (last-saved); **Last Saved** reverts working layout |
| Modes Structure/Evidence/Validation/Export | Same four modes + progressive canvas + Layout Manager |
| KerML Model Text Panel | Optional later; not required for v1 |
| Tool popup in SSTPA shell | Full application window with Art Nouveau banner, logo, light/dark |
| Instrument-only chrome | Subtle Art Nouveau chrome + KerML-inspired canvas nodes |

---

## 10. Constraints

- **C-1** Development SHALL occur only under `/home/netrisk/Projects/GoalKeeper`.
- **C-2** The SSTPA Tools tree SHALL NOT be modified for this product.
- **C-3** No Neo4j dependency SHALL be introduced.
- **C-4** GSN modular and dialectic extensions are out of scope for v1 (D-6).
- **C-5** Imperative language in this SRS follows Projects `Resource.md`.

---

## 11. Verification and validation

| Requirement groups | Verification approach |
|--------------------|------------------------|
| FR-17–FR-23, FR-34, FR-38–FR-41 | Unit tests on graph rules / validator |
| FR-55–FR-62, FR-79–FR-80, §8 | Round-trip fixtures (markdown + layout) |
| FR-63–FR-78 | Progressive display, Layout Manager, drag, Save Layout, Last Saved (unit + scripted UI) |
| FR-1–FR-12, FR-29–FR-37, FR-46–FR-51 | Integration / manual scripted demos on Linux |
| FR-43–FR-45 | Golden-file export tests |
| NFR-5–NFR-11-UI | Theme switch light/dark; banner/logo/icon present; Art Nouveau chrome review |
| NFR-12–NFR-14 | Design review + static check (no network calls in core paths) |

**Acceptance (v1):** A user can create a vault, create a Root Goal with or without the Wizard, see nodes appear progressively on the canvas, build a multi-level argument with Layout Manager placement and manual drag, **Save Layout**, reopen and see the last-saved layout, use **Last Saved** after further moves (new nodes still Layout-Managed), switch light/dark themes, pass validation with no ERRORs, export Markdown/JSON, and open the vault in Obsidian to navigate the same links.

---

## 12. Traceability to GSN v3 (summary)

| GSN v3 concept | GoalKeeper treatment |
|----------------|----------------------|
| Core elements (Goal, Strategy, Solution, Context, Assumption, Justification) | FR-13–FR-16 |
| SupportedBy / InContextOf | FR-17–FR-23 |
| DAG / no self-support | FR-11, FR-34 |
| Element identifiers unique in module | GSN ID unique in Goal Structure (FR-15, FR-39) |
| Undeveloped decorator | `undeveloped` flag + UI marker (FR-16) |
| Six-Step Method (§2:3) | Goal Wizard (FR-46–FR-51) |
| Geometric rendering Table 1:2-1 | **Not used** for primary UI; KerML-inspired cards + Art Nouveau chrome (D-2, D-10, §2.4, §7.2) |
| Modular GSN §1:4 | Out of scope v1 |

---

## 13. Open items (resolve at first sprint if needed)

1. Progressive reveal timing defaults (ms per tier) — Architecture sets initial values; tune in UX pass.
2. Whether multi-select drag is v1 or single-node drag only in first milestone (FR-70 allows “one or more”).
3. Evidence defaults to vault-level `Evidence/` and/or per-Root Goal (Architecture allows both).
4. App display name casing: **GoalKeeper** (this SRS) vs “Goal Keeper” in prose.

---

## 14. Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product owner (Boss) | | | Approve / Approve with notes / Rework |
| Architecture companion | `Docs/ARCHITECTURE_GoalKeeper.md` | | Read with this SRS |

Upon approval of this SRS (v0.2) and the Architecture document, implementation and verification MAY begin.

### Revision history

| Ver | Date | Notes |
|-----|------|-------|
| 0.1 | 2026-07-19 | Initial draft for Boss approval |
| 0.2 | 2026-07-19 | Progressive canvas; Layout Manager; Save Layout / Last Saved; light+dark Art Nouveau UI; logo/icon/banner assets |
