import { useEffect, useState } from "react";
import { useAppStore } from "../../state/store";
import type { GsnType } from "../../core/model/types";

type StepAction =
  | { kind: "updateRoot"; needsTitle: true }
  | {
      kind: "add";
      type: GsnType;
      rel: "SUPPORTED_BY" | "IN_CONTEXT_OF";
      parent: "selection" | "root" | "lastStrategy";
      needsTitle: boolean;
    };

const STEPS: {
  title: string;
  body: string;
  titleLabel: string;
  statementLabel: string;
  action: StepAction;
}[] = [
  {
    title: "Step 1 — Identify the goal",
    body: "Give the Root Goal a short title, then state the top claim the argument must support.",
    titleLabel: "Goal title",
    statementLabel: "Goal statement (claim)",
    action: { kind: "updateRoot", needsTitle: true },
  },
  {
    title: "Step 2 — Basis of the goal",
    body: "What context must the reader share? Definitions, environment, system boundary.",
    titleLabel: "Context title",
    statementLabel: "Context statement",
    action: {
      kind: "add",
      type: "GsnContext",
      rel: "IN_CONTEXT_OF",
      parent: "root",
      needsTitle: true,
    },
  },
  {
    title: "Step 3 — Strategy",
    body: "How will you support the claim? Name the inference pattern (e.g. argue over hazards).",
    titleLabel: "Strategy title",
    statementLabel: "Strategy statement",
    action: {
      kind: "add",
      type: "GsnStrategy",
      rel: "SUPPORTED_BY",
      parent: "root",
      needsTitle: true,
    },
  },
  {
    title: "Step 4 — Basis of the strategy",
    body: "Why is this strategy appropriate here? Add Justification (or Context / Assumptions).",
    titleLabel: "Justification title",
    statementLabel: "Justification statement",
    action: {
      kind: "add",
      type: "GsnJustification",
      rel: "IN_CONTEXT_OF",
      parent: "lastStrategy",
      needsTitle: true,
    },
  },
  {
    title: "Step 5 — Elaborate (sub-goal)",
    body: "Break the strategy into supporting sub-goals. Each sub-goal needs its own title and claim.",
    titleLabel: "Sub-goal title",
    statementLabel: "Sub-goal statement (claim)",
    action: {
      kind: "add",
      type: "GsnGoal",
      rel: "SUPPORTED_BY",
      parent: "lastStrategy",
      needsTitle: true,
    },
  },
  {
    title: "Step 6 — Solutions & evidence",
    body: "Close claims with Solutions that reference evidence. Title the solution and describe the evidence reference.",
    titleLabel: "Solution title",
    statementLabel: "Solution / evidence statement",
    action: {
      kind: "add",
      type: "GsnSolution",
      rel: "SUPPORTED_BY",
      parent: "selection",
      needsTitle: true,
    },
  },
];

function clean(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function WizardDialog() {
  const open = useAppStore((s) => s.wizardOpen);
  const setOpen = useAppStore((s) => s.setWizardOpen);
  const structure = useAppStore((s) => s.structure);
  const selectedId = useAppStore((s) => s.selectedId);
  const updateElement = useAppStore((s) => s.updateElement);
  const addNode = useAppStore((s) => s.addNode);
  const selectNode = useAppStore((s) => s.selectNode);
  const setNotice = useAppStore((s) => s.setNotice);
  const createRoot = useAppStore((s) => s.createRoot);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [lastStrategyId, setLastStrategyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setTitle("");
      setStatement("");
      setLastStrategyId(null);
    }
  }, [open]);

  if (!open) return null;
  const s = STEPS[step];

  const clearFields = () => {
    setTitle("");
    setStatement("");
  };

  const resolveParent = (mode: "selection" | "root" | "lastStrategy"): string | null => {
    const st = useAppStore.getState().structure;
    if (!st) return null;
    if (mode === "root") return st.rootId;
    if (mode === "lastStrategy") {
      if (lastStrategyId && st.elements.has(lastStrategyId)) return lastStrategyId;
      const sel = useAppStore.getState().selectedId;
      if (sel) {
        const el = st.elements.get(sel);
        if (el?.gkType === "GsnStrategy" || el?.gkType === "GsnGoal") return sel;
      }
      // Prefer any existing strategy
      for (const el of st.elements.values()) {
        if (el.gkType === "GsnStrategy") return el.gsnId;
      }
      return st.rootId;
    }
    // selection: prefer selected Goal/Strategy, else last strategy, else root
    if (selectedId) {
      const el = st.elements.get(selectedId);
      if (el && (el.gkType === "GsnGoal" || el.gkType === "GsnStrategy")) return selectedId;
    }
    if (lastStrategyId && st.elements.has(lastStrategyId)) return lastStrategyId;
    return st.rootId;
  };

  const apply = async (): Promise<boolean> => {
    const t = clean(title);
    const body = clean(statement);
    if (!t) {
      setNotice("Please enter a title.");
      return false;
    }
    if (!body) {
      setNotice("Please enter a statement.");
      return false;
    }

    setBusy(true);
    try {
      let st = useAppStore.getState().structure;

      // Step 1 with no structure: create Root Goal from title + statement
      if (!st && s.action.kind === "updateRoot") {
        const ok = await createRoot(t, body);
        if (!ok) return false;
        clearFields();
        setNotice(`Root Goal “${t}” created.`);
        return true;
      }

      // Other steps need a structure — create a root first if missing
      if (!st) {
        const ok = await createRoot(t || "Root Goal", body || "Top-level claim.");
        if (!ok) return false;
        st = useAppStore.getState().structure;
        if (!st) {
          setNotice("Could not create a Goal Structure.");
          return false;
        }
        // If we just created root from this step's fields, don't also add another node
        if (s.action.kind === "updateRoot") {
          clearFields();
          return true;
        }
      }

      if (s.action.kind === "updateRoot") {
        updateElement(st.rootId, {
          name: t,
          statement: body,
          undeveloped: false,
        });
        selectNode(st.rootId);
        setNotice(`Root Goal titled “${t}”.`);
        clearFields();
        return true;
      }

      const { type, rel, parent: parentMode } = s.action;
      const parentId = resolveParent(parentMode);
      if (!parentId) {
        setNotice("No parent node available. Open or create a Root Goal first.");
        return false;
      }

      selectNode(parentId);
      const id = addNode(type, rel, {
        parentId,
        name: t,
        statement: body,
      });
      if (!id) return false;
      if (type === "GsnStrategy") setLastStrategyId(id);
      setNotice(`Created ${type.replace("Gsn", "")} “${t}” (${id}).`);
      clearFields();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNotice(`Wizard Apply failed: ${msg}`);
      console.error(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gk-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="gk-modal gk-filigree-corner" onClick={(e) => e.stopPropagation()}>
        <h2>Goal Wizard</h2>
        <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
          Optional coaching from the GSN Six-Step Method. Goals and sub-goals require a{" "}
          <strong>title</strong> and a <strong>statement</strong>.
          {!structure && (
            <span>
              {" "}
              No structure open — Apply on step 1 creates a new Root Goal.
            </span>
          )}
        </p>
        <div className="gk-ornament-line" style={{ margin: "8px 0 12px" }} />
        <strong>
          {step + 1} / {STEPS.length}: {s.title}
        </strong>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{s.body}</p>

        <label className="gk-label">{s.titleLabel}</label>
        <input
          className="gk-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title shown on the canvas"
          disabled={busy}
          autoFocus
        />

        <label className="gk-label">{s.statementLabel}</label>
        <textarea
          className="gk-textarea"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={4}
          placeholder="Full claim or description"
          disabled={busy}
        />

        <div className="gk-modal-actions">
          <button type="button" className="gk-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <button
            type="button"
            className="gk-btn"
            disabled={step === 0 || busy}
            onClick={() => {
              clearFields();
              setStep((x) => x - 1);
            }}
          >
            Back
          </button>
          <button
            type="button"
            className="gk-btn"
            disabled={busy}
            onClick={() => {
              clearFields();
              setStep((x) => Math.min(STEPS.length - 1, x + 1));
            }}
          >
            Skip
          </button>
          <button
            type="button"
            className="gk-btn primary"
            disabled={busy}
            onClick={() => void apply()}
          >
            Apply
          </button>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              className="gk-btn primary"
              disabled={busy}
              onClick={() => {
                void apply().then((ok) => {
                  if (ok) {
                    clearFields();
                    setStep((x) => Math.min(STEPS.length - 1, x + 1));
                  }
                });
              }}
            >
              Apply &amp; next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
