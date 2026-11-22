// MSV1 — Ninja Storm Shane / Dustin RENDER layer (render-only: reads f._ninja, never writes GAME_STATE).
//   UNDER the body : the REAL body's ground shadow (THE TELL — the illusion has none), the ILLUSION body, shadow clones,
//                    burrow dust ripple, planted kunai traps, streak speed lines.
//   OVER the body  : smoke clouds (capped opacity), dome glints, shockwave rings, illusion counter FX, the illusion's
//                    visor glint (fixed 90-frame beat), text bubbles (intro / matchup / win lines).
//   HUD            : Ninja Power bar (slim, ranger colour, three notches) + REV pips / Mirror timer.
// The illusion is drawn from the SAME strips at the SAME scale as the real body (sprite.js math), so the only visible
// differences are the tell (no shadow, visor glint). Smoke drift / tilt / glints use the sim frame → identical on every
// peer, replay and companion screen; nothing here reads Math.random.
import { sound } from './sound.js'
import { isNinja, getNinjaProfile } from './ninja.js'
import { SHOTS } from './nsWindData.js'

const cache = new Map()
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = cache.get(src)
  if (!i) { i = new Image(); i.src = src; cache.set(src, i) }
  return i.complete && i.naturalWidth ? i : null
}
const isNs = f => f?.rosterKey === 'ns_red' || f?.rosterKey === 'ns_yellow'
const grounded = f => !!(f.onGround || f.grounded)
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

// draw one body pose from the fighter's own strips (sprite.js anchoring: feet on y+h, centred on x+w/2)
export function drawNinjaBody(c, f, pose, t, x, y, dir, { alpha = 1, tilt = 0 } = {}) {
  const def = f.animationData?.[pose] || f.animationData?.idle; if (!def) return
  const sheet = img(def.sheet); if (!sheet) return
  const frames = def.frames || 1, sp = Math.max(1, def.speed || 4)
  const k = Math.floor(Math.max(0, t) / sp), fi = def.loop ? k % frames : Math.min(frames - 1, k)
  const scale = f.spriteScale || 2.38, w = f.w || 60, h = f.h || 100
  const cx = x + w / 2, feet = y + h
  c.save()
  c.globalAlpha *= alpha
  c.imageSmoothingEnabled = false
  c.translate(cx, feet)
  if (tilt) c.rotate(tilt)
  c.scale(dir === -1 ? -scale : scale, scale)
  c.drawImage(sheet, fi * def.width, 0, def.width, def.height, -def.originX, -def.originY, def.width, def.height)
  c.restore()
}
function shadow(c, x, y, w, h, a = 0.32) {
  c.save(); c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(x + w / 2, y + h + 2, w * 0.55, 7, 0, 0, Math.PI * 2); c.fill(); c.restore()
}
function puffs(c, x, y, col, t, max, n = 7, spread = 46, alphaCap = 0.6) {
  c.save()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.07, r = spread * (0.5 + 0.5 * ((i * 37) % 11) / 11) * (1 + (max - t) / max * 0.4)
    c.globalAlpha = Math.min(alphaCap, 0.75 * (t / max))
    c.fillStyle = col
    c.beginPath(); c.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.45 - 20, 12 + ((i * 13) % 9), 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

// ── UNDER the body ──
export function drawNsWindUnder(c, f, frame = 0) {
  if (!isNs(f)) return
  const s = f._ninja, p = getNinjaProfile(f); if (!s || !p) return
  const w = f.w || 60, h = f.h || 100
  // planted kunai traps (a sheet kunai, point down, glints when armed)
  const kn = img(SHOTS.kunai.img)
  for (const tr of s.traps) {
    const gy = (f._rangerFloorY ?? (f.y + h))
    c.save(); c.translate(tr.x, gy - 4); c.rotate(Math.PI * 0.75); c.imageSmoothingEnabled = false
    if (kn) c.drawImage(kn, -10, -8, 20, 16); c.restore()
    if (tr.arm <= 0 && !tr.fired && (frame + tr.id * 17) % 60 < 6) { c.save(); c.fillStyle = '#fff'; c.fillRect(tr.x - 1, gy - 14, 2, 6); c.fillRect(tr.x - 3, gy - 12, 6, 2); c.restore() }
    if (tr.fired) puffs(c, tr.x, gy, 'rgba(214,190,150,1)', tr.fired, 16, 8, 40, 0.7)
  }
  // the REAL body's ground shadow (the illusion casts none — THE TELL)
  const hidden = s.burrow?.under || (f._ninjaHidden || 0) > 0
  if (!hidden) { const gy = (f._rangerFloorY != null ? f._rangerFloorY - h : f.y); shadow(c, f.x, gy, w, h, grounded(f) ? 0.34 : 0.2) }
  // burrow: a moving dust ripple shows his position (fair: visible to both)
  if (s.burrow?.under) {
    const gx = f.x + w / 2, gy = (f._rangerFloorY ?? (f.y + h))
    c.save()
    for (let i = 0; i < 5; i++) {
      const ph = (frame * 0.3 + i * 1.3) % 6
      c.fillStyle = `rgba(112,78,46,${0.9 - i * 0.1})`
      c.beginPath(); c.ellipse(gx + (i - 2) * 16, gy - 4 - Math.abs(Math.sin(ph)) * 9, 20, 9, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = 'rgba(70,48,28,0.8)'; c.fillRect(Math.round(gx + (i - 2) * 16 + Math.sin(ph * 2) * 8), Math.round(gy - 14 - Math.abs(Math.cos(ph)) * 10), 4, 4)
    }
    c.restore()
  }
  if (s.lastRipple) puffs(c, s.lastRipple.x, (f._rangerFloorY ?? (f.y + h)), 'rgba(170,130,90,1)', s.lastRipple.t, 10, 6, 34, 0.6)
  // streak speed lines (render-only)
  if (s.streak && s.streak.t >= 2) {
    c.save(); c.strokeStyle = rgba(p.color, 0.5); c.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      const yy = f.y + 14 + i * 13, len = 60 + ((i * 29 + frame * 7) % 50)
      c.beginPath(); c.moveTo(f.x + w / 2 - (s.streak.dir || 1) * 20, yy); c.lineTo(f.x + w / 2 - (s.streak.dir || 1) * (20 + len), yy); c.stroke()
    }
    c.restore()
  }
  // shadow clones (two precise copies; ±6° tilt render-only)
  for (const cl of s.clones) {
    if (cl.delay > 0) continue
    const a = cl.gone ? cl.gone / 10 : Math.min(1, cl.t / 6)
    drawNinjaBody(c, f, cl.pose, cl.t, cl.x, cl.y, cl.dir, { alpha: 0.92 * a, tilt: cl.tilt * 6 * Math.PI / 180 })
    if (cl.gone || cl.t < 6) puffs(c, cl.x + w / 2, cl.y + h, p.smoke, cl.gone || 6 - cl.t, 10, 6, 40, 0.6)
  }
  // the ILLUSION — same strips, same scale; NO shadow
  const m = s.mirror
  if (m) {
    drawNinjaBody(c, f, m.pose, m.poseT, m.x, m.y, m.dir)
    if (m.popT > 0) puffs(c, m.x + w / 2, m.y + h, p.smoke, m.popT, 10, 8, 50, 0.6)
  }
  if (s.lastMirror) puffs(c, s.lastMirror.x + w / 2, s.lastMirror.y + h, p.smoke, s.lastMirror.t, 12, 8, 52, 0.6)
}

// ── OVER the body ──
const BUBBLE = { intro: 'Ninja Storm, Ranger Form! Ha!' }
export function nsWindLine(f, opp, kind) {
  const k = f?.rosterKey, o = opp?.rosterKey
  if (kind === 'intro') {
    if (k === 'ns_red' && o === 'ns_yellow') return 'Keep up, Dustin.'
    if (k === 'ns_yellow' && o === 'ns_red') return 'Dude, I was born ready!'
    if (k === 'ns_red' && o === 'spd_red') return "Space Patrol, huh? Let's see who's faster."
    return BUBBLE.intro
  }
  if (kind === 'win') return k === 'ns_red' ? 'Air ninjas rule.' : 'Earth power, dude!'
  return null
}
function bubble(c, x, y, text, col) {
  c.save()
  c.font = 'bold 13px sans-serif'
  const w = Math.ceil(c.measureText(text).width) + 16, h = 24
  const bx = Math.round(x - w / 2), by = Math.round(y - h - 12)
  c.fillStyle = '#ffffff'; c.strokeStyle = col; c.lineWidth = 2
  c.beginPath(); c.roundRect ? c.roundRect(bx, by, w, h, 8) : c.rect(bx, by, w, h); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(x - 6, by + h); c.lineTo(x, by + h + 9); c.lineTo(x + 6, by + h); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, by + h / 2 + 1)
  c.restore()
}
export function drawNsWindFx(c, f, opp, frame = 0) {
  if (!isNs(f)) return
  const s = f._ninja, p = getNinjaProfile(f); if (!s || !p) return
  const w = f.w || 60, h = f.h || 100
  // smoke vanish: the cloud stays ~0.5 s where he left (capped opacity), then the reappear puff
  if (s.vanish) {
    const V = p.vanish, v = s.vanish
    puffs(c, v.x0 + w / 2, v.y0 + h, p.smoke, Math.max(1, V.cloud - v.t), V.cloud, 9, 54, 0.6)
    if (v.t >= V.pop + V.gone - 1) puffs(c, v.tx + w / 2, v.ty + h, p.smoke, V.pop + V.gone + V.fade - v.t, V.fade, 7, 40, 0.55)
  }
  if (s.swap) { puffs(c, s.swap.fx + w / 2, s.swap.fy + h, p.smoke, 6 - s.swap.t, 6, 7, 44, 0.65); puffs(c, s.swap.ix + w / 2, s.swap.iy + h, p.smoke, 6 - s.swap.t, 6, 7, 44, 0.65) }
  // THE TELL (visible to both): the illusion's visor glints on a fixed beat every 90 frames
  const m = s.mirror
  if (m) {
    const beat = (p.mirror.frames - m.t) % p.mirror.glintEvery
    if (beat < 5) {
      const gx = m.x + w / 2 + m.dir * 7, gy = m.y + h - 0.86 * 47 * (f.spriteScale || 2.38) + 10, r = 3 + (beat < 3 ? beat : 5 - beat) * 2
      c.save(); c.fillStyle = 'rgba(255,255,255,0.95)'
      c.beginPath(); c.moveTo(gx, gy - r * 2); c.lineTo(gx + 1.5, gy); c.lineTo(gx, gy + r * 2); c.lineTo(gx - 1.5, gy); c.fill()
      c.beginPath(); c.moveTo(gx - r * 2, gy); c.lineTo(gx, gy + 1.5); c.lineTo(gx + r * 2, gy); c.lineTo(gx, gy - 1.5); c.fill(); c.restore()
    }
  }
  // shockwave rings (Ground Pound, Rock Hold counter, eruptions)
  if (s.lastShock) {
    const k = 1 - s.lastShock.t / 14
    c.save(); c.strokeStyle = `rgba(230,205,160,${0.8 * (1 - k)})`; c.lineWidth = 4
    c.beginPath(); c.ellipse(s.lastShock.x, s.lastShock.y - 2, 20 + s.lastShock.reach * k, 10 + 8 * k, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
  // the illusion's COUNTER on the attacker (Shane: mini Air Ninja Tornado; Dustin: an eruption under them)
  if (s.counter && opp) {
    const k = s.counter
    if (k.kind === 'tornado') drawNinjaBody(c, f, 'tornado', k.t, opp.x, opp.y, k.dir)
    else { drawNinjaBody(c, f, k.t < 8 ? 'crouch' : 'risingKick', k.t, opp.x - 10, (f._rangerFloorY ?? (opp.y + h)) - h, k.dir); puffs(c, opp.x + w / 2, (f._rangerFloorY ?? (opp.y + h)), 'rgba(170,130,90,1)', Math.max(1, 14 - k.t), 14, 8, 50, 0.7) }
  }
  // text bubbles: intro (morph call / matchup line) and win line
  if (f._introPlaying) bubble(c, f.x + w / 2, f.y, nsWindLine(f, opp, 'intro'), p.color)
  else if (f._forceAction === 'win') bubble(c, f.x + w / 2, f.y, nsWindLine(f, opp, 'win'), p.color)
}

// ── HUD: Ninja Power under the health bar (ranger colour, notches at 25/50/75) + REV pips + Mirror timer ──
export function drawNsWindHud(ctx, f, { x, hpY, barH, pbw, flip }) {
  if (!isNs(f) || !f._ninja) return
  const s = f._ninja, p = getNinjaProfile(f)
  const bw = Math.max(80, (pbw || 200) - 16), bx = flip ? x + (pbw || 200) - bw - 8 : x + 8, by = (hpY || 0) + (barH || 14) + 3, bh = 5
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2)
  const v = Math.max(0, Math.min(1, s.np / p.np.max))
  ctx.fillStyle = p.color; if (flip) ctx.fillRect(bx + bw * (1 - v), by, bw * v, bh); else ctx.fillRect(bx, by, bw * v, bh)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(Math.round(bx + bw * q), by - 1, 1, bh + 2)
  ctx.font = 'bold 9px sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = flip ? 'right' : 'left'
  let label = 'NINJA ' + Math.floor(s.np)
  if (s.mirror) label += `  MIRROR ${Math.ceil(s.mirror.t / 60)}s · swaps ${p.mirror.maxSwaps - s.mirror.swaps}`
  ctx.fillStyle = '#fff'; ctx.fillText(label, flip ? bx + bw : bx, by + bh + 2)
  if (p.rev) for (let i = 0; i < p.rev.max; i++) {
    const px = flip ? bx + bw - 120 - i * 10 : bx + 120 + i * 10
    ctx.fillStyle = i < s.rev.pips ? p.color : 'rgba(255,255,255,0.25)'; ctx.fillRect(px, by + bh + 3, 7, 7)
  }
  ctx.restore()
}

// ── SOUND cues (sim queues on f._ninja.cues; played here as nswind_<cue>) ──
export function playNsWindCues(f) {
  const q = f?._ninja?.cues; if (!q?.length || !isNs(f)) return
  const pre = f.rosterKey === 'ns_red' ? 'nswind_hi_' : 'nswind_lo_'
  for (const v of q) { try { sound.play(pre + v) } catch (_) {} }
  q.length = 0
}
export { isNinja }
