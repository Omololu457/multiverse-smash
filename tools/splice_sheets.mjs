// tools/splice_sheets.mjs — PHASE 1: inventory + splice the main sprite sheets into reusable frame atlases.
//
// Reads characters.js (the source of truth for per-action frame data — the SPRITE_MANIFEST only gates
// loading) and, for every character, emits a JSON atlas describing each action's frame rectangles inside
// its sheet. The original PNGs are NEVER modified — an atlas is pure metadata (action -> [frame rects]),
// which is the lossless, no-dependency way to reference frames (no pixel duplication / asset bloat).
//
// Frame-rect math mirrors the renderer (sprite.js): a strip lays frames left→right from an optional
// (sourceX, sourceY) origin, each cell `width`×`height`. On-screen size = cell × spriteScale × 1.18
// (GLOBAL_SPRITE_SCALE), foot-anchored; those factors are recorded per atlas so slices stay reusable.
//
//   node tools/splice_sheets.mjs            → write atlases + index + print the coverage report
//   node tools/splice_sheets.mjs --report   → print the coverage report only (no files written)
//
// Deterministic & side-effect-free: no Math.random, no network, no image decoding. Only reads characters.js
// + checks which referenced sheet files exist on disk.

import { characters } from "../characters.js"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT_DIR = path.join(ROOT, "tools", "atlases")
const GLOBAL_SPRITE_SCALE = 1.18   // sprite.js:24 — applied on top of each character's spriteScale

const REPORT_ONLY = process.argv.includes("--report")

// ── action classification (for the HURT / KO / airborne-KO coverage report) ──────────────────────────
// Precise: airborne-KO must be a HURT/KO state that is AIRBORNE (hurt_air / launched / tumble) — NOT an
// aerial ATTACK (katonAir, airLight, …), so "air" as a mere substring never counts. KO excludes bare
// "down"/"fall" (those are landing/movement, not defeat).
const RX_HURT   = /^(hurt|hit|flinch|damage)(_?\d+)?$/i
const RX_KO     = /^(knockdown|knockout|ko|defeat|lose|dead|death|downed)(_?\d+)?$/i
const isAirKo   = (k) => /^(hurt|hit|knockdown|ko|flinch)_?air$/i.test(k)   // hurt_air, knockdownAir, koAir
                     || /^air_?(hurt|hit|knockdown|ko)$/i.test(k)           // air_hurt, airKo
                     || /^(launched|tumble|juggled?)(_?\d+)?$/i.test(k)     // launched / tumble airborne states

const classify = (key) => {
  if (isAirKo(key))        return "airKo"
  if (RX_KO.test(key))     return "ko"
  if (RX_HURT.test(key))   return "hurt"
  return null
}

// Build one character's atlas: { action -> { sheet, exists, frames, cell, anchor, source, rects[] } }
function buildAtlas(key, def) {
  const ad = def.animationData
  if (!ad) return null
  const spriteScale = def.spriteScale ?? 1
  const actions = {}
  for (const [action, a] of Object.entries(ad)) {
    if (!a || a.width == null || a.height == null) continue   // non-strip / data-only entries
    const frames = a.frames ?? 1
    const w = a.width, h = a.height
    const sx0 = a.sourceX || 0, sy0 = a.sourceY || 0
    const rects = []
    for (let i = 0; i < frames; i++) rects.push({ x: sx0 + i * w, y: sy0, w, h })
    const sheet = a.sheet || null
    const exists = sheet ? fs.existsSync(path.join(ROOT, sheet.replace(/^\.\//, ""))) : false
    actions[action] = {
      sheet, exists, frames,
      cell: { w, h },
      anchor: { x: a.anchorX || 0, y: a.anchorY || 0 },
      source: { x: sx0, y: sy0 },
      loop: !!a.loop, lockLastFrame: !!a.lockLastFrame,
      // on-screen draw size for a foot-anchored frame (cell × spriteScale × 1.18)
      onScreen: { w: +(w * spriteScale * GLOBAL_SPRITE_SCALE).toFixed(1), h: +(h * spriteScale * GLOBAL_SPRITE_SCALE).toFixed(1) },
      rects,
    }
  }
  return {
    rosterKey: key,
    name: def.name || key,
    spriteScale,
    globalScale: GLOBAL_SPRITE_SCALE,
    actionCount: Object.keys(actions).length,
    actions,
  }
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────────
const keys = Object.keys(characters)
const coverage = []   // { key, hurt:[], ko:[], airKo:[], missingSheets:[] }
let written = 0, totalActions = 0, totalFrames = 0

if (!REPORT_ONLY) fs.mkdirSync(OUT_DIR, { recursive: true })

for (const key of keys) {
  const atlas = buildAtlas(key, characters[key])
  if (!atlas) { coverage.push({ key, noAnim: true }); continue }
  const cov = { key, hurt: [], ko: [], airKo: [], missingSheets: [] }
  for (const [action, info] of Object.entries(atlas.actions)) {
    totalActions++; totalFrames += info.frames
    const c = classify(action)
    if (c) cov[c].push(action)
    if (info.sheet && !info.exists && !cov.missingSheets.includes(info.sheet)) cov.missingSheets.push(info.sheet)
  }
  coverage.push(cov)
  if (!REPORT_ONLY) { fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(atlas, null, 2)); written++ }
}

// index + coverage summary
const summary = {
  generatedFrom: "characters.js animationData",
  globalScale: GLOBAL_SPRITE_SCALE,
  characters: keys.length,
  atlasesWritten: written,
  totalActions, totalFrames,
  coverage: coverage.map(c => c.noAnim
    ? { key: c.key, noAnim: true }
    : { key: c.key, hurt: c.hurt, ko: c.ko, airKo: c.airKo, missingSheets: c.missingSheets }),
}
if (!REPORT_ONLY) fs.writeFileSync(path.join(OUT_DIR, "_index.json"), JSON.stringify(summary, null, 2))

// ── console report ──
const withHurt = coverage.filter(c => c.hurt?.length).length
const withKo   = coverage.filter(c => c.ko?.length).length
const withAir  = coverage.filter(c => c.airKo?.length).length
const noHurt   = coverage.filter(c => !c.noAnim && !c.hurt?.length).map(c => c.key)
const noKo     = coverage.filter(c => !c.noAnim && !c.ko?.length).map(c => c.key)
const withAirList = coverage.filter(c => c.airKo?.length).map(c => c.key)
const missing  = coverage.filter(c => c.missingSheets?.length).map(c => `${c.key}(${c.missingSheets.length})`)

console.log(`\n=== SPLICE / INVENTORY REPORT ===`)
console.log(`characters: ${keys.length}  |  atlases ${REPORT_ONLY ? "(report-only)" : `written: ${written} → tools/atlases/`}`)
console.log(`total actions: ${totalActions}  |  total frames: ${totalFrames}`)
console.log(`\nHURT frames:       ${withHurt}/${keys.length}`)
console.log(`KO/knockdown:      ${withKo}/${keys.length}`)
console.log(`airborne-KO:       ${withAir}/${keys.length}  → ${withAirList.join(", ") || "(none)"}`)
console.log(`\nMISSING HURT (${noHurt.length}): ${noHurt.join(", ") || "none"}`)
console.log(`MISSING KO/knockdown (${noKo.length}): ${noKo.join(", ") || "none"}`)
console.log(`\nREFERENCED SHEETS NOT ON DISK (${missing.length} chars): ${missing.join(", ") || "none"}`)
