# GoalKeeper verification procedures

Baseline: SRS v1.1, 2026-10-04. Prepared after the SRS and before implementation. Procedures are a plan; no PASS result is implied by this document.

## Environment and evidence

Record the commit under test, operating system, Node/npm versions, browser/WebView version, viewport, device scale, theme and whether the test uses native Tauri or the browser fallback. Use a disposable vault. Retain stdout/stderr, screenshots, exported SVG/JSON/Markdown and requirement result records. Never infer native filesystem or focus behavior from a pure-core unit test.

Controlled fixtures:

- **VP-01 core matrix:** all six GSN types; every ordered pair for both edge types; legal shared support; duplicate, self-link and multi-node cycle variants.
- **VP-02 notation:** every shape; A/J; undeveloped G/S; both arrows; statements of 40, 200 and 500 characters, multi-paragraph text and one 80-character unbroken token. Test at 1440×900, 100% zoom and both themes. SVG is inspected independently after export.
- **VP-03 validation:** missing/duplicate/non-Goal root, root with incoming support, duplicate IDs, unreachable node, illegal imported Strategy→Solution, unsupported G/S, missing evidence reference and unresolved evidence target.
- **VP-04 persistence:** six Markdown types, shared evidence notes, saved positions and viewport; stale layout IDs; added and deleted nodes; failed filesystem action.
- **VP-05 review:** delivered FireSat case plus source prototype Loss fixture and provenance notes; primary canvas, inspector, View menu, model pop-up, export.

Run the repository's unit tests, TypeScript checking and production build. Run native packaging/checks when the available toolchain supports them and report any toolchain failure separately. Record whether `lint` is a distinct lint pass or an alias of the type checker. Quantitative visual criteria need measurements or explicit screenshots with documented inspection, not only CSS source assertions.

## Requirement procedures

For each row: reset to the named fixture or a fresh disposable case, execute the action in “Procedure and acceptance”, compare the observable result with the SRS text, and attach evidence. Failure of any listed acceptance condition fails that row. Parent requirements are evaluated only after their children; a parent cannot pass while a required child is failed or unexecuted.

| Procedure | Requirement | Method | Fixture | Procedure and acceptance |
|---|---|---|---|---|
| V-1 | 1 | Analysis | VP-01 / VP-03 | Review the evidence for requirements 1.1–1.8 and confirm that no excluded extension is advertised as implemented. |
| V-1.1 | 1.1 | Test | VP-01 / VP-03 | Create and round-trip one of each type; confirm that each retains its type, identifier and statement. |
| V-1.2 | 1.2 | Test | VP-01 / VP-03 | Exercise every ordered pair of the six core types; accept exactly the four listed pairs, including rejection of Strategy→Solution. |
| V-1.3 | 1.3 | Test | VP-01 / VP-03 | Exercise every ordered pair of the six core types; accept exactly the six listed pairs. |
| V-1.4 | 1.4 | Test | VP-01 / VP-03 | Attempt self-links and two- and three-node cycles; confirm rejection and deep equality of the prior graph. |
| V-1.5 | 1.5 | Test | VP-01 / VP-03 | Add the same legal edge twice; confirm the second action yields a diagnostic and one stored edge. |
| V-1.6 | 1.6 | Test | VP-01 / VP-03 | Validate fixtures with a missing root, a second root, a non-Goal root, an incoming root edge, duplicate GSN IDs and an unreachable node; confirm each violation is reported. |
| V-1.7 | 1.7 | Test | VP-01 / VP-03 | Load a legacy Strategy→Solution fixture and cyclic fixture; confirm both remain inspectable and yield affected-node diagnostics rather than a silent conversion. |
| V-1.8 | 1.8 | Test | VP-01 / VP-03 | Toggle the marker on each type and validate imported invalid flags; confirm only Goals and Strategies accept the marker and invalid imported flags are reported. |
| V-2 | 2 | Inspection | VP-02 | Compare a six-element fixture and an undeveloped element against the standard pages 17–18 in the primary diagram and SVG export. |
| V-2.1 | 2.1 | Inspection | VP-02 | Inspect the six-shape fixture at 100% zoom; measure Solution width and height as equal within one CSS pixel and confirm each other outline matches Table 1:2-1. |
| V-2.2 | 2.2 | Inspection | VP-02 | Inspect A, J, undeveloped Goal and undeveloped Strategy fixtures in both themes and exported SVG; confirm markers are visible outside statement text. |
| V-2.3 | 2.3 | Inspection | VP-02 | Inspect both relationship types in both themes and SVG; verify head fill and direction against the source/target fixture IDs. |
| V-2.4 | 2.4 | Test | VP-02 | Render the long-text fixture defined in VP-02 at 100% zoom; inspect text extents against symbol boundaries and compare visible text with the model. |
| V-2.5 | 2.5 | Analysis | VP-02 | Calculate relative-luminance contrast from the shipped tokens for both themes and record each ratio; exclude ornamental accents that carry no information. |
| V-2.6 | 2.6 | Inspection | VP-02 | Inspect a full-canvas screenshot in each theme; confirm symbols and paths have no botanical, filigree or banner imagery. |
| V-2.7 | 2.7 | Test | VP-02 | Measure canvas width divided by workspace width at the specified viewport; confirm at least 0.80 and that the graph remains usable after reopening panels. |
| V-2.8 | 2.8 | Test | VP-02 | Select each theme, restart the application and confirm its persisted appearance. |
| V-2.9 | 2.9 | Test | VP-02 / VP-04 | Select each core type, change each of its four channels and reset all colors; confirm other types remain unchanged until reset, which restores theme defaults. |
| V-2.10 | 2.10 | Test | VP-02 / VP-04 | Set distinct colors on a fixture containing all six types and both legal edge types; compare SVG attributes in the primary graph, projection and export, including filled support heads, hollow context heads and unchanged semantic serialization. |
| V-3 | 3 | Demonstration | VP-05 | Open the View menu, launch the model view and close it with the close control and Escape; confirm it is absent from the main workspace before launch and after dismissal. |
| V-3.1 | 3.1 | Test | VP-05 | Compare node IDs, types and relationship triples in the primary graph, projection graph and model text; open and close the view and confirm unchanged semantic serialization. |
| V-3.2 | 3.2 | Inspection | VP-05 | Inspect the projection label and export description; confirm there is no unsupported claim of conforming SysML/KerML interchange. |
| V-3.3 | 3.3 | Test | VP-05 | Launch using the keyboard, traverse controls forward and backward, press Escape and confirm the invoking control receives focus. |
| V-4 | 4 | Test | VP-04 / VP-05 | Arrange a branched case with shared support; confirm parents are above supporting descendants, context is distinguishable from support, and geometry boxes do not overlap. |
| V-4.1 | 4.1 | Test | VP-04 / VP-05 | Drag a node, perform each listed operation and compare coordinates; confirm equality before explicit Arrange or Last Saved. |
| V-4.2 | 4.2 | Test | VP-04 / VP-05 | Drag nodes, change zoom and pan, save layout, reopen and compare the saved positions and viewport. |
| V-4.3 | 4.3 | Test | VP-04 / VP-05 | Save a layout, add a node and delete another, invoke Last Saved and confirm restored extant coordinates, finite new coordinates and no deleted visual node. |
| V-4.4 | 4.4 | Test | VP-04 / VP-05 | Compare layout storage before and after node drag and semantic Save; confirm only Save Layout changes the stored layout. |
| V-4.5 | 4.5 | Demonstration | VP-04 / VP-05 | Exercise each listed operation on the FireSat case and confirm that selection exposes the correct element for inspection. |
| V-4.6 | 4.6 | Test | VP-02 / VP-04 | Change colors, save semantic content and verify no sidecar write; Save Layout, change colors again, invoke Last Saved and reopen to verify restoration; load unknown types, missing channels, CSS payloads and malformed colors and confirm they are discarded. |
| V-5 | 5 | Demonstration | VP-04 | Disconnect network access, open a local vault, edit an argument, validate it, save it and reopen it. |
| V-5.1 | 5.1 | Demonstration | VP-04 | Create a vault and root, close it, choose it again and confirm the new root is available. |
| V-5.2 | 5.2 | Test | VP-04 | Create each type, edit its statement and remove a non-root sample; confirm the resulting persisted model matches the operations. |
| V-5.3 | 5.3 | Test | VP-04 | Round-trip fixtures containing every element and both relationship types; compare semantic values and inspect the generated wikilinks. |
| V-5.4 | 5.4 | Test | VP-04 | Remove the layout file and introduce a stale node position in separate fixtures; confirm the same semantic serialization and a usable layout in both. |
| V-5.5 | 5.5 | Test | VP-04 | Validate invalid, incomplete and valid fixtures and inspect their finding records and visible summaries. |
| V-5.6 | 5.6 | Test | VP-04 | Use a failed filesystem operation fixture or read-only destination and confirm a visible failure with no success state. |
| V-5.7 | 5.7 | Analysis | VP-04 | Inspect runtime network behavior and source imports for open, edit, validate, arrange, save and export; confirm no vault payload leaves the local process. |
| V-5.8 | 5.8 | Test | VP-04 | Inject a temporary-write failure and confirm the original file content remains intact; exercise a successful replacement and confirm the complete new content. Record native runtime qualification separately from mocked adapter tests. |
| V-5.9 | 5.9 | Test | VP-04 | Attempt absolute POSIX/Windows paths and forward/backslash parent traversal paths; confirm rejection before any filesystem call and acceptance of a normal vault-relative note path. |
| V-5.10 | 5.10 | Test | VP-04 | Open and dismiss each coaching step without Apply; confirm the graph is unchanged, then apply a proposal and confirm only the displayed change appears. |
| V-6 | 6 | Inspection | VP-03 / VP-05 | Inspect validation and example/report language; confirm passing syntax is not labeled certification, accepted risk or completed independent verification. |
| V-6.1 | 6.1 | Test | VP-03 / VP-05 | Attach two evidence notes to a Solution, save and reopen; confirm both references and inspect the circle and evidence details. |
| V-6.2 | 6.2 | Test | VP-03 / VP-05 | Validate empty-reference and missing-target Solution fixtures; confirm incomplete diagnostics and compare with a resolvable-reference fixture. |
| V-6.3 | 6.3 | Test | VP-03 / VP-05 | Compare supported, unsupported and explicitly undeveloped Goal/Strategy fixtures; confirm findings distinguish unfinished branches without silently marking them complete. |
| V-6.4 | 6.4 | Test | VP-03 / VP-05 | Export the six-element and FireSat fixtures, reopen the SVG and compare visible IDs, text, shape types and edge directions with the source graph. |
| V-6.5 | 6.5 | Test | VP-03 / VP-05 | Export a known fixture and compare its nodes, statements, relationship triples and evidence links with the model. |
| V-6.6 | 6.6 | Analysis | VP-03 / VP-05 | Compare the shipped case and its source notes against the referenced Loss Tool fixture; confirm retained Loss identity, claim derivation and source file provenance. |
| V-6.7 | 6.7 | Inspection | VP-03 / VP-05 | Read the example contexts, assumptions, evidence notes and report; confirm no illustrative metric or placeholder document is presented as an operational FireSat measurement or approval. |
| V-6.8 | 6.8 | Inspection | VP-03 / VP-05 | Review each storyboard scene and its source/claim/evidence explanation; confirm the final scene identifies unresolved evidence or decision gaps. |
| V-7 | 7 | Inspection | Source and report review | Inspect module imports and the architecture document; confirm core model/rule modules have no React, Tauri or SSTPA backend dependency. |
| V-7.1 | 7.1 | Inspection | Source and report review | Review the integration mapping and confirm each standalone type and relationship has an explicit SSTPA destination or deferred decision. |
| V-7.2 | 7.2 | Inspection | Source and report review | Inspect changed-file lists and source-tree status recorded for the task; confirm no source-project edit belongs to this change. |
| V-7.3 | 7.3 | Inspection | Source and report review | Cross-check the report against the SRS IDs, commands, logs and screenshots; confirm that no unexecuted procedure is reported as passed. |

## Execution detail for presentation and integration

1. **Symbols:** inspect at 100% zoom and exported scale; compare against the local standard's complete pages 17–18. Count every fixture ID exactly once. Circles remain circular after theme changes. Check that A/J and undeveloped diamond do not collide with text or edges. Check hollow arrowheads against the canvas background, including dark mode.
2. **Long text:** compare each source string with displayed/exported text. Full text in an inspector does not compensate for clipped diagram statements. Check both word wrapping and the unbroken token; shape sizing must account for oval/circle interior width.
3. **Layout:** use a root with two Strategies and a shared child Goal, plus Context/Assumption/Justification. Compare bounding rectangles for intersection after Arrange, including symbol decorators. Confirm no automatic re-layout after harmless edits. Record ELK package version and whether layout executes asynchronously.
4. **Pop-up:** keyboard-launch from View, cycle Tab and Shift+Tab, dismiss with Escape, verify focus return, reopen and close via button. Confirm primary workspace width is unchanged when closed. Check parity after modifying a statement and a relationship, then reopening the pop-up.
5. **Export:** reopen SVG as a standalone file. Confirm no omitted nodes, statements or evidence reference labels required by the exported representation. Recompute shape and arrow visibility in the exported theme. Verify JSON/Markdown values rather than relying only on non-empty file size.
6. **Privacy and integration:** inspect core imports and external requests during the representative workflow. Confirm alternate projection labels do not claim parser-verified SysML/KerML compliance. Confirm integration documentation retains production backend authorization and commit validation as future adapter work.
7. **Source isolation:** retain the GoalKeeper changed-file inventory and read-only source status evidence. Avoid interpreting unrelated pre-existing source modifications as changes made by this task.

## Result vocabulary and release record

- **PASS:** procedure executed and all acceptance conditions evidenced.
- **FAIL:** executed and an acceptance condition was not met.
- **PARTIAL:** only a named subset or platform was exercised; missing work is recorded.
- **NOT RUN:** no execution evidence; include reason and remaining action.

Record fixture, observation, evidence path and limitation for every requirement. Include automated command exit codes, visual evidence and native-versus-browser distinctions in the development report. GSN structural validity is not evidence of operational FireSat safety/security or regulatory approval.
