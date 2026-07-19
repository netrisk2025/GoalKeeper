import type { GsnElement } from "../model/types";

/** BFS from root following SUPPORTED_BY and IN_CONTEXT_OF. */
export function reachableFromRoot(
  rootId: string,
  elements: Map<string, GsnElement>,
): Set<string> {
  const seen = new Set<string>();
  if (!rootId) return seen;
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const el = elements.get(id);
    if (!el) continue;
    for (const t of el.supportedBy) {
      if (!seen.has(t)) queue.push(t);
    }
    for (const t of el.inContextOf) {
      if (!seen.has(t)) queue.push(t);
    }
  }
  return seen;
}

export function pathToRoot(
  rootId: string,
  targetId: string,
  elements: Map<string, GsnElement>,
): string[] {
  if (!rootId || rootId === targetId) return rootId ? [rootId] : [];
  const children = new Map<string, string[]>();
  for (const el of elements.values()) {
    const outs = [...el.supportedBy, ...el.inContextOf];
    children.set(el.gsnId, outs);
  }
  const parent = new Map<string, string>();
  const queue = [rootId];
  const seen = new Set([rootId]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const c of children.get(cur) ?? []) {
      if (seen.has(c)) continue;
      seen.add(c);
      parent.set(c, cur);
      if (c === targetId) {
        const path = [c];
        let p: string | undefined = cur;
        while (p) {
          path.unshift(p);
          p = parent.get(p);
        }
        return path;
      }
      queue.push(c);
    }
  }
  return [];
}

export function supportTiers(
  rootId: string,
  elements: Map<string, GsnElement>,
): Map<string, number> {
  const tiers = new Map<string, number>();
  if (!rootId) return tiers;
  tiers.set(rootId, 0);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const el = elements.get(id);
    if (!el) continue;
    const t = tiers.get(id) ?? 0;
    for (const child of [...el.supportedBy, ...el.inContextOf]) {
      if (!tiers.has(child)) {
        tiers.set(child, t + 1);
        queue.push(child);
      }
    }
  }
  return tiers;
}
