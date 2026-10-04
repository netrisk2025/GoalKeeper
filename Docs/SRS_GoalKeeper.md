# GoalKeeper standalone software requirements specification

Version 1.1 | Baseline date: 2026-10-04 | Status: implementation baseline authorized by the current user request

## 1. Purpose and authority

GoalKeeper is a standalone assurance-case authoring and presentation application. Its primary audience includes security regime officials reviewing a clear, professionally organized argument. The GSN Community Standard Version 3 governs core notation and semantics. Restrained SSTPA Art Nouveau styling resolves presentation choices that the standard leaves unspecified.

This baseline replaces SRS v0.2 in full. The current user request authorizes preparation of this SRS, preparation of verification procedures, then implementation. It explicitly supersedes the previous KerML-primary rendering direction and any document language requiring a second approval before implementation. SSTPA Tools and Attack Tree remain read-only sources. The authoritative requirement records are §4; explanations elsewhere do not create additional hidden obligations.

## 2. Sources and terminology

| Key | Source |
|---|---|
| U | User request of 2026-10-04: GSN v3 presentation, separate requested model pop-up, polished readable layout, standalone SRS/verification, SSTPA integration intent, FireSat Loss example, report/storyboard and GitHub push |
| G | `Docs/GSN_STANDARD-VERSION 3.PDF`, GSN Community Standard Version 3, SCSC-141C, May 2021; local normative reference |
| B | `/home/netrisk/Projects/SSTPA Tools/SSTPA Tool SRS V7.md`, current baseline read 2026-10-04; section references refer to that version |
| L | Superseded GoalKeeper SRS v0.2 and Architecture v0.2, 2026-07-19; legacy IDs retained only for source traceability |
| A | `/home/netrisk/Projects/Attack Tree/docs/Architecture.md`, prototype SRS, FireSat example and source material identified in the example provenance notes |
| R | `/home/netrisk/Projects/Requirements/Skills.md`, INCOSE-aligned requirements drafting, quality, hierarchy and verification workflow |

A **case** is a single-root standalone GSN argument; a **vault** is its user-selected Markdown storage directory. A **Solution** references evidence; a referenced note is not a statement that the evidence is sufficient. **Valid** means the implemented structural checks passed. **Undeveloped** means an explicitly unfinished Goal or Strategy. **Projection** means an alternate view of the same model. **Working layout** is the current in-memory arrangement; **Last Saved** is the explicitly persisted arrangement. CSS pixel thresholds apply at browser/display scale 100% and diagram zoom 100%. A requirement's primary parent is its numeric prefix; blank parent cells denote intentional roots.

## 3. Profile and controlled presentation contract

The scope is **GSN v3 core notation, Part 1 §2**, with the six elements and two relationship types. Goal and Strategy can carry an undeveloped diamond. SupportedBy allows G→G, G→S, G→Sn, S→G. InContextOf allows G/S→C/A/J. Shared support is valid; directed cycles are invalid. The single-root restriction is a GoalKeeper product boundary, not a claim that GSN forbids other argument-module arrangements.

The profile excludes Part 1 §3 argument patterns/templates and abstraction markers, §4 modular/away elements and contracts, §5 Assurance Claim Points and §6 dialectic/defeat elements. Optional off-diagram continuation symbols (§1:2.2.20) are deferred. The full-case view/export retains the complete argument; explicitly labeled selected-branch previews and storyboard excerpts are partial views, without asserting that omitted branches are complete. This is not a declaration of implementation of every GSN v3 extension. The Six-Step Method in Part 2 §3 is authoring guidance, not a rule that every author must follow.

| Symbol | Required visual interpretation |
|---|---|
| Goal | Rectangle; identifier and claim |
| Strategy | Parallelogram; identifier and inference description |
| Solution | Circle; identifier and evidence reference statement |
| Context | Straight horizontal edges and rounded ends; identifier and contextual material |
| Assumption / Justification | Oval plus A / J at top-right or bottom-right |
| Undeveloped | Hollow diamond at bottom centre of Goal or Strategy |
| SupportedBy | Line and filled arrowhead toward supporting target |
| InContextOf | Line and hollow arrowhead toward contextual target |

These symbols remain authoritative in the main canvas and exported GSN figures. The alternate model graph and text appear only in the menu-launched pop-up. Node geometry and arrow semantics do not change with the theme or user-selected colors. Color customization follows the Loss Tool four-channel selector; user-selected colors may reduce contrast, and the default-palette acceptance thresholds do not constrain those choices. Text and symbol dimensions may grow to accommodate content; the standard does not prescribe application fonts or pixel sizes. IDs and statements have priority over auxiliary metadata. The 14 px/contrast/80% width thresholds are project acceptance criteria derived from the user's legibility objective, not quotations from the GSN standard.

## 4. Requirements

### 1 — Core GSN profile

| Field | Value |
|---|---|
| ID | 1 |
| Parent ID |  |
| Statement | The application **SHALL** represent an assurance case using the core GSN profile defined in §3 of this SRS. |
| Verification Method | Analysis |
| Verification Statement | Review the evidence for requirements 1.1–1.8 and confirm that no excluded extension is advertised as implemented. |
| Source | U; G Part 1 §2; B §6.5.11.1 |
| Rationale | Provide a precise, bounded conformance claim. |

### 1.1 — Six element types

| Field | Value |
|---|---|
| ID | 1.1 |
| Parent ID | 1 |
| Statement | The application **SHALL** support Goal, Strategy, Solution, Context, Assumption and Justification elements with the meanings defined in GSN v3 Table 1:2-1. |
| Verification Method | Test |
| Verification Statement | Create and round-trip one of each type; confirm that each retains its type, identifier and statement. |
| Source | G §1:2.1.1–4; B §6.5.11.6 |
| Rationale | Preserve the six core argument roles. |

### 1.2 — Legal support matrix

| Field | Value |
|---|---|
| ID | 1.2 |
| Parent ID | 1 |
| Statement | The application **SHALL** permit SupportedBy creation only for Goal→Goal, Goal→Strategy, Goal→Solution and Strategy→Goal. |
| Verification Method | Test |
| Verification Statement | Exercise every ordered pair of the six core types; accept exactly the four listed pairs, including rejection of Strategy→Solution. |
| Source | G Table 1:2-2, printed p18 |
| Rationale | Remove the legacy nonstandard Strategy→Solution exception. |

### 1.3 — Legal contextual matrix

| Field | Value |
|---|---|
| ID | 1.3 |
| Parent ID | 1 |
| Statement | The application **SHALL** permit InContextOf creation only from Goal or Strategy to Context, Assumption or Justification. |
| Verification Method | Test |
| Verification Statement | Exercise every ordered pair of the six core types; accept exactly the six listed pairs. |
| Source | G Table 1:2-2 |
| Rationale | Prevent contextual material being mistaken for supporting evidence. |

### 1.4 — Acyclic mutations

| Field | Value |
|---|---|
| ID | 1.4 |
| Parent ID | 1 |
| Statement | The application **SHALL** reject a relationship creation that produces a directed cycle without changing the prior graph. |
| Verification Method | Test |
| Verification Statement | Attempt self-links and two- and three-node cycles; confirm rejection and deep equality of the prior graph. |
| Source | G §1:2.2.2; B §6.5.11.7 |
| Rationale | Exclude circular support and context. |

### 1.5 — Duplicate relationships

| Field | Value |
|---|---|
| ID | 1.5 |
| Parent ID | 1 |
| Statement | The application **SHALL** reject a duplicate source, target and relationship-type triple without changing the prior graph. |
| Verification Method | Test |
| Verification Statement | Add the same legal edge twice; confirm the second action yields a diagnostic and one stored edge. |
| Source | B §6.5.11.7/.14 |
| Rationale | Keep the semantic graph unambiguous. |

### 1.6 — Root and identifiers

| Field | Value |
|---|---|
| ID | 1.6 |
| Parent ID | 1 |
| Statement | The validator **SHALL** report a diagnostic for each violation of one Goal root, no incoming support at that root, unique GSN identifiers and root reachability of non-root elements. |
| Verification Method | Test |
| Verification Statement | Validate fixtures with a missing root, a second root, a non-Goal root, an incoming root edge, duplicate GSN IDs and an unreachable node; confirm each violation is reported. |
| Source | G §1:2.1.2; B §6.5.11.8/.14; L FR-8–11 |
| Rationale | Apply the standalone case boundary without attributing the single-root product policy to the standard. |

### 1.7 — Imported rule violations

| Field | Value |
|---|---|
| ID | 1.7 |
| Parent ID | 1 |
| Statement | The validator **SHALL** identify imported illegal relationships and cycles with the affected identifiers. |
| Verification Method | Test |
| Verification Statement | Load a legacy Strategy→Solution fixture and cyclic fixture; confirm both remain inspectable and yield affected-node diagnostics rather than a silent conversion. |
| Source | U; G Table 1:2-2; B §6.5.11.22 |
| Rationale | Make migration defects visible. |

### 1.8 — Undeveloped semantics

| Field | Value |
|---|---|
| ID | 1.8 |
| Parent ID | 1 |
| Statement | The application **SHALL** restrict the undeveloped marker to Goal and Strategy elements. |
| Verification Method | Test |
| Verification Statement | Toggle the marker on each type and validate imported invalid flags; confirm only Goals and Strategies accept the marker and invalid imported flags are reported. |
| Source | G Table 1:2-1, printed p18 |
| Rationale | Represent explicitly unfinished argument branches. |

### 2 — GSN presentation

| Field | Value |
|---|---|
| ID | 2 |
| Parent ID |  |
| Statement | The primary diagram **SHALL** use the core GSN graphical notation defined in §3 of this SRS. |
| Verification Method | Inspection |
| Verification Statement | Compare a six-element fixture and an undeveloped element against the standard pages 17–18 in the primary diagram and SVG export. |
| Source | U; G Tables 1:2-1/2 |
| Rationale | Make customer-facing arguments recognizably GSN. |

### 2.1 — Element geometry

| Field | Value |
|---|---|
| ID | 2.1 |
| Parent ID | 2 |
| Statement | The renderer **SHALL** draw Goals as rectangles, Strategies as parallelograms, Solutions as circles, Contexts with straight horizontal sides and rounded ends, and Assumptions and Justifications as ovals. |
| Verification Method | Inspection |
| Verification Statement | Inspect the six-shape fixture at 100% zoom; measure Solution width and height as equal within one CSS pixel and confirm each other outline matches Table 1:2-1. |
| Source | G Table 1:2-1; U |
| Rationale | Protect the notation from theme-driven shape changes. |

### 2.2 — Notation decorators

| Field | Value |
|---|---|
| ID | 2.2 |
| Parent ID | 2 |
| Statement | The renderer **SHALL** place A or J at the top-right or bottom-right of its corresponding oval and a hollow diamond at the bottom centre of undeveloped Goals and Strategies. |
| Verification Method | Inspection |
| Verification Statement | Inspect A, J, undeveloped Goal and undeveloped Strategy fixtures in both themes and exported SVG; confirm markers are visible outside statement text. |
| Source | G Table 1:2-1 |
| Rationale | Retain semantics that oval shape alone cannot convey. |

### 2.3 — Relationship arrows

| Field | Value |
|---|---|
| ID | 2.3 |
| Parent ID | 2 |
| Statement | The renderer **SHALL** draw SupportedBy with a filled arrowhead and InContextOf with a hollow arrowhead pointing toward the target element. |
| Verification Method | Inspection |
| Verification Statement | Inspect both relationship types in both themes and SVG; verify head fill and direction against the source/target fixture IDs. |
| Source | G Table 1:2-2 |
| Rationale | Distinguish evidence support from context without relying on color. |

### 2.4 — Complete readable statements

| Field | Value |
|---|---|
| ID | 2.4 |
| Parent ID | 2 |
| Statement | At 100% diagram zoom, the renderer **SHALL** display the full identifier and statement of each element using statement text of at least 14 CSS pixels without ellipsis or clipping. |
| Verification Method | Test |
| Verification Statement | Render the long-text fixture defined in VP-02 at 100% zoom; inspect text extents against symbol boundaries and compare visible text with the model. |
| Source | U; G §1:2.1.2, §1:2.3; B §6.5.11.25 |
| Rationale | Make professional review possible without hidden claims. |

### 2.5 — Contrast

| Field | Value |
|---|---|
| ID | 2.5 |
| Parent ID | 2 |
| Statement | The default presentation palettes **SHALL** provide at least 4.5:1 contrast for statement text and 3:1 contrast for diagram outlines and arrowheads against their adjacent backgrounds in light and dark themes. |
| Verification Method | Analysis |
| Verification Statement | Calculate relative-luminance contrast from the shipped tokens for both themes and record each ratio; exclude ornamental accents that carry no information. |
| Source | U; B §6.4.1; project-derived measurable threshold |
| Rationale | Keep the argument legible for reviewers. |

### 2.6 — Restrained theme

| Field | Value |
|---|---|
| ID | 2.6 |
| Parent ID | 2 |
| Statement | The presentation **SHALL** confine Art Nouveau ornament to the application chrome outside the GSN symbols and relationship paths. |
| Verification Method | Inspection |
| Verification Statement | Inspect a full-canvas screenshot in each theme; confirm symbols and paths have no botanical, filigree or banner imagery. |
| Source | U; B §6.3.1/§6.4.1; L NFR-6 |
| Rationale | Resolve stylistic ambiguity without altering GSN notation. |

### 2.7 — Diagram workspace

| Field | Value |
|---|---|
| ID | 2.7 |
| Parent ID | 2 |
| Statement | At a 1440×900 viewport with auxiliary panels closed, the Structure workspace **SHALL** allocate at least 80 percent of its usable content width to the GSN canvas. |
| Verification Method | Test |
| Verification Statement | Measure canvas width divided by workspace width at the specified viewport; confirm at least 0.80 and that the graph remains usable after reopening panels. |
| Source | U |
| Rationale | Return screen area to the customer-facing case. |

### 2.8 — Theme selection

| Field | Value |
|---|---|
| ID | 2.8 |
| Parent ID | 2 |
| Statement | The application **SHALL** restore the last selected light or dark theme on restart. |
| Verification Method | Test |
| Verification Statement | Select each theme, restart the application and confirm its persisted appearance. |
| Source | L NFR-5; B §6.4.1 |
| Rationale | Preserve the existing standalone theme workflow. |

### 2.9 — Node-type color selection

| Field | Value |
|---|---|
| ID | 2.9 |
| Parent ID | 2 |
| Statement | The application **SHALL** provide a node-type color selector with font, fill, connector and boundary channels for each of the six core GSN types and a reset-to-defaults action. |
| Verification Method | Test |
| Verification Statement | Select each core type, change each of its four channels and reset all colors; confirm other types remain unchanged until reset, which restores theme defaults. |
| Source | U: authorized SSTPA integration and reuse of the Loss Tool color selector, 2026-10-04 |
| Rationale | Match the existing Loss Tool customization workflow while preserving GSN geometry. |

### 2.10 — Color presentation parity

| Field | Value |
|---|---|
| ID | 2.10 |
| Parent ID | 2 |
| Statement | The renderer **SHALL** apply the current node-type colors to the primary diagram, model pop-up and exported SVG, with outgoing connectors using their source type’s connector color. |
| Verification Method | Test |
| Verification Statement | Set distinct colors on a fixture containing all six types and both legal edge types; compare SVG attributes in the primary graph, projection and export, including filled support heads, hollow context heads and unchanged semantic serialization. |
| Source | U: authorized color selector; G Tables 1:2-1/2 |
| Rationale | Keep alternate views and deliverables consistent without changing notation semantics. |

### 3 — Alternate model view

| Field | Value |
|---|---|
| ID | 3 |
| Parent ID |  |
| Statement | The application **SHALL** expose the alternate model view through a View-menu command that opens a separate dismissible pop-up. |
| Verification Method | Demonstration |
| Verification Statement | Open the View menu, launch the model view and close it with the close control and Escape; confirm it is absent from the main workspace before launch and after dismissal. |
| Source | U; supersedes B §6.4.2/§6.5.11.26 |
| Rationale | Keep technical projections available on demand. |

### 3.1 — Projection parity

| Field | Value |
|---|---|
| ID | 3.1 |
| Parent ID | 3 |
| Statement | The alternate model view **SHALL** derive its graph and model text from the currently open argument without modifying its semantics. |
| Verification Method | Test |
| Verification Statement | Compare node IDs, types and relationship triples in the primary graph, projection graph and model text; open and close the view and confirm unchanged semantic serialization. |
| Source | U; B §3.7.6/§6.5.11.26 adapted |
| Rationale | Maintain one argument across presentations. |

### 3.2 — Projection boundary

| Field | Value |
|---|---|
| ID | 3.2 |
| Parent ID | 3 |
| Statement | The alternate model view **SHALL** identify its output as an illustrative SysML/KerML-style projection unless the output has been verified by a conforming language parser. |
| Verification Method | Inspection |
| Verification Statement | Inspect the projection label and export description; confirm there is no unsupported claim of conforming SysML/KerML interchange. |
| Source | U; B §3.7.6 adapted |
| Rationale | Avoid conflating familiar presentation with certified language translation. |

### 3.3 — Pop-up accessibility

| Field | Value |
|---|---|
| ID | 3.3 |
| Parent ID | 3 |
| Statement | The alternate model pop-up **SHALL** support keyboard focus entry, contained tab navigation, Escape dismissal and focus return to its invoking control. |
| Verification Method | Test |
| Verification Statement | Launch using the keyboard, traverse controls forward and backward, press Escape and confirm the invoking control receives focus. |
| Source | U; B §6.4.1 adapted |
| Rationale | Make the requested pop-up usable without a pointing device. |

### 4 — Layout and navigation

| Field | Value |
|---|---|
| ID | 4 |
| Parent ID |  |
| Statement | The application **SHALL** provide an explicit Arrange command for a hierarchical top-down GSN layout using the ELK layered engine family used by the Loss Tool prototype. |
| Verification Method | Test |
| Verification Statement | Arrange a branched case with shared support; confirm parents are above supporting descendants, context is distinguishable from support, and geometry boxes do not overlap. |
| Source | U; A docs/Architecture.md; B §6.5.11.16 adapted |
| Rationale | Reuse the proven Loss prototype layout approach. |

### 4.1 — Stable manual positions

| Field | Value |
|---|---|
| ID | 4.1 |
| Parent ID | 4 |
| Statement | The application **SHALL** preserve existing working node positions during selection, statement editing, validation and evidence association until an explicit layout action is requested. |
| Verification Method | Test |
| Verification Statement | Drag a node, perform each listed operation and compare coordinates; confirm equality before explicit Arrange or Last Saved. |
| Source | B §6.5.11.16; L FR-67–78 |
| Rationale | Prevent distracting layout movement. |

### 4.2 — Saved layout

| Field | Value |
|---|---|
| ID | 4.2 |
| Parent ID | 4 |
| Statement | The application **SHALL** restore positions and viewport saved by Save Layout when the same argument is reopened. |
| Verification Method | Test |
| Verification Statement | Drag nodes, change zoom and pan, save layout, reopen and compare the saved positions and viewport. |
| Source | B §6.5.11.9; L FR-71–80 |
| Rationale | Make reviewed figures reproducible. |

### 4.3 — Layout merge

| Field | Value |
|---|---|
| ID | 4.3 |
| Parent ID | 4 |
| Statement | The application **SHALL** reconcile Last Saved layout with the current graph by restoring saved extant positions, placing new nodes and ignoring deleted-node positions. |
| Verification Method | Test |
| Verification Statement | Save a layout, add a node and delete another, invoke Last Saved and confirm restored extant coordinates, finite new coordinates and no deleted visual node. |
| Source | L FR-73–77; B §6.5.11.22 |
| Rationale | Keep presentation metadata subordinate to semantic content. |

### 4.4 — Layout authority

| Field | Value |
|---|---|
| ID | 4.4 |
| Parent ID | 4 |
| Statement | The application **SHALL** write layout metadata only through the explicit Save Layout action. |
| Verification Method | Test |
| Verification Statement | Compare layout storage before and after node drag and semantic Save; confirm only Save Layout changes the stored layout. |
| Source | L FR-79–80 |
| Rationale | Preserve the established distinction between semantic and visual saves. |

### 4.5 — Diagram navigation

| Field | Value |
|---|---|
| ID | 4.5 |
| Parent ID | 4 |
| Statement | The Structure workspace **SHALL** provide pan, zoom, fit-to-argument, node selection and manual node dragging. |
| Verification Method | Demonstration |
| Verification Statement | Exercise each listed operation on the FireSat case and confirm that selection exposes the correct element for inspection. |
| Source | B §6.5.11.15; L FR-29–37 adapted |
| Rationale | Support authoring and review at different scales. |

### 4.6 — Explicit color persistence

| Field | Value |
|---|---|
| ID | 4.6 |
| Parent ID | 4 |
| Statement | The layout sidecar **SHALL** persist node-type color overrides through Save Layout and restore them through reopening and Last Saved, accepting only complete four-channel hexadecimal RGB styles for known GSN types. |
| Verification Method | Test |
| Verification Statement | Change colors, save semantic content and verify no sidecar write; Save Layout, change colors again, invoke Last Saved and reopen to verify restoration; load unknown types, missing channels, CSS payloads and malformed colors and confirm they are discarded. |
| Source | U: authorized color selector; SRS 4.2–4.4 |
| Rationale | Keep presentation changes nonsemantic and prevent unsafe imported style values. |

### 5 — Standalone authoring and persistence

| Field | Value |
|---|---|
| ID | 5 |
| Parent ID |  |
| Statement | The application **SHALL** support local assurance-case authoring without an SSTPA Tools backend or graph database. |
| Verification Method | Demonstration |
| Verification Statement | Disconnect network access, open a local vault, edit an argument, validate it, save it and reopen it. |
| Source | U; L FR-1/FR-58, NFR-1 |
| Rationale | Keep the prototype independently operable. |

### 5.1 — Vault workflow

| Field | Value |
|---|---|
| ID | 5.1 |
| Parent ID | 5 |
| Statement | The application **SHALL** support choosing a local vault and creating or opening a Goal root in that vault. |
| Verification Method | Demonstration |
| Verification Statement | Create a vault and root, close it, choose it again and confirm the new root is available. |
| Source | L FR-2–6; B §6.5.11.3 adapted |
| Rationale | Replace SoI and Asset-Loss invocation with local case selection. |

### 5.2 — Element editing

| Field | Value |
|---|---|
| ID | 5.2 |
| Parent ID | 5 |
| Statement | The application **SHALL** support creation, statement editing and deletion of the six core GSN element types. |
| Verification Method | Test |
| Verification Statement | Create each type, edit its statement and remove a non-root sample; confirm the resulting persisted model matches the operations. |
| Source | B §6.5.11.10; L FR-24–28 |
| Rationale | Retain an authoring application rather than a static renderer. |

### 5.3 — Semantic markdown

| Field | Value |
|---|---|
| ID | 5.3 |
| Parent ID | 5 |
| Statement | The application **SHALL** persist semantic elements and relationships in Markdown notes with stable frontmatter and Obsidian-compatible wikilinks. |
| Verification Method | Test |
| Verification Statement | Round-trip fixtures containing every element and both relationship types; compare semantic values and inspect the generated wikilinks. |
| Source | L FR-52–61; B §6.5.11.9 adapted |
| Rationale | Enable local portability and alternate note tools. |

### 5.4 — Semantic layout separation

| Field | Value |
|---|---|
| ID | 5.4 |
| Parent ID | 5 |
| Statement | The application **SHALL** preserve semantic nodes and relationships when layout metadata is absent or stale. |
| Verification Method | Test |
| Verification Statement | Remove the layout file and introduce a stale node position in separate fixtures; confirm the same semantic serialization and a usable layout in both. |
| Source | L FR-62; B §6.5.11.9/.22 |
| Rationale | Prevent visualization metadata from becoming the argument authority. |

### 5.5 — Actionable validation

| Field | Value |
|---|---|
| ID | 5.5 |
| Parent ID | 5 |
| Statement | The application **SHALL** present validation findings with severity, affected identifier and a rule-specific explanation. |
| Verification Method | Test |
| Verification Statement | Validate invalid, incomplete and valid fixtures and inspect their finding records and visible summaries. |
| Source | B §6.5.11.14/.22 |
| Rationale | Enable correction without reverse-engineering the validator. |

### 5.6 — Save errors

| Field | Value |
|---|---|
| ID | 5.6 |
| Parent ID | 5 |
| Statement | If a vault read or write fails, the application **SHALL** display the failure without reporting successful persistence. |
| Verification Method | Test |
| Verification Statement | Use a failed filesystem operation fixture or read-only destination and confirm a visible failure with no success state. |
| Source | B §6.5.11.22; L FR-56 adapted |
| Rationale | Avoid mistaken assurance that edits reached disk. |

### 5.7 — Data privacy

| Field | Value |
|---|---|
| ID | 5.7 |
| Parent ID | 5 |
| Statement | The application **SHALL** perform the standalone core workflows without transmitting vault contents to a network service. |
| Verification Method | Analysis |
| Verification Statement | Inspect runtime network behavior and source imports for open, edit, validate, arrange, save and export; confirm no vault payload leaves the local process. |
| Source | L NFR-12 |
| Rationale | Preserve the offline privacy property. |

### 5.8 — Atomic file replacement

| Field | Value |
|---|---|
| ID | 5.8 |
| Parent ID | 5 |
| Statement | When saving an existing vault file, the native filesystem adapter **SHALL** replace that file through a completed temporary-file write and rename operation. |
| Verification Method | Test |
| Verification Statement | Inject a temporary-write failure and confirm the original file content remains intact; exercise a successful replacement and confirm the complete new content. Record native runtime qualification separately from mocked adapter tests. |
| Source | L FR-56; B §6.5.11.22 adapted |
| Rationale | Reduce corruption risk without claiming a multi-file transaction. |

### 5.9 — Vault-relative paths

| Field | Value |
|---|---|
| ID | 5.9 |
| Parent ID | 5 |
| Statement | The vault adapter **SHALL** reject absolute paths and parent-directory traversal segments before executing a vault file read or write. |
| Verification Method | Test |
| Verification Statement | Attempt absolute POSIX/Windows paths and forward/backslash parent traversal paths; confirm rejection before any filesystem call and acceptance of a normal vault-relative note path. |
| Source | L NFR-14; project-derived input boundary |
| Rationale | Keep vault operations within their user-selected path boundary. |

### 5.10 — Wizard evidence control

| Field | Value |
|---|---|
| ID | 5.10 |
| Parent ID | 5 |
| Statement | The Goal Wizard **SHALL** require an explicit author action before applying a proposed argument change or attaching evidence. |
| Verification Method | Test |
| Verification Statement | Open and dismiss each coaching step without Apply; confirm the graph is unchanged, then apply a proposal and confirm only the displayed change appears. |
| Source | L FR-46–51; G Part 2 §3 |
| Rationale | Retain optional guided authoring without inventing evidence or forced edits. |

### 6 — Evidence and review exports

| Field | Value |
|---|---|
| ID | 6 |
| Parent ID |  |
| Statement | The application **SHALL** distinguish structural argument validity from evidence sufficiency and approval by a security regime official. |
| Verification Method | Inspection |
| Verification Statement | Inspect validation and example/report language; confirm passing syntax is not labeled certification, accepted risk or completed independent verification. |
| Source | U; G §0:4 and §1:2.3; B §6.5.11.23 adapted |
| Rationale | A persuasive case still requires evidence and accountable review. |

### 6.1 — Evidence association

| Field | Value |
|---|---|
| ID | 6.1 |
| Parent ID | 6 |
| Statement | The application **SHALL** support one or more evidence-note references on a Solution without drawing an evidence node inside the Solution circle. |
| Verification Method | Test |
| Verification Statement | Attach two evidence notes to a Solution, save and reopen; confirm both references and inspect the circle and evidence details. |
| Source | G §1:2.3.4; B §6.5.11.12/.25 |
| Rationale | Represent Solutions as evidence references, preserving the GSN symbol. |

### 6.2 — Incomplete evidence

| Field | Value |
|---|---|
| ID | 6.2 |
| Parent ID | 6 |
| Statement | The validator **SHALL** report a Solution with no resolvable evidence-note reference as incomplete. |
| Verification Method | Test |
| Verification Statement | Validate empty-reference and missing-target Solution fixtures; confirm incomplete diagnostics and compare with a resolvable-reference fixture. |
| Source | B §6.5.11.8/.12/.22; L FR-38–41 |
| Rationale | Make absent evidence visible. |

### 6.3 — Unfinished support

| Field | Value |
|---|---|
| ID | 6.3 |
| Parent ID | 6 |
| Statement | The validator **SHALL** identify Goals and Strategies without supporting children while preserving explicitly undeveloped status. |
| Verification Method | Test |
| Verification Statement | Compare supported, unsupported and explicitly undeveloped Goal/Strategy fixtures; confirm findings distinguish unfinished branches without silently marking them complete. |
| Source | G Table 1:2-1; B §6.5.11.23 |
| Rationale | Expose the remaining work in a draft case. |

### 6.4 — SVG figure export

| Field | Value |
|---|---|
| ID | 6.4 |
| Parent ID | 6 |
| Statement | The application **SHALL** export a full-argument SVG containing the current GSN shapes, complete statement text and relationship styles. |
| Verification Method | Test |
| Verification Statement | Export the six-element and FireSat fixtures, reopen the SVG and compare visible IDs, text, shape types and edge directions with the source graph. |
| Source | U; B §6.5.11.19/.23 |
| Rationale | Supply scalable figures for customer and certification reports. |

### 6.5 — Structured exports

| Field | Value |
|---|---|
| ID | 6.5 |
| Parent ID | 6 |
| Statement | The application **SHALL** export Markdown and JSON representations containing the argument identifiers, statements, typed relationships and evidence references. |
| Verification Method | Test |
| Verification Statement | Export a known fixture and compare its nodes, statements, relationship triples and evidence links with the model. |
| Source | B §6.5.11.19; L FR-43–45 |
| Rationale | Keep the argument reviewable and transferable. |

### 6.6 — FireSat example

| Field | Value |
|---|---|
| ID | 6.6 |
| Parent ID | 6 |
| Statement | The repository **SHALL** include an openable FireSat GSN case whose Loss claims and source references derive from the prototype Loss Tool example. |
| Verification Method | Analysis |
| Verification Statement | Compare the shipped case and its source notes against the referenced Loss Tool fixture; confirm retained Loss identity, claim derivation and source file provenance. |
| Source | U; A FireSat example |
| Rationale | Demonstrate the required workflow with traceable source material. |

### 6.7 — Illustrative evidence limits

| Field | Value |
|---|---|
| ID | 6.7 |
| Parent ID | 6 |
| Statement | The FireSat example **SHALL** identify prototype calculations as illustrative and expose missing independent verification or acceptance evidence. |
| Verification Method | Inspection |
| Verification Statement | Read the example contexts, assumptions, evidence notes and report; confirm no illustrative metric or placeholder document is presented as an operational FireSat measurement or approval. |
| Source | U; A docs/Architecture.md metric semantics |
| Rationale | Avoid fabricating the substance of the assurance case. |

### 6.8 — Development storyboard

| Field | Value |
|---|---|
| ID | 6.8 |
| Parent ID | 6 |
| Statement | The development report **SHALL** show the progression from prototype Loss source through top claim, context, strategy, supporting claims, evidence and final reviewer view. |
| Verification Method | Inspection |
| Verification Statement | Review each storyboard scene and its source/claim/evidence explanation; confirm the final scene identifies unresolved evidence or decision gaps. |
| Source | U; G Part 2 §3 |
| Rationale | Explain how the case was constructed, not only its final appearance. |

### 7 — SSTPA integration boundary

| Field | Value |
|---|---|
| ID | 7 |
| Parent ID |  |
| Statement | The architecture **SHALL** separate the semantic case model and validation rules from diagram rendering and storage adapters. |
| Verification Method | Inspection |
| Verification Statement | Inspect module imports and the architecture document; confirm core model/rule modules have no React, Tauri or SSTPA backend dependency. |
| Source | U; A docs/Architecture.md; L Architecture §4 |
| Rationale | Permit a future SSTPA host adapter without rewriting GSN semantics. |

### 7.1 — Integration mapping

| Field | Value |
|---|---|
| ID | 7.1 |
| Parent ID | 7 |
| Statement | The repository **SHALL** document mappings from standalone GSN types, relationship types, evidence notes and layout metadata to SSTPA Goal Keeper data. |
| Verification Method | Inspection |
| Verification Statement | Review the integration mapping and confirm each standalone type and relationship has an explicit SSTPA destination or deferred decision. |
| Source | U; B §6.5.11.6–9/.12/.21 |
| Rationale | Make eventual integration concrete without pretending that a live adapter exists. |

### 7.2 — Read-only source isolation

| Field | Value |
|---|---|
| ID | 7.2 |
| Parent ID | 7 |
| Statement | The delivered changes **SHALL** remain within the GoalKeeper repository while treating SSTPA Tools and the Loss Tool prototype as reference sources. |
| Verification Method | Inspection |
| Verification Statement | Inspect changed-file lists and source-tree status recorded for the task; confirm no source-project edit belongs to this change. |
| Source | U; L C-1/C-2; project Agent.md |
| Rationale | Protect the flagship and source prototype during independent development. |

### 7.3 — Verification record

| Field | Value |
|---|---|
| ID | 7.3 |
| Parent ID | 7 |
| Statement | The development report **SHALL** record observed results for each SRS requirement and identify any unexecuted procedure, failed test or platform limitation. |
| Verification Method | Inspection |
| Verification Statement | Cross-check the report against the SRS IDs, commands, logs and screenshots; confirm that no unexecuted procedure is reported as passed. |
| Source | U; B §6.5.11.24; L NFR-15–18 |
| Rationale | Make the push and completion claim reviewable. |

## 5. Acceptance and deferrals

The verification procedures in `VERIFICATION_GoalKeeper.md` precede implementation. A passing automated suite alone does not establish visual, native-desktop or source-provenance acceptance. The development report records each requirement as PASS, FAIL, PARTIAL or NOT RUN with evidence. GitHub push follows the applicable automated gates; any broader verification gaps remain explicit in the report.

Full SysML/KerML grammar interchange, a live SSTPA backend adapter, automatic production Asset-Loss root creation, authentication/SoI/HID administration, graph-database transactions, argument extensions, native Windows/macOS qualification, branch folding with off-diagram notation, PNG image export, arbitrary freeform model-text editing, full-text search, undo history and filesystem watch/rename repair are deferred. These are not silently represented as completed capabilities. Existing compatible authoring workflows, including the optional wizard, remain available where implemented; they are not grounds to restore conflicting GSN presentation rules.

Per-file failure reporting is required; this baseline does not claim multi-file ACID transactions from a Markdown vault. The future SSTPA adapter retains its own authorization and transactional validation responsibilities. Timing claims from the previous SRS's unspecified “typical developer laptop” are replaced by recorded fixture size, machine and observed timing in verification evidence.

## 6. Traceability and quality record

`REQUIREMENT_DISPOSITION.md` records imported, adapted, rejected and deferred source obligations, including explicit contradictions. `REQUIREMENTS_QUALITY.md` records the draft, individual quality, verification-method, hierarchy and set checks performed under R. `requirements.json` is the machine-readable mirror of §4. This baseline contains no MUST statement: its privacy requirement is already an atomic, verifiable control rather than a vague security-control generator.

## 7. Revision history

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-07-19 | Prior standalone KerML-primary baseline; now superseded |
| 1.0 | 2026-10-04 | GSN core shapes and legal edges, menu model projection, customer presentation, ELK layout, provenance, verification and integration boundary |
