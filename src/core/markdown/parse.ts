/** Browser-safe Markdown notes with GSN wikilinks and preserved provenance. */
import type { ElementType, EvidenceKind, EvidenceNote, GsnElement, GsnType } from "../model/types";
import { GSN_TYPES, statementProp } from "../model/types";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";

const MANAGED_KEYS = new Set([
  "gk_schema", "gk_type", "gkType", "gsn_id", "gsnId", "name", "statement",
  "is_root", "isRoot", "undeveloped", "supported_by", "supportedBy", "in_context_of",
  "inContextOf", "has_evidence", "hasEvidence", "created", "modified", "evidence_kind",
  "kind", "artifact_path", "artifactPath", ...GSN_TYPES.map(statementProp),
]);

export function parseWikilinks(text: string): string[] {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)]
    .map((match) => cleanLink(match[1])).filter(Boolean);
}

function cleanLink(link: string): string {
  return link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim().replace(/\\/g, "/");
}

/** Resolve a GSN relationship to its stable identifier. Evidence keeps its full path. */
export function wikilinkKey(link: string): string {
  return (cleanLink(link).split("/").pop() ?? link).replace(/\.md$/i, "");
}

function isGsnType(t: string): t is GsnType {
  return (GSN_TYPES as string[]).includes(t);
}

function metadataOf(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const metadata = Object.fromEntries(Object.entries(data).filter(([key]) => !MANAGED_KEYS.has(key)));
  return Object.keys(metadata).length ? metadata : undefined;
}

function references(data: Record<string, unknown>, content: string, key: string, alias: string, heading: string, paths = false): string[] {
  const value = data[key] ?? data[alias];
  if (value != null && !Array.isArray(value)) throw new Error(`${key} must be a block list of wikilinks or [].`);
  // An explicit empty list clears relationships; stale body links cannot resurrect them.
  const links = Array.isArray(value)
    ? value.map((item) => cleanLink(String(item)))
    : extractSectionLinks(content, heading);
  return links.filter(Boolean).map((item) => paths ? item : wikilinkKey(item));
}

export function parseElementFile(filePath: string, text: string): GsnElement | EvidenceNote {
  const { data, content } = parseFrontmatter(text);
  const gkType = String(data.gk_type ?? data.gkType ?? "");
  if (!isElementType(gkType)) throw new Error(`Unsupported or missing gk_type: ${gkType || "(missing)"}.`);
  const name = String(data.name ?? data.gsn_id ?? data.gsnId ?? wikilinkKey(filePath));
  const bodyStatement = extractBodyStatement(content);
  const statement = bodyStatement || String(data.statement ?? (isGsnType(gkType) ? data[statementProp(gkType)] : "") ?? "");
  const common = {
    filePath, name, statement, metadata: metadataOf(data),
    created: data.created ? String(data.created) : undefined,
    modified: data.modified ? String(data.modified) : undefined,
  };
  if (gkType === "Evidence") {
    return {
      ...common,
      kind: String(data.evidence_kind ?? data.kind ?? "Other") as EvidenceKind,
      artifactPath: data.artifact_path || data.artifactPath ? String(data.artifact_path ?? data.artifactPath) : undefined,
    };
  }
  return {
    ...common, gkType,
    gsnId: String(data.gsn_id ?? data.gsnId ?? wikilinkKey(filePath)),
    isRoot: (data.is_root ?? data.isRoot) === true,
    undeveloped: data.undeveloped === true,
    supportedBy: references(data, content, "supported_by", "supportedBy", "Supported By"),
    inContextOf: references(data, content, "in_context_of", "inContextOf", "In Context Of"),
    hasEvidence: references(data, content, "has_evidence", "hasEvidence", "Evidence", true),
  };
}

function extractBodyStatement(content: string): string {
  const lines = content.trim().split(/\r?\n/);
  if (/^#\s+/.test(lines[0] ?? "")) lines.shift();
  // Only application relationship headings terminate the statement. Other headings
  // and paragraphs are meaningful evidence or claim text and survive a round-trip.
  const end = lines.findIndex((line) => /^##\s+(Supported By|In Context Of|Evidence)\s*$/i.test(line));
  return (end < 0 ? lines : lines.slice(0, end)).join("\n").trim();
}

function extractSectionLinks(content: string, heading: string): string[] {
  let inSection = false;
  const links: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) {
      inSection = line.replace(/^##\s+/, "").trim().toLowerCase() === heading.toLowerCase();
    } else if (inSection) links.push(...parseWikilinks(line));
  }
  return links;
}

export function serializeElement(el: GsnElement): string {
  const fm: Record<string, unknown> = {
    ...el.metadata,
    gk_schema: 1, gk_type: el.gkType, gsn_id: el.gsnId, name: el.name,
    statement: el.statement, undeveloped: el.undeveloped,
    supported_by: el.supportedBy.map((id) => `[[${id}]]`),
    in_context_of: el.inContextOf.map((id) => `[[${id}]]`),
  };
  if (el.isRoot) fm.is_root = true;
  if (el.gkType === "GsnSolution" || el.hasEvidence.length) fm.has_evidence = el.hasEvidence.map((id) => `[[${id}]]`);
  if (el.created) fm.created = el.created;
  fm.modified = el.modified ?? new Date().toISOString();
  fm[statementProp(el.gkType)] = el.statement;
  const body = [`# ${el.gsnId} — ${el.name}`, "", el.statement, ""];
  for (const [heading, links] of [
    ["Supported By", el.supportedBy], ["In Context Of", el.inContextOf], ["Evidence", el.hasEvidence],
  ] as const) {
    if (links.length) body.push(`## ${heading}`, ...links.map((id) => `- [[${id}]]`), "");
  }
  return stringifyFrontmatter(body.join("\n").trimEnd() + "\n", fm);
}

export function serializeEvidence(ev: EvidenceNote): string {
  const fm: Record<string, unknown> = {
    ...ev.metadata, gk_schema: 1, gk_type: "Evidence", name: ev.name,
    statement: ev.statement, evidence_kind: ev.kind,
  };
  if (ev.artifactPath) fm.artifact_path = ev.artifactPath;
  if (ev.created) fm.created = ev.created;
  fm.modified = ev.modified ?? new Date().toISOString();
  return stringifyFrontmatter(`# ${ev.name}\n\n${ev.statement}\n`, fm);
}

export function isElementType(t: string): t is ElementType {
  return t === "Evidence" || isGsnType(t);
}

export function allocateGsnId(type: GsnType, existing: Iterable<string>): string {
  const prefix = { GsnGoal: "G", GsnStrategy: "S", GsnSolution: "Sn", GsnContext: "C", GsnAssumption: "A", GsnJustification: "J" }[type];
  let max = 0;
  for (const id of existing) {
    const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export function slugify(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "Root-Goal";
}
