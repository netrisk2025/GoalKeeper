import type { GoalStructure, GsnElement, GsnNodeStyles, NodePosition } from "../model/types";
import { boundsFor, glyphFor, LINE_HEIGHT } from "./geometry";

import { getNodeStyle, PALETTES, parseNodeStyles } from "./colors";
export { PALETTES } from "./colors";

export function escapeXml(s: unknown): string { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!)); }
export interface DiagramOptions { theme?: "light" | "dark"; selectedId?: string | null; errorIds?: Set<string>; projection?: boolean; interactive?: boolean; markerPrefix?: string; nodeStyles?: GsnNodeStyles }
function shape(el: GsnElement, projection: boolean): string {
  const { width: w, height: h } = glyphFor(el), x = -w / 2, y = -h / 2;
  if (projection) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
  switch (el.gkType) {
    case "GsnStrategy": return `<polygon points="${x + 26},${y} ${w / 2},${y} ${w / 2 - 26},${h / 2} ${x},${h / 2}"/>`;
    case "GsnSolution": return `<circle r="${w / 2}"/>`;
    case "GsnAssumption": case "GsnJustification": return `<ellipse rx="${w / 2}" ry="${h / 2}"/>`;
    case "GsnContext": return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(48, h / 2)}" ry="${h / 2}"/>`;
    default: return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  }
}
export function renderDiagram(structure: GoalStructure, positions: Record<string, NodePosition>, options: DiagramOptions = {}): string {
  const p = PALETTES[options.theme ?? "light"], bounds = boundsFor(structure, positions), prefix = options.markerPrefix ?? "gsn";
  const nodeStyles = parseNodeStyles(options.nodeStyles ?? structure.layout.display?.nodeStyles);
  const markers = (key: string, line: string) => `<marker id="${key}-support" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M 0 0 L 12 6 L 0 12 Z" fill="${line}"/></marker><marker id="${key}-context" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="10" markerHeight="10" orient="auto"><path d="M 1 1 L 11 6 L 1 11 Z" fill="${p.paper}" stroke="${line}" stroke-width="1.3"/></marker>`;
  const markerDefs = markers(prefix, p.line) + Object.entries(nodeStyles).map(([type, style]) => markers(`${prefix}-${type}`, style!.line)).join("");
  const edges: string[] = [];
  for (const el of structure.elements.values()) {
    const s = positions[el.gsnId]; if (!s) continue;
    const style = getNodeStyle(el.gkType, options.theme, nodeStyles);
    const edgePrefix = nodeStyles[el.gkType] ? `${prefix}-${el.gkType}` : prefix;
    for (const [rel, targets] of [["support", el.supportedBy], ["context", el.inContextOf]] as const) {
      for (const id of targets) {
        const t = positions[id], target = structure.elements.get(id); if (!t || !target) continue;
        const sg = glyphFor(el), tg = glyphFor(target);
        let d: string;
        if (rel === "context") {
          const dir = t.x >= s.x ? 1 : -1;
          const sx = s.x + dir * (sg.width / 2 - (el.gkType === "GsnStrategy" && !options.projection ? 13 : 0));
          const tx = t.x - dir * tg.width / 2, mx = (sx + tx) / 2;
          d = `M ${sx} ${s.y} C ${mx} ${s.y}, ${mx} ${t.y}, ${tx} ${t.y}`;
        } else {
          const sy = s.y + sg.height / 2, ty = t.y - tg.height / 2, mid = (sy + ty) / 2;
          d = `M ${s.x} ${sy} V ${mid} H ${t.x} V ${ty}`;
        }
        edges.push(`<path data-edge="${escapeXml(`${el.gsnId}|${rel}|${id}`)}" d="${d}" fill="none" stroke="${style.line}" stroke-width="1.7" marker-end="url(#${edgePrefix}-${rel})"><title>${escapeXml(el.gsnId)} ${rel === "support" ? "SupportedBy" : "InContextOf"} ${escapeXml(id)}</title></path>`);
      }
    }
  }
  const nodes = [...structure.elements.values()].map(el => {
    const pos = positions[el.gsnId]; if (!pos) return "";
    const style = getNodeStyle(el.gkType, options.theme, nodeStyles);
    const g = glyphFor(el), selected = options.selectedId === el.gsnId;
    const title = `${el.gsnId} · ${el.gkType.replace("Gsn", "")}: ${el.statement}${el.undeveloped ? " · Undeveloped" : ""}`;
    let y = -g.textHeight / 2 + 17;
    const label = [...g.idLines.map(line => { const out = `<text x="0" y="${y}" text-anchor="middle" font-size="16" font-weight="700">${escapeXml(line)}</text>`; y += LINE_HEIGHT; return out; }), ...g.lines.map((line, i) => { if (i === 0) y += 10; const out = `<text data-statement-line="true" x="0" y="${y}" text-anchor="middle" font-size="16">${escapeXml(line)}</text>`; y += LINE_HEIGHT; return out; })].join("");
    const decorator = !options.projection && ["GsnAssumption", "GsnJustification"].includes(el.gkType)
      ? `<text x="${g.width / 2 - 5}" y="${g.height / 2 + 4}" font-size="19" font-weight="700" fill="${p.ink}">${el.gkType === "GsnAssumption" ? "A" : "J"}</text>` : "";
    const diamond = !options.projection && el.undeveloped && ["GsnGoal", "GsnStrategy"].includes(el.gkType)
      ? `<path data-undeveloped="true" d="M 0 ${g.height / 2} l 12 12 l -12 12 l -12 -12 Z" fill="${p.paper}" stroke="${style.border}" stroke-width="1.7"/>` : "";
    const stereo = options.projection ? `<text x="${-g.width / 2 + 12}" y="${-g.height / 2 + 17}" font-size="11" fill="${nodeStyles[el.gkType] ? style.font : p.muted}">«${escapeXml(el.gkType)}»</text>` : "";
    return `<g data-node-id="${escapeXml(el.gsnId)}" data-gsn-type="${el.gkType}" transform="translate(${pos.x} ${pos.y})"${options.interactive ? ` role="button" tabindex="0" aria-label="${escapeXml(title)}"` : ""}><title>${escapeXml(title)}</title><g data-symbol="true" fill="${style.box}" stroke="${selected && !nodeStyles[el.gkType] ? p.selected : style.border}" stroke-width="${selected ? 3 : 1.7}">${shape(el, !!options.projection)}</g><g fill="${style.font}" stroke="none">${label}${decorator}${stereo}</g>${diamond}${options.errorIds?.has(el.gsnId) ? `<text x="${-g.width / 2}" y="${g.height / 2 + 42}" fill="${p.ink}" font-size="13">! Review finding</text>` : ""}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="group" aria-label="${options.projection ? "SysML / KerML-style projection" : "GSN argument"}" style="background:${p.paper};font-family:Arial,Helvetica,sans-serif"><title>${escapeXml(structure.elements.get(structure.rootId)?.name ?? "GSN argument")}</title><desc>GSN v3 core notation. Structural validity does not establish evidence sufficiency or approval.</desc><defs>${markerDefs}</defs><g>${edges.join("")}</g><g>${nodes}</g></svg>`;
}
export function exportSvg(structure: GoalStructure, positions: Record<string, NodePosition>, options: DiagramOptions = {}): string { return `<?xml version="1.0" encoding="UTF-8"?>\n${renderDiagram(structure, positions, options)}`; }
export function projectionText(structure: GoalStructure): string {
  return ["// Illustrative SysML/KerML-style projection; not parser-validated interchange.", `package ${JSON.stringify(structure.rootDir)} {`, ...[...structure.elements.values()].flatMap(el => [
    `  feature ${JSON.stringify(el.gsnId)} : ${el.gkType} {`, `    // ${el.statement.replace(/\r?\n/g, " ")}`, "  }",
    ...el.supportedBy.map(t => `  connector SupportedBy from ${JSON.stringify(el.gsnId)} to ${JSON.stringify(t)};`),
    ...el.inContextOf.map(t => `  connector InContextOf from ${JSON.stringify(el.gsnId)} to ${JSON.stringify(t)};`),
  ]), "}"].join("\n");
}
