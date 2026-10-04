# Dependency notice packaging verification

Date: 2026-10-04. Scope: GoalKeeper JavaScript production dependency inventory and ELK's embedded components. This record does not assert qualification of native Rust/platform dependency licensing.

## Observed result

`node scripts/verify-licenses.mjs` completed successfully in the GoalKeeper repository. The gate is offline and does not access the SSTPA Tools or Attack Tree source projects.

| Check | Observed result |
|---|---|
| Locked and installed ELK.js | 0.12.0 |
| Installed original ELK library files matching pinned SHA-256 | 9 of 9 |
| Corresponding source archives matching pinned SHA-256 | 10 of 10 |
| Embedded notice artifacts matching pinned SHA-256 | 11 of 11 |
| Production npm package inventory | 13 packages with original notice files |
| Source/notices payload | 22,197,348 bytes before npm notice files/index |
| Network access during verification | None; script uses only repository files |
| Built distribution copy verification | PASS: all 39 files verified byte-for-byte under `dist/licenses/` in the final production build; see `report/final-verification.txt` |

The source archives and embedded notices were reused without modification from the matching ELK.js 0.12.0 license package in the Loss Tool prototype. `scripts/elk-sources.json` pins the original upstream URLs/revisions and SHA-256 values. GoalKeeper's installed ELK files were checked independently against that manifest. No prototype application copyright statement or application dependency inventory was reused.

## Recipient materials

`public/licenses/index.html` is the readable index. `source-manifest.json` provides source provenance and checksums. `npm-manifest.json` records GoalKeeper's exact resolved runtime package versions, package integrity values, original license file paths and checksums. Each source archive, license and notice is bundled locally; no remote source download is required to read the distributed materials.

ELK.js is distributed under its EPL-2.0 option. Embedded components retain the licenses recorded by their manifests and original files. The Tauri plugin SPDX records are retained alongside the complete MIT/Apache-2.0 terms in the Tauri API notices. Application ownership and licensing are not reassigned by these third-party notices.

## Reproduction

```
node scripts/verify-licenses.mjs
npm run build
node scripts/verify-licenses.mjs --dist
```

A changed source archive, embedded notice, installed ELK library, dependency version or copied npm license fails the gate. After an intentional dependency update, review its license records and use `--refresh` to regenerate the npm inventory/index. A new ELK version additionally requires explicitly reviewed matching source and checksums; `--refresh` does not bypass that check.
