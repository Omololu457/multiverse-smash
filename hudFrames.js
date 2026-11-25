// hudFrames.js — UNIVERSE-SHAPED HUD FRAMES (owner 2026-11-24: "make the health bars custom for each character … specific
// shapes and designs … give each universe its own theme … this one looks way too robotic").  PRESENTATION ONLY: reads a
// fighter's universe / accent, writes nothing, no Math.random (animation = the global frame clock).
//
// Every universe gets (1) a SILHOUETTE used for the panel, the life track and the energy track (a Naruto scroll, a Demon
// Slayer katana, a JJK talisman, a Dragon Ball power-slant, a Ranger morpher hex …), (2) a PANEL SKIN (its own colours /
// texture) and (3) ORNAMENTS drawn over the frame (scroll rods, a tsuba guard, ofuda seals, a Dragon Ball, the Omnitrix …).
// Inside the bar each fighter keeps their OWN colours + animated motif (hudBars.js) and their OWN accent trim, so every
// character reads differently even inside one universe.  Unknown universes fall back to a gilded default — never breaks.
//
//   hudBarPath(ctx, f, x, y, w, h, flip)          — begin+build the universe silhouette path (caller fills / clips)
//   hudFramePanel(ctx, f, x, y, w, h, accent, flip, t, flash)   — the panel backing (returns false → caller's default)
//   hudFrameOverlay(ctx, f, x, y, w, h, accent, flip, t, kind)  — ornaments over a drawn bar ('hp' | 'en')
import { characters } from './characters.js'
import { drawUniverseIcon } from './universeIcons.js'

// universe → { shape, panel: [top, bottom], trim, orn }
const U = {
  naruto:          { shape: 'scroll',   panel: ['#3a2a18', '#160e06'], trim: '#e8c890', orn: 'scroll' },
  jujutsu_kaisen:  { shape: 'talisman', panel: ['#1b1626', '#07060c'], trim: '#c8b8e8', orn: 'ofuda' },
  demon_slayer:    { shape: 'blade',    panel: ['#1a1c22', '#08090c'], trim: '#d8dde8', orn: 'katana' },
  dragon_ball:     { shape: 'skew',     panel: ['#2a1a08', '#0e0804'], trim: '#ffb347', orn: 'dball' },
  bleach:          { shape: 'zan',      panel: ['#14161c', '#050608'], trim: '#e8e8f0', orn: 'reiatsu' },
  power_rangers:   { shape: 'hex',      panel: ['#101a2a', '#04070e'], trim: '#ffd84a', orn: 'morpher' },
  ben_10:          { shape: 'capsule',  panel: ['#0e1a10', '#040806'], trim: '#6cff7a', orn: 'omnitrix' },
  hunter_x_hunter: { shape: 'card',     panel: ['#1a1420', '#08060c'], trim: '#f0d8a0', orn: 'suits' },
  one_piece:       { shape: 'rope',     panel: ['#2e2214', '#100b05'], trim: '#e8c88a', orn: 'rope' },
  dc:              { shape: 'chevron',  panel: ['#141a28', '#05070d'], trim: '#e8eef8', orn: 'emblem' },
  marvel:          { shape: 'chevron',  panel: ['#2a0e12', '#0c0305'], trim: '#ff6a6a', orn: 'web' },
  the_incredibles: { shape: 'capsule',  panel: ['#2a1206', '#0e0602'], trim: '#ffb02a', orn: 'incred' },
  rick_and_morty:  { shape: 'capsule',  panel: ['#0c1a14', '#030806'], trim: '#9af04e', orn: 'portal' },
  horror:          { shape: 'torn',     panel: ['#1a0a0a', '#060202'], trim: '#c83a3a', orn: 'drip' },
  one_punch_man:   { shape: 'skew',     panel: ['#2a2208', '#0e0b02'], trim: '#ffe066', orn: 'fist' },
  hajime_no_ippo:  { shape: 'skew',     panel: ['#241010', '#0c0404'], trim: '#ff8a6a', orn: 'fist' },
  baki:            { shape: 'skew',     panel: ['#241010', '#0c0404'], trim: '#ff8a6a', orn: 'fist' },
  deathnote:       { shape: 'card',     panel: ['#0e0e10', '#030304'], trim: '#d8d8e0', orn: 'note' },
  saiki_k:         { shape: 'card',     panel: ['#1a1026', '#07040c'], trim: '#ff9ad8', orn: 'psi' },
  divine:          { shape: 'scroll',   panel: ['#2a2410', '#0e0c04'], trim: '#fff0b0', orn: 'halo' },
  original:        { shape: 'bevel',    panel: ['#181a22', '#06070a'], trim: '#ffd27a', orn: 'gild' },
}
const DEF = { shape: 'bevel', panel: ['#181a22', '#06070a'], trim: '#ffd27a', orn: 'gild' }
export function hudUniverseStyle(f) {
  const key = f?.rosterKey, c = (key && characters[key]) || null
  const uni = f?.universe || c?.universe || 'original'
  return U[uni] || DEF
}
export const HUD_UNIVERSE_STYLES = U

const HEXC = /^#[0-9a-f]{6}$/i
function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
function alpha(h, a) { if (!HEXC.test(h || '')) return `rgba(255,255,255,${a})`; const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }
function mix(a, b, k) { if (!HEXC.test(a) || !HEXC.test(b)) return a; const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('') }

// ── SILHOUETTES ── "inner" end = the end facing the screen centre (right for P1, left for P2).
function shapePath(c, shape, x, y, w, h, flip, refH = h) {
  c.beginPath()
  const H = Math.min(h, refH)   // corner geometry scale (a panel passes a small refH → a gentler cut than its own height)
  if (w <= 0 || h <= 0) { c.rect(x, y, Math.max(0, w), Math.max(0, h)); return }
  const R = (pts) => { const P = flip ? pts.map(([px, py]) => [2 * x + w - px, py]) : pts; c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath() }
  switch (shape) {
    case 'scroll': case 'capsule': { const r = Math.min(h / 2, w / 2, H * 0.6 + 6); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return }
    case 'rope': { const r = Math.min(H * 0.38, w / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return }
    case 'card': { const r = Math.min(4, h / 3, w / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return }
    case 'skew': { const s = Math.min(H * 0.6, w / 3); return R([[x + s, y], [x + w, y], [x + w - s, y + h], [x, y + h]]) }
    case 'talisman': { const n = Math.min(H * 0.35, w / 4); return R([[x, y], [x + w, y], [x + w - n, y + h / 2], [x + w, y + h], [x, y + h], [x + n, y + h / 2]]) }
    case 'blade': { const tip = Math.min(H * 1.3, w / 3); return R([[x, y], [x + w, y + h * 0.18], [x + w - tip * 0.35, y + h * 0.7], [x + w - tip, y + h], [x, y + h]]) }   // katana: flat hilt end, curved point inward
    case 'zan': { const s = Math.min(H * 0.9, w / 3); return R([[x, y], [x + w, y], [x + w - s, y + h], [x, y + h]]) }
    case 'hex': { const p = Math.min(H * 0.5, w / 4); return R([[x + p, y], [x + w - p, y], [x + w, y + h / 2], [x + w - p, y + h], [x + p, y + h], [x, y + h / 2]]) }
    case 'chevron': { const p = Math.min(H * 0.55, w / 4); return R([[x, y], [x + w - p, y], [x + w, y + h / 2], [x + w - p, y + h], [x, y + h], [x + p, y + h / 2]]) }
    case 'torn': { const pts = [], n = Math.max(4, Math.round(w / 9)); for (let i = 0; i <= n; i++) pts.push([x + (w * i) / n, y + ((i * 7) % 3) * 0.9]); for (let i = n; i >= 0; i--) pts.push([x + (w * i) / n, y + h - ((i * 5) % 3) * 0.9]); return R(pts) }
    default: { const k = Math.min(4, w / 2, h / 2); c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + h - k); c.lineTo(x + w - k, y + h); c.lineTo(x + k, y + h); c.lineTo(x, y + h - k); c.lineTo(x, y + k); c.closePath() }
  }
}
export function hudBarPath(c, f, x, y, w, h, flip, refH = h) { shapePath(c, hudUniverseStyle(f).shape, x, y, w, h, flip, refH) }
const PANEL_REF = 10   // panels cut their corners like a 10 px bar, so the 8 px-inset bar never pokes out

// ── PANEL SKIN ──
export function hudPlatePath(c, f, x, y, w, h, flip) { shapePath(c, hudUniverseStyle(f).shape, x, y, w, h, flip, 8) }   // name plate
export function hudFramePanel(c, f, x, y, w, h, accent, flip, t = 0, flash = 0) {
  const S = hudUniverseStyle(f), A = HEXC.test(accent || '') ? accent : S.trim
  c.save()
  shapePath(c, S.shape, x, y, w, h, flip, PANEL_REF)
  const g = c.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, mix(S.panel[0], A, 0.16)); g.addColorStop(0.55, S.panel[1]); g.addColorStop(1, mix(S.panel[1], '#000000', 0.4))
  c.globalAlpha = 0.94; c.fillStyle = g; c.fill(); c.globalAlpha = 1
  c.save(); c.clip(); texture(c, S.orn, x, y, w, h, A, flip, t); c.restore()
  // double trim: soft universe trim outside, the CHARACTER's accent inside (+ flash glow on big hits)
  shapePath(c, S.shape, x, y, w, h, flip, PANEL_REF); c.lineWidth = 2.2; c.strokeStyle = alpha(S.trim, 0.55); c.stroke()
  shapePath(c, S.shape, x + 2, y + 2, w - 4, h - 4, flip, PANEL_REF); c.lineWidth = 1.2; c.strokeStyle = A
  if (flash > 0.01) { c.shadowBlur = 12 * flash; c.shadowColor = A }
  c.stroke(); c.shadowBlur = 0
  // glossy top light
  c.save(); shapePath(c, S.shape, x, y, w, h, flip, PANEL_REF); c.clip()
  const gl = c.createLinearGradient(0, y, 0, y + h * 0.5); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = gl; c.fillRect(x, y, w, h * 0.5); c.restore()
  c.restore()
  return true
}

// subtle per-universe background texture inside the panel (clipped)
function texture(c, orn, x, y, w, h, A, flip, t) {
  c.save()
  switch (orn) {
    case 'katana': {   // ichimatsu (checkered haori) in the character's colour — Tanjiro/Rengoku vibe
      const s = 6; c.fillStyle = alpha(A, 0.07)
      for (let yy = 0; yy < h; yy += s) for (let xx = ((yy / s) % 2) * s; xx < w; xx += s * 2) c.fillRect(x + xx, y + yy, s, s)
      break }
    case 'ofuda': {    // faint cursed seal script lines
      c.strokeStyle = alpha(A, 0.10); c.lineWidth = 1
      for (let xx = 10; xx < w; xx += 14) { c.beginPath(); c.moveTo(x + xx, y + 3); c.lineTo(x + xx + 3, y + h - 3); c.stroke() }
      break }
    case 'scroll': {   // paper grain
      c.fillStyle = 'rgba(255,235,200,0.04)'; for (let xx = 0; xx < w; xx += 5) c.fillRect(x + xx, y, 1, h)
      break }
    case 'dball': case 'fist': {   // speed lines
      c.strokeStyle = alpha(A, 0.08); c.lineWidth = 1
      for (let i = 0; i < 6; i++) { const yy = y + 4 + ((i * 7 + t * 0.5) % (h - 6)); c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy - 4); c.stroke() }
      break }
    case 'morpher': {  // circuit grid
      c.strokeStyle = alpha(A, 0.08); c.lineWidth = 1
      for (let xx = 0; xx < w; xx += 12) { c.beginPath(); c.moveTo(x + xx, y); c.lineTo(x + xx, y + h); c.stroke() }
      break }
    case 'omnitrix': case 'portal': {   // hex cells
      c.strokeStyle = alpha(A, 0.08); c.lineWidth = 1
      for (let xx = 0; xx < w + 10; xx += 10) for (let yy = 0; yy < h + 8; yy += 8) { c.beginPath(); c.arc(x + xx + ((yy / 8) % 2) * 5, y + yy, 3, 0, Math.PI * 2); c.stroke() }
      break }
    case 'rope': { c.fillStyle = 'rgba(255,220,160,0.05)'; for (let xx = 0; xx < w; xx += 7) c.fillRect(x + xx, y, 3, h); break }   // planks
    case 'drip': { c.fillStyle = 'rgba(140,0,0,0.12)'; for (let xx = 6; xx < w; xx += 17) c.fillRect(x + xx, y + h - 4 - ((xx * 3) % 7), 2, 6); break }
    case 'suits': case 'note': case 'psi': { c.fillStyle = alpha(A, 0.06); c.font = '9px serif'; const sy = ['♠', '♥', '♦', '♣']; for (let i = 0, xx = 8; xx < w; xx += 22, i++) c.fillText(orn === 'note' ? '✎' : orn === 'psi' ? '✦' : sy[i % 4], x + xx, y + h - 4); break }
    default: break
  }
  c.restore()
}

// ── ORNAMENTS over a drawn bar (x,y,w,h = the TRACK) ──
export function hudFrameOverlay(c, f, x, y, w, h, accent, flip, t = 0, kind = 'hp') {
  const S = hudUniverseStyle(f), A = HEXC.test(accent || '') ? accent : S.trim
  const outer = flip ? x + w : x, inner = flip ? x : x + w, dir = flip ? -1 : 1, cy = y + h / 2, big = kind === 'hp'
  c.save()
  // crisp silhouette outline on the track
  shapePath(c, S.shape, x, y, w, h, flip); c.lineWidth = 1; c.strokeStyle = alpha(S.trim, 0.45); c.stroke()
  switch (S.orn) {
    case 'scroll': {   // wooden rods capping both ends
      for (const ex of [x - 3, x + w - 3]) {
        const g = c.createLinearGradient(ex, 0, ex + 6, 0); g.addColorStop(0, '#5a3a1a'); g.addColorStop(0.5, '#b07a3a'); g.addColorStop(1, '#4a2a10')
        c.fillStyle = g; c.fillRect(ex, y - 3, 6, h + 6)
        c.fillStyle = S.trim; c.fillRect(ex - 1, y - 4, 8, 2); c.fillRect(ex - 1, y + h + 2, 8, 2)
      }
      break }
    case 'katana': if (big) {   // tsuba (sword guard) at the hilt end + a hamon wave along the blade
      const gx = outer - dir * 1
      c.fillStyle = '#1a1a1e'; c.beginPath(); c.ellipse(gx, cy, 4.5, h * 0.85, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = A; c.lineWidth = 1.4; c.stroke()
      c.fillStyle = A; for (let k = -1; k <= 1; k += 2) { c.beginPath(); c.arc(gx, cy + k * h * 0.45, 1.3, 0, Math.PI * 2); c.fill() }
      c.save(); shapePath(c, S.shape, x, y, w, h, flip); c.clip()
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.beginPath()
      for (let u = 0; u <= w; u += 3) { const px = x + u, py = y + h * 0.62 + Math.sin(u * 0.35 + t * 0.05) * 1.6; u ? c.lineTo(px, py) : c.moveTo(px, py) }
      c.stroke(); c.restore()
    } break
    case 'ofuda': {    // paper seal strips hanging under the inner end + a small 呪 stamp
      for (let k = 0; k < 2; k++) {
        const sx = inner - dir * (16 + k * 6), sw = 4, sh = 9 + k * 3, sway = Math.sin(t * 0.06 + k) * 1.2   // paper seals hang under the inner end
        c.fillStyle = '#f2ead8'; c.fillRect(sx - sw / 2 + sway, y + h - 1, sw, sh)
        c.fillStyle = '#b0202a'; c.fillRect(sx - 0.6 + sway, y + h + 1, 1.2, sh - 4)
      }
      if (big) { c.fillStyle = alpha(A, 0.9); c.font = '800 9px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('呪', inner - dir * 7, cy) }
      break }
    case 'dball': if (big) {   // the Dragon Ball at the outer end
      const r = h * 0.6, bx = outer + dir * (r - 7)   // badge sits inside the frame, never over the portrait
      const g = c.createRadialGradient(bx - r * 0.3, cy - r * 0.3, 1, bx, cy, r); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ffa31a'); g.addColorStop(1, '#c05a00')
      c.fillStyle = g; c.beginPath(); c.arc(bx, cy, r, 0, Math.PI * 2); c.fill()
      star(c, bx, cy, r * 0.42, '#d01818'); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.beginPath(); c.arc(bx, cy, r, 0, Math.PI * 2); c.stroke()
    } break
    case 'reiatsu': {  // spirit-pressure chain links at the inner end
      c.strokeStyle = alpha(S.trim, 0.8); c.lineWidth = 1.2
      for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(inner - dir * (7 + k * 6), cy, 3.2, 2, 0, 0, Math.PI * 2); c.stroke() }
      break }
    case 'morpher': {  // bold morpher segments + a lightning badge
      c.save(); shapePath(c, S.shape, x, y, w, h, flip); c.clip(); c.fillStyle = 'rgba(0,0,0,0.45)'
      for (let k = 1; k < 8; k++) c.fillRect(x + (w * k) / 8 - 1, y, 2, h)
      c.restore()
      if (big) bolt(c, outer + dir * 5, cy, h * 0.85, S.trim)
      break }
    case 'omnitrix': if (big) {   // the Omnitrix dial: green disc + hourglass
      const r = h * 0.62, bx = outer + dir * (r - 6)
      c.fillStyle = '#111'; c.beginPath(); c.arc(bx, cy, r + 1.5, 0, Math.PI * 2); c.fill()
      c.fillStyle = A; c.beginPath(); c.arc(bx, cy, r, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#111'; c.beginPath(); c.moveTo(bx - r * 0.7, cy - r * 0.7); c.lineTo(bx + r * 0.7, cy - r * 0.7); c.lineTo(bx - r * 0.7, cy + r * 0.7); c.lineTo(bx + r * 0.7, cy + r * 0.7); c.closePath(); c.fill()
    } break
    case 'suits': {    // a card-suit pip at each end
      c.fillStyle = A; c.font = '700 10px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(big ? '♠' : '♦', outer - dir * 6, cy + 0.5); if (big) c.fillText('♥', inner - dir * 6, cy + 0.5)
      break }
    case 'rope': {     // twisted rope border
      c.strokeStyle = '#c8a060'; c.lineWidth = 2; c.setLineDash([3, 2]); c.lineDashOffset = -t * 0.2
      shapePath(c, S.shape, x - 1.5, y - 1.5, w + 3, h + 3, flip); c.stroke(); c.setLineDash([])
      break }
    case 'emblem': if (big) diamond(c, outer + dir * 4, cy, h * 0.62, A, S.trim); break
    case 'web': {      // web strands from the outer corner
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(outer, y - 2); c.lineTo(outer + dir * (8 + k * 7), y + h + 2); c.stroke() }
      break }
    case 'incred': if (big) {   // the retro "i" badge
      const r = h * 0.6, bx = outer + dir * (r - 6)
      c.fillStyle = '#111'; c.beginPath(); c.arc(bx, cy, r + 1.5, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.arc(bx, cy, r, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#111'; c.font = `900 ${Math.round(h * 0.95)}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('i', bx, cy + 1)
    } break
    case 'portal': if (big) {   // swirling green portal at the outer end
      const r = h * 0.62, bx = outer + dir * (r - 6)
      for (let k = 3; k >= 0; k--) { c.fillStyle = mix('#1a6a10', '#c8ff8a', k / 3); c.beginPath(); c.arc(bx, cy, r * (0.35 + k * 0.2), 0, Math.PI * 2); c.fill() }
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(bx, cy, r * 0.6, t * 0.08, t * 0.08 + Math.PI * 1.3); c.stroke()
    } break
    case 'drip': {     // blood drips under the bar
      c.fillStyle = '#9a1010'
      for (let k = 0; k < 4; k++) { const dx = x + w * (0.15 + k * 0.22), len = 3 + ((k * 5 + Math.floor(t / 20)) % 5); c.fillRect(dx, y + h, 2, len); c.beginPath(); c.arc(dx + 1, y + h + len, 1.6, 0, Math.PI * 2); c.fill() }
      break }
    case 'fist': if (big) { c.fillStyle = A; c.font = '900 10px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✊', outer - dir * 7, cy + 0.5) } break
    case 'note': if (big) { c.fillStyle = '#e8e8f0'; c.fillRect(outer + dir * 6 - 4, y + 1, 8, h - 2); c.fillStyle = '#111'; c.fillRect(outer + dir * 6 - 3, y + 4, 6, 1) } break
    case 'psi': if (big) { c.strokeStyle = A; c.lineWidth = 1.2; for (let k = 1; k <= 2; k++) { c.beginPath(); c.arc(outer - dir * 6, cy, k * 3 + Math.sin(t * 0.1) * 0.6, 0, Math.PI * 2); c.stroke() } } break
    case 'halo': if (big) { c.strokeStyle = '#fff0b0'; c.lineWidth = 1.6; c.shadowBlur = 6; c.shadowColor = '#fff0b0'; c.beginPath(); c.ellipse(outer - dir * 6, y - 2, 6, 2.2, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0 } break
    default: {         // gilded corner filigree
      c.strokeStyle = alpha(S.trim, 0.85); c.lineWidth = 1.2
      for (const ex of [x, x + w]) { const d = ex === x ? 1 : -1; c.beginPath(); c.moveTo(ex + d * 7, y - 2); c.lineTo(ex - d * 2, y - 2); c.lineTo(ex - d * 2, y + 5); c.stroke(); c.beginPath(); c.moveTo(ex + d * 7, y + h + 2); c.lineTo(ex - d * 2, y + h + 2); c.lineTo(ex - d * 2, y + h - 5); c.stroke() }
    }
  }
  c.restore()
}

function star(c, cx, cy, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) } c.closePath(); c.fill() }
function bolt(c, cx, cy, s, col) { c.fillStyle = col; c.strokeStyle = '#111'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + s * 0.15, cy - s * 0.6); c.lineTo(cx - s * 0.3, cy + s * 0.05); c.lineTo(cx, cy + s * 0.05); c.lineTo(cx - s * 0.15, cy + s * 0.6); c.lineTo(cx + s * 0.3, cy - s * 0.08); c.lineTo(cx, cy - s * 0.08); c.closePath(); c.fill(); c.stroke() }
function diamond(c, cx, cy, s, col, rim) { c.fillStyle = col; c.strokeStyle = rim; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, cy - s); c.lineTo(cx + s * 0.8, cy); c.lineTo(cx, cy + s); c.lineTo(cx - s * 0.8, cy); c.closePath(); c.fill(); c.stroke(); star(c, cx, cy, s * 0.45, '#ffffff') }

// ── UNIVERSE SELECT TILES (owner: "give each universe its own theme") — the same silhouette / skin / texture as that
// universe's HUD, a big watermark symbol, and a proper display name. Presentation only.
const NAME = { dc: 'DC', deathnote: 'Death Note', hunter_x_hunter: 'Hunter × Hunter', saiki_k: 'Saiki K.', the_incredibles: 'The Incredibles',
  one_punch_man: 'One Punch Man', rick_and_morty: 'Rick and Morty', hajime_no_ippo: 'Hajime no Ippo', ben_10: 'Ben 10', jujutsu_kaisen: 'Jujutsu Kaisen',
  demon_slayer: 'Demon Slayer', dragon_ball: 'Dragon Ball', power_rangers: 'Power Rangers', one_piece: 'One Piece', original: 'Originals' }
export function universeDisplayName(id, fallback) { return NAME[id] || fallback || String(id || '').split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') }
export function drawUniverseTile(c, id, r, o = {}) {
  const S = U[id] || DEF, A = HEXC.test(o.accent || '') ? o.accent : S.trim, act = !!o.active, t = o.t || 0
  const k = act ? 1.04 : 1, w = r.w * k, h = r.h * k, x = r.x - (w - r.w) / 2, y = r.y - (h - r.h) / 2, REF = 26
  c.save()
  if (act) { c.shadowBlur = 22; c.shadowColor = A }
  shapePath(c, S.shape, x, y, w, h, false, REF)
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h)
  g.addColorStop(0, mix(S.panel[0], A, act ? 0.38 : 0.22)); g.addColorStop(0.6, S.panel[1]); g.addColorStop(1, mix(S.panel[1], '#000000', 0.35))
  c.fillStyle = g; c.fill(); c.shadowBlur = 0
  c.save(); shapePath(c, S.shape, x, y, w, h, false, REF); c.clip()
  texture(c, S.orn, x, y, w, h, A, false, t)
  // soft spotlight behind the emblem
  const ix = x + h * 0.62, iy = y + h * 0.5
  const sp = c.createRadialGradient(ix, iy, 2, ix, iy, h * 0.6); sp.addColorStop(0, alpha(A, act ? 0.35 : 0.18)); sp.addColorStop(1, alpha(A, 0))
  c.fillStyle = sp; c.fillRect(x, y, w, h)
  // diagonal sheen sweep on hover
  if (act) { const sx = x + ((t * 6) % (w + 160)) - 80, sg = c.createLinearGradient(sx - 40, 0, sx + 40, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.14)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(x, y, w, h) }
  c.restore()
  // trims
  shapePath(c, S.shape, x, y, w, h, false, REF); c.lineWidth = act ? 2.6 : 1.6; c.strokeStyle = act ? A : alpha(A, 0.55); c.stroke()
  shapePath(c, S.shape, x + 4, y + 4, w - 8, h - 8, false, REF - 6); c.lineWidth = 1; c.strokeStyle = alpha(S.trim, act ? 0.55 : 0.25); c.stroke()
  // text
  c.textAlign = 'center'; c.textBaseline = 'middle'
  // the universe EMBLEM (universeIcons.js) — knife / leaf / katana / Dragon Ball / Omnitrix …, animated on hover
  drawUniverseIcon(c, id, ix, iy, h * 0.68, { hover: act, t, accent: A })
  const name = universeDisplayName(id, o.name), tx0 = x + h * 1.12, tw = w - h * 1.12 - 14, tcx = tx0 + tw / 2
  let fs = Math.round(h * 0.24); c.font = `900 ${fs}px Arial`; while (c.measureText(name).width > tw && fs > 11) { fs--; c.font = `900 ${fs}px Arial` }
  c.shadowBlur = 6; c.shadowColor = 'rgba(0,0,0,0.9)'; c.fillStyle = '#f6f8ff'; c.fillText(name, tcx, y + h * 0.42)
  if (o.sub) { c.font = `700 ${Math.max(10, Math.round(h * 0.12))}px Arial`; c.fillStyle = act ? A : alpha(S.trim, 0.85); c.fillText(o.sub, tcx, y + h * 0.68) }
  c.shadowBlur = 0
  // corner accent ticks
  c.fillStyle = A; c.globalAlpha = act ? 1 : 0.6; c.fillRect(x + 10, y + h - 8, 26, 2); c.fillRect(x + w - 36, y + 6, 26, 2); c.globalAlpha = 1
  c.restore()
}
