/** Pure vault loading helpers — file contents provided by caller (browser or Tauri). */

import type {
  EvidenceNote,
  GoalStructure,
  GsnElement,
  GsnType,
  LayoutDoc,
  RootGoalSummary,
} from "../model/types";
import { emptyLayout } from "../model/types";
import {
  allocateGsnId,
  parseElementFile,
  serializeElement,
  slugify,
} from "../markdown/parse";
import { mergeLastSaved, parseLayoutDoc } from "../layout/manager";

export interface VaultFile {
  /** Vault-relative path using `/` */
  path: string;
  text: string;
}

export function listRootGoals(files: VaultFile[]): RootGoalSummary[] {
  const byDir = new Map<string, VaultFile[]>();
  for (const f of files) {
    if (!f.path.endsWith(".md")) continue;
    if (f.path.startsWith(".goalkeeper/") || f.path.startsWith(".obsidian/")) continue;
    const parts = f.path.split("/");
    if (parts.length < 2) continue;
    const dir = parts[0];
    if (dir === "Evidence") continue;
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(f);
  }

  const roots: RootGoalSummary[] = [];
  for (const [dir, mds] of byDir) {
    for (const f of mds) {
      try {
        const parsed = parseElementFile(f.path, f.text);
        if ("gkType" in parsed && parsed.isRoot) {
          roots.push({
            rootDir: dir,
            rootGsnId: parsed.gsnId,
            name: parsed.name,
            statement: parsed.statement,
            filePath: f.path,
          });
          break;
        }
      } catch {
        // skip unreadable
      }
    }
  }
  return roots.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadGoalStructure(
  rootDir: string,
  files: VaultFile[],
  layoutText?: string | null,
): GoalStructure {
  const elements = new Map<string, GsnElement>();
  const evidence = new Map<string, EvidenceNote>();
  let rootId = "";

  for (const f of files) {
    if (!f.path.endsWith(".md")) continue;
    const inRoot = f.path.startsWith(rootDir + "/") || f.path.startsWith("Evidence/");
    if (!inRoot) continue;
    try {
      const parsed = parseElementFile(f.path, f.text);
      if ("gkType" in parsed) {
        elements.set(parsed.gsnId, parsed);
        if (parsed.isRoot) rootId = parsed.gsnId;
      } else {
        evidence.set(parsed.name, parsed);
        const base = f.path.split("/").pop()?.replace(/\.md$/i, "") ?? parsed.name;
        evidence.set(base, parsed);
      }
    } catch {
      // skip
    }
  }

  if (!rootId) {
    for (const el of elements.values()) {
      if (el.gkType === "GsnGoal" && el.filePath.startsWith(rootDir + "/")) {
        rootId = el.gsnId;
        el.isRoot = true;
        break;
      }
    }
  }

  let layout: LayoutDoc = emptyLayout(rootId);
  if (layoutText) {
    try {
      const raw = JSON.parse(layoutText) as unknown;
      const parsed = parseLayoutDoc(raw);
      if (parsed) layout = parsed;
    } catch {
      // keep empty
    }
  }

  const structure: GoalStructure = {
    rootId,
    rootDir,
    elements,
    evidence,
    layout,
  };

  const merged = mergeLastSaved(structure, layout);
  structure.layout = {
    ...layout,
    rootGsnId: rootId,
    nodes: merged.positions,
  };

  return structure;
}

export function createRootGoalFiles(
  name: string,
  statement: string,
  existingDirs: string[],
): { rootDir: string; files: VaultFile[]; summary: RootGoalSummary } {
  let base = slugify(name);
  let rootDir = base;
  let n = 2;
  while (existingDirs.includes(rootDir)) {
    rootDir = `${base}-${n++}`;
  }
  const gsnId = "G1";
  const now = new Date().toISOString();
  const el: GsnElement = {
    filePath: `${rootDir}/${gsnId}.md`,
    gkType: "GsnGoal",
    gsnId,
    name,
    statement: statement || `The evidence supports that ${name} is achieved acceptably.`,
    isRoot: true,
    undeveloped: true,
    supportedBy: [],
    inContextOf: [],
    hasEvidence: [],
    created: now,
    modified: now,
  };
  const text = serializeElement(el);
  return {
    rootDir,
    files: [{ path: el.filePath, text }],
    summary: {
      rootDir,
      rootGsnId: gsnId,
      name,
      statement: el.statement,
      filePath: el.filePath,
    },
  };
}

export function createChildElement(
  structure: GoalStructure,
  type: GsnType,
  _parentId: string,
  _rel: "SUPPORTED_BY" | "IN_CONTEXT_OF",
  name?: string,
): GsnElement {
  const gsnId = allocateGsnId(type, [...structure.elements.keys()]);
  const now = new Date().toISOString();
  const display = name ?? `New ${type.replace("Gsn", "")}`;
  return {
    filePath: `${structure.rootDir}/${gsnId}.md`,
    gkType: type,
    gsnId,
    name: display,
    statement: "",
    isRoot: false,
    undeveloped: type === "GsnGoal" || type === "GsnStrategy",
    supportedBy: [],
    inContextOf: [],
    hasEvidence: [],
    created: now,
    modified: now,
  };
}
