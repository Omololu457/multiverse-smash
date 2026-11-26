// omniTheme.js — the "OMNITRIX" Ben 10 theme skin every fighter gets (2026-11-25, owner request), RENDER ONLY.
// Not a flat tint: each sheet is re-designed as a Ben 10 alien suit, region by region, at load time (cached, ≤1 build / 14 ms):
//   • the outfit's MAIN colour (the most common saturated hue on the sheet) → Omnitrix green, keeping its shading
//   • every other saturated colour → the black suit (dark ones) or white / silver panels (bright ones)
//   • dark neutral cloth → the black alien bodysuit;  light neutral → white (or green when the outfit has no main colour)
//   • glowing green ENERGY SEAMS along every border between two panels (the Upgrade / XLR8 circuit look)
//   • the face / skin and the black outline stay as drawn (still recognisably them)
// …plus a big pulsing Omnitrix badge on the chest, drawn every frame from the frame's own opaque box (dnaScanFx.drawDnaEmblem).
// The same look dresses a DNA-scanned copy (dnaScan.js): Ben's copy of the foe IS the foe's Omnitrix skin.
// A skin is an Omnitrix skin when its id ends with OMNI_SUFFIX (skins.js registers one for every fighter).
// No Math.random; nothing here is read by the simulation.

export const OMNI_SUFFIX = '_omnitrixTheme'
export const OMNI_SCHEME = { ramp: ['#050806', '#0d2a10', '#22b322', '#9dff8f', '#ffffff'], glow: '#39ff3a', deep: '#0b3d0b', emblem: 'omnitrix', device: 'OMNITRIX', verb: 'NEW DNA SAMPLE ACQUIRED', big: true }
export const isOmniSkin = f => typeof f?.skinId === 'string' && f.skinId.endsWith(OMNI_SUFFIX)

// ── THE SUIT ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Every fighter is re-tailored as a Ben 10 alien suit in the WEARER's device colours, decided ONCE per character from its
// idle sheet (the same decision for every animation → no colour flipping between moves):
//   • kept as drawn  — outline, skin, HAIR (colour families living at the top of the body), and every colour the idle
//                      sheet doesn't have (technique FX: a Rasengan stays blue, fire stays fire)
//   • SUIT  (black)  — the outfit's biggest colour family + dark neutral cloth
//   • ACCENT (green) — the second family (or the light cloth when there's only one colour) — the Omnitrix stripe
//   • TRIM  (white)  — every other family + light neutral cloth
// Each pixel keeps its own shading inside its family (stretched to the ramp). The black suit gets a thin accent RIM where
// it meets the silhouette edge (the Omniverse alien look) so it never melts into a dark stage.
export const SUIT_PALETTES = {
  omni:    { suit: ['#05080a', '#0c1310', '#141f19', '#203027', '#33473b'], accent: ['#04260a', '#0b5414', '#18891f', '#36c23c', '#9cf290'], trim: ['#5c6561', '#a3ada8', '#dbe3de', '#f4faf6', '#ffffff'], rim: [0x39, 0xd8, 0x3c] },
  albedo:  { suit: ['#080405', '#130909', '#1f0f10', '#301819', '#472628'], accent: ['#3a0408', '#7a0a12', '#c8141f', '#ff5a5f', '#ffc8c8'], trim: ['#66605f', '#aba5a4', '#e2dcdb', '#f8f3f2', '#ffffff'], rim: [0xe0, 0x2a, 0x33] },
  kevin:   { suit: ['#0d1014', '#1a1f25', '#2a3038', '#3e4752', '#59646f'], accent: ['#0b3a16', '#1c7a31', '#38c464', '#86f3a6', '#dcffe6'], trim: ['#5f6a75', '#8e9aa6', '#bcc6cf', '#dfe6ec', '#ffffff'], rim: [0x7d, 0xff, 0x9a] },
  chrollo: { suit: ['#07040c', '#110a1d', '#1c1230', '#2a1b47', '#3e2a63'], accent: ['#260e48', '#46218a', '#6a3bbd', '#a383ea', '#e4d8ff'], trim: ['#5e5868', '#a39cae', '#d9d2e3', '#f3effa', '#ffffff'], rim: [0xa7, 0x8b, 0xfa] },
}
const LUTS = {}
const lut = stops => {
  const S = stops.map(h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }), out = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (S.length - 1), j = Math.min(S.length - 2, Math.floor(t)), u = t - j
    for (let c = 0; c < 3; c++) out[i * 3 + c] = S[j][c] + (S[j + 1][c] - S[j][c]) * u
  }
  return out
}
function lutsOf(pal) {
  if (!LUTS[pal]) { const P = SUIT_PALETTES[pal] || SUIT_PALETTES.omni; LUTS[pal] = { 1: lut(P.suit), 2: lut(P.accent), 3: lut(P.trim), rim: P.rim } }
  return LUTS[pal]
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360 }
  return [h, mx ? d / mx : 0, mx / 255]
}
// colour FAMILY of a pixel: -2 transparent · -1 outline · 14 skin · 0–11 saturated hue (30° bins) · 12 dark neutral · 13 light neutral
const SKIN = 14
function familyOf(r, g, b, a) {
  if (a < 8) return -2
  const [H, S, V] = hsv(r, g, b)
  if (V < 0.1) return -1
  if (H >= 8 && H <= 45 && S >= 0.12 && S <= 0.58 && V >= 0.42) return SKIN
  if (S >= 0.25 && V >= 0.16) return Math.floor(H / 30) % 12
  return V < 0.5 ? 12 : 13
}
const lumOf = (r, g, b) => Math.min(255, (r * 0.299 + g * 0.587 + b * 0.114) | 0)
// ROLE per family (0 keep · 1 suit · 2 accent · 3 trim) + its shading range, from ONE reference frame (the idle pose).
// fw / fh: the frame cell (the first frame of the sheet is the reference); 0 → the whole sheet.
export function omniAnalyze(d, w, h, fw = 0, fh = 0) {
  const W = Math.min(w, fw || w), Hh = Math.min(h, fh || h)
  const cnt = new Float64Array(15), top = new Float64Array(15), lo = new Float32Array(15).fill(255), hi = new Float32Array(15)
  let y0 = Hh, y1 = -1
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (d[(y * w + x) * 4 + 3] >= 8) { if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (y1 < 0) return null
  const topY = y0 + (y1 - y0) * 0.2
  let body = 0
  for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) {
    const o = (y * w + x) * 4, fam = familyOf(d[o], d[o + 1], d[o + 2], d[o + 3]); if (fam < 0) continue
    const l = lumOf(d[o], d[o + 1], d[o + 2])
    cnt[fam]++; body++; if (y <= topY) top[fam]++
    if (l < lo[fam]) lo[fam] = l; if (l > hi[fam]) hi[fam] = l
  }
  const role = new Uint8Array(15)   // 0 = keep (incl. skin and anything unseen → FX)
  const minA = Math.max(4, body * 0.006)
  const hair = f => cnt[f] >= minA && top[f] / cnt[f] >= 0.6 && cnt[f] < body * 0.3
  const sat = []; for (let f = 0; f < 12; f++) if (cnt[f] >= minA && !hair(f)) sat.push(f)
  sat.sort((a, b) => cnt[b] - cnt[a])
  const dark = cnt[12] >= minA && !hair(12), light = cnt[13] >= minA && !hair(13)
  if (sat.length) {
    role[sat[0]] = 1
    if (sat[1] != null) role[sat[1]] = 2
    for (const f of sat.slice(2)) role[f] = 3
  }
  if (dark) role[12] = 1
  if (light) role[13] = sat.length >= 2 ? 3 : 2
  if (!sat.length && !light && dark) role[12] = 1
  // every saturated hue bin the idle frame lacks stays FX (role 0); a family whose shading range is tiny gets a sane one
  for (let f = 0; f < 14; f++) if (hi[f] - lo[f] < 40) { const m = (hi[f] + lo[f]) / 2; lo[f] = Math.max(0, m - 60); hi[f] = Math.min(255, m + 60) }
  return { role, lo, hi }
}
// the HEAD of one frame cell — top of the silhouette down to the chin — when the frame shows a FACE (skin under the head
// column). Returns the chin row (absolute) or -1 (masked / helmeted / no face: the head is suited like the body).
function chinOf(d, w, cx0, cy0, fw, fh) {
  let y0 = -1, x0 = fw, x1 = -1, ys = -1
  for (let y = 0; y < fh && y0 < 0; y++) for (let x = 0; x < fw; x++) if (d[((cy0 + y) * w + cx0 + x) * 4 + 3] >= 8) { y0 = y; break }
  if (y0 < 0) return -1
  let tx = 0, tn = 0
  for (let y = y0; y < Math.min(fh, y0 + 3); y++) for (let x = 0; x < fw; x++) if (d[((cy0 + y) * w + cx0 + x) * 4 + 3] >= 8) { tx += x; tn++ }
  const topX = tn ? tx / tn : fw / 2
  for (let y = fh - 1; y >= 0 && ys < 0; y--) for (let x = 0; x < fw; x++) if (d[((cy0 + y) * w + cx0 + x) * 4 + 3] >= 8) { ys = y; break }
  const bh = ys - y0 + 1, half = Math.max(4, bh * 0.14)
  let fTop = -1, last = -1
  for (let y = y0; y <= y0 + bh * 0.42; y++) {
    let hit = false
    for (let x = Math.max(0, Math.round(topX - half)); x <= Math.min(fw - 1, Math.round(topX + half)); x++) {
      const o = ((cy0 + y) * w + cx0 + x) * 4; if (d[o + 3] >= 8 && familyOf(d[o], d[o + 1], d[o + 2], d[o + 3]) === SKIN) { hit = true; break }
    }
    if (hit) { if (fTop < 0) fTop = y; last = y } else if (fTop >= 0 && y - last > 2) break
  }
  if (fTop < 0 || last - fTop < 2) return -1
  return cy0 + Math.min(last, fTop + half * 2.2)
}
// recolour a sheet's pixels in place. ref = omniAnalyze of the character's idle frame (null → analyse this sheet itself).
// cell = { fw, fh } frame size: each frame's head (hair, headband, face) is kept as drawn so the fighter stays recognisable.
export function omniRecolor(d, w, h, ref = null, pal = 'omni', cell = null) {
  const R = ref || omniAnalyze(d, w, h), L = lutsOf(pal)
  if (!R) return d
  const n = w * h, fam = new Int8Array(n), role = new Uint8Array(n)
  for (let i = 0; i < n; i++) { const o = i * 4, f = familyOf(d[o], d[o + 1], d[o + 2], d[o + 3]); fam[i] = f; role[i] = f >= 0 ? R.role[f] : 0 }
  const fw = cell?.fw | 0, fh = cell?.fh | 0
  if (fw > 4 && fh > 4 && fw <= w && fh <= h) {
    for (let cy0 = 0; cy0 + fh <= h; cy0 += fh) for (let cx0 = 0; cx0 + fw <= w; cx0 += fw) {
      const chin = chinOf(d, w, cx0, cy0, fw, fh); if (chin < 0) continue
      for (let y = cy0; y <= chin; y++) for (let x = cx0; x < cx0 + fw; x++) role[y * w + x] = 0
    }
  }
  for (let i = 0; i < n; i++) {
    const rl = role[i]; if (!rl) continue
    const o = i * 4, f = fam[i], l = lumOf(d[o], d[o + 1], d[o + 2])
    let t = (l - R.lo[f]) / Math.max(24, R.hi[f] - R.lo[f]); t = t < 0 ? 0 : t > 1 ? 1 : t
    const u = rl === 1 ? t * 0.92 : rl === 2 ? 0.18 + 0.78 * t : 0.28 + 0.72 * t
    const T = L[rl], k = (u * 255 | 0) * 3
    d[o] = T[k]; d[o + 1] = T[k + 1]; d[o + 2] = T[k + 2]
  }
  // accent RIM: a suit pixel that touches the silhouette edge (transparent within 1 px, outline in between allowed) glows
  const rim = L.rim
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (role[i] !== 1) continue
    let edge = 0
    for (const q of [i - 1, i + 1, i - w, i + w]) { const fq = fam[q]; if (fq === -2) edge = 2; else if (fq === -1 && edge < 1) { const q2 = q + (q - i); if (q2 >= 0 && q2 < n && fam[q2] === -2) edge = 1 } }
    if (!edge) continue
    const o = i * 4, a = edge === 2 ? 0.55 : 0.32
    d[o] = d[o] * (1 - a) + rim[0] * a; d[o + 1] = d[o + 1] * (1 - a) + rim[1] * a; d[o + 2] = d[o + 2] * (1 - a) + rim[2] * a
  }
  return d
}

// ── select-screen card: the fighter's own idle frame in the Omnitrix look, on an Omnitrix backdrop, badge on the chest ─────
const _cards = new Map(), _imgs = new Map()
function _img(src) { let im = _imgs.get(src); if (!im && typeof Image !== 'undefined') { im = new Image(); im.src = src; _imgs.set(src, im) } return im }
export function omniBadge(c, x, y, r, pulse = 0.5) {
  c.save(); c.translate(x, y)
  c.shadowColor = '#39ff3a'; c.shadowBlur = r * (0.9 + pulse)
  c.fillStyle = '#0a0a0a'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill()
  c.lineWidth = r * 0.2; c.strokeStyle = '#e8e8e8'; c.stroke()
  c.shadowBlur = r * 0.6; c.fillStyle = '#39ff3a'; const q = r * 0.86; c.beginPath()
  c.moveTo(-q * 0.62, -q * 0.72); c.lineTo(q * 0.62, -q * 0.72); c.lineTo(q * 0.1, 0); c.lineTo(q * 0.62, q * 0.72); c.lineTo(-q * 0.62, q * 0.72); c.lineTo(-q * 0.1, 0); c.closePath(); c.fill()
  c.restore()
}
// character = characters[key]; returns a canvas once the idle sheet has loaded (null until then)
export function omniSkinCard(key, character) {
  if (_cards.has(key)) return _cards.get(key)
  const A = character?.animationData || {}, d = A.idle || A.stand || Object.values(A).find(v => v?.sheet)
  if (!d?.sheet || typeof document === 'undefined') return null
  const im = _img(d.sheet); if (!im || !im.complete || !(im.naturalWidth > 0)) return null
  try {
    const fw = Math.min(im.naturalWidth, d.width || d.frameWidth || im.naturalWidth), fh = Math.min(im.naturalHeight, d.height || d.frameHeight || im.naturalHeight)
    const f = document.createElement('canvas'); f.width = fw; f.height = fh
    const g = f.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, fw, fh, 0, 0, fw, fh)
    const data = g.getImageData(0, 0, fw, fh); omniRecolor(data.data, fw, fh); g.putImageData(data, 0, 0)
    const D = data.data; let x0 = fw, y0 = fh, x1 = -1, y1 = -1
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (D[(y * fw + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 < 0) { _cards.set(key, null); return null }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, W = 240, H = 300
    const k = Math.max(1, Math.floor(Math.min((W * 0.8) / bw, (H * 0.86) / bh)))
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d')
    const bg = o.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, H * 0.62)
    bg.addColorStop(0, '#1f6a22'); bg.addColorStop(0.55, '#0a2a0d'); bg.addColorStop(1, '#020804'); o.fillStyle = bg; o.fillRect(0, 0, W, H)
    o.globalAlpha = 0.16; o.fillStyle = '#7dff6a'; const R = H * 0.36; o.beginPath()   // the big hourglass watermark
    o.moveTo(W / 2 - R * 0.62, H * 0.45 - R * 0.72); o.lineTo(W / 2 + R * 0.62, H * 0.45 - R * 0.72); o.lineTo(W / 2 + R * 0.1, H * 0.45); o.lineTo(W / 2 + R * 0.62, H * 0.45 + R * 0.72)
    o.lineTo(W / 2 - R * 0.62, H * 0.45 + R * 0.72); o.lineTo(W / 2 - R * 0.1, H * 0.45); o.closePath(); o.fill(); o.globalAlpha = 1
    o.imageSmoothingEnabled = false
    const dx = Math.round((W - bw * k) / 2), dy = Math.round(H - 8 - bh * k)
    o.shadowColor = '#39ff3a'; o.shadowBlur = 14
    o.drawImage(f, x0, y0, bw, bh, dx, dy, bw * k, bh * k); o.shadowBlur = 0
    // badge on the chest: the opaque centre of the 25–40 % rows
    let sum = 0, n = 0
    for (let y = y0 + Math.round(bh * 0.25); y <= y0 + Math.round(bh * 0.4); y++) { let a = -1, b = -1; for (let x = x0; x <= x1; x++) if (D[(y * fw + x) * 4 + 3] > 30) { if (a < 0) a = x; b = x } if (a >= 0) { sum += (a + b) / 2; n++ } }
    const cxs = n ? sum / n : (x0 + x1) / 2
    omniBadge(o, dx + (cxs - x0) * k, dy + bh * 0.31 * k, Math.max(7, Math.min(22, Math.min(bw, bh * 0.5) * 0.2 * k)), 0.6)
    out.complete = true; out.naturalWidth = W; out.naturalHeight = H   // the UI's image helpers check these
    _cards.set(key, out); return out
  } catch (_) { _cards.set(key, null); return null }
}
