// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { GoalStructure, GsnElement, GsnType, NodePosition } from "../../src/core/model/types";
import { emptyLayout } from "../../src/core/model/types";
import { FONT_SIZE, glyphFor, textWidth, wrapText } from "../../src/core/presentation/geometry";
import { PALETTES, exportSvg, projectionText, renderDiagram } from "../../src/core/presentation/svg";
import { firesatVaultFiles, FIRESAT_ROOT_DIR } from "../../src/examples/firesat";
import { loadGoalStructure } from "../../src/core/vault/load";

function element(id: string, gkType: GsnType, statement = "A clear, traceable claim for independent review."): GsnElement {
  return { gsnId: id, gkType, statement, name: id, filePath: `Notation/${id}.md`, isRoot: id === "G1", undeveloped: false, supportedBy: [], inContextOf: [], hasEvidence: [] };
}
function notationFixture(): GoalStructure {
  const nodes = [element("G1", "GsnGoal"), element("S1", "GsnStrategy"), element("G2", "GsnGoal"), element("Sn1", "GsnSolution"), element("C1", "GsnContext"), element("A1", "GsnAssumption"), element("J1", "GsnJustification"), element("G3", "GsnGoal"), element("S2", "GsnStrategy")];
  nodes[0].supportedBy = ["S1", "S2", "G3"];
  nodes[0].inContextOf = ["C1", "A1"];
  nodes[1].supportedBy = ["G2"];
  nodes[1].inContextOf = ["J1"];
  nodes[2].supportedBy = ["Sn1"];
  nodes[7].undeveloped = nodes[8].undeveloped = true;
  return { rootId: "G1", rootDir: "Notation", elements: new Map(nodes.map(el => [el.gsnId, el])), evidence: new Map(), layout: emptyLayout("G1") };
}
function positionsFor(structure: GoalStructure): Record<string, NodePosition> {
  return Object.fromEntries([...structure.elements.keys()].map((id, i) => [id, { x: (i % 3) * 900, y: Math.floor(i / 3) * 1000 }]));
}
function parseSvg(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  return doc;
}
function node(doc: Document, id: string): Element {
  const match = [...doc.querySelectorAll("[data-node-id]")].find(el => el.getAttribute("data-node-id") === id);
  expect(match, `node ${id}`).toBeDefined();
  return match!;
}
function graphTriples(structure: GoalStructure): string[] {
  return [...structure.elements.values()].flatMap(el => [...el.supportedBy.map(id => `${el.gsnId}|support|${id}`), ...el.inContextOf.map(id => `${el.gsnId}|context|${id}`)]).sort();
}
function luminance(hex: string): number {
  const linear = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("GSN SVG notation and projection [2.1–2.5,3.1,3.2,6.4]", () => {
  it("draws all six prescribed outlines with a true circle and straight-sided context", () => {
    const fixture = notationFixture();
    const doc = parseSvg(renderDiagram(fixture, positionsFor(fixture)));
    const outline = (id: string) => node(doc, id).querySelector('[data-symbol="true"]')!.firstElementChild!;
    expect(outline("G1").localName).toBe("rect");
    expect(outline("G1").hasAttribute("rx")).toBe(false);
    const strategy = outline("S1");
    expect(strategy.localName).toBe("polygon");
    const points = strategy.getAttribute("points")!.split(" ").map(point => point.split(",").map(Number));
    expect(points).toHaveLength(4);
    expect(points[0][1]).toBe(points[1][1]);
    expect(points[2][1]).toBe(points[3][1]);
    expect(points[0][0] - points[3][0]).toBeGreaterThan(0);
    expect(points[1][0] - points[2][0]).toBe(points[0][0] - points[3][0]);
    const solution = outline("Sn1");
    expect(solution.localName).toBe("circle");
    expect(glyphFor(fixture.elements.get("Sn1")!).width).toBe(glyphFor(fixture.elements.get("Sn1")!).height);
    expect(Number(solution.getAttribute("r")) * 2).toBe(glyphFor(fixture.elements.get("Sn1")!).width);
    const context = outline("C1");
    expect(context.localName).toBe("rect");
    expect(Number(context.getAttribute("rx"))).toBeGreaterThan(0);
    expect(Number(context.getAttribute("rx")) * 2).toBeLessThan(Number(context.getAttribute("width")));
    expect(Number(context.getAttribute("ry")) * 2).toBe(Number(context.getAttribute("height")));
    expect(outline("A1").localName).toBe("ellipse");
    expect(outline("J1").localName).toBe("ellipse");
  });

  it("places A/J outside the statement and a hollow bottom-centred diamond only on unfinished G/S", () => {
    const fixture = notationFixture();
    for (const theme of ["light", "dark"] as const) {
      const doc = parseSvg(renderDiagram(fixture, positionsFor(fixture), { theme }));
      for (const [id, letter] of [["A1", "A"], ["J1", "J"]]) {
        const glyph = glyphFor(fixture.elements.get(id)!);
        const decorator = [...node(doc, id).querySelectorAll("text")].find(text => text.textContent === letter)!;
        expect(Number(decorator.getAttribute("x"))).toBeGreaterThan(glyph.width / 2 - 20);
        expect(Number(decorator.getAttribute("y"))).toBeGreaterThanOrEqual(glyph.height / 2);
      }
      const diamonds = [...doc.querySelectorAll('[data-undeveloped="true"]')];
      expect(diamonds).toHaveLength(2);
      for (const id of ["G3", "S2"]) {
        const diamond = node(doc, id).querySelector('[data-undeveloped="true"]')!;
        expect(diamond.getAttribute("d")).toMatch(new RegExp(`^M 0 ${glyphFor(fixture.elements.get(id)!).height / 2} `));
        expect(diamond.getAttribute("fill")).toBe(PALETTES[theme].paper);
        expect(diamond.getAttribute("stroke")).toBe(PALETTES[theme].line);
      }
    }
  });

  it("uses distinct filled/hollow arrowheads at the target of every corresponding edge", () => {
    const fixture = notationFixture();
    for (const theme of ["light", "dark"] as const) {
      const doc = parseSvg(renderDiagram(fixture, positionsFor(fixture), { theme, markerPrefix: "test" }));
      expect(doc.querySelector('#test-support path')!.getAttribute("fill")).toBe(PALETTES[theme].line);
      expect(doc.querySelector('#test-context path')!.getAttribute("fill")).toBe(PALETTES[theme].paper);
      expect(doc.querySelector('#test-context path')!.getAttribute("stroke")).toBe(PALETTES[theme].line);
      expect(doc.querySelector('#test-support')!.getAttribute("orient")).toBe("auto");
      for (const edge of doc.querySelectorAll("[data-edge]")) {
        const relationship = edge.getAttribute("data-edge")!.split("|")[1];
        expect(edge.getAttribute("marker-end")).toBe(`url(#test-${relationship})`);
        expect(edge.hasAttribute("marker-start")).toBe(false);
      }
    }
  });

  it("retains 40/200/500-character, multi-paragraph and unbroken-token text within computed symbol interiors", () => {
    const strings = ["A".repeat(40), "Review scope and corroborate evidence. ".repeat(6).slice(0, 200), "Check origin, integrity and freshness. ".repeat(15).slice(0, 500), "First paragraph of the claim.\n\nSecond paragraph and qualifications.", "W".repeat(80)];
    for (const type of ["GsnGoal", "GsnStrategy", "GsnSolution", "GsnContext", "GsnAssumption", "GsnJustification"] as GsnType[]) {
      for (const statement of strings) {
        const fixture = notationFixture();
        const el = element("G1", type, statement);
        fixture.elements = new Map([[el.gsnId, el]]);
        const glyph = glyphFor(el);
        expect(FONT_SIZE).toBeGreaterThanOrEqual(14);
        const doc = parseSvg(renderDiagram(fixture, { G1: { x: 0, y: 0 } }));
        const lines = [...node(doc, "G1").querySelectorAll('[data-statement-line="true"]')];
        expect(lines.map(line => line.textContent).join("").replace(/\s/g, "")).toBe(statement.replace(/\s/g, ""));
        expect(lines.some(line => line.textContent?.includes("…"))).toBe(false);
        for (const line of lines) {
          const halfWidth = textWidth(line.textContent ?? "") / 2;
          const baseline = Number(line.getAttribute("y"));
          const verticalExtent = Math.max(Math.abs(baseline - 16), Math.abs(baseline + 4));
          expect(Number(line.getAttribute("font-size"))).toBeGreaterThanOrEqual(14);
          expect(verticalExtent, `${type}: text vertical bounds`).toBeLessThan(glyph.height / 2);
          let interior = glyph.width / 2;
          if (type === "GsnSolution") interior = Math.sqrt((glyph.width / 2) ** 2 - verticalExtent ** 2);
          if (type === "GsnAssumption" || type === "GsnJustification") interior *= Math.sqrt(1 - (verticalExtent / (glyph.height / 2)) ** 2);
          if (type === "GsnStrategy") interior -= 26;
          if (type === "GsnContext") interior -= 48;
          expect(halfWidth, `${type}: line ${line.textContent}`).toBeLessThan(interior);
        }
      }
    }
    expect(wrapText("W".repeat(80)).join("")).toBe("W".repeat(80));
  });

  it("escapes user-controlled identifiers, titles and statements without introducing SVG script or event attributes", () => {
    const malicious = '<script>alert("x")</script> & <image onload="run()"> \'quoted\'';
    const fixture = notationFixture();
    const el = element('G"<&1', "GsnGoal", malicious);
    el.name = malicious;
    fixture.rootId = el.gsnId;
    fixture.elements = new Map([[el.gsnId, el]]);
    const doc = parseSvg(exportSvg(fixture, { [el.gsnId]: { x: 0, y: 0 } }));
    expect(doc.querySelector("script,image")).toBeNull();
    expect([...doc.querySelectorAll("*")].flatMap(element => [...element.attributes]).some(attribute => /^on/i.test(attribute.name))).toBe(false);
    const rendered = node(doc, el.gsnId);
    expect([...rendered.querySelectorAll('[data-statement-line="true"]')].map(line => line.textContent).join("").replace(/\s/g, "")).toBe(malicious.replace(/\s/g, ""));
    expect(doc.querySelector("svg > title")!.textContent).toBe(malicious);
  });

  it("preserves every FireSat node/type and relationship in both graphs and the labelled model text", () => {
    const fixture = loadGoalStructure(FIRESAT_ROOT_DIR, firesatVaultFiles);
    const before = JSON.stringify([...fixture.elements.values()]);
    const expectedTypes = [...fixture.elements.values()].map(el => `${el.gsnId}|${el.gkType}`).sort();
    for (const projection of [false, true]) {
      const doc = parseSvg(renderDiagram(fixture, positionsFor(fixture), { projection }));
      expect([...doc.querySelectorAll("[data-node-id]")].map(el => `${el.getAttribute("data-node-id")}|${el.getAttribute("data-gsn-type")}`).sort()).toEqual(expectedTypes);
      expect([...doc.querySelectorAll("[data-edge]")].map(el => el.getAttribute("data-edge")).sort()).toEqual(graphTriples(fixture));
    }
    const text = projectionText(fixture);
    expect(text).toContain("not parser-validated interchange");
    const features = [...text.matchAll(/feature ("(?:[^"\\]|\\.)*") : (Gsn\w+) \{/g)].map(match => `${JSON.parse(match[1])}|${match[2]}`).sort();
    expect(features).toEqual(expectedTypes);
    const connectors = [...text.matchAll(/connector (SupportedBy|InContextOf) from ("(?:[^"\\]|\\.)*") to ("(?:[^"\\]|\\.)*");/g)].map(match => `${JSON.parse(match[2])}|${match[1] === "SupportedBy" ? "support" : "context"}|${JSON.parse(match[3])}`).sort();
    expect(connectors).toEqual(graphTriples(fixture));
    expect(JSON.stringify([...fixture.elements.values()])).toBe(before);
  });

  it("meets statement and outline/arrow contrast thresholds in each shipped theme", () => {
    const measured = Object.fromEntries(Object.entries(PALETTES).map(([theme, palette]) => {
      const ratios = { statement: contrast(palette.ink, palette.paper), outline: contrast(palette.line, palette.paper), selected: contrast(palette.selected, palette.paper), auxiliary: contrast(palette.muted, palette.paper) };
      expect(ratios.statement).toBeGreaterThanOrEqual(4.5);
      expect(ratios.outline).toBeGreaterThanOrEqual(3);
      expect(ratios.selected).toBeGreaterThanOrEqual(3);
      expect(ratios.auxiliary).toBeGreaterThanOrEqual(4.5);
      return [theme, Object.fromEntries(Object.entries(ratios).map(([key, ratio]) => [key, Number(ratio.toFixed(2))]))];
    }));
    console.info("Measured sRGB contrast ratios:", JSON.stringify(measured));
  });
});
