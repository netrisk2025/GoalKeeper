import { useLayoutEffect, useRef, useState } from "react";
import { useAppStore } from "../../state/store";
import { projectionText } from "../../core/presentation/svg";
import { GsnCanvas } from "./GsnCanvas";

export function ModelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"graph" | "text">("graph");
  const structure = useAppStore(s => s.structure), positions = useAppStore(s => s.workingPositions);
  useLayoutEffect(() => {
    const el = dialog.current;
    if (open && el && !el.open) { el.showModal(); return () => el.close(); }
  }, [open]);
  if (!structure) return null;
  return <dialog ref={dialog} className="gk-model-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="model-heading" onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="gk-model-header"><div><h2 id="model-heading">SysML / KerML equivalent</h2><p>Illustrative projection of the current argument · not parser-validated interchange</p></div><button autoFocus className="gk-btn" onClick={onClose}>Close model view</button></div>
    <div className="gk-canvas-toolbar"><button className={`gk-btn ${tab === "graph" ? "active" : ""}`} onClick={() => setTab("graph")}>Model graph</button><button className={`gk-btn ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}>Model text</button><span>{structure.elements.size} elements · same argument</span></div>
    {open && (tab === "graph" ? <GsnCanvas structure={structure} positions={positions} selectedId={null} revealToken={0} graphEpoch={0} errorIds={new Set()} onSelect={() => {}} onDrag={() => {}} projection/> : <pre className="gk-pre">{projectionText(structure)}</pre>)}
  </dialog>;
}
