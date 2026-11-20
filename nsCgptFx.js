// nsCgptFx.js — Ninja Storm CGPT RENDER-ONLY layer (called from nsFx.js for ninja_storm_cgpt only). Reads f._ninja.cg /
// f._ninja.sup, never writes GAME_STATE. Skin-aware: every sprite comes from the fighter's skin folder (f._skinAnim or the
// default Red animationData + CGPT dir), every procedural colour from CGPT_SKIN_FX[tag].
import { juiceSettings } from './juiceSettings.js'
import { MSV1_CELL, MSV1_FX } from './msv1Sprites.js'
import { CGPT_SKIN_FX, cgptSkinTag, cgptSkinDir } from './nsCgptSkins.js'
import { CGPT_STEP, CGPT_CLONE, CGPT_ULT, CGPT_ID } from './nsCgpt.js'

const cache = new Map()
const image = src => { let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const SC = f => (f._lastDrawW ? f._lastDrawW / MSV1_CELL.width : (f.spriteScale || 2.37) * 1.18)
const anims = f => f._skinAnim || f.animationData || {}
const fxOf = f => CGPT_SKIN_FX[cgptSkinTag(f.skinId)] || CGPT_SKIN_FX.red
const frameAt = (A, t) => {
  if (!A) return 0
  if (A.frameTimeline) return A.frameTimeline.reduce((i, [at, fr]) => t >= at ? fr : i, 0)
  const n = A.frames || 1, k = Math.floor(t / (A.speed || 6))
  return A.loop ? k % n : Math.min(n - 1, k)
}
function drawPose(c, f, key, t, x, feet, dir, alpha = 1, o = {}) {
  const A = anims(f)[key] || anims(f).idle; if (!A) return
  const im = image(A.sheet); if (!ready(im)) return
  const s = SC(f), fr = Math.max(0, Math.min((A.frames || 1) - 1, frameAt(A, t) | 0)), W = MSV1_CELL.width, H = MSV1_CELL.height
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.globalCompositeOperation = 'source-over'; try { c.filter = o.filter || 'none' } catch (_) {}
  c.translate(Math.round(x), Math.round(feet)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, fr * W, 0, W, H, -MSV1_CELL.originX * s, -MSV1_CELL.originY * s, W * s, H * s)
  c.restore()
}
function drawFxSprite(c, f, name, frame, x, y, scale, alpha = 1, rot = 0, dir = 1) {
  const meta = MSV1_FX[name] || (anims(f)[name] ? { frames: anims(f)[name].frames, w: MSV1_CELL.width, h: MSV1_CELL.height, strip: true } : null); if (!meta) return
  const im = image(meta.strip ? anims(f)[name].sheet : `${cgptSkinDir(f.skinId)}/${name}.png`); if (!ready(im)) return
  const fr = Math.max(0, Math.min(meta.frames - 1, frame | 0))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha; c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, fr * meta.w, 0, meta.w, meta.h, -meta.w * scale / 2, -meta.h * scale / 2, meta.w * scale, meta.h * scale); c.restore()
}
const rgba = (hex, a) => { const h = (hex || '#ffffff').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})` }

// ── BEHIND the body ──
export function drawCgptUnder(c, f) {
  if (f?.rosterKey !== CGPT_ID) return
  const s = f._ninja, g = s?.cg; if (!g) return
  const X = fxOf(f), clk = s.clock || 0
  // FAULT MARKERS: a jagged glowing crack in the floor, pulsing; blinks out over its last second
  for (const m of g.faults) {
    const a = m.life < 60 ? (Math.floor(m.life / 5) % 2 ? 0.35 : 0.9) : 0.95, pulse = calm() ? 0.6 : 0.5 + 0.5 * Math.sin(clk / 6 + m.id)
    c.save(); c.globalAlpha = a; c.lineJoin = 'miter'
    c.strokeStyle = rgba(X.earth, 0.95); c.lineWidth = 5
    const path = () => { c.beginPath(); c.moveTo(m.x - 46, m.feet - 1); for (let i = -3; i <= 3; i++) c.lineTo(m.x + i * 14 + (i % 2 ? 4 : -4), m.feet - 2 - (i % 2 ? 4 : 0)); c.lineTo(m.x + 46, m.feet - 1); c.stroke() }
    path(); c.strokeStyle = rgba(X.accent, 0.5 + 0.5 * pulse); c.lineWidth = 2; path()
    c.fillStyle = rgba(X.accent, 0.18 * pulse); c.beginPath(); c.ellipse(m.x, m.feet - 3, 54, 9, 0, 0, Math.PI * 2); c.fill()
    c.restore()
  }
  // clone ground shadow (the real body's shadow is the engine's)
  const k = g.clone
  if (k && k.phase !== 'pop') { c.save(); c.fillStyle = 'rgba(0,0,0,0.30)'; c.beginPath(); c.ellipse(k.x, k.feet - 2, 24, 6, 0, 0, Math.PI * 2); c.fill(); c.restore() }
}

// ── IN FRONT of the body ──
export function drawCgptFx(c, f) {
  if (f?.rosterKey !== CGPT_ID) return
  const s = f._ninja, g = s?.cg; if (!s || !g) return
  const X = fxOf(f), clk = s.clock || 0, H = f.h || 94
  // SHADOW CLONE: the Ranger's own skin strips, slightly translucent with a wind-coloured sheen so the real one reads
  const k = g.clone
  if (k) {
    const key = k.act ? (k.act.pose || k.act.key) : k.phase === 'pop' ? 'duck' : k.phase === 'recall' ? 'streak' : k.pose   // forms crouched in the smoke (R13 duck)
    const t = k.act ? k.act.t : k.phase === 'pop' ? k.t : clk
    const al = k.phase === 'recall' ? 0.5 : k.life < 90 ? (Math.floor(k.life / 6) % 2 ? 0.45 : 0.8) : 0.82
    drawPose(c, f, key, t, k.x, k.feet, k.dir || 1, al, { filter: 'brightness(0.92) saturate(1.15)' })
    if (!calm()) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18; c.fillStyle = X.wind; c.beginPath(); c.ellipse(k.x, k.feet - H * 0.5, 26, H * 0.55, 0, 0, Math.PI * 2); c.fill(); c.restore() }
    // mode badge + life bar + attack allowance pips above its head
    const by = k.feet - H - 30
    c.save(); c.font = 'bold 11px monospace'; c.textAlign = 'center'
    const label = k.mode === 'echo' ? 'ECHO' : 'GUARD'
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(k.x - 24, by - 11, 48, 14)
    c.fillStyle = k.mode === 'echo' ? X.wind : X.accent; c.fillText(label, k.x, by)
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(k.x - 22, by + 5, 44, 4); c.fillStyle = X.wind; c.fillRect(k.x - 22, by + 5, 44 * Math.max(0, k.life) / CGPT_CLONE.life, 4)
    for (let i = 0; i < CGPT_CLONE.allowance; i++) { c.fillStyle = i < k.allowance ? '#ffffff' : 'rgba(255,255,255,0.2)'; c.fillRect(k.x - 22 + i * 8, by + 11, 5, 3) }
    // GUARD TELL: a big flashing "!" + a closing ring (clearly telegraphed, both players see it)
    if (k.tell) {
      const u = Math.min(1, k.tell.t / CGPT_CLONE.guardTell), on = calm() || Math.floor(k.tell.t / 3) % 2 === 0
      c.font = 'bold 26px monospace'; c.fillStyle = on ? '#ffffff' : X.accent; c.strokeStyle = '#000'; c.lineWidth = 3
      c.strokeText('!', k.x, by - 16); c.fillText('!', k.x, by - 16)
      c.strokeStyle = rgba(X.accent, 0.9); c.lineWidth = 3; c.beginPath(); c.arc(k.x, k.feet - H / 2, 70 - 40 * u, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
  }
  // NINJA STEP CHARGES: three diamonds under the feet (refill sweep on the next one)
  { const y = (f._rangerFloorY ?? (f.y + H)) + 10, x0 = f.x + (f.w || 48) / 2 - 16
    c.save()
    for (let i = 0; i < CGPT_STEP.max; i++) {
      const full = i < g.step.n, x = x0 + i * 16
      c.fillStyle = full ? X.wind : 'rgba(255,255,255,0.18)'; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1
      c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath(); c.fill(); c.stroke()
      if (i === g.step.n && g.step.t > 0) { c.fillStyle = rgba(X.wind, 0.6); const h = 10 * g.step.t / CGPT_STEP.regen; c.fillRect(x - 2, y + 5 - h, 4, h) }
    }
    c.restore() }
  // EARTH ERUPTION (special or the ultimate): rock spikes + the supplied burst frames
  const E = s.cgEruptFx
  if (E) {
    const u = 1 - E.t / E.t0, big = E.ult ? 2.2 : E.big ? 1.4 : 1
    c.save()
    for (let i = -4; i <= 4; i++) {
      const h = (90 + 40 * ((i * 37 + 11) % 5) / 4) * big * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - Math.max(0, u - 0.7) / 0.3)
      const x = E.x + i * 16 * big, w = 12 * big
      c.fillStyle = i % 2 ? X.earth : rgba(X.earth, 0.85); c.strokeStyle = rgba(X.accent, 0.8); c.lineWidth = 1.5
      c.beginPath(); c.moveTo(x - w, E.feet); c.lineTo(x + (i % 3) * 2, E.feet - h); c.lineTo(x + w, E.feet); c.closePath(); c.fill(); c.stroke()
    }
    if (!calm()) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(X.accent, 0.35 * (1 - u)); c.beginPath(); c.ellipse(E.x, E.feet - 30, 120 * big * (0.4 + u), 40 * big, 0, 0, Math.PI * 2); c.fill() }
    c.restore()
    if (E.ult || E.big) drawPose(c, f, 'domeFx', Math.floor(u * 21), E.x, E.feet, 1, 0.75 * (1 - u))   // the supplied R19 dome frames as the eruption's shock dome
    drawFxSprite(c, f, 'fxBurst', Math.floor(u * 4), E.x, E.feet - 60 * big, SC(f) * big * 0.9, 1 - u * 0.6)
    drawFxSprite(c, f, 'proj_burst', Math.floor(u * 4), E.x, E.feet - 8, SC(f) * big, 1 - u)
  }
  // ULTIMATE: letterbox framing (render-only; the camera itself is never moved), the rising wind spiral, the partner clone
  const G = g.ult
  if (G && s.sup) {
    const t = G.t || 0, U = CGPT_ULT
    if (!calm() && c.canvas) {
      const a = Math.min(1, t / 8) * (t > U.end - 10 ? Math.max(0, (U.end - t) / 10) : 1)
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(0,0,0,${0.85 * a})`; const bh = Math.round(c.canvas.height * 0.08)
      c.fillRect(0, 0, c.canvas.width, bh); c.fillRect(0, c.canvas.height - bh, c.canvas.width, bh); c.restore()
    }
    if (G.ox != null && t >= U.cloneIn && t < U.eruptAt) {
      const top = G.ofeet - (G.rise || 0) - H * 1.4, bot = G.ofeet + 4
      c.save(); c.lineWidth = 3
      for (let i = 0; i < 9; i++) {
        const y = bot - (bot - top) * i / 8, rx = 46 + i * 7, ph = (t * 0.35 + i * 0.7)
        c.strokeStyle = rgba(i % 2 ? X.wind : '#ffffff', 0.75 - i * 0.04)
        c.beginPath(); c.ellipse(G.ox, y, rx, 9 + i, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + Math.PI * 1.25); c.stroke()
      }
      for (let i = 0; i < 3; i++) { const ang = t * 0.3 + i * 2.1; drawFxSprite(c, f, 'proj_crescent', 0, G.ox + Math.cos(ang) * 70, G.ofeet - (G.rise || 0) - 40 - i * 30, SC(f) * 0.9, 0.8, ang) }
      c.restore()
    }
    if (G.clone) drawPose(c, f, G.clone.pose, t, G.clone.x, G.clone.feet, G.clone.dir, 0.85, { filter: 'brightness(0.92) saturate(1.15)' })
  }
  // popup text (summon / mode / refusals / the ultimate's call)
  const P = f._cgPop
  if (P && P.t > 0) {
    P.t--
    c.save(); c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.globalAlpha = Math.min(1, P.t / 12)
    const y = f.y - 26 - (1 - P.t / P.max) * 10
    c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(P.text, f.x + (f.w || 48) / 2, y); c.fillStyle = X.wind; c.fillText(P.text, f.x + (f.w || 48) / 2, y)
    c.restore()
  }
}
