// ALBEDO THEME CACHE — browser-side, render-only. Albedo-only: albedoThemeSheet() returns null for every fighter whose
// rosterKey is not "albedo" or whose skin is not one of his 40 theme skins, so Ben (and every other fighter, and
// Albedo's two preserved defaults) render exactly as before.
//
// Namespace: cache keys are "albedo|<theme>|<form>|<sheet>|v<engine>.<asset>|fx<0/1>". Sources are Albedo's OWN __albedo
// sheets (albedoThemeManifest.js lists every one); nothing under Ben's art is read or written. Generated on demand per
// (owner=albedo, appearance via the sheet, form, theme, source version), held in a bounded LRU (MAX_SHEETS canvases), and
// keyed on the asset version so a reload / new build can never reuse a stale theme. No Math.random, no gameplay state:
// the only inputs are the sheet pixels, the theme, and the reduced-effects setting.
import { albedoThemeForFighter } from "./albedoThemes.js"
import { recolorAlbedoRGBA, ALBEDO_RECOLOR_VERSION } from "./albedoThemeRecolor.js"
import { ALBEDO_THEME_MANIFEST } from "./albedoThemeManifest.js"
import { juiceSettings } from "./juiceSettings.js"

export const ALBEDO_THEME_MAX_SHEETS = 256
const _ready = new Map()      // key → canvas (insertion order = LRU order)
const _pending = new Set()    // keys being generated
const _src = new Map()        // Albedo-owned source path → Image
const _formsOf = {}           // form → [strip]
for (const [s, f] of Object.entries(ALBEDO_THEME_MANIFEST.strips)) (_formsOf[f] ||= []).push(s)
export const albedoThemeStats = { generated: 0, evicted: 0, hits: 0, misses: 0, lastGenMs: 0, maxGenMs: 0 }

const _norm = p => String(p || "").replace(/^\.\//, "").replace(/\?.*$/, "")
const _assetV = () => (typeof globalThis !== "undefined" && globalThis.__ASSET_V) || ""
const _calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
export function albedoThemeCacheKey(themeId, form, sheet, calm = _calm()) {
  return `albedo|${themeId}|${form}|${_norm(sheet)}|v${ALBEDO_RECOLOR_VERSION}.${_assetV()}|fx${calm ? 0 : 1}`
}

function _loadSrc(path) {
  let img = _src.get(path)
  if (img) return img
  if (typeof Image === "undefined") return null
  img = new Image()
  const v = _assetV()
  img.src = "./" + path + (v ? "?v=" + v : "")
  _src.set(path, img)
  return img
}

// Generation is QUEUED and pumped once per animation frame under a small time budget (GEN_BUDGET_MS), so warming a whole
// form (Jetray: 36 large strips) never lands in one frame. The sheet the renderer is asking for right now jumps the queue.
const GEN_BUDGET_MS = 4
const _queue = []
let _pumping = false
const _now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
function _gen1(job) {
  const { key, img, form, theme, calm } = job
  try {
    if (!(img.naturalWidth > 0)) return
    const t0 = _now()
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = false
    g.drawImage(img, 0, 0)
    const id = g.getImageData(0, 0, c.width, c.height)
    recolorAlbedoRGBA(id.data, c.width, c.height, form, theme, { reducedFx: calm })
    g.putImageData(id, 0, 0)
    // sprite.js treats a sheet as drawable when complete && naturalWidth > 0 (an Image's contract) — mirror it.
    c.complete = true; c.naturalWidth = c.width; c.naturalHeight = c.height
    _ready.set(key, c)
    while (_ready.size > ALBEDO_THEME_MAX_SHEETS) { _ready.delete(_ready.keys().next().value); albedoThemeStats.evicted++ }
    const dt = _now() - t0
    albedoThemeStats.generated++; albedoThemeStats.lastGenMs = dt; albedoThemeStats.maxGenMs = Math.max(albedoThemeStats.maxGenMs, dt)
  } catch (_) { /* a failed sheet just keeps the default __albedo art */ }
  finally { _pending.delete(key) }
}
function _pump() {
  _pumping = false
  const t0 = _now()
  let did = 0
  while (_queue.length) {
    const i = _queue.findIndex(j => j.img.complete && j.img.naturalWidth > 0)
    if (i < 0) break
    _gen1(_queue.splice(i, 1)[0]); did++
    if (_now() - t0 >= GEN_BUDGET_MS) break
  }
  if (_queue.length) _schedule()
}
function _schedule() {
  if (_pumping) return
  _pumping = true
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(_pump); else setTimeout(_pump, 16)
}
function _generate(key, path, form, theme, calm, urgent = false) {
  if (_ready.has(key)) return
  if (_pending.has(key)) {
    if (urgent) { const i = _queue.findIndex(j => j.key === key); if (i > 0) _queue.unshift(_queue.splice(i, 1)[0]) }
    return
  }
  const img = _loadSrc(path); if (!img) return
  _pending.add(key)
  const job = { key, img, form, theme, calm }
  if (urgent) _queue.unshift(job); else _queue.push(job)
  img.addEventListener("error", () => { _pending.delete(key); const i = _queue.indexOf(job); if (i >= 0) _queue.splice(i, 1) }, { once: true })
  _schedule()
}

// Warm every strip of a form (so a transform shows the themed art on its first frames, not one default frame).
export function warmAlbedoThemeForm(themeObj, form) {
  const calm = _calm()
  for (const s of _formsOf[form] || []) _generate(albedoThemeCacheKey(themeObj.id, form, s, calm), s, form, themeObj, calm)
}
const _warmSig = new WeakMap()   // fighter → last warmed signature (kept OFF the fighter object: no state writes)
function _warmFighter(f, th) {
  const loadout = (f.omnitrix && f.omnitrix.aliens) || []
  const sig = th.themeId + "|" + th.appearance + "|" + loadout.join(",")
  if (_warmSig.get(f) === sig) return
  _warmSig.set(f, sig)
  warmAlbedoThemeForm(th.theme, th.appearance)
  for (const a of loadout) if (_formsOf[a]) warmAlbedoThemeForm(th.theme, a)
}

// RENDER HOOK (sprite.js): the themed canvas for this fighter's sheet, or null → draw the original sheet.
// lastDrawn: per side, the cache key of the last themed sheet handed to the renderer (null = original art). Debug /
// verification only (harness/albedo_themes_render.mjs); never read by the game.
const _lastDrawn = {}
export function albedoThemeSheet(fighter, sheetPath) {
  const side = fighter && fighter.side
  const th = albedoThemeForFighter(fighter)
  if (!th) { if (side) _lastDrawn[side] = null; return null }
  const path = _norm(sheetPath), form = ALBEDO_THEME_MANIFEST.strips[path]
  if (!form) { if (side) _lastDrawn[side] = null; return null }
  if (typeof document === "undefined") return null
  _warmFighter(fighter, th)
  const calm = _calm(), key = albedoThemeCacheKey(th.themeId, form, path, calm)
  const c = _ready.get(key)
  if (c) { _ready.delete(key); _ready.set(key, c); albedoThemeStats.hits++; if (side) _lastDrawn[side] = key; return c }
  if (side) _lastDrawn[side] = null
  albedoThemeStats.misses++
  _generate(key, path, form, th.theme, calm, true)
  if (!_formsOf[form] || form === th.appearance) return null
  warmAlbedoThemeForm(th.theme, form)
  return null
}

export function albedoThemeCacheInfo() { return { size: _ready.size, pending: _pending.size, queued: _queue.length, keys: [..._ready.keys()], lastDrawn: { ..._lastDrawn }, ...albedoThemeStats } }
export function clearAlbedoThemeCache() { _ready.clear(); _pending.clear(); _queue.length = 0 }
