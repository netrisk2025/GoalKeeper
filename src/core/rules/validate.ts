/** Structural validation (SRS FR-38–FR-41). */

import type { Finding, GoalStructure, GsnElement } from "../model/types";
import { canLink } from "./relationships";
import { findSupportCycle } from "../graph/cycle";
import { reachableFromRoot } from "../graph/reachability";

export function validateStructure(structure: GoalStructure): Finding[] {
  const findings: Finding[] = [];
  const { rootId, elements } = structure;

  if (!rootId || !elements.has(rootId)) {
    findings.push({
      severity: "ERROR",
      code: "NO_ROOT",
      message: "No Root Goal selected or Root Goal file is missing.",
      nodeId: rootId || undefined,
    });
    return findings;
  }

  const root = elements.get(rootId)!;
  if (root.gkType !== "GsnGoal" || !root.isRoot) {
    findings.push({
      severity: "ERROR",
      code: "ROOT_TYPE",
      nodeId: rootId,
      message: `${rootId} must be a GsnGoal marked is_root.`,
    });
  }

  const edges = collectSupportEdges(elements);
  const reachable = reachableFromRoot(rootId, elements);
  const incomingSupport = new Set<string>();
  for (const e of edges) {
    incomingSupport.add(e.target);
  }

  // Exactly one root: no other Goal without incoming SupportedBy
  for (const el of elements.values()) {
    if (el.gkType === "GsnGoal" && el.gsnId !== rootId && !incomingSupport.has(el.gsnId)) {
      if (reachable.has(el.gsnId) || el.isRoot) {
        findings.push({
          severity: "ERROR",
          code: "SECOND_ROOT",
          nodeId: el.gsnId,
          message: `${el.gsnId} is a second root Goal (no incoming SUPPORTED_BY). A Goal Structure has exactly one Root Goal.`,
        });
      }
    }
  }

  // Duplicate logical edges
  const edgeCounts = new Map<string, number>();
  for (const el of elements.values()) {
    for (const t of el.supportedBy) {
      const key = `${el.gsnId}|SUPPORTED_BY|${t}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
    for (const t of el.inContextOf) {
      const key = `${el.gsnId}|IN_CONTEXT_OF|${t}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of edgeCounts) {
    if (count > 1) {
      const [source, type, target] = key.split("|");
      findings.push({
        severity: "ERROR",
        code: "DUP_EDGE",
        nodeId: source,
        message: `Duplicate ${type} relationship ${source} -> ${target} (${count} copies).`,
      });
    }
  }

  // Illegal relationships
  for (const el of elements.values()) {
    for (const t of el.supportedBy) {
      const target = elements.get(t);
      if (!target) {
        findings.push({
          severity: "WARNING",
          code: "MISSING_TARGET",
          nodeId: el.gsnId,
          message: `${el.gsnId} SUPPORTED_BY references missing ${t}.`,
        });
        continue;
      }
      if (!canLink(el.gkType, target.gkType, "SUPPORTED_BY")) {
        findings.push({
          severity: "ERROR",
          code: "ILLEGAL_REL",
          nodeId: el.gsnId,
          message: `Illegal SUPPORTED_BY from ${el.gkType} ${el.gsnId} to ${target.gkType} ${t}.`,
        });
      }
    }
    for (const t of el.inContextOf) {
      const target = elements.get(t);
      if (!target) {
        findings.push({
          severity: "WARNING",
          code: "MISSING_TARGET",
          nodeId: el.gsnId,
          message: `${el.gsnId} IN_CONTEXT_OF references missing ${t}.`,
        });
        continue;
      }
      if (!canLink(el.gkType, target.gkType, "IN_CONTEXT_OF")) {
        findings.push({
          severity: "ERROR",
          code: "ILLEGAL_REL",
          nodeId: el.gsnId,
          message: `Illegal IN_CONTEXT_OF from ${el.gkType} ${el.gsnId} to ${target.gkType} ${t}.`,
        });
      }
    }
  }

  // Cycle
  const cycleAt = findSupportCycle(elements);
  if (cycleAt) {
    findings.push({
      severity: "ERROR",
      code: "CYCLE",
      nodeId: cycleAt,
      message: `Cycle detected in SUPPORTED_BY relationships involving ${cycleAt}. The Goal Structure must be a DAG.`,
    });
  }

  // GSN ID uniqueness (map keys already unique; check empty ids)
  for (const el of elements.values()) {
    if (!el.gsnId.trim()) {
      findings.push({
        severity: "ERROR",
        code: "EMPTY_ID",
        nodeId: el.filePath,
        message: `Element ${el.filePath} has empty GSN ID.`,
      });
    }
  }

  // Completeness warnings
  for (const el of elements.values()) {
    if (!reachable.has(el.gsnId) && el.gsnId !== rootId) {
      findings.push({
        severity: "INFO",
        code: "ORPHAN",
        nodeId: el.gsnId,
        message: `${el.gsnId} is not reachable from Root Goal ${rootId}.`,
      });
    }
    if ((el.gkType === "GsnGoal" || el.gkType === "GsnStrategy") && el.supportedBy.length === 0) {
      findings.push({
        severity: "WARNING",
        code: "NO_SUPPORT",
        nodeId: el.gsnId,
        message: `${el.gsnId} has no supporting node.`,
      });
    }
    if (el.gkType === "GsnSolution") {
      if (el.supportedBy.length > 0) {
        findings.push({
          severity: "ERROR",
          code: "SOLUTION_OUTGOING",
          nodeId: el.gsnId,
          message: `${el.gsnId} is a Solution with outgoing SUPPORTED_BY.`,
        });
      }
      if (el.hasEvidence.length === 0) {
        findings.push({
          severity: "WARNING",
          code: "NO_EVIDENCE",
          nodeId: el.gsnId,
          message: `${el.gsnId} is a Solution without evidence — structure cannot be marked complete.`,
        });
      }
    }
    if (!el.statement.trim()) {
      findings.push({
        severity: "WARNING",
        code: "EMPTY_STATEMENT",
        nodeId: el.gsnId,
        message: `${el.gsnId} has an empty statement.`,
      });
    }
    if (el.undeveloped && (el.gkType === "GsnGoal" || el.gkType === "GsnStrategy")) {
      findings.push({
        severity: "INFO",
        code: "UNDEVELOPED",
        nodeId: el.gsnId,
        message: `${el.gsnId} is marked undeveloped.`,
      });
    }
  }

  return findings;
}

function collectSupportEdges(elements: Map<string, GsnElement>): { source: string; target: string }[] {
  const out: { source: string; target: string }[] = [];
  for (const el of elements.values()) {
    for (const t of el.supportedBy) {
      out.push({ source: el.gsnId, target: t });
    }
  }
  return out;
}
