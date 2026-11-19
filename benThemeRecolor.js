// benThemeRecolor.js: draws Ben's cosmetic THEME (benThemes.js) onto whatever sheet his fighter is drawing, on demand.
//
// WHY RUNTIME, NOT 20 PNG SETS: 20 themes × (2 humans + 24 READY aliens, ~1,000 body strips) would be ~20,000 files. Instead
// the sheet the sprite renderer is ABOUT TO DRAW is recoloured once (per-colour lookup through the set's regional map,
// benThemeRegions.js) into a canvas, then cached. Same size, same alpha, same frame layout: frame timing, crop rects,
// anchors and hitboxes cannot move (they never read pixels).
//
// CACHE: key = owner | asset version (window.__ASSET_V, the project's cache-bust stamp) | appearance | form | theme | sheet
// path. Bounded LRU by pixel budget (THEME_CACHE_PX); a stale entry (the source image changed size, or a new asset version)
// can never match its key. Nothing is generated at startup: a match prewarms only the sheets its two fighters can draw.
//
// DETERMINISM: no randomness. The Alien X "stars" / Opal "glitter" are a fixed integer hash of each pixel's sheet coordinate
// (sprite-local), baked once into the cached canvas: no per-frame noise, no animation. With reduce-flashing on they are
// thinned to a quarter. This module never reads or writes gameplay state; it only swaps the image drawn.
import { BEN_THEME_BY_ID, parseBenThemeSkin } from "./benThemes.js"
import { BEN_THEME_REGIONS } from "./benThemeRegions.js"

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return [h, mx ? d / mx : 0, mx / 255]
}
const inH = (h, [lo, hi]) => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi)
const lerp = (a, b, t) => a + (b - a) * t
function ramp(sw, t) {           // [dark, mid, light] hex → rgb at t ∈ [0, 1]
  const [d, m, l] = sw.map(hex)
  const [a, b, u] = t < 0.5 ? [d, m, t * 2] : [m, l, (t - 0.5) * 2]
  return [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], u)))
}

// The rule a source colour falls under in this set (null = left as drawn).
export function benThemeRule(regionKey, r, g, b) {
  const set = BEN_THEME_REGIONS[regionKey]; if (!set) return null
  const [h, s, v] = hsv(r, g, b)
  for (const rule of set.rules) if (inH(h, rule.h) && s >= rule.s[0] && s <= rule.s[1] && v >= rule.v[0] && v <= rule.v[1]) return rule
  return null
}
const _lum = h => { const [r, g, b] = hex(h); return 0.299 * r + 0.587 * g + 0.114 * b }
const _darkPrimary = t => _lum(t.roles.P[1]) < 56 && _lum(t.roles.S[1]) > _lum(t.roles.P[1])
// PURE: one source colour → its themed colour ([r, g, b, role] or null = unchanged). Same inputs → same output, always.
export function benThemeColor(regionKey, themeId, r, g, b) {
  const theme = BEN_THEME_BY_ID[themeId], rule = theme && benThemeRule(regionKey, r, g, b)
  if (!rule) return null
  let role = rule.role
  // A clothing panel drawn with black linework (Classic's striped shirt, the jacket over a black undershirt) would lose that
  // linework on a near-black PRIMARY. Rules marked swapDark trade PRIMARY ↔ SECONDARY for such themes when SECONDARY is the
  // lighter of the two, so the outfit keeps its read (e.g. Live Wire: cream shirt, black pants).
  if (rule.swapDark && _darkPrimary(theme)) role = rule.swapDark
  // A PALE region (a white chest / belly / underside) takes the LIGHTEST of the listed roles, so the alien keeps its
  // light-vs-dark read (Rath's white chest against his body) instead of going dark on a dark SECONDARY.
  if (rule.light) { let best = null; for (const k of rule.light) if (theme.roles[k] && (!best || _lum(theme.roles[k][1]) > _lum(theme.roles[best][1]))) best = k; if (best) role = best }
  if (!theme.roles[role]) { if ((rule.fb || "keep") === "keep") return null; role = rule.fb }
  const vref = hsv(...hex(rule.ref))[2], v = hsv(r, g, b)[2]
  const t = Math.max(0, Math.min(1, 0.5 + (v - vref) * (rule.gain ?? 1.15)))
  return [...ramp(theme.roles[role], t), role]
}
// sprite-local deterministic sparkle (integer hash of the sheet coordinate)
export function sparkleAt(x, y, density) {
  let k = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0
  k = Math.imul(k ^ (k >>> 15), 0x2c1b3c6d) >>> 0; k = (k ^ (k >>> 12)) >>> 0
  return (k % 10000) < density
}
const SPARKLE = { stars: { density: 40, roles: ["P"], color: t => t.roles.E[2] }, glitter: { density: 90, roles: ["P", "S"], color: t => (t.roles.H || t.roles.E)[2] } }

// Which regional map a sheet uses: the active READY alien while transformed, else the human appearance.
export function benThemeForm(f, path) {
  if (f?.transformed && f.activeAlien) return BEN_THEME_REGIONS[f.activeAlien] ? f.activeAlien : null   // legacy twins: untouched
  if (/__classic\.png$/i.test(path || "")) return "classic"
  return f?._benAppearance || null
}

const _last = new WeakMap()                    // diagnostics only (render checks): what this fighter last drew themed
export const benThemeLast = f => _last.get(f) || null
export const THEME_CACHE_PX = 24e6           // ≈ 96 MB of RGBA at most, least-recently-drawn evicted first
const _cache = new Map(); let _px = 0
export const benThemeCacheStats = () => ({ entries: _cache.size, px: _px })
function _reduce() { try { return globalThis.localStorage?.getItem("ms_juice_reduce_flash") === "1" } catch (_) { return false } }

export function recolorImageData(data, w, h, regionKey, themeId, opts = {}) {
  const theme = BEN_THEME_BY_ID[themeId], sp = theme?.sparkle && SPARKLE[theme.sparkle]
  const dens = sp ? (opts.reduce ? sp.density / 4 : sp.density) : 0
  const lut = new Map()
  for (let i = 0, n = w * h; i < n; i++) {
    const o = i * 4; if (data[o + 3] === 0) continue
    const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]
    let c = lut.get(key)
    if (c === undefined) { c = benThemeColor(regionKey, themeId, data[o], data[o + 1], data[o + 2]); lut.set(key, c) }
    if (!c) continue
    if (sp && sp.roles.includes(c[3]) && sparkleAt(i % w, (i / w) | 0, dens)) { const s = hex(sp.color(theme)); data[o] = s[0]; data[o + 1] = s[1]; data[o + 2] = s[2]; continue }
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]               // alpha (data[o + 3]) is never written
  }
  return data
}

function _build(img, regionKey, themeId) {
  const w = img.naturalWidth, h = img.naturalHeight
  const cv = document.createElement("canvas")
  cv.width = w; cv.height = h
  const cx = cv.getContext("2d", { willReadFrequently: true })
  cx.drawImage(img, 0, 0)
  const id = cx.getImageData(0, 0, w, h)
  recolorImageData(id.data, w, h, regionKey, themeId, { reduce: _reduce() })
  cx.putImageData(id, 0, 0)
  // the renderer checks sheets with img.complete / naturalWidth: give the canvas the same face
  cv.complete = true; cv.naturalWidth = w; cv.naturalHeight = h
  return cv
}
function _key(appearance, form, themeId, path) {
  return `ben10|${globalThis.__ASSET_V || ""}|${appearance}|${form}|${themeId}|${path}`
}
// Themed version of `img` (a loaded sheet at `path`) for this fighter, or null (no theme / not Ben / not loaded / no map).
export function benThemedSheet(f, path, img) {
  if (!f || !f._benTheme || f.rosterKey !== "ben10" || !path || !img || !img.complete || !(img.naturalWidth > 0)) return null
  if (typeof document === "undefined") return null
  const form = benThemeForm(f, path); if (!form) return null
  const k = _key(f._benAppearance, form, f._benTheme, path)
  _last.set(f, { form, theme: f._benTheme, appearance: f._benAppearance, path })
  let e = _cache.get(k)
  if (e && (e.w !== img.naturalWidth || e.h !== img.naturalHeight)) { _cache.delete(k); _px -= e.w * e.h; e = null }
  if (e) { _cache.delete(k); _cache.set(k, e); return e.cv }          // LRU touch
  let cv
  try { cv = _build(img, form, f._benTheme) } catch (_) { return null }   // (tainted canvas etc.): draw the original
  e = { cv, w: img.naturalWidth, h: img.naturalHeight }
  _cache.set(k, e); _px += e.w * e.h
  for (const [ok, oe] of _cache) { if (_px <= THEME_CACHE_PX || ok === k) break; _cache.delete(ok); _px -= oe.w * oe.h }
  return cv
}

// The theme fields a skin stamps on the fighter (applySkin). Albedo / anyone else: always cleared.
export function benThemeFieldsForSkin(rosterKey, skinId) {
  const p = rosterKey === "ben10" ? parseBenThemeSkin(skinId) : null
  return p ? { _benTheme: p.themeId, _benAppearance: p.appearance } : { _benTheme: null, _benAppearance: null }
}

// SELECT-SCREEN CARD IMAGE: the appearance's first idle frame, recoloured in the card's theme (null = the original colours),
// trimmed to its opaque bounds so the card can draw it large. Cached per (sheet, appearance, theme). null until loaded.
const _cardImgs = new Map(), _cards = new Map()
export function benThemeCardImage(idle, appearance, themeId) {
  if (!idle?.sheet || typeof document === "undefined") return null
  const k = `${idle.sheet}|${appearance}|${themeId || "original"}`
  if (_cards.has(k)) return _cards.get(k)
  let im = _cardImgs.get(idle.sheet)
  if (!im) {
    im = new Image(); const v = globalThis.__ASSET_V || ""
    im.src = v ? `${idle.sheet}${idle.sheet.includes("?") ? "&" : "?"}v=${v}` : idle.sheet
    _cardImgs.set(idle.sheet, im)
  }
  if (!im.complete || !(im.naturalWidth > 0)) return null
  try {
    const fw = idle.width || im.naturalHeight, fh = idle.height || im.naturalHeight
    const c = document.createElement("canvas"); c.width = fw; c.height = fh
    const g = c.getContext("2d", { willReadFrequently: true })
    g.drawImage(im, idle.sourceX || 0, idle.sourceY || 0, fw, fh, 0, 0, fw, fh)
    const d = g.getImageData(0, 0, fw, fh)
    if (themeId) { recolorImageData(d.data, fw, fh, appearance, themeId, { reduce: _reduce() }); g.putImageData(d, 0, 0) }
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d.data[(y * fw + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 < 0) { _cards.set(k, null); return null }
    const t = document.createElement("canvas"); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1
    t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height)
    _cards.set(k, t); return t
  } catch (_) { return null }
}
