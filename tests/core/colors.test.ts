// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GSN_TYPES, emptyLayout, type GsnElement, type GsnNodeStyles, type GoalStructure } from "../../src/core/model/types";
import { getNodeStyle, parseNodeStyles, contrastRatio, PALETTES } from "../../src/core/presentation/colors";
import { renderDiagram, exportSvg } from "../../src/core/presentation/svg";
import { parseLayoutDoc, toLayoutDoc } from "../../src/core/layout/manager";
const style = { font: "#102030", box: "#f1e2d3", line: "#654321", border: "#123456" };
function fixture() {
  const elements = new Map(GSN_TYPES.map((gkType, i) => {
    const id = `N${i}`;
    return [id, { filePath: `${id}.md`, gsnId: id, gkType, name: id, statement: "Full statement remains readable.", isRoot: i === 0, undeveloped: i < 2, supportedBy: i === 0 ? ["N1", "N2"] : i === 1 ? ["N6"] : [], inContextOf: i === 0 ? ["N3", "N4", "N5"] : [], hasEvidence: [] } as GsnElement] as const;
  }));
  elements.set("N6", { ...elements.get("N0")!, gsnId: "N6", isRoot: false, supportedBy: [], inContextOf: [] });
  const structure: GoalStructure = { rootId: "N0", rootDir: "case", elements, evidence: new Map(), layout: emptyLayout("N0") };
  const positions = Object.fromEntries([...elements.keys()].map((id, i) => [id, { x: 300 + (i % 3) * 450, y: 200 + Math.floor(i / 3) * 350 }]));
  return { structure, positions };
}
const xml = (s: string) => new DOMParser().parseFromString(s, "image/svg+xml");
describe("SRS 2.9, 2.10 and 4.6: safe node-type colors", () => {
  it("accepts only complete known styles, normalizes hexadecimal and rejects style injection", () => {
    expect(parseNodeStyles({ GsnGoal: { ...style, font: "#ABCDEF", extra: "ignored" }, Unknown: style, GsnSolution: { ...style, box: "url(javascript:alert(1))" }, GsnStrategy: { font: "#000000" }, GsnContext: { ...style, line: '#000000\" onload=\"bad' } })).toEqual({ GsnGoal: { ...style, font: "#abcdef" } });
    expect(parseNodeStyles(Object.create({ GsnGoal: style }))).toEqual({});
    expect(parseNodeStyles(null)).toEqual({});
    expect(parseNodeStyles([])).toEqual({});
  });
  it("uses theme defaults for uncustomized types and fixed user colors across themes", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(getNodeStyle("GsnGoal", theme)).toEqual({ font: PALETTES[theme].ink, box: PALETTES[theme].paper, line: PALETTES[theme].line, border: PALETTES[theme].line });
      expect(getNodeStyle("GsnGoal", theme, { GsnGoal: style })).toEqual(style);
      expect(getNodeStyle("GsnSolution", theme, { GsnGoal: style })).toEqual(getNodeStyle("GsnSolution", theme));
    }
  });
  it.each([false, true])("keeps all six types and source-colored arrows in projection=%s and SVG export", projection => {
    const { structure, positions } = fixture();
    const before = JSON.stringify([...structure.elements]);
    const nodeStyles = Object.fromEntries(GSN_TYPES.map((type, i) => [type, { ...style, line: `#${String(i + 1).repeat(6)}` }])) as GsnNodeStyles;
    for (const markup of [renderDiagram(structure, positions, { nodeStyles, projection }), exportSvg(structure, positions, { nodeStyles, projection })]) {
      const doc = xml(markup);
      expect(doc.querySelector("parsererror")).toBeNull();
      expect(doc.querySelectorAll("[data-node-id]")).toHaveLength(7);
      for (const node of doc.querySelectorAll("[data-node-id]")) {
        expect(node.querySelector("[data-symbol]")?.getAttribute("fill")).toBe(style.box);
        expect(node.querySelector("[data-symbol]")?.getAttribute("stroke")).toBe(style.border);
        expect(node.querySelector("[data-statement-line]")?.parentElement?.getAttribute("fill")).toBe(style.font);
      }
      for (const edge of doc.querySelectorAll("[data-edge]")) {
        const [source, relation] = edge.getAttribute("data-edge")!.split("|");
        const type = structure.elements.get(source)!.gkType;
        const line = nodeStyles[type]!.line;
        expect(edge.getAttribute("stroke")).toBe(line);
        const markerId = edge.getAttribute("marker-end")!.slice(5, -1);
        const head = doc.getElementById(markerId)!.querySelector("path")!;
        expect(head.getAttribute(relation === "support" ? "fill" : "stroke")).toBe(line);
        if (relation === "context") expect(head.getAttribute("fill")).toBe(PALETTES.light.paper);
      }
      if (!projection) {
        expect(doc.querySelector('[data-node-id="N2"] circle')).not.toBeNull();
        for (const diamond of doc.querySelectorAll("[data-undeveloped]")) expect(diamond.getAttribute("fill")).toBe(PALETTES.light.paper);
      }
    }
    expect(JSON.stringify([...structure.elements])).toBe(before);
  });
  it("round-trips styles as a defensive copy and drops malformed imported display fields", () => {
    const nodeStyles = { GsnGoal: { ...style } };
    const saved = toLayoutDoc("G1", { G1: { x: 0, y: 0 } }, { x: 0, y: 0, zoom: 1 }, { nodeStyles });
    nodeStyles.GsnGoal.box = "#000000";
    expect(saved.display?.nodeStyles?.GsnGoal).toEqual(style);
    expect(parseLayoutDoc(JSON.parse(JSON.stringify(saved)))?.display?.nodeStyles).toEqual({ GsnGoal: style });
    expect(parseLayoutDoc({ ...saved, display: { showEvidenceBadges: "false", nodeStyles: { GsnGoal: { ...style, border: "red" } }, evil: "ignored" } })?.display).toEqual({ showEvidenceBadges: true });
  });
  it("uses saved styles by default and allows an explicit empty override for Reset", () => {
    const { structure, positions } = fixture(); structure.layout.display = { nodeStyles: { GsnGoal: style } };
    expect(xml(exportSvg(structure, positions)).querySelector('[data-node-id="N0"] [data-symbol]')?.getAttribute("fill")).toBe(style.box);
    expect(xml(renderDiagram(structure, positions, { nodeStyles: {} })).querySelector('[data-node-id="N0"] [data-symbol]')?.getAttribute("fill")).toBe(PALETTES.light.paper);
  });
  it("reports standard contrast without blocking low-contrast colors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(parseNodeStyles({ GsnGoal: { font: "#ffffff", box: "#ffffff", line: "#ffffff", border: "#ffffff" } }).GsnGoal).toBeDefined();
  });
});
