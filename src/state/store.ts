import { create } from "zustand";
import type {
  Finding,
  GoalStructure,
  GsnElement,
  GsnType,
  NodePosition,
  RootGoalSummary,
  ViewportState,
} from "../core/model/types";
import { emptyLayout } from "../core/model/types";
import { canLink } from "../core/rules/relationships";
import { validateStructure } from "../core/rules/validate";
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
  ensureVaultMeta,
  ensureVaultReady,
  getBackend,
  initFs,
  listVaultFiles,
  openMemoryVault,
  pickVaultDirectory,
  writeVaultFile,
} from "../lib/fs";

export type AppMode = "structure" | "evidence" | "validation" | "export";
export type Theme = "light" | "dark";

interface AppState {
  ready: boolean;
  backend: "tauri" | "memory";
  theme: Theme;
  vaultPath: string | null;
  roots: RootGoalSummary[];
  structure: GoalStructure | null;
  workingPositions: Record<string, NodePosition>;
  lastSavedPositions: Record<string, NodePosition>;
  viewport: ViewportState;
  selectedId: string | null;
  mode: AppMode;
  contentDirty: boolean;
  layoutDirty: boolean;
  findings: Finding[];
  wizardOpen: boolean;
  notice: string | null;
  /** Bumps only for full progressive open-reveal */
  revealToken: number;
  /** Bumps on any graph mutation so canvas syncs without full re-reveal */
  graphEpoch: number;

  bootstrap: () => Promise<void>;
  setTheme: (t: Theme) => void;
  openVault: () => Promise<void>;
  useDemoVault: () => Promise<void>;
  refreshRoots: () => Promise<void>;
  openRoot: (rootDir: string) => Promise<void>;
  createRoot: (name: string, statement: string) => Promise<boolean>;
  setMode: (m: AppMode) => void;
  selectNode: (id: string | null) => void;
  updateElement: (
    id: string,
    patch: Partial<Pick<GsnElement, "name" | "statement" | "undeveloped">>,
  ) => void;
  /** Create + link a node; returns new gsnId or null on failure */
  addNode: (
    type: GsnType,
    rel: "SUPPORTED_BY" | "IN_CONTEXT_OF",
    opts?: { parentId?: string; name?: string; statement?: string },
  ) => string | null;
  linkExisting: (targetId: string, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
  removeLink: (sourceId: string, targetId: string, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
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
  selectedId: null,
  mode: "structure",
  contentDirty: false,
  layoutDirty: false,
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

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },

  openVault: async () => {
    try {
      await initFs();
      const { path, mode } = await pickVaultDirectory();
      if (!path) {
        set({ notice: "Vault selection cancelled." });
        return;
      }
      set({ backend: mode, vaultPath: path });
      await ensureVaultMeta();
      await get().refreshRoots();
      const roots = get().roots;
      if (roots.length === 0) {
        set({
          structure: null,
          notice:
            mode === "memory"
              ? "In-memory vault ready (browser). Create a Root Goal or use Demo vault for sample data."
              : "Vault opened. No Root Goals found — create one to begin.",
        });
        return;
      }
      // Auto-open first root so the canvas is immediately usable
      await get().openRoot(roots[0].rootDir);
      set({
        notice:
          mode === "memory"
            ? "Opened in-memory vault (native folder pick requires desktop app)."
            : `Opened vault with ${roots.length} Root Goal(s).`,
      });
    } catch (e) {
      console.error(e);
      set({ notice: `Open vault failed: ${errMessage(e)}` });
    }
  },

  useDemoVault: async () => {
    try {
      await initFs();
      const path = await openMemoryVault(true);
      set({ vaultPath: path, backend: "memory" });
      await get().refreshRoots();
      const roots = get().roots;
      if (!roots[0]) {
        set({ notice: "Demo vault failed to load sample Root Goal." });
        return;
      }
      await get().openRoot(roots[0].rootDir);
      set({ notice: "Demo vault loaded — Safe-System sample argument." });
    } catch (e) {
      console.error(e);
      set({ notice: `Demo vault failed: ${errMessage(e)}` });
    }
  },

  refreshRoots: async () => {
    const files = await listVaultFiles();
    const roots = listRootGoals(files);
    set({ roots });
  },

  openRoot: async (rootDir) => {
    try {
      const files = await listVaultFiles();
      const layoutFile = files.find((f) => f.path === `${rootDir}/_layout.json`);
      const structure = loadGoalStructure(rootDir, files, layoutFile?.text);
      if (!structure.rootId) {
        set({ notice: `No Root Goal found in ${rootDir}.` });
        return;
      }
      let diskLayout = emptyLayout(structure.rootId);
      if (layoutFile?.text) {
        try {
          const p = parseLayoutDoc(JSON.parse(layoutFile.text));
          if (p) diskLayout = p;
        } catch {
          /* ignore */
        }
      }
      const merged = mergeLastSaved(
        { ...structure, layout: diskLayout },
        Object.keys(diskLayout.nodes).length ? diskLayout : null,
      );
      structure.layout = {
        ...diskLayout,
        rootGsnId: structure.rootId,
        nodes: merged.positions,
      };
      set({
        structure,
        workingPositions: { ...merged.positions },
        lastSavedPositions: { ...diskLayout.nodes },
        viewport: structure.layout.viewport,
        selectedId: structure.rootId,
        contentDirty: false,
        layoutDirty: merged.newlyPlaced.length > 0 && Object.keys(diskLayout.nodes).length > 0,
        findings: validateStructure(structure),
        revealToken: get().revealToken + 1,
        graphEpoch: get().graphEpoch + 1,
        mode: "structure",
      });
    } catch (e) {
      console.error(e);
      set({ notice: `Open Root Goal failed: ${errMessage(e)}` });
    }
  },

  createRoot: async (name, statement) => {
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
      const created = createRootGoalFiles(name, statement, dirs);
      for (const f of created.files) {
        await writeVaultFile(f.path, f.text);
      }
      // Ensure vaultPath is set in UI state
      const path = (await ensureVaultReady()) || "memory://demo-vault";
      set({ vaultPath: get().vaultPath ?? path, backend: getBackend() });
      await get().refreshRoots();
      await get().openRoot(created.rootDir);
      set({ notice: `Created Root Goal “${name}”.` });
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
      // Walk up: try root if parent cannot host this link
      const root = structure.elements.get(structure.rootId);
      if (root && canLink(root.gkType, type, rel) && parentId !== structure.rootId) {
        return get().addNode(type, rel, { ...opts, parentId: structure.rootId });
      }
      set({ notice: `Cannot link ${parent.gkType} → ${type} via ${rel}. Select a Goal or Strategy.` });
      return null;
    }
    const child = createChildElement(structure, type, parentId, rel, opts?.name);
    if (opts?.statement != null) {
      child.statement = opts.statement;
      child.undeveloped = false;
    }
    if (opts?.name) child.name = opts.name;
    const elements = new Map(structure.elements);
    elements.set(child.gsnId, child);
    const p2 = { ...parent, modified: new Date().toISOString() };
    if (rel === "SUPPORTED_BY") p2.supportedBy = [...p2.supportedBy, child.gsnId];
    else p2.inContextOf = [...p2.inContextOf, child.gsnId];
    elements.set(p2.gsnId, p2);
    const ns = { ...structure, elements };
    const pos = placeNewNode(ns, workingPositions, child.gsnId, parentId, rel);
    set({
      structure: ns,
      workingPositions: { ...workingPositions, [child.gsnId]: pos },
      selectedId: child.gsnId,
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
    if (rel === "SUPPORTED_BY") p2.supportedBy = [...p2.supportedBy, targetId];
    else p2.inContextOf = [...p2.inContextOf, targetId];
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

  removeLink: (sourceId, targetId, rel) => {
    const { structure } = get();
    if (!structure) return;
    const parent = structure.elements.get(sourceId);
    if (!parent) return;
    const p2 = { ...parent, modified: new Date().toISOString() };
    if (rel === "SUPPORTED_BY") p2.supportedBy = p2.supportedBy.filter((id) => id !== targetId);
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

  setPosition: (id, x, y) => {
    set({
      workingPositions: { ...get().workingPositions, [id]: { x, y } },
      layoutDirty: true,
    });
  },

  saveContent: async () => {
    try {
      const { structure } = get();
      if (!structure) return;
      await ensureVaultReady();
      for (const el of structure.elements.values()) {
        if (!el.filePath.startsWith(structure.rootDir + "/")) continue;
        await writeVaultFile(el.filePath, serializeElement(el));
      }
      set({ contentDirty: false, notice: "Content saved." });
    } catch (e) {
      set({ notice: `Save failed: ${errMessage(e)}` });
    }
  },

  saveLayout: async () => {
    try {
      const { structure, workingPositions, viewport } = get();
      if (!structure) return;
      await ensureVaultReady();
      const doc = toLayoutDoc(structure.rootId, workingPositions, viewport);
      await writeVaultFile(`${structure.rootDir}/_layout.json`, JSON.stringify(doc, null, 2));
      set({
        lastSavedPositions: { ...workingPositions },
        layoutDirty: false,
        structure: { ...structure, layout: doc },
        notice: "Layout saved.",
      });
    } catch (e) {
      set({ notice: `Save layout failed: ${errMessage(e)}` });
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
  setViewport: (v) => set({ viewport: v, layoutDirty: true }),
}));
