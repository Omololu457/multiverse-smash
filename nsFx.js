// nsFx.js — MSV1 RENDER-ONLY layer for the Ninja Storm Rangers (ns_red / ns_yellow) and any ninja.js profile.
// Reads f._ninja / f._ranger, never writes them. Draws: the ILLUSION body (identical to the real one, minus the ground
// shadow; visor glint every 90 f = THE TELL), shadow clones (±6° tilt chosen in the sim), the R3 streak tail, smoke
// (R23 / R24 frames + capped-opacity procedural drift), dust / rings / ripples, traps, ninja-owned echo shots,
// the Ninja Power HUD bar, the text bubbles. Camera punch = effects.triggerShake on the 'shake' cue (render-only).
import { juiceSettings } from './juiceSettings.js'
import { sound } from './sound.js'
import { triggerShake } from './effects.js'
import { MSV1_CELL, MSV1_FX } from './msv1Sprites.js'
import { getNinjaProfile, isNinja } from './ninja.js'
import { duoFormAnim, duoFormProfile, duoOther, DUO } from './nsDuo.js'   // MSV1-MERGE: the duo's per-form smoke / HUD / intro (render-only)

const cache = new Map()
const image = src => { let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const SC = f => (f._lastDrawW ? f._lastDrawW / MSV1_CELL.width : (f.spriteScale || 2.37) * 1.18)
const anim = (f, key) => (f.animationData || {})[key] || null
const frameAt = (A, t) => {
  if (!A) return 0
  if (A.frameTimeline) return A.frameTimeline.reduce((i, [at, fr]) => t >= at ? fr : i, 0)
  const n = A.frames || 1, k = Math.floor(t / (A.speed || 6))
  return A.loop ? k % n : Math.min(n - 1, k)
}
// draw one cell of an animation strip with the feet point at world (x, feet), facing dir, optional tilt (degrees)
function drawPose(c, f, key, frame, x, feet, dir, alpha = 1, tilt = 0, Aov = null) {
  const A = Aov || anim(f, key) || anim(f, 'idle'); if (!A) return
  const im = image(A.sheet); if (!ready(im)) return
  const s = SC(f), fr = Math.max(0, Math.min((A.frames || 1) - 1, frame | 0)), W = MSV1_CELL.width, H = MSV1_CELL.height
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.globalCompositeOperation = 'source-over'; try { c.filter = 'none' } catch (_) {}   // own state: never inherit another FX pass's dim / tint (the illusion must be pixel-identical)
  c.translate(Math.round(x), Math.round(feet)); if (tilt) c.rotate(tilt * Math.PI / 180); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, fr * W, 0, W, H, -MSV1_CELL.originX * s, -MSV1_CELL.originY * s, W * s, H * s)
  c.restore()
}
function drawFx(c, f, name, frame, x, y, dir = 1, alpha = 1, scale = null, rot = 0) {
  const meta = MSV1_FX[name]; if (!meta) return
  const im = image(`./assets/${f.rosterKey}/${name}.png`); if (!ready(im)) return
  const s = scale ?? SC(f), fr = Math.min(meta.frames - 1, frame | 0)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha; c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, fr * meta.w, 0, meta.w, meta.h, -meta.w * s / 2, -meta.h * s / 2, meta.w * s, meta.h * s); c.restore()
}
function puffs(c, x, y, col, u, n = 6, r = 26, a = 0.55) {   // procedural smoke drift (render-only; opacity capped)
  c.save(); c.fillStyle = col
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2 + i, d = r * (0.4 + u * 0.9)
    c.globalAlpha = Math.min(0.55, a * (1 - u)); c.beginPath(); c.arc(x + Math.cos(ang) * d, y - 20 + Math.sin(ang) * d * 0.6 - u * 18, r * (0.45 + 0.3 * (1 - u)), 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

// presentation ring of what the REAL body drew, keyed by sim clock (Wind Mirage pose = 8 sim frames late)
function rememberPose(f) {
  const s = f._ninja; if (!s) return
  const R = (f._nsPoseRing ||= {})
  R[s.clock] = { key: f._lastSpriteAction || 'idle', frame: f._lastSpriteFrame | 0 }
  delete R[s.clock - 40]
}
function illusionPose(f, s, m) {
  const P = getNinjaProfile(f).mirror
  if (m.frozen && m.pose) return { key: m.pose, frame: frameAt(anim(f, m.pose), s.sup ? m.t : 0) }
  if (P.mode === 'echo') return f._nsPoseRing?.[s.clock - P.echoDelay] || { key: 'idle', frame: 0 }
  return { key: 'guard', frame: Math.floor(m.t / 6) % (anim(f, 'guard')?.frames || 1) }
}

// ── BEHIND the body ──
export function drawNinjaUnder(c, f) {
  if (!isNinja(f)) return
  drawIntroStreak(c, f)
  const s = f._ninja; if (!s) return
  const p = getNinjaProfile(f), w = f.w || 48, feet = (f.y || 0) + (f.h || 94)
  // R3 streak tail (the smear left behind) + speed lines while streaking
  for (const e of s.fx) if (e.k === 'streakTail') { const u = 1 - e.t / e.t0; drawPose(c, f, 'streakTail', u < 0.5 ? 0 : 1, e.x, e.y, e.dir || 1, 0.85 * (1 - u)) }
  if (s.streak && !calm()) {
    c.save(); c.strokeStyle = p.color; c.lineWidth = 2; c.globalAlpha = 0.45
    for (let i = 0; i < 5; i++) { const yy = feet - 20 - i * 16, len = 50 + (i * 37) % 60; c.beginPath(); c.moveTo(f.x + w / 2 - (s.streak.dir || 1) * 20, yy); c.lineTo(f.x + w / 2 - (s.streak.dir || 1) * (20 + len), yy); c.stroke() }
    c.restore()
  }
  // the REAL body's ground shadow while the Mirror is up (the illusion casts none: THE TELL)
  if (s.mirror) { c.save(); c.fillStyle = 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(f.x + w / 2, (f._rangerFloorY ?? feet) - 2, 28, 7, 0, 0, Math.PI * 2); c.fill(); c.restore() }
  // traps: a kunai stuck in the floor (R21 shuriken glint, tilted), blinking when nearly expired
  for (const t of s.traps) {
    const a = t.life < 60 ? (Math.floor(t.life / 6) % 2 ? 0.35 : 1) : 1
    drawFx(c, f, 'proj_spark', 0, t.x, t.feet - 6, 1, a, 1.4, -0.9)
    c.save(); c.globalAlpha = 0.5 * a; c.fillStyle = '#6b4a22'; c.fillRect(t.x - 10, t.feet - 2, 20, 3); c.restore()
  }
  // burrow ripple: a moving dust bump where he is (fair: both players see it)
  if (s.burrow && (s.burrow.t > (s.burrow.sink || 6) || s.streak)) {
    const x = f.x + w / 2, y = f._rangerFloorY ?? feet
    c.save(); c.fillStyle = '#8a6a3a'
    for (let i = -2; i <= 2; i++) { c.globalAlpha = 0.75 - Math.abs(i) * 0.15; c.beginPath(); c.ellipse(x + i * 14, y - 3 - (2 - Math.abs(i)) * 2, 10, 5 + (2 - Math.abs(i)) * 2, 0, Math.PI, 0); c.fill() }
    c.restore()
  }
}

// ── IN FRONT of the body ──
export function drawNinjaFx(c, f, frameNo = 0) {
  if (!isNinja(f)) return
  const s = f._ninja; if (!s) { drawBubble(c, f); return }   // the match intro runs before the sim creates f._ninja
  rememberPose(f)
  const p = getNinjaProfile(f), w = f.w || 48
  // ILLUSION: drawn exactly like the body (same strip / frame / scale / facing), NO ground shadow, visor glint every 90 f
  const m = s.mirror
  if (m) {
    const ip = illusionPose(f, s, m), ix = m.ix + w / 2
    drawPose(c, f, ip.key, ip.frame, ix, m.ifeet, m.dir || f.facing || 1, 1)
    const P = p.mirror
    if (m.t % P.glintEvery < 6 && !calm()) {   // the visor glint (fixed beat)
      const hx = ix + (m.dir || 1) * 6, hy = m.ifeet - (f.h || 94) * 0.92, k = 1 - (m.t % P.glintEvery) / 6
      c.save(); c.fillStyle = '#ffffff'; c.globalAlpha = 0.95 * k
      c.beginPath(); c.moveTo(hx, hy - 9); c.lineTo(hx + 2, hy - 2); c.lineTo(hx + 9, hy); c.lineTo(hx + 2, hy + 2); c.lineTo(hx, hy + 9); c.lineTo(hx - 2, hy + 2); c.lineTo(hx - 9, hy); c.lineTo(hx - 2, hy - 2); c.closePath(); c.fill(); c.restore()
    }
    if (m.swap) { const u = m.swap.t / P.swapFrames; puffs(c, ix, m.ifeet, p.smoke, u, 7, 30); puffs(c, f.x + w / 2, f.y + (f.h || 94), p.smoke, u, 7, 30) }
  }
  // SHADOW CLONES (tilt ±6° chosen in the sim; drawn slightly translucent so the real one reads)
  for (const k of s.clones) {
    if (k.dead || k.phase === 'wait') continue
    const A = anim(f, k.pose) || anim(f, 'guard')
    drawPose(c, f, k.pose, frameAt(A, k.phase === 'strike' ? 10 : k.t), k.x, k.feet, k.dir || 1, 0.9, k.phase === 'pop' ? 0 : k.tilt)
  }
  // ninja-owned echo shots
  for (const sh of s.shots) drawFx(c, f, sh.sprite || 'proj_beam', Math.floor(sh.t / 3) % (MSV1_FX[sh.sprite || 'proj_beam']?.frames || 1), sh.x, sh.y, Math.sign(sh.vx) || 1, 0.85)
  // bursts
  for (const e of s.fx) {
    const u = 1 - e.t / e.t0
    switch (e.k) {
      case 'smoke':
        if (e.big) { const A = e.form ? duoFormAnim(e.form, 'smoke') : anim(f, 'smoke'); drawPose(c, f, 'smoke', Math.min((A?.frames || 1) - 1, Math.floor(u * (A?.frames || 1))), e.x, e.y, f.facing || 1, Math.min(0.9, 1.2 * (1 - u)), 0, A) }
        puffs(c, e.x, e.y, e.form ? (duoFormProfile(e.form)?.smoke || p.smoke) : p.smoke, u, 7, 30); break
      case 'smokeFade': { const A = e.form ? duoFormAnim(e.form, 'smokeFade') : anim(f, 'smokeFade'); if (e.t0 >= 20) drawPose(c, f, 'smokeFade', Math.min((A?.frames || 1) - 1, Math.floor(u * (A?.frames || 1))), e.x, e.y, f.facing || 1, 0.85 * (1 - u), 0, A); puffs(c, e.x, e.y, e.form ? (duoFormProfile(e.form)?.smoke || p.smoke) : p.smoke, u, 5, 22, 0.45); break }
      case 'dust': case 'skid': puffs(c, e.x, e.y + 14, '#c9b48a', u, 4, 12, 0.5); break
      case 'ripple': puffs(c, e.x, e.y + 16, '#8a6a3a', u, 3, 10, 0.5); break
      case 'wind': c.save(); c.strokeStyle = '#e8f6ff'; c.globalAlpha = 0.6 * (1 - u); c.lineWidth = 2; c.beginPath(); c.ellipse(e.x, e.y - 40, 20 + u * 40, 50 + u * 30, 0, 0, Math.PI * 2); c.stroke(); c.restore(); break
      case 'ring': case 'shock': case 'erupt': {   // the R8 landing-dust ring idea, drawn as an expanding ground ring + debris
        c.save(); c.strokeStyle = '#f2ead2'; c.lineWidth = 3; c.globalAlpha = 0.85 * (1 - u)
        c.beginPath(); c.ellipse(e.x, e.y - 2, 20 + u * (e.k === 'shock' ? 120 : 70), 6 + u * 10, 0, 0, Math.PI * 2); c.stroke()
        if (e.k !== 'ring') { c.fillStyle = '#8a6a3a'; for (let i = 0; i < 6; i++) { const a2 = i / 6 * Math.PI; c.globalAlpha = 0.8 * (1 - u); c.fillRect(e.x + Math.cos(a2) * u * 50 - 3, e.y - Math.sin(a2) * u * 60 - 3 - 10, 6, 6) } }
        c.restore()
        if (e.k === 'erupt') for (const d of [-1, 1]) drawFx(c, f, 'proj_beamDiag', Math.floor(u * 3), e.x + d * (16 + u * 46), e.y - 34 - u * 70, d, 0.9 * (1 - u), SC(f) * 0.7, -0.25 * d)   // R21 diagonal energy as the two rock jets of the eruption
        break
      }
      case 'hit': case 'zap': drawFx(c, f, 'fx_hitSpark', 0, e.x, e.y, 1, 1 - u, SC(f) * (0.8 + u * 0.4)); break
      case 'parry': drawFx(c, f, 'proj_burst', Math.floor(u * 4), e.x, e.y, 1, 1 - u); break
      case 'block': drawFx(c, f, 'proj_spark', 0, e.x, e.y, 1, 1 - u); break
      case 'kunai': drawFx(c, f, 'proj_spark', 0, e.x, e.y - 8, 1, 1 - u); break
    }
  }
  // MSV1-MERGE STORM AND STONE: Shane as the R11 tornado streaking down through the foe (Dustin = the R8 rings / bursts)
  if (s.sup?.kind === 'sTag' && s.sup.tx != null) { const A = duoFormAnim('ns_red', 'superTornado'); drawPose(c, f, 'superTornado', Math.floor((s.clock || 0) / 3) % (A?.frames || 1), s.sup.tx, s.sup.ty + (f.h || 94), f.facing || 1, 1, 0, A) }
  // FAULT LINE shockwave between the two bodies
  if (s.sup?.wave) { const wv = s.sup.wave; c.save(); c.fillStyle = '#c9a25a'; c.globalAlpha = 0.8; c.fillRect(Math.min(wv.x0, wv.x) , (f._rangerFloorY ?? f.y + 94) - 8, Math.abs(wv.x - wv.x0), 8); c.restore(); puffs(c, wv.x, (f._rangerFloorY ?? f.y + 94), '#c9b48a', 0.3, 5, 18) }
  // Ninja Barrier dome glow (the dome itself is the R19 strip)
  if (s.barrier && s.barrier.phase === 'parry') { c.save(); c.strokeStyle = '#ffffff'; c.globalAlpha = 0.7; c.lineWidth = 2; c.beginPath(); c.arc(f.x + w / 2, f.y + (f.h || 94) * 0.5, 60, 0, Math.PI * 2); c.stroke(); c.restore() }
  // REV pips (motocross): three small dots behind him
  if (p.rev && s.rev.pips) { c.save(); for (let i = 0; i < s.rev.pips; i++) { c.fillStyle = p.color; c.globalAlpha = 0.9; c.beginPath(); c.arc(f.x + w / 2 - (f.facing || 1) * (34 + i * 10), f.y + (f.h || 94) - 8, 4, 0, Math.PI * 2); c.fill() } c.restore() }
  drawBubble(c, f)
}

// ── INTRO STREAK: he arrives as a red / yellow streak from behind (afterimages + speed lines) while the match intro plays.
// Render-only: a per-fighter presentation counter (_nsIntroFx, never read by the sim, not in the snapshot).
function drawIntroStreak(c, f) {
  if (!f._introPlaying) { f._nsIntroFx = 0; return }
  const t = (f._nsIntroFx = (f._nsIntroFx || 0) + 1), T = 26
  if (f._duo) {   // MSV1-MERGE: the partner's SMOKE SILHOUETTE behind the morphing ranger
    const o = duoOther(f._duo.form), A = duoFormAnim(o, 'idle'), P = duoFormProfile(o), dir = f.facing || 1, bx = f.x + (f.w || 48) / 2 - dir * 46, feet = (f.y || 0) + (f.h || 94)
    puffs(c, bx, feet - 30, P?.smoke || '#888', 0.25 + 0.1 * Math.sin(t / 9), 7, 34, 0.5)
    c.save(); try { c.filter = 'brightness(0.25)' } catch (_) {}; c.globalAlpha = 0.55; c.translate(0, 0)
    const im = A && image(A.sheet)
    if (im && ready(im)) { const sc = SC(f); c.translate(Math.round(bx), Math.round(feet)); if (dir < 0) c.scale(-1, 1); c.imageSmoothingEnabled = false; c.drawImage(im, 0, 0, MSV1_CELL.width, MSV1_CELL.height, -MSV1_CELL.originX * sc, -MSV1_CELL.originY * sc, MSV1_CELL.width * sc, MSV1_CELL.height * sc) }
    c.restore()
  }
  if (t > T || calm()) return
  const p = getNinjaProfile(f), w = f.w || 48, feet = (f.y || 0) + (f.h || 94), dir = f.facing || 1, u = t / T
  for (let i = 3; i >= 1; i--) drawPose(c, f, 'streakTail', i % 2, f.x - dir * (60 * i) * (1 - u), f.y, dir, 0.5 * (1 - u) / i)
  c.save(); c.strokeStyle = p.color; c.lineWidth = 2; c.globalAlpha = 0.55 * (1 - u)
  for (let i = 0; i < 6; i++) { const yy = feet - 14 - i * 15, len = 120 + (i * 53) % 140; c.beginPath(); c.moveTo(f.x + w / 2 - dir * 16, yy); c.lineTo(f.x + w / 2 - dir * (16 + len), yy); c.stroke() }
  c.restore()
}

// ── TEXT BUBBLES (intro / mirror match / vs S.P.D. Red / win). The Spider-Man quip bubbles are pre-cut balloon images
// gated to spiderman in game.js; these reuse their contract: {text, t, max} timing with ease in / hold / ease out,
// the "Quip bubbles" setting (ms_quip_bubbles) + Reduce Flashing / Motion, and they fade when they would cover the foe.
function bubbleOn() { try { return localStorage.getItem('ms_quip_bubbles') !== '0' } catch (_) { return true } }
function drawBubble(c, f) {
  const b = f._nsBubble; if (!b || b.t <= 0 || !bubbleOn()) return
  const life = b.max || 120, a0 = f._introPlaying ? 1 : b.t > life * 0.85 ? (life - b.t) / (life * 0.15) : b.t < life * 0.3 ? b.t / (life * 0.3) : 1
  c.save(); c.font = 'bold 15px Arial'; const tw = c.measureText(b.text).width, bw = tw + 22, bh = 30
  const bx = f.x + (f.w || 48) / 2 - bw / 2, by = f.y - bh - 26
  c.globalAlpha = Math.max(0, Math.min(1, a0)); c.fillStyle = '#ffffff'; c.strokeStyle = '#111'; c.lineWidth = 2.5
  c.beginPath(); c.roundRect ? c.roundRect(bx, by, bw, bh, 12) : c.rect(bx, by, bw, bh); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(bx + bw / 2 - 8, by + bh - 1); c.lineTo(bx + bw / 2, by + bh + 12); c.lineTo(bx + bw / 2 + 8, by + bh - 1); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(bx + bw / 2 - 8, by + bh); c.lineTo(bx + bw / 2, by + bh + 12); c.lineTo(bx + bw / 2 + 8, by + bh); c.stroke()
  c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.text, bx + bw / 2, by + bh / 2 + 1)
  c.restore()
}

// ── HUD: Ninja Power — a slim bar under health in the ranger's colour with three notch marks ──
export function drawNinjaHud(ctx, f, o = {}) {
  const s = f?._ninja; if (!s || !isNinja(f)) return
  const p = getNinjaProfile(f), w = Math.round((o.pbw || 200) * 0.8), h = 5
  const x = o.flip ? o.x + (o.pbw || 200) - w - 8 : o.x + 8, y = (o.hpY ?? (o.enY - 44)) + (o.barH ?? 14) + 26 + 3   // just under the health panel (the same slot the flood breath bar uses)
  ctx.save()
  ctx.fillStyle = 'rgba(10,12,20,0.8)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
  const u = s.np / p.np.max
  const col = f._duo ? duoHudColor(f) : p.color
  ctx.fillStyle = col; if (o.flip) ctx.fillRect(x + w * (1 - u), y, w * u, h); else ctx.fillRect(x, y, w * u, h)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x + w * i / 4), y - 1, 1, h + 2)   // three notches
  ctx.font = 'bold 8px Arial'; ctx.textAlign = o.flip ? 'left' : 'right'; ctx.fillStyle = '#ffffff'   // label at the bar's INNER end (the engine's BREAK badge owns the outer corner)
  const tag = s.mirror ? `MIRROR ${Math.ceil((p.mirror.frames - s.mirror.t) / 60)}s · SWAPS ${p.mirror.maxSwaps - s.mirror.swaps}` : 'NINJA'
  ctx.fillText(tag, o.flip ? x : x + w, y + h + 9)
  ctx.restore()
  if (f._duo) drawDuoHud(ctx, f, x, y, w, o)
}
// MSV1-MERGE duo HUD: the partner's portrait SMALL + greyed beside the bar (the engine portrait = the active form, large),
// the swap cooldown sweeping over it, and the NP bar colour blending red ⇄ yellow through the swap. Reads f._duo only.
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
function duoHudColor(f) {
  const d = f._duo, sw = d.swap; if (!sw) return duoFormProfile(d.form)?.color || '#fff'
  const a = hexRgb(duoFormProfile(sw.from).color), b = hexRgb(duoFormProfile(sw.to).color), k = Math.min(1, sw.t / (DUO.swapFrames - 1))
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`
}
function drawDuoHud(ctx, f, x, y, w, o) {
  if (!f._duoPre) { f._duoPre = true; preloadNinjaFx(f) }   // both forms' smoke / portraits / tornado (render cache)
  const d = f._duo, oth = duoOther(d.form), im = image(`./assets/${oth}/portrait_small.png`), S = 22
  const px = o.flip ? x - S - 6 : x + w + 6, py = y - S + 8
  ctx.save()
  ctx.fillStyle = 'rgba(10,12,20,0.85)'; ctx.fillRect(px - 2, py - 2, S + 4, S + 4)
  if (ready(im)) { try { ctx.filter = 'grayscale(1) brightness(0.7)' } catch (_) {}; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, px, py, S, S); try { ctx.filter = 'none' } catch (_) {} }
  ctx.strokeStyle = duoFormProfile(oth)?.color || '#888'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5; ctx.strokeRect(px - 1, py - 1, S + 2, S + 2); ctx.globalAlpha = 1
  const lock = d.swap ? 1 : d.cd > 0 ? d.cd / 30 : 0
  if (lock > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px, py + S * (1 - Math.min(1, lock)), S, S * Math.min(1, lock)) }
  ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = (f._ninja?.np || 0) >= 15 && !lock ? '#ffffff' : '#8a8f99'
  ctx.fillText('↓↓+GRAB', px + S / 2, py + S + 9)
  ctx.restore()
}

// ── presentation cues (sound + camera punch). Played and cleared by game.js right after tickNinja. ──
export function playNinjaCues(f) {
  const q = f?._nsCues; if (!q) return
  const key = f.rosterKey === 'ns_yellow' ? 'nsy_' : 'nsr_'
  for (const c of q) {
    if (c === 'shake') { if (!juiceSettings.reduceMotion) triggerShake(6, 18); continue }
    sound.play(key + c)
  }
  f._nsCues = null
}
export function preloadNinjaFx(f) { if (f?._duo) for (const k of ['ns_red', 'ns_yellow']) { image(`./assets/${k}/portrait_small.png`); for (const n of ['smoke', 'smokeFade', 'idle', 'superTornado']) { const A = duoFormAnim(k, n); if (A?.sheet) image(A.sheet) } } for (const A of Object.values(f?.animationData || {})) if (A?.sheet) image(A.sheet); for (const n of Object.keys(MSV1_FX)) image(`./assets/${f.rosterKey}/${n}.png`) }
