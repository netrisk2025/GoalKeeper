/** Pure vault loading helpers — file contents provided by caller (browser or Tauri). */

import type {
  EvidenceNote,
  Finding,
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
  wikilinkKey,
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
  const loadFindings: Finding[] = [];

  for (const f of files) {
    if (!f.path.endsWith(".md")) continue;
    const inRoot = f.path.startsWith(rootDir + "/") || f.path.startsWith("Evidence/");
    if (!inRoot) continue;
    try {
      const parsed = parseElementFile(f.path, f.text);
      if ("gkType" in parsed) {
        if (!f.path.startsWith(rootDir + "/")) continue;
        if (elements.has(parsed.gsnId)) {
          loadFindings.push({ severity: "ERROR", code: "DUP_ID", nodeId: parsed.gsnId,
            message: `Duplicate GSN ID ${parsed.gsnId} in ${elements.get(parsed.gsnId)!.filePath} and ${f.path}. The first file is shown; repair the duplicate in the vault.` });
          continue;
        }
        elements.set(parsed.gsnId, parsed);
        if (parsed.isRoot && !rootId) rootId = parsed.gsnId;
      } else {
        evidence.set(parsed.filePath, parsed);
      }
    } catch (error) {
      if (/^gk[_Tt]ype:|^gk_type:/m.test(f.text)) {
        loadFindings.push({ severity: "ERROR", code: "IMPORT_TYPE", nodeId: f.path,
          message: `${f.path}: ${error instanceof Error ? error.message : String(error)}` });
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
    loadFindings,
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
  preferredDir?: string,
): { rootDir: string; files: VaultFile[]; summary: RootGoalSummary } {
  let base = preferredDir?.trim() ? slugify(preferredDir) : slugify(name);
  if (!base) base = slugify(name) || "Root-Goal";
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

/** Resolve canonical vault paths first. Ambiguous short names never bind arbitrarily. */
export function resolveEvidence(structure: Pick<GoalStructure, "evidence" | "rootDir">, reference: string): EvidenceNote | undefined {
  const key = reference.replace(/^\[\[|\]\]$/g, "").split("|")[0].replace(/\\/g, "/").replace(/^\.\//, "").replace(/\.md$/i, "");
  const notes = [...new Map([...structure.evidence.values()].map((note) => [note.filePath, note])).values()];
  const paths = new Set([key, `${structure.rootDir}/${key}`]);
  const exact = notes.filter((note) => paths.has(note.filePath.replace(/\.md$/i, "")));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1 || key.includes("/")) return undefined;
  const matches = notes.filter((note) => note.name === key || wikilinkKey(note.filePath) === key);
  return matches.length === 1 ? matches[0] : undefined;
}
