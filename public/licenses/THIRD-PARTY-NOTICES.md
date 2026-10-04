# GoalKeeper third-party notices and source

The bundled JavaScript application uses the packages listed in `npm-manifest.json`. Original package license/copyright/notice files are preserved in `npm/`; the inventory records resolved versions, npm integrity values, original file paths and SHA-256 values. The user-readable entry point is `index.html` in this directory.

## ELK layout engine

GoalKeeper uses unmodified ELK.js **0.12.0** under its **Eclipse Public License 2.0** option. ELK and ELK.js corresponding source archives, including the release's Java/GWT dependencies, are supplied in `sources/`. Component notices and the applicable EPL-2.0, EPL-1.0 and Apache-2.0 texts are in `elk-embedded/`. Existing source-file attributions remain in the complete archives.

`source-manifest.json` identifies each upstream URL, revision where available, license and archive checksum. It also pins the installed ELK library bytes. These archives and embedded notices were copied without modification from the reviewed local Loss Tool prototype distribution; the build verifies their hashes and the installed GoalKeeper ELK library independently. No Loss Tool application code or application copyright claim is included by that reuse.

The npm package declares `EPL-2.0 OR GPL-3.0-or-later`; this distribution elects EPL-2.0 for ELK.js. Ancillary components keep their own stated licenses. Distribute the entire `licenses/` directory with the built application so recipients receive source and notices without requiring a network download. Changes to ELK library files or its version fail the offline gate until matching source and notices are deliberately reviewed and updated.

## Tauri and other JavaScript dependencies

The Tauri API package supplies full MIT and Apache-2.0 license texts. Tauri plugin packages supply SPDX records; those records and the API's complete terms are retained. The React, React DOM, scheduler, Zustand and other production npm dependency notices are copied from the actual GoalKeeper lockfile versions, rather than the Loss Tool's differing dependency versions.

This inventory covers JavaScript production dependencies and the embedded ELK components. A packaged native desktop release also contains Rust/platform components; their separate native dependency licensing review is not asserted complete by this JavaScript inventory. This notice file makes no new license grant for GoalKeeper's own application code.

## Verification and update

From the repository root:

```
node scripts/verify-licenses.mjs
node scripts/verify-licenses.mjs --dist
```

The first command verifies pinned source/notice checksums, unmodified ELK library files and exact installed-production-dependency notice copies. The second also verifies every `public/licenses/` file exists byte-for-byte under `dist/licenses/` after building. Both commands are offline and read-only.

After an intentional dependency change, review its license files, then use `node scripts/verify-licenses.mjs --refresh` to rebuild the npm inventory and recipient index. This option does not download or manufacture matching ELK source; the pinned ELK source manifest still has to pass before any inventory update.
