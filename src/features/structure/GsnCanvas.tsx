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
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const revealTimers = useRef<number[]>([]);
  const lastReveal = useRef(-1);
  const onSelectRef = useRef(onSelect);
  const onDragRef = useRef(onDrag);
  onSelectRef.current = onSelect;
  onDragRef.current = onDrag;

  // Create cytoscape once
  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: "node",
          style: {
            shape: "round-rectangle",
            width: 180,
            height: 70,
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": 160,
            "font-size": 11,
            "font-family": "IBM Plex Sans, sans-serif",
            "text-valign": "center",
            "text-halign": "center",
            color: "#1a1d23",
            "background-color": "#fbf8f2",
            "border-width": 2,
            "border-color": "data(border)",
            "overlay-padding": 4,
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
      wheelSensitivity: 0.25,
      minZoom: 0.25,
      maxZoom: 2.5,
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
    });

    const ro = new ResizeObserver(() => {
      cy.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Progressive full reveal when revealToken changes (open root / last saved)
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
      if (cy.nodes().length) cy.fit(undefined, 40);
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
          if (cy.nodes().length) cy.fit(undefined, 40);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- full reveal only on token
  }, [revealToken, structure.rootId]);

  // Incremental sync on graph mutations (wizard apply, detail create, etc.)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    // Skip if progressive reveal is mid-flight for this open
    if (revealTimers.current.length > 0 && cy.nodes().length === 0) return;

    const { nodes, edges } = buildElements(structure, positions, errorIds);
    const wantNodes = new Set(nodes.map((n) => n.data!.id as string));
    const wantEdges = new Set(edges.map((e) => e.data!.id as string));

    // Remove stale
    cy.nodes().forEach((n) => {
      if (!wantNodes.has(n.id())) n.remove();
    });
    cy.edges().forEach((e) => {
      if (!wantEdges.has(e.id())) e.remove();
    });

    // Add / update nodes
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
        // brief entrance: already at layout position
      }
    }
    for (const e of edges) {
      const id = e.data!.id as string;
      if (!cy.getElementById(id).nonempty()) {
        const s = e.data!.source as string;
        const t = e.data!.target as string;
        if (cy.getElementById(s).nonempty() && cy.getElementById(t).nonempty()) cy.add(e);
      }
    }

    if (selectedId) {
      cy.elements().unselect();
      cy.getElementById(selectedId).select();
    }
  }, [structure, positions, graphEpoch, errorIds, selectedId]);

  // Keep selection in sync without full rebuild
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [selectedId]);

  return <div className="gk-canvas" ref={containerRef} data-testid="gsn-canvas" />;
}
