# GoalKeeper requirement disposition and source provenance

Baseline date: 2026-10-04. This record applies only to the standalone GoalKeeper revision. It does not edit or change the normative SSTPA Tools SRS. The current user direction supersedes conflicting inherited instructions inside GoalKeeper.

**Disposition meanings:** retained = same intent; adapted = intent preserved with a standalone interface or measurable criterion; rejected = conflicting obligation removed; deferred = explicit future scope, not implemented compliance. New SRS identifiers refer to `SRS_GoalKeeper.md` v1.0. The source is the current SSTPA `SSTPA Tool SRS V7.md` read on 2026-10-04, not an archived version.

## Explicit conflict decisions

| Source clause | Conflict | Disposition | New requirement / explanation |
|---|---|---|---|
| SSTPA §6.5.11.1, first paragraph | Requires GSN concepts modeled visually per KerML | Rejected for primary presentation | 1, 2; GSN v3 core notation controls the primary canvas |
| SSTPA §6.5.11.25, first two paragraphs | Gives KerML precedence over GSN while later prescribing GSN shapes | Rejected precedence; retain correct shapes | 2.1–2.3; resolve internal contradiction in favor of GSN Table 1:2-1/2 |
| SSTPA §6.5.11.7 and .8 | Permits Strategy→Solution support | Rejected | 1.2; Table 1:2-2 permits Strategy→Goal only; insert a meaningful Goal manually when migrating, never silently invent a claim |
| Standalone v0.2 §2.3/.4, D-2, NFR-7, §12 geometry row | Prohibits GSN shapes as primary rendering | Rejected | 2–2.3; exact prescribed shapes now required |
| Standalone v0.2 D-5, FR-17/FR-21 | Nonstandard support exception and Strategy elaboration to Solution | Rejected exception | 1.2, 1.7, 6.3; legacy illegal edges remain inspectable with findings |
| Standalone Architecture v0.2 §§2,4.5,5.4,13 | Cytoscape/fcose direction, all rounded cards, statement snippets, dashed contextual notation | Replaced | 2.1–2.4, 4; SVG geometry and ELK layered layout; solid line with hollow contextual arrow |
| SSTPA §6.4.2 and §6.5.11.26 | Permanent docked/resizable model text panel occupies main window | Rejected docking; adapted projection access | 3–3.3; View-menu pop-up, no reserved main-window model column |
| SSTPA §6.5.11.25 metadata list | HID/type/name/statement all mandatory in every visible node | Adapted | 2.4, 3.1; primary notation prioritizes GSN ID and full statement; extra technical metadata belongs in inspector/projection |
| Standalone Agent.md and old SRS/Architecture approval text | Additional approval before implementation | Superseded by explicit current instruction | User requests SRS, then procedures, then implementation; no new approval gate introduced |

## SSTPA SRS port review

| SSTPA source | Disposition | Standalone treatment and trace |
|---|---|---|
| §3.3 GSN node/edge schema; §3.7.5–7 model mapping | Adapted | 1, 7.1; preserve type names and source IDs when available; renderer-independent mapping; projection is illustrative until parser-verified |
| §6.2 typography, §6.3.1 branding | Adapted | 2.4–2.6/2.8; legible sans body, identifier clarity, restrained ivory/navy/gold chrome and light/dark support |
| §6.4.1 tool style | Retained/adapted | 2.5/2.6/3.3; accessible contrast, focus, shape semantics; no ornament inside notation |
| §6.4.2 model text shell | Adapted/rejected docking | 3–3.3; separate requested model projection; editing arbitrary model text is deferred |
| §6.5.10.20 Loss/Goal Keeper integration | Adapted | 6.6/6.7, 7.1; Loss provides analysis source/provenance, not proof of assurance acceptance; live launch/integration deferred |
| §6.5.11.1 purpose | Retained/adapted | 1/5/6; standalone assurance argument; selected root instead of mandatory Asset-Loss backend context |
| §6.5.11.2 wireframe | Adapted | 2.7/3; canvas-focused main view and optional side panels |
| §6.5.11.3 invocation; .4 supported context | Adapted/deferred | 5.1; local vault/root chooser replaces Data Drawer/SoI launch. Production context handoff reserved for integration adapter |
| §6.5.11.5 modes | Retained/adapted | 4.5,5.5,6.1–6.5; Structure, evidence inspection, validation and review/export capabilities |
| §6.5.11.6 node types | Retained | 1.1; root is Goal, meanings follow GSN core; no requirement to fabricate Asset or Loss nodes |
| §6.5.11.7 relationships | Retained with conflict removal | 1.2–1.5; exact legal GSN matrix; local validation replaces backend gate |
| §6.5.11.8 structural rules | Retained with correction | 1.6/1.8/6.2/6.3; single-root product rule, no circular support, Solutions terminal, incomplete evidence shown |
| §6.5.11.9 persistence | Adapted | 4.2–4.4/5.3/5.4; Markdown authority and separate JSON layout replace Neo4j/GoalStructure storage |
| §6.5.11.10 node editing | Retained/adapted | 5.2; local IDs and file identity replace production HID/uuid administration |
| §6.5.11.11 edge editing | Retained/adapted | 1.2–1.5/4.5; legal explicit actions, invalid candidates rejected; freehand connection dragging not required |
| §6.5.11.12 evidence | Adapted | 6.1/6.2; local Evidence notes replace live Validation/Verification/Loss nodes; evidence metadata remains distinct from GSN semantics |
| §6.5.11.13 Asset/Loss/root integration | Adapted/deferred | 5.1/6.6/7.1; source Asset/Loss IDs retained as provenance; no automatic production object creation |
| §6.5.11.14 validation | Retained/adapted | 1.2–1.8/5.5/6.2/6.3; local pure validation; no SoI authorization claim |
| §6.5.11.15 interaction | Retained subset; deferred remainder | 3.3/4.5/5.2; pan, zoom, selection, drag, inspection. Full undo history, edge gestures, branch folding and modeless multi-window behavior deferred |
| §6.5.11.16 layouts | Retained/adapted | 4–4.4; ELK top-down layout, manual placement, explicit Arrange and saved restore. Left-to-right option is deferred |
| §6.5.11.17 search/navigation | Adapted/deferred | 4.5 covers inspection/navigation; full indexed HID/uuid/text/evidence search deferred; standalone GSN IDs remain primary |
| §6.5.11.18 Data Drawer | Deferred | 7.1 describes future host integration; no editing of flagship code |
| §6.5.11.19 export | Retained subset; deferred remainder | 6.4 SVG; 6.5 JSON/Markdown. Dedicated PNG, cropped viewport export and production HID/uuid payloads deferred |
| §6.5.11.20 performance | Adapted | Explicit bounded graph traversal/async layout implementation and recorded workload/timing evidence; no unverifiable “efficient” or unmeasured “faster” claim |
| §6.5.11.21 backend transactions | Deferred with documented boundary | 5 local authoring,7 adapter; local vault is not a graph database or multi-file ACID backend |
| §6.5.11.22 error handling | Retained/adapted | 1.7/4.3/5.5/5.6/6.2; report invalid/missing material, stale layout safe, visible persistence failures |
| §6.5.11.23 certification reports | Retained/adapted | 6–6.8; clean SVG, evidence/provenance summaries, unsupported claims, honest approval gaps |
| §6.5.11.24 verification | Retained/adapted | 7.3 and companion procedures; controlled automated tests plus measured/manual visual evidence; production-only workflows explicitly deferred |
| §6.5.11.25 visual convention | Retained correct GSN content; rejected KerML override | 2–2.8; exact six shapes, decorators, arrows; evidence remains outside Solution circle |
| §6.5.11.26 model text | Adapted | 3–3.3; on-demand read-only graph/text projection; no unverified language-conformance claim |

## Prior standalone baseline disposition

The v0.2 source remains available in Git history. The new SRS replaces it; prior IDs do not remain hidden mandatory acceptance items.

| Legacy source | Disposition and reason | Current trace |
|---|---|---|
| FR-1–7 | Retain local/offline vault/root workflow and branding; recent-vault persistence is deferred where not implemented | 5/5.1 |
| FR-8–16 | Retain roots, reachability, core roles, identity and undeveloped state | 1.1/1.6/1.8 |
| FR-17–23 | Correct support matrix; retain context matrix, duplicate prevention and wikilinks | 1.2–1.5/5.3 |
| FR-24–28 | Retain evidence note references and incomplete status; optional artifact metadata preserved | 6.1/6.2 |
| FR-29–34/37 | Retain CRUD/legal links/navigation; full search deferred | 1.2–1.5/4.5/5.2 |
| FR-38–42 | Retain actionable severity/identifier findings; diagnostic severity follows structural versus incompleteness distinction | 1.6–1.8/5.5/6.2/6.3 |
| FR-43–45 | Retain Markdown/JSON; SVG now mandatory; PNG deferred | 6.4/6.5 |
| FR-46–51 | Retain optional coaching with explicit Apply; evidence remains authored/reference-based, never invented; extra coaching refinements not part of GSN geometry compliance | 5.10/6/6.7 |
| FR-52–55/58–61 | Retain Markdown authority, stable note types and wikilinks; filesystem rename/link repair deferred | 5/5.3 |
| FR-56/57 | Retain native per-file atomic replacement; external-change watching deferred; exact native qualification recorded separately | 5.6/5.8 and verification report |
| FR-62/77/79/80 | Retain semantic/layout separation and explicit Save Layout | 4.4/5.4 |
| FR-63–67/76 | Mandatory staged entrance animation removed from acceptance: complete static review is primary, motion is optional and respects reduced-motion preference | 2/4.5 |
| FR-68–75/78 | Retain explicit layout manager/manual/saved workflows; replace fixed tier layout with ELK | 4–4.5 |
| NFR-1–4 | Retain offline operation; replace vague hardware/performance wording with measured evidence; Windows/macOS qualification deferred | 5,7.3 |
| NFR-5–11-UI | Retain light/dark and restrained product identity; reject all-card geometry and clipped snippets | 2–2.8 |
| NFR-12–14 | Retain no transmission and reject absolute/traversal vault paths; native scope limitations disclosed, no network updates feature added | 5.7/5.9 and architecture |
| NFR-15–18 | Retain automated rules/round-trip/layout tests and scripted UI evidence | 7.3 and verification procedures |
| C-1–5 | Retain GoalKeeper-only development and read-only flagship; no Neo4j; explicit profile exclusions | 5,7.2, SRS §3 |

## GSN v3 scope disposition

| GSN source | Treatment |
|---|---|
| Part 1 §2.1.1–5, Tables 1:2-1/2 | Implement six symbols, IDs, undeveloped decorator and exact legal relationship matrix |
| Part 1 §2.2.2 | Reject loops; shared descendants allowed |
| Part 1 §2.2.3–19 | Preserve claim/support/context/assumption/justification meaning; no inferred truth from graph validity |
| Part 1 §2.2.20 off-diagram continuation | Deferred; full-case presentation avoids substituting a false continuation notation |
| Part 1 §2.3 language | Preserve claims, strategy reasoning, evidence references and contextual material as distinct roles |
| Part 1 §§3–6 | Pattern, modular, ACP and dialectic extensions explicitly excluded from this delivery |
| Part 2 §3 Six-Step Method | Guidance for wizard/storyboard, not enforced as the only valid authoring order |
| Part 2 §7 evaluation | Inform review questions; structural validator does not replace evidence audit or regulator judgment |
