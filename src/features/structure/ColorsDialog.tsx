import { useLayoutEffect, useRef, useState } from "react";
import { GSN_TYPES, displayTypeName, type GsnNodeStyle, type GsnType } from "../../core/model/types";
import { contrastRatio, getNodeStyle, PALETTES } from "../../core/presentation/colors";
import { useAppStore } from "../../state/store";

const CHANNELS: { key: keyof GsnNodeStyle; label: string }[] = [
  { key: "font", label: "Font" }, { key: "box", label: "Fill" },
  { key: "line", label: "Connector" }, { key: "border", label: "Boundary" },
];
/** Loss-compatible four-channel selector. Changes are working layout until Save Layout. */
export function ColorsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<GsnType>("GsnGoal");
  const theme = useAppStore(s => s.theme), nodeStyles = useAppStore(s => s.nodeStyles);
  const setNodeStyles = useAppStore(s => s.setNodeStyles);
  useLayoutEffect(() => {
    const el = dialog.current;
    if (open && el && !el.open) { el.showModal(); return () => el.close(); }
  }, [open]);
  const style = getNodeStyle(type, theme, nodeStyles), paper = PALETTES[theme].paper;
  const textContrast = contrastRatio(style.font, style.box);
  const boundaryContrast = Math.min(contrastRatio(style.border, style.box), contrastRatio(style.border, paper));
  const lineContrast = contrastRatio(style.line, paper);
  const lowContrast = textContrast < 4.5 || boundaryContrast < 3 || lineContrast < 3;
  const change = (key: keyof GsnNodeStyle, value: string) => {
    const current = useAppStore.getState();
    setNodeStyles({ ...current.nodeStyles, [type]: { ...getNodeStyle(type, current.theme, current.nodeStyles), [key]: value } });
  };
  return <dialog ref={dialog} className="gk-colors-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="colors-heading">
    <h2 id="colors-heading">Node type colors</h2>
    <p>Four color channels per node type. Outgoing connectors use their source type’s color.</p>
    <label className="gk-color-type">Node type<select autoFocus className="gk-input" aria-label="Color node type" value={type} onChange={e => setType(e.target.value as GsnType)}>
      {GSN_TYPES.map(t => <option key={t} value={t}>{displayTypeName(t)}</option>)}
    </select></label>
    <div className="gk-color-grid">{CHANNELS.map(({ key, label }) => <label key={key}><span>{label}</span>
      <input type="color" aria-label={`${label} color`} value={style[key]} onInput={e => change(key, e.currentTarget.value)} onChange={e => change(key, e.currentTarget.value)}/>
      <code>{style[key]}</code></label>)}</div>
    <p className="gk-color-contrast" role="status">Contrast: text {textContrast.toFixed(1)}:1 · boundary {boundaryContrast.toFixed(1)}:1 · connectors {lineContrast.toFixed(1)}:1.
      {lowContrast ? " Some choices fall below the default contrast targets. Your colors remain available." : " Meets the default contrast targets."}</p>
    <p className="gk-color-hint">Changes apply immediately. Use Save Layout to keep them, or Last Saved to restore the saved palette. Custom colors apply in both themes.</p>
    <div className="gk-modal-actions"><button className="gk-btn" onClick={() => setNodeStyles({})}>Reset default colors</button><button className="gk-btn primary" onClick={onClose}>Done</button></div>
  </dialog>;
}
