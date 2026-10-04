// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GsnCanvas } from "../../src/features/structure/GsnCanvas";
import { useAppStore } from "../../src/state/store";
import { emptyLayout, type GoalStructure, type GsnElement, type NodePosition } from "../../src/core/model/types";

const elements: GsnElement[] = [
  { gsnId: "G1", gkType: "GsnGoal", filePath: "Canvas/G1.md", name: "Root", statement: "The outermost Goal follows its pointer.", isRoot: true, undeveloped: false, supportedBy: ["G2"], inContextOf: [], hasEvidence: [] },
  { gsnId: "G2", gkType: "GsnGoal", filePath: "Canvas/G2.md", name: "Support", statement: "A second Goal establishes the opposite canvas boundary.", isRoot: false, undeveloped: true, supportedBy: [], inContextOf: [], hasEvidence: [] },
];
const initialPositions = { G1: { x: 200, y: 150 }, G2: { x: 800, y: 600 } };
let host: HTMLDivElement, root: Root;
function fixture(rootDir: string): GoalStructure { return { rootId: "G1", rootDir, elements: new Map(elements.map(node => [node.gsnId, node])), evidence: new Map(), layout: emptyLayout("G1") }; }
function Harness({ caseData, revealToken = 4242, selectedId = "G1" }: { caseData: GoalStructure; revealToken?: number; selectedId?: string }) {
  const [positions, setPositions] = useState<Record<string, NodePosition>>(initialPositions);
  return createElement(GsnCanvas, { structure: caseData, positions, selectedId, revealToken, graphEpoch: 0, errorIds: new Set<string>(), onSelect: () => {}, onDrag: (id: string, x: number, y: number) => setPositions(previous => ({ ...previous, [id]: { x, y } })) });
}
function pointer(target: Element, name: string, x: number, y: number) {
  const event = new MouseEvent(name, { bubbles: true, button: 0, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  target.dispatchEvent(event);
}
function origin(id = "G1") {
  const svg = host.querySelector("svg")!;
  const viewBox = svg.getAttribute("viewBox")!.split(" ").map(Number);
  const offset = svg.parentElement as HTMLElement;
  const position = host.querySelector(`[data-node-id="${id}"]`)!.getAttribute("transform")!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!;
  const canvas = host.querySelector('[data-testid="gsn-canvas"]')!;
  return { x: Number(position[1]) - viewBox[0] + parseFloat(offset.style.left || "0") - canvas.scrollLeft, y: Number(position[2]) - viewBox[1] + parseFloat(offset.style.top || "0") - canvas.scrollTop };
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const canvas = this.closest('[data-testid="gsn-canvas"]');
    const isSize = this.classList.contains("gk-svg-size");
    return { x: 0, y: 0, left: isSize ? -(canvas?.scrollLeft ?? 0) : 0, top: isSize ? -(canvas?.scrollTop ?? 0) : 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}) };
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: function (this: HTMLElement, x: number, y: number) { this.scrollLeft = Math.max(0, x); this.scrollTop = Math.max(0, y); } });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: () => {} });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: () => {} });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: () => true });
  useAppStore.setState({ vaultPath: "memory://canvas-tests", viewport: { x: 0, y: 0, zoom: 1 }, theme: "light" });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("primary canvas interaction regressions [4.1,4.2,4.5]", () => {
  it.each([
    { branch: false, dx: -80, dy: -60 },
    { branch: false, dx: 80, dy: 60 },
    { branch: true, dx: -80, dy: -60 },
    { branch: true, dx: 80, dy: 60 },
  ])("tracks an extreme node through drag and release for branch=$branch delta=[$dx,$dy]", ({ branch, dx, dy }) => {
    const selectedId = branch ? "G2" : "G1";
    act(() => root.render(createElement(Harness, { caseData: fixture(`Canvas-Drag-${branch}-${dx}`), selectedId })));
    if (branch) act(() => [...host.querySelectorAll("button")].find(button => button.textContent === "Read selected branch")!.click());
    const size = host.querySelector(".gk-svg-size") as HTMLElement;
    const originalSize = { width: size.style.width, height: size.style.height };
    const start = origin(selectedId);
    const canvas = host.querySelector('[data-testid="gsn-canvas"]')!;
    act(() => pointer(host.querySelector(`[data-node-id="${selectedId}"]`)!, "pointerdown", 200, 150));
    act(() => pointer(canvas, "pointermove", 200 + dx, 150 + dy));
    expect(size.style.width).toBe(originalSize.width);
    expect(size.style.height).toBe(originalSize.height);
    expect(origin(selectedId).x - start.x).toBe(dx);
    expect(origin(selectedId).y - start.y).toBe(dy);
    const moved = origin(selectedId);
    act(() => pointer(canvas, "pointerup", 200 + dx, 150 + dy));
    expect(origin(selectedId)).toEqual(moved);
    expect(canvas.scrollLeft).toBeGreaterThan(0);
    expect(canvas.scrollTop).toBeGreaterThan(0);
  });

  it("restores a saved branch with its viewport instead of applying branch coordinates to the whole argument", () => {
    const caseData = fixture("Canvas-Saved-Branch");
    act(() => root.render(createElement(Harness, { caseData, selectedId: "G2" })));
    const button = (label: string) => [...host.querySelectorAll("button")].find(button => button.textContent === label)!;
    act(() => button("Read selected branch").click());
    expect([...host.querySelectorAll("[data-node-id]")].map(node => node.getAttribute("data-node-id"))).toEqual(["G2"]);
    expect(useAppStore.getState().viewport.focusId).toBe("G2");
    const canvas = host.querySelector('[data-testid="gsn-canvas"]')!;
    act(() => { canvas.scrollLeft = 50; canvas.scrollTop = 90; canvas.dispatchEvent(new Event("scroll", { bubbles: true })); });
    const savedViewport = { ...useAppStore.getState().viewport };
    const savedScroll = { x: canvas.scrollLeft, y: canvas.scrollTop };
    act(() => button("Whole argument").click());
    act(() => (host.querySelector('button[aria-label="Zoom out"]') as HTMLButtonElement).click());
    expect(useAppStore.getState().viewport.focusId).toBeUndefined();
    const restoredCase = { ...caseData, layout: { ...caseData.layout, savedAt: "2026-10-04T00:00:00Z", viewport: savedViewport } };
    act(() => {
      useAppStore.setState({ viewport: savedViewport });
      root.render(createElement(Harness, { caseData: restoredCase, selectedId: "G2", revealToken: 4243 }));
    });
    const restored = host.querySelector('[data-testid="gsn-canvas"]')!;
    expect([...host.querySelectorAll("[data-node-id]")].map(node => node.getAttribute("data-node-id"))).toEqual(["G2"]);
    expect(restored.scrollLeft).toBe(savedScroll.x);
    expect(restored.scrollTop).toBe(savedScroll.y);
    expect(host.querySelector('output[aria-label="Diagram zoom"]')!.textContent).toBe("100%");
  });

  it("restores working pan and zoom when Structure remounts before a first Save Layout", () => {
    const caseData = fixture("Canvas-Remount");
    act(() => root.render(createElement(Harness, { caseData })));
    expect(caseData.layout.savedAt).toBeUndefined();
    const canvas = host.querySelector('[data-testid="gsn-canvas"]')!;
    act(() => { canvas.scrollLeft = 245; canvas.scrollTop = 186; canvas.dispatchEvent(new Event("scroll", { bubbles: true })); });
    const before = { ...useAppStore.getState().viewport };
    const beforeScroll = { x: canvas.scrollLeft, y: canvas.scrollTop };
    act(() => root.render(createElement("div", null, "Evidence view replaces Structure.")));
    act(() => root.render(createElement(Harness, { caseData })));
    const restored = host.querySelector('[data-testid="gsn-canvas"]')!;
    expect(restored.scrollLeft).toBe(beforeScroll.x);
    expect(restored.scrollTop).toBe(beforeScroll.y);
    expect(host.querySelector('output[aria-label="Diagram zoom"]')!.textContent).toBe(`${Math.round(before.zoom * 100)}%`);
  });
});
