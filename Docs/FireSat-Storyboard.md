# FireSat: developing the authentic-report assurance case

This storyboard follows the prototype Loss **“Loss of authentic fire reports”** into a customer-facing GSN argument. The result is an **illustrative draft** with explicit evidence gaps. It is not an assertion that FireSat is secure, that a control was tested, or that a security regime authority accepted the residual exposure.

The openable case is [`examples/firesat-vault`](../examples/firesat-vault/), with root `FireSat-Authentic-Reports/G1.md`. The application’s FireSat example and the disk vault use the same Markdown and JSON files through `src/examples/firesat.ts`. The vault contains 18 GSN elements, two source Evidence notes and the Loss-source snapshot. Opening it applies the application layout manager; saving a layout is a presentation decision.

## Source provenance

| Source | Recorded baseline | What it establishes |
|---|---|---|
| Loss Tool `src/examples.ts`, `createOverview()` | `netrisk2025/attack-tree`, commit `8d7641d8e1fe5ef9fcbf7bb912dde4cdf922fc28` | The prototype’s exact Loss, Asset, scope, attacks, countermeasures and disposition fields |
| Loss Tool `src/domain/paths.ts`, `analyzePaths()` | Same commit | The prototype’s route enumeration and classifications |
| SSTPA FireSat `model/10-space-segment.yaml` | Local read-only source, repository HEAD `05e076bfc8a18e36e146b5ecf01121c32566448c` | Named payload system, environment, states, component, interfaces and function |
| SSTPA `FireSat-Hierarchy.md` | Same local source baseline | Hierarchical interpretation and payload identity |

[The bundled snapshot](../examples/firesat-vault/Artifacts/loss-source-snapshot.json) records each source’s SHA-256 hash, exact node/edge inventory, extracted routes, decisions and limits. The unchanged prototype factory and path analysis were evaluated read-only in memory. Neither source project was modified. The source example’s illustrative risk inputs and simulated authoritative UUIDs are not used as operational assurance evidence.

The source Loss has local ID `loss`, illustrative HID `DEMO_LOSS`, and Asset `DEMO_AST_FIRE_REPORTS` (“Fire detection reports”). Scope is **Fire Detection Payload `SYS_1.1.2_0`**, **Payload Operating Environment `ENV_1.1.2_1`**, **Standby `ST_1.1.2_1`** and **Imaging `ST_1.1.2_2`**. The prototype assigns Mission Critical / Authenticity to this example; those assignments are not an independent mission risk assessment.

## Storyboard

Each scene describes an authoring step, the GSN content it produces and the question a reviewer can answer. The sequence follows GSN v3 Part 2 §3, printed pages 59–70: identify goals; define their basis; identify strategy; define its basis; elaborate it; identify solutions. The method is recursive and does not imply that every branch closes at the same depth.

### Scene 1 — State the claim

**Composition:** `G1` is the entry point, with the exact source Loss retained in `C2`.

**Author action:** Start from the Loss Tool’s “Loss of authentic fire reports”, identify the protected fire detection reports and write a positive assurance claim: *“Loss of authentic fire reports is acceptably controlled in the declared Fire Detection Payload configuration.”* Preserve the source Loss and Asset identifiers in the note metadata.

**Reviewer’s question:** What outcome does this case ask me to accept?

**Result:** A claim to be argued. Its presence on the canvas is not evidence that it is true. “Illustrative draft” remains explicit in the case status and evidence boundary.

### Scene 2 — Bound the claim

**Composition:** `G1` has contextual links to `C1` and `C2`; `C3` later bounds the acceptance branch.

**Author action:** State the payload operating environment and the two reviewed States. Identify the system boundary and protected asset. Record that acceptance criteria, operational evidence and authority decisions are outstanding. Avoid interpreting a state list as an ordered attack scenario: the separate SAND prototype variant is not this source case.

**Reviewer’s question:** Which configuration, environment and security property are included?

**Result:** A declared scope. The source model provides system identities; it does not establish that the model is complete or the operating configuration is independently verified.

### Scene 3 — Choose and explain the strategy

**Composition:** `G1 → S1`; `S1` is a parallelogram, linked laterally to oval justification `J1`.

**Author action:** Argue over source traceability, the four attack surfaces in the Loss Tool and the justification of residual decisions. Add `J1` to explain why processor, sensor, classification and downlink branches were selected.

**Reviewer’s question:** Why should this decomposition address the top claim?

**Result:** A visible inference, distinct from its evidence. `J1` records the rationale for using this source’s structure; it does not claim threat completeness beyond the modeled routes.

### Scene 4 — Elaborate the argument

**Composition:** `S1 → G2, G3, G4, G5, G6, G7`. Rectangular Goals show their full claim text. Undeveloped diamonds remain below `G3`–`G6`.

| Goal | Loss-source trace | Required operational substantiation |
|---|---|---|
| `G2` Traceable scope and coverage | Source Loss, payload scope and route inventory | Source records are supplied through `Sn1`; completeness beyond that baseline is not claimed |
| `G3` Trusted payload processing | Shared Payload Processor; altered firmware, diagnostic access, signed updates, custody, update authorization and derived key confidentiality | Configuration and access-control evidence; signed-update enforcement and bypass tests; key-custody analysis and subordinate key case |
| `G4` Authentic sensor frames | Sensor Video Input Interface; altered-frame injection; frame-provenance check | Provenance enforcement and failure/bypass evidence; `C4` exposes that the recorded Complete Block is not demonstrated |
| `G5` Trusted classification | Classification bias; calibration alteration; baseline protection; review bypass | Protected baseline and calibration records; classification integrity checks; bypass testing and independent review |
| `G6` Fresh downlink reports | Replay; freshness window; counter rollover | Defined freshness criteria; replay, wraparound and state-transition tests |
| `G7` Justified residual decisions | Allowed, Blocked, Derived and tailored-out routes | Recorded decision facts (`G8`) plus independently justified authority acceptance (`G9`) |

**Reviewer’s question:** Which branches carry actual assurance, and which remain work to do?

**Result:** The example records its missing evidence explicitly. A developer must not remove a diamond merely because a source model names a countermeasure.

### Scene 5 — Attach evidence without overstating it

**Composition:** `G2 → Sn1` and `G7 → G8 → Sn2`. Solutions are circles. `G7 → G9` remains undeveloped. `A1` and `C3` attach as context to `G7`.

**Author action:** Link `Sn1` to [`FS-E1`](../examples/firesat-vault/Evidence/FS-E1.md), which records source scope and inventory. Link `Sn2` to [`FS-E2`](../examples/firesat-vault/Evidence/FS-E2.md), which records prototype disposition fields and their rationale. Both Evidence notes reference the bundled snapshot. State the assumption that the retired development interface is absent; retain the need for configuration evidence.

**Reviewer’s question:** Can I follow each evidence reference, and does it establish the claim that cites it?

**Result:** Two narrow record claims have traceable evidence. Operational claims remain open. The source has 25 nodes and 25 edges, yielding nine terminal routes: four unaddressed RV, two Allowed, two Derived and one Blocked. Shared processor identity occurs in two States; these are route counts, not independent attacks or probabilities. The Environment context and tailored-out retired-interface route are excluded by the source algorithm.

### Scene 6 — Review the unfinished case

**Composition:** Review the full primary GSN diagram, then the Validation and Evidence views. Open the alternate SysML/KerML projection only through the View menu when engineering trace is useful. Export the GSN figure and the semantic report for independent review.

**Author action:** Check the source hashes and supporting references, inspect each unexplained assumption and verify that undeveloped Goals remain visible. Record any new evidence with its scope, revision and limitations before connecting it to an operational Goal. Only a justified independent acceptance decision can close `G9`.

**Reviewer’s question:** What remains unresolved before I could accept this case?

**Result:** The shipped case is expected to have no structural ERROR findings, with explicit unfinished branches at **G3, G4, G5, G6 and G9**. Missing-support and undeveloped diagnostics are deliberate. The unresolved work includes operational requirements and acceptance criteria, control effectiveness, key confidentiality, excluded-interface configuration evidence, treatment of residual routes and the regime authority’s decision. Passing GoalKeeper’s tests establishes software behavior; it does not establish the FireSat root security claim.

## Trace from source decisions to remaining work

| Source decision | Exact scope | Shipped treatment |
|---|---|---|
| Allowed RV `1` | Edge `signed--keytheft`; restricted maintenance exposure during example campaign | The original rationale is recorded in `FS-E2`; approval and sufficiency remain open under `G9` |
| Complete Block | Edge `video-tamper--frame-check` | `C4` distinguishes the source claim from a demonstrated control; `G4` stays undeveloped |
| Derived Asset | `DEMO_DERIVED_KEY`, Update signing key confidentiality | `G3` and `FS-E2` expose the need for a subordinate assurance obligation |
| Tailored out | Edge `downlink--obsolete`; retired development interface | `A1` is explicit, with configuration evidence still required |
| Unaddressed routes | Diagnostic access in two States, calibration-review bypass, counter rollover | `G3`, `G5` and `G6` remain undeveloped |

## Verification references

`tests/core/firesat.test.ts` checks the openable case, six core element types, legal relationship matrix, exact source identity/counts and intentional undeveloped branches. The SRS requirements **6.6–6.8** and procedures **V-6.6–V-6.8** control source traceability, evidence limits and this storyboard. Actual software test outcomes and browser screenshots belong in the development verification report; this storyboard does not claim an unexecuted verification procedure has passed.
