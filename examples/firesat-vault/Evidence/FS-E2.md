---
gk_schema: 1
gk_type: "Evidence"
name: "FireSat prototype disposition record"
evidence_kind: "Inspection"
artifact_path: "Artifacts/loss-source-snapshot.json"
source_repository: "https://github.com/netrisk2025/attack-tree"
source_revision: "8d7641d8e1fe5ef9fcbf7bb912dde4cdf922fc28"
source_file: "src/examples.ts"
assurance_status: "Source record only; operational evidence pending."
---
# FireSat prototype disposition record

The source records Allowed RV=1 on signed--keytheft, Complete Block on video-tamper--frame-check, and tailoring on downlink--obsolete. The artifact retains the original rationale text. It also records the derived Asset DEMO_DERIVED_KEY, Update signing key confidentiality. These records demonstrate which decisions were entered; their correctness has not been independently substantiated.

Independent review remains necessary: define acceptance criteria and obtain an authority decision for maintenance exposure; verify frame-origin enforcement across bypass and failure conditions; establish configuration evidence that the retired interface is absent; and develop a subordinate case for update-key confidentiality. The open diagnostic, calibration-review bypass and counter-rollover routes need operational requirements, test results and justified residual treatment.

No completed control test, spacecraft measurement or regulatory acceptance is supplied by this example. Goals G3, G4, G5, G6 and G9 remain undeveloped. Structural validity and source-software test results must not be treated as evidence that the FireSat root security claim is true.
