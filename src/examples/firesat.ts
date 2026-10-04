/** One source for the shipped disk vault and browser FireSat demonstration. */
import type { VaultFile } from "../core/vault/load";

export const FIRESAT_ROOT_DIR = "FireSat-Authentic-Reports";
export const FIRESAT_CASE_STATUS = "Illustrative draft — operational evidence and authority acceptance remain outstanding.";

const rawFiles = import.meta.glob<string>(
  ["../../examples/firesat-vault/**/*.md", "../../examples/firesat-vault/**/*.json"],
  { query: "?raw", import: "default", eager: true },
);

export const firesatVaultFiles: VaultFile[] = Object.entries(rawFiles)
  .map(([path, text]) => ({ path: path.replace("../../examples/firesat-vault/", ""), text }))
  .sort((a, b) => a.path.localeCompare(b.path));
