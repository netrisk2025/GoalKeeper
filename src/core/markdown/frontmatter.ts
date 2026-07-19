/**
 * Browser-safe YAML frontmatter parse/stringify (no Node Buffer).
 * Supports the subset of YAML used by GoalKeeper element files.
 */

export function parseFrontmatter(text: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---")) {
    return { data: {}, content: normalized };
  }
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, content: normalized };
  }
  const fmBlock = normalized.slice(3, end).replace(/^\r?\n/, "");
  let content = normalized.slice(end + 4);
  if (content.startsWith("\r\n")) content = content.slice(2);
  else if (content.startsWith("\n")) content = content.slice(1);

  return { data: parseYamlSubset(fmBlock), content };
}

export function stringifyFrontmatter(content: string, data: Record<string, unknown>): string {
  const body = content.startsWith("\n") || content.startsWith("\r\n") ? content : `\n${content}`;
  return `---\n${serializeYamlSubset(data)}---${body.endsWith("\n") ? body : `${body}\n`}`;
}

function parseYamlSubset(src: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) {
      i++;
      continue;
    }
    if (/^\s/.test(raw)) {
      i++;
      continue;
    }
    const m = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    if (rest === "") {
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const lm = lines[j].match(/^\s+-\s+(.*)$/);
        if (!lm) break;
        items.push(unquote(lm[1].trim()));
        j++;
      }
      if (items.length > 0) {
        data[key] = items;
        i = j;
        continue;
      }
      data[key] = null;
      i++;
      continue;
    }
    if (rest === "[]") {
      data[key] = [];
      i++;
      continue;
    }
    data[key] = parseScalar(rest);
    i++;
  }
  return data;
}

function parseScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === "true" || s === "True" || s === "TRUE") return true;
  if (s === "false" || s === "False" || s === "FALSE") return false;
  if (s === "null" || s === "Null" || s === "~") return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return unquote(s);
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      if (s.startsWith('"')) return JSON.parse(s) as string;
    } catch {
      /* fall through */
    }
    return s.slice(1, -1);
  }
  return s;
}

function serializeYamlSubset(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${formatScalar(item)}`);
        }
      }
    } else if (value === null) {
      lines.push(`${key}: null`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${formatScalar(value)}`);
    }
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function formatScalar(value: unknown): string {
  const s = String(value ?? "");
  if (
    s === "" ||
    /[:#{}[\],&*?|>!%@`\n]/.test(s) ||
    s.startsWith(" ") ||
    s.endsWith(" ") ||
    s === "true" ||
    s === "false" ||
    s === "null" ||
    s.includes("[[") ||
    s.includes("]]")
  ) {
    return JSON.stringify(s);
  }
  return s;
}
