import { useState } from "react";
import { useAppStore } from "../../state/store";

const STEPS = [
  {
    title: "Step 1 — Identify the goal",
    body: "State the top claim the argument must support. Prefer a clear, reader-facing claim at the right level of abstraction.",
    field: "Draft goal statement",
  },
  {
    title: "Step 2 — Basis of the goal",
    body: "What context must the reader share? Definitions, environment, system boundary — capture as Context (or Assumption) notes.",
    field: "Draft context",
  },
  {
    title: "Step 3 — Strategy",
    body: "How will you support the claim? Name the inference pattern (e.g. argue over hazards, over components, over lifecycle phases).",
    field: "Draft strategy",
  },
  {
    title: "Step 4 — Basis of the strategy",
    body: "Why is this strategy appropriate here? Add Justification or further Context / Assumptions.",
    field: "Draft justification",
  },
  {
    title: "Step 5 — Elaborate",
    body: "Break the strategy into supporting sub-goals, then repeat from step 1 for each — or skip to evidence when claims are atomic.",
    field: "Draft sub-goal",
  },
  {
    title: "Step 6 — Solutions & evidence",
    body: "Close claims with Solutions that reference evidence. The wizard will not invent evidence — attach real notes.",
    field: "Draft solution / evidence note",
  },
];

export function WizardDialog() {
  const open = useAppStore((s) => s.wizardOpen);
  const setOpen = useAppStore((s) => s.setWizardOpen);
  const structure = useAppStore((s) => s.structure);
  const selectedId = useAppStore((s) => s.selectedId);
  const updateElement = useAppStore((s) => s.updateElement);
  const addNode = useAppStore((s) => s.addNode);
  const setNotice = useAppStore((s) => s.setNotice);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");

  if (!open) return null;
  const s = STEPS[step];

  const apply = () => {
    if (!structure) {
      setNotice("Open or create a Root Goal first.");
      return;
    }
    const text = draft.trim();
    if (!text) {
      setNotice("Enter a draft before Apply, or Skip.");
      return;
    }
    const target = selectedId ?? structure.rootId;
    if (step === 0) {
      updateElement(structure.rootId, { statement: text, undeveloped: false });
      setNotice("Applied draft to Root Goal statement.");
    } else if (step === 1) {
      addNode("GsnContext", "IN_CONTEXT_OF");
      // name/statement applied after create is best-effort: user can edit in detail
      setNotice("Created Context node — set its statement in the detail panel if needed.");
      // apply statement to newly selected in next tick
      setTimeout(() => {
        const id = useAppStore.getState().selectedId;
        if (id) updateElement(id, { statement: text, name: text.slice(0, 40), undeveloped: false });
      }, 0);
    } else if (step === 2) {
      addNode("GsnStrategy", "SUPPORTED_BY");
      setTimeout(() => {
        const id = useAppStore.getState().selectedId;
        if (id) updateElement(id, { statement: text, name: text.slice(0, 40), undeveloped: false });
      }, 0);
      setNotice("Created Strategy from draft.");
    } else if (step === 3) {
      addNode("GsnJustification", "IN_CONTEXT_OF");
      setTimeout(() => {
        const id = useAppStore.getState().selectedId;
        if (id) updateElement(id, { statement: text, name: text.slice(0, 40) });
      }, 0);
    } else if (step === 4) {
      addNode("GsnGoal", "SUPPORTED_BY");
      setTimeout(() => {
        const id = useAppStore.getState().selectedId;
        if (id) updateElement(id, { statement: text, name: text.slice(0, 40), undeveloped: true });
      }, 0);
    } else {
      addNode("GsnSolution", "SUPPORTED_BY");
      setTimeout(() => {
        const id = useAppStore.getState().selectedId;
        if (id) updateElement(id, { statement: text, name: text.slice(0, 40), undeveloped: false });
      }, 0);
      setNotice("Created Solution — attach Evidence in Evidence mode.");
    }
    void target;
    setDraft("");
  };

  return (
    <div className="gk-modal-backdrop" role="dialog" aria-modal="true">
      <div className="gk-modal gk-filigree-corner">
        <h2>Goal Wizard</h2>
        <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
          Optional coaching from the GSN Six-Step Method. Non-prescriptive — Skip anytime.
        </p>
        <div className="gk-ornament-line" style={{ margin: "8px 0 12px" }} />
        <strong>
          {step + 1} / {STEPS.length}: {s.title}
        </strong>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{s.body}</p>
        <label className="gk-label">{s.field}</label>
        <textarea className="gk-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
        <div className="gk-modal-actions">
          <button className="gk-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <button className="gk-btn" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>
            Back
          </button>
          <button className="gk-btn" onClick={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))}>
            Skip
          </button>
          <button className="gk-btn primary" onClick={apply}>
            Apply
          </button>
          {step < STEPS.length - 1 && (
            <button
              className="gk-btn primary"
              onClick={() => {
                apply();
                setStep((x) => x + 1);
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
