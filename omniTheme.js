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

const GREEN = ['#010803', '#04260c', '#0a5a1a', '#14a02c', '#3ee84a', '#b8ffa8']
const WHITE = ['#141816', '#4a524e', '#9aa6a0', '#d8e2dc', '#f4fbf6', '#ffffff']
const BLACK = ['#000000', '#050806', '#0b110d', '#141d17', '#202c24', '#2f3d33']
const SEAM = [0x5d, 0xff, 0x6a], SEAM_HOT = [0xd8, 0xff, 0xd0]
const lut = stops => {
  const S = stops.map(h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }), out = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (S.length - 1), j = Math.min(S.length - 2, Math.floor(t)), u = t - j
    for (let c = 0; c < 3; c++) out[i * 3 + c] = S[j][c] + (S[j + 1][c] - S[j][c]) * u
  }
  return out
}
const L_GREEN = lut(GREEN), L_WHITE = lut(WHITE), L_BLACK = lut(BLACK)

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360 }
  return [h, mx ? d / mx : 0, mx / 255]
}
// class codes: 0 transparent · 1 outline · 2 skin · 3 main colour (green) · 4 other colour (white) · 5 dark cloth (black) · 6 light cloth
export function omniRecolor(d, w, h) {
  const n = w * h, cls = new Uint8Array(n), lum = new Uint8Array(n), hue = new Uint16Array(n)
  const bins = new Float32Array(12)
  for (let i = 0; i < n; i++) {
    const o = i * 4; if (d[o + 3] < 8) continue
    const r = d[o], g = d[o + 1], b = d[o + 2], [H, S, V] = hsv(r, g, b)
    lum[i] = Math.min(255, (r * 0.299 + g * 0.587 + b * 0.114) | 0); hue[i] = H | 0
    if (V < 0.1) { cls[i] = 1; continue }
    if (H >= 8 && H <= 45 && S >= 0.12 && S <= 0.58 && V >= 0.42) { cls[i] = 2; continue }
    if (S >= 0.25 && V >= 0.16) { cls[i] = 4; bins[Math.floor(H / 30) % 12] += S; continue }
    cls[i] = V < 0.5 ? 5 : 6
  }
  let main = -1, best = 0, tot = 0
  for (let k = 0; k < 12; k++) { tot += bins[k]; if (bins[k] > best) { best = bins[k]; main = k } }
  let colored = 0, cloth = 0
  for (let i = 0; i < n; i++) { const c = cls[i]; if (c >= 3) cloth++; if (c === 4 && Math.floor(hue[i] / 30) % 12 === main) { cls[i] = 3; colored++ } }
  const lightToGreen = cloth > 0 && colored / cloth < 0.12   // no real main colour (black / white outfits) → its light cloth goes green
  // shading range per class → full-ramp stretch, so a dull outfit still gets a crisp green
  const lo = new Float32Array(7).fill(255), hi = new Float32Array(7)
  for (let i = 0; i < n; i++) { const c = cls[i]; if (c < 3) continue; const l = lum[i]; if (l < lo[c]) lo[c] = l; if (l > hi[c]) hi[c] = l }
  for (let i = 0; i < n; i++) {
    const c = cls[i]; if (c < 3) continue
    const o = i * 4, t = Math.max(0, Math.min(1, (lum[i] - lo[c]) / Math.max(24, hi[c] - lo[c])))
    let L, u
    if (c === 3) { L = L_GREEN; u = 0.22 + 0.7 * t }
    else if (c === 4 && lum[i] < 118) { L = L_BLACK; u = 0.25 + 0.75 * t; cls[i] = 5 }   // darker side colours join the black suit
    else if (c === 4) { L = L_WHITE; u = 0.3 + 0.7 * t }
    else if (c === 5) { L = L_BLACK; u = t }
    else if (lightToGreen) { L = L_GREEN; u = 0.3 + 0.7 * t }
    else { L = L_WHITE; u = 0.35 + 0.65 * t }
    const k = (u * 255 | 0) * 3
    d[o] = L[k]; d[o + 1] = L[k + 1]; d[o + 2] = L[k + 2]
  }
  // energy seams: a cloth pixel on the BLACK side of a border with another cloth panel glows green
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, c = cls[i]; if (c !== 5) continue
    const nb = [cls[i - 1], cls[i + 1], cls[i - w], cls[i + w]]
    let edge = false, hot = false
    for (const q of nb) { if (q >= 3 && q !== 5) { edge = true; if (q === 3 || (q === 6 && lightToGreen)) hot = true } }
    if (!edge) continue
    const o = i * 4, C = hot ? SEAM_HOT : SEAM
    d[o] = C[0]; d[o + 1] = C[1]; d[o + 2] = C[2]
  }
  return d
}
