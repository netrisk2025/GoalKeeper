# GoalKeeper

GoalKeeper is a standalone application for authoring and presenting assurance cases using **GSN Community Standard Version 3 core notation**. Its primary canvas uses the standard Goal, Strategy, Solution, Context, Assumption and Justification symbols, with full statement text and restrained Art Nouveau application chrome.

The semantic model and validation rules are separated from rendering and storage so the presentation can later be integrated into SSTPA Tools. No SSTPA backend or graph database is required. The existing SSTPA Tools and prototype Loss Tool repositories remain read-only references.

## Run the browser application

```bash
npm ci
npm run dev
```

Open [the local application](http://localhost:1420). Select **FireSat example** to explore the case derived from the prototype Loss Tool, or **Sample case** for a smaller argument. Use **Open vault** to choose a local directory when the browser supports the File System Access API, or to open a named session vault.

**Browser session vaults are in memory for the current page session.** Their names may appear in recent-vault settings, but their contents do not survive reload or browser closure. Export a copy before leaving. For persistent Markdown editing, use a selected filesystem directory or the native application.

## Author and review a case

1. Create or open a Root Goal. Select a symbol and use the inspector to edit its statement, create or link supporting/contextual elements, associate existing evidence notes, or delete a non-root element.
2. Use **Apply node edits** to apply inspector text, then **Save content** (or Ctrl/Cmd+S) to persist Markdown. Evidence notes can reside in the case directory or the vault's shared `Evidence/` directory.
3. Use **Arrange argument** for ELK layered layout, or drag symbols manually. **Save Layout** stores positions and viewport separately; **Last Saved** restores saved extant positions while placing new nodes and dropping deleted positions.
4. Use **Fit argument** for an overview and **100%** for reading. The outline and inspector can be closed to maximize the argument workspace.
5. Open **View → SysML / KerML equivalent…** for a dismissible alternate graph and model text. This is an illustrative projection of the same argument, not parser-validated SysML/KerML interchange.
6. Review **Validation** findings and **Evidence** associations. **Export** provides a scalable SVG figure plus Markdown and JSON case reports, including evidence and source provenance.

The optional **Wizard** offers the GSN Six-Step Method. Skip or close it freely; proposals change the argument only when explicitly applied. A Solution references evidence. Creating a Solution, resolving an evidence link or passing structural validation does not establish evidence sufficiency, certification or official acceptance.

## Supported GSN profile

The implementation covers Part 1 §2 core notation: six element types, SupportedBy and InContextOf, plus the hollow undeveloped diamond on Goals and Strategies.

| Relationship | Permitted connections |
|---|---|
| SupportedBy | Goal → Goal, Strategy or Solution; Strategy → Goal |
| InContextOf | Goal or Strategy → Context, Assumption or Justification |

Cycles and duplicate relationships are rejected during authoring. Imported illegal structures retain diagnostics; the former Strategy → Solution exception is removed. Shared support is permitted. One Goal root per case is a standalone product constraint.

Argument patterns, modular/away notation, Assurance Claim Points and dialectic/defeat extensions are outside this profile. Live SSTPA integration and conforming SysML/KerML interchange are future adapter work, documented in the [architecture and integration mapping](Docs/ARCHITECTURE_GoalKeeper.md).

## FireSat example and storyboard

The [FireSat vault](examples/firesat-vault/) contains the openable case, evidence notes and a bundled source snapshot. Its claims trace to the prototype Loss Tool's FireSat Loss example. The source facts support narrow provenance claims; operational mitigation, verification and acceptance gaps remain visible as undeveloped claims and findings. Prototype calculations are illustrative.

Read the [development report](Docs/report/GoalKeeper-Development-Report.html) ([PDF](Docs/report/GoalKeeper-Development-Report.pdf)) for verification results and limitations. See the [development storyboard](Docs/FireSat-Storyboard.md) for the progression from Loss source through the claim, scope, strategy, elaboration, evidence and reviewer view.

## Native desktop

```bash
npm run tauri:dev
```

The native application requires the Rust toolchain and Tauri's platform build dependencies. Select **Open vault** to work with a real directory. Native writes replace individual files using a temporary sibling file and rename; the Markdown vault does not provide transactions across multiple files.

The shell compiles in the development environment, and its Rust test command currently contains zero tests. Compilation does not qualify interactive native file dialogs, desktop rendering or platform packaging. Consult the development report for the observed verification boundary.

## Verification and development

The revised [SRS](Docs/SRS_GoalKeeper.md) and [verification procedures](Docs/VERIFICATION_GoalKeeper.md) were established before implementation. [Requirement disposition](Docs/REQUIREMENT_DISPOSITION.md) records the superseded KerML-primary requirements and other integration adaptations.

```bash
npm run verify
```

| Command | Purpose |
|---|---|
| `npm run dev` | Local Vite development server |
| `npm test` | GSN, state, persistence, filesystem, presentation, FireSat and wizard regressions |
| `npm run typecheck` | Application and build-configuration TypeScript checks |
| `npm run lint` | TypeScript-based static check; not a separate style linter |
| `npm run licenses` | Third-party license and attribution verification |
| `npm run build` | License checks, TypeScript check and production web build |
| `npm run preview` | Preview the production web build |
| `npm run verify` | Tests, type checks and production build |
| `npm run tauri:dev` | Native desktop development |
| `npm run tauri:build` | Native package build |

Development scripts raise the soft file-descriptor limit where the operating system permits, to avoid watcher `EMFILE` errors. Read [Agent.md](Agent.md) and [FloorPlan.md](FloorPlan.md) before editing the tree. Development belongs in this repository.

[GitHub repository](https://github.com/netrisk2025/GoalKeeper)
