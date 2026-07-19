import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import type { GoalStructure, NodePosition } from "../../core/model/types";
import { displayTypeName } from "../../core/model/types";

interface Props {
  structure: GoalStructure;
  positions: Record<string, NodePosition>;
  selectedId: string | null;
  revealToken: number;
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

export function GsnCanvas({
  structure,
  positions,
  selectedId,
  revealToken,
  errorIds,
  onSelect,
  onDrag,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const revealTimers = useRef<number[]>([]);

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
      // Cytoscape CSS typings are overly strict on numeric property unions
      ] as unknown as cytoscape.StylesheetJson,
      layout: { name: "preset" },
      wheelSensitivity: 0.25,
      minZoom: 0.25,
      maxZoom: 2.5,
    });
    cyRef.current = cy;

    cy.on("tap", "node", (evt) => {
      onSelect(evt.target.id());
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelect(null);
    });
    cy.on("dragfree", "node", (evt) => {
      const n = evt.target;
      const p = n.position();
      onDrag(n.id(), p.x, p.y);
    });

    return () => {
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      cy.destroy();
      cyRef.current = null;
    };
  }, [onDrag, onSelect]);

  // Rebuild graph with progressive reveal
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    revealTimers.current.forEach((t) => window.clearTimeout(t));
    revealTimers.current = [];
    cy.elements().remove();

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

    // Progressive reveal: BFS tiers from root
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
    for (const el of elements) {
      if (!seen.has(el.gsnId)) order.push(el.gsnId);
    }

    const nodeById = new Map(nodes.map((n) => [n.data!.id as string, n]));
    const edgeList = edges;
    const totalBudget = 1500;
    const step = Math.max(30, Math.min(80, totalBudget / Math.max(order.length, 1)));

    const finishAll = () => {
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      revealTimers.current = [];
      const missingNodes = order
        .map((id) => nodeById.get(id))
        .filter((n): n is ElementDefinition => !!n && !cy.getElementById(n.data!.id as string).nonempty());
      if (missingNodes.length) cy.add(missingNodes);
      const missingEdges = edgeList.filter((e) => {
        const id = e.data!.id as string;
        return !cy.getElementById(id).nonempty();
      });
      if (missingEdges.length) cy.add(missingEdges);
      if (selectedId) cy.getElementById(selectedId).select();
      cy.fit(undefined, 40);
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
        // add edges whose endpoints exist
        for (const e of edgeList) {
          const eid = e.data!.id as string;
          if (cy.getElementById(eid).nonempty()) continue;
          const s = e.data!.source as string;
          const tgt = e.data!.target as string;
          if (cy.getElementById(s).nonempty() && cy.getElementById(tgt).nonempty()) {
            cy.add(e);
          }
        }
        if (i === order.length - 1) {
          if (selectedId) cy.getElementById(selectedId).select();
          cy.fit(undefined, 40);
        }
      }, i * step);
      revealTimers.current.push(t);
    });

    // hard cap
    revealTimers.current.push(window.setTimeout(finishAll, totalBudget + 100));

    return () => {
      el?.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("keydown", onKey);
      revealTimers.current.forEach((t) => window.clearTimeout(t));
      revealTimers.current = [];
    };
  }, [structure, positions, revealToken, errorIds, selectedId]);

  // Sync selection without full rebuild
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [selectedId]);

  // Sync positions when dragging externally / last saved
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    for (const [id, pos] of Object.entries(positions)) {
      const n = cy.getElementById(id);
      if (n.nonempty()) n.position({ x: pos.x, y: pos.y });
    }
  }, [positions]);

  return <div className="gk-canvas" ref={containerRef} />;
}
