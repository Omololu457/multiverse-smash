// ALBEDO THEME RECOLOR ENGINE — pure, deterministic, DOM-free (runs in the browser cache and in node tools/tests).
// Albedo-only: it is only ever handed Albedo's own __albedo sheets (albedoThemeCache.js / tools/albedo/*).
//
// recolorAlbedoRGBA(data, w, h, form, theme, opts) mutates an RGBA buffer in place:
//   1. every opaque pixel is classified by its form's REGION RULES (albedoThemeRegions.js) — exact palette entries for the
//      human art, HSV windows for the resampled alien art; unmatched pixels (skin, outlines, FX-like whites) are KEPT.
//   2. a matched pixel takes its role's theme colour at a lightness RAMPED by the pixel's own brightness relative to the
//      role's reference brightness (vref, measured over every strip of that form) — shading, facets, flame cores survive.
//   3. alpha is never touched (alpha curves / intangible fades are preserved; only colour of opaque pixels changes).
//   4. optional finishes, all sprite-local and hash-based (NO Math.random, no time input, no gameplay state):
//      stars (sparse points inside interior primary pixels), glitter (a few glints on highlights), metal (hard spec ramp),
//      rim (dark primaries get a lighter 1–2px inner rim so limbs never merge into a flat black silhouette).
import { ALBEDO_REGIONS } from "./albedoThemeRegions.js"
import { ALBEDO_THEME_MANIFEST } from "./albedoThemeManifest.js"

export const ALBEDO_RECOLOR_VERSION = 1

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d > 1e-9) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60; if (h < 0) h += 360
  return [h, mx > 0 ? d / mx : 0, mx]
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  let h = 0, s = 0
  if (d > 1e-9) {
    s = d / (1 - Math.abs(2 * l - 1))
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return [h, s, l]
}
function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x
const lerp = (a, b, t) => a + (b - a) * t
const mix = (A, B, t) => [Math.round(lerp(A[0], B[0], t)), Math.round(lerp(A[1], B[1], t)), Math.round(lerp(A[2], B[2], t))]

// Integer hash of a sprite-local coordinate (deterministic, platform-independent: 32-bit integer math only).
export function albedoHash(x, y, salt) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

function inHue(h, [lo, hi]) { return lo <= hi ? (h >= lo && h <= hi) : (h >= lo || h <= hi) }
function ruleMatches(rule, r, g, b, hsv, yf) {
  if (rule.y && (yf === undefined || yf < rule.y[0] || yf > rule.y[1])) return false
  if (rule.hex) return rule._set.has((r << 16) | (g << 8) | b)
  if (rule.h && !inHue(hsv[0], rule.h)) return false
  if (rule.s && (hsv[1] < rule.s[0] || hsv[1] > rule.s[1])) return false
  if (rule.v && (hsv[2] < rule.v[0] || hsv[2] > rule.v[1])) return false
  return true
}
function prepRules(rules) {
  for (const r of rules) if (r.hex && !r._set) r._set = new Set(r.hex.map(x => { const [a, b, c] = hex(x); return (a << 16) | (b << 8) | c }))
  return rules
}

// First-match rule index for a colour (-1 = keep). Exported for the region docs / tests.
export function classifyAlbedoPixel(form, r, g, b, yf) {
  const R = ALBEDO_REGIONS[form]; if (!R) return -1
  const rules = prepRules(R.rules), hsv = rgb2hsv(r, g, b)
  for (let i = 0; i < rules.length; i++) if (ruleMatches(rules[i], r, g, b, hsv, yf)) return i
  return -1
}

// Theme colour for a role, ramped by t = (pixel value / role reference value). Lightness-only ramp in HSL with a guaranteed
// minimum span so near-black bases keep visible internal shading (never a flat silhouette).
function rampColor(base, t, opts = {}) {
  const [H, S, L] = rgb2hsl(...base)
  const dark = L < 0.16
  const lo = dark ? 0.025 : Math.max(0.02, L * 0.3)
  const hi = dark ? Math.min(0.55, L + 0.30) : L + (1 - L) * (opts.metal ? 0.85 : 0.6)
  let l, s = S
  if (t <= 1) {
    const k = Math.pow(clamp01(t), 0.85)
    l = dark ? lerp(lo, L + 0.06, k) : lerp(lo, L, k)
    s = S * lerp(0.85, 1, k)
  } else {
    const k = clamp01((t - 1) / 0.6)
    l = lerp(dark ? L + 0.06 : L, hi, opts.metal ? Math.sqrt(k) : k)
    s = S * lerp(1, 0.6, k)
  }
  return hsl2rgb(H, clamp01(s), clamp01(l))
}

// Role → theme colour + per-rule modifiers (shade scales the base lightness, e.g. older Albedo's undershirt = darker
// secondary than the jeans).
function roleBase(theme, role, shade) {
  const key = role === "core" ? "energyCore" : role
  let c = hex(theme[key] || theme.energy)
  if (shade && shade !== 1) { const [H, S, L] = rgb2hsl(...c); c = hsl2rgb(H, S, clamp01(L * shade)) }
  return c
}

export function recolorAlbedoRGBA(data, w, h, form, theme, opts = {}) {
  const R = ALBEDO_REGIONS[form]
  if (!R || !theme) return { changed: 0 }
  const rules = prepRules(R.rules)
  const vref = (opts.vref && opts.vref[form]) || ALBEDO_THEME_MANIFEST.vref[form] || []
  const fx = opts.reducedFx ? null : theme.fx || null
  const n = w * h
  const roleIdx = new Int16Array(n).fill(-1)
  const tval = new Float32Array(n)
  const memo = new Map()
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (data[i + 3] === 0) continue
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    let m = R.positional ? undefined : memo.get(key)
    if (m === undefined) {
      const hsv = rgb2hsv(data[i], data[i + 1], data[i + 2]), yf = Math.floor(p / w) / h
      let idx = -1
      for (let k = 0; k < rules.length; k++) if (ruleMatches(rules[k], data[i], data[i + 1], data[i + 2], hsv, yf)) { idx = k; break }
      m = idx < 0 || rules[idx].role === "keep" ? -1 : idx
      if (!R.positional) memo.set(key, m)
      memo.set(-1 - key, hsv[2])
    }
    if (m < 0) continue
    roleIdx[p] = m
    const ref = vref[m] || 0.8
    tval[p] = memo.get(-1 - key) / ref
  }
  const darkPrimary = rgb2hsl(...hex(theme.primary))[2] < 0.16
  const outMemo = new Map()
  let changed = 0
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    const m = roleIdx[p]; if (m < 0) continue
    const rule = rules[m], role = rule.role, i = p * 4
    let t = rule.flat ? rule.flat : tval[p]
    if (rule.squash) t = 1 + (t - 1) * rule.squash
    // RIM (rules flagged rim, dark theme primary only): lighten pixels within 3px (graded) of a non-primary / transparent neighbour (limb separation).
    if (role === "primary" && rule.rim && (darkPrimary || rule.flat)) {
      let edge = 0
      for (let d = 1; d <= 3 && !edge; d++) {
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
          const xx = x + dx, yy = y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || roleIdx[yy * w + xx] !== m) { edge = d; break }
        }
      }
      if (edge === 1) t = Math.max(t, 1.35); else if (edge === 2) t = Math.max(t, 1.18); else if (edge === 3) t = Math.max(t, 1.06)
    }
    const tq = Math.round(t * 32)
    const okey = m * 100000 + tq
    let c = outMemo.get(okey)
    if (!c) {
      const base = roleBase(theme, role, rule.shade)
      c = rampColor(base, tq / 32, { metal: fx === "metal" && role === "accent" })
      if (role === "hair" && theme.hairHi && tq / 32 > 0.92) c = hex(theme.hairHi)
      if (fx === "glitter" && role === "primary") {          // opal: shadows lean lavender, highlights lean cyan
        if (tq / 32 < 0.7) c = mix(c, hex(theme.secondary), 0.35)
        else if (tq / 32 > 1.02) c = mix(c, hex(theme.accentAlt || theme.accent), 0.3)
      }
      outMemo.set(okey, c)
    }
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]
    changed++
    // FINISHES (deterministic per sheet pixel; alpha untouched).
    if (fx === "stars" && role === "primary") {
      const interior = x > 1 && y > 1 && x < w - 2 && y < h - 2 && roleIdx[p - 1] === m && roleIdx[p + 1] === m && roleIdx[p - w] === m && roleIdx[p + w] === m
      if (interior) {
        const hv = albedoHash(x, y, 3) % 131
        if (hv === 0) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255 }
        else if (hv === 1) { const e = hex(theme.energy); data[i] = e[0]; data[i + 1] = e[1]; data[i + 2] = e[2] }
      }
    } else if (fx === "glitter" && (role === "primary" || role === "accent") && tq / 32 > 0.95 && albedoHash(x, y, 20) % 37 === 0) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255
    }
  }
  return { changed }
}
