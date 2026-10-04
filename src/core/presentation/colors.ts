import { GSN_TYPES, type GsnNodeStyle, type GsnNodeStyles, type GsnType } from "../model/types";
export type { GsnNodeStyle, GsnNodeStyles } from "../model/types";
export type DiagramTheme = "light" | "dark";
export const PALETTES = {
  light: { paper: "#fffefb", ink: "#202d32", line: "#465c61", selected: "#1b6670", muted: "#485d61" },
  dark: { paper: "#18272c", ink: "#edf2ed", line: "#adc5c7", selected: "#8cd3cb", muted: "#c2d2d2" },
};
const CHANNELS = ["font", "box", "line", "border"] as const;
const HEX = /^#[0-9a-f]{6}$/i;
/** Imported colors never become arbitrary CSS or SVG. Incomplete type styles fall back as a unit. */
export function parseNodeStyles(raw: unknown): GsnNodeStyles {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: GsnNodeStyles = {};
  for (const type of GSN_TYPES) {
    if (!Object.prototype.hasOwnProperty.call(raw, type)) continue;
    const candidate = (raw as Record<string, unknown>)[type];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const fields = candidate as Record<string, unknown>;
    if (!CHANNELS.every(k => Object.prototype.hasOwnProperty.call(fields, k) && typeof fields[k] === "string" && HEX.test(fields[k] as string))) continue;
    result[type] = Object.fromEntries(CHANNELS.map(k => [k, (fields[k] as string).toLowerCase()])) as unknown as GsnNodeStyle;
  }
  return result;
}
export function getNodeStyle(type: GsnType, theme: DiagramTheme = "light", overrides?: GsnNodeStyles): GsnNodeStyle {
  const p = PALETTES[theme];
  return parseNodeStyles(overrides)[type] ?? { font: p.ink, box: p.paper, line: p.line, border: p.line };
}
/** Advisory only: user color choices remain unrestricted. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    if (!HEX.test(hex)) return NaN;
    const linear = [1, 3, 5].map(i => { const s = parseInt(hex.slice(i, i + 2), 16) / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
