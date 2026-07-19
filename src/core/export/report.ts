import type { Finding, GoalStructure } from "../model/types";
import { validateStructure } from "../rules/validate";

export function exportMarkdown(structure: GoalStructure, findings?: Finding[]): string {
  const f = findings ?? validateStructure(structure);
  const root = structure.elements.get(structure.rootId);
  const lines: string[] = [
    `# Goal Structure: ${root?.name ?? structure.rootId}`,
    "",
    `- Root: **${structure.rootId}**`,
    `- Directory: \`${structure.rootDir}\``,
    `- Exported: ${new Date().toISOString()}`,
    "",
    "## Elements",
    "",
  ];

  for (const el of [...structure.elements.values()].sort((a, b) =>
    a.gsnId.localeCompare(b.gsnId),
  )) {
    lines.push(`### ${el.gsnId} — ${el.name} (${el.gkType.replace("Gsn", "")})`);
    if (el.isRoot) lines.push("_Root Goal_");
    if (el.undeveloped) lines.push("_Undeveloped_");
    lines.push("");
    lines.push(el.statement || "_(empty statement)_");
    lines.push("");
    if (el.supportedBy.length) {
      lines.push(`Supported by: ${el.supportedBy.map((id) => `[[${id}]]`).join(", ")}`);
    }
    if (el.inContextOf.length) {
      lines.push(`In context of: ${el.inContextOf.map((id) => `[[${id}]]`).join(", ")}`);
    }
    if (el.hasEvidence.length) {
      lines.push(`Evidence: ${el.hasEvidence.map((id) => `[[${id}]]`).join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Validation findings", "");
  if (f.length === 0) {
    lines.push("No findings.");
  } else {
    for (const x of f) {
      lines.push(`- **${x.severity}** \`${x.code}\`${x.nodeId ? ` (${x.nodeId})` : ""}: ${x.message}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function exportJson(structure: GoalStructure, findings?: Finding[]): string {
  const f = findings ?? validateStructure(structure);
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    root: {
      gsnId: structure.rootId,
      name: structure.elements.get(structure.rootId)?.name ?? "",
      rootDir: structure.rootDir,
    },
    elements: [...structure.elements.values()].map((el) => ({
      gsnId: el.gsnId,
      gkType: el.gkType,
      name: el.name,
      statement: el.statement,
      isRoot: el.isRoot,
      undeveloped: el.undeveloped,
      supportedBy: el.supportedBy,
      inContextOf: el.inContextOf,
      hasEvidence: el.hasEvidence,
      filePath: el.filePath,
    })),
    relationships: [...structure.elements.values()].flatMap((el) => [
      ...el.supportedBy.map((t) => ({
        type: "SUPPORTED_BY" as const,
        source: el.gsnId,
        target: t,
      })),
      ...el.inContextOf.map((t) => ({
        type: "IN_CONTEXT_OF" as const,
        source: el.gsnId,
        target: t,
      })),
      ...el.hasEvidence.map((t) => ({
        type: "HAS_EVIDENCE" as const,
        source: el.gsnId,
        target: t,
      })),
    ]),
    evidence: [...structure.evidence.values()].map((e) => ({
      name: e.name,
      kind: e.kind,
      statement: e.statement,
      filePath: e.filePath,
    })),
    layout: structure.layout,
    findings: f,
  };
  return JSON.stringify(payload, null, 2);
}
