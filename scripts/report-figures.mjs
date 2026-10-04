import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'Docs/report/figures');
await mkdir(out, { recursive: true });
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const [{ firesatVaultFiles, FIRESAT_ROOT_DIR }, { loadGoalStructure }, { renderDiagram }, { layoutArgument }, { validateStructure }] = await Promise.all([
    server.ssrLoadModule('/src/examples/firesat.ts'), server.ssrLoadModule('/src/core/vault/load.ts'),
    server.ssrLoadModule('/src/core/presentation/svg.ts'), server.ssrLoadModule('/src/core/layout/elk.ts'), server.ssrLoadModule('/src/core/rules/validate.ts'),
  ]);
  const structure = loadGoalStructure(FIRESAT_ROOT_DIR, firesatVaultFiles);
  const scenes = [
    { id: '01-claim', title: 'State the claim', ids: ['G1', 'C2'], note: 'Selected view of G1 and source Loss context C2. S1 and C1 are omitted from this plate; the top claim remains unproven.' },
    { id: '02-scope', title: 'Bound the claim', ids: ['G1', 'C1'], note: 'Selected view of the declared operating scope. Source Loss context C2 and all support branches are omitted; omission does not indicate closure.' },
    { id: '03-strategy', title: 'Explain the inference', ids: ['S1', 'J1'], note: 'Selected view of strategy S1 and its rationale J1. G1 and the six supporting Goals remain in the full case and are omitted here.' },
    { id: '04-elaboration', title: 'Expose unfinished branches', ids: ['G3', 'G4', 'C4'], note: 'Selected view of processor and sensor claims. Their undeveloped diamonds remain visible. The classification, downlink and residual-decision branches are omitted here and remain part of the unfinished case.' },
    { id: '05-evidence', title: 'Attach bounded evidence', ids: ['G2', 'Sn1'], note: 'Selected view of the traceability claim and source record. FS-E1 supports this narrow record claim; no operational control effectiveness is asserted.' },
    { id: '06-review', title: 'Keep acceptance open', ids: ['G7', 'G9', 'A1'], note: 'Selected view of the residual-decision branch. G8/Sn2 and context C3 are omitted. G9 is explicitly undeveloped; the assumption still needs configuration evidence.' },
  ];
  for (const scene of scenes) {
    const ids = new Set(scene.ids);
    const excerpt = { ...structure, rootId: scene.ids[0], elements: new Map([...structure.elements].filter(([id]) => ids.has(id)).map(([id, el]) => [id, { ...el, supportedBy: el.supportedBy.filter(x => ids.has(x)), inContextOf: el.inContextOf.filter(x => ids.has(x)) }])) };
    const positions = await layoutArgument(excerpt);
    const svg = renderDiagram(excerpt, positions, { markerPrefix: scene.id });
    await writeFile(resolve(out, `${scene.id}.svg`), svg);
    scene.positions = positions;
    scene.omittedIds = [...structure.elements.keys()].filter(id => !ids.has(id));
  }
  const positions = await layoutArgument(structure);
  await writeFile(resolve(out, 'full-case.svg'), renderDiagram(structure, positions));
  const findings = validateStructure(structure);
  await writeFile(resolve(out, 'storyboard-manifest.json'), JSON.stringify({
    generatedFrom: 'Implemented renderDiagram and layoutArgument through Vite SSR',
    qualification: 'Storyboard excerpts are selected views, not complete subcases or new stored semantic models.',
    case: { rootDir: structure.rootDir, nodes: structure.elements.size, evidenceNotes: structure.evidence.size, undeveloped: [...structure.elements.values()].filter(x => x.undeveloped).map(x => x.gsnId), findings },
    scenes,
  }, null, 2));
  console.log(`Generated ${scenes.length} storyboard plates and full ${structure.elements.size}-node case with ${findings.filter(f => f.severity === 'ERROR').length} structural errors.`);
} finally { await server.close(); }
