// Invincible — Mark Grayson (invincible) — PRESENTATION ONLY: the sheet's effect strips (takeoff ring, streaks, sonic rings,
// impact bursts, zip streak / rings, afterimage, big burst), Terminal Velocity's star glint + landing marker + crack decal,
// the RESOLVE aura, bubbles, the HUD tags and sound cues. Reads f._inv (sim state); writes nothing the sim reads.
// Colours of the effect strips follow the equipped skin's premade effect sheets (invincibleSkins.js) when it has them.
import { sound } from './sound.js'
import { camera } from './camera.js'
import { INVINCIBLE_FX } from './invincibleSprites.js'
import { INV_KEY, TV, CSD, ZIP, TOP } from './invincibleData.js'
import { isFlying, hashRandom } from './flight.js'
import { INV_VOICE } from './invincibleVoice.js'
import { invSkinFx, invSkinPal, invSkinPhaseTick } from './invincibleSkins.js'

const isInv = f => f?.rosterKey === INV_KEY
const IMG = {}
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = IMG[src]
  if (!i) { i = IMG[src] = new Image(); try { i.src = src } catch (_) {} }
  return i
}
const ready = i => !!(i && i.complete !== false && (i.naturalWidth || i.width))
const ctrX = f => f.x + f.w / 2, ctrY = f => f.y + f.h / 2
const SCALE = 3

// frame k of the sheet effect strip `key`, centred (or bottom-anchored), mirrored with the travel direction
function fx(c, f, key, k, x, y, { scale = SCALE, alpha = 1, dir = 1, ang = 0, add = false, bottom = false } = {}) {
  const d = INVINCIBLE_FX?.[key]; if (!d) return false
  const im = img(invSkinFx(f, key) || d.sheet); if (!ready(im)) return false
  const i = Math.max(0, Math.min(d.n - 1, k | 0)), w = d.w * scale, h = d.h * scale
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false; if (add) c.globalCompositeOperation = 'lighter'
  c.translate(Math.round(x), Math.round(y)); c.rotate(ang); c.scale(dir, 1)
  c.drawImage(im, i * d.w, 0, d.w, d.h, -Math.round(w / 2), bottom || d.anchor === 'bottom' ? -Math.round(h) : -Math.round(h / 2), Math.round(w), Math.round(h))
  c.restore(); return true
}
function ring(c, x, y, r, col, a = 1, lw = 2) { c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.stroke(); c.restore() }
function disc(c, x, y, r, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.fill(); c.restore() }
function star(c, x, y, r, col, a = 1) {
  c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath()
  for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? r * 0.22 : r; c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr) }
  c.closePath(); c.fill(); c.restore()
}
function bubble(c, text, cx, top, a = 1, ink = '#14306e') {
  c.save(); c.globalAlpha = a; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const w = Math.min(320, c.measureText(text).width + 20), h = 26, x = cx - w / 2, y = top - h
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.strokeStyle = ink; c.lineWidth = 2
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 8) : c.rect(x, y, w, h); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(cx - 6, y + h); c.lineTo(cx, y + h + 8); c.lineTo(cx + 6, y + h); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = '#0b1a3a'; c.fillText(text, cx, y + h / 2, w - 12); c.restore()
}

// ── world-space effects (drawn with the fighter) ──
export function drawInvFx(c, f) {
  if (!isInv(f) || !f._inv) return
  const s = f._inv, t = s.clock, P = invSkinPal(f)
  invSkinPhaseTick(f, t)
  // crack decals (Terminal Velocity), fading over 10 s
  for (const d of s.decal) {
    const a = Math.max(0, 1 - d.t / TV.crackLife)
    c.save(); c.globalAlpha = 0.8 * a; c.strokeStyle = '#1c1820'; c.lineWidth = 3
    for (let k = 0; k < 7; k++) {
      const ang = Math.PI + (k + 0.5) * Math.PI / 7, len = 40 + ((k * 37) % 50)
      c.beginPath(); c.moveTo(d.x, d.y - 1); c.lineTo(d.x + Math.cos(ang) * len, d.y - 1 + Math.sin(ang) * len * 0.15); c.stroke()
    }
    c.fillStyle = 'rgba(20,16,24,0.55)'; c.beginPath(); c.ellipse(d.x, d.y, 70, 9, 0, 0, Math.PI * 2); c.fill(); c.restore()
  }
  // RESOLVE: a thin gold aura that breathes while it lasts
  if (s.resolve > 0) {
    const a = (0.35 + 0.2 * Math.sin(t * 0.3)) * Math.min(1, s.resolve / 30)
    c.save(); c.globalAlpha = a; c.strokeStyle = P.resolve; c.lineWidth = 2
    c.beginPath(); c.ellipse(ctrX(f), ctrY(f), f.w * 0.8, f.h * 0.62, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
  // flight: horizontal streak at cruise speed (the R1 horizontal streak strip)
  const sp = Math.hypot(f.vx || 0, f.vy || 0)
  if (isFlying(f) && sp > TOP * 0.5) fx(c, f, 'hStreak', (t >> 2) & 1, ctrX(f) - Math.sign(f.vx || 1) * 50, ctrY(f), { dir: (f.vx || 0) >= 0 ? 1 : -1, alpha: Math.min(1, sp / TOP) })
  // Terminal Velocity: star glint in the sky + the landing marker on the floor (both players see it)
  const tv = s.tv
  if (tv && (tv.phase === 'aim' || tv.phase === 'fall') && tv.x != null) {
    const floor = tv.floor ?? (f.y + f.h)
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.5)
    star(c, tv.x, 40, 10 + 4 * pulse, '#ffffff', 0.9); ring(c, tv.x, 40, 16 * pulse, P.trail, 0.6)
    c.save(); c.globalAlpha = 0.85; c.strokeStyle = P.marker; c.lineWidth = 3
    c.beginPath(); c.ellipse(tv.x, floor - 2, 128 * 0.5 + 10 * pulse, 10, 0, 0, Math.PI * 2); c.stroke()
    c.setLineDash([6, 6]); c.globalAlpha = 0.35; c.beginPath(); c.moveTo(tv.x, 60); c.lineTo(tv.x, floor - 6); c.stroke(); c.restore()
    if (tv.phase === 'fall') {
      c.save(); c.globalAlpha = 0.9; const k = (tv.t - TV.takeoff - TV.aim) / TV.fall, y = 40 + (floor - 40) * Math.min(1, k)
      const g = c.createLinearGradient ? c.createLinearGradient(tv.x, y - 220, tv.x, y) : null
      if (g) { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, P.trail); g.addColorStop(1, P.suit) }
      c.fillStyle = g || P.trail; c.fillRect(tv.x - 9, y - 220, 18, 220); c.restore()
    }
  }
  // hints
  for (const h of s.fx) {
    const k = h.t, a = Math.max(0, 1 - k / 24)
    switch (h.kind) {
      case 'takeoff': case 'land': fx(c, f, 'takeoffRing', 0, h.x, h.y, { alpha: a, bottom: true }); ring(c, h.x, h.y - 4, 18 + k * 5, '#ffffff', a * 0.6, 2); break
      case 'vstreak': if (k < 8) fx(c, f, 'vStreak', k >> 2, h.x, h.y - (h.down ? 0 : 60), { alpha: 1 - k / 8, scale: 2 }); break
      case 'boom': for (let i = 0; i < 3; i++) fx(c, f, 'sonicRing', Math.min(2, (k >> 2) + i), h.x - h.dir * i * 26, h.y, { alpha: a, dir: h.dir, scale: 2 + k * 0.05 }); break
      case 'trail': if (k < 6) fx(c, f, 'hStreak', k & 1, h.x - h.dir * 40, h.y, { alpha: 1 - k / 6, dir: h.dir }); break
      case 'spark': if (k < 10) fx(c, f, 'impact', Math.min(2, k >> 2), h.x, h.y, { alpha: 1 - k / 10, dir: h.dir, scale: 1.5 }); break
      case 'impact': case 'impactBig': if (k < 14) fx(c, f, 'impact', Math.min(2, k >> 2), h.x, h.y, { alpha: 1 - k / 14, dir: h.dir, scale: h.big || h.kind === 'impactBig' ? 3 : 2 }); break
      case 'burst': if (k < 16) fx(c, f, 'bigBurst', Math.min(3, k >> 2), h.x, h.y, { alpha: 1 - k / 16, dir: h.dir, scale: 2.5, add: true }); break
      case 'ring': if (k < 12) fx(c, f, 'zipRing', Math.min(2, k >> 2), h.x, h.y, { alpha: 1 - k / 12, dir: h.dir, scale: 2 }); break
      case 'block': if (k < 10) ring(c, h.x, h.y, 10 + k * 3, '#bfe3ff', 1 - k / 10, 3); break
      case 'stopped': if (k < 20) ring(c, h.x, h.y, 22 + k, '#e8f4ff', 1 - k / 20, 1.5); break
      case 'zipFrom': if (k < 10) { fx(c, f, 'ghost', 0, h.x, h.y, { alpha: 0.6 * (1 - k / 10), bottom: true }); fx(c, f, 'zipStreak', k & 1, h.x + h.dir * 60, h.y - 60, { alpha: 1 - k / 10, dir: h.dir, scale: 2.5 }) } break
      case 'zipTo': if (k < 10) fx(c, f, 'zipRing', Math.min(2, k >> 2), h.x, h.y - 60, { alpha: 1 - k / 10, dir: h.dir, scale: 2 }); break
      case 'ghost': if (k < 12) fx(c, f, 'ghost', 0, h.x, h.y, { alpha: 0.55 * (1 - k / 12), bottom: true }); break
      case 'tvImpact': if (k < 30) { fx(c, f, 'bigBurst', Math.min(3, k >> 3), h.x, h.y - 80, { alpha: 1 - k / 30, scale: 4, add: true }); ring(c, h.x, h.y - 6, 30 + k * 14, '#ffffff', 1 - k / 30, 4) } break
      case 'csd': if (k < 30) ring(c, h.x, h.y - 40, 20 + k * 2, P.resolve, 1 - k / 30, 2); break
      case 'resolve': if (k < 20) { ring(c, h.x, h.y, 24 + k * 4, P.resolve, 1 - k / 20, 3); disc(c, h.x, h.y, 30, P.resolve, 0.15 * (1 - k / 20)) } break
    }
  }
  // speech bubble over his head
  if (s.say) bubble(c, s.say.text, ctrX(f), f.y - 14, Math.min(1, s.say.t / 20))
}

// ── HUD: RESOLVE / CAN'T STAY DOWN / zip charges under the health bar ──
export function invHudLabel(f) {
  const s = f?._inv; if (!s) return null
  const g = !!(f.onGround || f.grounded) && !isFlying(f)
  return { resolve: s.resolve, csdUsed: !!s.csd.used, zip: g ? s.zip.ground : s.zip.air, zipMax: g ? ZIP.groundCharges : ZIP.airCharges,
    flying: !!isFlying(f), noBlock: !!f._invNoBlock, tv: s.tv ? s.tv.phase : null }
}
export function drawInvHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, pad = 14
  const one = (f, flip) => {
    if (!isInv(f) || !f._inv) return
    const L = invHudLabel(f), x0 = flip ? cw - pad - 98 : pad + 78, y0 = 66, tags = []
    if (L.resolve > 0) tags.push(['RESOLVE ' + (L.resolve / 60).toFixed(1) + 's', '#ffd84a'])
    else tags.push(L.csdUsed ? ["CAN'T STAY DOWN — USED", 'rgba(255,255,255,0.4)'] : ["CAN'T STAY DOWN", '#bfe3ff'])
    tags.push(['ZIP ' + '●'.repeat(L.zip) + '○'.repeat(Math.max(0, L.zipMax - L.zip)), '#e8f0ff'])
    if (L.noBlock) tags.push(['NO GUARD (SPEED)', '#ff8a6a'])
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    let tx = flip ? x0 + 98 : x0
    for (const [txt, col] of tags) { c.fillStyle = col; c.fillText(txt, tx, y0); const tw = c.measureText ? c.measureText(txt).width : txt.length * 6; tx += (flip ? -1 : 1) * (tw + 10) }
    c.restore()
  }
  one(p1, false); one(p2, true)
}

// ── sounds: a small WebAudio synth (lighter / higher than Omni-Man: he is the faster, lighter Viltrumite) ──
function synth(kind) {
  const ctx = sound._ctx, out = sound._master
  if (!ctx || !out || sound._sfxMuted || !sound._ready) return
  const now = ctx.currentTime
  const tone = (type, f0, f1, dur, vol, at = 0) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type
    o.frequency.setValueAtTime(f0, now + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + at + dur)
    g.gain.setValueAtTime(vol, now + at); g.gain.exponentialRampToValueAtTime(0.001, now + at + dur)
    o.connect(g); g.connect(out); o.start(now + at); o.stop(now + at + dur + 0.02)
  }
  const noise = (dur, vol, hp, at = 0) => {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0)
    let x = 24681; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = (x / 0x3fffffff - 1) * (1 - i / n) }   // seeded (audio-only)
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = b; fl.type = hp > 0 ? 'highpass' : 'lowpass'; fl.frequency.value = Math.abs(hp); g.gain.value = vol
    src.connect(fl); fl.connect(g); g.connect(out); src.start(now + at)
  }
  switch (kind) {
    case 'tap': noise(0.05, 0.14, 2500); tone('square', 420, 200, 0.05, 0.06); break                         // barrage / jab
    case 'thud': noise(0.12, 0.22, -1600); tone('sine', 160, 70, 0.12, 0.18); break                           // heavy hit
    case 'crack': noise(0.18, 0.3, 1200); tone('sawtooth', 900, 120, 0.16, 0.12); tone('sine', 110, 40, 0.3, 0.25, 0.02); break   // Invincible Punch
    case 'whoosh': noise(0.25, 0.16, 1800); break                                                              // takeoff / zip
    case 'zip': noise(0.08, 0.15, 4000); tone('sine', 1400, 2600, 0.08, 0.05); break
    case 'boom': noise(0.5, 0.32, -700); tone('sine', 95, 35, 0.5, 0.3); break                                 // sonic boom
    case 'rise': tone('sine', 420, 2200, 1.05, 0.05); tone('sine', 630, 3300, 1.05, 0.025); break               // Terminal Velocity aim: the whistle RISES while the star glints
    case 'whistle': tone('sine', 2200, 3600, 0.14, 0.09); break                                               // … and peaks on the way down
    case 'quake': noise(1.0, 0.42, -500); tone('sine', 60, 25, 1.0, 0.4); break                                // Terminal Velocity impact
    case 'resolve': tone('triangle', 330, 660, 0.35, 0.12); tone('triangle', 495, 990, 0.35, 0.08, 0.05); break
  }
}
const SFX = {
  kJab: () => synth('tap'), barrageHit: () => synth('tap'), barrageLast: () => synth('thud'),
  kIPunch: () => synth('whoosh'), ipunchHit: () => { synth('crack'); camera.shake(6, 8) }, wallBounce: () => { synth('thud'); camera.shake(5, 8) },
  kSkyward: () => synth('whoosh'), skywardRise: () => synth('thud'), flyOn: () => synth('whoosh'),
  zip: () => synth('zip'), takeoff: () => synth('whoosh'), boom: () => { synth('boom'); camera.shake(3, 5) },
  crashLand: () => { synth('thud'); camera.shake(5, 8) }, nhbHit: () => synth('thud'), nhbLast: () => { synth('crack'); camera.shake(6, 10) },
  tvTakeoff: () => synth('whoosh'), tvAim: () => synth('rise'), tvFall: () => synth('whistle'), tvWhiff: () => synth('thud'), stopped: () => synth('tap'), tvImpact: () => { synth('quake'); camera.shake(TV.shake[0], TV.shake[1]) },
  csd: () => synth('resolve'), resolve: () => synth('resolve'),
}
// ── VOICE (audio-only): Mark's own clips (invincibleVoice.js, from "Invincible VS Invincible Voice Lines + Efforts").
// One voice channel per fighter (sound.playSfxFile owner): a line only cuts a playing one of LOWER priority, so a jab
// grunt never cuts Terminal Velocity's call or the win quote. Clip choice and "sometimes" rolls come from his sim clock
// (hashRandom, no RNG); nothing here is read by the sim.
const VO = new WeakMap()
const PRIO = { effort: 1, effortHeavy: 1, hurt: 2, bark: 2, hurtBig: 3, shout: 3, nhbLast: 3, ipunch: 4, nhb: 4, notYet: 5, super: 5, intro: 5, introOmni: 5, win: 6, ko: 6 }
const voOf = f => { let m = VO.get(f); if (!m) { m = { at: {}, until: -1, prio: 0, n: 0, hp: null, ko: false, intro: false, seen: -1 }; VO.set(f, m) } return m }
function vo(f, pool, o = {}) {
  const L = INV_VOICE[pool]; if (!L || !L.length || !f) return
  const s = f._inv, t = s?.clock || 0, m = voOf(f), pr = PRIO[pool] || 1
  if (o.cd && t - (m.at[pool] ?? -1e9) < o.cd) return
  if (o.chance != null && hashRandom(t + m.n, s?.serial || 0, pool.length) > o.chance) return
  if (t < m.until && pr < m.prio) return                                   // something more important is still talking
  m.at[pool] = t; m.n++
  const [file, , dur] = o.pick != null ? L[o.pick % L.length] : L[Math.abs((t * 7 + (s?.serial || 0) * 13 + m.n * 5) | 0) % L.length]
  m.until = t + Math.ceil((dur || 1) * 60); m.prio = pr
  try { sound.playSfxFile?.(file, null, { owner: f, fadeMs: 40 }) } catch (_) {}
}
// every frame: the round intro (vs anyone but Omni-Man; vs Omni-Man the introVoice cue plays "Dad"), hurt / KO from health
function voTick(f) {
  const s = f._inv; if (!s) return
  const m = voOf(f), t = s.clock || 0, hp = f.health
  if (t < m.seen) { m.until = -1; m.prio = 0; m.at = {}; m.hp = null }   // his clock restarts every round (the intro line stays once per match)
  m.seen = t
  if (!m.intro && s.said?.intro) { m.intro = true; if (!(s.cues || []).some(c => c === 'introVoice')) vo(f, 'intro') }
  if (m.hp == null || hp > m.hp) { m.hp = hp; if (hp > 0) m.ko = false; return }
  const lost = m.hp - hp; m.hp = hp
  if (hp <= 0) { if (!m.ko) { m.ko = true; vo(f, 'ko') } return }
  if (lost <= 0) return
  if (lost >= 90 || f.knockdownState) vo(f, 'hurtBig', { cd: 40 })
  else vo(f, 'hurt', { cd: 22 })
}
const VOICE = {
  introVoice: f => vo(f, 'introOmni', { pick: 0 }), winVoice: f => vo(f, 'win', { pick: 0 }), csd: f => vo(f, 'notYet', { pick: 0 }),
  kJab: f => vo(f, 'effort', { cd: 12, chance: 0.6 }), kSweep: f => vo(f, 'effort', { cd: 12, chance: 0.7 }), kFpunch: f => vo(f, 'effort', { cd: 12, chance: 0.7 }),
  kBarrage: f => vo(f, 'effort', { cd: 12 }), kStraight: f => vo(f, 'effortHeavy', { cd: 18, chance: 0.8 }), kUpper: f => vo(f, 'effortHeavy', { cd: 18 }),
  kSpin: f => vo(f, 'effortHeavy', { cd: 18 }), kRise: f => vo(f, 'effortHeavy', { cd: 18 }), kSkyward: f => vo(f, 'effortHeavy'), kCrash: f => vo(f, 'effortHeavy'),
  kIPunch: f => vo(f, 'ipunch'), kNHB: f => vo(f, 'nhb'), nhbLast: f => vo(f, 'nhbLast'), kTV: f => vo(f, 'super'),
  ipunchHit: f => vo(f, 'shout', { cd: 240, chance: 0.5 }), wallBounce: f => vo(f, 'shout', { cd: 240, chance: 0.5 }),
  zip: f => vo(f, 'bark', { cd: 600, chance: 0.25 }), takeoff: f => vo(f, 'bark', { cd: 600, chance: 0.25 }),
}
export const invSfxKeys = () => Object.keys(SFX)   // test-only listing (harness/invincible.test.mjs)
export function playInvCues(f) {
  try { voTick(f) } catch (_) {}
  const q = f?._inv?.cues; if (!q?.length) return
  for (const v of q) { const k = typeof v === 'string' ? v : v.c; try { if (SFX[k]) SFX[k](f, v) } catch (_) {}; try { if (VOICE[k]) VOICE[k](f, v) } catch (_) {} }
  q.length = 0
}
export { CSD }
