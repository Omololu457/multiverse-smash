// squadUltFx.js — render-only half of squadUlt.js (the Ranger squads' TEAM ULTIMATES). Two passes:
//   drawSquadUltWorld(c, fighter)  — world space, from spdSquadFx's per-fighter pass (only for the caster): every Ranger (the
//                                    caster too — its engine sprite is hidden by _fxAlpha 0 for the cinematic), rifles, lasers,
//                                    tracers, beams, coins, the star, the bolt, pillars, explosions. Records the world→screen
//                                    transform for the screen pass.
//   drawSquadUltScreen(ctx, canvas)— screen space, from game.js's cinematic overlay slot: letterbox, siren / title cards,
//                                    flashes, the GUILTY stamp, the team banner. Returns true while active (hides the HUD).
// Every Ranger is drawn from its own sheets (the worn squad theme's when one is worn), frame bottom-anchored by the frame's
// measured content box. Pure functions of the scene frame; no Math.random (hash noise only).
import { squadUltScene, SPD_VOLLEY, MMPR_STAR, SPD_SHOT, MMPR_STRIKE, mmprAt } from './squadUlt.js'
import { SQUADS } from './squadCore.js'

const imgs = new Map(), boxes = new Map()
const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
let XF = null   // world → screen (DOMMatrix) recorded by the world pass

let _scr = null
function scratch(w, h) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width < w || _scr.cv.height < h) { _scr.cv.width = Math.max(_scr.cv.width, w); _scr.cv.height = Math.max(_scr.cv.height, h) } return _scr }
function frameBox(im, sx, sy, w, h, key) {
  let b = boxes.get(key); if (b) return b
  try {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let l = w, t = h, r = -1, bo = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bo) bo = y }
    b = r < 0 ? { l: 0, t: 0, r: w, b: h } : { l, t, r: r + 1, b: bo + 1 }
  } catch (_) { b = { l: 0, t: 0, r: w, b: h } }
  boxes.set(key, b); return b
}
// one Ranger frame: content centred on x, content bottom on feetY; returns the frame's world geometry (muzzle, head, size)
function ranger(c, sq, skinId, form, keys, frame, x, feetY, dir, o = {}) {
  const ch = sq.formChar(form); if (!ch) return null
  const A = sq.skinAnim(skinId, form) || ch.animationData || {}
  let a = null; for (const k of keys) if ((a = A[k] || ch.animationData?.[k])) break
  if (!a) a = A.idle || ch.animationData?.idle; if (!a?.sheet) return null
  const im = image(a.sheet); if (!ready(im)) return null
  const n = Math.max(1, a.frames || 1), fi = clamp(frame | 0, 0, n - 1), w = a.width, h = a.height
  const sx = (a.sourceX || 0) + fi * w, sy = a.sourceY || 0
  const bx = frameBox(im, sx, sy, w, h, a.sheet + '#' + sx + ',' + sy + ',' + w + ',' + h)
  const s = (ch.spriteScale || 1.8) * (a.scale || 1) * (o.s || 1), ccx = (bx.l + bx.r) / 2
  let src = im, ssx = sx, ssy = sy
  if (o.shade > 0 || o.tint) {   // depth shade / tint: washed on a scratch copy so only the Ranger's pixels change
    const sc = scratch(w, h); sc.g.clearRect(0, 0, w, h); sc.g.globalCompositeOperation = 'source-over'; sc.g.globalAlpha = 1
    sc.g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    sc.g.globalCompositeOperation = 'source-atop'; sc.g.globalAlpha = o.tint ? o.tintA ?? 0.5 : o.shade; sc.g.fillStyle = o.tint || '#0a0e1c'; sc.g.fillRect(0, 0, w, h)
    src = sc.cv; ssx = 0; ssy = 0
  }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = o.alpha ?? 1
  c.translate(Math.round(x), Math.round(feetY)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(src, ssx, ssy, w, h, -ccx * s, -bx.b * s, w * s, h * s)
  c.restore()
  const top = feetY - (bx.b - bx.t) * s
  return { x, feet: feetY, top, s, height: (bx.b - bx.t) * s, front: x + dir * (bx.r - ccx) * s, muzzleY: top + (bx.b - bx.t) * s * 0.36 }
}

// ── shared effect pieces ───────────────────────────────────────────────────────────────────────────────────────────
function glowLine(c, x1, y1, x2, y2, col, w, a = 1) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
  c.globalAlpha = a * 0.35; c.strokeStyle = col; c.lineWidth = w * 2.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
  c.globalAlpha = a * 0.9; c.lineWidth = w; c.stroke()
  c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, w * 0.35); c.stroke()
  c.restore()
}
function burst(c, x, y, r, col, u, n = 10, seed = 0) {
  c.save(); c.globalCompositeOperation = 'lighter'
  c.globalAlpha = (1 - u) * 0.8; c.fillStyle = col; c.beginPath(); c.arc(x, y, r * (0.4 + u * 0.8), 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#ffffff'; c.lineWidth = 2
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + hash(seed, i) * 0.6, l = r * (0.6 + hash(seed, i + 40) * 0.9) * (0.4 + u)
    c.globalAlpha = (1 - u); c.beginPath(); c.moveTo(x + Math.cos(a) * l * 0.3, y + Math.sin(a) * l * 0.3); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke() }
  c.restore()
}
function teleportColumn(c, x, feetY, h, col, u, seed) {   // S.P.D. teleport: a light column + pixel motes streaming in
  c.save(); c.globalCompositeOperation = 'lighter'
  const a = Math.sin(Math.PI * clamp(u, 0, 1)), w = 34 + 26 * (1 - u)
  const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.globalAlpha = a * 0.85; c.fillStyle = g; c.fillRect(x - w, feetY - h - 260, w * 2, h + 260)
  c.fillStyle = '#ffffff'
  for (let i = 0; i < 16; i++) { const px = x + (hash(seed, i) - 0.5) * w * 1.6, py = feetY - h * hash(seed, i + 20) - 200 * (1 - u) * hash(seed, i + 50)
    c.globalAlpha = a * 0.9; c.fillRect(Math.round(px), Math.round(py), 3, 3) }
  c.globalAlpha = a * 0.7; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(x, feetY, 40 * (0.6 + u), 9, 0, 0, Math.PI * 2); c.stroke()
  c.restore()
}
function rifle(c, gx, gy, dir, s, col, glow = 0) {   // the S.P.D. long rifle (code-drawn), held at the hands, pointing at the foe
  const L = 138 * s / 1.9, sc = s / 1.9   // a really long rifle: ~1.2 × a Ranger's height
  c.save(); c.translate(gx, gy); if (dir < 0) c.scale(-1, 1)
  c.fillStyle = '#20242c'; c.fillRect(-26 * sc, -5 * sc, 30 * sc, 11 * sc)                 // stock
  c.fillStyle = '#3a404c'; c.fillRect(0, -6 * sc, L * 0.62, 12 * sc)                    // receiver
  c.fillStyle = col; c.fillRect(4 * sc, -1.5 * sc, L * 0.5, 3 * sc)                      // squad-colour stripe
  c.fillStyle = '#5c6474'; c.fillRect(L * 0.62, -3 * sc, L * 0.38, 6 * sc)              // long barrel
  c.fillStyle = '#c8ccd6'; c.fillRect(L - 6 * sc, -4 * sc, 6 * sc, 8 * sc)               // muzzle brake
  c.fillStyle = '#14161c'; c.fillRect(L * 0.18, -13 * sc, L * 0.3, 6 * sc)               // scope
  c.fillStyle = '#7fd8ff'; c.fillRect(L * 0.18 + L * 0.3 - 3 * sc, -12 * sc, 3 * sc, 4 * sc)
  c.fillStyle = '#20242c'; c.fillRect(L * 0.3, 6 * sc, 7 * sc, 12 * sc)                  // grip
  if (glow > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = glow; c.fillStyle = col
    c.beginPath(); c.arc(L, 0, (10 + 16 * glow) * sc, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(L, 0, (4 + 6 * glow) * sc, 0, Math.PI * 2); c.fill() }
  c.restore()
  return { x: gx + dir * L, y: gy }
}
function bolt(c, x1, y1, x2, y2, seed, w, col, a = 1) {   // a jagged branching lightning bolt
  const pts = [[x1, y1]], n = 14
  for (let i = 1; i < n; i++) { const u = i / n; pts.push([x1 + (x2 - x1) * u + (hash(seed, i) - 0.5) * 70, y1 + (y2 - y1) * u]) }
  pts.push([x2, y2])
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round'
  for (const [lw, al, st] of [[w * 3.2, 0.3, col], [w * 1.4, 0.8, col], [w * 0.5, 1, '#ffffff']]) {
    c.globalAlpha = a * al; c.strokeStyle = st; c.lineWidth = lw; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.stroke()
  }
  c.globalAlpha = a * 0.7; c.strokeStyle = col; c.lineWidth = w * 0.4
  for (let i = 3; i < n - 2; i += 3) { const p = pts[i], dx = (hash(seed, i + 70) - 0.5) * 160; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + dx * 0.5, p[1] + 30); c.lineTo(p[0] + dx, p[1] + 70); c.stroke() }
  c.restore()
}

// ── WORLD PASS ─────────────────────────────────────────────────────────────────────────────────────────────────────
// preload every Ranger's sheets the scene uses (once per squad + skin), from the moment the meter is half full
const PRE = new Set(), USED = ['idle', 'jump', 'win', 'intro', 'up', 'heavy', ...Object.values(SPD_SHOT), ...Object.values(MMPR_STRIKE)]
function preload(f) {
  const sq = SQUADS[f._squad.id], key = f._squad.id + '|' + (f.skinId || ''); if (!sq || PRE.has(key)) return
  PRE.add(key)
  for (const form of sq.forms) { const A = sq.skinAnim(f.skinId, form) || {}, B = sq.formChar(form)?.animationData || {}
    for (const k of USED) for (const a of [A[k], B[k]]) if (a?.sheet) image(a.sheet) }
}
export function drawSquadUltWorld(c, fighter) {
  if (fighter?._squad && ((fighter.energy || 0) >= 50 || squadUltScene()?.caster === fighter)) preload(fighter)
  const sc = squadUltScene(); if (!sc || sc.caster !== fighter) return
  try { XF = c.getTransform() } catch (_) { XF = null }
  const sq = SQUADS[sc.id]; if (!sq) return
  if (sc.id === 'spd_rangers') drawSpd(c, sc, sq); else drawMmpr(c, sc, sq)
}

function drawSpd(c, sc, sq) {
  const S = SPD_VOLLEY, k = sc.frame, d = sc.dir, t = sc.target, f = sc.caster, skin = f.skinId
  const tcx = t.x + (t.w || 48) / 2, tcy = t.y + (t.h || 94) * 0.45
  const col = form => sq.colors[form] || '#ffffff'
  const shooters = []   // index = shot.who (team order), -1 = the caster
  // back to front: the ranks, then the caster on top
  const order = [...sc.team].sort((a, b) => (b.rank || 0) - (a.rank || 0))
  const exitAt = m => S.exit + ((sc.team.length - (sc.team.indexOf(m))) * 5)
  for (const m of order) {
    const i = sc.team.indexOf(m), cl = col(m.form)
    if (k < m.arrive) continue
    const inU = (k - m.arrive) / 12, outK = k - exitAt(m)
    if (inU < 1) teleportColumn(c, m.x, m.feet, 110, cl, inU, i * 31 + 7)
    if (outK >= 0 && outK < 14) teleportColumn(c, m.x, m.feet, 110, cl, 1 - outK / 14, i * 31 + 9)
    if (outK >= 12) continue
    const alpha = clamp((k - m.arrive - 3) / 8, 0, 1) * (outK > 0 ? clamp(1 - outK / 12, 0, 1) : 1)
    const fired = sc.shots.filter(s => s.who === i && s.at <= k), last = fired.length ? fired[fired.length - 1].at : -99
    const aim = k >= S.lock - 14, recoil = k - last < 4
    const key = aim ? [SPD_SHOT[m.form], 'idle'] : ['idle']
    const g = ranger(c, sq, skin, m.form, key, aim ? (recoil ? 1 : 0) : (k >> 3), m.x - (recoil ? d * 3 : 0), m.feet + (m.hover ? Math.sin(k / 9) * 4 : 0), d, { alpha, s: m.s, shade: m.shade })
    if (!g || !aim || alpha < 0.3) { shooters[i] = null; continue }
    const glow = k >= S.charge && k < S.fire + 4 ? clamp((k - S.charge) / (S.fire - S.charge), 0, 1) : recoil ? 0.6 : 0
    shooters[i] = { ...rifle(c, g.front - d * 18 * g.s / 1.9, g.muzzleY, d, g.s, cl, glow), col: cl }
    if (k - m.arrive < 30 && k >= m.arrive + 4) nameTag(c, m.x, g.top - 16, sq.short[m.form] + '!', cl, clamp((k - m.arrive - 4) / 6, 0, 1) * clamp((m.arrive + 30 - k) / 6, 0, 1))
  }
  // the caster (its engine sprite is hidden for the cinematic)
  {
    const fx = f.x + (f.w || 48) / 2, ff = f.y + (f.h || 94), aim = k >= S.alert
    const fired = sc.shots.filter(s => s.who === -1 && s.at <= k), last = fired.length ? fired[fired.length - 1].at : -99, recoil = k - last < 4
    const g = ranger(c, sq, skin, sc.form, aim ? [SPD_SHOT[sc.form], 'idle'] : ['idle'], aim ? (recoil || (k >= S.fire && k < S.fire + 8) ? 1 : 0) : (k >> 3), fx - (recoil ? d * 3 : 0), ff, d)
    if (g && aim) { const glow = k >= S.charge && k < S.fire + 4 ? clamp((k - S.charge) / (S.fire - S.charge), 0, 1) : recoil ? 0.6 : 0
      shooters[-1] = { ...rifle(c, g.front - d * 18 * g.s / 1.9, g.muzzleY, d, g.s, col(sc.form), glow), col: col(sc.form) } }
  }
  const all = [...Object.keys(shooters)].map(i => shooters[i]).filter(Boolean)
  // laser sights converge, then the reticle closes on the foe
  if (k >= S.lock && k < S.charge + 10) {
    const a = k < S.ripple ? clamp((k - S.lock) / 8, 0, 1) : clamp(1 - (k - S.ripple) / 70, 0.25, 1)
    for (const [j, s] of all.entries()) { const ay = tcy + (hash(j, 3) - 0.5) * 40
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.85; c.strokeStyle = '#ff2a2a'; c.lineWidth = 1.2
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(tcx, ay); c.stroke(); c.fillStyle = '#ff4040'; c.beginPath(); c.arc(tcx, ay, 3, 0, Math.PI * 2); c.fill(); c.restore() }
    reticle(c, tcx, tcy, 70 - 34 * ease((k - S.lock) / 22), k, a)
  }
  // the ripple volleys: tracers + muzzle flash + impact, each Ranger on its own beat
  for (const s of sc.shots) {
    const age = k - s.at; if (age < 0 || age > 7) continue
    const src = shooters[s.who]; if (!src) continue
    const ix = tcx + s.dx, iy = tcy + s.dy
    if (age < 5) glowLine(c, src.x, src.y, ix, iy, src.col, 4 * (1 - age / 5), 1 - age / 5)
    if (age < 3) burst(c, src.x, src.y, 14, src.col, age / 3, 6, s.at)
    burst(c, ix, iy, 22, src.col, age / 7, 9, s.at + 5)
  }
  // the charge: motes stream into every muzzle
  if (k >= S.charge && k < S.fire) {
    const u = (k - S.charge) / (S.fire - S.charge)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (const [j, s] of all.entries()) for (let i = 0; i < 8; i++) { const ph = ((k * 3 + i * 13 + j * 7) % 40) / 40, ang = hash(j, i) * Math.PI * 2, r = 60 * (1 - ph)
      c.globalAlpha = ph * u; c.fillStyle = i % 2 ? '#ffffff' : s.col; c.fillRect(s.x + Math.cos(ang) * r - 1.5, s.y + Math.sin(ang) * r - 1.5, 3, 3) }
    c.restore()
  }
  // FULL JUDGMENT: every rifle at once — the beams braid into one white blast on the foe
  if (k >= S.fire && k < S.fire + 18) {
    const age = k - S.fire, a = 1 - age / 18
    for (const [j, s] of all.entries()) glowLine(c, s.x, s.y, tcx, tcy + (j - all.length / 2) * 2, s.col, 16 * a, a)
    burst(c, tcx, tcy, 90, '#ffffff', age / 18, 18, 99)
    burst(c, tcx, tcy, 60, '#7fd8ff', clamp(age / 12, 0, 1), 12, 77)
  }
  // VERDICT: the containment card slams over the foe, then shatters
  if (k >= S.verdict && k < S.total) {
    const age = k - S.verdict, cw = 96, chh = 132, z = age < 8 ? 2.2 - 1.2 * ease(age / 8) : 1
    if (age < 34) {
      c.save(); c.translate(tcx, tcy); c.scale(z, z); c.globalAlpha = age < 8 ? age / 8 : 1
      c.fillStyle = 'rgba(40,110,220,0.28)'; c.strokeStyle = '#bfe8ff'; c.lineWidth = 4; roundRect(c, -cw / 2, -chh / 2, cw, chh, 10); c.fill(); c.stroke()
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; roundRect(c, -cw / 2 + 7, -chh / 2 + 7, cw - 14, chh - 14, 6); c.stroke()
      c.fillStyle = '#ffffff'; c.font = 'bold 14px Impact, Arial Black, sans-serif'; c.textAlign = 'center'; c.fillText('S.P.D.', 0, -chh / 2 + 24)
      c.font = 'bold 9px Arial, sans-serif'; c.fillText('CONTAINMENT', 0, chh / 2 - 14)
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * Math.abs(Math.sin(age / 3)); c.fillStyle = '#7fd8ff'; roundRect(c, -cw / 2, -chh / 2, cw, chh, 10); c.fill()
      c.restore()
    } else if (age < 62) {   // shatter: shards fly out and fall
      const u = (age - 34) / 28
      c.save(); c.globalAlpha = 1 - u; c.fillStyle = '#bfe8ff'; c.strokeStyle = '#ffffff'; c.lineWidth = 1
      for (let i = 0; i < 22; i++) { const ang = hash(i, 5) * Math.PI * 2, sp = 90 + hash(i, 6) * 220, px = tcx + Math.cos(ang) * sp * u, py = tcy + Math.sin(ang) * sp * u + 260 * u * u
        c.save(); c.translate(px, py); c.rotate(u * 8 * (hash(i, 7) - 0.5)); c.beginPath(); c.moveTo(0, -7); c.lineTo(6, 5); c.lineTo(-5, 4); c.closePath(); c.fill(); c.stroke(); c.restore() }
      c.restore()
    }
  }
}

function drawMmpr(c, sc, sq) {
  const S = MMPR_STAR, k = sc.frame, d = sc.dir, f = sc.caster, skin = f.skinId, V = sc.V
  const col = form => sq.colors[form] || '#ffffff'
  const t = sc.target, tcx = t.x + (t.w || 48) / 2, tcy = t.y + (t.h || 94) * 0.5
  // the star: a gold guide once the coins land; each relay leg burns its edge in the Ranger's colour
  if (k >= S.coins - 4 && k < S.pose + 8) {
    const fade = k >= S.pose - 6 ? clamp(1 - (k - (S.pose - 6)) / 14, 0, 1) : 1
    c.save(); c.globalCompositeOperation = 'lighter'; c.setLineDash([6, 8]); c.lineDashOffset = -k; c.strokeStyle = '#ffd45a'; c.lineWidth = 2; c.globalAlpha = 0.45 * fade
    c.beginPath(); for (let i = 0; i <= 5; i++) { const v = V[(i * 2) % 5]; i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y) } c.stroke(); c.setLineDash([]); c.restore()
    for (const m of sc.team) {
      const s0 = S.relay + m.k * S.leg; if (k < s0) continue
      const u = clamp((k - s0) / S.leg, 0, 1), A = V[m.from], B = V[m.to], ex = A.x + (B.x - A.x) * ease(u), ey = A.y + (B.y - A.y) * ease(u)
      const pulse = k >= S.charge ? 1 + 0.6 * Math.abs(Math.sin((k - S.charge) / 3)) : 1
      glowLine(c, A.x, A.y, ex, ey, col(m.form), 5 * pulse, fade)
    }
  }
  // the Power Coins spin in from the edges, then hold at the five points
  if (k < S.pillars) for (const m of sc.team) {
    const v = V[m.from], u = ease(k / S.coins), sx = v.x + (hash(m.k, 1) - 0.5) * 1400, sy = v.y - 500 - hash(m.k, 2) * 200
    const x = sx + (v.x - sx) * u, y = sy + (v.y - sy) * u - (k >= S.coins ? 64 : 0) * clamp((k - S.coins) / 10, 0, 1)
    const a = k >= S.charge ? clamp(1 - (k - S.charge) / 20, 0, 1) : 1
    if (a > 0) coin(c, x, y, 20, col(m.form), k / 4 + m.k, a)
  }
  // the lifted foe crackles with Grid energy
  if (k >= S.coins && k < S.bolt) for (let i = 0; i < 3; i++) { if ((k + i * 3) % 7 > 2) continue
    const a = hash(k, i) * Math.PI * 2; bolt(c, tcx, tcy, tcx + Math.cos(a) * 70, tcy + Math.sin(a) * 60, k * 7 + i, 2, '#9fb6ff', 0.7) }
  // the charge: threads from every Ranger into the star's heart
  if (k >= S.charge && k < S.bolt + 4) { const u = clamp((k - S.charge) / (S.bolt - S.charge), 0, 1)
    for (const m of sc.team) { const p = mmprAt(m, k); glowLine(c, p.x, p.y - 50, tcx, tcy, col(m.form), 2 + 4 * u, 0.4 + 0.6 * u) }
    burst(c, tcx, tcy, 30 + 40 * u, '#ffffff', 0.2, 10, k) }
  // explosions behind the final pose line (drawn before the Rangers)
  if (k >= S.pose) for (const L of sc.line) for (let w = 0; w < 2; w++) {
    const i = sc.line.indexOf(L), born = S.pose + i * 4 + w * 12, age = k - born; if (age < 0 || age > 40) continue
    const u = age / 40, x = L.x + (w ? 30 : -18) * d * -1, y = sc.floor - 110 - w * 40
    c.save(); c.globalCompositeOperation = 'lighter'
    c.globalAlpha = (1 - u) * 0.9; c.fillStyle = col(L.form); c.beginPath(); c.arc(x, y, 30 + 70 * ease(u * 1.6), 0, Math.PI * 2); c.fill()
    c.globalAlpha = (1 - u) * 0.8; c.fillStyle = '#fff4c0'; c.beginPath(); c.arc(x, y, 12 + 30 * ease(u * 2), 0, Math.PI * 2); c.fill()
    c.restore()
    c.save(); c.globalAlpha = clamp(u * 2, 0, 1) * (1 - u) * 0.55; c.fillStyle = '#3a3440'
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + i; c.beginPath(); c.arc(x + Math.cos(a) * 50 * u, y - 30 * u + Math.sin(a) * 30 * u, 22 + 18 * u, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  // the Rangers (the caster too)
  for (const m of sc.team) {
    const dropU = m.caster ? 1 : (k - m.drop) / 12
    if (dropU < 0) continue
    const p = mmprAt(m, k), cl = col(m.form)
    let x = p.x, y = p.y
    if (m.caster) { x = f.x + (f.w || 48) / 2; y = f.y + (f.h || 94) }
    else if (dropU < 1) { y = p.y - 520 * (1 - ease(dropU)); glowLine(c, x, y - 220, x, y - 30, cl, 10 * (1 - dropU) + 2, 0.8) }
    if (!m.caster && dropU >= 1 && dropU < 2) burst(c, x, y - 10, 36, cl, dropU - 1, 10, m.k)
    const toC = (sc.cx - x) >= 0 ? 1 : -1
    let dir = toC, keys = ['idle'], fr = k >> 3, o = {}
    if (p.pose === 'dash') { const A = V[m.from], B = V[m.to]; dir = B.x >= A.x ? 1 : -1; keys = [MMPR_STRIKE[m.form], 'heavy']; fr = Math.floor(p.u * 4)
      for (let g = 3; g >= 1; g--) { const pu = clamp(p.u - g * 0.09, 0, 1), e = ease(pu), gx = A.x + (B.x - A.x) * e, gy = Math.min(sc.floor, A.y + 47) + (Math.min(sc.floor, B.y + 47) - Math.min(sc.floor, A.y + 47)) * e
        ranger(c, sq, skin, m.form, keys, fr, gx, gy, dir, { alpha: 0.5 - g * 0.12, tint: cl, tintA: 0.85 }) }
      if (Math.abs(p.u - 0.5) < 0.12) burst(c, tcx, tcy, 44, cl, Math.abs(p.u - 0.5) / 0.12, 12, m.k + 3)
    } else if (p.pose === 'raise') { keys = ['up', 'win', 'idle']; fr = 1 }
    else if (p.pose === 'leap') { keys = ['jump']; fr = 2 }
    else if (p.pose === 'pose') { keys = ['win', 'intro', 'idle']; fr = 0; dir = d }
    else if (y < sc.floor - 8) { keys = ['jump', 'idle']; fr = 2 }
    if (m.caster && k < S.coins) { keys = ['win', 'idle']; fr = 0; dir = d }
    const g = ranger(c, sq, skin, m.form, keys, fr, x, y, dir)
    if (g && !m.caster && dropU >= 1 && k - (m.drop + 12) < 26) nameTag(c, x, g.top - 16, sq.short[m.form] + '!', cl, clamp(1 - (k - (m.drop + 12)) / 26, 0, 1))
  }
  // THE GRID ANSWERS: the bolt, then five pillars of light from the Rangers' points
  if (k >= S.bolt && k < S.bolt + 14) { const age = k - S.bolt, a = 1 - age / 14
    bolt(c, tcx + 10, tcy - 900, tcx, sc.floor, 400 + (age >> 1), 14, '#a9b8ff', a)
    bolt(c, tcx - 30, tcy - 900, tcx + 6, tcy, 500 + (age >> 1), 6, '#ffe58a', a * 0.8)
    burst(c, tcx, sc.floor - 20, 120, '#ffffff', age / 14, 20, 66) }
  if (k >= S.pillars && k < S.pose + 6) { const age = k - S.pillars, a = Math.sin(Math.PI * clamp(age / 26, 0, 1))
    for (const m of sc.team) { const p = mmprAt(m, k), cl = col(m.form)
      c.save(); c.globalCompositeOperation = 'lighter'; const w = 26 + 10 * a
      const g = c.createLinearGradient(p.x - w, 0, p.x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, cl); g.addColorStop(1, 'rgba(0,0,0,0)')
      c.globalAlpha = a; c.fillStyle = g; c.fillRect(p.x - w, p.y - 1200, w * 2, 1200); c.globalAlpha = a * 0.8; c.fillStyle = '#ffffff'; c.fillRect(p.x - 3, p.y - 1200, 6, 1200); c.restore() } }
}

function coin(c, x, y, r, col, spin, a) {
  const sx = Math.max(0.12, Math.abs(Math.cos(spin)))
  c.save(); c.translate(x, y); c.scale(sx, 1); c.globalAlpha = a
  c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.globalAlpha = a * 0.45; c.beginPath(); c.arc(0, 0, r * 1.8, 0, Math.PI * 2); c.fill()
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = a
  c.fillStyle = '#c9971c'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(0, 0, r * 0.84, 0, Math.PI * 2); c.fill()
  c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'; c.beginPath()
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.22 : r * 0.5, an = -Math.PI / 2 + i * Math.PI / 5; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  c.closePath(); c.fill(); c.restore()
}
function reticle(c, x, y, r, k, a) {
  c.save(); c.translate(x, y); c.rotate(k / 14); c.globalAlpha = a; c.strokeStyle = '#ff3b3b'; c.lineWidth = 2.5
  for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(r, -r * 0.35); c.lineTo(r, -r); c.lineTo(r * 0.35, -r); c.stroke() }
  c.rotate(-k / 7); c.beginPath(); c.arc(0, 0, r * 0.55, 0, Math.PI * 2); c.setLineDash([4, 5]); c.stroke(); c.restore()
}
function nameTag(c, x, y, txt, col, a) {
  if (!(a > 0)) return
  c.save(); c.globalAlpha = a; c.font = 'bold italic 15px Impact, Arial Black, sans-serif'; c.textAlign = 'center'
  c.lineWidth = 4; c.strokeStyle = '#000000'; c.strokeText(txt, x, y); c.fillStyle = col === '#3a3a48' ? '#b8bccc' : col; c.fillText(txt, x, y); c.restore()
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }

// ── SCREEN PASS ────────────────────────────────────────────────────────────────────────────────────────────────────
function card(ctx, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#000000') {
  if (!(a > 0)) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); if (rot) ctx.rotate(rot)
  ctx.font = `bold italic ${Math.round(size)}px Impact, Arial Black, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size / 7); ctx.strokeStyle = stroke; ctx.strokeText(txt, 0, 0); ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore()
}
const toScreen = (x, y) => XF ? { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f } : null
export function drawSquadUltScreen(ctx, canvas) {
  const sc = squadUltScene(); if (!sc) { XF = null; return false }
  const W = canvas.width, H = canvas.height, k = sc.frame, S = sc.S, spd = sc.id === 'spd_rangers'
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; try { ctx.filter = 'none' } catch (_) {}
  // vignette + letterbox
  const inU = ease(k / 12), outU = ease((S.total - k) / 12), bar = H * 0.1 * Math.min(inU, outU)
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.globalAlpha = Math.min(inU, outU); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  const u = H / 720
  if (spd) {
    const V = SPD_VOLLEY
    if (k < V.alert + 14) {   // EMERGENCY: red / blue siren sweeps
      const a = clamp(1 - (k - V.alert) / 14, 0, 1), red = (k >> 3) % 2 === 0
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(red ? 0 : 1, red ? 'rgba(255,30,40,0.38)' : 'rgba(40,110,255,0.38)'); g.addColorStop(0.5, 'rgba(0,0,0,0)')
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1
      card(ctx, 'S.P.D. EMERGENCY!', W / 2, H * 0.3, 66 * u * (k < 6 ? 1.6 - 0.1 * k : 1), '#ffffff', a, -0.04, '#1240a8')
      badge(ctx, W / 2, H * 0.3 - 74 * u, 34 * u, a)
    }
    if (k >= V.assemble && k < V.lock) card(ctx, 'B-SQUAD — FORM UP!', W / 2, H - bar - 34 * u, 30 * u, '#7fd8ff', clamp((k - V.assemble) / 8, 0, 1) * clamp((V.lock - k) / 8, 0, 1))
    if (k >= V.lock && k < V.ripple + 6) card(ctx, 'TARGET LOCKED', W / 2, bar + 40 * u, 34 * u, '#ff3b3b', clamp((k - V.lock) / 4, 0, 1) * ((k >> 2) % 2 ? 1 : 0.75))
    if (k >= V.ripple && k < V.charge) card(ctx, 'FIRE AT WILL!', W / 2, H - bar - 34 * u, 30 * u, '#ffffff', clamp((k - V.ripple) / 6, 0, 1) * clamp((V.charge - k) / 8, 0, 1))
    if (k >= V.charge && k < V.fire) { ctx.globalAlpha = 0.35 * (k - V.charge) / (V.fire - V.charge); ctx.fillStyle = '#000814'; ctx.fillRect(0, bar, W, H - 2 * bar); ctx.globalAlpha = 1
      card(ctx, 'FULL POWER — JUDGMENT!', W / 2, H * 0.2, 44 * u, '#ffe14a', clamp((k - V.charge) / 6, 0, 1)) }
    if (k >= V.fire && k < V.fire + 12) { ctx.globalAlpha = 0.85 * (1 - (k - V.fire) / 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
    if (k >= V.verdict) {   // the judgment scanner's verdict
      const age = k - V.verdict, z = age < 7 ? 3 - 2 * ease(age / 7) : 1, a = clamp((S.total - k) / 14, 0, 1)
      const p = toScreen(sc.target.x + (sc.target.w || 48) / 2, sc.target.y) || { x: W / 2, y: H * 0.3 }
      card(ctx, sc.blocked ? 'BLOCKED' : 'GUILTY', clamp(p.x, W * 0.2, W * 0.8), clamp(p.y - 70 * u, bar + 60 * u, H * 0.5), 84 * u * z, sc.blocked ? '#bfe8ff' : '#ff2626', a, -0.12, '#ffffff')
      if (age >= 34) card(ctx, 'CONTAINED', W / 2, H - bar - 40 * u, 34 * u, '#7fd8ff', clamp((age - 34) / 6, 0, 1) * a)
    }
  } else {
    const M = MMPR_STAR
    if (k < M.coins + 16) card(ctx, "IT'S MORPHIN TIME!", W / 2, H * 0.28, 64 * u * (k < 6 ? 1.6 - 0.1 * k : 1), '#ffe14a', clamp((M.coins + 16 - k) / 10, 0, 1), -0.04, '#8a1010')
    if (k >= M.relay - 6 && k < M.charge) card(ctx, 'FIVE-POINT STAR!', W / 2, bar + 42 * u, 38 * u, '#ffffff', clamp((k - M.relay + 6) / 6, 0, 1) * clamp((M.charge - k) / 8, 0, 1), 0, '#7a1aa8')
    if (k >= M.charge && k < M.bolt) { ctx.globalAlpha = 0.45 * (k - M.charge) / (M.bolt - M.charge); ctx.fillStyle = '#05021a'; ctx.fillRect(0, bar, W, H - 2 * bar); ctx.globalAlpha = 1
      card(ctx, 'MORPHIN GRID — ANSWER US!', W / 2, H - bar - 40 * u, 36 * u, '#a9b8ff', clamp((k - M.charge) / 6, 0, 1)) }
    if (k >= M.bolt && k < M.bolt + 10) { ctx.globalAlpha = 1 - (k - M.bolt) / 10; ctx.fillStyle = '#eef2ff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
    if (k >= M.pose) { const age = k - M.pose, z = age < 7 ? 2.4 - 1.4 * ease(age / 7) : 1, a = clamp((S.total - k) / 12, 0, 1)
      card(ctx, sc.blocked ? 'BLOCKED!' : 'MIGHTY MORPHIN', W / 2, bar + 56 * u, 58 * u * z, '#ffffff', a, -0.03, '#c01818')
      if (!sc.blocked) card(ctx, 'POWER RANGERS!', W / 2, bar + 116 * u, 46 * u * z, '#ffe14a', clamp((age - 4) / 5, 0, 1) * a, -0.03, '#000000') }
  }
  ctx.restore()
  return true
}
function badge(ctx, x, y, r, a) {   // the S.P.D. badge, code-drawn
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y)
  ctx.fillStyle = '#d8dde6'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + i * Math.PI / 3; i ? ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r) : ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r) } ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#1240a8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(r * 0.56)}px Impact, Arial Black, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SPD', 0, 1)
  ctx.restore()
}
