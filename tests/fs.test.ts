// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ open: vi.fn(), exists: vi.fn(), mkdir: vi.fn(), readDir: vi.fn(), readTextFile: vi.fn(), writeTextFile: vi.fn(), rename: vi.fn(), remove: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: native.open }));
vi.mock("@tauri-apps/plugin-fs", () => native);

let fs: typeof import("../src/lib/fs");
let files: Map<string, string>;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  Reflect.deleteProperty(window, "showDirectoryPicker");
  files = new Map([["/vault/case/G1.md", "Original content"]]);
  native.open.mockResolvedValue("/vault");
  native.exists.mockImplementation(async (path: string) => files.has(path) || [...files.keys()].some((key) => key.startsWith(path + "/")));
  native.mkdir.mockResolvedValue(undefined);
  native.readDir.mockResolvedValue([]);
  native.readTextFile.mockImplementation(async (path: string) => {
    if (!files.has(path)) throw new Error("Missing file");
    return files.get(path)!;
  });
  native.writeTextFile.mockImplementation(async (path: string, text: string) => { files.set(path, text); });
  native.rename.mockImplementation(async (from: string, to: string) => { files.set(to, files.get(from)!); files.delete(from); });
  native.remove.mockImplementation(async (path: string) => { files.delete(path); });
  fs = await import("../src/lib/fs");
});
afterEach(() => {
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  Reflect.deleteProperty(window, "showDirectoryPicker");
});

async function nativeVault() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
  await fs.initFs(); await fs.pickVaultDirectory();
}

describe("SRS 5.8: native per-file replacement", () => {
  it("writes a sibling temporary file before atomic rename", async () => {
    await nativeVault(); await fs.writeVaultFile("case/G1.md", "Updated content");
    const temporary = native.writeTextFile.mock.calls[0][0] as string;
    expect(temporary).toMatch(/^\/vault\/case\/G1\.md\.tmp-/);
    expect(native.rename).toHaveBeenCalledWith(temporary, "/vault/case/G1.md");
    expect(native.writeTextFile.mock.invocationCallOrder[0]).toBeLessThan(native.rename.mock.invocationCallOrder[0]);
    expect(files.get("/vault/case/G1.md")).toBe("Updated content");
    expect(files.has(temporary)).toBe(false);
  });
  it.each(["write", "rename"])("preserves the original and reports a failed %s", async (operation) => {
    await nativeVault();
    const error = new Error(`${operation} denied`);
    if (operation === "write") native.writeTextFile.mockRejectedValueOnce(error);
    else native.rename.mockRejectedValueOnce(error);
    await expect(fs.writeVaultFile("case/G1.md", "Incomplete replacement")).rejects.toBe(error);
    expect(files.get("/vault/case/G1.md")).toBe("Original content");
    expect(native.remove).toHaveBeenCalled();
    expect([...files.keys()].some((key) => key.includes(".tmp-"))).toBe(false);
  });
});

describe("SRS 5.6: read and metadata failures", () => {
  it("propagates directory and note errors instead of returning a partial vault", async () => {
    await nativeVault(); native.readDir.mockRejectedValueOnce(new Error("Directory denied"));
    await expect(fs.listVaultFiles()).rejects.toThrow("Directory denied");
    native.readDir.mockResolvedValueOnce([{ name: "G1.md", isDirectory: false }]);
    native.readTextFile.mockRejectedValueOnce(new Error("Note denied"));
    await expect(fs.listVaultFiles()).rejects.toThrow("Note denied");
  });
  it("creates missing metadata but never overwrites unreadable existing metadata", async () => {
    await nativeVault();
    expect(await fs.readVaultFile(".goalkeeper/vault.json")).toBeNull();
    await fs.ensureVaultMeta();
    expect(files.has("/vault/.goalkeeper/vault.json")).toBe(true);
    native.writeTextFile.mockClear();
    native.readTextFile.mockRejectedValueOnce(new Error("Metadata denied"));
    await expect(fs.ensureVaultMeta()).rejects.toThrow("Metadata denied");
    expect(native.writeTextFile).not.toHaveBeenCalled();
  });
  it("allows restoring the selected adapter after a candidate vault fails", async () => {
    fs.openNamedMemoryVault("working-case", { empty: true });
    await fs.writeVaultFile("case/G1.md", "Unsaved session case");
    const previous = fs.captureVaultSelection();
    await nativeVault();
    fs.restoreVaultSelection(previous);
    expect(fs.getBackend()).toBe("memory");
    expect(fs.getVaultRoot()).toBe("memory://working-case");
    expect(await fs.readVaultFile("case/G1.md")).toBe("Unsaved session case");
  });
});

describe("SRS 5.9: path boundary and deletion", () => {
  const invalid = ["", "/etc/passwd", "C:/outside.md", "C:\\outside.md", "\\\\server\\share", "../outside.md", "case/../../outside.md", "case/./G1.md", "case//G1.md", "case/G1.md/", "case/\0.md"];
  for (const path of invalid) it(`rejects ${JSON.stringify(path)} before native storage`, async () => {
    await nativeVault();
    await expect(fs.writeVaultFile(path, "bad")).rejects.toThrow("inside the selected vault");
    await expect(fs.readVaultFile(path)).rejects.toThrow("inside the selected vault");
    await expect(fs.deleteVaultFile(path)).rejects.toThrow("inside the selected vault");
    expect(native.exists).not.toHaveBeenCalled(); expect(native.writeTextFile).not.toHaveBeenCalled();
    expect(native.readTextFile).not.toHaveBeenCalled(); expect(native.remove).not.toHaveBeenCalled();
  });
  it("enforces the same path boundary for memory storage", async () => {
    fs.openNamedMemoryVault("boundary-test", { empty: true });
    await expect(fs.writeVaultFile("../escape.md", "bad")).rejects.toThrow();
    expect((await fs.listVaultFiles()).some((file) => file.path.includes("escape"))).toBe(false);
  });
  it("deletes native notes idempotently", async () => {
    await nativeVault();
    await fs.deleteVaultFile("case/G1.md"); await fs.deleteVaultFile("case/G1.md");
    expect(native.remove).toHaveBeenCalledTimes(1);
    expect(files.has("/vault/case/G1.md")).toBe(false);
  });
});

describe("SRS 5.6/5.8: browser directory adapter", () => {
  it("aborts a failed write and propagates access failures", async () => {
    let stored = "Original browser content";
    let staged = "";
    const writable = { write: vi.fn(async (text: string) => { staged = text; throw new Error("Stream denied"); }), close: vi.fn(async () => { stored = staged; }), abort: vi.fn(async () => { staged = ""; }) };
    const handle = { name: "browser-vault", getFileHandle: vi.fn(async () => ({ createWritable: async () => writable, getFile: async () => ({ text: async () => stored }) })), getDirectoryHandle: vi.fn() };
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: vi.fn(async () => handle) });
    await fs.pickBrowserDirectory();
    await expect(fs.writeVaultFile("G1.md", "New content")).rejects.toThrow("Stream denied");
    expect(writable.abort).toHaveBeenCalledOnce(); expect(writable.close).not.toHaveBeenCalled();
    expect(await fs.readVaultFile("G1.md")).toBe("Original browser content");
    handle.getFileHandle.mockRejectedValueOnce(new DOMException("No permission", "NotAllowedError"));
    await expect(fs.readVaultFile("G1.md")).rejects.toThrow("No permission");
    handle.getFileHandle.mockRejectedValueOnce(new DOMException("Missing", "NotFoundError"));
    expect(await fs.readVaultFile("missing.md")).toBeNull();
  });
  it("treats a missing parent directory as already deleted", async () => {
    const root = { name: "browser-vault", getDirectoryHandle: vi.fn(async () => { throw new DOMException("Missing", "NotFoundError"); }) };
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: vi.fn(async () => root) });
    await fs.pickBrowserDirectory(); await expect(fs.deleteVaultFile("case/G2.md")).resolves.toBeUndefined();
  });
  it("reports picker denial while user cancellation remains a non-error", async () => {
    const picker = vi.fn().mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError")).mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"));
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: picker });
    await expect(fs.pickBrowserDirectory()).rejects.toThrow("Denied");
    expect(await fs.pickBrowserDirectory()).toBeNull();
  });
});
