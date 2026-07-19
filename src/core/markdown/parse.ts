/** Markdown parse/serialize with Obsidian wikilinks (Architecture §4.4). */

import matter from "gray-matter";
import type { ElementType, EvidenceKind, EvidenceNote, GsnElement, GsnType } from "../model/types";
import { GSN_TYPES, statementProp } from "../model/types";

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export function parseWikilinks(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].split("|")[0].trim();
    if (raw) out.push(raw);
  }
  return out;
}

/** Resolve [[Note]] or [[path/Note]] to basename without extension. */
export function wikilinkKey(link: string): string {
  const cleaned = link.replace(/\\/g, "/").split("/").pop() ?? link;
  return cleaned.replace(/\.md$/i, "");
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => {
    if (typeof x === "string") {
      const inner = x.match(/^\[\[(.+)\]\]$/);
      return wikilinkKey(inner ? inner[1] : x);
    }
    return String(x);
  });
}

function isGsnType(t: string): t is GsnType {
  return (GSN_TYPES as string[]).includes(t);
}

export function parseElementFile(filePath: string, text: string): GsnElement | EvidenceNote {
  const { data, content } = matter(text);
  const gkType = String(data.gk_type ?? data.gkType ?? "GsnGoal");

  if (gkType === "Evidence") {
    return parseEvidence(filePath, data, content);
  }

  const type: GsnType = isGsnType(gkType) ? gkType : "GsnGoal";
  const gsnId = String(data.gsn_id ?? data.gsnId ?? wikilinkKey(filePath));
  const name = String(data.name ?? gsnId);
  const fmStatement = data.statement != null ? String(data.statement) : "";
  const bodyStatement = extractBodyStatement(content, name);
  const statement = bodyStatement.trim() || fmStatement;

  const supportedBy =
    asStringArray(data.supported_by ?? data.supportedBy).length > 0
      ? asStringArray(data.supported_by ?? data.supportedBy)
      : extractSectionLinks(content, "Supported By");
  const inContextOf =
    asStringArray(data.in_context_of ?? data.inContextOf).length > 0
      ? asStringArray(data.in_context_of ?? data.inContextOf)
      : extractSectionLinks(content, "In Context Of");
  const hasEvidence =
    asStringArray(data.has_evidence ?? data.hasEvidence).length > 0
      ? asStringArray(data.has_evidence ?? data.hasEvidence)
      : extractSectionLinks(content, "Evidence");

  return {
    filePath,
    gkType: type,
    gsnId,
    name,
    statement,
    isRoot: Boolean(data.is_root ?? data.isRoot ?? false),
    undeveloped: Boolean(data.undeveloped ?? false),
    supportedBy,
    inContextOf,
    hasEvidence: type === "GsnSolution" ? hasEvidence : [],
    created: data.created ? String(data.created) : undefined,
    modified: data.modified ? String(data.modified) : undefined,
  };
}

function parseEvidence(
  filePath: string,
  data: Record<string, unknown>,
  content: string,
): EvidenceNote {
  const name = String(data.name ?? wikilinkKey(filePath));
  const fmStatement = data.statement != null ? String(data.statement) : "";
  const bodyStatement = extractBodyStatement(content, name);
  const kind = (String(data.evidence_kind ?? data.kind ?? "Other") as EvidenceKind) || "Other";
  return {
    filePath,
    name,
    statement: bodyStatement.trim() || fmStatement,
    kind,
    artifactPath: data.artifact_path
      ? String(data.artifact_path)
      : data.artifactPath
        ? String(data.artifactPath)
        : undefined,
    created: data.created ? String(data.created) : undefined,
    modified: data.modified ? String(data.modified) : undefined,
  };
}

function extractBodyStatement(content: string, title: string): string {
  const lines = content.split(/\r?\n/);
  const body: string[] = [];
  let pastTitle = false;
  for (const line of lines) {
    if (!pastTitle && /^#\s+/.test(line)) {
      pastTitle = true;
      continue;
    }
    if (/^##\s+/.test(line)) break;
    if (pastTitle || !line.startsWith("#")) {
      if (!pastTitle && line.trim() === "") continue;
      pastTitle = true;
      body.push(line);
    }
  }
  const text = body.join("\n").trim();
  // Avoid echoing title-only
  if (text === title) return "";
  return text;
}

function extractSectionLinks(content: string, heading: string): string[] {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "im");
  const lines = content.split(/\r?\n/);
  let inSection = false;
  const links: string[] = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = re.test(line);
      continue;
    }
    if (inSection) {
      links.push(...parseWikilinks(line).map(wikilinkKey));
    }
  }
  return links;
}

export function serializeElement(el: GsnElement): string {
  const fm: Record<string, unknown> = {
    gk_schema: 1,
    gk_type: el.gkType,
    gsn_id: el.gsnId,
    name: el.name,
    statement: el.statement,
    undeveloped: el.undeveloped,
    supported_by: el.supportedBy.map((id) => `[[${id}]]`),
    in_context_of: el.inContextOf.map((id) => `[[${id}]]`),
  };
  if (el.isRoot) fm.is_root = true;
  if (el.gkType === "GsnSolution") {
    fm.has_evidence = el.hasEvidence.map((id) => `[[${id}]]`);
  }
  if (el.created) fm.created = el.created;
  fm.modified = el.modified ?? new Date().toISOString();

  // Also mirror type-specific statement key for SSTPA familiarity
  fm[statementProp(el.gkType)] = el.statement;

  const bodyParts = [
    `# ${el.gsnId} — ${el.name}`,
    "",
    el.statement || "",
    "",
  ];
  if (el.supportedBy.length > 0) {
    bodyParts.push("## Supported By", ...el.supportedBy.map((id) => `- [[${id}]]`), "");
  }
  if (el.inContextOf.length > 0) {
    bodyParts.push("## In Context Of", ...el.inContextOf.map((id) => `- [[${id}]]`), "");
  }
  if (el.gkType === "GsnSolution" && el.hasEvidence.length > 0) {
    bodyParts.push("## Evidence", ...el.hasEvidence.map((id) => `- [[${id}]]`), "");
  }

  return matter.stringify(bodyParts.join("\n").trimEnd() + "\n", fm);
}

export function serializeEvidence(ev: EvidenceNote): string {
  const fm: Record<string, unknown> = {
    gk_schema: 1,
    gk_type: "Evidence",
    name: ev.name,
    statement: ev.statement,
    evidence_kind: ev.kind,
  };
  if (ev.artifactPath) fm.artifact_path = ev.artifactPath;
  if (ev.created) fm.created = ev.created;
  fm.modified = ev.modified ?? new Date().toISOString();
  const body = `# ${ev.name}\n\n${ev.statement || ""}\n`;
  return matter.stringify(body, fm);
}

export function isElementType(t: string): t is ElementType {
  return t === "Evidence" || isGsnType(t);
}

export function allocateGsnId(type: GsnType, existing: Iterable<string>): string {
  const prefix = type === "GsnSolution" ? "Sn" : type.replace("Gsn", "").charAt(0);
  // Goals G, Strategy S, Solution Sn, Context C, Assumption A, Justification J
  const p =
    type === "GsnGoal"
      ? "G"
      : type === "GsnStrategy"
        ? "S"
        : type === "GsnSolution"
          ? "Sn"
          : type === "GsnContext"
            ? "C"
            : type === "GsnAssumption"
              ? "A"
              : "J";
  void prefix;
  let max = 0;
  const re = new RegExp(`^${p}(\\d+)$`);
  for (const id of existing) {
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${p}${max + 1}`;
}

export function slugify(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "Root-Goal"
  );
}
