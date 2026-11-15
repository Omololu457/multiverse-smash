// Batman (batman) — RENDER-ONLY: support fleet, payloads, gadgets (batarang, grapnel / rope lines), smoke, target
// bracket, HUD (operation status + cooldown chips), KNIGHTFALL sky / aircraft / explosion layers, intro card, audio cues.
// Reads sim state (f._batman, the ultimate view), never writes it. All art is the supplied sheets as extracted into
// assets/batman/{body,fleet,portrait}.png (+ the committed Krybot explosion strip, read-only reuse); every machine name
// is a custom game adaptation of generic supplied art. Bounded: images cached once per URL, no per-frame canvases,
// pixel reads or decoding; all lists are capped in the sim. No Math.random (variation = sim tick / entity id hash).
// Reduced effects (juiceSettings.reduceFlashing / reduceMotion) → no flicker, softer flashes, static smoke.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { batman, SCALE, FLEET, MAJOR } from './batmanData.js'
import { BATMAN_FLEET_CELLS as FC, BATMAN_FX_CELLS as XC, BATMAN_TOOL_ANCHORS as TA } from './batmanSprites.js'
import { batmanUltView, isBatmanUltActive, FLEET_SCALE } from './batmanState.js'
import { BATMAN_FX_COLORS } from './batmanSkins.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const batmanFxCacheSize = () => cache.size
const isBm = f => f?.rosterKey === 'batman'
const tagOf = f => f?._recolorTag && BATMAN_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => BATMAN_FX_COLORS[tagOf(f)] || BATMAN_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/batman/skins/${tagOf(f)}/${rel}` : `./assets/batman/${rel}`)
const explosionArt = f => image(tagOf(f) ? `./assets/batman/skins/${tagOf(f)}/explosion.png` : './assets/krybot/explosion.png')
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// one atlas cell: (x, y) = the cell's origin in world space; rot in radians (applied before the flip)
function cell(c, im, C, fr, x, y, sc, flip = false, rot = 0, alpha = 1) {
  if (!ready(im) || !C) return
  const i = ((fr % C.frames) + C.frames) % C.frames
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false
  c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); c.scale(flip ? -sc : sc, sc)
  c.drawImage(im, i * C.width, C.sourceY, C.width, C.height, -C.originX, -C.originY, C.width, C.height)
  c.restore()
}
const autoFrame = (C, t) => Math.floor(t / Math.max(1, C?.speed || 5))

// ── machines ──
const GROUND_TOP = new Set(['auto'])                         // top-anchored cells whose sim y is the FEET line
const DEATH = { scout: 'scout_death', inter: 'inter_death', platform: 'platform_death', heli: 'heli_death', carrier: 'carrier_back', auto: 'auto_death' }
const EXPLICIT = new Set(['hunter', 'hunter_turn', 'steelwing', 'defender', 'defender2'])
function drawMachine(c, f, fleet, m) {
  if (m.gone || m.k === 'capsule' && m.at > 40) return
  const sc = FLEET_SCALE[m.k] || 1
  let row = m.row, fr
  if (m.dead && DEATH[m.k]) { row = DEATH[m.k]; fr = Math.min(FC[row].frames - 1, Math.floor(m.dead / 5)) }
  else if (m.k === 'lurker') fr = m.fire > 0 ? 1 : 0
  else if (EXPLICIT.has(row)) fr = m.fr || 0
  else fr = autoFrame(FC[row], m.at)
  const C = FC[row]; if (!C) return
  let y = m.y
  if (GROUND_TOP.has(m.k)) y = m.y - (C.height - C.originY) * sc
  const al = m.dead ? Math.max(0, 1 - Math.max(0, m.dead - 24) / 16) : 1
  cell(c, fleet, C, fr, m.x, y, sc, (m.face || 1) < 0, 0, al)
  if (m.flash > 0 && !calm()) {                                                   // hit flash (machines can be destroyed)
    c.save(); c.globalAlpha = 0.35 * (m.flash / 6); c.fillStyle = '#ffffff'
    const w = C.width * sc, h = C.height * sc; c.fillRect(m.x - C.originX * sc, y - C.originY * sc, w, h); c.restore()
  }
  if (m.k === 'heli' && !m.dead) {                                                // the Skyhook cable (hook drawn in code)
    c.save(); c.strokeStyle = '#1a1a22'; c.lineWidth = 2; c.beginPath(); c.moveTo(m.x, m.y + 70); c.lineTo(m.x, m.y + 104); c.stroke()
    c.fillStyle = colsOf(f).fx[2]; c.fillRect(m.x - 5, m.y + 102, 10, 4); c.restore()
  }
}

// ── payloads ──
function drawPayload(c, f, fleet, p) {
  const { fx } = colsOf(f)
  if (p.kind === 'bomb') { cell(c, fleet, FC.bombs, Math.max(0, Math.min(5, Math.floor(p.vy / 2))), p.x, p.y, FLEET_SCALE.bomb, p.vx < 0); return }
  if (p.kind === 'round') { cell(c, fleet, FC.ammo, p.vy < 0 ? 0 : 2, p.x, p.y, FLEET_SCALE.ammo * 0.5, p.vx < 0); return }
  c.save()
  if (p.kind === 'bolt') { c.strokeStyle = fx[1]; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y - 12); c.lineTo(p.x, p.y + 10); c.stroke() }
  else if (p.kind === 'shell') {
    c.fillStyle = fx[2]; c.beginPath(); c.ellipse(p.x, p.y, 8, 4, 0, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.5; c.strokeStyle = fx[1]; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - Math.sign(p.vx) * 22, p.y); c.stroke()
  } else {
    const L = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / L, uy = p.vy / L
    c.strokeStyle = p.look === 'flash' ? fx[0] : fx[1]; c.lineWidth = 2
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - ux * 18, p.y - uy * 18); c.stroke()
  }
  c.restore()
}

// ── smoke fields (deterministic puff layout; static under reduced motion) ──
function drawSmoke(c, f, s, layer) {
  const { smoke } = colsOf(f)
  for (const z of s.smoke) {
    const a = Math.min(1, z.life / 20, (z.max - z.life + 1) / 8) * (layer ? 0.45 : 0.75), t = calm() ? 0 : s.tick
    c.save()
    for (let i = 0; i < 9; i++) {
      const hx = hash(i, z.x), hy = hash(i + 31, z.y)
      const px = z.x + (hx - 0.5) * z.r * 1.6 + (calm() ? 0 : Math.sin((t + i * 13) / 30) * 6)
      const py = z.y - 18 - hy * (layer ? z.r * 0.9 : z.r * 0.4)
      const r = z.r * (0.28 + 0.2 * hash(i + 7, z.x)) * (layer ? 0.8 : 1)
      c.globalAlpha = a * (0.5 + 0.4 * hash(i + 3, z.y)); c.fillStyle = i % 3 ? smoke[0] : smoke[1]
      c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill()
    }
    c.restore()
  }
}

// ── tool lines anchored to the drawn hand / gun (pixel-measured anchors from the sheet) ──
function anchor(f, act) {
  const a = TA[act]; if (!a) return null
  const fr = f._lastSpriteFrame ?? 0, k = a[fr] || a[Object.keys(a).pop()]
  return { x: ctrX(f) + (f.facing || 1) * k.dx * SCALE, y: feet(f) + k.dy * SCALE, kind: k.kind }
}
function rope(c, x0, y0, x1, y1, col) {
  c.save(); c.lineCap = 'round'
  c.strokeStyle = '#141418'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke()
  c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke()
  c.restore()
}
function drawTools(c, f, s) {
  const { fx } = colsOf(f), act = f._lastSpriteAction, body = art(f, 'body.png')
  if (s.bat) cell(c, body, XC.fxBatarang, Math.floor(s.bat.age / 2), s.bat.x, s.bat.y, SCALE, s.bat.dir < 0)
  const h = s.hook
  if (h) {
    const a = anchor(f, act === 'bGrapnel' || act === 'ultOpen' ? act : 'bGrapnel') || { x: ctrX(f) + (f.facing || 1) * 40, y: f.y + 18 }
    rope(c, a.x, a.y, h.x, h.y, fx[2])
    c.save(); c.fillStyle = '#20202a'; c.beginPath(); c.moveTo(h.x + h.dir * 8, h.y); c.lineTo(h.x - h.dir * 4, h.y - 6); c.lineTo(h.x - h.dir * 4, h.y + 6); c.closePath(); c.fill(); c.restore()
  }
  const at = f.attacking ? f.currentAttack : null
  if (at?.bm?.key === 'bRopeKick') {                       // the rope continues from the drawn grip up off the top of the view
    const a = anchor(f, 'bRopeKick'); if (a?.kind === 'ropeTop') rope(c, a.x, a.y, a.x + (f.facing || 1) * 40, a.y - 900, fx[2])
  }
  if (at?.bm?.key === 'bRooftop') {
    const a = anchor(f, 'bRooftop'); if (a) rope(c, a.x, a.y, a.x + (f.facing || 1) * 60, a.y - 900, fx[2])
  }
  if (at?.bm?.key === 'ultOpen' && !h) {
    const t = at.total - at.timer; if (t >= 14 && t < 20) { const a = anchor(f, 'ultOpen'); if (a) rope(c, a.x, a.y, a.x + (f.facing || 1) * 210, a.y - 8, fx[2]) }
  }
}

// ── one-shot events ──
function drawEvents(c, f, s) {
  const { fx, hud } = colsOf(f), ex = explosionArt(f)
  for (const e of s.fx) {
    const al = Math.max(0, 1 - e.t / 30)
    c.save()
    if (e.kind === 'boom' || e.kind === 'ultBoom') {
      const big = e.kind === 'ultBoom', sc = big ? 3.2 : e.big ? 1.6 : 1.2, fr = Math.floor(e.t / (big ? 6 : 4))
      if (fr < 5 && ready(ex)) { c.imageSmoothingEnabled = false; c.drawImage(ex, fr * 64, 0, 64, 64, e.x - 32 * sc, e.y - 56 * sc, 64 * sc, 64 * sc) }
      if (big) { c.globalAlpha = Math.max(0, 1 - e.t / 40) * (calm() ? 0.5 : 0.9); c.strokeStyle = fx[0]; c.lineWidth = 5; c.beginPath(); c.ellipse(e.x, e.y - 4, 30 + e.t * 9, 8 + e.t * 1.6, 0, 0, Math.PI * 2); c.stroke()
        for (let i = 0; i < 8; i++) { const ang = Math.PI * (1 + i / 7), d = e.t * (5 + hash(i, e.x) * 4); c.fillStyle = '#2a2a30'; c.fillRect(e.x + Math.cos(ang) * d, e.y - 10 + Math.sin(ang) * d * 0.8 + e.t * e.t * 0.06, 5, 4) } }
    } else if (e.kind === 'wreck') {
      c.globalAlpha = al; c.fillStyle = fx[2]; c.beginPath(); c.arc(e.x, e.y + 20, 10 + e.t, 0, Math.PI * 2); c.fill()
    } else if (e.kind === 'beam') {
      const life = e.heavy ? 14 : 10; if (e.t < life) {
        c.globalAlpha = (1 - e.t / life) * (calm() ? 0.6 : 0.95); c.fillStyle = fx[0]
        const hgt = e.heavy ? 16 : 9; c.fillRect(e.dir > 0 ? e.x : e.x - e.len, e.y - hgt / 2, e.len, hgt)
        c.fillStyle = '#ffffff'; c.globalAlpha *= 0.8; c.fillRect(e.dir > 0 ? e.x : e.x - e.len, e.y - 1.5, e.len, 3)
      }
    } else if (e.kind === 'counter') {
      c.globalAlpha = al; c.strokeStyle = hud[1]; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, 8 + e.t * 1.8, -Math.PI / 2, Math.PI / 2, e.dir < 0); c.stroke()
    } else if (e.kind === 'shadow') {
      c.globalAlpha = al * 0.8; c.strokeStyle = hud[0]; c.lineWidth = 3
      for (let i = 0; i < 3; i++) { const x = e.x - e.dir * (10 + i * 16 + e.t * 2); c.beginPath(); c.moveTo(x, e.y + i * 10); c.lineTo(x - e.dir * 22, e.y + i * 10); c.stroke() }
    } else if (e.kind === 'dust' || e.kind === 'slam') {
      c.globalAlpha = al * 0.8; c.strokeStyle = e.kind === 'slam' ? fx[1] : '#b8b0a0'; c.lineWidth = 3
      c.beginPath(); c.ellipse(e.x, e.y - 2, 12 + e.t * (e.kind === 'slam' ? 4 : 2.4), 3 + e.t * 0.4, 0, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
  }
}
function drawBracket(c, f, s) {
  const b = s.bracket; if (!b) return
  const { hud } = colsOf(f), w = 70, h = 112, x = b.x - w / 2, y = b.y - 10, k = 14, al = Math.min(1, b.age / 6)
  c.save(); c.globalAlpha = al * (calm() ? 0.8 : 0.65 + 0.35 * ((b.age >> 3) & 1)); c.strokeStyle = hud[0]; c.lineWidth = 2
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    c.beginPath(); c.moveTo(cx + dx * k, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + dy * k); c.stroke()
  }
  c.font = 'bold 10px Arial'; c.textAlign = 'center'; c.fillStyle = hud[0]; c.fillText('TARGET ACQUIRED', b.x, y - 6)
  c.restore()
}

// World layer UNDER the fighters: low smoke + airspace bombers on the far side of their orbit (depth < 0).
export function drawBatmanUnder(c, p1, p2) {
  for (const f of [p1, p2]) {
    if (!isBm(f) || !f._batman) continue
    const s = f._batman, fleet = art(f, 'fleet.png')
    drawSmoke(c, f, s, 0)
    for (const op of s.ops) for (const m of op.m) if (m.k === 'bomber' && (m.depth || 0) < 0) drawMachine(c, f, fleet, m)
  }
}
// World layer AFTER the fighters.
export function drawBatmanFx(c, f) {
  if (!isBm(f) || !f._batman) return
  const s = f._batman, fleet = art(f, 'fleet.png')
  for (const op of s.ops) for (const m of op.m) if (!(m.k === 'bomber' && (m.depth || 0) < 0)) drawMachine(c, f, fleet, m)
  for (const p of s.pay) drawPayload(c, f, fleet, p)
  drawSmoke(c, f, s, 1)
  drawTools(c, f, s)
  drawBracket(c, f, s)
  drawEvents(c, f, s)
  drawUltWorld(c, f)
}

// ══ KNIGHTFALL ═══════════════════════════════════════════════════════════════════════════════════════════════════
function drawUltWorld(c, f) {
  const v = batmanUltView(); if (!v || v.caster !== f) return
  const P = v.plane; if (!P) return
  const fleet = art(f, 'fleet.png'), { fx } = colsOf(f), d = v.dir
  if (P.tether && v.target) rope(c, P.x, P.y + 40, ctrX(v.target), v.target.y + 6, fx[2])
  if (P.trail && !calm()) {                                     // re-entry heat trail behind the aircraft
    c.save(); c.globalAlpha = 0.55; c.strokeStyle = fx[1]; c.lineWidth = 10; c.lineCap = 'round'
    const ang = P.ang * Math.PI / 180, bx = -Math.cos(ang) * d, by = -Math.sin(ang)
    c.beginPath(); c.moveTo(P.x, P.y + 30); c.lineTo(P.x + bx * 160, P.y + 30 + by * 160); c.stroke(); c.restore()
  }
  const C = FC.plane_drop
  cell(c, fleet, C, P.tether ? 4 : Math.floor(v.frame / 4) % 3, P.x, P.y + C.height * FLEET_SCALE.plane / 2, FLEET_SCALE.plane, d < 0, (P.ang * Math.PI / 180) * d)
}
// SCREEN layer under the fighters, drawn BEFORE Superman's World-of-Cardboard space backdrop (which game.js also shows
// for Batman's ult — stars / moon / streak scroll). Here: the high-altitude sky gradient + cloud streaks of the ascent.
export function drawBatmanSky(c, cv) {
  const v = batmanUltView(); if (!v || v.sky <= 0) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, a = Math.min(1, v.sky), up = v.phase === 'ascent' ? 1 : v.phase === 'reentry' ? -1 : 0
  c.save(); c.globalAlpha = a * 0.96
  const g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#0a1430'); g.addColorStop(0.6, '#2a4a7a'); g.addColorStop(1, '#6a88b0')
  c.fillStyle = g; c.fillRect(0, 0, cw, ch)
  if (up && !calm()) {
    c.globalAlpha = a * 0.35; c.fillStyle = '#e8eef8'
    for (let i = 0; i < 14; i++) {
      const x = hash(i, 5) * cw, len = 60 + hash(i, 9) * 160, y = (((hash(i, 2) * ch + up * v.frame * 26) % (ch + len)) + ch + len) % (ch + len) - len
      c.fillRect(x, y, 18 + hash(i, 4) * 40, len)
    }
  }
  c.restore()
}
const CAPTION = { strafe: 'KNIGHTFALL', ascent: 'ORBITAL IMPACT', impact: 'KNIGHTFALL: ORBITAL IMPACT' }

// ── HUD: support-operation status under Batman's health bar + KNIGHTFALL captions ──
const OP_LABEL = { airspace: 'AIRSPACE', interceptor: 'INTERCEPT', carrier: 'CARRIER', skyhook: 'SKYHOOK', cover: 'COVER', automaton: 'AUTOMATON' }
export function batmanHudLabel(f) {
  const s = f?._batman
  const live = s?.ops.find(o => !o.exit) || null
  return { op: live ? live.kind : null, t: live ? live.t : 0, end: live ? FLEET[live.kind].exitAt : 0, exiting: !!s?.ops.find(o => o.exit),
    cd: Object.fromEntries(MAJOR.map(k => [k, s?.cd[k] || 0])), machines: s ? s.ops.reduce((n, o) => n + o.m.filter(m => !m.gone && !m.dead).length, 0) : 0 }
}
function drawOps(c, f, x, y, flip) {
  const L = batmanHudLabel(f), [hud0, hud1] = colsOf(f).hud
  c.save(); c.font = 'bold 8px Arial'; c.textBaseline = 'middle'; c.textAlign = 'center'
  const bw = 44, gap = 3, total = MAJOR.length * (bw + gap)
  const x0 = flip ? x - total : x
  c.fillStyle = 'rgba(8,8,14,0.7)'; c.fillRect(x0 - 4, y - 2, total + 6, 28)
  MAJOR.forEach((k, i) => {
    const bx = x0 + i * (bw + gap), live = L.op === k, cd = L.cd[k], frac = cd > 0 ? cd / FLEET[k].cooldown : 0
    c.fillStyle = live ? hud0 : 'rgba(255,255,255,0.10)'; c.fillRect(bx, y, bw, 11)
    if (frac > 0) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(bx, y, bw * frac, 11) }
    c.strokeStyle = hud0; c.lineWidth = 1; c.strokeRect(bx + 0.5, y + 0.5, bw - 1, 10)
    c.fillStyle = live ? '#0c0c14' : frac > 0 ? 'rgba(255,255,255,0.4)' : hud1; c.fillText(OP_LABEL[k], bx + bw / 2, y + 6)
  })
  if (L.op) { const u = Math.min(1, L.t / Math.max(1, L.end)); c.fillStyle = hud1; c.fillRect(x0, y + 15, total * (1 - u), 4) }
  c.textAlign = flip ? 'right' : 'left'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 8px Arial'
  c.fillText(L.op ? `${OP_LABEL[L.op]} LIVE · ${L.machines} UNIT${L.machines === 1 ? '' : 'S'}` : L.exiting ? 'HAND-OFF' : 'FLEET READY', flip ? x0 + total : x0, y + 24)
  c.restore()
}
export function drawBatmanHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720, pad = 14
  if (!isBatmanUltActive()) { if (isBm(p1)) drawOps(c, p1, pad + 8, 78, false); if (isBm(p2)) drawOps(c, p2, cw - pad - 8, 78, true) }
  const v = batmanUltView(); if (!v) return
  const f = v.caster, [hud0, hud1] = colsOf(f).hud, cap = CAPTION[v.phase]
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'
  if (v.frame < 30) {                                             // portrait cut-in on confirm
    const por = art(f, 'portrait.png'), u = v.frame / 30, al = Math.min(1, u / 0.15, (1 - u) / 0.25)
    if (ready(por)) { const ph = Math.round(ch * 0.36), pw = Math.round(ph * por.naturalWidth / por.naturalHeight), left = (f.facing ?? 1) >= 0
      c.globalAlpha = al; c.drawImage(por, (left ? cw * 0.06 : cw * 0.94 - pw) + (calm() ? 0 : (1 - Math.min(1, u / 0.2)) * (left ? -80 : 80)), ch * 0.22, pw, ph) }
  }
  if (cap) {
    c.globalAlpha = Math.min(1, (v.phase === 'impact' ? (v.frame - 166) : v.frame % 200) / 8, 1)
    c.font = `900 ${Math.round(Math.min(v.phase === 'impact' ? 44 : 30, cw / 26))}px Arial`
    c.fillStyle = '#05050a'; c.fillText(cap, cw / 2 + 2, ch * 0.16 + 2); c.fillStyle = v.phase === 'impact' ? hud1 : hud0; c.fillText(cap, cw / 2, ch * 0.16)
  }
  if (v.phase === 'impact' && v.frame < 172 && !calm()) { c.globalAlpha = (172 - v.frame) / 6 * 0.6; c.fillStyle = '#ffffff'; c.fillRect(0, 0, cw, ch) }
  c.restore()
}

// INTRO CARD — portrait + name + the support crew (three operator cells from the supplied robot pack, shown as the
// fleet's ground crew) while Batman's own intro plays. Presentation only; skip / rematch clear _introPlaying.
export function drawBatmanIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isBm(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 20) / 10)); if (al <= 0) return
  const name = batman.introTitle, [hud0, hud1] = colsOf(f).hud, por = art(f, 'portrait.png'), fleet = art(f, 'fleet.png')
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 28px Arial'
  const bw = c.measureText(name).width + 150, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 64
  c.fillStyle = 'rgba(10,10,16,0.86)'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = hud0; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.save(); c.beginPath(); c.rect(bx + 4, by + 4, 56, bh - 8); c.clip(); c.drawImage(por, bx + 4, by + 2, 56, 56 * por.naturalHeight / por.naturalWidth); c.restore() }
  c.fillStyle = '#f1f5f9'; c.shadowBlur = 14; c.shadowColor = hud1; c.fillText(name, cw / 2 + 30, by + bh / 2); c.shadowBlur = 0
  ;['crew_a', 'crew_b', 'crew_c'].forEach((r, i) => cell(c, fleet, FC[r], autoFrame(FC[r], k + i * 7), bx + bw + 40 + i * 46, by + bh, 0.45, false, 0, Math.min(1, Math.max(0, (k - 30 - i * 6) / 8))))
  c.font = 'bold 9px Arial'; c.fillStyle = hud1; c.fillText('SUPPORT FLEET ONLINE', bx + bw + 86, by - 6)
  c.restore()
}

const AFTER_DEFEAT_MUTE = /^(swing|kick|gadget|command|batarang|grapnel|op_|bomb|shot|cannon|beam|launch|bolt|ult|plane|capture|impact)/
export function playBatmanCues(f) {
  const q = f?._batman?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; const k = v.startsWith('op_') ? 'op' : v.startsWith('ult_') ? 'ultHit' : v; try { sound.play('batman_' + k) } catch (_) {} }
  q.length = 0
}
