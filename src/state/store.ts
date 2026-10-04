import { create } from "zustand";
import type {
  Finding,
  GoalStructure,
  GsnElement,
  GsnType,
  GsnNodeStyles,
  NodePosition,
  RootGoalSummary,
  ViewportState,
} from "../core/model/types";
import { parseNodeStyles } from "../core/presentation/colors";
import { emptyLayout } from "../core/model/types";
import { canLink } from "../core/rules/relationships";
import { validateStructure } from "../core/rules/validate";
import { findArgumentCycle } from "../core/graph/cycle";
import { layoutArgument } from "../core/layout/elk";
import {
  createChildElement,
  createRootGoalFiles,
  listRootGoals,
  loadGoalStructure,
} from "../core/vault/load";
import {
  mergeLastSaved,
  placeNewNode,
  toLayoutDoc,
  parseLayoutDoc,
} from "../core/layout/manager";
import { serializeElement } from "../core/markdown/parse";
import {
  captureVaultSelection,
  restoreVaultSelection,
  deleteVaultFile,
  ensureVaultMeta,
  ensureVaultReady,
  getBackend,
  initFs,
  listVaultFiles,
  openMemoryVault,
  openNamedMemoryVault,
  pickVaultDirectory,
  writeVaultFile,
} from "../lib/fs";

export type AppMode = "structure" | "evidence" | "validation" | "export";
export type Theme = "light" | "dark";

interface AppState {
  ready: boolean;
  backend: "tauri" | "memory" | "fsa";
  theme: Theme;
  vaultPath: string | null;
  roots: RootGoalSummary[];
  structure: GoalStructure | null;
  workingPositions: Record<string, NodePosition>;
  lastSavedPositions: Record<string, NodePosition>;
  viewport: ViewportState;
  nodeStyles: GsnNodeStyles;
  selectedId: string | null;
  mode: AppMode;
  contentDirty: boolean;
  layoutDirty: boolean;
  layoutBusy: boolean;
  pendingDeletions: string[];
  findings: Finding[];
  wizardOpen: boolean;
  notice: string | null;
  /** Bumps only for full progressive open-reveal */
  revealToken: number;
  /** Bumps on any graph mutation so canvas syncs without full re-reveal */
  graphEpoch: number;

  bootstrap: () => Promise<void>;
  setTheme: (t: Theme) => void;
  setNodeStyles: (styles: GsnNodeStyles) => void;
  openVault: () => Promise<void>;
  /** Open a named memory vault or FSA/tauri path already chosen */
  openVaultAt: (path: string, mode?: "tauri" | "memory" | "fsa") => Promise<boolean>;
  openNamedVault: (id: string, opts?: { empty?: boolean; demo?: boolean }) => Promise<void>;
  useDemoVault: () => Promise<void>;
  refreshRoots: () => Promise<void>;
  openRoot: (rootDir: string) => Promise<boolean>;
  createRoot: (name: string, statement: string, rootDir?: string) => Promise<boolean>;
  setMode: (m: AppMode) => void;
  selectNode: (id: string | null) => void;
  updateElement: (
    id: string,
    patch: Partial<Pick<GsnElement, "name" | "statement" | "undeveloped" | "hasEvidence">>,
  ) => void;
  /** Create + link a node; returns new gsnId or null on failure */
  addNode: (
    type: GsnType,
    rel: "SUPPORTED_BY" | "IN_CONTEXT_OF",
    opts?: { parentId?: string; name?: string; statement?: string },
  ) => string | null;
  linkExisting: (targetId: string, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
  removeLink: (sourceId: string, targetId: string, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
  deleteNode: (id: string) => void;
  autoLayout: () => Promise<void>;
  setPosition: (id: string, x: number, y: number) => void;
  saveContent: () => Promise<void>;
  saveLayout: () => Promise<void>;
  restoreLastSaved: () => void;
  revalidate: () => void;
  setWizardOpen: (open: boolean) => void;
  setNotice: (n: string | null) => void;
  setViewport: (v: ViewportState) => void;
}

const THEME_KEY = "goalkeeper.theme";
let rootLoadVersion = 0;
let vaultOpenVersion = 0;
let vaultOpenBaseline: AppState | null = null;
let layoutRequestVersion = 0;

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  backend: "memory",
  theme: (typeof localStorage !== "undefined" && (localStorage.getItem(THEME_KEY) as Theme)) || "light",
  vaultPath: null,
  roots: [],
  structure: null,
  workingPositions: {},
  lastSavedPositions: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  nodeStyles: {},
  selectedId: null,
  mode: "structure",
  contentDirty: false,
  layoutDirty: false,
  layoutBusy: false,
  pendingDeletions: [],
  findings: [],
  wizardOpen: false,
  notice: null,
  revealToken: 0,
  graphEpoch: 0,

  bootstrap: async () => {
    try {
      const backend = await initFs();
      const theme = get().theme;
      document.documentElement.setAttribute("data-theme", theme);
      set({ ready: true, backend });
    } catch (e) {
      console.error(e);
      set({ ready: true, notice: `Startup error: ${errMessage(e)}` });
    }
  },

  setNodeStyles: (styles) => {
    if (!get().structure) return;
    const nodeStyles = parseNodeStyles(styles);
    if (JSON.stringify(nodeStyles) === JSON.stringify(get().nodeStyles)) return;
    set({ nodeStyles, layoutDirty: true });
  },

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },

  openVault: async () => {
    const previousSelection = captureVaultSelection();
    try {
      await initFs();
      const picked = await pickVaultDirectory();
      if (!picked) {
        // Browser without FSA / cancel: UI should show OpenVaultDialog
        restoreVaultSelection(previousSelection);
        set({ notice: null });
        return;
      }
      const request = vaultOpenVersion + 1;
      if (!(await get().openVaultAt(picked.path, picked.mode)) && request === vaultOpenVersion) restoreVaultSelection(previousSelection);
    } catch (e) {
      restoreVaultSelection(previousSelection);
      console.error(e);
      set({ notice: `Open vault failed: ${errMessage(e)}` });
    }
  },

  openVaultAt: async (path, mode) => {
    const request = ++vaultOpenVersion;
    ++rootLoadVersion;
    const previous = vaultOpenBaseline ?? get();
    vaultOpenBaseline = previous;
    try {
      set({ backend: mode ?? getBackend(), vaultPath: path });
      await ensureVaultMeta();
      if (request !== vaultOpenVersion) return false;
      const roots = listRootGoals(await listVaultFiles());
      if (request !== vaultOpenVersion) return false;
      set({ roots });
      if (roots.length === 0) {
        set({
          structure: null, workingPositions: {}, lastSavedPositions: {}, nodeStyles: {}, pendingDeletions: [], contentDirty: false, layoutDirty: false, findings: [], selectedId: null,
          notice: "Vault opened. No Root Goals found — create one to begin.",
        });
        vaultOpenBaseline = null;
        return true;
      }
      const opened = await get().openRoot(roots[0].rootDir);
      if (request !== vaultOpenVersion) return false;
      if (!opened) throw new Error(get().notice ?? "Could not load the selected case.");
      set({ notice: `Opened vault with ${roots.length} Root Goal(s).` });
      vaultOpenBaseline = null;
      return true;
    } catch (e) {
      if (request !== vaultOpenVersion) return false;
      vaultOpenBaseline = null;
      console.error(e);
      set({ backend: previous.backend, vaultPath: previous.vaultPath, roots: previous.roots,
        structure: previous.structure, workingPositions: previous.workingPositions,
        lastSavedPositions: previous.lastSavedPositions, viewport: previous.viewport, nodeStyles: previous.nodeStyles,
        selectedId: previous.selectedId, contentDirty: previous.contentDirty,
        layoutDirty: previous.layoutDirty, pendingDeletions: previous.pendingDeletions,
        findings: previous.findings, notice: `Open vault failed: ${errMessage(e)}` });
      return false;
    }
  },

  openNamedVault: async (id, opts) => {
    const previousSelection = captureVaultSelection();
    const request = vaultOpenVersion + 1;
    try {
      const path = openNamedMemoryVault(id, opts);
      if (!(await get().openVaultAt(path, "memory"))) {
        if (request === vaultOpenVersion) restoreVaultSelection(previousSelection);
        return;
      }
      if (request === vaultOpenVersion) set({ notice: get().structure ? `Opened vault “${id}”.` : `Vault “${id}” ready — create a Root Goal.` });
    } catch (e) {
      if (request < vaultOpenVersion) return;
      restoreVaultSelection(previousSelection);
      set({ notice: `Open vault failed: ${errMessage(e)}` });
    }
  },

  useDemoVault: async () => {
    const previousSelection = captureVaultSelection();
    const request = vaultOpenVersion + 1;
    try {
      const path = await openMemoryVault(true);
      if (request <= vaultOpenVersion) return;
      if (!(await get().openVaultAt(path, "memory"))) {
        if (request === vaultOpenVersion) restoreVaultSelection(previousSelection);
        return;
      }
      if (request === vaultOpenVersion) set({ notice: "Demo vault loaded — Safe-System sample argument." });
    } catch (e) {
      if (request < vaultOpenVersion) return;
      restoreVaultSelection(previousSelection);
      set({ notice: `Demo vault failed: ${errMessage(e)}` });
    }
  },

  refreshRoots: async () => {
    const files = await listVaultFiles();
    const roots = listRootGoals(files);
    set({ roots });
  },

  openRoot: async (rootDir) => {
    const request = ++rootLoadVersion;
    const vaultPath = get().vaultPath;
    try {
      const files = await listVaultFiles();
      const layoutFile = files.find((f) => f.path === `${rootDir}/_layout.json`);
      if (request !== rootLoadVersion || vaultPath !== get().vaultPath) return false;
      const structure = loadGoalStructure(rootDir, files, layoutFile?.text);
      // Invalid imported cases remain inspectable, with their validation diagnostics.
      if (!structure.elements.size) {
        set({ notice: `No supported GSN elements found in ${rootDir}.` });
        return false;
      }
      let diskLayout = emptyLayout(structure.rootId);
      if (layoutFile?.text) {
        try {
          const p = parseLayoutDoc(JSON.parse(layoutFile.text));
          if (p && p.rootGsnId === structure.rootId) diskLayout = p;
        } catch {
          /* ignore */
        }
      }
      const merged = mergeLastSaved(
        { ...structure, layout: diskLayout },
        Object.keys(diskLayout.nodes).length ? diskLayout : null,
      );
      if (!Object.keys(diskLayout.nodes).length) {
        merged.positions = await layoutArgument(structure);
        if (request !== rootLoadVersion || vaultPath !== get().vaultPath) return false;
      }
      structure.layout = { ...diskLayout, rootGsnId: structure.rootId, nodes: merged.positions };
      set({
        structure,
        workingPositions: { ...merged.positions },
        lastSavedPositions: { ...diskLayout.nodes },
        viewport: structure.layout.viewport,
        nodeStyles: parseNodeStyles(structure.layout.display?.nodeStyles),
        selectedId: structure.rootId || structure.elements.keys().next().value || null,
        contentDirty: false,
        layoutDirty: merged.newlyPlaced.length > 0 || merged.staleDropped.length > 0,
        layoutBusy: false,
        pendingDeletions: [],
        findings: validateStructure(structure),
        revealToken: get().revealToken + 1,
        graphEpoch: get().graphEpoch + 1,
        mode: "structure",
      });
      return true;
    } catch (e) {
      if (request !== rootLoadVersion || vaultPath !== get().vaultPath) return false;
      console.error(e);
      set({ notice: `Open Root Goal failed: ${errMessage(e)}` });
      return false;
    }
  },

  createRoot: async (name, statement, preferredDir) => {
    try {
      await ensureVaultReady();
      await ensureVaultMeta();
      const files = await listVaultFiles();
      const dirs = [
        ...new Set(
          files
            .map((f) => f.path.split("/")[0])
            .filter((d) => d && d !== "Evidence" && d !== ".goalkeeper"),
        ),
      ];
      const created = createRootGoalFiles(name, statement, dirs, preferredDir);
      for (const f of created.files) {
        await writeVaultFile(f.path, f.text);
      }
      const path = (await ensureVaultReady()) || "memory://vault";
      set({ vaultPath: get().vaultPath ?? path, backend: getBackend() });
      await get().refreshRoots();
      if (!(await get().openRoot(created.rootDir))) return false;
      set({
        notice: `Created Root Goal “${name}” in directory ${created.rootDir}/.`,
      });
      return true;
    } catch (e) {
      console.error(e);
      set({ notice: `Create Root Goal failed: ${errMessage(e)}` });
      return false;
    }
  },

  setMode: (m) => set({ mode: m }),
  selectNode: (id) => set({ selectedId: id }),

  updateElement: (id, patch) => {
    const structure = get().structure;
    if (!structure) return;
    const el = structure.elements.get(id);
    if (!el) return;
    if (patch.undeveloped !== undefined && el.gkType !== "GsnGoal" && el.gkType !== "GsnStrategy") {
      set({ notice: "Only Goals and Strategies may be marked undeveloped." });
      return;
    }
    if (patch.hasEvidence !== undefined && el.gkType !== "GsnSolution") {
      set({ notice: "Evidence references belong on a Solution." });
      return;
    }
    const next = {
      ...el,
      ...patch,
      modified: new Date().toISOString(),
    };
    const elements = new Map(structure.elements);
    elements.set(id, next);
    const ns = { ...structure, elements };
    set({
      structure: ns,
      contentDirty: true,
      findings: validateStructure(ns),
      graphEpoch: get().graphEpoch + 1,
    });
  },

  addNode: (type, rel, opts) => {
    const { structure, selectedId, workingPositions } = get();
    if (!structure) {
      set({ notice: "Open or create a Root Goal first." });
      return null;
    }
    const parentId = opts?.parentId ?? selectedId ?? structure.rootId;
    const parent = structure.elements.get(parentId);
    if (!parent) {
      set({ notice: "Parent node not found." });
      return null;
    }
    if (!canLink(parent.gkType, type, rel)) {
      set({ notice: `Cannot link ${parent.gkType} → ${type} via ${rel}. Select a Goal or Strategy.` });
      return null;
    }
    const child = createChildElement(structure, type, parentId, rel, opts?.name);
    if (opts?.statement != null) {
      child.statement = opts.statement;
    }
    if (opts?.name) child.name = opts.name;
    const elements = new Map(structure.elements);
    elements.set(child.gsnId, child);
    const p2 = { ...parent, modified: new Date().toISOString() };
    if (rel === "SUPPORTED_BY") { p2.supportedBy = [...p2.supportedBy, child.gsnId]; p2.undeveloped = false; }
    else p2.inContextOf = [...p2.inContextOf, child.gsnId];
    elements.set(p2.gsnId, p2);
    const ns = { ...structure, elements };
    const pos = placeNewNode(ns, workingPositions, child.gsnId, parentId, rel);
    set({
      structure: ns,
      workingPositions: { ...workingPositions, [child.gsnId]: pos },
      selectedId: child.gsnId,
      pendingDeletions: get().pendingDeletions.filter((path) => path !== child.filePath),
      contentDirty: true,
      layoutDirty: true,
      findings: validateStructure(ns),
      graphEpoch: get().graphEpoch + 1,
      mode: "structure",
    });
    return child.gsnId;
  },

  linkExisting: (targetId, rel) => {
    const { structure, selectedId } = get();
    if (!structure || !selectedId) return;
    const parent = structure.elements.get(selectedId);
    const target = structure.elements.get(targetId);
    if (!parent || !target) return;
    if (!canLink(parent.gkType, target.gkType, rel)) {
      set({ notice: `Illegal ${rel} link.` });
      return;
    }
    const list = rel === "SUPPORTED_BY" ? parent.supportedBy : parent.inContextOf;
    if (list.includes(targetId)) {
      set({ notice: "Link already exists." });
      return;
    }
    const p2 = { ...parent, modified: new Date().toISOString() };
    if (rel === "SUPPORTED_BY") { p2.supportedBy = [...p2.supportedBy, targetId]; p2.undeveloped = false; }
    else p2.inContextOf = [...p2.inContextOf, targetId];
    const elements = new Map(structure.elements);
    elements.set(p2.gsnId, p2);
    const ns = { ...structure, elements };
    if (targetId === structure.rootId || findArgumentCycle(elements)) {
      set({ notice: "Link rejected: a root cannot have incoming support and GSN relationships must remain acyclic." });
      return;
    }
    set({
      structure: ns,
      contentDirty: true,
      findings: validateStructure(ns),
      graphEpoch: get().graphEpoch + 1,
    });
  },

  removeLink: (sourceId, targetId, rel) => {
    const { structure } = get();
    if (!structure) return;
    const parent = structure.elements.get(sourceId);
    if (!parent) return;
    const p2 = { ...parent, modified: new Date().toISOString() };
    if (rel === "SUPPORTED_BY") {
      p2.supportedBy = p2.supportedBy.filter((id) => id !== targetId);
      if (!p2.supportedBy.length) p2.undeveloped = true;
    }
    else p2.inContextOf = p2.inContextOf.filter((id) => id !== targetId);
    const elements = new Map(structure.elements);
    elements.set(p2.gsnId, p2);
    const ns = { ...structure, elements };
    set({
      structure: ns,
      contentDirty: true,
      findings: validateStructure(ns),
      graphEpoch: get().graphEpoch + 1,
    });
  },

  deleteNode: (id) => {
    const { structure, workingPositions, pendingDeletions } = get();
    if (!structure) return;
    if (id === structure.rootId) { set({ notice: "The Root Goal cannot be deleted from this case." }); return; }
    const element = structure.elements.get(id);
    if (!element) return;
    const elements = new Map(structure.elements);
    elements.delete(id);
    for (const [key, node] of elements) {
      if (!node.supportedBy.includes(id) && !node.inContextOf.includes(id)) continue;
      const supportedBy = node.supportedBy.filter((target) => target !== id);
      elements.set(key, { ...node, supportedBy,
        inContextOf: node.inContextOf.filter((target) => target !== id),
        undeveloped: (node.gkType === "GsnGoal" || node.gkType === "GsnStrategy") && node.supportedBy.includes(id) && !supportedBy.length ? true : node.undeveloped,
        modified: new Date().toISOString(),
      });
    }
    const ns = { ...structure, elements };
    const positions = { ...workingPositions };
    delete positions[id];
    set({ structure: ns, workingPositions: positions, selectedId: structure.rootId,
      pendingDeletions: [...new Set([...pendingDeletions, element.filePath])],
      contentDirty: true, layoutDirty: true, findings: validateStructure(ns),
      graphEpoch: get().graphEpoch + 1,
      notice: `Removed ${id}. Save content to delete its note. Review any orphan findings.`,
    });
  },

  autoLayout: async () => {
    const { structure, workingPositions, viewport, vaultPath } = get();
    if (!structure) return;
    const request = ++layoutRequestVersion;
    set({ layoutBusy: true });
    try {
      const positions = await layoutArgument(structure);
      const current = get();
      if (request !== layoutRequestVersion) return;
      if (current.structure !== structure || current.workingPositions !== workingPositions || current.viewport !== viewport || current.vaultPath !== vaultPath) {
        set({ layoutBusy: false, notice: "Arrangement discarded because the case or its layout changed. Arrange again when ready." });
        return;
      }
      set({ workingPositions: positions, layoutBusy: false, layoutDirty: true,
        graphEpoch: current.graphEpoch + 1, notice: "Argument arranged. Save Layout to retain this arrangement." });
    } catch (error) {
      if (request === layoutRequestVersion) set({ layoutBusy: false, notice: `Arrange failed: ${errMessage(error)}` });
    }
  },

  setPosition: (id, x, y) => {
    const state = get();
    if (!state.structure?.elements.has(id) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (state.workingPositions[id]?.x === x && state.workingPositions[id]?.y === y) return;
    set({ workingPositions: { ...state.workingPositions, [id]: { x, y } }, layoutDirty: true });
  },

  saveContent: async () => {
    const { structure, pendingDeletions, vaultPath } = get();
    if (!structure) return;
    try {
      await ensureVaultReady();
      for (const element of structure.elements.values()) {
        if (get().vaultPath !== vaultPath) throw new Error("Vault changed during save; remaining writes were cancelled.");
        if (!element.filePath.startsWith(structure.rootDir + "/")) continue;
        await writeVaultFile(element.filePath, serializeElement(element));
      }
      for (const path of pendingDeletions) {
        if (get().vaultPath !== vaultPath) throw new Error("Vault changed during save; remaining deletions were cancelled.");
        await deleteVaultFile(path);
      }
      const current = get();
      if (current.vaultPath !== vaultPath || current.structure?.rootDir !== structure.rootDir) return;
      const unchanged = current.structure === structure;
      set({ contentDirty: !unchanged,
        pendingDeletions: current.pendingDeletions.filter((path) => !pendingDeletions.includes(path)),
        notice: unchanged ? "Content saved." : "Saved the earlier content revision. Newer edits remain unsaved." });
    } catch (error) {
      set({ contentDirty: true, notice: `Save failed: ${errMessage(error)}` });
    }
  },

  saveLayout: async () => {
    const { structure, workingPositions, viewport, nodeStyles, vaultPath } = get();
    if (!structure) return;
    try {
      await ensureVaultReady();
      if (get().vaultPath !== vaultPath) throw new Error("Vault changed during layout save.");
      const doc = toLayoutDoc(structure.rootId, workingPositions, viewport, { ...structure.layout.display, nodeStyles });
      await writeVaultFile(`${structure.rootDir}/_layout.json`, JSON.stringify(doc, null, 2));
      const current = get();
      if (current.vaultPath !== vaultPath || current.structure?.rootDir !== structure.rootDir) return;
      const unchanged = current.workingPositions === workingPositions && current.viewport === viewport && current.nodeStyles === nodeStyles;
      set({ lastSavedPositions: { ...workingPositions }, layoutDirty: !unchanged,
        structure: { ...current.structure, layout: doc },
        notice: unchanged ? "Layout saved." : "Saved the earlier layout. Newer layout changes remain unsaved." });
    } catch (error) {
      set({ layoutDirty: true, notice: `Save layout failed: ${errMessage(error)}` });
    }
  },

  restoreLastSaved: () => {
    const { structure, lastSavedPositions } = get();
    if (!structure) return;
    const diskLayout = {
      ...emptyLayout(structure.rootId),
      nodes: { ...lastSavedPositions },
    };
    const merged = mergeLastSaved(structure, diskLayout);
    set({
      workingPositions: merged.positions,
      viewport: { ...structure.layout.viewport },
      nodeStyles: parseNodeStyles(structure.layout.display?.nodeStyles),
      layoutDirty: merged.newlyPlaced.length > 0,
      revealToken: get().revealToken + 1,
      graphEpoch: get().graphEpoch + 1,
      notice:
        merged.newlyPlaced.length > 0
          ? `Restored last saved layout; ${merged.newlyPlaced.length} new node(s) placed by Layout Manager.`
          : "Restored last saved layout.",
    });
  },

  revalidate: () => {
    const { structure } = get();
    if (!structure) return;
    set({ findings: validateStructure(structure) });
  },

  setWizardOpen: (open) => set({ wizardOpen: open }),
  setNotice: (n) => set({ notice: n }),
  setViewport: (v) => {
    if (![v.x, v.y, v.zoom].every(Number.isFinite) || v.zoom <= 0) return;
    const current = get().viewport;
    if (current.x === v.x && current.y === v.y && current.zoom === v.zoom && current.focusId === v.focusId) return;
    set({ viewport: { ...v }, layoutDirty: true });
  },
}));
