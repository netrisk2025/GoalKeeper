import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-contained offline gate. No network fetch and no access to source projects.
// --refresh updates only GoalKeeper's npm notice inventory after a dependency change.
// Corresponding ELK sources/checksums require an explicit reviewed manifest update.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const refresh = process.argv.includes('--refresh');
const verifyDist = process.argv.includes('--dist');
const read = (name) => readFileSync(resolve(root, name));
const json = (name) => JSON.parse(read(name).toString('utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const write = (name, bytes) => {
  const path = resolve(root, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
};
const equalHash = (name, expected) => {
  if (digest(read(name)) !== expected) throw new Error(`License/source checksum mismatch: ${name}`);
};
const manifest = json('scripts/elk-sources.json');
const lock = json('package-lock.json');
if (lock.packages['node_modules/elkjs']?.version !== manifest.elkjsVersion) {
  throw new Error('ELK version changed: supply reviewed matching sources and notices before distribution.');
}
for (const item of [...manifest.sources, ...manifest.notices]) {
  equalHash(`public/licenses/${item.file}`, item.sha256);
}
for (const item of manifest.unmodifiedDistributionFiles) equalHash(item.file, item.sha256);

const installed = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  if (!existsSync(resolve(root, path, 'package.json'))) {
    if (entry.optional) continue;
    throw new Error(`Install locked production dependency before license verification: ${path}`);
  }
  const pkg = json(`${path}/package.json`);
  if (pkg.version !== entry.version) throw new Error(`Installed dependency differs from lock: ${path}`);
  const files = readdirSync(resolve(root, path), { withFileTypes: true })
    .filter((item) => item.isFile() && /^(LICENSE|LICENCE|COPYING|NOTICE|COPYRIGHT)([._-].*)?$/i.test(item.name))
    .map((item) => {
      const source = `${path}/${item.name}`;
      const destination = `npm/${pkg.name.replaceAll('/', '__')}@${pkg.version}/${item.name}`;
      const bytes = read(source);
      if (refresh) write(`public/licenses/${destination}`, bytes);
      return { file: destination, source, sha256: digest(bytes) };
    }).sort((a, b) => a.file.localeCompare(b.file));
  if (!files.length) throw new Error(`No original notice supplied by ${pkg.name}@${pkg.version}`);
  installed.push({
    name: pkg.name, version: pkg.version,
    license: pkg.name === 'elkjs' ? 'EPL-2.0 (elected)' : pkg.license,
    declaredLicense: pkg.license,
    repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url,
    integrity: entry.integrity,
    files,
  });
}
installed.sort((a, b) => a.name.localeCompare(b.name));
const pretty = (value) => JSON.stringify(value, null, 2) + '\n';
if (refresh) {
  write('public/licenses/npm-manifest.json', pretty(installed));
  write('public/licenses/source-manifest.json', pretty(manifest));
  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const link = (path, label) => `<a href="${escape(path)}">${escape(label)}</a>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoalKeeper — third-party notices</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f7f4eb;color:#183032;max-width:1050px;margin:auto;padding:36px 24px}a{color:#075c5b}h1,h2{font-family:Georgia,serif}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px;border-bottom:1px solid #adbdb9;vertical-align:top}code{overflow-wrap:anywhere}</style><h1>GoalKeeper third-party notices</h1><p>ELK.js ${escape(manifest.elkjsVersion)} is used under EPL-2.0. Unmodified corresponding source and embedded-component notices are supplied below. Original authors retain their copyrights. Each component retains its own license.</p><p>${link('THIRD-PARTY-NOTICES.md','Packaging notes')} · ${link('source-manifest.json','Source checksums and provenance')} · ${link('npm-manifest.json','Locked npm notice inventory')}</p><h2>ELK and embedded-component source</h2><table><tr><th>Component</th><th>License</th><th>Archive</th></tr>${manifest.sources.map((item) => `<tr><td>${escape(item.component)} ${escape(item.version ?? '')}</td><td>${escape(item.license)}</td><td>${link(item.file,item.file.split('/').at(-1))}</td></tr>`).join('')}</table><h2>Embedded notices</h2><ul>${manifest.notices.map((item) => `<li>${link(item.file,item.file.split('/').at(-1))}</li>`).join('')}</ul><h2>Production npm dependencies</h2><p>Includes production dependency type packages when present in the lockfile. Tauri plugin SPDX records are retained; complete MIT and Apache-2.0 terms are supplied with the Tauri API package.</p><table><tr><th>Package</th><th>License</th><th>Original notices</th></tr>${installed.map((item) => `<tr><td>${escape(item.name)} ${escape(item.version)}</td><td>${escape(item.license)}</td><td>${item.files.map((file) => link(file.file,file.file.split('/').at(-1))).join(' · ')}</td></tr>`).join('')}</table></html>`;
  write('public/licenses/index.html', html);
}
if (pretty(json('public/licenses/npm-manifest.json')) !== pretty(installed)) {
  throw new Error('Production license inventory differs from lock/installed packages. Review and run --refresh.');
}
if (pretty(json('public/licenses/source-manifest.json')) !== pretty(manifest)) {
  throw new Error('Packaged source manifest differs from reviewed scripts/elk-sources.json.');
}
for (const pkg of installed) for (const file of pkg.files) equalHash(`public/licenses/${file.file}`, file.sha256);
for (const name of ['public/licenses/index.html', 'public/licenses/THIRD-PARTY-NOTICES.md']) {
  if (!read(name).length) throw new Error(`Empty recipient notice: ${name}`);
}
let distributionFiles = 0;
function verifyDirectory(relative) {
  for (const entry of readdirSync(resolve(root, relative), { withFileTypes: true })) {
    const source = `${relative}/${entry.name}`;
    if (entry.isDirectory()) verifyDirectory(source);
    else if (entry.isFile()) {
      const target = source.replace(/^public\//, 'dist/');
      equalHash(target, digest(read(source)));
      distributionFiles++;
    }
  }
}
if (verifyDist) verifyDirectory('public/licenses');
console.log(JSON.stringify({
  passed: true, offline: true, elkjsVersion: manifest.elkjsVersion,
  npmPackages: installed.length, sourceArchives: manifest.sources.length,
  embeddedNotices: manifest.notices.length, unchangedElkLibraryFiles: manifest.unmodifiedDistributionFiles.length,
  distributionFilesVerified: distributionFiles,
  scope: 'GoalKeeper JavaScript production dependencies and ELK embedded components; native Rust dependency licensing is separate.',
}, null, 2));
