/** Layout Manager + last-saved merge (Architecture §4.5, SRS FR-68–FR-77). */

import type { GoalStructure, LayoutDoc, NodePosition, ViewportState } from "../model/types";
import { emptyLayout } from "../model/types";
import { supportTiers } from "../graph/reachability";
import { glyphFor } from "../presentation/geometry";

/** Incremental placement preserves existing centres and respects the rendered glyphs. */
function nodeSize(structure: GoalStructure, id: string): { width: number; height: number } {
  const element = structure.elements.get(id);
  if (!element) return { width: 312, height: 160 };
  const glyph = glyphFor(element);
  return { width: glyph.width, height: glyph.height + (element.undeveloped ? 24 : 0) };
}

export function placeNewNode(
  structure: GoalStructure,
  working: Record<string, NodePosition>,
  newId: string,
  parentId?: string,
  relType?: "SUPPORTED_BY" | "IN_CONTEXT_OF",
): NodePosition {
  if (working[newId]) return working[newId];
  const size = nodeSize(structure, newId);
  if (parentId && working[parentId]) {
    const parent = working[parentId], parentSize = nodeSize(structure, parentId);
    if (relType === "IN_CONTEXT_OF") {
      return nudge(structure, working, newId, { x: parent.x + (parentSize.width + size.width) / 2 + 90, y: parent.y });
    }
    const siblingCount = structure.elements.get(parentId)?.supportedBy.filter(id => working[id]).length ?? 0;
    return nudge(structure, working, newId, { x: parent.x + siblingCount * (size.width + 60), y: parent.y + (parentSize.height + size.height) / 2 + 100 });
  }
  const tiers = supportTiers(structure.rootId, structure.elements);
  const tier = tiers.get(newId) ?? Math.max(0, ...tiers.values()) + 1;
  return nudge(structure, working, newId, { x: size.width / 2 + 80, y: size.height / 2 + 60 + tier * (size.height + 100) });
}

function nudge(structure: GoalStructure, working: Record<string, NodePosition>, newId: string, pos: NodePosition): NodePosition {
  const own = nodeSize(structure, newId);
  let x = pos.x;
  const positions = Object.entries(working).filter(([id]) => id !== newId && structure.elements.has(id));
  // Each collision moves beyond another glyph's right edge; this terminates even
  // for very tall circles or long-text Goals, without moving any existing node.
  for (let attempt = 0; attempt <= positions.length; attempt++) {
    const clash = positions.find(([id, p]) => {
      const other = nodeSize(structure, id);
      return Math.abs(p.x - x) < (own.width + other.width) / 2 + 40 && Math.abs(p.y - pos.y) < (own.height + other.height) / 2 + 40;
    });
    if (!clash) break;
    x = clash[1].x + nodeSize(structure, clash[0]).width / 2 + own.width / 2 + 60;
  }
  return { x, y: pos.y };
}

/** Place all missing nodes via tier layout from root. */
export function placeAllMissing(
  structure: GoalStructure,
  working: Record<string, NodePosition>,
): Record<string, NodePosition> {
  const result = { ...working };
  const tiers = supportTiers(structure.rootId, structure.elements);
  // Ensure root
  if (structure.rootId && structure.elements.has(structure.rootId) && !result[structure.rootId]) {
    const rootSize = nodeSize(structure, structure.rootId);
    result[structure.rootId] = { x: rootSize.width / 2 + 80, y: rootSize.height / 2 + 60 };
  }
  // Sort by tier then gsnId for stability
  const ids = [...structure.elements.keys()].sort((a, b) => {
    const ta = tiers.get(a) ?? 999;
    const tb = tiers.get(b) ?? 999;
    if (ta !== tb) return ta - tb;
    return a.localeCompare(b);
  });
  const tierCounters = new Map<number, number>();
  for (const id of ids) {
    if (result[id]) continue;
    const tier = tiers.get(id) ?? 0;
    const el = structure.elements.get(id)!;
    // Prefer parent-relative
    const parents = findParents(structure, id);
    if (parents.length > 0 && result[parents[0]]) {
      const isContext = structure.elements.get(parents[0])?.inContextOf.includes(id);
      result[id] = placeNewNode(
        structure,
        result,
        id,
        parents[0],
        isContext ? "IN_CONTEXT_OF" : "SUPPORTED_BY",
      );
      continue;
    }
    const slot = tierCounters.get(tier) ?? 0;
    tierCounters.set(tier, slot + 1);
    const size = nodeSize(structure, id);
    result[id] = nudge(structure, result, id, {
      x: size.width / 2 + 80 + slot * (size.width + 60),
      y: size.height / 2 + 60 + tier * (size.height + 100),
    });
    // silence unused el warning path
    void el;
  }
  return result;
}

function findParents(structure: GoalStructure, childId: string): string[] {
  const parents: string[] = [];
  for (const el of structure.elements.values()) {
    if (el.supportedBy.includes(childId) || el.inContextOf.includes(childId)) {
      parents.push(el.gsnId);
    }
  }
  return parents;
}

export interface MergeResult {
  positions: Record<string, NodePosition>;
  staleDropped: string[];
  newlyPlaced: string[];
}

/** Merge last-saved layout with structure; Layout Manager fills gaps. */
export function mergeLastSaved(
  structure: GoalStructure,
  lastSaved: LayoutDoc | null,
): MergeResult {
  const saved = lastSaved?.nodes ?? {};
  const staleDropped: string[] = [];
  const newlyPlaced: string[] = [];
  const positions: Record<string, NodePosition> = {};

  for (const id of Object.keys(saved)) {
    if (!structure.elements.has(id)) {
      staleDropped.push(id);
    }
  }

  for (const id of structure.elements.keys()) {
    if (saved[id] && Number.isFinite(saved[id].x) && Number.isFinite(saved[id].y)) {
      positions[id] = { ...saved[id] };
    }
  }

  const before = new Set(Object.keys(positions));
  const filled = placeAllMissing(structure, positions);
  for (const id of Object.keys(filled)) {
    if (!before.has(id)) newlyPlaced.push(id);
  }

  return { positions: filled, staleDropped, newlyPlaced };
}

export function toLayoutDoc(
  rootId: string,
  working: Record<string, NodePosition>,
  viewport: ViewportState,
  display?: LayoutDoc["display"],
): LayoutDoc {
  return {
    schemaVersion: 1,
    rootGsnId: rootId,
    tool: "goalkeeper",
    savedAt: new Date().toISOString(),
    viewport: { ...viewport },
    nodes: { ...working },
    display: display ?? { showEvidenceBadges: true },
  };
}

export function parseLayoutDoc(raw: unknown): LayoutDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  const nodes: Record<string, NodePosition> = {};
  const n = o.nodes;
  if (n && typeof n === "object") {
    for (const [id, pos] of Object.entries(n as Record<string, { x?: number; y?: number }>)) {
      if (typeof pos?.x === "number" && typeof pos?.y === "number" && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        nodes[id] = { x: pos.x, y: pos.y };
      }
    }
  }
  const vp = (o.viewport as ViewportState) ?? { x: 0, y: 0, zoom: 1 };
  return {
    schemaVersion: 1,
    rootGsnId: String(o.rootGsnId ?? ""),
    tool: "goalkeeper",
    savedAt: typeof o.savedAt === "string" ? o.savedAt : undefined,
    viewport: {
      x: Number.isFinite(Number(vp.x)) ? Number(vp.x) : 0,
      y: Number.isFinite(Number(vp.y)) ? Number(vp.y) : 0,
      zoom: Number.isFinite(Number(vp.zoom)) && Number(vp.zoom) > 0 ? Number(vp.zoom) : 1,
      ...(typeof vp.focusId === "string" && vp.focusId.trim() ? { focusId: vp.focusId } : {}),
    },
    nodes,
    display: (o.display as LayoutDoc["display"]) ?? { showEvidenceBadges: true },
  };
}

export function ensureLayout(rootId: string, layout?: LayoutDoc | null): LayoutDoc {
  return layout ?? emptyLayout(rootId);
}
