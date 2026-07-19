import type { GsnElement } from "../model/types";

/** DFS cycle detection over SUPPORTED_BY; returns a node on a cycle or null. */
export function findSupportCycle(elements: Map<string, GsnElement>): string | null {
  const adj = new Map<string, string[]>();
  for (const el of elements.values()) {
    adj.set(
      el.gsnId,
      el.supportedBy.filter((t) => elements.has(t)),
    );
  }
  const state = new Map<string, 1 | 2>();
  const visit = (hid: string): string | null => {
    state.set(hid, 1);
    for (const next of adj.get(hid) ?? []) {
      const st = state.get(next);
      if (st === 1) return next;
      if (st === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    state.set(hid, 2);
    return null;
  };
  for (const id of elements.keys()) {
    if (!state.has(id)) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return null;
}
