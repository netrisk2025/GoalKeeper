# Agent Directive — GoalKeeper (Standalone)

You are assisting with the **GoalKeeper** standalone desktop application. Respond to the user as **"Boss"**.

## What this project is

GoalKeeper is a standalone desktop application that lets a user graphically construct and maintain a **Goal Structuring Notation (GSN)** assurance argument for a user-selected root goal. It is adapted from the **Goal Keeper Add-on Tool** in SSTPA Tools (`sstpa.goalkeeper`, SRS §6.5.11), with these deliberate differences:

| SSTPA Goal Keeper (addon) | GoalKeeper (standalone) |
|---|---|
| Neo4j graph as source of truth | Markdown (`.md`) files as source of truth |
| Root goals tied to Asset–Loss cases | User-selected / wizard-guided Root Goals |
| Evidence = Validation / Verification / Loss nodes | Evidence = vault Evidence notes (and optional linked files) |
| Requires SSTPA backend + SoI | Local vault directory only |
| Visualization uses KerML-style instrument UI | KerML-inspired nodes on canvas (not GSN-3 shapes); subtle Art Nouveau chrome; light + dark |
| Layout snapshot on Root Goal | Save Layout / Last Saved; Layout Manager for new nodes; progressive canvas display |

Authoritative GSN semantics: `Docs/GSN_STANDARD-VERSION 3.PDF` (Community Standard Version 3). Where visualization diverges, the app uses **KerML 1.0–style** presentation consistent with SSTPA Tools Goal Keeper.

## Read order (this directory)

1. **FloorPlan.md** — map of this project
2. **Agent.md** — this file
3. **Docs/SRS_GoalKeeper.md** — requirements (approve before coding)
4. **Docs/ARCHITECTURE_GoalKeeper.md** — tech stack and implementation plan
5. **Resource.md** — imperative terminology (SHALL / Should / Will / May), same as Projects root

## Hard rules

1. **Do not modify** any files under `/home/netrisk/Projects/SSTPA Tools` (or backups/archives of it). Read-only reference only.
2. **All development** lives under `/home/netrisk/Projects/GoalKeeper`.
3. GitHub remote (when initialized): `https://github.com/netrisk2025/GoalKeeper.git`.
4. Prefer small, reviewable changes; keep docs current when behavior is decided or deferred.
5. Call the user **Boss**.

## Reference sources (read-only)

- SSTPA Goal Keeper implementation: `SSTPA Tools/frontend/src/tools/goalkeeper/GoalKeeperTool.tsx`
- SSTPA schema (GSN nodes/rels): `SSTPA Tools/docs/schema/node-properties.json`, `relationships.json`
- SSTPA SRS §6.5.11: `SSTPA Tools/SSTPA Tool SRS V7.md`
- Developer wiki: `SSTPA_Dev_WIKI/wiki/entities/tool-goalkeeper.md`
- GSN Community Standard v3: `Docs/GSN_STANDARD-VERSION 3.PDF`
