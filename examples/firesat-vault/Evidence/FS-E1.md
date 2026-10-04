---
gk_schema: 1
gk_type: "Evidence"
name: "FireSat prototype scope and route inventory"
evidence_kind: "Analysis"
artifact_path: "Artifacts/loss-source-snapshot.json"
source_repository: "https://github.com/netrisk2025/attack-tree"
source_revision: "8d7641d8e1fe5ef9fcbf7bb912dde4cdf922fc28"
source_file: "src/examples.ts"
assurance_status: "Source record only; operational evidence pending."
---
# FireSat prototype scope and route inventory

The bundled artifact records the unchanged Loss Tool createOverview() source and its route analysis. It contains 25 nodes, 25 edges and 9 terminal routes: 4 unaddressed RV, 2 Allowed, 2 Derived and 1 Blocked. The Payload Processor is shared by Standby and Imaging, so these are routes, not independent attack events or probability estimates.

The source Loss is DEMO_LOSS, Loss of authentic fire reports; the protected asset is DEMO_AST_FIRE_REPORTS, Fire detection reports. The referenced system is SYS_1.1.2_0, Fire Detection Payload. Explicitly identified system, environment, state, component, interface and function identities originate in the SSTPA FireSat YAML. The Loss, Asset, attacks, countermeasures and analytical decisions were authored by the prototype.

This evidence substantiates inventory and source traceability only. It does not establish threat completeness, operational security, control effectiveness, acceptable risk or authority approval. Prototype risk inputs and simulated UUIDs are deliberately excluded. Exact source file hashes and revisions are included in the artifact.
