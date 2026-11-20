// windrangersSkinFx.js — RENDER-ONLY move-linked touches for the windrangers skin pack (windrangersSkins.js).
// Reads the sim (current move, its elapsed frames, the blink phase, the ninja FX events) and the per-frame costume
// anchors baked by tools/wr_skins/build.py (windrangersSkinAnchors.js, cell px). Never writes anything the sim reads:
// its only memory is f._wrFx (presentation counters, not in the replay snapshot), and nothing here touches timing,
// damage, hitboxes or input. Reduced-motion / reduced-flashing → static, low-alpha versions.
import { WR_SKIN_ANCHORS } from './windrangersSkinAnchors.js'
import { wrSkinRow } from './windrangersSkins.js'
import { juiceSettings } from './juiceSettings.js'

const CW = 260, CH = 136
const calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
const SWORD = new Set(['sword', 'swordMove', 'swordRise', 'swordCrouch', 'swordLow', 'air', 'sRock', 'sGale'])
const HEAVY_SLASH = new Set(['sword', 'swordMove', 'swordRise', 'swordLow', 'sRock'])
const PUNCH = new Set(['light', 'kString1', 'kString2', 'sUpper', 'grab'])
const SPIN_KICK = new Set(['flipKick', 'airSpin', 'tornado', 'airTumble'])          // strips (the drawn pose)
const SPIN_SWORD = new Set(['swordDome', 'swordAir'])                                  // strips: the spinning sword attacks
const BLASTER = { sBeam: 12, sBeamAir: 10 }                                            // move → its shot frame (nsData PROJ at)
const stripOf = (f, action) => { const A = (f._skinAnim || f.animationData || {})[action]; const m = A?.sheet && /\/([A-Za-z0-9_]+)\.png$/.exec(A.sheet); return m ? m[1] : null }
const anchorsAt = (tag, strip, fr) => WR_SKIN_ANCHORS[tag]?.[strip]?.[String(fr)] || null
const mem = f => (f._wrFx ||= { t: 0, hits: [], forks: [], valk: null, lastHit: false, supAt: null })

// a body-cell point → screen, inside the body's real draw rect (mirrors with the body)
function toScreen(f, p) {
  if (!p || f._lastDrawX == null || !f._lastDrawW) return null
  const sx = f._lastDrawW / CW, sy = (f._lastDrawH || CH * sx) / CH
  const x = (f.facing ?? 1) === -1 ? f._lastDrawX + f._lastDrawW - (p[0] + 0.5) * sx : f._lastDrawX + (p[0] + 0.5) * sx
  return [x, f._lastDrawY + (p[1] + 0.5) * sy, sx]
}
const glow = (c, x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill() }
const pix = (c, x, y, s, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.max(1, Math.round(s)), Math.max(1, Math.round(s))) }

// ── called by nsFx.js drawNinjaFx (after the body is drawn) ──────────────────────────────────────────────────────
export function drawWrSkinFx(c, f) {
  const tag = f?._wrSkin; if (!tag || !f._ninja || f.health <= 0) return
  const R = wrSkinRow(tag), M = mem(f), s = f._ninja
  M.t++
  const action = f._lastSpriteAction, fr = f._lastSpriteFrame | 0, strip = stripOf(f, action)
  const an = strip ? anchorsAt(tag, strip, fr) : null
  const atk = f.currentAttack, move = atk?.name || null, el = atk ? (atk.total - atk.timer) : 0
  c.save(); c.imageSmoothingEnabled = false
  try {
    switch (tag) {
      case 'alienx': alienX(c, f, R, M, s, an, move, el); break
      case 'disco': disco(c, f, R, M, an, action, strip); break
      case 'valkyrie': valkyrie(c, f, R, M, strip); break
      case 'feedback': feedback(c, f, R, an, move, el); break
      case 'divergent': divergent(c, f, R, M, an, move, atk); break
      case 'salaryman': salaryman(c, f, R, an, move, atk, el); break
      case 'kintsugi': kintsugi(c, f, R, M, s); break
      case 'pitcrew': pitcrew(c, f, R, an); break
      case 'woodblock': woodblockErupt(c, f, R, s); break
    }
  } finally { c.restore() }
}

// 1 ALIEN X: drawing the sword lights the three stars in order over a brief violet nebula; the ultimate's trails
// complete the constellation (ivory = him, turquoise = the clone side).
function alienX(c, f, R, M, s, an, move, el) {
  const st = an?.stars?.map(p => toScreen(f, p)).filter(Boolean)
  if (st && st.length === 3 && move && SWORD.has(move) && el < 22) {
    const k = calm() ? 0.6 : 1
    c.globalCompositeOperation = 'lighter'
    glow(c, st[1][0], st[1][1], 16 * st[0][2] / 2.8 * 2.2, R.nebula, 0.35 * k * Math.max(0, 1 - el / 22))
    st.forEach((p, i) => { if (el >= i * 3) { glow(c, p[0], p[1], 6 * p[2], R.star, 0.9 * k); pix(c, p[0], p[1], p[2] * 1.4, '#ffffff', 1) } })
    c.globalCompositeOperation = 'source-over'
  }
  if (s.sup) {
    if (M.supAt == null) M.supAt = M.t
    const t = M.t - M.supAt
    if (st && st.length === 3 && t >= 20 && t <= 70) {
      const a = Math.min(1, (t - 20) / 8) * Math.min(1, (70 - t) / 10), dir = f.facing ?? 1
      const e1 = [st[2][0] + dir * 34 * st[0][2] / 2.8, st[2][1] - 26], e2 = [e1[0] + dir * 30, e1[1] + 18]   // the two sword trails' new stars
      c.lineWidth = 1.5; c.globalAlpha = 0.85 * a
      c.strokeStyle = R.star; c.beginPath(); c.moveTo(st[0][0], st[0][1]); c.lineTo(st[1][0], st[1][1]); c.lineTo(st[2][0], st[2][1]); c.lineTo(e1[0], e1[1]); c.stroke()
      c.strokeStyle = R.cloneStar; c.beginPath(); c.moveTo(e1[0], e1[1]); c.lineTo(e2[0], e2[1]); c.stroke()
      for (const [p, col] of [[e1, R.star], [e2, R.cloneStar]]) { glow(c, p[0], p[1], 10, col, 0.8 * a); pix(c, p[0], p[1], 3, '#ffffff', a) }
    }
  } else M.supAt = null
}

// 2 DISCO: idle → one mirror tile catches the light at a time; a spinning kick → a pink / gold / ice-blue glint band
// travels around the boot.
function disco(c, f, R, M, an, action, strip) {
  if (!an) return
  if (action === 'idle' && an.tiles?.length) {
    const i = Math.floor(M.t / 9) % an.tiles.length, p = toScreen(f, an.tiles[i]); if (!p) return
    const u = (M.t % 9) / 9, a = calm() ? 0.6 : Math.sin(u * Math.PI)
    c.globalCompositeOperation = 'lighter'; pix(c, p[0], p[1], p[2] * 1.2, '#ffffff', a)
    c.globalAlpha = 0.8 * a; c.strokeStyle = '#ffffff'; c.lineWidth = 1; const L = p[2] * 2.2
    c.beginPath(); c.moveTo(p[0] - L, p[1]); c.lineTo(p[0] + L, p[1]); c.moveTo(p[0], p[1] - L); c.lineTo(p[0], p[1] + L); c.stroke()
    c.globalCompositeOperation = 'source-over'
  }
  if (strip && SPIN_KICK.has(strip) && an.boot?.length) {
    const pts = an.boot, n = pts.length
    const cx = pts.reduce((a2, p) => a2 + p[0], 0) / n, cy = pts.reduce((a2, p) => a2 + p[1], 0) / n
    const order = pts.map((p, i) => [Math.atan2(p[1] - cy, p[0] - cx), i]).sort((a2, b) => a2[0] - b[0]).map(x => pts[x[1]])
    const head = Math.floor(M.t * 1.5) % n
    c.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 4; k++) { const p = toScreen(f, order[(head + k) % n]); if (p) pix(c, p[0], p[1], p[2] * 1.1, R.glints[k % 3], calm() ? 0.5 : 0.95) }
    c.globalCompositeOperation = 'source-over'
  }
}

// 3 VALKYRIE: the spinning sword attack's arc in three short sections (red / blue / gold) that line up like a
// spinning top seen from above at full extension, then break apart when he lands.
function valkyrie(c, f, R, M, strip) {
  const spinning = strip && SPIN_SWORD.has(strip)
  const x = f.x + (f.w || 48) / 2, y = f.y + (f.h || 94) * 0.45, r = 46 * ((f._lastDrawW || 728) / CW) / 2.8
  if (spinning) { if (!M.valk || M.valk.end != null) M.valk = { t0: M.t, end: null }; }
  else if (M.valk && M.valk.end == null) M.valk.end = M.t
  const V = M.valk; if (!V) return
  const t = M.t - V.t0, after = V.end != null ? M.t - V.end : 0
  if (V.end != null && after > 14) { M.valk = null; return }
  const close = Math.min(1, t / 10)                         // 0 = scattered, 1 = lined up (full extension)
  const rot = calm() ? 0 : t * 0.45, spread = V.end != null ? after * 3.5 : 0
  c.lineCap = 'round'; c.lineWidth = Math.max(2, r * 0.12)
  for (let i = 0; i < 3; i++) {
    const a0 = rot + i * (2 * Math.PI / 3) + (1 - close) * (i - 1) * 0.9
    const ox = Math.cos(a0 + 0.5) * spread, oy = Math.sin(a0 + 0.5) * spread * 0.5
    c.globalAlpha = 0.9 * (V.end != null ? Math.max(0, 1 - after / 14) : 1)
    c.strokeStyle = R.arcs[i]; c.beginPath(); c.ellipse(x + ox, y + oy, r, r * 0.42, 0, a0, a0 + 0.95); c.stroke()
  }
}

// 4 GHOSTFREAK (called from nsFx drawPose for the DEPARTING Ninja Step afterimage): the seam opens on a violet eye.
export function wrAfterimageFx(c, f, key, fr, x, feet, dir, alpha, scale) {
  if (f?._wrSkin !== 'ghostfreak' || key !== 'streakTail') return
  const R = wrSkinRow('ghostfreak')
  const an = anchorsAt('ghostfreak', 'streakTail', fr) || anchorsAt('ghostfreak', 'idle', 0); if (!an?.seam) return
  const px = x + dir * (an.seam[0] + 0.5 - 130) * scale, py = feet + (an.seam[1] + 0.5 - 132) * scale
  c.save(); c.globalAlpha = Math.min(1, alpha * 1.4)
  c.fillStyle = '#000000'; c.beginPath(); c.ellipse(px, py, 2.2 * scale, 1.3 * scale, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = R.eye; c.beginPath(); c.ellipse(px, py, 1.6 * scale, 1.0 * scale, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'; c.fillRect(Math.round(px - scale * 0.3), Math.round(py - scale * 0.4), Math.max(1, Math.round(scale * 0.6)), Math.max(1, Math.round(scale * 0.6)))
  c.restore()
}

// 5 FEEDBACK: when the blaster comes up a white spark runs from the elbow into the muzzle and leaves with the shot.
function feedback(c, f, R, an, move, el) {
  const at = move && BLASTER[move]; if (!at || !an?.elbow || !an?.muzzle || el > at) return
  const a = toScreen(f, an.elbow), b = toScreen(f, an.muzzle); if (!a || !b) return
  const u = Math.min(1, el / at), x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u
  c.globalCompositeOperation = 'lighter'; glow(c, x, y, 7 * a[2] / 2.8 * 2, '#ffe9a0', 0.8); pix(c, x, y, a[2] * 1.3, R.spark, 1)
  c.globalCompositeOperation = 'source-over'
}

// 6 DIVERGENT IMPACT: a connected punch → a small blue ink splash; a few frames later a thin black outline catches up
// to the same splash (visual only — the punch landed exactly once in the sim).
function divergent(c, f, R, M, an, move, atk) {
  const hit = !!(atk?.hasHit && move && PUNCH.has(move))
  if (hit && !M.lastHit) {
    const p = (an?.fist && toScreen(f, an.fist)) || [f.x + (f.w || 48) / 2 + (f.facing ?? 1) * 40, f.y + (f.h || 94) * 0.4, 2.8]
    M.hits.push({ x: p[0] + (f.facing ?? 1) * 6, y: p[1], t: 0, seed: M.t })
  }
  M.lastHit = hit
  for (const h of M.hits) {
    h.t++
    const k = 1 + Math.min(1, h.t / 6) * 0.5, a = Math.max(0, 1 - h.t / 22)
    c.globalAlpha = 0.85 * a; c.fillStyle = R.ink; c.strokeStyle = 'rgba(0,0,0,0)'
    for (let i = 0; i < 6; i++) { const ang = i * 1.05 + (h.seed % 7) * 0.3, d = (6 + ((h.seed * (i + 3)) % 7)) * k; c.beginPath(); c.arc(h.x + Math.cos(ang) * d, h.y + Math.sin(ang) * d * 0.8, (4 + (i % 3) * 1.5) * k, 0, Math.PI * 2); c.fill() }
    if (h.t >= 5) {   // the DELAYED black outline catching up to that same splash
      const k2 = 1 + Math.min(1, (h.t - 5) / 6) * 0.5
      c.globalAlpha = 0.9 * a; c.strokeStyle = '#000000'; c.lineWidth = 1.2
      for (let i = 0; i < 6; i++) { const ang = i * 1.05 + (h.seed % 7) * 0.3, d = (6 + ((h.seed * (i + 3)) % 7)) * k2; c.beginPath(); c.arc(h.x + Math.cos(ang) * d, h.y + Math.sin(ang) * d * 0.8, (4 + (i % 3) * 1.5) * k2 + 0.8, 0, Math.PI * 2); c.stroke() }
    }
  }
  M.hits = M.hits.filter(h => h.t < 22)
}

// 7 SALARYMAN: on a heavy slash the bright notch (70% along the ink-black blade) draws a short gold line through the arc.
function salaryman(c, f, R, an, move, atk, el) {
  if (!move || !HEAVY_SLASH.has(move) || !an?.notch || !an?.tip || !an?.hilt) return
  const s0 = atk.activeStart ?? 0, s1 = atk.activeEnd ?? (s0 + 4)
  if (el < s0 - 1 || el > s1 + 3) return
  const n = toScreen(f, an.notch), tp = toScreen(f, an.tip), hl = toScreen(f, an.hilt); if (!n || !tp || !hl) return
  const dx = tp[0] - hl[0], dy = tp[1] - hl[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, len = 9 * n[2]
  c.globalAlpha = calm() ? 0.7 : 1; c.strokeStyle = R.line; c.lineWidth = Math.max(1.5, n[2] * 0.7); c.lineCap = 'butt'
  c.beginPath(); c.moveTo(n[0] - nx * len * 0.3, n[1] - ny * len * 0.3); c.lineTo(n[0] + nx * len, n[1] + ny * len); c.stroke()
}

// 8 KINTSUGI: when a fault / eruption breaks the floor, its first ground frame carries the chest's forked seam.
function kintsugi(c, f, R, M, s) {
  for (const e of s.fx || []) if (e.k === 'erupt' && !e._wrForked) { e._wrForked = true; M.forks.push({ x: e.x, y: e.y, t: 0 }) }
  const an = anchorsAt('kintsugi', 'idle', 0); if (!an?.fork) return
  const [l, r, j, low] = an.fork, sc = 3.2, dir = f.facing ?? 1
  for (const k of M.forks) {
    k.t++
    const a = k.t <= 2 ? 1 : Math.max(0, 1 - (k.t - 2) / 14)
    const P = p => [k.x + dir * (p[0] - j[0]) * sc * 2.2, k.y - 2 + (p[1] - j[1]) * sc * 0.45]
    c.globalAlpha = a; c.strokeStyle = R.gold; c.lineWidth = 3; c.lineJoin = 'miter'
    c.beginPath(); for (const [p0, p1] of [[l, j], [r, j], [j, low]]) { const A = P(p0), B = P(p1); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]) } c.stroke()
    c.strokeStyle = '#2b3a8c'; c.lineWidth = 1; c.stroke()
  }
  M.forks = M.forks.filter(k => k.t < 16)
}

// 9 PIT CREW: dash startup → the three forearm lights glow amber together, green on the first travel frame; the teleport
// leaves a short checkered streak behind the heel.
function pitcrew(c, f, R, an) {
  const b = f._ranger?.blink; if (!b) return
  const col = b.phase === 'start' ? R.amber : (b.phase === 'travel' || b.phase === 'recover') ? R.green : null
  if (col && an?.lights) { c.globalCompositeOperation = 'lighter'; for (const p of an.lights) { const q = toScreen(f, p); if (q) { glow(c, q[0], q[1], 4 * q[2], col, 0.7); pix(c, q[0], q[1], q[2], col, 1) } } c.globalCompositeOperation = 'source-over' }
  if (b.phase === 'travel' || (b.phase === 'recover' && (b.t || 0) < 9)) {
    const h = an?.heel ? toScreen(f, an.heel) : [f.x + (f.w || 48) / 2, f.y + (f.h || 94) - 4, 2.8]; if (!h) return
    const dir = b.dir || f.facing || 1, sq = Math.max(3, Math.round(h[2] * 1.4))
    for (let i = 0; i < 9; i++) for (let r2 = 0; r2 < 2; r2++) {
      c.globalAlpha = 0.85 * (1 - i / 9); c.fillStyle = (i + r2) % 2 ? '#111111' : '#f4f1ea'
      c.fillRect(Math.round(h[0] - dir * (6 + i * sq) - sq / 2), Math.round(h[1] - sq * (r2 + 1)), sq, sq)
    }
  }
}

// 10 WOODBLOCK: the wind spiral as curved brushstrokes (nsFx 'wind' — called instead of the plain ellipse) and the
// eruption as stacked blocks of ink.
export function wrWindFx(c, f, e, u) {
  if (f?._wrSkin !== 'woodblock') return false
  const R = wrSkinRow('woodblock')
  c.save(); c.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const rx = 18 + u * 40 + i * 6, ry = 46 + u * 30 - i * 5, a0 = i * 1.4 + u * 3, w = 6 - i * 1.2
    c.globalAlpha = 0.8 * (1 - u); c.strokeStyle = i % 2 ? R.ink : '#0d0d0d'; c.lineWidth = Math.max(1.5, w)
    c.beginPath(); c.ellipse(e.x, e.y - 40, rx, ry, 0, a0, a0 + 2.4); c.stroke()
    c.lineWidth = Math.max(1, w * 0.4); c.strokeStyle = R.paper; c.globalAlpha = 0.5 * (1 - u)
    c.beginPath(); c.ellipse(e.x, e.y - 40, rx - 1, ry - 1, 0, a0 + 0.3, a0 + 1.6); c.stroke()
  }
  c.restore()
  return true
}
function woodblockErupt(c, f, R, s) {
  for (const e of s.fx || []) {
    if (e.k !== 'erupt') continue
    const u = 1 - e.t / e.t0
    for (const d of [-1, 0, 1]) for (let k = 0; k < 4; k++) {
      const h = 10 + k * 2, w = 18 - k * 3, rise = u * 60 * (1 - Math.abs(d) * 0.3)
      c.globalAlpha = 0.9 * (1 - u); c.fillStyle = (k + d) % 2 ? R.ink : '#0d0d0d'
      c.fillRect(Math.round(e.x + d * 26 - w / 2), Math.round(e.y - rise - (k + 1) * h), w, h - 2)
      c.fillStyle = R.paper; c.globalAlpha = 0.4 * (1 - u); c.fillRect(Math.round(e.x + d * 26 - w / 2), Math.round(e.y - rise - (k + 1) * h), w, 2)
    }
  }
}
