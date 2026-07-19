# Terminology — GoalKeeper

Imperatives follow `/home/netrisk/Projects/Resource.md`:

- **SHALL** — mandatory; correct behavior must be tested.
- **Should** — treated as SHALL unless justified omission is approved.
- **Will** — expected emergent behavior; no dedicated implementation task.
- **May** — optional; if employed, treated as SHALL.

## Domain terms

| Term | Meaning |
|------|---------|
| **Root Goal** | The single top-level `GsnGoal` of one Goal Structure (assurance argument). |
| **Goal Structure** | A directed acyclic graph (DAG) of GSN elements rooted at one Root Goal. |
| **Vault** | User-selected directory that holds one or more Root Goal subdirectories and shared Evidence. |
| **Root Goal directory** | Subdirectory of the vault containing all `.md` files for one Goal Structure. |
| **GSN ID** | Short identifier unique within a Goal Structure (e.g. `G1`, `S1`, `Sn1`), per GSN v3 element identifier practice. |
| **Wikilink** | Obsidian-style link `[[Note Name]]` or `[[path/Note Name]]` used to express graph edges in markdown. |
| **Goal Wizard** | Optional, non-prescriptive guided flow (GSN Six-Step Method) for drafting goals and nodes. |
| **KerML visualization** | Rectangular feature-style nodes and type badges (SSTPA Goal Keeper convention), **not** GSN-3 geometric symbols (rectangle / parallelogram / circle / oval). |
| **Layout Manager** | Places new (or unsaved) nodes on the canvas. |
| **Last-saved layout** | Positions last written by **Save Layout** (`_layout.json`). |
| **Progressive display** | Staged appearance of nodes on the canvas from Root outward. |
| **Evidence note** | A markdown file representing an evidence item referenced by a `GsnSolution`. |
