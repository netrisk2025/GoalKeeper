import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GoalStructure, NodePosition, ViewportState } from "../../core/model/types";
import { boundsFor } from "../../core/presentation/geometry";
import { renderDiagram } from "../../core/presentation/svg";
import { useAppStore } from "../../state/store";

type CanvasBounds = ReturnType<typeof boundsFor>;
// Scroll gutters keep the camera movable in both directions even for a tiny branch.
// Persisted viewport x/y stay relative to the argument, independent of this UI gutter.
const SCROLL_GUTTER = 4096;
// One primary argument is active at a time. Keep its viewing context across mode unmounts.
let primarySession: { key: string } | null = null;

interface Props {
  structure: GoalStructure; positions: Record<string, NodePosition>; selectedId: string | null;
  revealToken: number; graphEpoch: number; errorIds: Set<string>;
  onSelect: (id: string | null) => void; onDrag: (id: string, x: number, y: number) => void;
  projection?: boolean;
}
export function GsnCanvas({ structure, positions, selectedId, revealToken, errorIds, onSelect, onDrag, projection = false }: Props) {
  const viewport = useAppStore(s => s.viewport);
  const setViewport = useAppStore(s => s.setViewport);
  const theme = useAppStore(s => s.theme);
  const [zoom, setZoom] = useState(projection ? 0.6 : viewport.zoom || 1);
  const sessionKey = JSON.stringify([useAppStore.getState().vaultPath, structure.rootDir, revealToken]);
  const [focus, setFocus] = useState<string | null>(() => !projection && viewport.focusId && structure.elements.has(viewport.focusId) ? viewport.focusId : null);
  const [dragFrame, setDragFrame] = useState<CanvasBounds | null>(null);
  const previousFocus = useRef(focus);
  const restoringFocus = useRef<{ id: string | null } | null>(null);
  const size = useRef<HTMLDivElement>(null);
  const previousFrame = useRef<{ key: string; bounds: CanvasBounds; zoom: number; insetX: number; insetY: number } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string | null; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const rendered = useMemo(() => {
    if (!focus || !structure.elements.has(focus)) return structure;
    const ids = new Set<string>(), queue = [focus];
    while (queue.length) { const id = queue.shift()!; if (ids.has(id)) continue; ids.add(id); const el = structure.elements.get(id); if (el) queue.push(...el.supportedBy, ...el.inContextOf); }
    return { ...structure, rootId: focus, elements: new Map([...structure.elements].filter(([id]) => ids.has(id))) };
  }, [structure, focus]);
  const bounds = useMemo(() => boundsFor(rendered, positions), [rendered, positions]);
  const paddedBounds = useMemo(() => {
    const inset = SCROLL_GUTTER / zoom;
    return { x: bounds.x - inset, y: bounds.y - inset, width: bounds.width + inset * 2, height: bounds.height + inset * 2 };
  }, [bounds, zoom]);
  const frame = dragFrame ?? paddedBounds;
  // The SVG still has its canonical viewBox. Its offset within a frozen frame cancels
  // origin changes while an outermost node is dragged, so that node follows the pointer.
  const html = useMemo(() => renderDiagram(rendered, positions, { theme, selectedId, errorIds, projection, interactive: !projection, markerPrefix: projection ? "model" : "gsn" }), [rendered, positions, theme, selectedId, errorIds, projection]);
  const publish = (z = zoom, branch = focus) => { if (!projection && scroll.current) setViewport({ x: scroll.current.scrollLeft - SCROLL_GUTTER, y: scroll.current.scrollTop - SCROLL_GUTTER, zoom: z, ...(branch ? { focusId: branch } : {}) }); };
  const centerSelected = (id: string | null = selectedId, z = 1) => {
    const pos = id ? positions[id] : undefined;
    if (!pos || !scroll.current) return;
    const el = scroll.current;
    el.scrollTo(Math.max(0, SCROLL_GUTTER + (pos.x - bounds.x) * z - el.clientWidth / 2), Math.max(0, SCROLL_GUTTER + (pos.y - bounds.y) * z - 200));
  };
  const changeZoom = (z: number, branch = focus) => { const next = Math.min(2, Math.max(0.12, z)); setZoom(next); publish(next, branch); };
  const fit = () => {
    const container = scroll.current;
    if (!container) return;
    const next = Math.min(1, Math.max(0.12, Math.min((container.clientWidth - 32) / bounds.width, (container.clientHeight - 32) / bounds.height)));
    changeZoom(next);
    requestAnimationFrame(() => {
      container.scrollTo(SCROLL_GUTTER - Math.max(0, (container.clientWidth - bounds.width * next) / 2), SCROLL_GUTTER - Math.max(0, (container.clientHeight - bounds.height * next) / 2));
      publish(next);
    });
  };
  useLayoutEffect(() => {
    const container = scroll.current, content = size.current;
    if (!container || !content) return;
    const outer = container.getBoundingClientRect(), inner = content.getBoundingClientRect();
    const insetX = inner.left - outer.left + container.scrollLeft;
    const insetY = inner.top - outer.top + container.scrollTop;
    const key = `${sessionKey}:${focus ?? ""}:${projection}`;
    const previous = previousFrame.current;
    if (previous?.key === key && previous.zoom === zoom) {
      // On release the canonical frame may grow or move. Compensate its origin and
      // centering margin before paint; otherwise the complete diagram jumps.
      const dx = (previous.bounds.x - frame.x) * zoom + insetX - previous.insetX;
      const dy = (previous.bounds.y - frame.y) * zoom + insetY - previous.insetY;
      if (dx || dy) {
        container.scrollTo(container.scrollLeft + dx, container.scrollTop + dy);
        if (!projection) setViewport({ x: container.scrollLeft - SCROLL_GUTTER, y: container.scrollTop - SCROLL_GUTTER, zoom, ...(focus ? { focusId: focus } : {}) });
      }
    }
    previousFrame.current = { key, bounds: frame, zoom, insetX, insetY };
  }, [frame, zoom, sessionKey, focus, projection, setViewport]);
  useEffect(() => {
    drag.current = null;
    setDragFrame(null);
    if (!projection) {
      const sameSession = primarySession?.key === sessionKey;
      const saved: ViewportState = useAppStore.getState().viewport;
      const savedFocus = saved.focusId && structure.elements.has(saved.focusId) ? saved.focusId : null;
      restoringFocus.current = { id: savedFocus };
      setFocus(savedFocus);
      setZoom(saved.zoom || 1);
      const callback = requestAnimationFrame(() => {
        if (sameSession || structure.layout.savedAt || savedFocus) scroll.current?.scrollTo(saved.x + SCROLL_GUTTER, saved.y + SCROLL_GUTTER);
        else centerSelected(structure.rootId, saved.zoom || 1);
        primarySession = { key: sessionKey };
        publish(saved.zoom || 1, savedFocus);
      });
      return () => cancelAnimationFrame(callback);
    }
    setFocus(null);
  }, [structure.rootDir, revealToken, projection, sessionKey]);
  useEffect(() => { if (projection) fit(); }, [projection, structure.rootDir]);
  useEffect(() => {
    const changed = previousFocus.current !== focus;
    previousFocus.current = focus;
    if (restoringFocus.current) {
      if (focus === restoringFocus.current.id) restoringFocus.current = null;
      return;
    }
    if (changed) {
      const callback = requestAnimationFrame(() => {
        centerSelected(focus ?? structure.rootId, zoom);
        publish(zoom, focus);
      });
      return () => cancelAnimationFrame(callback);
    }
  }, [focus, projection, sessionKey]);
  const nodeFrom = (target: EventTarget | null) => (target as Element)?.closest?.("[data-node-id]")?.getAttribute("data-node-id") ?? null;
  return <div className="gk-diagram-shell">
    <div className="gk-navigation" aria-label="Diagram navigation">
      <button className="gk-btn" onClick={fit}>Fit argument</button>
      <button className="gk-btn" onClick={() => { changeZoom(1); requestAnimationFrame(() => centerSelected(selectedId, 1)); }}>100%</button>
      <button className="gk-btn" aria-label="Zoom out" onClick={() => changeZoom(zoom / 1.2)}>−</button>
      <output aria-label="Diagram zoom">{Math.round(zoom * 100)}%</output>
      <button className="gk-btn" aria-label="Zoom in" onClick={() => changeZoom(zoom * 1.2)}>+</button>
      {!projection && <><span className="gk-toolbar-divider"/><button className="gk-btn" disabled={!selectedId} onClick={() => { setFocus(selectedId); changeZoom(1, selectedId); }}>Read selected branch</button>{focus && <button className="gk-btn" onClick={() => { setFocus(null); publish(zoom, null); }}>Whole argument</button>}</>}
      <span className="gk-navigation-hint">{focus ? `Branch ${focus}` : zoom < 0.75 ? "Overview · use 100% to read" : "Drag the page to pan · select a symbol to inspect"}</span>
    </div>
    <div className="gk-canvas-scroll" ref={scroll} data-testid={projection ? "model-canvas" : "gsn-canvas"} onScroll={() => publish()}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const id = nodeFrom(event.target), pos = id && !projection ? positions[id] : undefined;
        drag.current = { id: projection ? null : id, x: event.clientX, y: event.clientY, startX: pos?.x ?? scroll.current!.scrollLeft, startY: pos?.y ?? scroll.current!.scrollTop, moved: false };
        if (pos) setDragFrame({ ...paddedBounds });
        if (!projection && id) onSelect(id);
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={event => {
        const d = drag.current; if (!d) return;
        const dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) < 4 && !d.moved) return;
        d.moved = true;
        if (d.id) onDrag(d.id, d.startX + dx / zoom, d.startY + dy / zoom);
        else scroll.current?.scrollTo(d.startX - dx, d.startY - dy);
      }} onPointerUp={event => { drag.current = null; setDragFrame(null); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; setDragFrame(null); }}
      onKeyDown={event => { const id = nodeFrom(event.target); if (id && ["Enter", " "].includes(event.key)) { event.preventDefault(); if (!projection) onSelect(id); } }}>
      <div className="gk-svg-size" ref={size} style={{ width: frame.width * zoom, height: frame.height * zoom, margin: 0 }}>
        <div className="gk-svg-stage" style={{ position: "relative", transform: `scale(${zoom})`, width: frame.width, height: frame.height }}>
          <div style={{ position: "absolute", left: bounds.x - frame.x, top: bounds.y - frame.y }} dangerouslySetInnerHTML={{ __html: html }}/>
        </div>
      </div>
    </div>
    {!projection && <div className="gk-legend"><span>GSN v3 · core notation</span><span>▰ Strategy</span><span>○ Solution</span><span>◇ Undeveloped</span><span>Filled arrow: support</span><span>Hollow arrow: context</span></div>}
  </div>;
}
