import { useEffect, useState } from "react";
import type { GsnElement, GsnType } from "../../core/model/types";
import { GSN_TYPES, displayTypeName } from "../../core/model/types";
import { canLink } from "../../core/rules/relationships";
import { pathToRoot } from "../../core/graph/reachability";
import { useAppStore } from "../../state/store";

export function DetailPanel() {
  const structure = useAppStore((s) => s.structure);
  const selectedId = useAppStore((s) => s.selectedId);
  const updateElement = useAppStore((s) => s.updateElement);
  const addNode = useAppStore((s) => s.addNode);
  const linkExisting = useAppStore((s) => s.linkExisting);
  const removeLink = useAppStore((s) => s.removeLink);
  const selectNode = useAppStore((s) => s.selectNode);

  const node = structure && selectedId ? structure.elements.get(selectedId) : undefined;
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [newType, setNewType] = useState<GsnType>("GsnStrategy");
  const [rel, setRel] = useState<"SUPPORTED_BY" | "IN_CONTEXT_OF">("SUPPORTED_BY");
  const [linkTarget, setLinkTarget] = useState("");

  useEffect(() => {
    if (!node) return;
    setName(node.name);
    setStatement(node.statement);
  }, [node]);

  if (!structure) {
    return (
      <aside className="gk-panel gk-filigree-corner">
        <div className="gk-panel-header">Detail</div>
        <p style={{ padding: 12, color: "var(--gk-muted)" }}>Open a Root Goal to edit nodes.</p>
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="gk-panel">
        <div className="gk-panel-header">Detail</div>
        <p style={{ padding: 12, color: "var(--gk-muted)" }}>Select a GSN node on the canvas.</p>
      </aside>
    );
  }

  const path = pathToRoot(structure.rootId, node.gsnId, structure.elements);
  const canSupport = node.gkType === "GsnGoal" || node.gkType === "GsnStrategy";
  const linkable = [...structure.elements.values()].filter(
    (n) => n.gsnId !== node.gsnId && canLink(node.gkType, n.gkType, rel),
  );

  return (
    <aside className="gk-panel">
      <div className="gk-panel-header">Detail</div>
      <div style={{ padding: 12 }}>
        <div className="gk-mono" style={{ color: "var(--gk-muted)" }}>
          {node.gsnId}
          {node.isRoot ? " · ROOT" : ""}
        </div>
        <div style={{ marginTop: 4 }}>
          <span className={`gk-badge ${displayTypeName(node.gkType).toLowerCase()}`}>
            {displayTypeName(node.gkType)}
          </span>
        </div>

        {path.length > 1 && (
          <div style={{ marginTop: 10, fontSize: "0.75rem" }}>
            <div style={{ color: "var(--gk-muted)" }}>Path to root</div>
            {path.map((id, i) => (
              <span key={id}>
                {i > 0 && " → "}
                <button className="gk-btn" style={{ padding: "2px 6px" }} onClick={() => selectNode(id)}>
                  {id}
                </button>
              </span>
            ))}
          </div>
        )}

        <label className="gk-label">Title</label>
        <input
          className="gk-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Short title on the canvas"
        />
        <label className="gk-label">Statement</label>
        <textarea
          className="gk-textarea"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={5}
        />
        <label className="gk-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={node.undeveloped}
            onChange={(e) => updateElement(node.gsnId, { undeveloped: e.target.checked })}
          />
          Undeveloped
        </label>
        <button
          className="gk-btn primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => updateElement(node.gsnId, { name, statement })}
        >
          Apply node edits
        </button>

        {canSupport && (
          <>
            <h4 style={{ margin: "16px 0 6px", fontSize: "0.85rem" }}>Add GSN node</h4>
            <select
              className="gk-select"
              value={newType}
              onChange={(e) => setNewType(e.target.value as GsnType)}
            >
              {GSN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {displayTypeName(t)}
                </option>
              ))}
            </select>
            <select
              className="gk-select"
              style={{ marginTop: 6 }}
              value={rel}
              onChange={(e) => setRel(e.target.value as "SUPPORTED_BY" | "IN_CONTEXT_OF")}
            >
              <option value="SUPPORTED_BY">SUPPORTED_BY</option>
              <option value="IN_CONTEXT_OF">IN_CONTEXT_OF</option>
            </select>
            <button
              className="gk-btn"
              style={{ marginTop: 6, width: "100%" }}
              disabled={!canLink(node.gkType, newType, rel)}
              onClick={() => addNode(newType, rel)}
            >
              Create &amp; link
            </button>

            <h4 style={{ margin: "16px 0 6px", fontSize: "0.85rem" }}>Link existing</h4>
            <select
              className="gk-select"
              value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
            >
              <option value="">Select node…</option>
              {linkable.map((n) => (
                <option key={n.gsnId} value={n.gsnId}>
                  {n.gsnId} — {n.name}
                </option>
              ))}
            </select>
            <button
              className="gk-btn"
              style={{ marginTop: 6, width: "100%" }}
              disabled={!linkTarget}
              onClick={() => {
                linkExisting(linkTarget, rel);
                setLinkTarget("");
              }}
            >
              Link
            </button>
          </>
        )}

        <h4 style={{ margin: "16px 0 6px", fontSize: "0.85rem" }}>Outgoing</h4>
        <OutgoingList node={node} onRemove={removeLink} onSelect={selectNode} />
      </div>
    </aside>
  );
}

function OutgoingList({
  node,
  onRemove,
  onSelect,
}: {
  node: GsnElement;
  onRemove: (s: string, t: string, r: "SUPPORTED_BY" | "IN_CONTEXT_OF") => void;
  onSelect: (id: string) => void;
}) {
  const rows = [
    ...node.supportedBy.map((t) => ({ t, rel: "SUPPORTED_BY" as const })),
    ...node.inContextOf.map((t) => ({ t, rel: "IN_CONTEXT_OF" as const })),
  ];
  if (rows.length === 0) {
    return <p style={{ color: "var(--gk-muted)", fontSize: "0.8rem" }}>No outgoing GSN links.</p>;
  }
  return (
    <div>
      {rows.map(({ t, rel }) => (
        <div
          key={`${rel}-${t}`}
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: "0.78rem",
            marginBottom: 4,
          }}
        >
          <button className="gk-btn" style={{ padding: "2px 6px" }} onClick={() => onSelect(t)}>
            {rel} {t}
          </button>
          <button className="gk-btn danger" style={{ padding: "2px 6px" }} onClick={() => onRemove(node.gsnId, t, rel)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
