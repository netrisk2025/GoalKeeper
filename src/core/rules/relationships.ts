/** Relationship legality matrix (SRS FR-17–FR-20, RK-1). */

import type { GsnType, RelType } from "../model/types";

export function canLink(
  sourceType: GsnType,
  targetType: GsnType,
  rel: "SUPPORTED_BY" | "IN_CONTEXT_OF",
): boolean {
  if (rel === "SUPPORTED_BY") {
    if (sourceType === "GsnGoal") {
      return targetType === "GsnGoal" || targetType === "GsnStrategy" || targetType === "GsnSolution";
    }
    if (sourceType === "GsnStrategy") {
      return targetType === "GsnGoal" || targetType === "GsnSolution";
    }
    return false;
  }
  // IN_CONTEXT_OF
  if (sourceType === "GsnGoal" || sourceType === "GsnStrategy") {
    return (
      targetType === "GsnContext" ||
      targetType === "GsnAssumption" ||
      targetType === "GsnJustification"
    );
  }
  return false;
}

export function defaultRelFor(sourceType: GsnType, targetType: GsnType): RelType | null {
  if (canLink(sourceType, targetType, "SUPPORTED_BY")) return "SUPPORTED_BY";
  if (canLink(sourceType, targetType, "IN_CONTEXT_OF")) return "IN_CONTEXT_OF";
  return null;
}
