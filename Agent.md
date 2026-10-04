# Agent Directive — GoalKeeper (Standalone)

You are assisting with the **GoalKeeper** standalone assurance-case application. Respond to the user as **Boss**.

## Product and authority

GoalKeeper adapts the SSTPA Tools Goal Keeper add-on into a local application with Markdown vault storage. The **GSN Community Standard Version 3 core profile** governs both semantics and the primary diagram's geometry. Use rectangles, parallelograms, circles, rounded-ended Contexts, A/J-marked ovals, undeveloped diamonds and the standard filled/hollow arrows. SupportedBy from Strategy goes to Goal only.

The current direction (2026-10-04) supersedes the old KerML-primary exception. An illustrative SysML/KerML-style graph and model text remain available only through a **View-menu pop-up**, with no permanently allocated main-window region. Restrained Art Nouveau styling applies to chrome wherever the GSN standard leaves presentation choices open; it never replaces or decorates the notation itself.

| Standalone boundary | Treatment |
|---|---|
| Semantic authority | Markdown elements and evidence notes with Obsidian wikilinks |
| Root selection | User-selected or wizard-guided Goal root; optional Asset/Loss source provenance |
| Evidence | Referenced local notes and artifacts; no invented tests, measurements or approval |
| Main presentation | Customer-facing core GSN notation with full readable statements |
| Layout | ELK layered engine family used by the Loss Tool prototype; manual positions; explicit Save Layout and Last Saved |
| Integration | Pure model/rules and host/storage boundary for eventual SSTPA Tools integration |
| Compliance scope | Core profile only; no claim to implement pattern/modular/ACP/dialectic extensions or parser-verified SysML/KerML interchange |

## Read order

1. `FloorPlan.md` — project map.
2. `Agent.md` — this directive.
3. `Docs/SRS_GoalKeeper.md` — current requirements.
4. `Docs/VERIFICATION_GoalKeeper.md` — requirement verification procedures.
5. `Docs/ARCHITECTURE_GoalKeeper.md` — design and integration contract.
6. `Resource.md` — terms and imperatives.

The user's current instruction already authorizes SRS → verification procedures → implementation. Do not reintroduce a redundant approval gate from the superseded v0.2 documents. Use `Docs/REQUIREMENT_DISPOSITION.md` when a legacy source appears to conflict with the current baseline.

## Rules

1. Keep development in `/home/netrisk/Projects/GoalKeeper`.
2. Treat `/home/netrisk/Projects/SSTPA Tools`, its backups and `/home/netrisk/Projects/Attack Tree` as read-only reference sources. Do not enter archives unless explicitly requested.
3. Use `https://github.com/netrisk2025/GoalKeeper.git` as the project remote. Push only with user authorization; never force-push routine work.
4. Keep the SRS, architecture, verification evidence and source dispositions current. A passing structural validator is not evidence of certification or accepted operational risk.
5. Preserve ELK license notices and corresponding source; run `node scripts/verify-licenses.mjs` before distribution and `node scripts/verify-licenses.mjs --dist` after building.
6. Record native-desktop verification separately from browser and pure-core checks. Do not label unexecuted requirements passed.

## Reference sources

- `Docs/GSN_STANDARD-VERSION 3.PDF` — local normative core notation and semantics.
- `/home/netrisk/Projects/SSTPA Tools/SSTPA Tool SRS V7.md`, especially §§6.4 and 6.5.11.
- `/home/netrisk/Projects/SSTPA Tools/frontend/src/tools/goalkeeper/GoalKeeperTool.tsx` — source behavior, not authority over the new rendering direction.
- `/home/netrisk/Projects/Attack Tree/docs/Architecture.md` and its FireSat fixture/provenance — layout inspiration and example Loss source.
- `/home/netrisk/Projects/Requirements/Skills.md` — binding requirements quality and verification workflow.
