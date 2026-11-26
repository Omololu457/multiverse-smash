// tools/build_triage_data.mjs — regenerate triage_data.json (the data behind triage.html) from the LIVE roster.
//   node tools/build_triage_data.mjs
// Every playable, non-hidden roster character with sprites: key, name, universe, spriteScale, hasBrutality (a
// BRUTALITY_CONCEPTS entry), isNew (not in the previous triage_data.json), addedOn, and its animation table reduced to
// what triage.html draws (sheet / frames / width / height / speed / sourceX / sourceY). Keys already in the old file keep
// their position so saved keep/cut verdicts (localStorage, keyed by character key) stay attached.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "triage_data.json")
const { characterList } = await import(pathToFileURL(path.join(ROOT, "characters.js")))
const { BRUTALITY_CONCEPTS } = await import(pathToFileURL(path.join(ROOT, "brutalityConcepts.js")))
const { getSkins } = await import(pathToFileURL(path.join(ROOT, "skins.js")))
// SKINS: every selectable skin with its own art. A skin whose sheets are all "<default>__<tag>.png" is stored as {tag};
// anything else as an action → sheet map (only the actions that differ from the default).
const skinsOf = (key, actions) => (getSkins(key) || []).filter(s => s.id !== "default" && s.animationData).map(s => {
  const map = {}
  for (const [a, d] of Object.entries(s.animationData)) if (d?.sheet && actions[a] && d.sheet !== actions[a].sheet) map[a] = d.sheet
  const tags = new Set(Object.entries(map).map(([a, sh]) => { const b = actions[a].sheet.replace(/\.png$/i, ""); return sh.startsWith(b + "__") ? sh.slice(b.length + 2).replace(/\.png$/i, "") : null }))
  const tag = tags.size === 1 && !tags.has(null) && Object.keys(map).length === Object.keys(actions).length ? [...tags][0] : null
  return { id: s.id, name: s.name, creative: s.classification === "Creative", ...(tag ? { tag } : { map }) }
}).filter(s => s.tag || Object.keys(s.map).length)
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : []
const oldByKey = new Map(old.map(c => [c.key, c]))
const today = new Date().toISOString().slice(0, 10)

const actionsOf = c => {
  const out = {}
  for (const [a, d] of Object.entries(c.animationData || {})) {
    if (!d || typeof d.sheet !== "string") continue
    const width = d.frameWidth || d.width, height = d.frameHeight || d.height
    if (!width || !height) continue
    out[a] = { frames: d.frames || 1, width, height, speed: d.speed || 6, sheet: d.sheet, sourceX: d.sourceX || 0, sourceY: d.sourceY || 0 }
  }
  return out
}
const rows = []
for (const c of characterList) {
  if (c.isPlayable === false || c.hidden || !c.hasSprites) continue
  const key = c.rosterKey, actions = actionsOf(c)
  if (!key || !Object.keys(actions).length) continue
  const prev = oldByKey.get(key)
  rows.push({ key, name: c.displayName || c.name || key, universe: c.universe || "other", spriteScale: c.spriteScale || 1,
              hasBrutality: !!BRUTALITY_CONCEPTS[key], isNew: !prev, addedOn: prev?.addedOn || (prev ? null : today), actions, skins: skinsOf(key, actions) })
}
// old characters first in their old order, then the new ones grouped by universe
const pos = new Map(old.map((c, i) => [c.key, i]))
rows.sort((a, b) => (pos.has(a.key) ? pos.get(a.key) : 1e6) - (pos.has(b.key) ? pos.get(b.key) : 1e6) || a.universe.localeCompare(b.universe) || a.name.localeCompare(b.name))
fs.writeFileSync(OUT, JSON.stringify(rows))
const gone = old.filter(c => !rows.some(r => r.key === c.key)).map(c => c.key)
console.log(`triage_data.json: ${rows.reduce((n, r) => n + r.skins.length, 0)} skins, ${rows.length} characters (${rows.filter(r => r.isNew).length} new, ${rows.length - rows.filter(r => r.isNew).length} kept from before)`)
console.log("new:", rows.filter(r => r.isNew).map(r => r.key).join(", "))
if (gone.length) console.log("no longer playable (dropped from the page):", gone.join(", "))
