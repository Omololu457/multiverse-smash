// benAlienUltKit.js — the shared cinematic wrapper for every Ben 10 ALIEN ultimate (2026-11-25, owner: "go to each of Ben 10's
// aliens and give them the same cinematic alternates"). The aliens' own ultimates are KEPT exactly as they are (same input, cost,
// damage, phases — heatblast.js / megawhatt.js / … fireUltimate, or abilities.js's legacy fire* for the older forms); this kit
// wraps each one in three cineRegistry freeze beats around it:
//   ACTIVATION  64 f   the legacy ultimate is cast first (meter spent, its script armed), then the world freezes: a green Omnitrix
//                      flash, letterbox, real punch-in on the alien, the Omnitrix dial spins up around them with their portrait in
//                      the core and SNAPS, the alien's motif (fire / lightning / goo / crystals / ice / …) erupts behind them,
//                      the ALIEN NAME + ULTIMATE title band slams in, their own voice callout (ben10VoiceMap pools)
//   HIT-STOP    6-14 f on each big contact of the alien's own ultimate (max 3): impact frame, alien-coloured burst lines, shock
//                      rings, punch-zoom on the foe
//   AFTERMATH   40 f   when the alien's ultimate ends having dealt damage: letterbox, the ultimate's name stamped over an
//                      Omnitrix hourglass glow, rings, clean fade
// The freezes stop the WHOLE simulation (game.js freeze contract), so the alien's scripted ultimate simply resumes afterwards —
// identical damage and frame data. Detection is a pure read of sim state (the form's `ult` object, the foe's HP, the universal
// ultimateCooldown clock) → deterministic for LAN / replay. Render helpers: bleachUltKit.js (hash noise, no Math.random).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { triggerUltimate } from './abilities.js'
import { playBen10Vo } from './ben10VoiceMap.js'
import { getAlienPortrait } from './alienPortraits.js'
import { lerp, clamp, smooth, outE, hash, ctrX, view, punchIn, wash, desat, speedLines, title, letterbox, glow, rings, star, calmFlash } from './bleachUltKit.js'

export const OPEN = 64, AFTER = 40, MAX_STOPS = 3, STOP_MIN_DROP = 12, ULT_CD = 1200
const BEN_KEYS = ['ben10', 'albedo']
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
export const alienBase = k => String(k || '').toLowerCase().replace(/_ov$/, '')

// table: { [alienBaseKey]: { name, ult, c1, c2, dark, rgb, motif } }  (benAlienUlts.js)
export function makeBenAlienUlts(TABLE) {
  const S = { mode: 'idle' }
  const reset = () => { for (const k of Object.keys(S)) delete S[k]; S.mode = 'idle' }
  const entry = f => TABLE[alienBase(f?.activeAlien)] || null
  const oppOf = (f, context) => (typeof context?.getOpponent === 'function' ? context.getOpponent(f) : (f?.side === 'p1' ? context?.p2 : context?.p1))
  const camRestore = () => { const c = S.cam, sv = S.camSaved; if (c && sv) { c.maxZoom = sv.maxZoom; c.maxZoomStep = sv.maxZoomStep; c.maxPanStep = sv.maxPanStep } S.cam = null; S.camSaved = null }

  function cast(f, context, opts = {}) {
    if (S.reentry) return undefined                                    // the inner call → the alien's own (legacy) ultimate
    const key = String(f?.rosterKey || '').toLowerCase()
    if (!f || !BEN_KEYS.includes(key) || !f.transformed || !f.activeAlien) return undefined   // human Ben / Albedo: the all-aliens sequence
    const A = entry(f); if (!A) return undefined                       // unknown / DNA-scanned form → untouched
    if (S.mode === 'open' || S.mode === 'stop' || S.mode === 'after') return false
    const t = oppOf(f, context); if (!t || t.eliminated) return undefined
    let r
    S.reentry = true
    try { r = triggerUltimate(f, context, opts) } finally { S.reentry = false }
    if (!r) return r                                                    // refused (meter / gate) → nothing to frame
    camRestore()
    const ultObj = f.omnitrix?.formState?.ult || null
    Object.assign(S, { mode: 'open', k: 0, real: 0, f, t, A, alien: f.activeAlien, hp0: t.health, watchHp: t.health, stops: 0, ultObj,
      hasUlt: !!ultObj, fired: {}, drop: 0, stopLen: 0, seed: ((f.x | 0) * 31 + (t.x | 0)) & 1023 })
    return true
  }
  // the alien's own ultimate is over when its formState.ult object is gone (ready forms), or after a fixed window (older forms)
  function ended() {
    const f = S.f, u = f.omnitrix?.formState?.ult ?? null
    if (S.hasUlt) return u !== S.ultObj
    return (ULT_CD - (f.ultimateCooldown || 0)) > (S.A.win || 150)
  }
  function watchWants() {   // pure read of sim state (idempotent transition to idle when nothing more will happen)
    const f = S.f, t = S.t
    if (!f || !t || !(t.health > 0) || !(f.health > 0) || t.eliminated) { S.mode = 'idle'; return false }
    if (!f.transformed || f.activeAlien !== S.alien || (ULT_CD - (f.ultimateCooldown || 0)) > 900 || (f.ultimateCooldown || 0) <= 0) { S.mode = 'idle'; return false }
    const done = ended()
    if (!done && S.stops < MAX_STOPS && t.health <= S.watchHp - STOP_MIN_DROP) return true
    if (done) { if (t.health < S.hp0) return true; S.mode = 'idle'; return false }
    if (t.health > S.watchHp) S.watchHp = t.health                    // healed / reset — never fire on stale numbers
    return false
  }
  function active() {
    if (S.mode === 'open' || S.mode === 'stop' || S.mode === 'after') return true
    if (S.mode === 'watch') return watchWants()
    return false
  }
  function update(ctx = {}) {
    const f = S.f, t = S.t
    if (!f || !t) { reset(); return }
    S.real++
    const cam = ctx.camera
    if (S.mode === 'watch') {
      if (ended()) { S.mode = 'after'; S.k = 0; S.dealt = S.hp0 - t.health; sfx(ctx, 'impact_frame_boom_long', 0.75); sfx(ctx, 'rumble_tail_01', 0.7) }
      else { S.mode = 'stop'; S.k = 0; S.drop = S.watchHp - t.health; S.watchHp = t.health; S.stops++; S.stopLen = Math.round(clamp(5 + S.drop / 5, 6, 14))
        S.stopX = ctrX(t); S.stopY = t.y + (t.h || 94) * 0.45
        sfx(ctx, S.drop >= 40 ? 'hit_heavy_boom_01' : 'impact_hit_01', 0.9); sfx(ctx, 'impact_crack_01', 0.6) }
    }
    const k = S.k
    if (S.mode === 'open') {
      if (cam && !S.cam) { S.cam = cam; S.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.45; cam.maxZoomStep = 0.04; cam.maxPanStep = 60 }
      try { cam?.focusOnFighter?.(f, k < 50 ? 1.3 : 1.05) } catch (_) {}
      if (k === 0) { sfx(ctx, 'charge_hum_rise', 0.75); sfx(ctx, 'warp_wobble_01', 0.6) }
      if (k === 6) sfx(ctx, 'swish_fast_01', 0.7)
      if (k === 10) { try { playBen10Vo('transform', f, { seed: 0x5eed ^ S.seed, frame: S.real }) || playBen10Vo('special', f, { seed: 0x5eed ^ S.seed, frame: S.real }) } catch (_) {} }
      if (k === 16) sfx(ctx, 'energy_tone_hold', 0.45)
      if (k === 30) { sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.7); try { cam?.shake?.(6, 8) } catch (_) {} }
      if (k === 34) sfx(ctx, 'swish_fast_02', 0.75)
      if (k === 48) sfx(ctx, 'boom_anticipation_suck', 0.8)
      if (k === 60) sfx(ctx, 'whoosh_medium_01', 0.7)
      if (++S.k >= OPEN) { camRestore(); S.mode = 'watch'; S.k = 0 }
      return
    }
    if (S.mode === 'stop') {
      if (k === 0) { try { cam?.shake?.(Math.min(16, 6 + S.drop / 6), S.stopLen + 6) } catch (_) {} }
      if (++S.k >= S.stopLen) { S.mode = 'watch'; S.k = 0 }
      return
    }
    if (S.mode === 'after') {
      if (cam && !S.cam) { S.cam = cam; S.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.3; cam.maxZoomStep = 0.03; cam.maxPanStep = 50 }
      try { cam?.focusOnFighter?.(f, 1.15) } catch (_) {}
      if (k === 4) { try { playBen10Vo('taunt', f, { seed: 0xa11e ^ S.seed, frame: S.real }) } catch (_) {} }
      if (k === 6) sfx(ctx, 'sting_pitch_rise_hold', 0.5)
      if (++S.k >= AFTER) { camRestore(); reset() }
    }
  }
  function clear() { camRestore(); reset() }
  function draw(ctx, canvas) {
    if (S.mode !== 'open' && S.mode !== 'stop' && S.mode !== 'after') return false
    const W = canvas.width, H = canvas.height
    if (S.mode === 'open') { drawOpen(ctx, canvas, W, H, S); return true }
    if (S.mode === 'stop') { drawStop(ctx, canvas, W, H, S); return false }
    drawAfter(ctx, canvas, W, H, S); return true
  }
  BEN_KEYS.forEach(k => registerUltCast(k, cast))
  registerFreezeCine('ben_alien_ult', { active, update, clear })
  registerCineScreen('ben_alien_ult', draw)
  return { S, cast, active, update, clear, status: () => ({ mode: S.mode, k: S.k | 0, alien: S.alien || null, stops: S.stops | 0, dealt: S.dealt | 0 }) }
}

// ── RENDER ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const OMNI = '#7cff3a', OMNI_RGB = '124,255,58'
function hourglass(ctx, x, y, r, a, col = OMNI, rot = 0) {
  if (a <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = clamp(a, 0, 1)
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = r * 0.5
  ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.8); ctx.lineTo(r * 0.62, -r * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-r * 0.62, r * 0.8); ctx.lineTo(r * 0.62, r * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill()
  ctx.restore()
}
// the Omnitrix dial: dark bezel, spinning green ticks, alien portrait in the core, hourglass over it
function dial(ctx, x, y, R, spin, a, A, alienKey, snap) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  ctx.fillStyle = 'rgba(10,14,10,0.88)'; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = R * 0.08; ctx.strokeStyle = '#3d4a3d'; ctx.stroke()
  ctx.lineWidth = R * 0.03; ctx.strokeStyle = OMNI; ctx.shadowColor = OMNI; ctx.shadowBlur = R * 0.25
  ctx.beginPath(); ctx.arc(x, y, R * 0.9, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 24; i++) {   // the selector ticks — they spin, then lock
    const an = spin + i * Math.PI / 12, r0 = R * 0.78, r1 = R * (i % 6 === 0 ? 0.6 : 0.68)
    ctx.lineWidth = R * (i % 6 === 0 ? 0.05 : 0.025)
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke()
  }
  ctx.shadowBlur = 0
  const im = getAlienPortrait(alienKey)
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R * 0.55, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = A.dark || '#061006'; ctx.fillRect(x - R, y - R, R * 2, R * 2)
  if (im) { const s = R * 1.12; ctx.globalAlpha = clamp(a, 0, 1) * (snap ? 1 : 0.75); ctx.drawImage(im, x - s / 2, y - s / 2, s, s) }
  const g = ctx.createRadialGradient(x, y, R * 0.1, x, y, R * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${OMNI_RGB},0.45)`)
  ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2)
  ctx.restore()
  ctx.restore()
}
// per-alien motif particles around a screen point (deterministic hash noise over the real-frame clock)
export function motif(ctx, kind, x, y, R, real, a, A, seed = 1) {
  if (a <= 0) return
  const c1 = A.c1, c2 = A.c2, rgb = A.rgb || '255,255,255'
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const P = (i, s) => hash(i, seed * 13 + s)
  if (kind === 'fire' || kind === 'swamp') {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 46; i++) { const u = ((real * (0.8 + P(i, 1)) + P(i, 2) * 60) % 60) / 60, px = x + (P(i, 3) - 0.5) * R * 2.2 + Math.sin(real * 0.1 + i) * R * 0.05, py = y + R * 0.9 - u * R * 2.2, r = (1 - u) * R * (0.05 + P(i, 4) * 0.09)
      ctx.fillStyle = i % 3 ? c1 : c2; ctx.globalAlpha = clamp(a, 0, 1) * (1 - u); ctx.beginPath(); ctx.arc(px, py, Math.max(1, r), 0, Math.PI * 2); ctx.fill() }
    glow(ctx, x, y + R * 0.4, R * 1.4, rgb, 0.35 * a)
  } else if (kind === 'electric' || kind === 'purge') {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 9; i++) { const an = P(i, (real >> 2)) * Math.PI * 2, len = R * (0.9 + P(i, 5) * 0.8)
      for (const [lw, col] of [[R * 0.05, c1], [R * 0.018, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y)
        for (let j = 1; j <= 6; j++) { const d = len * j / 6, jit = (P(i * 7 + j, (real >> 2) + 3) - 0.5) * R * 0.35; ctx.lineTo(x + Math.cos(an) * d - Math.sin(an) * jit, y + Math.sin(an) * d + Math.cos(an) * jit) } ctx.stroke() } }
    glow(ctx, x, y, R * 1.3, rgb, 0.4 * a)
  } else if (kind === 'goo' || kind === 'water') {
    for (let i = 0; i < 30; i++) { const an = P(i, 1) * Math.PI * 2, u = ((real * (0.6 + P(i, 2)) + P(i, 3) * 50) % 50) / 50, d = R * (0.4 + u * 1.1)
      const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.8 + (kind === 'goo' ? u * u * R * 0.5 : -u * R * 0.3), r = R * (0.05 + P(i, 4) * 0.1) * (1 - u * 0.5)
      ctx.globalAlpha = clamp(a, 0, 1) * (1 - u); ctx.fillStyle = i % 3 ? c1 : c2
      if (kind === 'water') { ctx.strokeStyle = c2; ctx.lineWidth = Math.max(1, r * 0.25); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke() }
      else { ctx.beginPath(); ctx.ellipse(px, py, r, r * 1.25, 0, 0, Math.PI * 2); ctx.fill() } }
    if (kind === 'water') for (let j = 0; j < 3; j++) { ctx.globalAlpha = clamp(a, 0, 1) * 0.6; ctx.strokeStyle = c1; ctx.lineWidth = R * 0.04; ctx.beginPath()
      for (let i = 0; i <= 30; i++) { const px = x - R * 1.6 + i * R * 3.2 / 30; ctx.lineTo(px, y + R * (0.7 + j * 0.15) + Math.sin(i * 0.6 + real * 0.15 + j) * R * 0.06) } ctx.stroke() }
  } else if (kind === 'speed' || kind === 'rage') {
    ctx.globalCompositeOperation = kind === 'speed' ? 'lighter' : 'source-over'
    for (let i = 0; i < 40; i++) { const py = y + (P(i, 1) - 0.5) * R * 2, len = R * (0.6 + P(i, 2) * 1.6), px = x - R * 2.2 + ((real * (40 + P(i, 3) * 40) + P(i, 4) * 900) % (R * 4.4))
      ctx.globalAlpha = clamp(a, 0, 1) * (0.3 + 0.6 * P(i, 5)); ctx.fillStyle = i % 2 ? c1 : c2; ctx.fillRect(px, py, len, Math.max(1, R * (0.01 + P(i, 6) * 0.03))) }
    if (kind === 'rage') glow(ctx, x, y, R * 1.5, rgb, 0.45 * a)
  } else if (kind === 'eyes') {
    for (let i = 0; i < 22; i++) { const an = P(i, 1) * Math.PI * 2, d = R * (0.7 + P(i, 2) * 0.9), px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.8, r = R * (0.06 + P(i, 3) * 0.08)
      const open = clamp(Math.sin(real * 0.12 + i) * 2, 0.15, 1)
      ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.ellipse(px, py, r * 1.5, r * open, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(px + (x - px) * 0.04, py + (y - py) * 0.04, r * 0.6 * open, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px + (x - px) * 0.05, py + (y - py) * 0.05, r * 0.28 * open, 0, Math.PI * 2); ctx.fill() }
  } else if (kind === 'ghost') {
    for (let i = 0; i < 10; i++) { const an = real * 0.03 + i * Math.PI / 5, d = R * (0.8 + P(i, 1) * 0.5)
      ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = R * (0.04 + P(i, 2) * 0.05); ctx.globalAlpha = clamp(a, 0, 1) * 0.55
      ctx.beginPath(); for (let j = 0; j < 14; j++) { const aa = an + j * 0.12, dd = d * (1 - j * 0.03); ctx.lineTo(x + Math.cos(aa) * dd, y + Math.sin(aa) * dd * 0.75 + Math.sin(j + real * 0.1) * R * 0.05) } ctx.stroke() }
    glow(ctx, x, y, R * 1.2, rgb, 0.3 * a)
  } else if (kind === 'cosmic' || kind === 'ice' || kind === 'frost') {
    for (let i = 0; i < 40; i++) { const px = x + (P(i, 1) - 0.5) * R * 3, py = y + (P(i, 2) - 0.5) * R * 2.4 + (kind !== 'cosmic' ? ((real * (0.5 + P(i, 3)) * 2) % (R * 2.4)) - R * 1.2 : 0)
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(real * 0.15 + i))
      if (kind === 'cosmic') star(ctx, px, py, R * (0.03 + P(i, 4) * 0.07), a * tw, i, i % 3 ? '#ffffff' : c2)
      else { ctx.strokeStyle = i % 2 ? c2 : '#ffffff'; ctx.lineWidth = Math.max(1, R * 0.012); ctx.globalAlpha = clamp(a, 0, 1) * tw; const r = R * (0.03 + P(i, 4) * 0.06)
        ctx.beginPath(); for (let j = 0; j < 3; j++) { const an = j * Math.PI / 3 + real * 0.02; ctx.moveTo(px - Math.cos(an) * r, py - Math.sin(an) * r); ctx.lineTo(px + Math.cos(an) * r, py + Math.sin(an) * r) } ctx.stroke() } }
    glow(ctx, x, y, R * 1.4, rgb, 0.35 * a)
  } else if (kind === 'wind' || kind === 'psychic') {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 7; i++) { const r = R * (0.5 + i * 0.18), off = real * (kind === 'wind' ? 0.18 : 0.08) * (i % 2 ? 1 : -1) + i
      ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = R * 0.03; ctx.globalAlpha = clamp(a, 0, 1) * (0.7 - i * 0.07)
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (kind === 'wind' ? 0.35 : 0.8), 0, off, off + Math.PI * 1.2); ctx.stroke() }
    glow(ctx, x, y, R * 1.3, rgb, 0.3 * a)
  } else if (kind === 'vines') {
    for (let i = 0; i < 8; i++) { const an = -Math.PI / 2 + (i - 3.5) * 0.38, grow = clamp((real - i * 2) / 30, 0, 1)
      ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.moveTo(x + (i - 3.5) * R * 0.2, y + R)
      for (let j = 1; j <= 12 * grow; j++) { const d = R * 1.8 * j / 12; ctx.lineTo(x + (i - 3.5) * R * 0.2 + Math.cos(an) * d + Math.sin(j * 0.9 + i) * R * 0.08, y + R + Math.sin(an) * d) } ctx.stroke() }
  } else if (kind === 'crystal') {
    for (let i = 0; i < 16; i++) { const an = P(i, 1) * Math.PI * 2, d = R * (0.7 + P(i, 2) * 0.8), h = R * (0.25 + P(i, 3) * 0.45), w = h * 0.3, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.7
      ctx.save(); ctx.translate(px, py); ctx.rotate(an + Math.PI / 2 + Math.sin(real * 0.05 + i) * 0.1)
      ctx.fillStyle = i % 2 ? c1 : c2; ctx.globalAlpha = clamp(a, 0, 1) * 0.85; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, h * 0.4); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore() }
    glow(ctx, x, y, R * 1.3, rgb, 0.3 * a)
  } else if (kind === 'circuit') {
    ctx.strokeStyle = c1; ctx.lineWidth = Math.max(1, R * 0.02); ctx.shadowColor = c1; ctx.shadowBlur = R * 0.1
    for (let i = 0; i < 18; i++) { let px = x + (P(i, 1) - 0.5) * R * 3, py = y + (P(i, 2) - 0.5) * R * 2.2; const grow = clamp((real - P(i, 3) * 20) / 16, 0, 1)
      ctx.beginPath(); ctx.moveTo(px, py); for (let j = 0; j < 4 * grow; j++) { if (j % 2) py += (P(i, j + 4) - 0.5) * R * 0.6; else px += (P(i, j + 4) - 0.5) * R * 0.9; ctx.lineTo(px, py) } ctx.stroke()
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(px, py, R * 0.03, 0, Math.PI * 2); ctx.fill() }
  } else if (kind === 'quake') {
    for (let i = 0; i < 26; i++) { const u = ((real * (0.7 + P(i, 1)) + P(i, 2) * 40) % 40) / 40, px = x + (P(i, 3) - 0.5) * R * 3, py = y + R * 0.9 - Math.sin(u * Math.PI) * R * (0.6 + P(i, 4)), s = R * (0.05 + P(i, 5) * 0.1)
      ctx.save(); ctx.translate(px, py); ctx.rotate(u * 4 + i); ctx.fillStyle = i % 3 ? c1 : c2; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillRect(-s / 2, -s / 2, s, s * 0.8); ctx.restore() }
    glow(ctx, x, y + R * 0.6, R * 1.4, rgb, 0.3 * a)
  } else if (kind === 'moon') {
    ctx.fillStyle = c2; ctx.shadowColor = c2; ctx.shadowBlur = R * 0.4; ctx.globalAlpha = clamp(a, 0, 1) * 0.8
    ctx.beginPath(); ctx.arc(x + R * 0.2, y - R * 0.5, R * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + R * 0.2 + (P(i, 1) - 0.5) * R, y - R * 0.5 + (P(i, 2) - 0.5) * R, R * (0.06 + P(i, 3) * 0.1), 0, Math.PI * 2); ctx.fill() }
    rings(ctx, x, y - R * 0.2, (real % 30) / 30, 3, R * 1.4, c1, R * 0.04, 0.8)
  }
  ctx.restore()
}

function drawOpen(ctx, canvas, W, H, S) {
  const k = S.k, A = S.A, f = S.f, v = view(W, H), u = k / OPEN
  const fp = v.p(ctrX(f), f.y + (f.h || 94) * 0.45)
  const zz = 1 + 0.42 * smooth(k / 20) - 0.42 * smooth((k - 50) / 14)
  punchIn(ctx, canvas, W, H, fp.x, fp.y, zz)
  const cx = W / 2 + (fp.x - W / 2) * zz, cy = H / 2 + (fp.y - H / 2) * zz   // punchIn keeps (fp) fixed → caster stays where he was
  const env = Math.min(smooth(k / 8), 1 - smooth((k - 54) / 10))
  desat(ctx, W, H, 0.55 * env); wash(ctx, W, H, '#000', 0.38 * env)
  const R = H * 0.3
  motif(ctx, A.motif, fp.x, fp.y, R * 1.05 * (0.6 + 0.4 * outE(k / 24)), S.real, env * 0.95, A, S.seed)
  glow(ctx, fp.x, fp.y, R * 1.2, A.rgb, 0.35 * env)
  // dial spins up, decelerates, SNAPS at k 30 — then shrinks into the corner badge
  const spinU = clamp((k - 4) / 26, 0, 1), spin = (1 - (1 - spinU) ** 3) * Math.PI * 7, snap = k >= 30
  const dA = Math.min(smooth((k - 3) / 6), 1 - smooth((k - 40) / 10))
  const dR = H * 0.2 * (0.6 + 0.4 * outE((k - 3) / 10))
  const side = (S.f.facing || 1) > 0 ? 1 : -1, ax = clamp(fp.x + side * H * 0.36, H * 0.24, W - H * 0.24), ay = clamp(fp.y - H * 0.12, H * 0.26, H * 0.6)
  const dx = lerp(ax, clamp(fp.x + side * H * 0.5, H * 0.16, W - H * 0.16), smooth((k - 34) / 12)), dy = ay - H * 0.1 * smooth((k - 34) / 12)
  dial(ctx, dx, dy, dR * (1 - 0.35 * smooth((k - 34) / 12)), spin, dA, A, S.alien, snap)
  hourglass(ctx, dx, dy, dR * (snap ? 0.3 : 0.42) * (1 - 0.35 * smooth((k - 34) / 12)), dA * (snap ? 0.28 : 0.55))
  if (k >= 30 && k < 46) { rings(ctx, dx, dy, (k - 30) / 16, 3, H * 0.5, OMNI, 10, 1); speedLines(ctx, W, H, dx, dy, 60, 41 + S.seed, OMNI, 0.5 * (1 - (k - 30) / 16), false, S.real) }
  // the green Omnitrix flash (open) + the snap flash
  if (!calmFlash()) {
    if (k < 6) wash(ctx, W, H, OMNI, 0.75 * (1 - k / 6), 'lighter')
    if (k >= 30 && k < 34) wash(ctx, W, H, '#ffffff', 0.7 * (1 - (k - 30) / 4))
  }
  // title band: ALIEN NAME / ULTIMATE · ULT NAME
  if (k >= 32) title(ctx, W, H, A.name.toUpperCase(), 'ULTIMATE  ·  ' + A.ult.toUpperCase(), (k - 32) / (OPEN - 30),
    { y: 0.76, bh: 0.16, fs: 0.105, band: 'rgba(6,10,6,0.9)', edge: A.c1, fill: A.c2, stroke: A.dark || '#000', from: f.facing > 0 ? -1 : 1, subCol: '#dfffd0' })
  // corner Omnitrix badge + flavour
  hourglass(ctx, W * 0.06, H * 0.2, H * 0.04, env * 0.9, OMNI)
  letterbox(ctx, W, H, S.real, k, OPEN - 10, 10, 0.12)
  if (k >= OPEN - 6 && !calmFlash()) wash(ctx, W, H, A.c2, 0.35 * (1 - (OPEN - k) / 6), 'lighter')
}
function drawStop(ctx, canvas, W, H, S) {
  const k = S.k, A = S.A, v = view(W, H), u = k / Math.max(1, S.stopLen)
  const tp = v.p(S.stopX, S.stopY)
  punchIn(ctx, canvas, W, H, tp.x, tp.y, 1 + 0.28 * (1 - outE(u)))
  if (!calmFlash()) {
    if (k === 0) { wash(ctx, W, H, '#ffffff', 0.85, 'difference') }
    else if (k === 1) wash(ctx, W, H, A.c1, 0.4)
  }
  speedLines(ctx, W, H, tp.x, tp.y, 70, 7 + S.stops * 13, A.c2, 0.75 * (1 - u), false, S.real)
  rings(ctx, tp.x, tp.y, u, 3, H * 0.45, A.c1, 12, 0.6)
  glow(ctx, tp.x, tp.y, H * 0.25 * (1 - u * 0.5), A.rgb, 0.7 * (1 - u))
  motif(ctx, A.motif, tp.x, tp.y, H * 0.16, S.real, 0.8 * (1 - u), A, S.seed + S.stops)
  star(ctx, tp.x, tp.y, H * 0.18 * (1 - u * 0.6), 1 - u, k * 0.2, '#ffffff')
}
function drawAfter(ctx, canvas, W, H, S) {
  const k = S.k, A = S.A, f = S.f, v = view(W, H), u = k / AFTER
  const fp = v.p(ctrX(f), f.y + (f.h || 94) * 0.45)
  const env = Math.min(smooth(k / 6), 1 - smooth((k - 30) / 10))
  wash(ctx, W, H, '#000', 0.3 * env)
  glow(ctx, fp.x, fp.y, H * 0.45, A.rgb, 0.4 * env)
  hourglass(ctx, W * 0.5, H * 0.42, H * 0.24 * (0.9 + 0.1 * outE(u)), 0.22 * env, OMNI)
  rings(ctx, fp.x, fp.y, clamp(k / 24, 0, 1), 3, H * 0.6, A.c1, 9, 0.5)
  if (!calmFlash() && k < 3) wash(ctx, W, H, '#ffffff', 0.55 * (1 - k / 3))
  title(ctx, W, H, A.ult.toUpperCase() + '!', A.name.toUpperCase() + '  —  ' + (S.dealt > 0 ? S.dealt + ' DAMAGE' : ''), clamp(k / (AFTER - 2), 0, 1),
    { y: 0.3, bh: 0.15, fs: 0.095, band: 'rgba(6,10,6,0.88)', edge: OMNI, fill: A.c2, stroke: A.dark || '#000', from: f.facing > 0 ? 1 : -1, subCol: '#dfffd0' })
  letterbox(ctx, W, H, k * 2 + 1, k, AFTER - 10, 10, 0.1)
}
