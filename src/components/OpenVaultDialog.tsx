import { useMemo, useState } from "react";
import {
  listMemoryVaultIds,
  suggestVaultName,
  supportsDirectoryPicker,
  isTauriRuntime,
} from "../lib/fs";
import { useAppStore } from "../state/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OpenVaultDialog({ open, onClose }: Props) {
  const openVault = useAppStore((s) => s.openVault);
  const openNamedVault = useAppStore((s) => s.openNamedVault);
  const useDemoVault = useAppStore((s) => s.useDemoVault);
  const setNotice = useAppStore((s) => s.setNotice);

  const existing = useMemo(() => listMemoryVaultIds(), [open]);
  const suggestion = useMemo(() => suggestVaultName(), [open]);
  const [name, setName] = useState(suggestion);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const canNative = supportsDirectoryPicker() || isTauriRuntime();

  return (
    <div className="gk-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="gk-modal gk-filigree-corner" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2>Open vault</h2>
        <p style={{ color: "var(--gk-muted)", fontSize: "0.85rem", marginTop: 0 }}>
          A vault is a directory of Root Goal folders and markdown GSN notes (Obsidian-compatible).
        </p>

        {canNative && (
          <>
            <button
              type="button"
              className="gk-btn primary"
              style={{ width: "100%", marginBottom: 12 }}
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void openVault()
                  .then(() => {
                    // If still no vault path after cancel, stay open
                    const path = useAppStore.getState().vaultPath;
                    if (path) onClose();
                  })
                  .finally(() => setBusy(false));
              }}
            >
              Choose folder on disk…
            </button>
            <div className="gk-ornament-line" style={{ margin: "8px 0 12px" }} />
          </>
        )}

        {!canNative && (
          <p style={{ fontSize: "0.85rem", color: "var(--gk-muted)" }}>
            This browser has no folder picker. Use a <strong>named browser vault</strong> (stored in
            memory for this session / index in localStorage), or run <code>npm run tauri:dev</code> for
            real directories.
          </p>
        )}

        <label className="gk-label">Suggested vault name</label>
        <input
          className="gk-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestion}
          disabled={busy}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="gk-btn primary"
            disabled={busy || !name.trim()}
            onClick={() => {
              setBusy(true);
              void openNamedVault(name.trim(), { empty: true })
                .then(() => {
                  setNotice(`Opened vault “${name.trim()}”.`);
                  onClose();
                })
                .finally(() => setBusy(false));
            }}
          >
            Create / open named vault
          </button>
          <button
            type="button"
            className="gk-btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void useDemoVault()
                .then(() => onClose())
                .finally(() => setBusy(false));
            }}
          >
            Open demo vault
          </button>
        </div>

        {existing.length > 0 && (
          <>
            <div className="gk-panel-header" style={{ paddingLeft: 0, marginTop: 16 }}>
              Recent browser vaults
            </div>
            {existing.map((id) => (
              <button
                type="button"
                key={id}
                className="gk-card"
                style={{ width: "100%" }}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void openNamedVault(id)
                    .then(() => onClose())
                    .finally(() => setBusy(false));
                }}
              >
                <span className="gk-mono">{id}</span>
              </button>
            ))}
          </>
        )}

        <div className="gk-modal-actions">
          <button type="button" className="gk-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
