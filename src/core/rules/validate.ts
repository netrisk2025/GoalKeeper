/** GSN v3 core structural checks. Passing these checks is not evidence acceptance. */
import type { Finding, GoalStructure } from "../model/types";
import { canLink } from "./relationships";
import { findArgumentCycle } from "../graph/cycle";
import { reachableFromRoot } from "../graph/reachability";
import { resolveEvidence } from "../vault/load";

export function validateStructure(structure: GoalStructure): Finding[] {
  const findings: Finding[] = [...(structure.loadFindings ?? [])];
  const { rootId, elements } = structure;
  const add = (severity: Finding["severity"], code: string, nodeId: string | undefined, message: string) => findings.push({ severity, code, nodeId, message });
  const root = elements.get(rootId);
  if (!root) add("ERROR", "NO_ROOT", rootId || undefined, "No Root Goal is marked in this case. Mark exactly one Goal is_root in its Markdown note.");
  else if (root.gkType !== "GsnGoal" || !root.isRoot) add("ERROR", "ROOT_TYPE", rootId, `${rootId} must be a Goal marked is_root.`);

  const reachable = reachableFromRoot(rootId, elements);
  const ids = new Set<string>();
  for (const el of elements.values()) {
    if (!el.gsnId.trim()) add("ERROR", "EMPTY_ID", el.filePath, `${el.filePath} has an empty GSN identifier.`);
    if (ids.has(el.gsnId)) add("ERROR", "DUP_ID", el.gsnId, `Duplicate GSN identifier ${el.gsnId}.`);
    ids.add(el.gsnId);
    if (el.isRoot && el.gsnId !== rootId) add("ERROR", "SECOND_ROOT", el.gsnId, `${el.gsnId} is also marked as root. This standalone case requires exactly one Goal root.`);
    if (!reachable.has(el.gsnId)) add("ERROR", "ORPHAN", el.gsnId, `${el.gsnId} is not reachable from Root Goal ${rootId || "(missing)"}. Link it to the case or remove it.`);
    if (el.supportedBy.includes(rootId)) add("ERROR", "ROOT_INCOMING", rootId, `Root Goal ${rootId} has incoming support from ${el.gsnId}. Remove that relationship.`);

    for (const [rel, links] of [["SUPPORTED_BY", el.supportedBy], ["IN_CONTEXT_OF", el.inContextOf]] as const) {
      const seen = new Set<string>();
      for (const id of links) {
        if (seen.has(id)) add("ERROR", "DUP_EDGE", el.gsnId, `Duplicate ${rel} relationship ${el.gsnId} → ${id}.`);
        seen.add(id);
        const target = elements.get(id);
        if (!target) add("ERROR", "MISSING_TARGET", el.gsnId, `${el.gsnId} ${rel} references missing ${id}. Restore the note or remove the link.`);
        else if (!canLink(el.gkType, target.gkType, rel)) add("ERROR", "ILLEGAL_REL", el.gsnId, `GSN v3 does not permit ${rel} from ${el.gkType} ${el.gsnId} to ${target.gkType} ${id}.`);
      }
    }

    const canBeUndeveloped = el.gkType === "GsnGoal" || el.gkType === "GsnStrategy";
    if (el.undeveloped) {
      if (!canBeUndeveloped) add("ERROR", "INVALID_UNDEVELOPED", el.gsnId, `${el.gsnId}: only Goals and Strategies may carry the undeveloped diamond.`);
      else add("INFO", "UNDEVELOPED", el.gsnId, `${el.gsnId} is explicitly undeveloped; further argument and evidence are required.`);
    }
    if (canBeUndeveloped && !el.supportedBy.length) add("WARNING", "NO_SUPPORT", el.gsnId, `${el.gsnId} has no supporting ${el.gkType === "GsnStrategy" ? "Goal" : "node"}${el.undeveloped ? " and is marked undeveloped" : ""}.`);
    if (el.gkType === "GsnSolution") {
      if (el.supportedBy.length) add("ERROR", "SOLUTION_OUTGOING", el.gsnId, `${el.gsnId} is a terminal Solution and cannot have outgoing SUPPORTED_BY relationships.`);
      if (!el.hasEvidence.length) add("WARNING", "NO_EVIDENCE", el.gsnId, `${el.gsnId} has no evidence-note reference and is incomplete.`);
      for (const reference of el.hasEvidence) {
        if (!resolveEvidence(structure, reference)) add("WARNING", "MISSING_EVIDENCE", el.gsnId, `${el.gsnId} references missing or ambiguous evidence “${reference}”. Attach a resolvable evidence note; the Solution is incomplete.`);
      }
    } else if (el.hasEvidence.length) {
      add("ERROR", "ILLEGAL_EVIDENCE", el.gsnId, `${el.gsnId}: evidence-note references belong on a Solution.`);
    }
    if (!el.statement.trim()) add("WARNING", "EMPTY_STATEMENT", el.gsnId, `${el.gsnId} has an empty statement.`);
  }
  const cycleAt = findArgumentCycle(elements);
  if (cycleAt) add("ERROR", "CYCLE", cycleAt, `Cycle detected in GSN relationships involving ${cycleAt}. GSN arguments must be acyclic.`);
  return findings;
}
