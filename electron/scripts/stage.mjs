// electron/scripts/stage.mjs — MSV1-HOST: assemble the folder electron-builder packages (electron/stage/).
//   node electron/scripts/stage.mjs            (from the repo root or anywhere)
//
// The packaged app mirrors the repo layout so the same relative imports work:
//   stage/package.json            name, version, main=electron/main.mjs
//   stage/electron/{main.mjs,host.js,preload.cjs}
//   stage/net/*.js|*.mjs, stage/tools/stamp_version.mjs
//   stage/<client files>          exactly the client whitelist (net/clientManifest.mjs) — the same files the
//                                 public host server may serve, so release == what friends' browsers load
//   stage/client-manifest.json    that whitelist (the packaged app has no git)
//   stage/node_modules/ws         the only runtime dependency
// Files are HARD-LINKED when possible (fast, no extra disk), copied otherwise. Nothing else from the repo
// (docs, harness, tools, saves, *_work, untracked music, keys) can end up in a release.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildClientManifest, MANIFEST_FILE } from "../../net/clientManifest.mjs"

const EDIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(EDIR, "..")
const OUT = path.join(EDIR, "stage")
const epkg = JSON.parse(fs.readFileSync(path.join(EDIR, "package.json"), "utf8"))

function place(src, rel) {
  const dst = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  try { fs.linkSync(src, dst) } catch { fs.copyFileSync(src, dst) }
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const manifest = [...buildClientManifest(ROOT)].sort()
let bytes = 0
for (const rel of manifest) { place(path.join(ROOT, rel), rel); bytes += fs.statSync(path.join(ROOT, rel)).size }
fs.writeFileSync(path.join(OUT, MANIFEST_FILE), JSON.stringify({ version: epkg.version, files: manifest }))

const RUNTIME = [
  "electron/main.mjs", "electron/host.js", "electron/preload.cjs",
  "tools/stamp_version.mjs",
  ...fs.readdirSync(path.join(ROOT, "net")).filter((f) => /\.(m?js)$/.test(f)).map((f) => `net/${f}`),
]
for (const rel of RUNTIME) if (!fs.existsSync(path.join(OUT, rel))) place(path.join(ROOT, rel), rel)

const wsDir = path.dirname(fileURLToPath(import.meta.resolve("ws/package.json", `file://${ROOT}/package.json`)))
for (const f of fs.readdirSync(wsDir, { recursive: true })) {
  const s = path.join(wsDir, f)
  if (fs.statSync(s).isFile()) place(s, path.join("node_modules", "ws", f))
}

fs.writeFileSync(path.join(OUT, "package.json"), JSON.stringify({
  name: "multiverse-smash-desktop", productName: "Multiverse Smash", version: epkg.version,
  description: epkg.description, author: epkg.author, license: epkg.license || "UNLICENSED",
  type: "module", main: "electron/main.mjs",
}, null, 2))

fs.mkdirSync(path.join(EDIR, "vendor", "cloudflared"), { recursive: true })   // filled by CI (release.yml)
const gb = (bytes / 1e9).toFixed(2)
console.log(`stage: ${manifest.length} client files (${gb} GB) + ${RUNTIME.length} runtime files → ${path.relative(ROOT, OUT)}/`)
if (bytes > 1.9 * 1024 ** 3) console.log("stage: WARNING — the client is close to/over GitHub's 2 GiB per-release-asset limit (see docs/msv1/host/RELEASING.md)")
