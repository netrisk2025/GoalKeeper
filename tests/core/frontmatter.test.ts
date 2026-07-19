import { describe, expect, it } from "vitest";
import { parseFrontmatter, stringifyFrontmatter } from "../../src/core/markdown/frontmatter";
import { parseElementFile, serializeElement } from "../../src/core/markdown/parse";
import type { GsnElement } from "../../src/core/model/types";

describe("browser-safe frontmatter", () => {
  it("round-trips scalars and arrays", () => {
    const data = {
      gk_type: "GsnGoal",
      gsn_id: "G1",
      name: "Safe enough",
      is_root: true,
      undeveloped: false,
      supported_by: ["[[S1]]", "[[Sn1]]"],
    };
    const text = stringifyFrontmatter("# Body\n\nHello\n", data);
    expect(text.startsWith("---\n")).toBe(true);
    const parsed = parseFrontmatter(text);
    expect(parsed.data.gk_type).toBe("GsnGoal");
    expect(parsed.data.gsn_id).toBe("G1");
    expect(parsed.data.is_root).toBe(true);
    expect(parsed.data.supported_by).toEqual(["[[S1]]", "[[Sn1]]"]);
    expect(parsed.content).toContain("Hello");
  });

  it("element serialize/parse without Buffer", () => {
    const el: GsnElement = {
      filePath: "demo/G1.md",
      gkType: "GsnGoal",
      gsnId: "G1",
      name: "Press is safe",
      statement: "The press is acceptably safe to operate.",
      isRoot: true,
      undeveloped: false,
      supportedBy: ["S1"],
      inContextOf: ["C1"],
      hasEvidence: [],
    };
    const text = serializeElement(el);
    expect(text).not.toMatch(/Buffer/);
    const parsed = parseElementFile(el.filePath, text);
    expect("gkType" in parsed && parsed.name).toBe("Press is safe");
    expect("gkType" in parsed && parsed.isRoot).toBe(true);
    expect("gkType" in parsed && parsed.supportedBy).toEqual(["S1"]);
    expect("gkType" in parsed && parsed.statement).toContain("acceptably safe");
  });
});
