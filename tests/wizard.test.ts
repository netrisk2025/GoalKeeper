// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WizardDialog } from "../src/features/wizard/WizardDialog";
import { useAppStore } from "../src/state/store";
import { emptyLayout, type GsnElement } from "../src/core/model/types";

let container: HTMLDivElement;
let root: Root;
const element = (id: string, extra: Partial<GsnElement> = {}): GsnElement => ({
  filePath: `case/${id}.md`, gsnId: id, gkType: "GsnGoal", name: id, statement: `Claim ${id}`,
  isRoot: id === "G1", undeveloped: true, supportedBy: [], inContextOf: [], hasEvidence: [], ...extra,
});
function snapshot() { return JSON.stringify([...useAppStore.getState().structure!.elements.values()]); }
function click(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  expect(button).toBeDefined();
  act(() => button!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useAppStore.setState(useAppStore.getInitialState(), true);
  const nodes = [element("G1", { supportedBy: ["S1"] }), element("S1", { gkType: "GsnStrategy", supportedBy: ["G2"] }), element("G2")];
  useAppStore.setState({ wizardOpen: true, selectedId: "G1", structure: { rootId: "G1", rootDir: "case", elements: new Map(nodes.map((node) => [node.gsnId, node])), evidence: new Map(), layout: emptyLayout("G1") } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  act(() => root.render(createElement(WizardDialog)));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe("SRS 1.8 / 5.10: optional six-step guidance", () => {
  it("does not mutate semantic data when a proposal is skipped or dismissed", () => {
    const before = snapshot(); click("Skip"); expect(snapshot()).toBe(before);
    click("Close"); expect(snapshot()).toBe(before); expect(useAppStore.getState().wizardOpen).toBe(false);
  });
  it("requires Apply and preserves undeveloped status when refining a claim", () => {
    const before = snapshot(); click("Apply");
    expect(snapshot()).not.toBe(before);
    expect(useAppStore.getState().structure!.elements.get("G1")!.undeveloped).toBe(true);
  });
  it("offers only Goals as targets of a Solution in step six", () => {
    for (let i = 0; i < 5; i++) click("Skip");
    const select = container.querySelector("select")!;
    expect([...select.options].map((option) => option.value)).toEqual(["G1", "G2"]);
    expect(container.textContent).toContain("creating a Solution alone does not close the evidence gap");
  });
});
