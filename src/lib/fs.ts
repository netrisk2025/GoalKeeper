/**
 * Filesystem abstraction: Tauri when available, else in-memory demo vault for browser dev.
 */

import type { VaultFile } from "../core/vault/load";

export type FsBackend = "tauri" | "memory";

let backend: FsBackend = "memory";
let vaultRoot: string | null = null;
const memory = new Map<string, string>();

export function getBackend(): FsBackend {
  return backend;
}

export function getVaultRoot(): string | null {
  return vaultRoot;
}

export async function initFs(): Promise<FsBackend> {
  try {
    await import("@tauri-apps/api/core");
    // Only treat as Tauri if invoke exists in a real webview
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      backend = "tauri";
      return backend;
    }
  } catch {
    // fall through
  }
  backend = "memory";
  seedDemoVault();
  return backend;
}

function seedDemoVault(): void {
  if (memory.size > 0) return;
  vaultRoot = "memory://demo-vault";
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

export async function pickVaultDirectory(): Promise<string | null> {
  if (backend === "tauri") {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      vaultRoot = selected;
      return selected;
    }
    return null;
  }
  // memory: always use demo vault
  seedDemoVault();
  return vaultRoot;
}

export async function setVaultRoot(path: string): Promise<void> {
  vaultRoot = path;
  if (backend === "memory") {
    seedDemoVault();
  }
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  if (!vaultRoot) return [];
  if (backend === "memory") {
    return [...memory.entries()].map(([path, text]) => ({ path, text }));
  }
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  const out: VaultFile[] = [];
  async function walk(rel: string): Promise<void> {
    const abs = rel ? `${vaultRoot}/${rel}` : vaultRoot!;
    const entries = await readDir(abs);
    for (const e of entries) {
      const name = e.name ?? "";
      if (name.startsWith(".") && name !== ".goalkeeper") continue;
      const childRel = rel ? `${rel}/${name}` : name;
      if (e.isDirectory) {
        if (name === ".obsidian") continue;
        await walk(childRel);
      } else if (name.endsWith(".md") || name.endsWith(".json")) {
        const text = await readTextFile(`${vaultRoot}/${childRel}`);
        out.push({ path: childRel.replace(/\\/g, "/"), text });
      }
    }
  }
  await walk("");
  return out;
}

export async function writeVaultFile(relPath: string, text: string): Promise<void> {
  const path = relPath.replace(/\\/g, "/");
  if (backend === "memory") {
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
  if (backend === "memory") {
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
