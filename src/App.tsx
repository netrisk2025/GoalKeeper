import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "./state/store";
import { IconClose } from "./components/Icon";
import { GearMenu } from "./components/GearMenu";
import { OpenVaultDialog } from "./components/OpenVaultDialog";
import { GsnCanvas } from "./features/structure/GsnCanvas";
import { DetailPanel } from "./features/structure/DetailPanel";
import { WizardDialog } from "./features/wizard/WizardDialog";
import { exportJson, exportMarkdown } from "./core/export/report";
import { displayTypeName } from "./core/model/types";
import { suggestRootDir, openFireSatVault } from "./lib/fs";
import { ColorsDialog } from "./features/structure/ColorsDialog";
import { ModelDialog } from "./features/structure/ModelDialog";
import { exportSvg } from "./core/presentation/svg";
import { resolveEvidence } from "./core/vault/load";
import { FIRESAT_CASE_STATUS } from "./examples/firesat";

export default function App() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const ready = useAppStore((s) => s.ready);
  const backend = useAppStore((s) => s.backend);
  const vaultPath = useAppStore((s) => s.vaultPath);
  const roots = useAppStore((s) => s.roots);
  const structure = useAppStore((s) => s.structure);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const useDemoVault = useAppStore((s) => s.useDemoVault);
  const openRoot = useAppStore((s) => s.openRoot);
  const createRoot = useAppStore((s) => s.createRoot);
  const selectedId = useAppStore((s) => s.selectedId);
  const selectNode = useAppStore((s) => s.selectNode);
  const workingPositions = useAppStore((s) => s.workingPositions);
  const setPosition = useAppStore((s) => s.setPosition);
  const contentDirty = useAppStore((s) => s.contentDirty);
  const layoutDirty = useAppStore((s) => s.layoutDirty);
  const saveContent = useAppStore((s) => s.saveContent);
  const saveLayout = useAppStore((s) => s.saveLayout);
  const restoreLastSaved = useAppStore((s) => s.restoreLastSaved);
  const findings = useAppStore((s) => s.findings);
  const notice = useAppStore((s) => s.notice);
  const setNotice = useAppStore((s) => s.setNotice);
  const setWizardOpen = useAppStore((s) => s.setWizardOpen);
  const revealToken = useAppStore((s) => s.revealToken);
  const graphEpoch = useAppStore((s) => s.graphEpoch);

  const [outlineOpen, setOutlineOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [colorsReturnId, setColorsReturnId] = useState("gk-view-trigger");
  const [viewOpen, setViewOpen] = useState(false);
  const autoLayout = useAppStore(s => s.autoLayout);
  const mayLeaveCase = () => {
    const current = useAppStore.getState();
    return !(current.contentDirty || current.layoutDirty) || window.confirm("Leave this argument and discard its unsaved content or layout changes?");
  };
  const switchRoot = (rootDir: string) => { if (rootDir !== structure?.rootDir && mayLeaveCase()) void openRoot(rootDir); };
  const openDemo = () => { if (mayLeaveCase()) void useDemoVault(); };
  const openFireSat = async () => {
    if (!mayLeaveCase()) return;
    const path = openFireSatVault();
    if (!await useAppStore.getState().openVaultAt(path, "memory")) return;
    setNotice(FIRESAT_CASE_STATUS);
    setInspectorOpen(false); setOutlineOpen(false); setMode("structure");
  };
  const inspect = (id: string | null) => { selectNode(id); if (id) setInspectorOpen(true); };
  const jumpToNode = (id: string) => { setMode("structure"); inspect(id); };
  const [openVaultUi, setOpenVaultUi] = useState(false);
  const [newRootOpen, setNewRootOpen] = useState(false);
  const [rootName, setRootName] = useState("");
  const [rootStatement, setRootStatement] = useState("");
  const [rootDir, setRootDir] = useState("");
  const [dirTouched, setDirTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  const existingRootDirs = useMemo(() => roots.map((r) => r.rootDir), [roots]);
  const suggestedDir = useMemo(
    () => suggestRootDir(rootName || "Root-Goal", existingRootDirs),
    [rootName, existingRootDirs],
  );

  useEffect(() => {
    if (newRootOpen && !dirTouched) {
      setRootDir(suggestedDir);
    }
  }, [newRootOpen, suggestedDir, dirTouched]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void saveContent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveContent]);

  useEffect(() => {
    const warnOnClose = (event: BeforeUnloadEvent) => {
      if (!contentDirty && !layoutDirty) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnOnClose);
    return () => window.removeEventListener("beforeunload", warnOnClose);
  }, [contentDirty, layoutDirty]);

  const errorIds = useMemo(
    () => new Set(findings.filter((f) => f.severity === "ERROR" && f.nodeId).map((f) => f.nodeId!)),
    [findings],
  );

  if (!ready) {
    return (
      <div className="gk-welcome">
        <p>Loading GoalKeeper…</p>
      </div>
    );
  }

  return (
    <div className="gk-app">
      <header className="gk-banner">
        <img className="gk-banner-logo" src="/branding/goalkeeper-icon.jpg" alt="GoalKeeper" />
        <div>
          <div className="gk-banner-title">GoalKeeper</div>
          <div className="gk-mono" style={{ fontSize: "0.68rem", color: "var(--gk-muted)" }}>
            {vaultPath ? (backend === "memory" ? "Session vault · export to keep a copy" : "Local vault") : "ASSURANCE CASE STUDIO"}
          </div>
        </div>
        <nav className="gk-menubar" aria-label="Application menu">
          <div className="gk-view-menu">
            <button id="gk-view-trigger" className="gk-btn" aria-haspopup="menu" aria-expanded={viewOpen} onClick={() => setViewOpen(!viewOpen)} onKeyDown={e => { if(e.key === "Escape") setViewOpen(false); }}>View</button>
            {viewOpen && <div className="gk-gear-menu" role="menu" onKeyDown={e => { if(e.key === "Escape") { setViewOpen(false); (e.currentTarget.previousElementSibling as HTMLElement)?.focus(); } }}>
              <button className="gk-gear-item" role="menuitem" disabled={!structure} onClick={() => { setViewOpen(false); setModelOpen(true); }}>SysML / KerML equivalent…</button>
              <button className="gk-gear-item" role="menuitem" disabled={!structure} onClick={() => { setViewOpen(false); setColorsReturnId("gk-view-trigger"); setColorsOpen(true); }}>Node type colors…</button>
              <button className="gk-gear-item" role="menuitem" onClick={() => { setOutlineOpen(!outlineOpen); setViewOpen(false); }}>Toggle argument outline</button>
              <button className="gk-gear-item" role="menuitem" onClick={() => { setInspectorOpen(!inspectorOpen); setViewOpen(false); }}>Toggle inspector</button>
              <button className="gk-gear-item" role="menuitem" onClick={() => { setInspectorOpen(false); setOutlineOpen(false); setMode("structure"); setViewOpen(false); }}>Presentation view</button>
            </div>}
          </div>
        </nav>
        <div className="gk-banner-actions">
          <button type="button" className="gk-btn" onClick={() => setOpenVaultUi(true)}>
            Open vault
          </button>
          <button type="button" className="gk-btn" onClick={openDemo}>
            Sample case
          </button>
          <button
            type="button"
            className="gk-btn"
            onClick={() => {
              setDirTouched(false);
              setRootName("");
              setRootStatement("");
              setRootDir("");
              setNewRootOpen(true);
            }}
          >
            New Root Goal
          </button>
          <button type="button" className="gk-btn" onClick={() => setWizardOpen(true)}>
            Wizard
          </button>
          <button className="gk-btn" onClick={() => void openFireSat()}>FireSat example</button>
          <GearMenu />
        </div>
      </header>

      {notice && (
        <div className="gk-notice" role="status">
          <span>{notice}</span>
          <button type="button" className="gk-btn" onClick={() => setNotice(null)} aria-label="Dismiss">
            <IconClose />
          </button>
        </div>
      )}

      {!vaultPath || !structure ? (
        <div className="gk-welcome">
          <div className="gk-welcome-card gk-empty-flourish">
            <img
              src="/branding/goalkeeper-logo.jpg"
              alt=""
              width={96}
              height={96}
              style={{ borderRadius: 12, border: "1px solid var(--gk-line)" }}
            />
            <div className="gk-eyebrow">CLARITY · EVIDENCE · ASSURANCE</div>
            <h1>Make the argument clear.</h1>
            <p>
              Craft a structured, readable case for the people who decide. Connect claims to evidence, make assumptions visible, and give every conclusion a traceable foundation.
            </p>
            <div className="gk-ornament-line" style={{ margin: "16px 0" }} />
            <div className="gk-welcome-actions">
              <button className="gk-btn primary" onClick={() => void openFireSat()}>Explore the FireSat argument</button>
              <button type="button" className="gk-btn primary" onClick={() => setOpenVaultUi(true)}>
                Open vault
              </button>
              <button type="button" className="gk-btn" onClick={openDemo}>
                Open demo vault
              </button>
              <button
                type="button"
                className="gk-btn"
                onClick={() => {
                  setDirTouched(false);
                  setRootName("");
                  setRootStatement("");
                  setRootDir("");
                  setNewRootOpen(true);
                }}
              >
                New Root Goal
              </button>
            </div>
            {vaultPath && roots.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="gk-panel-header" style={{ paddingLeft: 0 }}>
                  Root Goals in vault
                </div>
                {roots.map((r) => (
                  <button
                    type="button"
                    key={r.rootDir}
                    className="gk-card"
                    onClick={() => switchRoot(r.rootDir)}
                  >
                    <div className="gk-mono">{r.rootGsnId}</div>
                    <strong>{r.name}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="gk-case-heading"><div><div className="gk-eyebrow">ASSURANCE ARGUMENT</div><h1>{structure.elements.get(structure.rootId)?.name}</h1></div><div className="gk-review-status">{[...structure.elements.values()].filter(e => e.undeveloped).length} open branches <span>· Review in progress</span></div></div>
          <div className="gk-toolbar">
            <select
              aria-label="Select argument"
              className="gk-select"
              style={{ width: 260 }}
              value={structure.rootDir}
              onChange={(e) => switchRoot(e.target.value)}
            >
              {roots.map((r) => (
                <option key={r.rootDir} value={r.rootDir}>
                  {r.rootGsnId} — {r.name}
                </option>
              ))}
            </select>
            <div className="gk-modes">
              {(["structure", "evidence", "validation", "export"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`gk-btn ${mode === m ? "active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                  {m === "validation" && findings.some((f) => f.severity === "ERROR") ? " !" : ""}
                </button>
              ))}
            </div>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="gk-btn primary"
              disabled={!contentDirty}
              onClick={() => void saveContent()}
            >
              Save content
            </button>
          </div>

          <div className={`gk-main ${outlineOpen ? "with-outline" : ""} ${inspectorOpen ? "with-inspector" : ""}`}>
            {outlineOpen && <aside className="gk-panel">
              <div className="gk-panel-header">Outline</div>
              {[...structure.elements.values()]
                .sort((a, b) => a.gsnId.localeCompare(b.gsnId))
                .map((el) => (
                  <button
                    type="button"
                    key={el.gsnId}
                    className={`gk-card ${selectedId === el.gsnId ? "selected" : ""}`}
                    onClick={() => inspect(el.gsnId)}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="gk-mono">{el.gsnId}</span>
                      <span className={`gk-badge ${displayTypeName(el.gkType).toLowerCase()}`}>
                        {displayTypeName(el.gkType)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{el.name}</div>
                  </button>
                ))}
            </aside>}

            <div className="gk-canvas-wrap">
              {mode === "structure" && (
                <>
                  <div className="gk-canvas-toolbar">
                    <button className="gk-btn" onClick={() => setOutlineOpen(!outlineOpen)}>Outline</button>
                    <button className="gk-btn" onClick={() => setInspectorOpen(!inspectorOpen)}>Inspector</button>
                    <button className="gk-btn" onClick={() => void autoLayout()}>Arrange argument</button>
                    <button id="gk-colors-trigger" className="gk-btn" onClick={() => { setColorsReturnId("gk-colors-trigger"); setColorsOpen(true); }}>Colors</button>
                    <button type="button" className="gk-btn primary" onClick={() => void saveLayout()}>
                      Save Layout
                    </button>
                    <button type="button" className="gk-btn" onClick={() => restoreLastSaved()}>
                      Last Saved
                    </button>
                    <span className="gk-mono" style={{ color: "var(--gk-muted)" }}>
                      Working layout · save when ready
                    </span>
                  </div>
                  <GsnCanvas
                    structure={structure}
                    positions={workingPositions}
                    selectedId={selectedId}
                    revealToken={revealToken}
                    graphEpoch={graphEpoch}
                    errorIds={errorIds}
                    onSelect={inspect}
                    onDrag={setPosition}
                  />
                </>
              )}
              {mode === "evidence" && <EvidenceMode onInspect={jumpToNode} />}
              {mode === "validation" && <ValidationMode onInspect={jumpToNode} />}
              {mode === "export" && <ExportMode />}
            </div>

            {inspectorOpen && <div className="gk-inspector"><button className="gk-close-panel gk-btn" onClick={() => setInspectorOpen(false)} aria-label="Close inspector">×</button><DetailPanel /></div>}
          </div>

          <footer className="gk-status">
            <span>{contentDirty ? "Unsaved content" : "Content saved"}</span>
            <span>{layoutDirty ? "Unsaved layout" : "Layout saved"}</span>
            <span>
              Findings: {findings.filter((f) => f.severity === "ERROR").length} err /{" "}
              {findings.filter((f) => f.severity === "WARNING").length} warn
            </span>
            <span className="gk-mono">{selectedId ?? "—"}</span>
          </footer>
        </>
      )}

      <ColorsDialog open={colorsOpen} onClose={() => { setColorsOpen(false); document.getElementById(colorsReturnId)?.focus(); }} />
      <ModelDialog open={modelOpen} onClose={() => { setModelOpen(false); document.getElementById("gk-view-trigger")?.focus(); }} />
      <WizardDialog />
      <OpenVaultDialog beforeOpen={mayLeaveCase} open={openVaultUi} onClose={() => setOpenVaultUi(false)} />

      {newRootOpen && (
        <div
          className="gk-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => !creating && setNewRootOpen(false)}
        >
          <div className="gk-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Root Goal</h2>
            <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
              Creates a subdirectory under the current vault
              {vaultPath ? (
                <>
                  {" "}
                  (<span className="gk-mono">{vaultPath}</span>)
                </>
              ) : (
                " (a browser vault will be created if none is open)"
              )}
              . Suggested directory is derived from the title — edit freely.
            </p>
            <label className="gk-label">Goal title</label>
            <input
              className="gk-input"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              placeholder="e.g. System is acceptably safe"
              autoFocus
              disabled={creating}
            />
            <label className="gk-label">Directory (under vault)</label>
            <input
              className="gk-input"
              value={rootDir}
              onChange={(e) => {
                setDirTouched(true);
                setRootDir(e.target.value);
              }}
              placeholder={suggestedDir}
              disabled={creating}
            />
            <div className="gk-mono" style={{ fontSize: "0.72rem", color: "var(--gk-muted)", marginTop: 4 }}>
              Files will be written to: {rootDir.trim() || suggestedDir}/G1.md
            </div>
            <label className="gk-label">Goal statement (claim)</label>
            <textarea
              className="gk-textarea"
              value={rootStatement}
              onChange={(e) => setRootStatement(e.target.value)}
              placeholder="The full claim this argument will support"
              disabled={creating}
            />
            <div className="gk-modal-actions">
              <button
                type="button"
                className="gk-btn"
                disabled={creating}
                onClick={() => setNewRootOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gk-btn primary"
                disabled={creating || !rootName.trim()}
                onClick={() => {
                  if (!mayLeaveCase()) return;
                  setCreating(true);
                  const dir = rootDir.trim() || suggestedDir;
                  void createRoot(rootName.trim(), rootStatement, dir)
                    .then((ok) => {
                      if (ok) {
                        setNewRootOpen(false);
                        setRootName("");
                        setRootStatement("");
                        setRootDir("");
                        setDirTouched(false);
                      }
                    })
                    .finally(() => setCreating(false));
                }}
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceMode({ onInspect }: { onInspect: (id: string) => void }) {
  const structure = useAppStore((s) => s.structure)!;
  const solutions = [...structure.elements.values()].filter((e) => e.gkType === "GsnSolution");
  return (
    <div style={{ overflow: "auto", padding: 12, flex: 1 }}>
      <h3 style={{ marginTop: 0 }}>Solutions &amp; evidence</h3>
      {solutions.length === 0 && <p style={{ color: "var(--gk-muted)" }}>No Solution nodes.</p>}
      {solutions.map((s) => (
        <div key={s.gsnId} className="gk-card" style={{ width: "100%", cursor: "default" }}>
          <button type="button" className="gk-btn" onClick={() => onInspect(s.gsnId)}>
            {s.gsnId}
          </button>{" "}
          <strong>{s.name}</strong>
          <div style={{ marginTop: 6, fontSize: "0.85rem" }}>{s.statement}</div>
          <div style={{ marginTop: 8 }}>
            {s.hasEvidence.length === 0 ? (
              <span style={{ color: "var(--gk-status-warn)" }}>incomplete — no evidence</span>
            ) : (
              s.hasEvidence.map((reference) => {
                const evidence = resolveEvidence(structure, reference);
                return evidence ? <details key={reference} className="gk-evidence-source">
                  <summary>{evidence.name} <span className="gk-mono">· {evidence.kind}</span></summary>
                  <p>{evidence.statement}</p>
                  <p className="gk-mono">{evidence.filePath}{evidence.artifactPath ? ` · Artifact: ${evidence.artifactPath}` : ""}</p>
                  {evidence.metadata && <pre className="gk-pre">{JSON.stringify(evidence.metadata, null, 2)}</pre>}
                </details> : <p key={reference}>Unresolved evidence: {reference}</p>;
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationMode({ onInspect }: { onInspect: (id: string) => void }) {
  const findings = useAppStore((s) => s.findings);
  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      <div className="gk-panel-header">Validation</div>
      {findings.length === 0 && (
        <p className="gk-card" style={{ cursor: "default" }}>
          No structural findings. Evidence sufficiency and acceptance still require independent review.
        </p>
      )}
      {findings.map((f, i) => (
        <div key={i} className={`gk-finding ${f.severity}`}>
          <strong>{f.severity}</strong> <span className="gk-mono">{f.code}</span>
          <div>{f.message}</div>
          {f.nodeId && (
            <button type="button" className="gk-btn" style={{ marginTop: 6 }} onClick={() => onInspect(f.nodeId!)}>
              Go to {f.nodeId}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ExportMode() {
  const structure = useAppStore((s) => s.structure)!;
  const findings = useAppStore((s) => s.findings);
  const md = exportMarkdown(structure, findings);
  const json = exportJson(structure, findings);
  const positions = useAppStore(s => s.workingPositions);
  const nodeStyles = useAppStore(s => s.nodeStyles), theme = useAppStore(s => s.theme);
  const [tab, setTab] = useState<"md" | "json">("md");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="gk-canvas-toolbar">
        <button className="gk-btn" onClick={() => {
          const url = URL.createObjectURL(new Blob([exportSvg(structure, positions, { theme, nodeStyles })], { type: "image/svg+xml" }));
          const a = document.createElement("a"); a.href = url; a.download = `${structure.rootDir}-gsn.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Download GSN figure (SVG)</button>
        <button type="button" className={`gk-btn ${tab === "md" ? "active" : ""}`} onClick={() => setTab("md")}>
          Markdown
        </button>
        <button type="button" className={`gk-btn ${tab === "json" ? "active" : ""}`} onClick={() => setTab("json")}>
          JSON
        </button>
        <button
          type="button"
          className="gk-btn primary"
          onClick={() => {
            const blob = new Blob([tab === "md" ? md : json], {
              type: tab === "md" ? "text/markdown" : "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${structure.rootId}-gsn.${tab === "md" ? "md" : "json"}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          Download
        </button>
      </div>
      <pre className="gk-pre">{tab === "md" ? md : json}</pre>
    </div>
  );
}
