import type { Finding, GoalStructure } from "../model/types";
import { validateStructure } from "../rules/validate";

function uniqueEvidence(structure: GoalStructure) {
  return [...new Map([...structure.evidence.values()].map((note) => [note.filePath, note])).values()];
}

const REVIEW_LIMIT = "Structural validation does not establish evidence sufficiency, accepted risk, certification or approval by a security regime official.";

export function exportMarkdown(structure: GoalStructure, findings?: Finding[]): string {
  const f = findings ?? validateStructure(structure);
  const root = structure.elements.get(structure.rootId);
  const lines = [
    `# Goal Structure: ${root?.name ?? structure.rootId}`, "",
    `- Root: **${structure.rootId}**`, `- Directory: \`${structure.rootDir}\``,
    `- Exported: ${new Date().toISOString()}`, "", REVIEW_LIMIT, "", "## Elements", "",
  ];
  for (const el of structure.elements.values()) {
    lines.push(`### ${el.gsnId} — ${el.name} (${el.gkType.replace("Gsn", "")})`);
    if (el.isRoot) lines.push("_Root Goal_");
    if (el.undeveloped) lines.push("_Undeveloped_");
    lines.push("", el.statement || "_(empty statement)_", "");
    for (const [label, links] of [["Supported by", el.supportedBy], ["In context of", el.inContextOf], ["Evidence", el.hasEvidence]] as const) {
      if (links.length) lines.push(`${label}: ${links.map((id) => `[[${id}]]`).join(", ")}`);
    }
    for (const [key, value] of Object.entries(el.metadata ?? {})) lines.push(`- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
    lines.push("");
  }
  lines.push("## Evidence notes", "");
  for (const note of uniqueEvidence(structure)) {
    lines.push(`### ${note.name}`, "", `- Note: ${note.filePath}`, `- Kind: ${note.kind}`);
    if (note.artifactPath) lines.push(`- Artifact: ${note.artifactPath}`);
    for (const [key, value] of Object.entries(note.metadata ?? {})) lines.push(`- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
    lines.push("", note.statement, "");
  }
  lines.push("## Validation findings", "");
  if (!f.length) lines.push("No structural findings. Evidence sufficiency still requires review.");
  else for (const item of f) lines.push(`- **${item.severity}** \`${item.code}\`${item.nodeId ? ` (${item.nodeId})` : ""}: ${item.message}`);
  return lines.join("\n") + "\n";
}

export function exportJson(structure: GoalStructure, findings?: Finding[]): string {
  return JSON.stringify({
    schemaVersion: 1,
    profile: "GSN Community Standard v3 — core notation",
    reviewLimit: REVIEW_LIMIT,
    exportedAt: new Date().toISOString(),
    root: { gsnId: structure.rootId, name: structure.elements.get(structure.rootId)?.name ?? "", rootDir: structure.rootDir },
    elements: [...structure.elements.values()],
    relationships: [...structure.elements.values()].flatMap((el) => [
      ...el.supportedBy.map((target) => ({ type: "SUPPORTED_BY", source: el.gsnId, target })),
      ...el.inContextOf.map((target) => ({ type: "IN_CONTEXT_OF", source: el.gsnId, target })),
      ...el.hasEvidence.map((target) => ({ type: "HAS_EVIDENCE", source: el.gsnId, target })),
    ]),
    evidence: uniqueEvidence(structure),
    layout: structure.layout,
    findings: findings ?? validateStructure(structure),
  }, null, 2);
}
