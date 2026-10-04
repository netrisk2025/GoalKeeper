# Terminology — GoalKeeper

Imperatives follow `/home/netrisk/Projects/Resource.md` and the requirements workflow:

- **SHALL** — mandatory and verifiable.
- **SHOULD** — treated as SHALL unless an omission is justified and authorized.
- **WILL** — expected outcome rather than a new implementation obligation.
- **MAY** — optional; if employed, treated as SHALL.
- **MUST** — broad security-condition parent that generates concrete SHALL controls, as defined by `/home/netrisk/Projects/Requirements/Skills.md`.

| Term | Meaning |
|---|---|
| Root Goal | Single top-level `GsnGoal` of a standalone case; the single-root restriction is a product rule |
| Goal Structure / case | Directed acyclic graph of core GSN elements rooted at one Root Goal; shared descendants are permitted |
| Core GSN profile | Six elements and two relationship types in GSN v3 Part 1 §2, including undeveloped Goal/Strategy markers; extensions and off-diagram continuation are outside this baseline |
| Vault | User-selected directory holding case directories and optional shared Evidence notes |
| Root Goal directory | Directory containing a case's semantic Markdown notes and presentation sidecar |
| GSN ID | Identifier unique within the case, such as G1, S1 or Sn1; independent of production SSTPA HIDs |
| Wikilink | Obsidian-style note reference such as `[[G1]]` or `[[Evidence/Source]]` |
| Goal Wizard | Optional Six-Step coaching; only explicit author Apply actions change the argument |
| GSN primary view | Standard rectangles, parallelograms, circles, rounded-ended Contexts and A/J ovals with standard relationship arrows |
| Alternate model projection | Read-only SysML/KerML-style graph and model text in a menu-requested pop-up; illustrative unless parser-verified |
| Layout Manager | Computes explicit hierarchical arrangement and placement of nodes without saved positions |
| Working layout | In-memory positions and viewport, including unsaved manual changes |
| Last-saved layout | Positions/viewport written by Save Layout to `_layout.json`; non-authoritative for semantics |
| Evidence note | Source/provenance record referenced by a Solution; existence does not prove evidential sufficiency |
| Structurally valid | Passes implemented graph/rule checks; does not mean certified, independently verified or accepted by a regime official |
| Undeveloped | Goal or Strategy explicitly left unfinished; drawn with a hollow diamond at bottom centre |
| Prototype value | Illustrative Loss Tool analysis input/result, not an operational FireSat measurement |
