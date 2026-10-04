# Requirements quality record

Baseline: GoalKeeper SRS v1.0, 2026-10-04. Workflow: `/home/netrisk/Projects/Requirements/Skills.md`.

## Completed workflow

1. **Ingest:** read project directives, current standalone SRS/Architecture, current SSTPA SRS v7 relevant sections, local GSN v3 standard (complete notation pages 17–18 visually inspected), and Loss prototype architecture. No source archive was used.
2. **Draft all:** complete candidate set was captured in task scratch before numeric hierarchy assignment. The scope covers semantics, presentation, model pop-up, layout, local authoring, evidence/export/example and integration.
3. **Individual quality:** reviewed C1–C9 and the required writing rules; changed subjective “polished” into notation fidelity, full-text rendering, minimum text size, contrast and workspace width criteria. Replaced vague performance hardware language with recorded observations. Removed nonstandard Strategy→Solution permission and KerML-precedence conflict.
4. **Verify:** assigned exactly one Inspection, Analysis, Demonstration or Test method and an observable verification statement to each requirement.
5. **Hierarchy:** assigned seven intentional roots and numeric child IDs after drafting/quality review. No MUST generator was needed because privacy is a directly testable leaf control.
6. **Set check:** assessed the set against C10–C15, source dispositions, scope and dependencies.
7. **Emit:** saved SRS first, then companion procedures; saved their machine-readable requirement mirror before implementation was released to the team.

## Individual quality conclusions

| Characteristic | Review result |
|---|---|
| C1 Necessary | Each requirement has a user, standard or inherited-source pointer and rationale |
| C2 Appropriate | Application-level statements; ELK is an explicit source-derived implementation constraint |
| C3 Unambiguous | Defined profile, controlled type/edge lists and clear result vocabulary |
| C4 Complete | Conditions and fixtures supplied; excluded GSN extensions explicitly named |
| C5 Singular | Related lists define one capability or validation rule set; unrelated capabilities separated |
| C6 Feasible | Uses local React/Tauri model and established SVG/ELK capabilities; verification may still expose implementation gaps |
| C7 Verifiable | One method and an acceptance statement per row; visual requirements require visual evidence |
| C8 Correct | GSN governs primary presentation; SSTPA inherited contradictions explicitly disposed |
| C9 Conforming | System subjects, active voice, bold uppercase SHALL, numeric hierarchy, no vague SHOULD omissions |

This is a requirements-quality review, not an assertion that the software satisfies every requirement. Requirements can be well-formed while a procedure remains unexecuted or an implementation is partial.

## Set checks and orphan/barren analysis

| Check | Disposition |
|---|---|
| C10 complete for bounded scope | Seven domains cover the requested revision; production adapters and full v3 extensions have explicit deferrals |
| C11 consistent | Exact edge matrix replaces legacy exception; GSN primary and optional model projection are distinct; saved layout is not semantic authority |
| C12 feasible together | Main diagram, view-only projection and core model share one argument; no mandatory online/backend dependency |
| C13 comprehensible | Numeric hierarchy and machine mirror; companion source disposition and procedure matrix |
| C14 validatable | Every requirement has upstream provenance and a procedure; user-facing visual aims have observable measures |
| C15 correct as a set | Customer GSN presentation, optional model pop-up, standalone/source isolation, FireSat and integration intent retained |
| Orphans | None unresolved: seven roots directly trace to the user/source; every child has one numeric parent |
| Barren items | None unresolved: leaf requirements have direct verification; aggregate roots depend on their children and inspection/analysis |

## Remaining qualification risks

Native file operations, operating-system window focus and packaged Linux behavior need evidence from a native run; browser screenshots and core tests cannot prove them. Very long text and shared-support graphs need explicit visual checks. The optional model text projection has no full language parser certification. FireSat prototype values are illustrative; operational evidence and regime acceptance are deliberately open items.

## Mechanical record checks

A local consistency check passed for all **52** requirement records: unique IDs, nonempty statements/source/rationale/verification fields, valid primary parents, one allowed verification method, bold SHALL statements, one matching SRS heading and one matching verification-procedure row per ID. This confirms documentation coverage, not implementation conformance.

## Color-selector extension — SRS 1.1

The three color candidates were drafted together before assignment to 2.9, 2.10 and 4.6. C1–C9 review confirms explicit observable subjects/actions, finite type/channel scope, testable outcomes and source/rationale. C10–C15 review assigns presentation behavior under 2 and persistence under 4; no orphan or conflicting requirement remains. Requirement 2.5 now explicitly covers shipped defaults because the authorized Loss-style selector permits user-chosen low-contrast colors. The notation geometry and arrow semantics remain governed by 2.1–2.3. Mechanical checks passed for all 55 records: unique IDs, valid parents, required fields, approved methods and matching SRS/procedure entries. Procedures were updated before implementation; this record does not claim executed verification.
