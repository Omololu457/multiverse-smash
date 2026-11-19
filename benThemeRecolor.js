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
// DETERMINISM: no randomness. The glitter / stars / glints (benThemes `sparkle`) are a fixed integer hash of each pixel's sheet
// coordinate (sprite-local): which pixels sparkle, their colour and their twinkle offset never change. They TWINKLE through 4
// cached phases (one cached canvas per phase), stepped by how many times this fighter has been drawn: never per-frame noise,
// never gameplay RNG, never wall-clock. With reduce-flashing on they are thinned to a quarter and do not animate.
// OUTLINE: the art's near-black linework takes a deep shade of the theme (so each theme reads differently even in silhouette);
// it stays near-black (luminance ≤ 30), so the outline still separates the fighter from the stage.
// This module never reads or writes gameplay state; it only swaps the image drawn.
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
  const t = Math.max(0, Math.min(1, 0.5 + (v - vref) * (rule.gain ?? 1.5)))
  return [...ramp(theme.roles[role], t), role]
}
// sprite-local deterministic hash of a sheet coordinate
function _hash(x, y) {
  let k = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0
  k = Math.imul(k ^ (k >>> 15), 0x2c1b3c6d) >>> 0; return (k ^ (k >>> 12)) >>> 0
}
export function sparkleAt(x, y, density) { return (_hash(x, y) % 10000) < density }
// density = per 10,000 pixels of the listed roles; cross = share of sparkles that flare into a 4-point star at their peak.
// Colours are picked for CONTRAST with the pixel underneath: `onDark` (bright) over a darker pixel, `onLight` (saturated)
// over a pale one, so glitter stays visible on a pearl-white body as well as on a dark one.
export const SPARKLE = {
  glitter: { density: 650, roles: ["P", "S", "A", "H"], cross: 0.55,
    colors: t => ({ onDark: ["#ffffff", "#ffe48a", "#9ff3ff", "#ffb3e0"], onLight: ["#ff2e9a", "#a63cff", "#1fa8ff", "#e3a400", t.roles.A[0]] }) },
  stars:   { density: 110, roles: ["P", "S"], cross: 0.4, colors: t => ({ onDark: ["#ffffff", t.roles.E[2], "#b9c7ff"], onLight: [t.roles.E[0], "#3b4bff"] }) },
  glint:   { density: 30,  roles: ["P", "A", "H"], cross: 0.75, colors: t => ({ onDark: ["#ffffff", t.roles.A[2]], onLight: ["#ffffff", t.roles.A[0]] }) },
}
export const SPARKLE_PHASES = 4
// the near-black outline colour for a theme: its most saturated dark (PRIMARY / SECONDARY), kept at luminance ≤ 30
const _outline = new Map()
function outlineColor(theme) {
  if (_outline.has(theme.id)) return _outline.get(theme.id)
  const sat = c => { const [h, s] = hsv(...hex(c)); return s }
  const pick = [theme.roles.P[0], theme.roles.S[0]].sort((a, b) => sat(b) - sat(a))[0]
  const rgb = hex(pick), l = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
  const k = l > 0 ? Math.min(0.75, 30 / l) : 0
  const out = sat(pick) < 0.12 ? null : rgb.map(c => Math.round(c * k))   // a grey theme keeps true black
  _outline.set(theme.id, out); return out
}

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
  const phase = opts.reduce ? 0 : ((opts.phase | 0) % SPARKLE_PHASES)
  const oc = theme && outlineColor(theme), cs = sp ? sp.colors(theme) : null
  const cols = cs && { d: cs.onDark.map(hex), l: cs.onLight.map(hex) }
  const lut = new Map(), pts = []
  for (let i = 0, n = w * h; i < n; i++) {
    const o = i * 4; if (data[o + 3] === 0) continue
    const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]
    let c = lut.get(key)
    if (c === undefined) {
      c = benThemeColor(regionKey, themeId, data[o], data[o + 1], data[o + 2])
      if (!c && oc) { const [, s0, v0] = hsv(data[o], data[o + 1], data[o + 2]); if (v0 < 0.14 && s0 < 0.45) c = [Math.min(255, oc[0] + data[o]), Math.min(255, oc[1] + data[o + 1]), Math.min(255, oc[2] + data[o + 2]), "O"] }
      lut.set(key, c)
    }
    if (!c) continue
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]               // alpha (data[o + 3]) is never written
    if (sp && sp.roles.includes(c[3])) { const x = i % w, y = (i / w) | 0, k = _hash(x, y); if (k % 10000 < dens) pts.push(i, k) }
  }
  // sparkles: a fixed set of pixels; each twinkles through 4 stages from its own fixed offset (peak, dot, faint, off)
  for (let j = 0; j < pts.length; j += 2) {
    const i = pts[j], k = pts[j + 1], stage = (((k >>> 4) & 3) + phase) & 3
    if (stage === 3) continue
    const o = i * 4, pale = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] > 150, set = pale ? cols.l : cols.d
    const col = set[(k >>> 8) % set.length], mix = stage === 2 ? 0.5 : 1
    for (let q = 0; q < 3; q++) data[o + q] = Math.round(data[o + q] + (col[q] - data[o + q]) * mix)
    if (stage === 0 && ((k >>> 12) % 100) < sp.cross * 100) {
      const x = i % w, y = (i / w) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const p = (ny * w + nx) * 4; if (data[p + 3] === 0) continue
        for (let q = 0; q < 3; q++) data[p + q] = Math.round(data[p + q] + (col[q] - data[p + q]) * 0.6)
      }
    }
  }
  return data
}

function _build(img, regionKey, themeId, phase) {
  const w = img.naturalWidth, h = img.naturalHeight
  const cv = document.createElement("canvas")
  cv.width = w; cv.height = h
  const cx = cv.getContext("2d", { willReadFrequently: true })
  cx.drawImage(img, 0, 0)
  const id = cx.getImageData(0, 0, w, h)
  recolorImageData(id.data, w, h, regionKey, themeId, { reduce: _reduce(), phase })
  cx.putImageData(id, 0, 0)
  // the renderer checks sheets with img.complete / naturalWidth: give the canvas the same face
  cv.complete = true; cv.naturalWidth = w; cv.naturalHeight = h
  return cv
}
function _key(appearance, form, themeId, path, phase) {
  return `ben10|${globalThis.__ASSET_V || ""}|${appearance}|${form}|${themeId}|${phase}|${path}`
}
const _draws = new WeakMap()                  // per-fighter draw count: steps the twinkle (render-only, never read by the sim)
export const SPARKLE_STEP = 7                 // draws per twinkle phase (~8.5 phase steps / s at 60 fps)
// Themed version of `img` (a loaded sheet at `path`) for this fighter, or null (no theme / not Ben / not loaded / no map).
export function benThemedSheet(f, path, img) {
  if (!f || !f._benTheme || f.rosterKey !== "ben10" || !path || !img || !img.complete || !(img.naturalWidth > 0)) return null
  if (typeof document === "undefined") return null
  const form = benThemeForm(f, path); if (!form) return null
  const n = (_draws.get(f) || 0) + 1; _draws.set(f, n)
  const phase = BEN_THEME_BY_ID[f._benTheme]?.sparkle && !_reduce() ? Math.floor(n / SPARKLE_STEP) % SPARKLE_PHASES : 0
  const k = _key(f._benAppearance, form, f._benTheme, path, phase)
  _last.set(f, { form, theme: f._benTheme, appearance: f._benAppearance, path, phase })
  let e = _cache.get(k)
  if (e && (e.w !== img.naturalWidth || e.h !== img.naturalHeight)) { _cache.delete(k); _px -= e.w * e.h; e = null }
  if (e) { _cache.delete(k); _cache.set(k, e); return e.cv }          // LRU touch
  let cv
  try { cv = _build(img, form, f._benTheme, phase) } catch (_) { return null }   // (tainted canvas etc.): draw the original
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
// trimmed to its opaque bounds so the card can draw it large. Cached per (sheet, appearance, theme, twinkle phase); a sparkle
// theme's card twinkles like the fighter (phase stepped by how often that card has been drawn). null until loaded.
const _cardImgs = new Map(), _cards = new Map(), _cardDraws = new Map()
export function benThemeCardImage(idle, appearance, themeId) {
  if (!idle?.sheet || typeof document === "undefined") return null
  let phase = 0
  if (themeId && BEN_THEME_BY_ID[themeId]?.sparkle && !_reduce()) { const ck = `${idle.sheet}|${themeId}`, n = (_cardDraws.get(ck) || 0) + 1; _cardDraws.set(ck, n); phase = Math.floor(n / SPARKLE_STEP) % SPARKLE_PHASES }
  const k = `${idle.sheet}|${appearance}|${themeId || "original"}|${phase}`
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
    if (themeId) { recolorImageData(d.data, fw, fh, appearance, themeId, { reduce: _reduce(), phase }); g.putImageData(d, 0, 0) }
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d.data[(y * fw + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 < 0) { _cards.set(k, null); return null }
    const t = document.createElement("canvas"); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1
    t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height)
    _cards.set(k, t); return t
  } catch (_) { return null }
}
