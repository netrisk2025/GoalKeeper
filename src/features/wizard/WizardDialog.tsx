import { useEffect, useState } from "react";
import { useAppStore } from "../../state/store";
import type { GsnType } from "../../core/model/types";

const STEPS: {
  title: string;
  body: string;
  field: string;
  /** How Apply mutates the structure */
  action:
    | { kind: "updateRoot" }
    | { kind: "add"; type: GsnType; rel: "SUPPORTED_BY" | "IN_CONTEXT_OF"; parent: "selection" | "root" | "lastStrategy" };
}[] = [
  {
    title: "Step 1 — Identify the goal",
    body: "State the top claim the argument must support. Prefer a clear, reader-facing claim at the right level of abstraction.",
    field: "Draft goal statement",
    action: { kind: "updateRoot" },
  },
  {
    title: "Step 2 — Basis of the goal",
    body: "What context must the reader share? Definitions, environment, system boundary — capture as Context (or Assumption) notes.",
    field: "Draft context",
    action: { kind: "add", type: "GsnContext", rel: "IN_CONTEXT_OF", parent: "root" },
  },
  {
    title: "Step 3 — Strategy",
    body: "How will you support the claim? Name the inference pattern (e.g. argue over hazards, over components, over lifecycle phases).",
    field: "Draft strategy",
    action: { kind: "add", type: "GsnStrategy", rel: "SUPPORTED_BY", parent: "root" },
  },
  {
    title: "Step 4 — Basis of the strategy",
    body: "Why is this strategy appropriate here? Add Justification or further Context / Assumptions.",
    field: "Draft justification",
    action: { kind: "add", type: "GsnJustification", rel: "IN_CONTEXT_OF", parent: "lastStrategy" },
  },
  {
    title: "Step 5 — Elaborate",
    body: "Break the strategy into supporting sub-goals, then repeat from step 1 for each — or skip to evidence when claims are atomic.",
    field: "Draft sub-goal",
    action: { kind: "add", type: "GsnGoal", rel: "SUPPORTED_BY", parent: "lastStrategy" },
  },
  {
    title: "Step 6 — Solutions & evidence",
    body: "Close claims with Solutions that reference evidence. The wizard will not invent evidence — attach real notes.",
    field: "Draft solution / evidence note",
    action: { kind: "add", type: "GsnSolution", rel: "SUPPORTED_BY", parent: "selection" },
  },
];

function shortName(text: string, fallback: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return fallback;
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
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
  const useDemoVault = useAppStore((s) => s.useDemoVault);
  const createRoot = useAppStore((s) => s.createRoot);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [lastStrategyId, setLastStrategyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setStep(0);
      setDraft("");
      setLastStrategyId(null);
    }
  }, [open]);

  if (!open) return null;
  const s = STEPS[step];

  const resolveParent = (mode: "selection" | "root" | "lastStrategy"): string | null => {
    const st = useAppStore.getState().structure;
    if (!st) return null;
    if (mode === "root") return st.rootId;
    if (mode === "lastStrategy") {
      if (lastStrategyId && st.elements.has(lastStrategyId)) return lastStrategyId;
      // Prefer selected strategy, else root
      const sel = useAppStore.getState().selectedId;
      if (sel) {
        const el = st.elements.get(sel);
        if (el?.gkType === "GsnStrategy") return sel;
        if (el?.gkType === "GsnGoal") return sel;
      }
      return st.rootId;
    }
    return selectedId && st.elements.has(selectedId) ? selectedId : st.rootId;
  };

  /** @returns true if apply succeeded */
  const apply = async (): Promise<boolean> => {
    const text = draft.trim();
    if (!text) {
      setNotice("Enter a draft before Apply, or use Skip.");
      return false;
    }

    // Ensure a structure exists so Apply can always work from a blank start
    let st = useAppStore.getState().structure;
    if (!st) {
      setBusy(true);
      try {
        // Prefer creating a fresh root from draft on step 0; otherwise load demo
        if (step === 0) {
          const ok = await createRoot(shortName(text, "Root Goal"), text);
          if (!ok) return false;
        } else {
          await useDemoVault();
        }
        st = useAppStore.getState().structure;
        if (!st) {
          setNotice("Could not open a Goal Structure. Use Demo vault or New Root Goal first.");
          return false;
        }
      } finally {
        setBusy(false);
      }
    }

    if (s.action.kind === "updateRoot") {
      updateElement(st.rootId, {
        statement: text,
        name: shortName(text, st.elements.get(st.rootId)?.name ?? "Root Goal"),
        undeveloped: false,
      });
      selectNode(st.rootId);
      setNotice("Applied draft to Root Goal.");
      setDraft("");
      return true;
    }

    const { type, rel, parent: parentMode } = s.action;
    const parentId = resolveParent(parentMode);
    if (!parentId) {
      setNotice("No parent node available.");
      return false;
    }

    // Ensure parent is selected for canLink path
    selectNode(parentId);
    const id = addNode(type, rel, {
      parentId,
      name: shortName(text, type.replace("Gsn", "")),
      statement: text,
    });
    if (!id) {
      // notice already set by addNode
      return false;
    }
    if (type === "GsnStrategy") setLastStrategyId(id);
    setNotice(`Created ${type.replace("Gsn", "")} ${id}.`);
    setDraft("");
    return true;
  };

  const onApply = () => {
    void apply();
  };

  const onApplyNext = async () => {
    const ok = await apply();
    if (ok) {
      setDraft("");
      setStep((x) => Math.min(STEPS.length - 1, x + 1));
    }
  };

  return (
    <div className="gk-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div
        className="gk-modal gk-filigree-corner"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Goal Wizard</h2>
        <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
          Optional coaching from the GSN Six-Step Method. Non-prescriptive — Skip anytime.
          {!structure && (
            <span>
              {" "}
              No structure open yet — <strong>Apply</strong> on step 1 will create a Root Goal from your draft.
            </span>
          )}
        </p>
        <div className="gk-ornament-line" style={{ margin: "8px 0 12px" }} />
        <strong>
          {step + 1} / {STEPS.length}: {s.title}
        </strong>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{s.body}</p>
        <label className="gk-label">{s.field}</label>
        <textarea
          className="gk-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Type your draft here…"
          disabled={busy}
        />
        <div className="gk-modal-actions">
          <button className="gk-btn" type="button" onClick={() => setOpen(false)}>
            Close
          </button>
          <button
            className="gk-btn"
            type="button"
            disabled={step === 0 || busy}
            onClick={() => {
              setDraft("");
              setStep((x) => x - 1);
            }}
          >
            Back
          </button>
          <button
            className="gk-btn"
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft("");
              setStep((x) => Math.min(STEPS.length - 1, x + 1));
            }}
          >
            Skip
          </button>
          <button className="gk-btn primary" type="button" disabled={busy} onClick={onApply}>
            Apply
          </button>
          {step < STEPS.length - 1 && (
            <button className="gk-btn primary" type="button" disabled={busy} onClick={() => void onApplyNext()}>
              Apply &amp; next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
