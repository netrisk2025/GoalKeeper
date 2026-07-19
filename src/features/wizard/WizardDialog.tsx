import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import type { GsnElement, GsnType } from "../../core/model/types";

type StepAction =
  | { kind: "updateFocus" }
  | {
      kind: "add";
      type: GsnType;
      rel: "SUPPORTED_BY" | "IN_CONTEXT_OF";
      parent: "focus" | "lastStrategy" | "selection";
    }
  | { kind: "branchPick" };

const STEPS: {
  title: string;
  body: string;
  titleLabel: string;
  statementLabel: string;
  action: StepAction;
}[] = [
  {
    title: "Step 1 — Identify / refine this goal",
    body: "Working on the current goal in this recursion. Set or refine its title and claim. (GSN six-step starts at a goal — not always the vault root.)",
    titleLabel: "Goal title",
    statementLabel: "Goal statement (claim)",
    action: { kind: "updateFocus" },
  },
  {
    title: "Step 2 — Basis of this goal",
    body: "Context the reader needs for this goal: definitions, environment, system boundary.",
    titleLabel: "Context title",
    statementLabel: "Context statement",
    action: { kind: "add", type: "GsnContext", rel: "IN_CONTEXT_OF", parent: "focus" },
  },
  {
    title: "Step 3 — Strategy for this goal",
    body: "How will you support this goal? Name the inference pattern.",
    titleLabel: "Strategy title",
    statementLabel: "Strategy statement",
    action: { kind: "add", type: "GsnStrategy", rel: "SUPPORTED_BY", parent: "focus" },
  },
  {
    title: "Step 4 — Basis of the strategy",
    body: "Why is this strategy appropriate here?",
    titleLabel: "Justification title",
    statementLabel: "Justification statement",
    action: { kind: "add", type: "GsnJustification", rel: "IN_CONTEXT_OF", parent: "lastStrategy" },
  },
  {
    title: "Step 5 — Elaborate (sub-goal)",
    body: "Add a supporting sub-goal under the strategy. You may Apply multiple times to add siblings, then continue.",
    titleLabel: "Sub-goal title",
    statementLabel: "Sub-goal statement (claim)",
    action: { kind: "add", type: "GsnGoal", rel: "SUPPORTED_BY", parent: "lastStrategy" },
  },
  {
    title: "Step 6 — Solution / evidence",
    body: "Close a leaf claim with a Solution that references evidence.",
    titleLabel: "Solution title",
    statementLabel: "Solution / evidence statement",
    action: { kind: "add", type: "GsnSolution", rel: "SUPPORTED_BY", parent: "selection" },
  },
  {
    title: "Recurse — choose next branch",
    body: "GSN development is recursive. Pick a sub-goal to run the six-step method again, or close the wizard.",
    titleLabel: "",
    statementLabel: "",
    action: { kind: "branchPick" },
  },
];

function clean(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Nearest Goal to use as the focus of this six-step recursion. */
function resolveFocusGoal(
  structure: { rootId: string; elements: Map<string, GsnElement> },
  selectedId: string | null,
): GsnElement {
  if (selectedId) {
    const sel = structure.elements.get(selectedId);
    if (sel?.gkType === "GsnGoal") return sel;
    // Walk: if strategy/context selected, use parent goal via reverse search
    if (sel) {
      for (const el of structure.elements.values()) {
        if (el.supportedBy.includes(selectedId) || el.inContextOf.includes(selectedId)) {
          if (el.gkType === "GsnGoal") return el;
        }
      }
    }
  }
  return structure.elements.get(structure.rootId)!;
}

function childGoals(
  structure: { elements: Map<string, GsnElement> },
  focusId: string,
  strategyId: string | null,
): GsnElement[] {
  const out: GsnElement[] = [];
  const parents = strategyId
    ? [structure.elements.get(strategyId)].filter(Boolean)
    : [structure.elements.get(focusId)].filter(Boolean);
  for (const p of parents) {
    if (!p) continue;
    for (const id of p.supportedBy) {
      const c = structure.elements.get(id);
      if (c?.gkType === "GsnGoal") out.push(c);
    }
  }
  // Also goals under focus directly
  const focus = structure.elements.get(focusId);
  if (focus) {
    for (const id of focus.supportedBy) {
      const c = structure.elements.get(id);
      if (c?.gkType === "GsnGoal" && !out.some((x) => x.gsnId === c.gsnId)) out.push(c);
      if (c?.gkType === "GsnStrategy") {
        for (const sid of c.supportedBy) {
          const g = structure.elements.get(sid);
          if (g?.gkType === "GsnGoal" && !out.some((x) => x.gsnId === g.gsnId)) out.push(g);
        }
      }
    }
  }
  return out;
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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [lastStrategyId, setLastStrategyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pick up current selection when wizard opens (do not force a new root)
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setLastStrategyId(null);
    const st = useAppStore.getState().structure;
    const sel = useAppStore.getState().selectedId;
    if (st) {
      const focus = resolveFocusGoal(st, sel);
      setFocusId(focus.gsnId);
      setTitle(focus.name);
      setStatement(focus.statement);
      selectNode(focus.gsnId);
    } else {
      setFocusId(null);
      setTitle("");
      setStatement("");
    }
  }, [open, selectNode]);

  const focusEl = useMemo(() => {
    if (!structure || !focusId) return null;
    return structure.elements.get(focusId) ?? null;
  }, [structure, focusId]);

  const branches = useMemo(() => {
    if (!structure || !focusId) return [];
    return childGoals(structure, focusId, lastStrategyId);
  }, [structure, focusId, lastStrategyId, step]); // step to refresh after adds

  if (!open) return null;
  const s = STEPS[step];
  const isBranchStep = s.action.kind === "branchPick";

  const clearFields = () => {
    setTitle("");
    setStatement("");
  };

  const resolveParent = (mode: "focus" | "lastStrategy" | "selection"): string | null => {
    const st = useAppStore.getState().structure;
    if (!st) return null;
    if (mode === "focus") return focusId ?? st.rootId;
    if (mode === "lastStrategy") {
      if (lastStrategyId && st.elements.has(lastStrategyId)) return lastStrategyId;
      // strategy under focus
      const f = focusId ? st.elements.get(focusId) : null;
      if (f) {
        for (const id of f.supportedBy) {
          const el = st.elements.get(id);
          if (el?.gkType === "GsnStrategy") return id;
        }
      }
      return focusId ?? st.rootId;
    }
    // selection: prefer selected goal/strategy under this recursion
    const sel = useAppStore.getState().selectedId;
    if (sel) {
      const el = st.elements.get(sel);
      if (el && (el.gkType === "GsnGoal" || el.gkType === "GsnStrategy")) return sel;
    }
    if (lastStrategyId && st.elements.has(lastStrategyId)) return lastStrategyId;
    return focusId ?? st.rootId;
  };

  const apply = async (): Promise<boolean> => {
    if (isBranchStep) {
      setNotice("Select a sub-goal branch below to recurse, or Close.");
      return false;
    }

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

      // No structure at all: only then create a Root Goal
      if (!st) {
        const ok = await createRoot(t, body);
        if (!ok) return false;
        st = useAppStore.getState().structure;
        if (!st) return false;
        setFocusId(st.rootId);
        setNotice(`Root Goal “${t}” created — continue the six-step on this goal.`);
        clearFields();
        setTitle(t);
        setStatement(body);
        return true;
      }

      const focus = focusId && st.elements.has(focusId) ? focusId : resolveFocusGoal(st, selectedId).gsnId;
      if (!focusId) setFocusId(focus);

      if (s.action.kind === "updateFocus") {
        updateElement(focus, { name: t, statement: body, undeveloped: false });
        selectNode(focus);
        setNotice(`Updated goal “${t}” (${focus}).`);
        // keep fields as current goal for reference but allow next step with clear
        return true;
      }

      if (s.action.kind !== "add") return false;

      const { type, rel, parent: parentMode } = s.action;
      const parentId = resolveParent(parentMode);
      if (!parentId) {
        setNotice("No parent node available.");
        return false;
      }

      selectNode(parentId);
      const id = addNode(type, rel, { parentId, name: t, statement: body });
      if (!id) return false;
      if (type === "GsnStrategy") setLastStrategyId(id);
      if (type === "GsnGoal") selectNode(id);
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

  const startRecursionOn = (goal: GsnElement) => {
    setFocusId(goal.gsnId);
    selectNode(goal.gsnId);
    setLastStrategyId(null);
    setStep(0);
    setTitle(goal.name);
    setStatement(goal.statement);
    setNotice(`Wizard recursion: now elaborating “${goal.name}” (${goal.gsnId}).`);
  };

  return (
    <div className="gk-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="gk-modal gk-filigree-corner" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2>Goal Wizard</h2>
        <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
          Six-step method for <strong>one goal recursion</strong>.{" "}
          {focusEl ? (
            <>
              Focus: <span className="gk-mono">{focusEl.gsnId}</span> — {focusEl.name}
            </>
          ) : (
            <>No structure yet — Apply on step 1 creates a Root Goal.</>
          )}
        </p>
        <div className="gk-ornament-line" style={{ margin: "8px 0 12px" }} />
        <strong>
          {step + 1} / {STEPS.length}: {s.title}
        </strong>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{s.body}</p>

        {!isBranchStep && (
          <>
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
          </>
        )}

        {isBranchStep && (
          <div style={{ marginTop: 8 }}>
            {branches.length === 0 ? (
              <p style={{ color: "var(--gk-muted)", fontSize: "0.9rem" }}>
                No sub-goals under this focus yet. Go back to step 5 to add sub-goals, or Close.
              </p>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem" }}>Select a branch to elaborate next:</p>
                {branches.map((g) => (
                  <button
                    type="button"
                    key={g.gsnId}
                    className="gk-card"
                    style={{ width: "100%" }}
                    onClick={() => startRecursionOn(g)}
                  >
                    <span className="gk-mono">{g.gsnId}</span>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--gk-muted)" }}>
                      {g.statement.slice(0, 120)}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        <div className="gk-modal-actions">
          <button type="button" className="gk-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <button
            type="button"
            className="gk-btn"
            disabled={step === 0 || busy}
            onClick={() => {
              if (!isBranchStep) clearFields();
              setStep((x) => x - 1);
            }}
          >
            Back
          </button>
          {!isBranchStep && (
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
          )}
          {!isBranchStep && (
            <button type="button" className="gk-btn primary" disabled={busy} onClick={() => void apply()}>
              Apply
            </button>
          )}
          {!isBranchStep && step < STEPS.length - 1 && (
            <button
              type="button"
              className="gk-btn primary"
              disabled={busy}
              onClick={() => {
                void apply().then((ok) => {
                  if (ok) {
                    // After updateFocus keep next empty for adds; after add already cleared
                    if (s.action.kind === "updateFocus") clearFields();
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
