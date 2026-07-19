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
import { suggestRootDir } from "./lib/fs";

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
            {vaultPath ? vaultPath : "No vault open"} · {backend}
          </div>
        </div>
        <div className="gk-banner-actions">
          <button type="button" className="gk-btn" onClick={() => setOpenVaultUi(true)}>
            Open vault
          </button>
          <button type="button" className="gk-btn" onClick={() => void useDemoVault()}>
            Demo vault
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
            <h1>GoalKeeper</h1>
            <p>
              Build GSN assurance arguments as a local markdown vault. Open a vault directory, create a
              Root Goal, and grow the argument on the canvas — or start with the demo vault.
            </p>
            <div className="gk-ornament-line" style={{ margin: "16px 0" }} />
            <div className="gk-welcome-actions">
              <button type="button" className="gk-btn primary" onClick={() => setOpenVaultUi(true)}>
                Open vault
              </button>
              <button type="button" className="gk-btn" onClick={() => void useDemoVault()}>
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
                    onClick={() => void openRoot(r.rootDir)}
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
          <div className="gk-toolbar">
            <select
              className="gk-select"
              style={{ width: 260 }}
              value={structure.rootDir}
              onChange={(e) => void openRoot(e.target.value)}
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

          <div className="gk-main">
            <aside className="gk-panel">
              <div className="gk-panel-header">Outline</div>
              {[...structure.elements.values()]
                .sort((a, b) => a.gsnId.localeCompare(b.gsnId))
                .map((el) => (
                  <button
                    type="button"
                    key={el.gsnId}
                    className={`gk-card ${selectedId === el.gsnId ? "selected" : ""}`}
                    onClick={() => selectNode(el.gsnId)}
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
            </aside>

            <div className="gk-canvas-wrap">
              {mode === "structure" && (
                <>
                  <div className="gk-canvas-toolbar">
                    <button type="button" className="gk-btn primary" onClick={() => void saveLayout()}>
                      Save Layout
                    </button>
                    <button type="button" className="gk-btn" onClick={() => restoreLastSaved()}>
                      Last Saved
                    </button>
                    <span className="gk-mono" style={{ color: "var(--gk-muted)" }}>
                      Drag nodes to arrange · progressive reveal on open
                    </span>
                  </div>
                  <GsnCanvas
                    structure={structure}
                    positions={workingPositions}
                    selectedId={selectedId}
                    revealToken={revealToken}
                    graphEpoch={graphEpoch}
                    errorIds={errorIds}
                    onSelect={selectNode}
                    onDrag={setPosition}
                  />
                </>
              )}
              {mode === "evidence" && <EvidenceMode />}
              {mode === "validation" && <ValidationMode />}
              {mode === "export" && <ExportMode />}
            </div>

            <DetailPanel />
          </div>

          <footer className="gk-status">
            <span>{contentDirty ? "Content dirty" : "Content clean"}</span>
            <span>{layoutDirty ? "Layout dirty" : "Layout clean"}</span>
            <span>
              Findings: {findings.filter((f) => f.severity === "ERROR").length} err /{" "}
              {findings.filter((f) => f.severity === "WARNING").length} warn
            </span>
            <span className="gk-mono">{selectedId ?? "—"}</span>
          </footer>
        </>
      )}

      <WizardDialog />
      <OpenVaultDialog open={openVaultUi} onClose={() => setOpenVaultUi(false)} />

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

function EvidenceMode() {
  const structure = useAppStore((s) => s.structure)!;
  const selectNode = useAppStore((s) => s.selectNode);
  const solutions = [...structure.elements.values()].filter((e) => e.gkType === "GsnSolution");
  return (
    <div style={{ overflow: "auto", padding: 12, flex: 1 }}>
      <h3 style={{ marginTop: 0 }}>Solutions &amp; evidence</h3>
      {solutions.length === 0 && <p style={{ color: "var(--gk-muted)" }}>No Solution nodes.</p>}
      {solutions.map((s) => (
        <div key={s.gsnId} className="gk-card" style={{ width: "100%", cursor: "default" }}>
          <button type="button" className="gk-btn" onClick={() => selectNode(s.gsnId)}>
            {s.gsnId}
          </button>{" "}
          <strong>{s.name}</strong>
          <div style={{ marginTop: 6, fontSize: "0.85rem" }}>{s.statement}</div>
          <div style={{ marginTop: 8 }}>
            {s.hasEvidence.length === 0 ? (
              <span style={{ color: "var(--gk-status-warn)" }}>incomplete — no evidence</span>
            ) : (
              s.hasEvidence.map((e) => (
                <div key={e} className="gk-mono" style={{ fontSize: "0.75rem" }}>
                  Evidence: {e}
                  {structure.evidence.get(e) ? ` — ${structure.evidence.get(e)!.kind}` : ""}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationMode() {
  const findings = useAppStore((s) => s.findings);
  const selectNode = useAppStore((s) => s.selectNode);
  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      <div className="gk-panel-header">Validation</div>
      {findings.length === 0 && (
        <p className="gk-card" style={{ cursor: "default" }}>
          No structural findings.
        </p>
      )}
      {findings.map((f, i) => (
        <div key={i} className={`gk-finding ${f.severity}`}>
          <strong>{f.severity}</strong> <span className="gk-mono">{f.code}</span>
          <div>{f.message}</div>
          {f.nodeId && (
            <button type="button" className="gk-btn" style={{ marginTop: 6 }} onClick={() => selectNode(f.nodeId!)}>
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
  const [tab, setTab] = useState<"md" | "json">("md");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="gk-canvas-toolbar">
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
          }}
        >
          Download
        </button>
      </div>
      <pre className="gk-pre">{tab === "md" ? md : json}</pre>
    </div>
  );
}
