// Omni-Man — Viltrumite (omniman_viltrum) — PRESENTATION ONLY: speed lines, the R13 pink afterimage trail, the R13 white
// sonic-boom bars, crash / landing bursts, bubbles, HUD speed meter, the Escape Velocity sky (stage → deep blue → space →
// planet horizon → back), re-entry glow, crater decal, and sound cues. Reads f._omv / flight state (sim); writes nothing
// the sim reads. Star positions = hashRandom(matchSeed, i) (deterministic: every machine draws the same sky).
import { sound } from './sound.js'
import { OMNIMAN_VILTRUM_FX, OMNIMAN_VILTRUM_ICONS } from './omnimanViltrumSprites.js'
import { OMV_KEY, TOP, FLIGHT, ESCAPE } from './omnimanViltrumData.js'
import { hashRandom, isFlying } from './flight.js'
import { HOMELANDER_SFX } from './homelander_sfx_map.js'
import { omvSkinFx, omvSkinPal, omvSkinIcon, omvSkinPhaseTick } from './omnimanViltrumSkins.js'

const isOmv = f => f?.rosterKey === OMV_KEY
const IMG = {}
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = IMG[src]
  if (!i) { i = IMG[src] = new Image(); try { i.src = src } catch (_) {} }
  return i
}
const ready = i => !!(i && i.complete !== false && (i.naturalWidth || i.width))
const ctrX = f => f.x + f.w / 2, ctrY = f => f.y + f.h / 2
const spd = f => Math.hypot(f.vx || 0, f.vy || 0)

// an fx strip cell (the skin's premade variant of fx/<key>.png), bottom-centre anchored, mirrored with dir
function fxCell(c, f, key, i, x, y, { scale = 2, alpha = 1, dir = 1 } = {}) {
  const d = OMNIMAN_VILTRUM_FX?.[key]; if (!d) return false
  const im = img(omvSkinFx(f, key) || d.sheet); if (!ready(im)) return false
  const k = Math.max(0, Math.min(d.frames - 1, i | 0)), w = d.w * scale, h = d.h * scale
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false
  c.translate(Math.round(x), Math.round(y)); c.scale(dir, 1)
  c.drawImage(im, k * d.w, 0, d.w, d.h, -Math.round(w / 2), -Math.round(h), Math.round(w), Math.round(h))
  c.restore(); return true
}
function ring(c, x, y, r, col, a = 1, lw = 2) { c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.stroke(); c.restore() }
function bubble(c, text, cx, top, a = 1, big = false) {
  c.save(); c.globalAlpha = a; c.font = big ? 'bold 22px sans-serif' : 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const w = Math.min(big ? 360 : 340, c.measureText(text).width + 22), h = big ? 38 : 26, x = cx - w / 2, y = top - h
  c.fillStyle = 'rgba(255,255,255,0.96)'; c.strokeStyle = '#3a0a10'; c.lineWidth = big ? 3 : 2
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 8) : c.rect(x, y, w, h); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(cx - 6, y + h); c.lineTo(cx, y + h + 9); c.lineTo(cx + 6, y + h); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = big ? '#b00010' : '#1a0508'; c.fillText(text, cx, y + h / 2, w - 12); c.restore()
}

// ── world-space effects (drawn with the fighter) ──
export function drawOmvFx(c, f) {
  if (!isOmv(f) || !f._omv) return
  const s = f._omv, t = s.clock, P = omvSkinPal(f), v = spd(f), frac = Math.min(1, v / TOP)
  omvSkinPhaseTick(f, t)   // glitter skins: pre-baked glint phase from the SIM clock
  const fly = !!(f._flightCtl && isFlying(f)) || !!s.rush
  // SPEED LINES + the R13 pink AFTERIMAGE trail behind him (render-only; position history comes from velocity)
  if (fly && frac > 0.35) {
    const ux = (f.vx || 0) / (v || 1), uy = (f.vy || 0) / (v || 1)
    c.save(); c.strokeStyle = P.streak; c.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const r = hashRandom(i + 11, t >> 1, f.side === 'p2' ? 2 : 1), off = (r - 0.5) * f.h * 0.9, len = 40 + 120 * frac * (0.5 + r)
      const bx = ctrX(f) - ux * (30 + 40 * r) - uy * off, by = ctrY(f) - uy * (30 + 40 * r) + ux * off
      c.globalAlpha = 0.25 + 0.45 * frac; c.lineWidth = 1 + 2 * r
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - ux * len, by - uy * len); c.stroke()
    }
    c.restore()
    if (frac > 0.6) for (let k = 1; k <= 3; k++) fxCell(c, f, 'afterimage', 0, ctrX(f) - (f.vx || 0) * k * 0.9, f.y + f.h - (f.vy || 0) * k * 0.9, { alpha: (0.5 - k * 0.12) * frac, dir: f.facing || 1 })
  }
  // BRAKE: cape-wind puffs ahead of him
  if (f._flightBrake && v > 2) { for (let i = 0; i < 3; i++) ring(c, ctrX(f) + Math.sign(f.vx || 1) * (30 + i * 10), ctrY(f), 6 + i * 4 + (t % 6), P.boom, 0.35) }
  // hints: booms, crashes, landings, impacts (age-driven, render-only)
  for (const h of s.fx) {
    const a = 1 - h.t / 30
    if (a <= 0) continue
    switch (h.kind) {
      case 'boom': case 'arrive': case 'takeoff': {
        const fr = Math.min(2, Math.floor(h.t / 4))
        if (!fxCell(c, f, 'boom', fr, h.x - 10, h.y + 50, { alpha: a, scale: 2 })) ring(c, h.x, h.y, 20 + h.t * 4, '#fff', a, 3)
        fxCell(c, f, 'boom', Math.min(2, fr + 1), h.x + 12, h.y + 46, { alpha: a * 0.8, scale: 1.6, dir: -1 })
        ring(c, h.x, h.y, 14 + h.t * (h.kind === 'boom' ? 6 : 3), P.boom, a * 0.8, h.kind === 'boom' ? 4 : 2)
        break
      }
      case 'crash': case 'wallSplat': ring(c, h.x, h.y, 10 + h.t * 3, '#ffffff', a, 3); ring(c, h.x, h.y, 4 + h.t * 2, '#d4141c', a, 2); break
      case 'landBurst': case 'landHit': {
        c.save(); c.globalAlpha = a; c.fillStyle = P.dust
        c.beginPath(); c.ellipse(h.x, h.y, 30 + h.t * 6, 6 + h.t * 0.6, 0, 0, Math.PI * 2); c.fill(); c.restore()
        ring(c, h.x, h.y - 8, 10 + h.t * 5, '#ffffff', a * 0.7, 3)
        break
      }
      case 'impact': case 'impactBig': case 'boomHit': case 'hit': {
        const big = h.kind === 'impactBig' || (h.frac || 0) > 0.5
        ring(c, h.x, h.y, (big ? 10 : 6) + h.t * (big ? 3.5 : 2), '#ffffff', a, big ? 3 : 2)
        if (big) { c.save(); c.globalAlpha = a * 0.8; c.strokeStyle = '#ffd0d0'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const an = i * 1.047 + (h.x % 7); c.beginPath(); c.moveTo(h.x + Math.cos(an) * 8, h.y + Math.sin(an) * 8); c.lineTo(h.x + Math.cos(an) * (18 + h.t * 3), h.y + Math.sin(an) * (18 + h.t * 3)); c.stroke() } c.restore() }
        break
      }
      case 'block': ring(c, h.x, h.y, 8 + h.t, '#9fd0ff', a, 2); break
    }
  }
  drawEvWorld(c, f, s)
  // speech bubble (THINK! / orbit line / win)
  if (s.say?.text) bubble(c, s.say.text, ctrX(f), f.y - 18, Math.min(1, s.say.t / 20), !!s.say.big)
}

// ── HUD: speed meter under his health bar (% of top speed, BRAKE / COMMITTED tags, Unimpressed cooldown) ──
export function omvHudLabel(f) {
  const s = f?._omv; if (!s) return null
  const v = spd(f), fly = !!(f._flightCtl && isFlying(f))
  return { speed: Math.round(100 * Math.min(1, v / TOP)), flying: fly, brake: !!f._flightBrake, committed: fly && v / TOP > FLIGHT.blockMax,
    unimpCd: s.cd.unimp, crash: s.crash, land: s.land }
}
export function drawOmvHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, pad = 14
  const one = (f, flip) => {
    if (!isOmv(f) || !f._omv) return
    const L = omvHudLabel(f), w = 120, x0 = flip ? cw - pad - 78 - w : pad + 78, y0 = 64
    c.save()
    const ic = img(omvSkinIcon(f, 1)); if (ready(ic)) { c.imageSmoothingEnabled = false; c.drawImage(ic, flip ? x0 + w + 4 : x0 - 20, y0 - 4, 15, 19) }
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x0, y0, w, 6)
    c.fillStyle = L.speed >= 90 ? '#ffffff' : L.speed >= 70 ? '#ffb0b0' : '#d4141c'; c.fillRect(flip ? x0 + w - w * L.speed / 100 : x0, y0, w * L.speed / 100, 6)
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x0 + w * (flip ? 1 - FLIGHT.blockMax : FLIGHT.blockMax), y0 - 1, 1, 8); c.fillRect(x0 + w * (flip ? 1 - FLIGHT.crashAt : FLIGHT.crashAt), y0 - 1, 1, 8)
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tags = [[(L.flying ? 'FLIGHT ' : 'SPEED ') + L.speed + '%', '#ffe0e0']]
    if (L.brake) tags.push(['BRAKE', '#9fd0ff']); else if (L.committed) tags.push(['COMMITTED', '#ff8080'])
    tags.push(L.unimpCd > 0 ? ['UNIMPRESSED ' + Math.ceil(L.unimpCd / 60) + 's', 'rgba(255,255,255,0.45)'] : ['UNIMPRESSED', '#d0c8ff'])
    let tx = flip ? x0 + w : x0
    for (const [txt, col] of tags) { c.fillStyle = col; c.fillText(txt, tx, y0 + 9); const tw = c.measureText ? c.measureText(txt).width : txt.length * 6; tx += (flip ? -1 : 1) * (tw + 10) }
    c.restore()
  }
  one(p1, false); one(p2, true)
}

// ── SKY (screen space, under the fighters): ESCAPE VELOCITY's ascent / orbit / return. Altitude 0 → 1 → 0 drives a
// stage → deep blue → black blend, seeded stars (hashRandom(seed, i): identical on every machine), a planet horizon
// that rises into view in orbit, and vertical speed streaks while climbing / falling. Render-only.
const EV_ALT = ev => {
  if (!ev) return 0
  const k = (n, d) => Math.max(0, Math.min(1, n / d))
  switch (ev.ph) {
    case 'ascent': { const x = k(ev.t, ESCAPE.ascent); return x * x * (3 - 2 * x) }
    case 'orbit': return 1
    case 'ret': return 1 - Math.pow(k(ev.t, ESCAPE.ret), 1.6)
    default: return 0
  }
}
export function drawOmvSky(c, cv, p1, p2, seed) {
  const f = [p1, p2].find(o => isOmv(o) && o._omv?.ev && ['ascent', 'orbit', 'ret'].includes(o._omv.ev.ph))
  if (!f) return
  const ev = f._omv.ev, alt = EV_ALT(ev), W = cv?.width || 1280, H = cv?.height || 720, P = omvSkinPal(f)
  c.save(); c.setTransform?.(1, 0, 0, 1, 0, 0)
  // sky: the stage fades under a deep blue, then black
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, `rgba(${Math.round(10 * (1 - alt))},${Math.round(30 * (1 - alt))},${Math.round(90 * (1 - alt) + 8)},1)`)
  g.addColorStop(1, `rgba(${Math.round(40 * (1 - alt))},${Math.round(90 * (1 - alt))},${Math.round(180 * (1 - alt) + 10)},1)`)
  c.globalAlpha = Math.min(1, alt * 1.6); c.fillStyle = g; c.fillRect(0, 0, W, H)
  // stars (seeded): appear above half altitude; streak vertically while moving
  const moving = ev.ph !== 'orbit', sa = Math.max(0, (alt - 0.45) / 0.55)
  if (sa > 0) {
    const drift = ev.ph === 'ascent' ? ev.t * 9 : ev.ph === 'ret' ? -ev.t * 12 : 0
    for (let i = 0; i < 140; i++) {
      const rx = hashRandom(seed, i, 7), ry = hashRandom(seed, i, 11), rs = hashRandom(seed, i, 13)
      const x = rx * W, y = ((ry * H + drift) % H + H) % H, sz = 0.6 + rs * 1.6
      c.globalAlpha = sa * (0.45 + 0.55 * rs)
      c.fillStyle = '#ffffff'
      if (moving) c.fillRect(x, y, sz * 0.7, sz * (4 + 10 * (1 - Math.abs(0.5 - alt) * 2)))
      else { c.beginPath(); c.arc(x, y, sz, 0, Math.PI * 2); c.fill() }
    }
  }
  // the planet: a huge curved horizon rising into view at the bottom of the screen, with an atmosphere rim
  const pa = Math.max(0, (alt - 0.7) / 0.3)
  if (pa > 0) {
    const R = W * 1.6, cx = W / 2, cy = H + R - H * 0.28 * pa
    c.globalAlpha = pa
    const pg = c.createRadialGradient(cx, cy - R * 0.2, R * 0.2, cx, cy, R)
    pg.addColorStop(0, P.planet || '#2f6fb8'); pg.addColorStop(0.85, P.planetEdge || '#1b4a86'); pg.addColorStop(1, '#0b1f3c')
    c.fillStyle = pg; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill()
    c.strokeStyle = 'rgba(140,200,255,0.75)'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R + 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke()
    c.strokeStyle = 'rgba(140,200,255,0.25)'; c.lineWidth = 18; c.beginPath(); c.arc(cx, cy, R + 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke()
    // cloud bands (seeded)
    c.globalAlpha = pa * 0.35; c.fillStyle = '#ffffff'
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.25 + 0.5 * hashRandom(seed, i, 17)), rr = R - 20 - 60 * hashRandom(seed, i, 19)
      c.beginPath(); c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 60 + 80 * hashRandom(seed, i, 23), 8, a + Math.PI / 2, 0, Math.PI * 2); c.fill() }
  }
  c.restore()
}
// re-entry glow on the way down + the crater decal (world space, drawn with him; render-only, from sim state)
function drawEvWorld(c, f, s) {
  const ev = s.ev
  if (ev?.ph === 'ret') {
    const k = Math.min(1, ev.t / ESCAPE.ret), a = 0.25 + 0.75 * k
    const x = ctrX(f), y = f.y + f.h * 0.6
    const g = c.createRadialGradient(x, y + 20, 4, x, y, 70 + 30 * k)
    g.addColorStop(0, `rgba(255,240,200,${a})`); g.addColorStop(0.45, `rgba(255,140,40,${a * 0.8})`); g.addColorStop(1, 'rgba(255,60,0,0)')
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g
    c.beginPath(); c.ellipse(x, y, 42 + 20 * k, 70 + 40 * k, 0, 0, Math.PI * 2); c.fill()
    // flame tail streaming upward
    for (let i = 0; i < 5; i++) { const r = hashRandom(i, ev.t >> 1, 3); c.globalAlpha = a * (0.4 + 0.4 * r); c.fillStyle = i % 2 ? '#ffb347' : '#ff6a2a'
      c.beginPath(); c.ellipse(x + (r - 0.5) * 40, f.y - 30 - 60 * r, 6 + 6 * r, 34 + 40 * k, 0, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  const cr = s.crater
  if (cr) {
    const a = 1 - cr.t / ESCAPE.craterLife
    if (a > 0) {
      c.save(); c.globalAlpha = Math.min(1, a * 1.4)
      c.fillStyle = 'rgba(30,22,18,0.85)'; c.beginPath(); c.ellipse(cr.x, cr.y + 2, 120, 16, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = 'rgba(90,70,55,0.9)'; c.beginPath(); c.ellipse(cr.x, cr.y + 1, 120, 9, 0, Math.PI, 0); c.fill()
      c.strokeStyle = 'rgba(20,14,10,0.9)'; c.lineWidth = 2
      for (let i = 0; i < 7; i++) { const an = Math.PI + (i + 0.5) * Math.PI / 7, len = 70 + 70 * hashRandom(cr.x, i, 5)
        c.beginPath(); c.moveTo(cr.x + Math.cos(an) * 60, cr.y); c.lineTo(cr.x + Math.cos(an) * (60 + len), cr.y + 3 + 4 * hashRandom(cr.x, i, 9)); c.stroke() }
      if (cr.t < 40) { c.globalAlpha = (1 - cr.t / 40) * 0.8; c.fillStyle = '#fff3d0'; c.beginPath(); c.ellipse(cr.x, cr.y - 10, 160 + cr.t * 6, 30 + cr.t, 0, 0, Math.PI * 2); c.fill() }
      c.restore()
    }
  }
}

// ── sounds: Homelander's flight clips pitched DOWN (rate 0.78 → lower, heavier) + a WebAudio synth for his own character
// (a whoosh whose pitch rises with speed, the boom crack, impacts that get heavier with speed, the crash crunch,
// the orbit hum, the crater: the loudest hit in his kit). Audio-only; clip choice from the sim clock (no RNG).
const HL = HOMELANDER_SFX || {}
const pick = (pool, n) => (pool && pool.length) ? pool[Math.abs(n | 0) % pool.length] : null
function clip(pool, f, rate = 0.78) { const k = pick(HL[pool], (f?._omv?.clock || 0) * 7 + (f?._omv?.serial || 0)); if (k) try { sound.playSfxFile?.(k, null, { rate }) } catch (_) {} }
function synth(kind, k = 0) {
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
    let x = 24680; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = (x / 0x3fffffff - 1) * (1 - i / n) }   // seeded (audio-only)
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = b; fl.type = hp > 0 ? 'highpass' : 'lowpass'; fl.frequency.value = Math.abs(hp); g.gain.value = vol
    src.connect(fl); fl.connect(g); g.connect(out); src.start(now + at)
  }
  switch (kind) {
    case 'whoosh': noise(0.28, 0.06 + 0.12 * k, 300 + 2600 * k); tone('sine', 90 + 260 * k, 160 + 420 * k, 0.28, 0.05); break   // pitch rises with speed
    case 'boom': noise(0.05, 0.45, 2500); tone('square', 220, 40, 0.18, 0.25); noise(0.5, 0.3, -700, 0.02); break                 // sharp crack + roll
    case 'hit': tone('sine', 130 - 60 * k, 45, 0.12 + 0.12 * k, 0.16 + 0.22 * k); noise(0.08 + 0.1 * k, 0.15 + 0.2 * k, -(2600 - 1800 * k)); break   // heavier with speed
    case 'crash': noise(0.45, 0.4, -900); tone('square', 110, 35, 0.35, 0.22); noise(0.15, 0.2, 3500, 0.03); break                // crunch
    case 'land': noise(0.4, 0.32, -600); tone('sine', 70, 28, 0.45, 0.3); break
    case 'brake': noise(0.22, 0.1, -1400); break
    case 'grab': tone('square', 160, 70, 0.1, 0.14); noise(0.06, 0.15, -1500); break
    case 'hum': tone('sine', 52, 48, 1.4, 0.12); tone('sine', 104, 96, 1.4, 0.03); break                                          // orbit: a low hum
    case 'crater': noise(1.1, 0.6, -500); tone('sine', 60, 22, 1.1, 0.55); noise(0.12, 0.5, 2000); tone('square', 90, 30, 0.5, 0.3); break   // the loudest hit
    case 'glint': tone('sine', 2400, 3200, 0.09, 0.05); break                                                                     // the eye glint (barely there)
  }
}
let _whooshAt = -99
const SFX = {
  takeoff: f => { clip('FLIGHT_TAKEOFF', f); synth('whoosh', 0.3) },
  boom: f => { clip('SUPERSONIC', f, 0.72); synth('boom') },
  crash: () => synth('crash'), hardLand: () => synth('land'), brake: () => synth('brake'),
  hit: (f, v) => synth('hit', v?.frac || 0), blocked: () => synth('hit', 0),
  intro: f => { synth('land'); clip('SUPERSONIC', f, 0.7) },
  kBlitz: f => synth('whoosh', 0.8), blitz: f => { clip('SUPERSONIC', f, 0.8); synth('boom') }, kSkyHook: () => synth('whoosh', 0.5), skyHook: () => synth('hit', 0.7),
  meteor: f => { clip('FLIGHT_TAKEOFF', f, 0.7); synth('whoosh', 1) }, grab: () => synth('grab'), throw: () => synth('crash'), glint: () => synth('glint'),
  unimpressed: () => { synth('hit', 1); synth('crash') }, decree: () => synth('hum'), think: () => { synth('grab'); synth('boom') }, slam: () => { synth('crater') },
  evGrab: () => synth('grab'), ev_ascent: f => { clip('FLIGHT_TAKEOFF', f, 0.66); synth('whoosh', 1) }, ev_orbit: () => synth('hum'),
  ev_ret: f => { clip('SUPERSONIC', f, 0.62); synth('whoosh', 1) }, crater: () => synth('crater'), overshoot: () => synth('brake'),
}
// ORBIT: the music drops under the hum — the sound layer's ref-counted duck, held exactly while the sim is in orbit
// (follows the phase every frame, so an interrupted ultimate can never leave the music ducked). Audio-only.
const DUCKED = new WeakSet()
function orbitDuck(f, on) {
  if (on && !DUCKED.has(f)) { DUCKED.add(f); try { sound._duckBegin?.() } catch (_) {} }
  else if (!on && DUCKED.has(f)) { DUCKED.delete(f); try { sound._duckEnd?.() } catch (_) {} }
}
export function playOmvCues(f, camera) {
  const s = f?._omv
  orbitDuck(f, !!(s?.ev && s.ev.ph === 'orbit'))
  if (!s) return
  const q = s.cues
  for (const v of q) {
    const k = typeof v === 'string' ? v : v.c
    try { if (SFX[k]) SFX[k](f, v) } catch (_) {}
    if (camera?.shake) {
      if (k === 'boom') camera.shake(3, 5)
      if (k === 'hardLand') camera.shake(6, 8)
      if (k === 'slam' || k === 'throw') camera.shake(8, 8)
      if (k === 'crater') camera.shake(16, 22)
    }
  }
  q.length = 0
  // continuous flight whoosh: a short burst every ~0.3 s while fast, pitch from his speed
  if (f._flightCtl && isFlying(f) && !s.ev) {
    const k = Math.min(1, spd(f) / TOP)
    if (k > 0.3 && s.clock - _whooshAt >= 18) { _whooshAt = s.clock; try { synth('whoosh', k) } catch (_) {} }
  }
}
export { ESCAPE }
