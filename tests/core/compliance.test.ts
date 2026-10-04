import { describe, expect, it } from "vitest";
import { GSN_TYPES, emptyLayout, type GoalStructure, type GsnElement } from "../../src/core/model/types";
import { canLink } from "../../src/core/rules/relationships";
import { validateStructure } from "../../src/core/rules/validate";
import { loadGoalStructure, resolveEvidence } from "../../src/core/vault/load";
import { parseElementFile, serializeElement, serializeEvidence } from "../../src/core/markdown/parse";
import { exportJson, exportMarkdown } from "../../src/core/export/report";
import { mergeLastSaved, parseLayoutDoc, placeNewNode, toLayoutDoc } from "../../src/core/layout/manager";
import { glyphFor } from "../../src/core/presentation/geometry";
import { layoutArgument } from "../../src/core/layout/elk";

function element(id: string, extra: Partial<GsnElement> = {}): GsnElement {
  return { filePath: `case/${id}.md`, gsnId: id, gkType: "GsnGoal", name: id, statement: "A specific claim.",
    isRoot: id === "G1", undeveloped: false, supportedBy: [], inContextOf: [], hasEvidence: [], ...extra };
}
function caseOf(...elements: GsnElement[]): GoalStructure {
  return { rootDir: "case", rootId: "G1", elements: new Map(elements.map((el) => [el.gsnId, el])), evidence: new Map(), layout: emptyLayout("G1") };
}
function codes(structure: GoalStructure) { return validateStructure(structure).map((finding) => finding.code); }

describe("SRS 1.1–1.3: GSN v3 core types and complete relationship matrices", () => {
  const supports = new Set(["GsnGoal:GsnGoal", "GsnGoal:GsnStrategy", "GsnGoal:GsnSolution", "GsnStrategy:GsnGoal"]);
  const contexts = new Set(["GsnGoal:GsnContext", "GsnGoal:GsnAssumption", "GsnGoal:GsnJustification", "GsnStrategy:GsnContext", "GsnStrategy:GsnAssumption", "GsnStrategy:GsnJustification"]);
  for (const source of GSN_TYPES) for (const target of GSN_TYPES) {
    it(`${source} → ${target} matches both standard matrices`, () => {
      expect(canLink(source, target, "SUPPORTED_BY")).toBe(supports.has(`${source}:${target}`));
      expect(canLink(source, target, "IN_CONTEXT_OF")).toBe(contexts.has(`${source}:${target}`));
    });
  }
  for (const gkType of GSN_TYPES) it(`round-trips ${gkType}`, () => {
    const note = element("ID1", { gkType, statement: "A legible complete statement with “quoted” language." });
    const parsed = parseElementFile(note.filePath, serializeElement(note));
    expect(parsed).toMatchObject({ gsnId: note.gsnId, gkType, statement: note.statement });
  });
});

describe("SRS 1.6–1.8, 5.5: actionable import diagnostics", () => {
  it("reports absent/non-Goal roots, second flags and incoming root edges", () => {
    expect(codes({ ...caseOf(element("G2")), rootId: "" })).toContain("NO_ROOT");
    expect(codes(caseOf(element("G1", { gkType: "GsnStrategy" })))).toContain("ROOT_TYPE");
    expect(codes(caseOf(element("G1", { supportedBy: ["G2"] }), element("G2", { isRoot: true })))).toContain("SECOND_ROOT");
    expect(codes(caseOf(element("G1"), element("G2", { supportedBy: ["G1"] })))).toContain("ROOT_INCOMING");
  });
  it("reports unreachable/missing targets and invalid undeveloped markers", () => {
    const s = caseOf(element("G1", { supportedBy: ["missing"] }), element("A1", { gkType: "GsnAssumption", undeveloped: true }));
    expect(codes(s)).toEqual(expect.arrayContaining(["ORPHAN", "MISSING_TARGET", "INVALID_UNDEVELOPED"]));
    expect(validateStructure(s).filter((f) => f.code === "ORPHAN")[0]).toMatchObject({ severity: "ERROR", nodeId: "A1" });
  });
  it("keeps legacy Strategy→Solution and cycles inspectable with identifiers", () => {
    const s = caseOf(element("G1", { supportedBy: ["S1"] }), element("S1", { gkType: "GsnStrategy", supportedBy: ["Sn1", "G1"] }), element("Sn1", { gkType: "GsnSolution" }));
    const imported = loadGoalStructure("case", [...s.elements.values()].map((el) => ({ path: el.filePath, text: serializeElement(el) })));
    expect(imported.elements.get("S1")!.supportedBy).toEqual(["Sn1", "G1"]);
    expect(validateStructure(imported)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ILLEGAL_REL", nodeId: "S1" }), expect.objectContaining({ code: "CYCLE", nodeId: expect.any(String) }),
    ]));
  });
  it("does not overwrite duplicate IDs or silently invent a root", () => {
    const original = element("G1", { isRoot: false });
    const duplicate = element("G1", { name: "Duplicate" });
    const imported = loadGoalStructure("case", [
      { path: "case/G1.md", text: serializeElement(original) }, { path: "case/duplicate.md", text: serializeElement(duplicate) },
      { path: "case/README.md", text: "# This is a note, not a GSN Goal\n" },
      { path: "case/Away.md", text: "---\ngk_type: GsnAwayGoal\ngsn_id: AG1\n---\nUnsupported extension\n" },
    ]);
    expect(imported.elements.size).toBe(1);
    expect(imported.elements.get("G1")!.name).toBe("G1");
    expect(imported.rootId).toBe("");
    expect(codes(imported)).toEqual(expect.arrayContaining(["DUP_ID", "NO_ROOT", "IMPORT_TYPE"]));
  });
});

describe("SRS 5.3, 6.1–6.3, 6.5: evidence, provenance and semantic exports", () => {
  const evidence = { filePath: "Evidence/Report.md", name: "Source inventory", statement: "Recorded source facts only.\n\n## Limits\nNo operational approval.", kind: "Document" as const, artifactPath: "Artifacts/source.json", metadata: { source_revision: "1234567", source_entity_ids: ["LOSS-1", "ASSET-2"], assurance_status: "Illustrative" } };
  it("preserves full evidence paths, source provenance and supplemental text through notes", () => {
    const el = element("Sn1", { gkType: "GsnSolution", hasEvidence: ["Evidence/Report"], metadata: evidence.metadata });
    expect(parseElementFile(el.filePath, serializeElement(el))).toMatchObject({ hasEvidence: ["Evidence/Report"], metadata: evidence.metadata });
    expect(parseElementFile(evidence.filePath, serializeEvidence(evidence))).toMatchObject(evidence);
  });
  it("treats explicit empty frontmatter relationships as authoritative", () => {
    const parsed = parseElementFile("case/G1.md", "---\ngk_type: GsnGoal\ngsn_id: G1\nsupported_by: []\n---\n# G1\nClaim\n## Supported By\n- [[G2]]\n");
    expect(parsed).toMatchObject({ supportedBy: [] });
  });
  it("resolves canonical paths and rejects ambiguous or missing evidence", () => {
    const s = caseOf(element("G1", { supportedBy: ["Sn1"] }), element("Sn1", { gkType: "GsnSolution", hasEvidence: ["Evidence/Report"] }));
    s.evidence.set(evidence.filePath, evidence);
    expect(resolveEvidence(s, "Evidence/Report")).toBe(evidence);
    expect(resolveEvidence(s, "Report")).toBe(evidence);
    expect(codes(s)).not.toContain("MISSING_EVIDENCE");
    s.evidence.set("case/Report.md", { ...evidence, filePath: "case/Report.md" });
    // Bare case-relative paths resolve specifically to the active case; arbitrary
    // display names that collide do not select an evidence note by insertion order.
    expect(resolveEvidence(s, "Source inventory")).toBeUndefined();
    s.elements.set("Sn1", { ...s.elements.get("Sn1")!, hasEvidence: ["Missing", "Source inventory"] });
    expect(validateStructure(s).filter((f) => f.code === "MISSING_EVIDENCE")).toHaveLength(2);
    s.elements.set("Sn1", { ...s.elements.get("Sn1")!, hasEvidence: [] });
    expect(codes(s)).toContain("NO_EVIDENCE");
  });
  it("exports all semantic triples, artifacts, timestamps and one evidence record per note", () => {
    const s = caseOf(element("G1", { supportedBy: ["Sn1"], inContextOf: ["C1"], metadata: evidence.metadata, created: "2026-10-04T00:00:00Z" }), element("Sn1", { gkType: "GsnSolution", hasEvidence: ["Evidence/Report"] }), element("C1", { gkType: "GsnContext" }));
    s.evidence.set(evidence.filePath, evidence);
    s.evidence.set("legacy-alias", evidence);
    const json = JSON.parse(exportJson(s));
    expect(json.evidence).toEqual([evidence]);
    expect(json.elements[0]).toMatchObject({ metadata: evidence.metadata, created: "2026-10-04T00:00:00Z" });
    expect(json.relationships).toEqual([
      { type: "SUPPORTED_BY", source: "G1", target: "Sn1" }, { type: "IN_CONTEXT_OF", source: "G1", target: "C1" }, { type: "HAS_EVIDENCE", source: "Sn1", target: "Evidence/Report" },
    ]);
    const markdown = exportMarkdown(s);
    expect(markdown).toContain(evidence.artifactPath);
    expect(markdown).toContain("source_revision: 1234567");
    expect(markdown).toContain("does not establish evidence sufficiency");
  });
  it("keeps semantic content independent of absent and stale layouts", () => {
    const notes = [element("G1", { supportedBy: ["G2"] }), element("G2", { undeveloped: true })].map((el) => ({ path: el.filePath, text: serializeElement(el) }));
    const without = loadGoalStructure("case", notes);
    const stale = loadGoalStructure("case", notes, JSON.stringify({ ...emptyLayout("G1"), nodes: { G999: { x: 9, y: 9 } } }));
    expect([...stale.elements.values()]).toEqual([...without.elements.values()]);
    expect(stale.layout.nodes.G999).toBeUndefined();
    expect(codes(stale)).toEqual(expect.arrayContaining(["NO_SUPPORT", "UNDEVELOPED"]));
  });
});

describe("Corrupted imports remain recoverable without hidden semantic conversion", () => {
  it.each([
    "provenance:\n  repository: hidden-value",
    "statement: |\n  Multiline YAML block",
    'supported_by: [G2]',
    'metadata: {source: "inline mapping"}',
    'supported_by: "[[G2]]"',
  ])("reports unsupported YAML before any rewrite: %s", (unsupported) => {
    const text = `---\ngk_type: GsnGoal\ngsn_id: G1\nis_root: true\n${unsupported}\n---\n# Claim\nSource content\n`;
    expect(() => parseElementFile("case/G1.md", text)).toThrow();
    const loaded = loadGoalStructure("case", [{ path: "case/G1.md", text }]);
    expect(loaded.loadFindings).toEqual([expect.objectContaining({ severity: "ERROR", code: "IMPORT_TYPE", nodeId: "case/G1.md" })]);
    expect(loaded.elements.size).toBe(0);
  });
  it("supports JSON-compatible inline scalar arrays without losing provenance", () => {
    const note = parseElementFile("case/G1.md", '---\ngk_type: GsnGoal\ngsn_id: G1\nsupported_by: ["[[G2]]"]\nsource_entity_ids: ["LOSS-1","ASSET-2"]\n---\nClaim\n');
    expect(note).toMatchObject({ supportedBy: ["G2"], metadata: { source_entity_ids: ["LOSS-1", "ASSET-2"] } });
  });
  it("sanitizes nonfinite positions and nonpositive zoom from a corrupt layout", () => {
    const raw = JSON.parse('{"schemaVersion":1,"rootGsnId":"G1","nodes":{"G1":{"x":1e400,"y":20},"G2":{"x":10,"y":20}},"viewport":{"x":1e400,"y":-1e400,"zoom":-5}}');
    const parsed = parseLayoutDoc(raw)!;
    expect(parsed.nodes).toEqual({ G2: { x: 10, y: 20 } });
    expect(parsed.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    const merged = mergeLastSaved(caseOf(element("G1", { supportedBy: ["G2"] }), element("G2")), parsed);
    expect(Number.isFinite(merged.positions.G1.x)).toBe(true);
    expect(merged.positions.G2).toEqual({ x: 10, y: 20 });
  });
  it("round-trips the presentation-only focused branch with the viewport", () => {
    const viewport = { x: 32, y: 88, zoom: 1.2, focusId: "G2" };
    const saved = toLayoutDoc("G1", { G1: { x: 10, y: 20 } }, viewport);
    expect(parseLayoutDoc(JSON.parse(JSON.stringify(saved)))!.viewport).toEqual(viewport);
    expect(parseLayoutDoc({ ...saved, viewport: { ...viewport, focusId: 42 } })!.viewport.focusId).toBeUndefined();
    expect(parseLayoutDoc({ ...saved, viewport: { ...viewport, focusId: " " } })!.viewport.focusId).toBeUndefined();
  });
  it("places new full-size glyphs without overlapping existing manual positions", () => {
    const root = element("G1", { supportedBy: ["Sn1"], inContextOf: ["C1"], statement: "A longer claim with several meaningful qualifications. ".repeat(8) });
    const context = element("C1", { gkType: "GsnContext", statement: "A substantial contextual statement. ".repeat(8) });
    const solution = element("Sn1", { gkType: "GsnSolution", statement: "A detailed evidence reference. ".repeat(8) });
    const s = caseOf(root, context, solution);
    const positions = { G1: { x: 200, y: 200 } };
    const c = placeNewNode(s, positions, "C1", "G1", "IN_CONTEXT_OF");
    const sn = placeNewNode(s, { ...positions, C1: c }, "Sn1", "G1", "SUPPORTED_BY");
    expect(c.x - positions.G1.x).toBeGreaterThan((glyphFor(root).width + glyphFor(context).width) / 2);
    expect(sn.y - positions.G1.y).toBeGreaterThan((glyphFor(root).height + glyphFor(solution).height) / 2);
    expect(positions).toEqual({ G1: { x: 200, y: 200 } });
  });
  it("reports contextual cycles and retains every invalid context in ELK layout", async () => {
    const s = caseOf(element("G1", { inContextOf: ["C1"] }), element("C1", { gkType: "GsnContext", inContextOf: ["C2"] }), element("C2", { gkType: "GsnContext", inContextOf: ["C1"] }));
    expect(codes(s)).toContain("CYCLE");
    const positions = await layoutArgument(s);
    expect(Object.keys(positions).sort()).toEqual(["C1", "C2", "G1"]);
    expect(Object.values(positions).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});
