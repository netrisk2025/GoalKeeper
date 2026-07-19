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
  getBackend,
  getVaultRoot,
  initFs,
  listVaultFiles,
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
  revealToken: number;

  bootstrap: () => Promise<void>;
  setTheme: (t: Theme) => void;
  openVault: () => Promise<void>;
  useDemoVault: () => Promise<void>;
  refreshRoots: () => Promise<void>;
  openRoot: (rootDir: string) => Promise<void>;
  createRoot: (name: string, statement: string) => Promise<void>;
  setMode: (m: AppMode) => void;
  selectNode: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<Pick<GsnElement, "name" | "statement" | "undeveloped">>) => void;
  addNode: (type: GsnType, rel: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  backend: "memory",
  theme: (localStorage.getItem(THEME_KEY) as Theme) || "light",
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

  bootstrap: async () => {
    const backend = await initFs();
    const theme = get().theme;
    document.documentElement.setAttribute("data-theme", theme);
    set({ ready: true, backend });
  },

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },

  openVault: async () => {
    const path = await pickVaultDirectory();
    if (!path) return;
    await ensureVaultMeta();
    set({ vaultPath: path });
    await get().refreshRoots();
  },

  useDemoVault: async () => {
    await initFs();
    const path = getVaultRoot() ?? "memory://demo-vault";
    set({ vaultPath: path, backend: getBackend() });
    await get().refreshRoots();
    const roots = get().roots;
    if (roots[0]) await get().openRoot(roots[0].rootDir);
  },

  refreshRoots: async () => {
    const files = await listVaultFiles();
    const roots = listRootGoals(files);
    set({ roots });
  },

  openRoot: async (rootDir) => {
    const files = await listVaultFiles();
    const layoutFile = files.find((f) => f.path === `${rootDir}/_layout.json`);
    const structure = loadGoalStructure(rootDir, files, layoutFile?.text);
    // Re-merge against file-only last saved (without already-filled positions)
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
      diskLayout.nodes && Object.keys(diskLayout.nodes).length ? diskLayout : null,
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
      notice:
        merged.staleDropped.length > 0
          ? `Ignored ${merged.staleDropped.length} stale layout position(s).`
          : null,
    });
  },

  createRoot: async (name, statement) => {
    const files = await listVaultFiles();
    const dirs = [...new Set(files.map((f) => f.path.split("/")[0]))];
    const created = createRootGoalFiles(name, statement, dirs);
    for (const f of created.files) {
      await writeVaultFile(f.path, f.text);
    }
    await ensureVaultMeta();
    await get().refreshRoots();
    await get().openRoot(created.rootDir);
    set({ notice: `Created Root Goal “${name}”.` });
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
    });
  },

  addNode: (type, rel) => {
    const { structure, selectedId, workingPositions } = get();
    if (!structure || !selectedId) {
      set({ notice: "Select a parent node first." });
      return;
    }
    const parent = structure.elements.get(selectedId);
    if (!parent) return;
    if (!canLink(parent.gkType, type, rel)) {
      set({ notice: `Cannot link ${parent.gkType} to ${type} via ${rel}.` });
      return;
    }
    const child = createChildElement(structure, type, selectedId, rel);
    const elements = new Map(structure.elements);
    elements.set(child.gsnId, child);
    const p2 = { ...parent };
    if (rel === "SUPPORTED_BY") p2.supportedBy = [...p2.supportedBy, child.gsnId];
    else p2.inContextOf = [...p2.inContextOf, child.gsnId];
    p2.modified = new Date().toISOString();
    elements.set(p2.gsnId, p2);
    const ns = { ...structure, elements };
    const pos = placeNewNode(ns, workingPositions, child.gsnId, selectedId, rel);
    set({
      structure: ns,
      workingPositions: { ...workingPositions, [child.gsnId]: pos },
      selectedId: child.gsnId,
      contentDirty: true,
      layoutDirty: true,
      findings: validateStructure(ns),
    });
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
    set({ structure: ns, contentDirty: true, findings: validateStructure(ns) });
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
    set({ structure: ns, contentDirty: true, findings: validateStructure(ns) });
  },

  setPosition: (id, x, y) => {
    set({
      workingPositions: { ...get().workingPositions, [id]: { x, y } },
      layoutDirty: true,
    });
  },

  saveContent: async () => {
    const { structure } = get();
    if (!structure) return;
    for (const el of structure.elements.values()) {
      if (!el.filePath.startsWith(structure.rootDir + "/")) continue;
      await writeVaultFile(el.filePath, serializeElement(el));
    }
    set({ contentDirty: false, notice: "Content saved." });
  },

  saveLayout: async () => {
    const { structure, workingPositions, viewport } = get();
    if (!structure) return;
    const doc = toLayoutDoc(structure.rootId, workingPositions, viewport);
    await writeVaultFile(`${structure.rootDir}/_layout.json`, JSON.stringify(doc, null, 2));
    set({
      lastSavedPositions: { ...workingPositions },
      layoutDirty: false,
      structure: { ...structure, layout: doc },
      notice: "Layout saved.",
    });
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
