import { describe, expect, it } from "vitest";
import { firesatVaultFiles, FIRESAT_ROOT_DIR } from "../../src/examples/firesat";
import { loadGoalStructure, listRootGoals } from "../../src/core/vault/load";
import { validateStructure } from "../../src/core/rules/validate";
import { GSN_TYPES } from "../../src/core/model/types";
import { canLink } from "../../src/core/rules/relationships";

const source = JSON.parse(firesatVaultFiles.find((file) => file.path === "Artifacts/loss-source-snapshot.json")!.text);
const structure = () => loadGoalStructure(FIRESAT_ROOT_DIR, firesatVaultFiles);

describe("FireSat source-derived example [6.6,6.7]", () => {
  it("opens exactly one legal, reachable core GSN case containing all six symbol types", () => {
    expect(listRootGoals(firesatVaultFiles)).toHaveLength(1);
    const caseData = structure();
    expect(caseData.rootId).toBe("G1");
    expect(caseData.elements.size).toBe(18);
    expect(new Set([...caseData.elements.values()].map((el) => el.gkType))).toEqual(new Set(GSN_TYPES));
    expect(validateStructure(caseData).filter((finding) => finding.severity === "ERROR")).toEqual([]);
    for (const el of caseData.elements.values()) {
      for (const id of el.supportedBy) {
        expect(canLink(el.gkType, caseData.elements.get(id)!.gkType, "SUPPORTED_BY")).toBe(true);
      }
      for (const id of el.inContextOf) {
        expect(canLink(el.gkType, caseData.elements.get(id)!.gkType, "IN_CONTEXT_OF")).toBe(true);
      }
    }
  });

  it("retains the source Loss identity, exact inventory and distinct shared-identity routes", () => {
    expect(source.loss).toMatchObject({ id: "loss", hid: "DEMO_LOSS", name: "Loss of authentic fire reports", provenance: "Prototype illustration" });
    expect(source.scope).toMatchObject({ soi: "SYS_1.1.2_0 · Fire Detection Payload", asset: "DEMO_AST_FIRE_REPORTS · Fire detection reports" });
    expect(source.inventory.nodes).toHaveLength(25);
    expect(source.inventory.edges).toHaveLength(25);
    expect(source.routeAnalysis).toMatchObject({ total: "9", unaddressedRVCount: "4", statusCounts: { RV: 4, ALLOWED: 2, DERIVED: 2, BLOCKED: 1 }, truncated: false });
    const processorLinks = source.inventory.edges.filter((edge: { target: string }) => edge.target === "processor");
    expect(processorLinks.map((edge: { source: string }) => edge.source).sort()).toEqual(["imaging", "standby"]);
    expect(source.sources[0]).toMatchObject({ revision: "8d7641d8e1fe5ef9fcbf7bb912dde4cdf922fc28", sha256: "1d94c15fd81bf81f90392ba14258d22a590e3e019edfce3b0db185bec8add554" });
    expect(source.sources).toHaveLength(4);
    for (const origin of source.sources) expect(origin.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("preserves honest development gaps and attaches source records only to narrow record claims", () => {
    const caseData = structure();
    expect([...caseData.elements.values()].filter((el) => el.undeveloped).map((el) => el.gsnId).sort()).toEqual(["G3", "G4", "G5", "G6", "G9"]);
    for (const id of ["G3", "G4", "G5", "G6", "G9"]) {
      expect(caseData.elements.get(id)?.supportedBy).toEqual([]);
      expect(caseData.elements.get(id)?.hasEvidence).toEqual([]);
    }
    expect(caseData.elements.get("G2")?.supportedBy).toEqual(["Sn1"]);
    expect(caseData.elements.get("G8")?.supportedBy).toEqual(["Sn2"]);
    expect(caseData.elements.get("C3")?.statement).toContain("no operational approval is asserted");
    expect(caseData.elements.get("C4")?.statement).toContain("has not been demonstrated");
    expect(source.caseStatus).toContain("operational evidence");
    expect(source.limits.join(" ")).toContain("not independent attack counts");
  });

  it("bundles the referenced source artifact and both evidence notes with their explicit limitations", () => {
    const notes = firesatVaultFiles.filter((file) => /^Evidence\/FS-E[12]\.md$/.test(file.path));
    expect(notes).toHaveLength(2);
    for (const note of notes) {
      expect(note.text).toContain('artifact_path: "Artifacts/loss-source-snapshot.json"');
      expect(note.text).toContain("operational evidence pending");
      expect(note.text).toContain("source_revision");
    }
    const decisionNote = notes.find((note) => note.path.endsWith("FS-E2.md"))!;
    expect(decisionNote.text).toContain("No completed control test");
    expect(decisionNote.text).toContain("Goals G3, G4, G5, G6 and G9 remain undeveloped");
    const caseData = structure();
    for (const solution of [...caseData.elements.values()].filter((el) => el.gkType === "GsnSolution")) {
      for (const reference of solution.hasEvidence) {
        const basename = reference.split("/").pop()!;
        expect(firesatVaultFiles.some((file) => file.path === `Evidence/${basename}.md`)).toBe(true);
      }
    }
  });
});
