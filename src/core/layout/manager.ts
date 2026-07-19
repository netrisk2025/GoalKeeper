/** Layout Manager + last-saved merge (Architecture §4.5, SRS FR-68–FR-77). */

import type { GoalStructure, LayoutDoc, NodePosition, ViewportState } from "../model/types";
import { emptyLayout } from "../model/types";
import { supportTiers } from "../graph/reachability";

const NODE_W = 200;
const NODE_H = 80;
const GAP_X = 40;
const GAP_Y = 100;
const CONTEXT_OFFSET_X = 220;

export function placeNewNode(
  structure: GoalStructure,
  working: Record<string, NodePosition>,
  newId: string,
  parentId?: string,
  relType?: "SUPPORTED_BY" | "IN_CONTEXT_OF",
): NodePosition {
  if (working[newId]) return working[newId];

  if (parentId && working[parentId]) {
    const p = working[parentId];
    if (relType === "IN_CONTEXT_OF") {
      return nudge(working, { x: p.x + CONTEXT_OFFSET_X, y: p.y });
    }
    // SUPPORTED_BY: below parent, offset by sibling count
    const siblings = countChildrenAt(structure, parentId, working);
    return nudge(working, {
      x: p.x + siblings * (NODE_W + GAP_X) - NODE_W,
      y: p.y + NODE_H + GAP_Y,
    });
  }

  // Hierarchical fallback: tier layout slot
  const tiers = supportTiers(structure.rootId, structure.elements);
  const tier = tiers.get(newId) ?? Math.max(0, ...Object.values(tiers), 0) + 1;
  const atTier = Object.keys(working).filter((id) => (tiers.get(id) ?? -1) === tier).length;
  return nudge(working, {
    x: 80 + atTier * (NODE_W + GAP_X),
    y: 60 + tier * (NODE_H + GAP_Y),
  });
}

function countChildrenAt(
  structure: GoalStructure,
  parentId: string,
  working: Record<string, NodePosition>,
): number {
  const parent = structure.elements.get(parentId);
  if (!parent) return 0;
  return parent.supportedBy.filter((id) => working[id]).length;
}

function nudge(working: Record<string, NodePosition>, pos: NodePosition): NodePosition {
  let { x, y } = pos;
  const positions = Object.values(working);
  for (let i = 0; i < 20; i++) {
    const clash = positions.some(
      (p) => Math.abs(p.x - x) < NODE_W * 0.7 && Math.abs(p.y - y) < NODE_H * 0.7,
    );
    if (!clash) break;
    x += NODE_W * 0.5;
  }
  return { x, y };
}

/** Place all missing nodes via tier layout from root. */
export function placeAllMissing(
  structure: GoalStructure,
  working: Record<string, NodePosition>,
): Record<string, NodePosition> {
  const result = { ...working };
  const tiers = supportTiers(structure.rootId, structure.elements);
  // Ensure root
  if (!result[structure.rootId]) {
    result[structure.rootId] = { x: 80, y: 40 };
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
    result[id] = nudge(result, {
      x: 80 + slot * (NODE_W + GAP_X),
      y: 40 + tier * (NODE_H + GAP_Y),
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
    if (saved[id]) {
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
      if (typeof pos?.x === "number" && typeof pos?.y === "number") {
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
      x: Number(vp.x) || 0,
      y: Number(vp.y) || 0,
      zoom: Number(vp.zoom) || 1,
    },
    nodes,
    display: (o.display as LayoutDoc["display"]) ?? { showEvidenceBadges: true },
  };
}

export function ensureLayout(rootId: string, layout?: LayoutDoc | null): LayoutDoc {
  return layout ?? emptyLayout(rootId);
}
