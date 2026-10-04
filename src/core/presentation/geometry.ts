import type { GsnElement, GoalStructure, NodePosition } from "../model/types";

/** GSN v3 Table 1:2-1. Dimensions include all text; no truncation. */
export const FONT_SIZE = 16;
export const LINE_HEIGHT = 23;
export interface Glyph { width: number; height: number; lines: string[]; idLines: string[]; textHeight: number }
export function textWidth(text: string): number {
  return [...text].reduce((n, c) => n + (/\s/.test(c) ? 5 : /[ilI.,'`:;!|]/.test(c) ? 5 : /[MWmw@%]/.test(c) ? 16 : c.charCodeAt(0) > 255 ? 17 : /[A-Z0-9]/.test(c) ? 13 : 10), 0);
}
export function wrapText(text: string, maxWidth = 252): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && textWidth(`${line} ${word}`) > maxWidth) { lines.push(line); line = ""; }
      if (textWidth(word) > maxWidth) {
        for (const char of word) {
          if (textWidth(line + char) > maxWidth) { lines.push(line); line = ""; }
          line += char;
        }
      } else line += (line ? " " : "") + word;
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}
export function glyphFor(el: GsnElement): Glyph {
  const lines = wrapText(el.statement || "Statement not yet supplied.");
  const idLines = wrapText(el.gsnId);
  const textHeight = (lines.length + idLines.length) * LINE_HEIGHT + 10;
  let width = 312, height = textHeight + 42;
  if (el.gkType === "GsnStrategy") width = 348;
  if (el.gkType === "GsnContext") { width = 352; height += 12; }
  if (el.gkType === "GsnAssumption" || el.gkType === "GsnJustification") {
    width = 398; height = Math.max(182, (textHeight + 22) * 1.65);
  }
  if (el.gkType === "GsnSolution") {
    width = height = Math.ceil(Math.sqrt(270 ** 2 + textHeight ** 2) + 44);
  }
  return { width, height, lines, idLines, textHeight };
}
export function boundsFor(structure: GoalStructure, positions: Record<string, NodePosition>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of structure.elements.values()) {
    const p = positions[el.gsnId]; if (!p) continue;
    const g = glyphFor(el);
    minX = Math.min(minX, p.x - g.width / 2 - 30); minY = Math.min(minY, p.y - g.height / 2 - 30);
    maxX = Math.max(maxX, p.x + g.width / 2 + 30); maxY = Math.max(maxY, p.y + g.height / 2 + 46);
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : { x: 0, y: 0, width: 600, height: 400 };
}
