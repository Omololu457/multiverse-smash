// net/clientManifest.mjs — MSV1-HOST: which files are "the game client" (node only).
//
// The public host server and the release packager both use THIS list, so a friend's browser can only
// ever fetch what a downloaded release contains. Rule (documented in docs/msv1/host/SECURITY.md):
//   • tracked by git (dev) — or listed in client-manifest.json (packaged app, written by the stager)
//   • NOT under a dev/tooling folder (docs, harness, tools, electron, server, node_modules, saves, .github,
//     any *_work folder) and not a dotfile
//   • and one of: index.html, style.css, controls.html, a root-level *.js module, net/*.js, controls_lab/*.js,
//     a media file (png jpg jpeg gif webp svg mp3 ogg m4a wav mp4 woff woff2 ttf), or a *.json inside a
//     sub-folder (game data such as data/bloodmaps/*.json; root JSON like package.json is excluded)
//   • PLUS every module in the page's real ES-module import graph (followed recursively), wherever it lives —
//     e.g. skins.js imports ./harness/alt_skin_manifest.mjs, so that one harness file IS client code.
// Never included otherwise: *.md *.txt *.py *.mjs *.map *.sh *.pdf, other HTML pages, saves, logs, keys, git.

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { collectModules } from "../tools/stamp_version.mjs"

export const MANIFEST_FILE = "client-manifest.json"

const EXCLUDED_DIRS = /^(docs|harness|tools|electron|server|node_modules|saves|\.github|\.git|dist|release)\//
const WORK_DIR = /(^|\/)[^/]*_work\//
const MEDIA = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "mp3", "ogg", "m4a", "wav", "mp4", "woff", "woff2", "ttf"])
const ROOT_PAGES = new Set(["index.html", "style.css", "controls.html"])

export function isClientPath(rel) {
  if (!rel || rel.includes("\\") || rel.startsWith("/") || rel.split("/").some((s) => s === ".." || s.startsWith("."))) return false
  if (EXCLUDED_DIRS.test(rel) || WORK_DIR.test(rel)) return false
  if (ROOT_PAGES.has(rel)) return true
  const slash = rel.includes("/")
  const ext = rel.includes(".") ? rel.slice(rel.lastIndexOf(".") + 1).toLowerCase() : ""
  if (ext === "js") return !slash || rel.startsWith("net/") || rel.startsWith("controls_lab/")
  if (MEDIA.has(ext)) return true
  if (ext === "json") return slash
  return false
}

// Dev: from `git ls-files` (tracked files that exist on disk). Packaged: from client-manifest.json.
// A module the page imports: any .js/.mjs file, except never inside .git / node_modules / saves / dotfiles.
function isImportedModulePath(rel) {
  if (!/\.m?js$/.test(rel) || rel.includes("\\") || rel.startsWith("/")) return false
  if (rel.split("/").some((s) => s === ".." || s.startsWith("."))) return false
  return !/^(node_modules|saves)\//.test(rel)
}

export function buildClientManifest(root) {
  const mf = path.join(root, MANIFEST_FILE)
  let list
  if (fs.existsSync(mf)) {
    list = JSON.parse(fs.readFileSync(mf, "utf8")).files
  } else {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 256 * 1024 * 1024 })
    list = out.toString("utf8").split("\0").filter(Boolean)
  }
  const set = new Set()
  for (const rel of list) if (isClientPath(rel) && fs.existsSync(path.join(root, rel))) set.add(rel)
  // Plus every module in the live import graph (stamp_version.collectModules: root *.js + ./sub/*.js they
  // import). In dev a brand-new module may not be committed yet, but the page imports it, so a joiner needs it.
  // Followed RECURSIVELY (net/onlineMatch.js → ./hostLink.js → ./hostConfig.js …), relative to each module.
  try { for (const m of collectModules()) { const rel = m.slice(2); if (isImportedModulePath(rel) && fs.existsSync(path.join(root, rel))) set.add(rel) } } catch {}
  const queue = [...set].filter((rel) => /\.m?js$/.test(rel))
  const seen = new Set()
  const specRe = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.m?js)["']/g
  while (queue.length) {
    const rel = queue.pop()
    if (seen.has(rel) || !/\.m?js$/.test(rel)) continue
    seen.add(rel)
    let src = ""
    try { src = fs.readFileSync(path.join(root, rel), "utf8") } catch { continue }
    let m
    while ((m = specRe.exec(src))) {
      const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]))
      if (!dep.startsWith("..") && !set.has(dep) && isImportedModulePath(dep) && fs.existsSync(path.join(root, dep))) { set.add(dep); queue.push(dep) }
    }
  }
  return set
}
