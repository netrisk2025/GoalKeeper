import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import type { GoalStructure, NodePosition } from "../../core/model/types";
import { displayTypeName } from "../../core/model/types";

interface Props {
  structure: GoalStructure;
  positions: Record<string, NodePosition>;
  selectedId: string | null;
  revealToken: number;
  graphEpoch: number;
  errorIds: Set<string>;
  onSelect: (id: string | null) => void;
  onDrag: (id: string, x: number, y: number) => void;
}

/** Nominal node size (screen px at zoom 1). Max/min zoom ratio ≤ 5×. */
export const NODE_W = 168;
export const NODE_H = 72;
/** Readable minimum zoom; maximum is 5× this. */
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = MIN_ZOOM * 5; // 2.0
export const NOMINAL_ZOOM = 1.0;

const TYPE_COLOR: Record<string, string> = {
  GsnGoal: "#3d5a80",
  GsnStrategy: "#2a6b4a",
  GsnSolution: "#96660a",
  GsnContext: "#5a3a8a",
  GsnAssumption: "#5a3a8a",
  GsnJustification: "#5a3a8a",
};

function buildElements(
  structure: GoalStructure,
  positions: Record<string, NodePosition>,
  errorIds: Set<string>,
): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
  const elements = [...structure.elements.values()];
  const nodes: ElementDefinition[] = elements.map((el) => {
    const pos = positions[el.gsnId] ?? { x: 0, y: 0 };
    const border = TYPE_COLOR[el.gkType] ?? "#5d6674";
    const label = `${el.gsnId}\n${el.name || displayTypeName(el.gkType)}`;
    return {
      group: "nodes",
      data: {
        id: el.gsnId,
        label,
        border,
        type: el.gkType,
      },
      position: { x: pos.x, y: pos.y },
      classes: errorIds.has(el.gsnId) ? "error" : undefined,
      grabbable: true,
    };
  });

  const edges: ElementDefinition[] = [];
  for (const el of elements) {
    for (const t of el.supportedBy) {
      if (!structure.elements.has(t)) continue;
      edges.push({
        group: "edges",
        data: {
          id: `${el.gsnId}->${t}`,
          source: el.gsnId,
          target: t,
          label: "",
        },
      });
    }
    for (const t of el.inContextOf) {
      if (!structure.elements.has(t)) continue;
      edges.push({
        group: "edges",
        data: {
          id: `${el.gsnId}-ctx-${t}`,
          source: el.gsnId,
          target: t,
          label: "ctx",
        },
        classes: "context",
      });
    }
  }
  return { nodes, edges };
}

function bfsOrder(structure: GoalStructure): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const q = [structure.rootId];
  while (q.length) {
    const id = q.shift()!;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    const el = structure.elements.get(id);
    if (!el) continue;
    for (const c of [...el.supportedBy, ...el.inContextOf]) {
      if (!seen.has(c)) q.push(c);
    }
  }
  for (const el of structure.elements.values()) {
    if (!seen.has(el.gsnId)) order.push(el.gsnId);
  }
  return order;
}

/**
 * Apply a usable view: never blow a single node up to fill the viewport.
 * Zoom stays within [MIN_ZOOM, MAX_ZOOM] (5× span); default is NOMINAL_ZOOM.
 */
function applySmartView(cy: Core): void {
  if (cy.nodes().length === 0) return;

  // One or few nodes: keep nominal size, centered — do not cy.fit() (that zooms in huge)
  if (cy.nodes().length <= 2) {
    cy.zoom({ level: NOMINAL_ZOOM, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    cy.center(cy.nodes());
    return;
  }

  cy.fit(cy.elements(), 48);
  let z = cy.zoom();
  if (z > NOMINAL_ZOOM) z = NOMINAL_ZOOM; // never larger than nominal for multi-node either
  if (z < MIN_ZOOM) z = MIN_ZOOM;
  if (z > MAX_ZOOM) z = MAX_ZOOM;
  cy.zoom(z);
  cy.center(cy.elements());
}

/** Grow scrollable canvas surface so content at min zoom still scrolls. */
function sizeScrollSurface(cy: Core, scrollEl: HTMLElement | null, canvasEl: HTMLElement | null): void {
  if (!scrollEl || !canvasEl || cy.nodes().length === 0) return;
  const bb = cy.elements().boundingBox();
  const pad = 120;
  const modelW = Math.max(1, bb.w + pad * 2);
  const modelH = Math.max(1, bb.h + pad * 2);
  // At MIN_ZOOM the rendered size is model * MIN_ZOOM; ensure surface at least that
  // relative to nominal, and at least the viewport size.
  const viewW = scrollEl.clientWidth;
  const viewH = scrollEl.clientHeight;
  const needW = Math.max(viewW, modelW * NOMINAL_ZOOM + pad);
  const needH = Math.max(viewH, modelH * NOMINAL_ZOOM + pad);
  canvasEl.style.width = `${Math.ceil(needW)}px`;
  canvasEl.style.height = `${Math.ceil(needH)}px`;
  cy.resize();
}

export function GsnCanvas({
  structure,
  positions,
  selectedId,
  revealToken,
  graphEpoch,
  errorIds,
  onSelect,
  onDrag,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const revealTimers = useRef<number[]>([]);
  const lastReveal = useRef(-1);
  const onSelectRef = useRef(onSelect);
  const onDragRef = useRef(onDrag);
  onSelectRef.current = onSelect;
  onDragRef.current = onDrag;

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: "node",
          style: {
            shape: "round-rectangle",
            width: NODE_W,
            height: NODE_H,
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": NODE_W - 16,
            "font-size": 11,
            "font-family": "IBM Plex Sans, sans-serif",
            "text-valign": "center",
            "text-halign": "center",
            color: "#1a1d23",
            "background-color": "#fbf8f2",
            "border-width": 2,
            "border-color": "data(border)",
            "overlay-padding": 4,
            "min-zoomed-font-size": 8,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#2f5d6e",
            "border-width": 3,
          },
        },
        {
          selector: "node.error",
          style: {
            "border-color": "#be3536",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.9,
            "line-color": "#8a8070",
            "target-arrow-color": "#8a8070",
            label: "data(label)",
            "font-size": 8,
            color: "#5d6674",
            "text-rotation": "autorotate",
            "text-margin-y": -8,
          },
        },
        {
          selector: "edge.context",
          style: {
            "line-style": "dashed",
            "target-arrow-shape": "triangle-backcurve",
            label: "ctx",
          },
        },
      ] as unknown as cytoscape.StylesheetJson,
      layout: { name: "preset" },
      wheelSensitivity: 0.2,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });
    cyRef.current = cy;

    cy.on("tap", "node", (evt) => {
      onSelectRef.current(evt.target.id());
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRef.current(null);
    });
    cy.on("dragfree", "node", (evt) => {
      const n = evt.target;
      const p = n.position();
      onDragRef.current(n.id(), p.x, p.y);
      sizeScrollSurface(cy, scrollRef.current, containerRef.current);
    });
    cy.on("zoom pan", () => {
      sizeScrollSurface(cy, scrollRef.current, containerRef.current);
    });

    const ro = new ResizeObserver(() => {
      cy.resize();
      sizeScrollSurface(cy, scrollRef.current, containerRef.current);
    });
    if (scrollRef.current) ro.observe(scrollRef.current);

    return () => {
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (revealToken === lastReveal.current && cy.nodes().length > 0) return;
    lastReveal.current = revealToken;

    revealTimers.current.forEach((t) => window.clearTimeout(t));
    revealTimers.current = [];
    cy.elements().remove();

    const { nodes, edges } = buildElements(structure, positions, errorIds);
    const order = bfsOrder(structure);
    const nodeById = new Map(nodes.map((n) => [n.data!.id as string, n]));
    const totalBudget = 1200;
    const step = Math.max(25, Math.min(70, totalBudget / Math.max(order.length, 1)));

    const finishAll = () => {
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      revealTimers.current = [];
      for (const id of order) {
        const n = nodeById.get(id);
        if (n && !cy.getElementById(id).nonempty()) cy.add(n);
      }
      for (const e of edges) {
        const eid = e.data!.id as string;
        if (!cy.getElementById(eid).nonempty()) {
          const s = e.data!.source as string;
          const t = e.data!.target as string;
          if (cy.getElementById(s).nonempty() && cy.getElementById(t).nonempty()) cy.add(e);
        }
      }
      if (selectedId) cy.getElementById(selectedId).select();
      sizeScrollSurface(cy, scrollRef.current, containerRef.current);
      applySmartView(cy);
    };

    const onSkip = () => finishAll();
    const el = containerRef.current;
    el?.addEventListener("pointerdown", onSkip, { once: true });
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finishAll();
    };
    window.addEventListener("keydown", onKey);

    order.forEach((id, i) => {
      const t = window.setTimeout(() => {
        const n = nodeById.get(id);
        if (n && !cy.getElementById(id).nonempty()) cy.add(n);
        for (const e of edges) {
          const eid = e.data!.id as string;
          if (cy.getElementById(eid).nonempty()) continue;
          const s = e.data!.source as string;
          const tgt = e.data!.target as string;
          if (cy.getElementById(s).nonempty() && cy.getElementById(tgt).nonempty()) cy.add(e);
        }
        if (i === order.length - 1) {
          if (selectedId) cy.getElementById(selectedId).select();
          sizeScrollSurface(cy, scrollRef.current, containerRef.current);
          applySmartView(cy);
        }
      }, i * step);
      revealTimers.current.push(t);
    });
    revealTimers.current.push(window.setTimeout(finishAll, totalBudget + 80));

    return () => {
      el?.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("keydown", onKey);
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      revealTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealToken, structure.rootId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (revealTimers.current.length > 0 && cy.nodes().length === 0) return;

    const { nodes, edges } = buildElements(structure, positions, errorIds);
    const wantNodes = new Set(nodes.map((n) => n.data!.id as string));
    const wantEdges = new Set(edges.map((e) => e.data!.id as string));

    cy.nodes().forEach((n) => {
      if (!wantNodes.has(n.id())) n.remove();
    });
    cy.edges().forEach((e) => {
      if (!wantEdges.has(e.id())) e.remove();
    });

    let added = false;
    for (const n of nodes) {
      const id = n.data!.id as string;
      const existing = cy.getElementById(id);
      if (existing.nonempty()) {
        existing.data(n.data!);
        existing.position(n.position!);
        if (errorIds.has(id)) existing.addClass("error");
        else existing.removeClass("error");
      } else {
        cy.add(n);
        added = true;
      }
    }
    for (const e of edges) {
      const id = e.data!.id as string;
      if (!cy.getElementById(id).nonempty()) {
        const s = e.data!.source as string;
        const t = e.data!.target as string;
        if (cy.getElementById(s).nonempty() && cy.getElementById(t).nonempty()) {
          cy.add(e);
          added = true;
        }
      }
    }

    if (selectedId) {
      cy.elements().unselect();
      cy.getElementById(selectedId).select();
    }
    sizeScrollSurface(cy, scrollRef.current, containerRef.current);
    if (added && cy.nodes().length <= 3) {
      applySmartView(cy);
    }
  }, [structure, positions, graphEpoch, errorIds, selectedId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [selectedId]);

  return (
    <div className="gk-canvas-scroll" ref={scrollRef}>
      <div className="gk-canvas" ref={containerRef} data-testid="gsn-canvas" />
    </div>
  );
}
