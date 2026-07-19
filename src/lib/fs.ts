/**
 * Filesystem abstraction: Tauri when available, else in-memory demo vault for browser dev.
 */

import type { VaultFile } from "../core/vault/load";

export type FsBackend = "tauri" | "memory";

let backend: FsBackend = "memory";
let vaultRoot: string | null = null;
const memory = new Map<string, string>();
let demoSeeded = false;

export function getBackend(): FsBackend {
  return backend;
}

export function getVaultRoot(): string | null {
  return vaultRoot;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function initFs(): Promise<FsBackend> {
  try {
    if (isTauriRuntime()) {
      await import("@tauri-apps/api/core");
      backend = "tauri";
      return backend;
    }
  } catch {
    // fall through to memory
  }
  backend = "memory";
  return backend;
}

/** Seed (or re-seed) the in-memory demo vault and point vaultRoot at it. */
export function seedDemoVault(force = false): string {
  if (force) {
    memory.clear();
    demoSeeded = false;
  }
  if (!demoSeeded) {
    writeDemoContents();
    demoSeeded = true;
  }
  vaultRoot = "memory://demo-vault";
  backend = "memory";
  return vaultRoot;
}

function writeDemoContents(): void {
  const g1 = `---
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
`;
  const s1 = `---
gk_schema: 1
gk_type: GsnStrategy
gsn_id: S1
name: Argument over hazards
statement: Argue over each identified hazard class.
supported_by:
  - "[[G2]]"
  - "[[Sn1]]"
undeveloped: false
---
# S1 — Argument over hazards

Argue over each identified hazard class.

## Supported By
- [[G2]]
- [[Sn1]]
`;
  const g2 = `---
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
`;
  const sn1 = `---
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
`;
  const c1 = `---
gk_schema: 1
gk_type: GsnContext
gsn_id: C1
name: Operating environment
statement: Defined operational design domain ODD-1.
undeveloped: false
---
# C1 — Operating environment

Defined operational design domain ODD-1.
`;
  const ev = `---
gk_schema: 1
gk_type: Evidence
name: TR-1
evidence_kind: Test
statement: Integration test suite passed for hazard H1 mitigations.
---
# TR-1

Integration test suite passed for hazard H1 mitigations.
`;
  memory.set("Safe-System/G1.md", g1);
  memory.set("Safe-System/S1.md", s1);
  memory.set("Safe-System/G2.md", g2);
  memory.set("Safe-System/Sn1.md", sn1);
  memory.set("Safe-System/C1.md", c1);
  memory.set("Evidence/TR-1.md", ev);
  memory.set(
    "Safe-System/_layout.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        rootGsnId: "G1",
        tool: "goalkeeper",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: {
          G1: { x: 120, y: 40 },
          S1: { x: 120, y: 160 },
          G2: { x: 40, y: 280 },
          Sn1: { x: 280, y: 280 },
          C1: { x: 360, y: 40 },
        },
      },
      null,
      2,
    ),
  );
  memory.set(
    ".goalkeeper/vault.json",
    JSON.stringify({ schemaVersion: 1, name: "Demo Vault" }, null, 2),
  );
}

/** Open a directory picker (Tauri) or fall back to the in-memory demo vault (browser). */
export async function pickVaultDirectory(): Promise<{ path: string; mode: "tauri" | "memory" }> {
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
        return { path: selected, mode: "tauri" };
      }
      // User cancelled
      return { path: "", mode: "tauri" };
    } catch (e) {
      console.error("Tauri dialog failed, falling back to memory vault", e);
      const path = seedDemoVault(true);
      return { path, mode: "memory" };
    }
  }
  const path = seedDemoVault(false);
  return { path, mode: "memory" };
}

export async function openMemoryVault(forceReseed = false): Promise<string> {
  return seedDemoVault(forceReseed);
}

/** Ensure a vault is available for writes (auto memory vault if none). */
export async function ensureVaultReady(): Promise<string> {
  if (vaultRoot) return vaultRoot;
  if (backend === "tauri" && isTauriRuntime()) {
    throw new Error("No vault open. Use Open vault to choose a directory.");
  }
  return seedDemoVault(false);
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  if (!vaultRoot) return [];
  if (backend === "memory" || vaultRoot.startsWith("memory://")) {
    return [...memory.entries()].map(([path, text]) => ({ path, text }));
  }
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const out: VaultFile[] = [];
  async function walk(rel: string): Promise<void> {
    const abs = rel ? `${vaultRoot}/${rel}` : vaultRoot!;
    let entries;
    try {
      entries = await readDir(abs);
    } catch (e) {
      console.error("readDir failed", abs, e);
      return;
    }
    for (const e of entries) {
      const name = e.name ?? "";
      if (name.startsWith(".") && name !== ".goalkeeper") continue;
      const childRel = rel ? `${rel}/${name}` : name;
      if (e.isDirectory) {
        if (name === ".obsidian") continue;
        await walk(childRel);
      } else if (name.endsWith(".md") || name.endsWith(".json")) {
        try {
          const text = await readTextFile(`${vaultRoot}/${childRel}`);
          out.push({ path: childRel.replace(/\\/g, "/"), text });
        } catch (err) {
          console.error("readTextFile failed", childRel, err);
        }
      }
    }
  }
  await walk("");
  return out;
}

export async function writeVaultFile(relPath: string, text: string): Promise<void> {
  const path = relPath.replace(/\\/g, "/");
  if (backend === "memory" || (vaultRoot && vaultRoot.startsWith("memory://"))) {
    memory.set(path, text);
    return;
  }
  if (!vaultRoot) throw new Error("No vault open");
  const { writeTextFile, mkdir, exists } = await import("@tauri-apps/plugin-fs");
  const parts = path.split("/");
  if (parts.length > 1) {
    const dir = `${vaultRoot}/${parts.slice(0, -1).join("/")}`;
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
  }
  await writeTextFile(`${vaultRoot}/${path}`, text);
}

export async function readVaultFile(relPath: string): Promise<string | null> {
  const path = relPath.replace(/\\/g, "/");
  if (backend === "memory" || (vaultRoot && vaultRoot.startsWith("memory://"))) {
    return memory.get(path) ?? null;
  }
  if (!vaultRoot) return null;
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    return await readTextFile(`${vaultRoot}/${path}`);
  } catch {
    return null;
  }
}

export async function ensureVaultMeta(): Promise<void> {
  await ensureVaultReady();
  const existing = await readVaultFile(".goalkeeper/vault.json");
  if (!existing) {
    await writeVaultFile(
      ".goalkeeper/vault.json",
      JSON.stringify(
        { schemaVersion: 1, name: "GoalKeeper Vault", created: new Date().toISOString() },
        null,
        2,
      ),
    );
  }
}
