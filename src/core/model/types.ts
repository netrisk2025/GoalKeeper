/** Core GSN + Evidence types (Architecture §4.1). Pure — no React/Tauri. */

export type GsnType =
  | "GsnGoal"
  | "GsnStrategy"
  | "GsnSolution"
  | "GsnContext"
  | "GsnAssumption"
  | "GsnJustification";

export type ElementType = GsnType | "Evidence";

export type EvidenceKind =
  | "Analysis"
  | "Test"
  | "Inspection"
  | "Demonstration"
  | "Document"
  | "Other";

export type RelType = "SUPPORTED_BY" | "IN_CONTEXT_OF" | "HAS_EVIDENCE";

export interface GsnElement {
  /** Vault-relative path, e.g. `MyRoot/G1.md` */
  filePath: string;
  gkType: GsnType;
  gsnId: string;
  name: string;
  statement: string;
  isRoot: boolean;
  undeveloped: boolean;
  /** Target gsnIds (SupportedBy) */
  supportedBy: string[];
  /** Target gsnIds (InContextOf) */
  inContextOf: string[];
  /** Evidence note keys / paths (Solutions) */
  hasEvidence: string[];
  created?: string;
  modified?: string;
}

export interface EvidenceNote {
  filePath: string;
  name: string;
  statement: string;
  kind: EvidenceKind;
  artifactPath?: string;
  created?: string;
  modified?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface LayoutDoc {
  schemaVersion: 1;
  rootGsnId: string;
  tool: "goalkeeper";
  savedAt?: string;
  viewport: ViewportState;
  nodes: Record<string, NodePosition>;
  display?: {
    showEvidenceBadges?: boolean;
  };
}

export interface GoalStructure {
  rootId: string;
  /** Vault-relative directory for this Root Goal */
  rootDir: string;
  elements: Map<string, GsnElement>;
  evidence: Map<string, EvidenceNote>;
  layout: LayoutDoc;
}

export type FindingSeverity = "ERROR" | "WARNING" | "INFO";

export interface Finding {
  severity: FindingSeverity;
  nodeId?: string;
  message: string;
  code: string;
}

export interface RootGoalSummary {
  rootDir: string;
  rootGsnId: string;
  name: string;
  statement: string;
  filePath: string;
}

export const GSN_TYPES: GsnType[] = [
  "GsnGoal",
  "GsnStrategy",
  "GsnSolution",
  "GsnContext",
  "GsnAssumption",
  "GsnJustification",
];

export const ID_PREFIX: Record<GsnType, string> = {
  GsnGoal: "G",
  GsnStrategy: "S",
  GsnSolution: "Sn",
  GsnContext: "C",
  GsnAssumption: "A",
  GsnJustification: "J",
};

export function statementProp(type: GsnType): string {
  switch (type) {
    case "GsnStrategy":
      return "StrategyStatement";
    case "GsnContext":
      return "ContextStatement";
    case "GsnJustification":
      return "JustificationStatement";
    case "GsnAssumption":
      return "AssumptionStatement";
    case "GsnSolution":
      return "SolutionStatement";
    default:
      return "GoalStatement";
  }
}

export function displayTypeName(type: GsnType): string {
  return type.replace("Gsn", "");
}

export function emptyLayout(rootGsnId: string): LayoutDoc {
  return {
    schemaVersion: 1,
    rootGsnId,
    tool: "goalkeeper",
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: {},
    display: { showEvidenceBadges: true },
  };
}
