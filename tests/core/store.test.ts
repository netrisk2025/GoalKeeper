import { beforeEach, describe, expect, it, vi } from "vitest";
import { GSN_TYPES, emptyLayout, type GoalStructure, type GsnElement, type NodePosition } from "../../src/core/model/types";
import { serializeElement } from "../../src/core/markdown/parse";

const mocks = vi.hoisted(() => ({ write: vi.fn(), remove: vi.fn(), list: vi.fn(), layout: vi.fn() }));
vi.mock("../../src/core/layout/elk", () => ({ layoutArgument: mocks.layout }));
vi.mock("../../src/lib/fs", () => ({
  captureVaultSelection: vi.fn(() => ({ backend: "memory", vaultRoot: "memory://test", fsaRoot: null })), restoreVaultSelection: vi.fn(),
  deleteVaultFile: mocks.remove, writeVaultFile: mocks.write, listVaultFiles: mocks.list,
  ensureVaultReady: vi.fn(async () => "memory://test"), ensureVaultMeta: vi.fn(async () => {}),
  initFs: vi.fn(async () => "memory"), getBackend: vi.fn(() => "memory"),
  openNamedMemoryVault: vi.fn(() => "memory://test"), openMemoryVault: vi.fn(async () => "memory://test"),
  pickVaultDirectory: vi.fn(async () => null),
}));
import { useAppStore } from "../../src/state/store";

function node(id: string, extra: Partial<GsnElement> = {}): GsnElement {
  return { filePath: `case/${id}.md`, gsnId: id, gkType: "GsnGoal", name: id, statement: "A clear claim",
    isRoot: id === "G1", undeveloped: false, supportedBy: [], inContextOf: [], hasEvidence: [], ...extra };
}
function fixture(...nodes: GsnElement[]): GoalStructure {
  return { rootId: "G1", rootDir: "case", elements: new Map(nodes.map((n) => [n.gsnId, n])), evidence: new Map(), layout: emptyLayout("G1") };
}
function install(structure = fixture(node("G1"))) {
  useAppStore.setState({ structure, vaultPath: "memory://test", selectedId: "G1", workingPositions: Object.fromEntries([...structure.elements.keys()].map((id, i) => [id, { x: 100 + i * 300, y: 200 }])) });
  return structure;
}
function snapshot() { return JSON.stringify([...useAppStore.getState().structure!.elements.values()]); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

let disk: Map<string, string>;
beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState(useAppStore.getInitialState(), true);
  disk = new Map();
  mocks.list.mockImplementation(async () => [...disk].map(([path, text]) => ({ path, text })));
  mocks.write.mockImplementation(async (path: string, text: string) => { disk.set(path, text); });
  mocks.remove.mockImplementation(async (path: string) => { disk.delete(path); });
  mocks.layout.mockImplementation(async (s: GoalStructure) => Object.fromEntries([...s.elements.keys()].map((id, i) => [id, { x: 400 + i * 300, y: 100 + i * 250 }])));
});

describe("SRS 1.2, 1.4, 1.5, 1.8: mutation rejection preserves the argument", () => {
  it("rejects Strategy→Solution without attaching it to the root", () => {
    install(fixture(node("G1", { supportedBy: ["S1"] }), node("S1", { gkType: "GsnStrategy" })));
    useAppStore.getState().selectNode("S1");
    const before = snapshot();
    expect(useAppStore.getState().addNode("GsnSolution", "SUPPORTED_BY")).toBeNull();
    expect(snapshot()).toBe(before);
    expect(useAppStore.getState().notice).toContain("Cannot link");
  });
  it.each([1, 2, 3])("rejects a %i-node support cycle atomically", (length) => {
    install(fixture(...Array.from({ length }, (_, i) => node(`G${i + 1}`, { supportedBy: i + 1 < length ? [`G${i + 2}`] : [] }))));
    useAppStore.getState().selectNode(`G${length}`);
    const before = snapshot();
    useAppStore.getState().linkExisting("G1", "SUPPORTED_BY");
    expect(snapshot()).toBe(before);
    expect(useAppStore.getState().contentDirty).toBe(false);
    expect(useAppStore.getState().notice).toContain("rejected");
  });
  it("rejects a cycle entirely below the root", () => {
    install(fixture(node("G1", { supportedBy: ["G2"] }), node("G2", { supportedBy: ["G3"] }), node("G3")));
    useAppStore.getState().selectNode("G3");
    const before = snapshot();
    useAppStore.getState().linkExisting("G2", "SUPPORTED_BY");
    expect(snapshot()).toBe(before);
  });
  it("rejects duplicates and invalid undeveloped/evidence edits", () => {
    install(fixture(node("G1", { supportedBy: ["Sn1"] }), node("Sn1", { gkType: "GsnSolution" })));
    const before = snapshot();
    useAppStore.getState().linkExisting("Sn1", "SUPPORTED_BY");
    expect(snapshot()).toBe(before);
    expect(useAppStore.getState().notice).toBe("Link already exists.");
    useAppStore.getState().updateElement("Sn1", { undeveloped: true });
    useAppStore.getState().updateElement("G1", { hasEvidence: ["E1"] });
    expect(snapshot()).toBe(before);
  });
  it("preserves unfinished claims when a wizard supplies statement text", () => {
    install();
    const id = useAppStore.getState().addNode("GsnGoal", "SUPPORTED_BY", { statement: "An unproven claim." })!;
    expect(useAppStore.getState().structure!.elements.get(id)!.undeveloped).toBe(true);
    useAppStore.getState().updateElement(id, { statement: "A revised unproven claim." });
    expect(useAppStore.getState().structure!.elements.get(id)!.undeveloped).toBe(true);
  });
});

describe("SRS 4.1–4.4: stable working positions and explicit layout persistence", () => {
  it("keeps manual positions through editing, evidence association, selection and validation", () => {
    install(fixture(node("G1", { supportedBy: ["Sn1"] }), node("Sn1", { gkType: "GsnSolution" })));
    const store = useAppStore.getState();
    store.setPosition("Sn1", 711, 433);
    const positions = structuredClone(useAppStore.getState().workingPositions);
    store.selectNode("Sn1"); store.updateElement("Sn1", { statement: "Specific source reference", hasEvidence: ["Evidence/E1", "Evidence/E2"] }); store.revalidate();
    expect(useAppStore.getState().workingPositions).toEqual(positions);
    expect(mocks.layout).not.toHaveBeenCalled();
  });
  it("writes layout only on Save Layout and restores the persisted viewport/positions", async () => {
    install();
    const store = useAppStore.getState();
    store.setPosition("G1", 650, 420); store.setViewport({ x: 28, y: -70, zoom: 1.25 });
    await store.saveContent();
    expect(disk.has("case/_layout.json")).toBe(false);
    await store.saveLayout();
    const saved = JSON.parse(disk.get("case/_layout.json")!);
    store.setPosition("G1", 10, 10); store.setViewport({ x: 0, y: 0, zoom: 0.5 });
    store.restoreLastSaved();
    expect(useAppStore.getState().workingPositions).toEqual(saved.nodes);
    expect(useAppStore.getState().viewport).toEqual(saved.viewport);
    await store.openRoot("case");
    expect(useAppStore.getState().workingPositions).toEqual(saved.nodes);
    expect(useAppStore.getState().viewport).toEqual(saved.viewport);
    expect(mocks.layout).not.toHaveBeenCalled();
  });
  it("merges new and deleted nodes without moving saved extant positions", async () => {
    install(fixture(node("G1", { supportedBy: ["G2"] }), node("G2")));
    const store = useAppStore.getState();
    await store.saveLayout();
    const savedRoot = { ...useAppStore.getState().workingPositions.G1 };
    const newId = store.addNode("GsnContext", "IN_CONTEXT_OF", { parentId: "G1" })!;
    store.deleteNode("G2"); store.setPosition("G1", 90, 80); store.restoreLastSaved();
    expect(useAppStore.getState().workingPositions.G1).toEqual(savedRoot);
    expect(useAppStore.getState().workingPositions.G2).toBeUndefined();
    expect(Number.isFinite(useAppStore.getState().workingPositions[newId].x)).toBe(true);
  });
  it("arranges an unsaved case on open but never writes a layout automatically", async () => {
    disk.set("case/G1.md", serializeElement(node("G1")));
    await useAppStore.getState().openRoot("case");
    expect(mocks.layout).toHaveBeenCalledOnce();
    expect(disk.has("case/_layout.json")).toBe(false);
    expect(useAppStore.getState().layoutDirty).toBe(true);
  });
  it("discards an asynchronous layout after a manual move or case mutation", async () => {
    install();
    const pending = deferred<Record<string, NodePosition>>();
    mocks.layout.mockReturnValueOnce(pending.promise);
    const arranging = useAppStore.getState().autoLayout();
    useAppStore.getState().setPosition("G1", 900, 200);
    pending.resolve({ G1: { x: 0, y: 0 } }); await arranging;
    expect(useAppStore.getState().workingPositions.G1).toEqual({ x: 900, y: 200 });
    expect(useAppStore.getState().layoutBusy).toBe(false);
  });
});

describe("SRS 5.2, 5.6, 6.1: persisted editing, deletion and save races", () => {
  for (const type of GSN_TYPES) it(`creates, edits, saves and deletes a non-root ${type}`, async () => {
    install();
    const store = useAppStore.getState();
    const rel = ["GsnGoal", "GsnStrategy", "GsnSolution"].includes(type) ? "SUPPORTED_BY" : "IN_CONTEXT_OF";
    const id = store.addNode(type, rel)!;
    store.updateElement(id, { statement: "A revised and saved statement." });
    await store.saveContent();
    expect(disk.get(`case/${id}.md`)).toContain("A revised and saved statement.");
    store.deleteNode(id);
    expect(disk.has(`case/${id}.md`)).toBe(true);
    await store.saveContent();
    expect(disk.has(`case/${id}.md`)).toBe(false);
    expect(useAppStore.getState().pendingDeletions).toEqual([]);
    expect(useAppStore.getState().structure!.elements.get("G1")![rel === "SUPPORTED_BY" ? "supportedBy" : "inContextOf"]).not.toContain(id);
  });
  it("round-trips two evidence references on a Solution", async () => {
    install(fixture(node("G1", { supportedBy: ["Sn1"] }), node("Sn1", { gkType: "GsnSolution" })));
    const store = useAppStore.getState();
    store.updateElement("Sn1", { hasEvidence: ["Evidence/E1", "Evidence/E2"] });
    await store.saveContent(); await store.openRoot("case");
    expect(useAppStore.getState().structure!.elements.get("Sn1")!.hasEvidence).toEqual(["Evidence/E1", "Evidence/E2"]);
  });
  it("retains dirty content and reports failed writes", async () => {
    install();
    useAppStore.getState().updateElement("G1", { statement: "Unsaved" });
    mocks.write.mockRejectedValueOnce(new Error("Permission denied"));
    await useAppStore.getState().saveContent();
    expect(useAppStore.getState().contentDirty).toBe(true);
    expect(useAppStore.getState().notice).toBe("Save failed: Permission denied");
  });
  it("does not clear a newer edit while earlier content is saving", async () => {
    install();
    const pending = deferred<void>(); mocks.write.mockReturnValueOnce(pending.promise);
    const saving = useAppStore.getState().saveContent();
    await Promise.resolve();
    useAppStore.getState().updateElement("G1", { statement: "Newer edit" });
    pending.resolve(); await saving;
    expect(useAppStore.getState().contentDirty).toBe(true);
    expect(useAppStore.getState().structure!.elements.get("G1")!.statement).toBe("Newer edit");
  });
  it("does not roll back semantic edits or newer positions while a layout is saving", async () => {
    install();
    const pending = deferred<void>(); mocks.write.mockReturnValueOnce(pending.promise);
    const saving = useAppStore.getState().saveLayout();
    await Promise.resolve();
    useAppStore.getState().updateElement("G1", { statement: "Newer edit" });
    useAppStore.getState().setPosition("G1", 990, 800);
    pending.resolve(); await saving;
    expect(useAppStore.getState().structure!.elements.get("G1")!.statement).toBe("Newer edit");
    expect(useAppStore.getState().contentDirty).toBe(true);
    expect(useAppStore.getState().layoutDirty).toBe(true);
    expect(useAppStore.getState().workingPositions.G1).toEqual({ x: 990, y: 800 });
  });
  it("reports a failed read without replacing the open case", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const current = install(); mocks.list.mockRejectedValueOnce(new Error("Read denied"));
    await useAppStore.getState().openRoot("other");
    expect(useAppStore.getState().structure).toBe(current);
    expect(useAppStore.getState().notice).toBe("Open Root Goal failed: Read denied");
    log.mockRestore();
  });
  it("keeps the previous case after a candidate vault read fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const current = install();
    useAppStore.getState().updateElement("G1", { statement: "Working edit" });
    const prior = useAppStore.getState().structure;
    mocks.list.mockRejectedValueOnce(new Error("Candidate vault denied"));
    expect(await useAppStore.getState().openVaultAt("/unreadable", "tauri")).toBe(false);
    expect(useAppStore.getState().structure).toBe(prior);
    expect(useAppStore.getState().structure!.rootDir).toBe(current.rootDir);
    expect(useAppStore.getState().vaultPath).toBe("memory://test");
    expect(useAppStore.getState().contentDirty).toBe(true);
    expect(useAppStore.getState().notice).toContain("Candidate vault denied");
    log.mockRestore();
  });
  it("rejects stale root-open results after a later root is opened", async () => {
    const firstLayout = deferred<Record<string, NodePosition>>();
    const first = node("G1");
    const second = { ...node("G1"), filePath: "other/G1.md", name: "Newer case" };
    disk.set(first.filePath, serializeElement(first)); disk.set(second.filePath, serializeElement(second));
    mocks.layout.mockReturnValueOnce(firstLayout.promise);
    const firstOpen = useAppStore.getState().openRoot("case");
    await Promise.resolve();
    await useAppStore.getState().openRoot("other");
    firstLayout.resolve({ G1: { x: 0, y: 0 } });
    expect(await firstOpen).toBe(false);
    expect(useAppStore.getState().structure!.rootDir).toBe("other");
  });
  it("does not roll back a newer successful vault when an earlier open fails late", async () => {
    install();
    disk.set("case/G1.md", serializeElement(node("G1", { name: "Newer vault" })));
    const firstRead = deferred<{ path: string; text: string }[]>();
    mocks.list.mockReturnValueOnce(firstRead.promise);
    const firstOpen = useAppStore.getState().openVaultAt("memory://first", "memory");
    await Promise.resolve();
    expect(await useAppStore.getState().openVaultAt("memory://second", "memory")).toBe(true);
    firstRead.reject(new Error("Earlier vault denied"));
    expect(await firstOpen).toBe(false);
    expect(useAppStore.getState().vaultPath).toBe("memory://second");
    expect(useAppStore.getState().structure!.elements.get("G1")!.name).toBe("Newer vault");
    expect(useAppStore.getState().notice).not.toContain("Earlier vault denied");
  });
  it("restores the stable original case when overlapping candidate opens both fail", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = install();
    const firstRead = deferred<{ path: string; text: string }[]>();
    mocks.list.mockReturnValueOnce(firstRead.promise).mockRejectedValueOnce(new Error("Second denied"));
    const firstOpen = useAppStore.getState().openVaultAt("memory://first", "memory");
    await Promise.resolve();
    expect(await useAppStore.getState().openVaultAt("memory://second", "memory")).toBe(false);
    firstRead.reject(new Error("First denied"));
    expect(await firstOpen).toBe(false);
    expect(useAppStore.getState().vaultPath).toBe("memory://test");
    expect(useAppStore.getState().structure).toBe(original);
    log.mockRestore();
  });

});


describe("SRS 4.6: explicit working palette persistence", () => {
  const green = { font: "#102030", box: "#d0e0d0", line: "#345678", border: "#123456" };
  it("keeps colors nonsemantic, saves only with layout and restores through Last Saved and reopen", async () => {
    install();
    const store = useAppStore.getState(), before = snapshot();
    store.setNodeStyles({ GsnGoal: green });
    expect(useAppStore.getState().layoutDirty).toBe(true);
    expect(useAppStore.getState().contentDirty).toBe(false);
    expect(snapshot()).toBe(before);
    expect(useAppStore.getState().structure!.layout.display?.nodeStyles).toBeUndefined();
    await store.saveContent();
    expect(disk.has("case/_layout.json")).toBe(false);
    await store.saveLayout();
    expect(JSON.parse(disk.get("case/_layout.json")!).display.nodeStyles).toEqual({ GsnGoal: green });
    expect(useAppStore.getState().layoutDirty).toBe(false);
    store.setNodeStyles({});
    expect(useAppStore.getState().nodeStyles).toEqual({});
    store.restoreLastSaved();
    expect(useAppStore.getState().nodeStyles).toEqual({ GsnGoal: green });
    store.setNodeStyles({ GsnSolution: green });
    await store.openRoot("case");
    expect(useAppStore.getState().nodeStyles).toEqual({ GsnGoal: green });
    const { modified: _savedTimestamp, ...reopened } = useAppStore.getState().structure!.elements.get("G1")!;
    expect(reopened).toEqual(JSON.parse(before)[0]);
  });
  it("does not mark newer color edits saved when an earlier write completes", async () => {
    install();
    const store = useAppStore.getState();
    store.setNodeStyles({ GsnGoal: green });
    const writeGate = deferred<void>();
    mocks.write.mockImplementation(async () => writeGate.promise);
    const saving = store.saveLayout();
    await Promise.resolve();
    store.setNodeStyles({ GsnGoal: { ...green, box: "#ffffff" } });
    writeGate.resolve(); await saving;
    expect(useAppStore.getState().layoutDirty).toBe(true);
    expect(useAppStore.getState().nodeStyles.GsnGoal?.box).toBe("#ffffff");
    expect(useAppStore.getState().structure!.layout.display?.nodeStyles?.GsnGoal?.box).toBe(green.box);
    store.restoreLastSaved();
    expect(useAppStore.getState().nodeStyles).toEqual({ GsnGoal: green });
  });
  it("saves Reset as removal of overrides and cannot leak a previous case palette", async () => {
    install(); const store = useAppStore.getState();
    store.setNodeStyles({ GsnGoal: green }); await store.saveLayout();
    store.setNodeStyles({}); await store.saveLayout();
    expect(JSON.parse(disk.get("case/_layout.json")!).display.nodeStyles).toBeUndefined();
    store.setNodeStyles({ GsnGoal: green });
    mocks.list.mockResolvedValue([]);
    await store.openVaultAt("memory://empty", "memory");
    expect(useAppStore.getState().nodeStyles).toEqual({});
  });
});
