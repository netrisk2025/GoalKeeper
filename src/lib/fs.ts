/**
 * Filesystem abstraction: Tauri, browser File System Access API, or named in-memory vaults.
 */

import type { VaultFile } from "../core/vault/load";
import { firesatVaultFiles } from "../examples/firesat";

export type FsBackend = "tauri" | "memory" | "fsa";

let backend: FsBackend = "memory";
let vaultRoot: string | null = null;
/** Browser File System Access API directory handle (when backend === "fsa") */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fsaRoot: any = null;
const memory = new Map<string, string>();
let demoSeeded = false;

const VAULT_INDEX_KEY = "goalkeeper.memoryVaults";

/** Retain the active adapter while a candidate directory is being opened. */
export function captureVaultSelection() { return { backend, vaultRoot, fsaRoot }; }
export function restoreVaultSelection(selection: ReturnType<typeof captureVaultSelection>): void {
  backend = selection.backend; vaultRoot = selection.vaultRoot; fsaRoot = selection.fsaRoot;
}
function isMissingFile(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

export function getBackend(): FsBackend {
  return backend;
}

export function getVaultRoot(): string | null {
  return vaultRoot;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function initFs(): Promise<FsBackend> {
  try {
    if (isTauriRuntime()) {
      await import("@tauri-apps/api/core");
      backend = "tauri";
      return backend;
    }
  } catch {
    // fall through
  }
  backend = "memory";
  return backend;
}

function memoryKey(vaultId: string, relPath: string): string {
  return `${vaultId}::${relPath}`;
}

function currentMemoryVaultId(): string {
  if (vaultRoot?.startsWith("memory://")) return vaultRoot.slice("memory://".length);
  return "default";
}

/** List named in-memory vaults known to this browser. */
export function listMemoryVaultIds(): string[] {
  try {
    const raw = localStorage.getItem(VAULT_INDEX_KEY);
    if (!raw) return demoSeeded || memory.size ? ["demo-vault"] : [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function rememberMemoryVault(id: string): void {
  const ids = new Set(listMemoryVaultIds());
  ids.add(id);
  localStorage.setItem(VAULT_INDEX_KEY, JSON.stringify([...ids]));
}

/** Suggest a vault path/name for the UI. */
export function suggestVaultName(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `GoalKeeper-Vault-${stamp}`;
}

/** Suggest a Root Goal directory under the current vault. */
export function suggestRootDir(title: string, existing: string[]): string {
  const base =
    title
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "Root-Goal";
  let dir = base;
  let n = 2;
  while (existing.includes(dir)) {
    dir = `${base}-${n++}`;
  }
  return dir;
}

/** Open or create a named in-memory vault (browser). */
export function openNamedMemoryVault(id: string, opts?: { empty?: boolean; demo?: boolean }): string {
  const safe = id
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "vault";
  vaultRoot = `memory://${safe}`;
  backend = "memory";
  fsaRoot = null;
  rememberMemoryVault(safe);

  if (opts?.demo) {
    // Load demo into this vault id namespace
    seedDemoVaultInto(safe);
  } else if (opts?.empty) {
    // Ensure meta only
    if (!memory.has(memoryKey(safe, ".goalkeeper/vault.json"))) {
      memory.set(
        memoryKey(safe, ".goalkeeper/vault.json"),
        JSON.stringify({ schemaVersion: 1, name: safe, created: new Date().toISOString() }, null, 2),
      );
    }
  }
  return vaultRoot;
}

function seedDemoVaultInto(vaultId: string): void {
  const put = (rel: string, text: string) => memory.set(memoryKey(vaultId, rel), text);
  // Only seed if empty of GSN files
  const hasGsn = [...memory.keys()].some((k) => k.startsWith(`${vaultId}::`) && k.endsWith(".md"));
  if (hasGsn) return;

  put(
    "Safe-System/G1.md",
    `---
gk_schema: 1
gk_type: GsnGoal
gsn_id: G1
name: System is acceptably safe
is_root: true
statement: The system is acceptably safe to operate in the intended environment.
supported_by:
  - "[[S1]]"
in_context_of:
  - "[[C1]]"
undeveloped: false
---
# G1 — System is acceptably safe

The system is acceptably safe to operate in the intended environment.

## Supported By
- [[S1]]

## In Context Of
- [[C1]]
`,
  );
  put(
    "Safe-System/S1.md",
    `---
gk_schema: 1
gk_type: GsnStrategy
gsn_id: S1
name: Argument over hazards
statement: Argue over each identified hazard class.
supported_by:
  - "[[G2]]"
undeveloped: false
---
# S1 — Argument over hazards

Argue over each identified hazard class.

## Supported By
- [[G2]]
`,
  );
  put(
    "Safe-System/G2.md",
    `---
gk_schema: 1
gk_type: GsnGoal
gsn_id: G2
name: Hazard H1 mitigated
statement: Hazard H1 is mitigated to an acceptable level.
supported_by:
  - "[[Sn1]]"
undeveloped: false
---
# G2 — Hazard H1 mitigated

Hazard H1 is mitigated to an acceptable level.

## Supported By
- [[Sn1]]
`,
  );
  put(
    "Safe-System/Sn1.md",
    `---
gk_schema: 1
gk_type: GsnSolution
gsn_id: Sn1
name: Test report TR-1
statement: Formal test report TR-1.
has_evidence:
  - "[[TR-1]]"
undeveloped: false
---
# Sn1 — Test report TR-1

Formal test report TR-1.

## Evidence
- [[TR-1]]
`,
  );
  put(
    "Safe-System/C1.md",
    `---
gk_schema: 1
gk_type: GsnContext
gsn_id: C1
name: Operating environment
statement: Defined operational design domain ODD-1.
undeveloped: false
---
# C1 — Operating environment

Defined operational design domain ODD-1.
`,
  );
  put(
    "Evidence/TR-1.md",
    `---
gk_schema: 1
gk_type: Evidence
name: TR-1
evidence_kind: Test
statement: Illustrative test-report placeholder; no operational test result is asserted.
---
# TR-1

Illustrative test-report placeholder; no operational test result is asserted.
`,
  );
  put(
    ".goalkeeper/vault.json",
    JSON.stringify({ schemaVersion: 1, name: "Demo Vault" }, null, 2),
  );
}

/** Seed (or re-seed) the classic demo vault. */
export function seedDemoVault(force = false): string {
  if (force) {
    // clear demo keys
    for (const k of [...memory.keys()]) {
      if (k.startsWith("demo-vault::") || !k.includes("::")) memory.delete(k);
    }
    demoSeeded = false;
  }
  const path = openNamedMemoryVault("demo-vault", { demo: true });
  demoSeeded = true;
  return path;
}

export async function openMemoryVault(forceReseed = false): Promise<string> {
  return seedDemoVault(forceReseed);
}

/** Open a real directory via browser File System Access API. */
export async function pickBrowserDirectory(): Promise<{ path: string; mode: FsBackend } | null> {
  if (!supportsDirectoryPicker()) return null;
  try {
    // @ts-expect-error showDirectoryPicker is not in all TS libs
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    fsaRoot = handle;
    vaultRoot = `fsa://${handle.name}`;
    backend = "fsa";
    return { path: vaultRoot, mode: "fsa" };
  } catch (e) {
    // user cancelled or denied
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/** Open a directory picker (Tauri / FSA / returns null for caller UI). */
export async function pickVaultDirectory(): Promise<{ path: string; mode: FsBackend } | null> {
  if (backend === "tauri" || isTauriRuntime()) {
    backend = "tauri";
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select GoalKeeper vault directory",
      });
      if (typeof selected === "string" && selected.length > 0) {
        vaultRoot = selected;
        fsaRoot = null;
        return { path: selected, mode: "tauri" };
      }
      return null;
    } catch (e) {
      throw e;
    }
  }
  // Browser: try native directory picker
  const fsa = await pickBrowserDirectory();
  if (fsa) return fsa;
  return null; // caller shows named-vault UI
}

export async function ensureVaultReady(): Promise<string> {
  if (vaultRoot) return vaultRoot;
  if (backend === "tauri" && isTauriRuntime()) {
    throw new Error("No vault open. Use Open vault to choose a directory.");
  }
  return openNamedMemoryVault(suggestVaultName(), { empty: true });
}

function isMemoryBackend(): boolean {
  return backend === "memory" || (!!vaultRoot && vaultRoot.startsWith("memory://"));
}

function isFsaBackend(): boolean {
  return backend === "fsa" && !!fsaRoot;
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  if (!vaultRoot) return [];

  if (isMemoryBackend()) {
    const id = currentMemoryVaultId();
    const out: VaultFile[] = [];
    const prefix = `${id}::`;
    for (const [k, text] of memory) {
      if (k.startsWith(prefix)) {
        out.push({ path: k.slice(prefix.length), text });
      } else if (!k.includes("::") && id === "demo-vault") {
        // legacy flat keys from older builds
        out.push({ path: k, text });
      }
    }
    return out;
  }

  if (isFsaBackend()) {
    return walkFsa(fsaRoot, "");
  }

  const selectedRoot = vaultRoot;
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const out: VaultFile[] = [];
  async function walk(rel: string): Promise<void> {
    const abs = rel ? `${selectedRoot}/${rel}` : selectedRoot!;
    const entries = await readDir(abs);
    for (const e of entries) {
      const name = e.name ?? "";
      if (name.startsWith(".") && name !== ".goalkeeper") continue;
      const childRel = rel ? `${rel}/${name}` : name;
      if (e.isDirectory) {
        if (name === ".obsidian") continue;
        await walk(childRel);
      } else if (name.endsWith(".md") || name.endsWith(".json")) {
        const text = await readTextFile(`${selectedRoot}/${childRel}`);
        out.push({ path: childRel.replace(/\\/g, "/"), text });
      }
    }
  }
  await walk("");
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function walkFsa(dir: any, rel: string): Promise<VaultFile[]> {
  const out: VaultFile[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith(".") && name !== ".goalkeeper") continue;
    const childRel = rel ? `${rel}/${name}` : name;
    if (handle.kind === "directory") {
      if (name === ".obsidian") continue;
      out.push(...(await walkFsa(handle, childRel)));
    } else if (name.endsWith(".md") || name.endsWith(".json")) {
      const file = await handle.getFile();
      const text = await file.text();
      out.push({ path: childRel, text });
    }
  }
  return out;
}

export async function writeVaultFile(relPath: string, text: string): Promise<void> {
  const path = validateVaultPath(relPath);

  if (isMemoryBackend()) {
    const id = currentMemoryVaultId();
    memory.set(memoryKey(id, path), text);
    return;
  }

  if (isFsaBackend()) {
    await writeFsa(fsaRoot, path, text);
    return;
  }

  if (!vaultRoot) throw new Error("No vault open");
  const selectedRoot = vaultRoot;
  const { writeTextFile, mkdir, exists, rename, remove } = await import("@tauri-apps/plugin-fs");
  const parts = path.split("/");
  if (parts.length > 1) {
    const dir = `${selectedRoot}/${parts.slice(0, -1).join("/")}`;
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
  }
  const destination = `${selectedRoot}/${path}`;
  const temporary = `${destination}.tmp-${crypto.randomUUID()}`;
  try {
    await writeTextFile(temporary, text);
    await rename(temporary, destination);
  } catch (error) {
    try { await remove(temporary); } catch { /* preserve original failure */ }
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeFsa(root: any, relPath: string, text: string): Promise<void> {
  const parts = relPath.split("/");
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true });
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(text);
    await writable.close();
  } catch (error) {
    try { await writable.abort(); } catch { /* preserve the original write error */ }
    throw error;
  }
}

export async function readVaultFile(relPath: string): Promise<string | null> {
  const path = validateVaultPath(relPath);
  if (isMemoryBackend()) {
    const id = currentMemoryVaultId();
    return memory.get(memoryKey(id, path)) ?? memory.get(path) ?? null;
  }
  if (isFsaBackend()) {
    try {
      const parts = path.split("/");
      let dir = fsaRoot;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      const fh = await dir.getFileHandle(parts[parts.length - 1]);
      const file = await fh.getFile();
      return await file.text();
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }
  if (!vaultRoot) return null;
  const selectedRoot = vaultRoot;
  const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
  const absolute = `${selectedRoot}/${path}`;
  if (!(await exists(absolute))) return null;
  return await readTextFile(absolute);
}

export async function ensureVaultMeta(): Promise<void> {
  await ensureVaultReady();
  const existing = await readVaultFile(".goalkeeper/vault.json");
  if (!existing) {
    await writeVaultFile(
      ".goalkeeper/vault.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          name: vaultRoot?.replace(/^(memory|fsa):\/\//, "") ?? "GoalKeeper Vault",
          created: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }
}

/** Reject path escapes before reaching any storage adapter. */
export function validateVaultPath(path: string): string {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.includes("\\") || path.includes("\0") || path.split("/").some(p => p === ".." || p === "." || !p)) {
    throw new Error("Use a relative file path inside the selected vault.");
  }
  return path;
}
export async function deleteVaultFile(relPath: string): Promise<void> {
  const path = validateVaultPath(relPath);
  if (isMemoryBackend()) { memory.delete(memoryKey(currentMemoryVaultId(), path)); return; }
  if (isFsaBackend()) {
    const parts = path.split("/"); let dir = fsaRoot;
    try {
      for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
      await dir.removeEntry(parts[parts.length - 1]);
    } catch (error) { if (!isMissingFile(error)) throw error; }
    return;
  }
  if (!vaultRoot) throw new Error("No vault open");
  const selectedRoot = vaultRoot;
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (await exists(`${selectedRoot}/${path}`)) await remove(`${selectedRoot}/${path}`);
}
/** Examples open in an isolated session vault; local user files are untouched. */
export function openFireSatVault(): string {
  const id = "firesat-example";
  const path = openNamedMemoryVault(id, { empty: true });
  if (![...memory.keys()].some(key => key.startsWith(`${id}::`) && key.endsWith(".md"))) {
    for (const file of firesatVaultFiles) memory.set(memoryKey(id, file.path), file.text);
  }
  return path;
}
