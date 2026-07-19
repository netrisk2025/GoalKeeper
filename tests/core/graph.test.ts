import { describe, expect, it } from "vitest";
import { pathToRoot, reachableFromRoot } from "../../src/core/graph/reachability";
import { findSupportCycle } from "../../src/core/graph/cycle";
import type { GsnElement } from "../../src/core/model/types";

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

describe("graph", () => {
  it("reachable follows support and context", () => {
    const elements = new Map(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["S1"], inContextOf: ["C1"] }),
        el({ gsnId: "S1", gkType: "GsnStrategy", supportedBy: ["Sn1"] }),
        el({ gsnId: "Sn1", gkType: "GsnSolution" }),
        el({ gsnId: "C1", gkType: "GsnContext" }),
        el({ gsnId: "G9", gkType: "GsnGoal" }),
      ].map((e) => [e.gsnId, e] as const),
    );
    const r = reachableFromRoot("G1", elements);
    expect(r.has("S1")).toBe(true);
    expect(r.has("Sn1")).toBe(true);
    expect(r.has("C1")).toBe(true);
    expect(r.has("G9")).toBe(false);
  });

  it("pathToRoot", () => {
    const elements = new Map(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["S1"] }),
        el({ gsnId: "S1", gkType: "GsnStrategy", supportedBy: ["G2"] }),
        el({ gsnId: "G2", gkType: "GsnGoal" }),
      ].map((e) => [e.gsnId, e] as const),
    );
    expect(pathToRoot("G1", "G2", elements)).toEqual(["G1", "S1", "G2"]);
  });

  it("findSupportCycle", () => {
    const elements = new Map(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", supportedBy: ["G2"] }),
        el({ gsnId: "G2", gkType: "GsnGoal", supportedBy: ["G1"] }),
      ].map((e) => [e.gsnId, e] as const),
    );
    expect(findSupportCycle(elements)).toBeTruthy();
  });
});
