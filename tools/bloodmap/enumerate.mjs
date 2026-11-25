// tools/bloodmap/enumerate.mjs — MSV1-BLOOD: list every animation def (sheet + source rect + frames) each PLAYABLE
// character can draw: its own characters.js object (animationData + any nested form anims), every skin's animationData
// (skins.js), and every form / transformation anim exported by any module (assigned to a character by asset directory).
//   node tools/bloodmap/enumerate.mjs [out.json]     (run from the repo root)
import fs from 'node:fs'
import path from 'node:path'
globalThis.window ??= globalThis
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {}, querySelector: () => null, getElementById: () => null, body: { appendChild() {} } }
globalThis.navigator ??= { getGamepads: () => [] }
globalThis.Image ??= class { set src(v) {} }
globalThis.addEventListener ??= () => {}
globalThis.requestAnimationFrame ??= () => 0
const ROOT = process.cwd(), OUT = process.argv[2] || 'tools/bloodmap/defs.json'
const norm = s => s.replace(/^\.\//, '').replace(/^\//, '')
const isDef = v => v && typeof v === 'object' && typeof v.sheet === 'string' && v.width > 0 && v.height > 0
const keyOf = d => `${norm(d.sheet)}|${d.sourceX || 0}|${d.sourceY || 0}|${d.width}|${d.height}|${d.frames || 1}`
function collect(root, into, src, seen = new WeakSet(), depth = 0, act = null) {
  if (!root || typeof root !== 'object' || seen.has(root) || depth > 7) return
  seen.add(root)
  if (isDef(root)) { const k = keyOf(root); if (!into.has(k)) into.set(k, { sheet: norm(root.sheet), sx: root.sourceX || 0, sy: root.sourceY || 0, w: root.width, h: root.height, n: root.frames || 1, act, src }); return }
  for (const [k, v] of Array.isArray(root) ? root.entries() : Object.entries(root)) collect(v, into, src, seen, depth + 1, typeof k === 'string' ? k : act)
}
const { characters } = await import(path.join(ROOT, 'characters.js'))
const { SKINS } = await import(path.join(ROOT, 'skins.js'))
const playable = Object.entries(characters).filter(([, c]) => !c.hidden && c.isPlayable !== false && c.hasSprites)
const per = {}, dirOwner = new Map()
for (const [k, c] of playable) {
  const m = new Map()
  collect(c, m, 'characters.js')
  per[k] = { name: c.name, universe: c.universe, base: [...m.keys()], defs: m }
  for (const d of m.values()) { const dir = path.dirname(d.sheet); if (!dirOwner.has(dir)) dirOwner.set(dir, k) }
  for (const s of SKINS[k] || []) if (s.animationData) collect(s.animationData, m, 'skins.js:' + s.id)
}
// module-exported forms (transformations / alien bodies / summoned-form art)
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'game.js')
const extra = new Map()
for (const f of files) {
  try {
    const mod = await import(path.join(ROOT, f))
    for (const [name, v] of Object.entries(mod)) {
      if (typeof v === 'function') { if (/Anim$/i.test(name) && v.length === 0) try { collect(v(), extra, f + ':' + name) } catch {} }
      else collect(v, extra, f + ':' + name)
    }
  } catch {}
}
// root-level sheets (no directory, e.g. the Ben 10 alien bodies): owner = the playable character whose own root-level
// sheets share the longest file-name prefix (≥ 5 chars); a few form directories belong to a hidden roster entry that
// is really another fighter's form (MSV1 duo: ns_yellow is the windrangers swap form).
const FORM_DIR_OWNER = { 'assets/ns_yellow': 'windrangers', 'assets/ns_red': 'windrangers' }
const rootNames = []
for (const [k, p] of Object.entries(per)) for (const d of p.defs.values()) if (!d.sheet.includes('/')) rootNames.push([d.sheet, k])
function rootOwner(file) {
  let best = null, bl = 4
  for (const [n, k] of rootNames) { let i = 0; while (i < n.length && n[i] === file[i]) i++; if (i > bl) { bl = i; best = k } }
  return best
}
let assigned = 0, orphan = 0
for (const [k, d] of extra) {
  let dir = path.dirname(d.sheet), owner = FORM_DIR_OWNER[dir] || null
  if (!owner && dir === '.') owner = rootOwner(d.sheet)
  while (!owner && dir && dir !== '.' && !(owner = dirOwner.get(dir))) dir = path.dirname(dir)
  if (owner && !per[owner]) owner = null   // form dir owned by a fighter that is no longer playable
  if (owner && !per[owner].defs.has(k)) { per[owner].defs.set(k, { ...d, form: true }); assigned++ } else if (!owner) orphan++
}
const out = {}
let frames = 0, missing = 0
for (const [k, p] of Object.entries(per)) {
  const defs = [...p.defs.values()].filter(d => { const ok = fs.existsSync(path.join(ROOT, d.sheet)); if (!ok) missing++; return ok })
  frames += defs.reduce((a, d) => a + d.n, 0)
  out[k] = { name: p.name, universe: p.universe, defs: defs.map(d => ({ ...d, base: p.base.includes(keyOf({ sheet: d.sheet, sourceX: d.sx, sourceY: d.sy, width: d.w, height: d.h, frames: d.n })) })) }
}
fs.writeFileSync(OUT, JSON.stringify(out))
console.log(`characters ${Object.keys(out).length} · form defs assigned ${assigned} (orphans ${orphan}) · defs on disk ${Object.values(out).reduce((a, c) => a + c.defs.length, 0)} (missing files skipped ${missing}) · frames ${frames}`)
