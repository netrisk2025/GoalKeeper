import { describe, expect, it } from "vitest";
import { mergeLastSaved, placeNewNode, toLayoutDoc } from "../../src/core/layout/manager";
import type { GoalStructure, GsnElement } from "../../src/core/model/types";
import { emptyLayout } from "../../src/core/model/types";

function el(partial: Partial<GsnElement> & Pick<GsnElement, "gsnId" | "gkType">): GsnElement {
  return {
    filePath: `${partial.gsnId}.md`,
    name: partial.gsnId,
    statement: "x",
    isRoot: false,
    undeveloped: false,
    supportedBy: [],
    inContextOf: [],
    hasEvidence: [],
    ...partial,
  };
}

function structure(elements: GsnElement[], rootId: string): GoalStructure {
  return {
    rootId,
    rootDir: "demo",
    elements: new Map(elements.map((e) => [e.gsnId, e])),
    evidence: new Map(),
    layout: emptyLayout(rootId),
  };
}

describe("layout manager", () => {
  it("places new node near parent", () => {
    const s = structure(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["S1"] }),
        el({ gsnId: "S1", gkType: "GsnStrategy" }),
      ],
      "G1",
    );
    const working = { G1: { x: 100, y: 50 } };
    const pos = placeNewNode(s, working, "S1", "G1", "SUPPORTED_BY");
    expect(pos.y).toBeGreaterThan(working.G1.y);
  });

  it("mergeLastSaved keeps saved and places missing", () => {
    const s = structure(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["S1"] }),
        el({ gsnId: "S1", gkType: "GsnStrategy" }),
      ],
      "G1",
    );
    const last = emptyLayout("G1");
    last.nodes = { G1: { x: 10, y: 20 } };
    const merged = mergeLastSaved(s, last);
    expect(merged.positions.G1).toEqual({ x: 10, y: 20 });
    expect(merged.positions.S1).toBeDefined();
    expect(merged.newlyPlaced).toContain("S1");
  });

  it("drops stale layout entries", () => {
    const s = structure([el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true })], "G1");
    const last = emptyLayout("G1");
    last.nodes = { G1: { x: 0, y: 0 }, G99: { x: 1, y: 1 } };
    const merged = mergeLastSaved(s, last);
    expect(merged.staleDropped).toContain("G99");
    expect(merged.positions.G99).toBeUndefined();
  });

  it("toLayoutDoc sets schema", () => {
    const doc = toLayoutDoc("G1", { G1: { x: 1, y: 2 } }, { x: 0, y: 0, zoom: 1 });
    expect(doc.schemaVersion).toBe(1);
    expect(doc.tool).toBe("goalkeeper");
    expect(doc.nodes.G1).toEqual({ x: 1, y: 2 });
  });
});
