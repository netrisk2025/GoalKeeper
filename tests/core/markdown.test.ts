import { describe, expect, it } from "vitest";
import {
  parseElementFile,
  serializeElement,
  allocateGsnId,
  wikilinkKey,
} from "../../src/core/markdown/parse";
import type { GsnElement } from "../../src/core/model/types";

describe("markdown round-trip", () => {
  it("round-trips a root goal with links", () => {
    const el: GsnElement = {
      filePath: "demo/G1.md",
      gkType: "GsnGoal",
      gsnId: "G1",
      name: "Safe enough",
      statement: "The system is acceptably safe.",
      isRoot: true,
      undeveloped: false,
      supportedBy: ["S1", "Sn1"],
      inContextOf: ["C1"],
      hasEvidence: [],
      created: "2026-07-19T00:00:00Z",
    };
    const text = serializeElement(el);
    const parsed = parseElementFile(el.filePath, text);
    expect("gkType" in parsed).toBe(true);
    if ("gkType" in parsed) {
      expect(parsed.gsnId).toBe("G1");
      expect(parsed.isRoot).toBe(true);
      expect(parsed.supportedBy).toEqual(["S1", "Sn1"]);
      expect(parsed.inContextOf).toEqual(["C1"]);
      expect(parsed.statement).toContain("acceptably safe");
    }
  });

  it("parses body section wikilinks when frontmatter empty", () => {
    const text = `---
gk_type: GsnStrategy
gsn_id: S1
name: By argument
---
# S1

We argue by decomposition.

## Supported By
- [[G2]]
- [[G3]]
`;
    const parsed = parseElementFile("x/S1.md", text);
    expect("gkType" in parsed && parsed.supportedBy).toEqual(["G2", "G3"]);
  });
});

describe("ids", () => {
  it("allocates next Sn id", () => {
    expect(allocateGsnId("GsnSolution", ["Sn1", "Sn3", "G1"])).toBe("Sn4");
    expect(allocateGsnId("GsnGoal", ["G1", "G2"])).toBe("G3");
  });
  it("wikilinkKey strips path and extension", () => {
    expect(wikilinkKey("Evidence/TR-42.md")).toBe("TR-42");
    expect(wikilinkKey("[[G1]]".replace(/[\[\]]/g, ""))).toBe("G1");
  });
});
