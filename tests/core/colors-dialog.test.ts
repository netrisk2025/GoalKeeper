// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorsDialog } from "../../src/features/structure/ColorsDialog";
import { useAppStore } from "../../src/state/store";
import { emptyLayout, type GsnElement } from "../../src/core/model/types";
import { getNodeStyle } from "../../src/core/presentation/colors";
let host: HTMLDivElement, root: Root;
const close = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  useAppStore.setState(useAppStore.getInitialState(), true);
  const node: GsnElement = { gsnId: "G1", gkType: "GsnGoal", filePath: "case/G1.md", name: "Root", statement: "An unchanged claim.", isRoot: true, undeveloped: true, supportedBy: [], inContextOf: [], hasEvidence: [] };
  useAppStore.setState({ theme: "light", structure: { rootId: "G1", rootDir: "case", elements: new Map([["G1", node]]), evidence: new Map(), layout: emptyLayout("G1") } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  act(() => root.render(createElement(ColorsDialog, { open: true, onClose: close })));
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });
function color(label: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label} color"]`)!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
describe("Loss-compatible color selector", () => {
  it("offers all six types and four channels, applies immediately without changing semantic content", () => {
    expect(host.querySelector("dialog")!.open).toBe(true);
    expect(host.querySelectorAll("option")).toHaveLength(6);
    expect(host.querySelectorAll('input[type="color"]')).toHaveLength(4);
    const before = JSON.stringify([...useAppStore.getState().structure!.elements]);
    color("Font", "#010203"); color("Fill", "#aabbcc"); color("Connector", "#112233"); color("Boundary", "#445566");
    expect(useAppStore.getState().nodeStyles.GsnGoal).toEqual({ font: "#010203", box: "#aabbcc", line: "#112233", border: "#445566" });
    act(() => { const select = host.querySelector("select")!; select.value = "GsnSolution"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Fill color"]')!.value).toBe(getNodeStyle("GsnSolution").box);
    color("Fill", "#abcdef");
    expect(useAppStore.getState().nodeStyles.GsnGoal?.box).toBe("#aabbcc");
    expect(useAppStore.getState().nodeStyles.GsnSolution?.box).toBe("#abcdef");
    expect(JSON.stringify([...useAppStore.getState().structure!.elements])).toBe(before);
    expect(useAppStore.getState().contentDirty).toBe(false);
    expect(useAppStore.getState().layoutDirty).toBe(true);
  });
  it("retains low-contrast user choices with advisory feedback and resets every type", () => {
    color("Font", "#ffffff"); color("Fill", "#ffffff");
    expect(useAppStore.getState().nodeStyles.GsnGoal?.font).toBe("#ffffff");
    expect(host.querySelector('[role="status"]')!.textContent).toContain("Some choices fall below");
    act(() => [...host.querySelectorAll("button")].find(b => b.textContent === "Reset default colors")!.click());
    expect(useAppStore.getState().nodeStyles).toEqual({});
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Font color"]')!.value).toBe(getNodeStyle("GsnGoal").font);
    act(() => [...host.querySelectorAll("button")].find(b => b.textContent === "Done")!.click());
    expect(close).toHaveBeenCalledOnce();
  });
});
