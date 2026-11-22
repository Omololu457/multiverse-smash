// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — PRESENTATION ONLY: technique visuals, HUD (Amplification / Empowered
// tags), chant captions, intro / win bubbles and sound cues. Reads f._sks (sim state); writes nothing the sim reads.
// Technique effect colours come from the equipped skin's PREMADE effect sheets (sukunaShinjukuSkins.js) — no runtime
// recolouring; the procedural bits (web crack, fire patch, explosion ring, World-Slash line) take the skin's palette.
import { sound } from './sound.js'
import { SUKUNA_SHINJUKU_FX } from './sukunaShinjukuSprites.js'
import { SKS_KEY, FUGA, WORLD, DISMANTLE, AMP, SKS_MOVES } from './sukunaShinjukuData.js'
import { SUKUNA_VOICE, getSukunaVoiceLang } from './sukunaVoice.js'
// the old Sukuna's voice pools (same files, same language switch, same pool fallbacks as pickSukunaVoice), but the clip
// is picked from the SIM clock instead of a random draw, so no RNG is reachable from this fighter (audio-only either way)
let _vf = null
function pickSukunaVoice(pool) {
  const set = SUKUNA_VOICE[getSukunaVoiceLang()] || {}
  let arr = pool === 'intro' ? [...(set.intro || []), ...(set.taunt || [])] : set[pool]
  if ((!Array.isArray(arr) || arr.length === 0) && /^cast/.test(pool) && pool !== 'cast') arr = set.cast
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[((_vf?._sks?.clock || 0) * 7 + (_vf?._sks?.serial || 0)) % arr.length]
}
import { sksSkinFx, sksSkinPal, sksSkinPhaseTick } from './sukunaShinjukuSkins.js'

const isSks = f => f?.rosterKey === SKS_KEY
const IMG = {}
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = IMG[src]
  if (!i) { i = IMG[src] = new Image(); try { i.src = src } catch (_) {} }
  return i
}
const ready = i => !!(i && i.complete !== false && (i.naturalWidth || i.width))
const ctrX = f => f.x + f.w / 2, ctrY = f => f.y + f.h / 2

// an effect sprite (the skin's premade variant of fx/<key>.png), centred, rotated, mirrored with the travel direction
function sprite(c, f, key, x, y, { scale = 2, alpha = 1, dir = 1, ang = 0 } = {}) {
  const d = SUKUNA_SHINJUKU_FX?.[key]; if (!d) return false
  const i = img(sksSkinFx(f, key) || d.sheet); if (!ready(i)) return false
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false
  c.translate(Math.round(x), Math.round(y)); c.rotate(ang); c.scale(dir, 1)
  const w = d.w * scale, h = d.h * scale
  c.drawImage(i, 0, 0, d.w, d.h, -Math.round(w / 2), -Math.round(h / 2), Math.round(w), Math.round(h))
  c.restore(); return true
}
function ring(c, x, y, r, col, a = 1, lw = 2) { c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.stroke(); c.restore() }
function disc(c, x, y, r, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.fill(); c.restore() }
function bubble(c, text, cx, top, a = 1, ink = '#3a0a10') {
  c.save(); c.globalAlpha = a; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const w = Math.min(320, c.measureText(text).width + 20), h = 26, x = cx - w / 2, y = top - h
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.strokeStyle = ink; c.lineWidth = 2
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 8) : c.rect(x, y, w, h); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(cx - 6, y + h); c.lineTo(cx, y + h + 8); c.lineTo(cx + 6, y + h); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = '#1a0508'; c.fillText(text, cx, y + h / 2, w - 12); c.restore()
}

// ── world-space effects (drawn with the fighter) ──
export function drawSksFx(c, f) {
  if (!isSks(f) || !f._sks) return
  const s = f._sks, t = s.clock, P = sksSkinPal(f)
  sksSkinPhaseTick(f, t)
  // DOMAIN AMPLIFICATION: a subtle, thin outline that breathes (render-only)
  if (s.amp > 0) {
    const a = 0.35 + 0.2 * Math.sin(t * 0.25), fade = Math.min(1, s.amp / 20)
    c.save(); c.globalAlpha = a * fade; c.strokeStyle = P.amp; c.lineWidth = 1.5
    c.beginPath(); c.ellipse(ctrX(f), ctrY(f), f.w * 0.75, f.h * 0.58, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
  // FUGA gather: a glow between his hands that grows with the charge level (the flame itself is in the sheet frames)
  const A = f.attacking && f.currentAttack?.sks ? f.currentAttack : null
  if (A && A.sks.key === 'kFugaG') {
    const el = A.total - A.timer, lv = el >= FUGA.levelAt[2] ? 3 : el >= FUGA.levelAt[1] ? 2 : el >= FUGA.levelAt[0] ? 1 : 0
    const hx = ctrX(f) + (f.facing || 1) * 10, hy = f.y + f.h * 0.42, pulse = 0.6 + 0.4 * Math.sin(t * 0.5)
    c.save(); c.globalCompositeOperation = 'lighter'
    disc(c, hx, hy, 6 + lv * 6 * pulse, P.fugaRim, 0.35); disc(c, hx, hy, 3 + lv * 3, P.fugaCore, 0.6)
    c.restore()
    for (let k = 0; k < lv; k++) disc(c, ctrX(f) - 12 + k * 12, f.y - 10, 3, P.fugaCore, 0.9)   // level pips
  }
  // speech bubble (intro / win)
  if (s.say?.text) bubble(c, s.say.text, ctrX(f), f.y - 18, Math.min(1, s.say.t / 20))
  // WORLD-CUTTING SLASH chant captions (the text system — not sprite text)
  if (A && A.sks.key === 'kWorld') {
    const el = A.total - A.timer, i = Math.min(2, Math.floor(el / WORLD.line))
    if (el < WORLD.signAt) bubble(c, WORLD.chant[i], ctrX(f), f.y - 18, Math.min(1, ((el % WORLD.line) + 1) / 6), '#111')
  }
  // Dismantle cuts in flight: the premade travelling cut, rotated along its path, with a thin trail
  for (const k of s.cuts) {
    const ang = Math.atan2(k.vy, Math.abs(k.vx)) * (k.dir || 1)
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = P.cutTrail; c.lineWidth = 2
    c.beginPath(); c.moveTo(k.x - k.vx * 3, k.y - k.vy * 3); c.lineTo(k.x, k.y); c.stroke(); c.restore()
    if (!sprite(c, f, 'dismantleCut', k.x, k.y, { scale: k.fan ? 1.6 : 2, dir: k.dir, ang })) { c.save(); c.strokeStyle = P.cutTrail; c.lineWidth = 2; c.beginPath(); c.moveTo(k.x, k.y - 20); c.lineTo(k.x + 6 * k.dir, k.y + 20); c.stroke(); c.restore() }
  }
  // Fuga arrows
  for (const a of s.arrows) {
    for (let k = 1; k <= 4; k++) disc(c, a.x - a.dir * k * 9, a.y, 6 - k, P.fugaRim, 0.25)
    if (!sprite(c, f, 'fugaArrow', a.x, a.y, { scale: a.emp ? 3 : 2 + (a.lv - 1) * 0.35, dir: a.dir })) disc(c, a.x, a.y, 8, P.fugaCore, 1)
  }
  // FIRE patches (his elements.js field) — procedural flame tongues; water / steam from a reaction
  for (const p of s.field.patches) {
    const life = Math.min(1, (p.life - (t - p.bornFrame)) / 30)
    if (p.type === 'fire') {
      for (let k = 0; k < Math.max(3, Math.round(p.width / 22)); k++) {
        const ph = ((t * 2 + k * 11) % 30) / 30, x = p.x + (k + 0.5) * p.width / Math.max(3, Math.round(p.width / 22)), h = 10 + (1 - ph) * 14
        c.save(); c.globalAlpha = life * (1 - ph) * 0.85; c.fillStyle = P.fugaRim; c.beginPath(); c.ellipse(x, p.floor - h / 2 - ph * 10, 5, h / 2, 0, 0, Math.PI * 2); c.fill()
        c.fillStyle = P.fugaCore; c.beginPath(); c.ellipse(x, p.floor - h / 3 - ph * 10, 2.5, h / 4, 0, 0, Math.PI * 2); c.fill(); c.restore()
      }
    } else { c.save(); c.globalAlpha = 0.35 * life; c.fillStyle = p.type === 'steam' ? '#e8eef2' : '#5ab4ff'; c.fillRect(p.x, p.floor - (p.type === 'steam' ? 40 : 4), p.width, p.type === 'steam' ? 40 : 4); c.restore() }
  }
  // World-Cutting Slash: one screen-height cut
  if (s.world?.phase === 'cut') {
    const w = s.world, a = Math.max(0, 1 - Math.max(0, w.t - WORLD.resolve) / 18), grow = Math.min(1, w.t / WORLD.resolve)
    c.save(); c.globalAlpha = a; c.strokeStyle = P.cleaveEdge; c.lineWidth = 3
    c.beginPath(); c.moveTo(w.x, f.y + f.h - 900 * grow); c.lineTo(w.x, f.y + f.h + 40); c.stroke()
    c.strokeStyle = P.cutTrail; c.lineWidth = 1; c.beginPath(); c.moveTo(w.x + 3, f.y + f.h - 900 * grow); c.lineTo(w.x + 3, f.y + f.h + 40); c.stroke(); c.restore()
  }
  // hints
  for (const h of s.fx) {
    const a = Math.max(0, 1 - h.t / 24)
    switch (h.kind) {
      case 'cleaveHit':   // Cleave: the strongest accent AT CONTACT (premade contact streak + the skin's edge)
        sprite(c, f, 'cleaveStreak', h.x, h.y, { scale: 4, alpha: a, dir: h.dir || 1, ang: -0.6 })
        c.save(); c.globalAlpha = a; c.strokeStyle = P.cleaveEdge; c.lineWidth = 4; c.beginPath(); c.moveTo(h.x - 26, h.y - 30); c.lineTo(h.x + 26, h.y + 30); c.stroke()
        c.strokeStyle = P.cleaveAccent; c.lineWidth = 1.5; c.beginPath(); c.moveTo(h.x - 22, h.y - 26); c.lineTo(h.x + 22, h.y + 26); c.stroke(); c.restore(); break
      case 'cutHit': c.save(); c.globalAlpha = a; c.strokeStyle = P.cutTrail; c.lineWidth = 2; c.beginPath(); c.moveTo(h.x - 18 * (h.dir || 1), h.y - 14); c.lineTo(h.x + 18 * (h.dir || 1), h.y + 14); c.stroke(); c.restore(); break
      case 'cutProj': ring(c, h.x, h.y, 4 + h.t, P.cutTrail, a, 1); break
      case 'webHit': case 'spark': disc(c, h.x, h.y, 5 * a, '#fff', a); break
      case 'block': ring(c, h.x, h.y, 10 + h.t, '#ffffff', a * 0.7); break
      case 'web': {        // Spiderweb: radial ground crack in front of him
        const A2 = Math.max(0, 1 - h.t / 50)
        c.save(); c.globalAlpha = A2; c.strokeStyle = P.web; c.lineWidth = 2
        for (let k = 0; k < 7; k++) { const ang = Math.PI + (k / 6) * Math.PI; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(ang) * h.w * 0.55, h.y + Math.sin(ang) * 18); c.stroke() }
        for (let r = 1; r <= 3; r++) { c.beginPath(); c.ellipse(h.x, h.y, h.w * 0.17 * r, 6 * r, 0, Math.PI, Math.PI * 2); c.stroke() }
        c.restore(); break
      }
      case 'fugaHit': ring(c, h.x, h.y, 10 + h.t * 2, P.fugaRim, a, 3); break
      case 'fugaBoom': {   // explosion: the skin's core and rim; empowered = bigger
        const A2 = Math.max(0, 1 - h.t / 30), r = h.r * Math.min(1, 0.4 + h.t / 8)
        c.save(); c.globalCompositeOperation = 'lighter'; disc(c, h.x, h.y, r, P.fugaRim, A2 * 0.6); disc(c, h.x, h.y, r * 0.55, P.fugaCore, A2 * 0.9); c.restore()
        ring(c, h.x, h.y, r * 1.2, P.fugaRim, A2, h.emp ? 5 : 3); break
      }
      case 'burst': ring(c, h.x, h.y - 20, 20 + h.t * 3, '#cfe8ff', a, 3); break
      case 'worldHit': disc(c, h.x, h.y, 12 * a, P.cleaveEdge, a); break
    }
  }
}

// a foe burning from Fuga: embers rising (render-only)
export function drawSksBurn(c, f, t) {
  if (!(f?._sksBurn > 0)) return
  for (let k = 0; k < 4; k++) { const ph = ((t + k * 7) % 28) / 28; disc(c, f.x + f.w * (0.2 + 0.2 * k), f.y + f.h * (0.8 - ph * 0.8), 2.5 * (1 - ph), '#ff8a1e', 0.9 * (1 - ph)) }
}

// ── HUD: Domain Amplification / cooldown / Empowered Fuga window under the health bar ──
export function sksHudLabel(f) {
  const s = f?._sks; if (!s) return null
  return { amp: s.amp, ampCd: s.cd.amp, emp: Math.max(0, s.empUntil - s.clock), burnout: f._gsTechBurnout || 0 }
}
export function drawSksHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, pad = 14
  const one = (f, flip) => {
    if (!isSks(f) || !f._sks) return
    const L = sksHudLabel(f), x0 = flip ? cw - pad - 98 : pad + 78, y0 = 66, tags = []
    if (L.amp > 0) tags.push(['AMPLIFICATION ' + (L.amp / 60).toFixed(1) + 's', '#e8e8ff'])
    else tags.push(L.ampCd > 0 ? ['AMP ' + Math.ceil(L.ampCd / 60) + 's', 'rgba(255,255,255,0.45)'] : ['AMP READY', '#d0c8ff'])
    if (L.emp > 0) tags.push(['FUGA EMPOWERED', '#ffb347'])
    if (L.burnout > 0) tags.push(['BURNOUT ' + (L.burnout / 60).toFixed(1) + 's', '#ff6a6a'])
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    let tx = flip ? x0 + 98 : x0
    for (const [txt, col] of tags) { c.fillStyle = col; c.fillText(txt, tx, y0); const tw = c.measureText ? c.measureText(txt).width : txt.length * 6; tx += (flip ? -1 : 1) * (tw + 10) }
    c.restore()
  }
  one(p1, false); one(p2, true)
}

// ── sounds: the old Sukuna's voice pools + slash file (sukunaVoice.js / sukuna_slash.mp3), and a small WebAudio synth
// for each technique's own character (Dismantle thin high slice, Cleave heavy chop, Spiderweb ground crack, Fuga roar).
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
    let x = 12345; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = (x / 0x3fffffff - 1) * (1 - i / n) }   // seeded (audio-only)
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = b; fl.type = hp > 0 ? 'highpass' : 'lowpass'; fl.frequency.value = Math.abs(hp); g.gain.value = vol
    src.connect(fl); fl.connect(g); g.connect(out); src.start(now + at)
  }
  switch (kind) {
    case 'cut': tone('sawtooth', 3200, 1400, 0.09, 0.08); noise(0.08, 0.12, 5000); break                       // thin high slice
    case 'chop': tone('square', 180, 60, 0.16, 0.18); noise(0.14, 0.22, -1800); break                          // heavy chop
    case 'crack': noise(0.35, 0.3, -900); tone('triangle', 90, 40, 0.3, 0.2); noise(0.12, 0.15, 3000, 0.05); break   // ground crack
    case 'roar': noise(0.6, 0.12, -1200); tone('sawtooth', 70, 140, 0.6, 0.08); break                           // flame building
    case 'boom': noise(0.7, 0.35, -600); tone('sine', 80, 30, 0.7, 0.35); break                                 // deep explosion
  }
}
const SFX = {
  introVoice: () => sound.playSfxFile?.(pickSukunaVoice('intro'), null),
  winVoice: () => sound.playSfxFile?.(pickSukunaVoice('win'), null),
  kDismantle: () => { synth('cut'); sound.playSfxFile?.(pickSukunaVoice('cast'), null) },
  kDisUp: () => synth('cut'), kDisAir: () => synth('cut'), cut: () => synth('cut'),
  kCleave: () => { sound.playSfxFile?.(pickSukunaVoice('castCleave'), null) },
  kWeb: () => sound.playSfxFile?.(pickSukunaVoice('cast'), null), webCrack: () => { synth('crack'); sound.playSfxFile?.('sukuna_slash.mp3', null) },
  kFugaG: () => { synth('roar'); sound.playSfxFile?.(pickSukunaVoice('castFlame'), null) }, fugaLevel: () => synth('roar'),
  kFugaE: () => { synth('roar'); sound.playSfxFile?.(pickSukunaVoice('castFlame'), null) },
  fugaBoom: () => synth('boom'), fugaEmpBoom: () => { synth('boom'); synth('boom') },
  worldCut: () => { synth('cut'); synth('chop'); sound.playSfxFile?.('sukuna_slash.mp3', null) },
  kWorld: () => sound.playSfxFile?.(pickSukunaVoice('cast'), null),
}
export function playSksCues(f) {
  const q = f?._sks?.cues; if (!q?.length) return
  _vf = f
  for (const v of q) {
    const k = typeof v === 'string' ? v : v.c
    try { if (SFX[k]) SFX[k](f, v); else if (k === 'kCleave' || k === 'cleaveHit') synth('chop') } catch (_) {}
  }
  // Cleave's chop lands on contact (the hint), not the cast
  if (f._sks.fx.some(h => h.kind === 'cleaveHit' && h.t === 0)) try { synth('chop') } catch (_) {}
  q.length = 0
}
export { AMP, DISMANTLE, SKS_MOVES }
