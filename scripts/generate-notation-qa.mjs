#!/usr/bin/env node
/** Rebuild the self-contained notation measurement fixture from the production renderer. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(projectRoot, "Docs/notation-qa.html");
const server = await createServer({ root: projectRoot, configFile: false, server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "error" });
try {
  const { renderDiagram, escapeXml } = await server.ssrLoadModule("/src/core/presentation/svg.ts");
  const { glyphFor } = await server.ssrLoadModule("/src/core/presentation/geometry.ts");
  const { layoutArgument } = await server.ssrLoadModule("/src/core/layout/elk.ts");
  const { emptyLayout } = await server.ssrLoadModule("/src/core/model/types.ts");
  const cases = [
    { id: "forty", title: "40 characters", statement: "Review evidence, scope and claim limits. ".slice(0, 40) },
    { id: "two-hundred", title: "200 characters", statement: "Verify the origin, integrity and freshness of every reported detection. ".repeat(4).slice(0, 200) },
    { id: "five-hundred", title: "500 characters", statement: "Confirm the provenance of each evidence item and retain its limitations for independent review. ".repeat(6).slice(0, 500) },
    { id: "lowercase-wide", title: "80 unbroken lowercase w characters", statement: "w".repeat(80) },
    { id: "uppercase-wide", title: "80 unbroken uppercase W characters", statement: "W".repeat(80) },
    { id: "paragraphs", title: "Multiple paragraphs and blank lines", statement: "The first paragraph states the claim.\n\nThe second paragraph qualifies the scope.\nThe final line retains the evidence boundary." },
    { id: "xml", title: "Literal XML metacharacters", statement: 'Literal text: <script>alert("fixture")</script> & <image onload="fixture()">. Keep "double quotes", \'single quotes\' and A < B > C readable.' },
    { id: "long-identifiers", title: "Long identifiers with 80 wide characters", statement: "The complete identifier and statement remain visible inside the appropriate GSN symbol.", longIds: true },
  ];
  const sections = [], manifest = [];
  for (const entry of cases) {
    const id = prefix => entry.longIds ? `${prefix}-${"Ww".repeat(40)}` : prefix;
    const node = (prefix, type, support = [], context = [], undeveloped = false) => ({
      gsnId: id(prefix), gkType: `Gsn${type}`, name: `${entry.title}: ${type}`, statement: entry.statement,
      filePath: `Notation-QA/${prefix}.md`, isRoot: prefix === "G1", undeveloped,
      supportedBy: support.map(id), inContextOf: context.map(id), hasEvidence: [],
    });
    const nodes = [
      node("G1", "Goal", ["S1", "S2", "G3"], ["C1"]),
      node("S1", "Strategy", ["G2"], ["A1", "J1"]),
      node("G2", "Goal", ["Sn1"]), node("Sn1", "Solution"),
      node("C1", "Context"), node("A1", "Assumption"), node("J1", "Justification"),
      node("G3", "Goal", [], [], true), node("S2", "Strategy", [], [], true),
    ];
    const structure = { rootId: id("G1"), rootDir: `Notation-QA-${entry.id}`, elements: new Map(nodes.map(node => [node.gsnId, node])), evidence: new Map(), layout: emptyLayout(id("G1")) };
    const positions = await layoutArgument(structure);
    for (const theme of ["light", "dark"]) {
      const key = `${entry.id}-${theme}`;
      const svg = renderDiagram(structure, positions, { theme, markerPrefix: `qa-${key}` });
      sections.push(`<section class="case" data-qa-case="${key}" aria-labelledby="heading-${key}"><header><span class="badge">Fixture only · ${theme}</span><h2 id="heading-${key}">${escapeXml(entry.title)}</h2><p>${entry.statement.length} statement characters; nine elements including all six core types; unfinished Goal and Strategy; both legal relationship types. SVG uses its intrinsic dimensions at 100% scale.</p></header><div class="chart" data-theme="${theme}">${svg}</div></section>`);
      manifest.push({ key, theme, statementCharacters: entry.statement.length, nodes: nodes.map(node => ({ id: node.gsnId, type: node.gkType, statement: node.statement, undeveloped: node.undeveloped, glyph: glyphFor(node), position: positions[node.gsnId] })), edges: nodes.flatMap(node => [...node.supportedBy.map(target => ({ source: node.gsnId, target, type: "SUPPORTED_BY" })), ...node.inContextOf.map(target => ({ source: node.gsnId, target, type: "IN_CONTEXT_OF" }))]) });
    }
  }
  const data = JSON.stringify({ fixtureOnly: true, producer: "scripts/generate-notation-qa.mjs via production renderDiagram and layoutArgument", expectedCharts: manifest.length, expectedNodes: manifest.reduce((total, chart) => total + chart.nodes.length, 0), cases: manifest }).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoalKeeper notation QA fixture</title><style>
  *{box-sizing:border-box}body{margin:0;background:#e9efed;color:#202d32;font-family:Arial,Helvetica,sans-serif}.page-title{padding:32px 40px;background:#fffefb;border-bottom:1px solid #9aaea8}.page-title h1{margin:8px 0 12px;font-size:30px}.page-title p{max-width:1000px;line-height:1.55;margin:8px 0}.badge{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#465c61}.index{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.index a{background:#e8eeea;padding:7px 10px;border-radius:4px;color:#204b4b;text-decoration:none}.case{margin:32px;border:1px solid #8ca09a;background:#fffefb}.case header{padding:20px 24px;border-bottom:1px solid #aab9b3}.case h2{margin:7px 0 10px;font-size:24px}.case p{margin:0;line-height:1.5;max-width:1000px}.chart{overflow:auto;max-height:900px;background:#fffefb}.chart[data-theme=dark]{background:#18272c}.chart>svg{display:block;max-width:none;transform:none}.foot{padding:10px 40px 35px;line-height:1.6}code{font-family:ui-monospace,monospace}a{color:#1b6670}
  </style></head><body><header class="page-title"><span class="badge">Engineering verification fixture · not an assurance case</span><h1>GSN notation at reading scale</h1><p>This self-contained page renders production GSN symbols and ELK layout at intrinsic SVG size: 16-pixel statement text, no fit-to-page scaling. Each chart can be scrolled horizontally and vertically. It has no external scripts, fonts, images or network dependencies.</p><p>Use browser text bounds to inspect complete identifiers and statements, oval/circle interiors, A/J labels and undeveloped diamonds. The legal fixture graph is G1 → S1 → G2 → Sn1, plus unfinished G3/S2 and Context, Assumption and Justification. Literal XML remains plain text. This page supplies test inputs; it does not assert that browser verification has passed.</p><nav class="index">${cases.map(entry => `<a href="#heading-${entry.id}-light">${escapeXml(entry.title)}</a>`).join("")}</nav></header>${sections.join("\n")}<footer class="foot">Regenerate from the GoalKeeper directory with <code>node scripts/generate-notation-qa.mjs</code>. The JSON manifest records all expected nodes, source statements, glyph dimensions and relationship triples for independent DOM comparison. Both themes use identical semantic fixtures.</footer><script type="application/json" id="fixture-manifest">${data}</script></body></html>`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  console.log(JSON.stringify({ output, charts: manifest.length, nodes: manifest.reduce((total, chart) => total + chart.nodes.length, 0), scenarios: cases.map(entry => ({ id: entry.id, statementCharacters: entry.statement.length })), htmlBytes: Buffer.byteLength(html) }, null, 2));
} finally { await server.close(); }
