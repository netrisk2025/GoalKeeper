// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useAppStore } from "../src/state/store";
import { emptyLayout, type GoalStructure, type GsnElement } from "../src/core/model/types";

// These cases exercise the real application/menu/dialog handlers. Diagram rendering
// and startup IO are unrelated to the discard-confirmation boundary.
vi.mock("../src/features/structure/GsnCanvas", () => ({ GsnCanvas: () => null }));
vi.mock("../src/features/structure/ModelDialog", () => ({ ModelDialog: () => null }));
import App from "../src/App";

let container: HTMLDivElement;
let root: Root;
let original: GoalStructure;
const operations = {
  bootstrap: vi.fn(async () => {}), useDemoVault: vi.fn(async () => {}),
  openVault: vi.fn(async () => {}), openNamedVault: vi.fn(async () => {}),
  openRoot: vi.fn(async () => true), createRoot: vi.fn(async () => true),
};

function click(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  expect(button, `Expected actionable button “${text}”`).toBeDefined();
  expect(button!.disabled).toBe(false);
  act(() => button!.click());
}

function expectWorkingCaseRetained() {
  const state = useAppStore.getState();
  expect(state.structure).toBe(original);
  expect(state.structure!.elements.get("G1")!.statement).toBe("Unsaved operational claim that must survive a cancelled switch.");
  expect(state.contentDirty).toBe(true);
  expect(state.layoutDirty).toBe(true);
  expect(state.vaultPath).toBe("memory://working");
  expect(state.workingPositions).toEqual({ G1: { x: 777, y: 333 } });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: vi.fn() });
  useAppStore.setState(useAppStore.getInitialState(), true);
  const element: GsnElement = {
    filePath: "working/G1.md", gsnId: "G1", gkType: "GsnGoal", name: "Working case",
    statement: "Unsaved operational claim that must survive a cancelled switch.",
    isRoot: true, undeveloped: true, supportedBy: [], inContextOf: [], hasEvidence: [],
  };
  original = { rootId: "G1", rootDir: "working", elements: new Map([["G1", element]]), evidence: new Map(), layout: emptyLayout("G1") };
  useAppStore.setState({ ...operations, ready: true, vaultPath: "memory://working", structure: original,
    selectedId: "G1", contentDirty: true, layoutDirty: true, workingPositions: { G1: { x: 777, y: 333 } },
    roots: [
      { rootDir: "working", rootGsnId: "G1", name: "Working case", statement: element.statement, filePath: element.filePath },
      { rootDir: "other", rootGsnId: "G1", name: "Other case", statement: "Other claim", filePath: "other/G1.md" },
    ],
  });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(App)));
});

afterEach(() => {
  act(() => root.unmount()); container.remove();
  Reflect.deleteProperty(window, "showDirectoryPicker");
  vi.restoreAllMocks();
});

describe("Application discard confirmations preserve unsaved cases", () => {
  it("cancels Sample case before the replacement operation is dispatched", () => {
    click("Sample case");
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(operations.useDemoVault).not.toHaveBeenCalled();
    expectWorkingCaseRetained();
    // The guard still permits the explicit accept path; cancellation is not
    // accidentally implemented by disabling the switch altogether.
    vi.mocked(window.confirm).mockReturnValueOnce(true);
    click("Sample case");
    expect(operations.useDemoVault).toHaveBeenCalledOnce();
  });

  it("prompts on actual native/named vault selection and cancels both actions", () => {
    click("Open vault");
    expect(window.confirm).not.toHaveBeenCalled();
    click("Choose folder on disk…");
    expect(operations.openVault).not.toHaveBeenCalled();
    expect(Reflect.get(window, "showDirectoryPicker")).not.toHaveBeenCalled();
    expectWorkingCaseRetained();
    click("Create / open named vault");
    expect(operations.openNamedVault).not.toHaveBeenCalled();
    expect(window.confirm).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expectWorkingCaseRetained();
  });

  it("cancels the argument dropdown change before opening another root", () => {
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Select argument"]')!;
    act(() => { select.value = "other"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(operations.openRoot).not.toHaveBeenCalled();
    expectWorkingCaseRetained();
  });

  it("cancels New Root creation without discarding the working case or form draft", () => {
    click("New Root Goal");
    expect(window.confirm).not.toHaveBeenCalled();
    const title = container.querySelector<HTMLInputElement>('input[placeholder="e.g. System is acceptably safe"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(title, "Proposed new case");
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    click("Create");
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(operations.createRoot).not.toHaveBeenCalled();
    expect(title.value).toBe("Proposed new case");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expectWorkingCaseRetained();
  });
});
