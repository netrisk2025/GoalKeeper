import { describe, expect, it } from "vitest";
import type { GoalStructure, GsnElement, GsnType, NodePosition } from "../../src/core/model/types";
import { emptyLayout } from "../../src/core/model/types";
import { layoutArgument } from "../../src/core/layout/elk";
import { glyphFor } from "../../src/core/presentation/geometry";
import { loadGoalStructure } from "../../src/core/vault/load";
import { firesatVaultFiles, FIRESAT_ROOT_DIR } from "../../src/examples/firesat";

function el(gsnId: string, gkType: GsnType, supportedBy: string[] = [], inContextOf: string[] = [], statement = "A legible claim with a source and reviewable context."): GsnElement {
  return { gsnId, gkType, supportedBy, inContextOf, statement, name: gsnId, filePath: `Layout/${gsnId}.md`, isRoot: gsnId === "G1", undeveloped: false, hasEvidence: [] };
}
function sharedFixture(): GoalStructure {
  const nodes = [
    el("G1", "GsnGoal", ["S1", "S2"], ["C1"]),
    el("S1", "GsnStrategy", ["G2"], ["A1"]),
    el("S2", "GsnStrategy", ["G2"], ["J1"]),
    el("G2", "GsnGoal", ["Sn1"], [], "Check origin, integrity and freshness. ".repeat(15).slice(0, 500)),
    el("Sn1", "GsnSolution", [], [], "W".repeat(80)),
    el("C1", "GsnContext"), el("A1", "GsnAssumption"), el("J1", "GsnJustification"),
  ];
  return { rootId: "G1", rootDir: "Layout", elements: new Map(nodes.map(node => [node.gsnId, node])), evidence: new Map(), layout: emptyLayout("G1") };
}
function verifyGeometry(structure: GoalStructure, positions: Record<string, NodePosition>): void {
  expect(Object.keys(positions).sort()).toEqual([...structure.elements.keys()].sort());
  const boxes = [...structure.elements.values()].map(node => {
    const pos = positions[node.gsnId], glyph = glyphFor(node);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    return { id: node.gsnId, left: pos.x - glyph.width / 2, top: pos.y - glyph.height / 2, right: pos.x + glyph.width / 2 + (["GsnAssumption", "GsnJustification"].includes(node.gkType) ? 20 : 0), bottom: pos.y + glyph.height / 2 + (node.undeveloped ? 24 : ["GsnAssumption", "GsnJustification"].includes(node.gkType) ? 12 : 0) };
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const overlaps = Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
      expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }
  for (const node of structure.elements.values()) {
    for (const targetId of node.supportedBy) {
      const target = structure.elements.get(targetId)!;
      expect(positions[node.gsnId].y + glyphFor(node).height / 2, `${node.gsnId} above ${targetId}`).toBeLessThan(positions[targetId].y - glyphFor(target).height / 2);
    }
    for (const contextId of node.inContextOf) {
      const context = structure.elements.get(contextId)!;
      expect(positions[contextId].x - glyphFor(context).width / 2, `${contextId} beside ${node.gsnId}`).toBeGreaterThan(positions[node.gsnId].x + glyphFor(node).width / 2);
    }
  }
}

describe("ELK layered GSN arrangement [4]", () => {
  it("arranges FireSat without overlaps, including context and undeveloped decorators, without mutating semantics", async () => {
    const fixture = loadGoalStructure(FIRESAT_ROOT_DIR, firesatVaultFiles);
    const before = JSON.stringify([...fixture.elements.values()]);
    verifyGeometry(fixture, await layoutArgument(fixture));
    expect(JSON.stringify([...fixture.elements.values()])).toBe(before);
  }, 10000);

  it("retains one shared supporting identity below both parents and reserves long-text geometry", async () => {
    const fixture = sharedFixture();
    const positions = await layoutArgument(fixture);
    verifyGeometry(fixture, positions);
    expect(Object.keys(positions).filter(id => id === "G2")).toHaveLength(1);
    expect(positions.G2.y).toBeGreaterThan(positions.S1.y);
    expect(positions.G2.y).toBeGreaterThan(positions.S2.y);
    expect(glyphFor(fixture.elements.get("G2")!).height).toBeGreaterThan(300);
  }, 10000);
});
