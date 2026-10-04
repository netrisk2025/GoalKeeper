import ELK, { type ElkNode } from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import type { GoalStructure, NodePosition } from "../model/types";
import { glyphFor } from "../presentation/geometry";

/** Same ELK layered engine as the Loss Tool; context belongs beside its claim. */
export async function layoutArgument(structure: GoalStructure): Promise<Record<string, NodePosition>> {
  const all = [...structure.elements.values()];
  const contextual = new Set(all.filter(e => ["GsnContext", "GsnAssumption", "GsnJustification"].includes(e.gkType)).map(e => e.gsnId));
  const owner = new Map<string, string>();
  for (const el of all.filter(e => e.gkType === "GsnGoal" || e.gkType === "GsnStrategy")) for (const id of el.inContextOf) if (contextual.has(id) && !owner.has(id)) owner.set(id, el.gsnId);
  const blocks = all.filter(e => !owner.has(e.gsnId)).map(el => {
    const glyph = glyphFor(el);
    const contexts = all.filter(c => owner.get(c.gsnId) === el.gsnId);
    const contextHeight = contexts.reduce((h, c) => h + glyphFor(c).height + 40, -40);
    const contextWidth = Math.max(0, ...contexts.map(c => glyphFor(c).width));
    return { el, glyph, contexts, width: glyph.width + (contexts.length ? contextWidth + 110 : 0), height: Math.max(glyph.height + (el.undeveloped ? 28 : 0), contextHeight) };
  });
  const children = blocks.map(b => ({ id: b.el.gsnId, width: b.width, height: b.height }));
  const ids = new Set(children.map(c => c.id));
  const graph: ElkNode = {
    id: "argument", children,
    layoutOptions: { "elk.algorithm": "layered", "elk.direction": "DOWN", "elk.edgeRouting": "ORTHOGONAL", "elk.spacing.nodeNode": "90", "elk.layered.spacing.nodeNodeBetweenLayers": "115", "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES", "elk.randomSeed": "1", "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED", "elk.padding": "[top=48,left=48,bottom=48,right=48]" },
    edges: all.flatMap(e => e.supportedBy.filter(t => ids.has(t) && ids.has(e.gsnId)).map((t, i) => ({ id: `${e.gsnId}:${i}:${t}`, sources: [e.gsnId], targets: [t] }))),
  };
  const engine = import.meta.env.SSR
    ? new (await import("elkjs/lib/elk.bundled.js")).default({ algorithms: ["layered"] })
    : new ELK({ workerFactory: () => new Worker(elkWorkerUrl), algorithms: ["layered"] });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([engine.layout(graph), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Layout timed out; current positions were retained.")), 30000); })]);
    const positions: Record<string, NodePosition> = {};
    for (const node of result.children ?? []) {
      const b = blocks.find(b => b.el.gsnId === node.id)!;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error("Layout returned an invalid position.");
      const x = node.x!, y = node.y!;
      positions[node.id] = { x: x + b.glyph.width / 2, y: y + b.height / 2 };
      let cy = y + (b.height - b.contexts.reduce((h, c) => h + glyphFor(c).height + 40, -40)) / 2;
      for (const c of b.contexts) { const g = glyphFor(c); positions[c.gsnId] = { x: x + b.glyph.width + 110 + g.width / 2, y: cy + g.height / 2 }; cy += g.height + 40; }
    }
    return positions;
  } finally { clearTimeout(timer); if (!import.meta.env.SSR) engine.terminateWorker(); }
}
