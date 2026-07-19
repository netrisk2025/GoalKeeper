import { describe, expect, it } from "vitest";
import { canLink } from "../../src/core/rules/relationships";
import { validateStructure } from "../../src/core/rules/validate";
import type { GoalStructure, GsnElement } from "../../src/core/model/types";
import { emptyLayout } from "../../src/core/model/types";

function el(partial: Partial<GsnElement> & Pick<GsnElement, "gsnId" | "gkType">): GsnElement {
  return {
    filePath: `${partial.gsnId}.md`,
    name: partial.gsnId,
    statement: "claim",
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

describe("canLink", () => {
  it("allows Goal -> Strategy / Goal / Solution SupportedBy", () => {
    expect(canLink("GsnGoal", "GsnStrategy", "SUPPORTED_BY")).toBe(true);
    expect(canLink("GsnGoal", "GsnGoal", "SUPPORTED_BY")).toBe(true);
    expect(canLink("GsnGoal", "GsnSolution", "SUPPORTED_BY")).toBe(true);
  });
  it("allows Strategy -> Goal / Solution", () => {
    expect(canLink("GsnStrategy", "GsnGoal", "SUPPORTED_BY")).toBe(true);
    expect(canLink("GsnStrategy", "GsnSolution", "SUPPORTED_BY")).toBe(true);
    expect(canLink("GsnStrategy", "GsnStrategy", "SUPPORTED_BY")).toBe(false);
  });
  it("allows context links from Goal and Strategy", () => {
    expect(canLink("GsnGoal", "GsnContext", "IN_CONTEXT_OF")).toBe(true);
    expect(canLink("GsnStrategy", "GsnAssumption", "IN_CONTEXT_OF")).toBe(true);
    expect(canLink("GsnSolution", "GsnContext", "IN_CONTEXT_OF")).toBe(false);
  });
  it("rejects Solution as SupportedBy source", () => {
    expect(canLink("GsnSolution", "GsnGoal", "SUPPORTED_BY")).toBe(false);
  });
});

describe("validateStructure", () => {
  it("flags cycle", () => {
    const s = structure(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["G2"] }),
        el({ gsnId: "G2", gkType: "GsnGoal", supportedBy: ["G1"] }),
      ],
      "G1",
    );
    const findings = validateStructure(s);
    expect(findings.some((f) => f.code === "CYCLE")).toBe(true);
  });

  it("warns solution without evidence", () => {
    const s = structure(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["Sn1"] }),
        el({ gsnId: "Sn1", gkType: "GsnSolution", hasEvidence: [] }),
      ],
      "G1",
    );
    const findings = validateStructure(s);
    expect(findings.some((f) => f.code === "NO_EVIDENCE")).toBe(true);
  });

  it("errors on solution outgoing support", () => {
    const s = structure(
      [
        el({ gsnId: "G1", gkType: "GsnGoal", isRoot: true, supportedBy: ["Sn1"] }),
        el({ gsnId: "Sn1", gkType: "GsnSolution", supportedBy: ["G2"] }),
        el({ gsnId: "G2", gkType: "GsnGoal" }),
      ],
      "G1",
    );
    const findings = validateStructure(s);
    expect(findings.some((f) => f.code === "SOLUTION_OUTGOING")).toBe(true);
  });
});
