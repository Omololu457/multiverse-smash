// zoroFx.js — Roronoa Zoro RENDER-ONLY presentation (HUD badge, auras, afterimages, shockwave rings).
// Reads simulation state (fighter._zoro, timers) and never writes it. Image objects are presentation caches.
import { ZORO_FX, ZORO_ANIM } from './zoroSprites.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined') return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}

// HUD: Going Merry badge pinned to the Spirit bar label (energy panel in ui.js).
export function drawZoroHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'zoro') return
  const m = img(ZORO_FX.merry.sheet)
  const s = 22, bx = flip ? x + pbw - 52 : x + 50, by = enY - 25
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#16301c'; ctx.fill(); ctx.strokeStyle = '#3fa34d'; ctx.lineWidth = 1.5; ctx.stroke()
  if (m) {
    ctx.imageSmoothingEnabled = false
    const k = s / Math.max(m.width, m.height)
    if (flip) { ctx.translate(bx + s, by); ctx.scale(-1, 1); ctx.drawImage(m, 0, (s - m.height * k) / 2, m.width * k, m.height * k) }
    else ctx.drawImage(m, bx, by + (s - m.height * k) / 2, m.width * k, m.height * k)
  }
  ctx.restore()
}

// World-space FX, drawn after the fighter sprite (game.js render list). Pulses derive from the sim clock
// (deterministic visuals); nothing here touches simulation state.
export function drawZoroFx(c, f) {
  if (!c || f?.rosterKey !== 'zoro') return
  // INTRO: the Going Merry figurehead emblem flashes above him as he walks in.
  if (f._introPlaying) drawMerryFlash(c, f)
  if (!f._zoro) return
  const s = f._zoro, w = f.w ?? 48, h = f.h ?? 100, cx = f.x + w / 2, cy = f.y + h * 0.55
  const a = f.attacking ? f.currentAttack : null, z = a?.zr, t = a ? a.total - a.timer : 0
  if (s.haki > 0) drawHakiRing(c, f, s)
  if (z?.kind === 'ashura') drawAshura(c, f, s, a, t)
  if ((z?.kind === 'oni' || z?.kind === 'shishiStrike') && s.phase) drawDashGhosts(c, f, z.dir || f.facing || 1)
  // SANTORYU: faint green-white aura (no palette shift).
  if (s.santoryu) {
    const t = s.clock || 0, pulse = 0.5 + 0.5 * Math.sin(t * 0.12)
    const fade = Math.min(1, s.santoryuTimer / 60)   // fades out over the last second
    c.save(); c.globalCompositeOperation = 'lighter'
    const g = c.createRadialGradient(cx, cy, h * 0.15, cx, cy, h * 0.85)
    g.addColorStop(0, `rgba(220,255,225,${0.10 * fade})`)
    g.addColorStop(0.6, `rgba(90,200,110,${(0.10 + 0.06 * pulse) * fade})`)
    g.addColorStop(1, 'rgba(90,200,110,0)')
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, w * 1.15, h * 0.8, 0, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.35 * fade; c.strokeStyle = '#e8ffe9'; c.lineWidth = 1.5
    for (let k = 0; k < 3; k++) {   // three faint rising wisps (one per sword)
      const ph = (t * 0.05 + k / 3) % 1, wx = cx + (k - 1) * w * 0.45
      c.beginPath(); c.moveTo(wx, f.y + h); c.quadraticCurveTo(wx + Math.sin(t * 0.1 + k) * 8, f.y + h * (1 - ph), wx, f.y + h * (0.9 - ph * 0.9)); c.stroke()
    }
    c.restore()
  }
}

function drawMerryFlash(c, f) {
  const t = f._introRevealFrame || 0, m = img(ZORO_FX.merry.sheet)
  if (!m || t > 60) return
  const a = t < 8 ? t / 8 : t < 40 ? 1 : (60 - t) / 20
  const flash = t < 14 && (t >> 1) % 2 === 0   // two white strobes on arrival
  const k = 2.4, w = m.width * k, h = m.height * k, cx = f.x + (f.w || 48) / 2, y = f.y - h - 18
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.max(0, a)
  c.drawImage(m, cx - w / 2, y, w, h)
  if (flash) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * a; c.drawImage(m, cx - w / 2, y, w, h) }
  c.restore()
}

// ── Derived-copy afterimages (render-only): an existing frame cell drawn translucent at an offset. ──
// Scale/anchor mirror the live sprite: cell origin (160,150) sits on the body's feet-centre.
function ghost(c, f, sheet, frame, dx, alpha, tint = null) {
  const im = img(sheet); if (!im) return
  const k = (f._lastDrawW || 320 * 2.3) / 320, cw = 320, ch = 256, face = f.facing || 1
  const fx = f.x + (f.w || 48) / 2 + dx, fy = f.y + (f.h || 100)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha
  c.translate(fx, fy); c.scale(face * k, k)
  c.drawImage(im, frame * cw, 0, cw, ch, -160, -150, cw, ch)
  if (tint) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(-160, -150, cw, ch) }
  c.restore()
}
// ASHURA: a Conqueror's-haki dark pulse on the wind-up, then the three-copy mouth-sword aura (R7F1) — the
// "nine swords" — flanking Zoro through the cuts.
function drawAshura(c, f, s, a, t) {
  const cx = f.x + (f.w || 48) / 2, cy = f.y + (f.h || 100) * 0.5
  if (t < 18) {   // dark pulse
    const p = t / 18
    c.save()
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, 120 + p * 380)
    g.addColorStop(0, `rgba(10,0,12,${0.45 * (1 - p)})`); g.addColorStop(1, 'rgba(10,0,12,0)')
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 120 + p * 380, 0, Math.PI * 2); c.fill()
    c.strokeStyle = `rgba(120,0,30,${0.8 * (1 - p)})`; c.lineWidth = 6
    c.beginPath(); c.arc(cx, cy, 40 + p * 300, 0, Math.PI * 2); c.stroke()
    c.restore()
  }
  const fade = Math.min(1, t / 10) * Math.max(0, Math.min(1, (a.total - t) / 20))
  const sheet = ZORO_ANIM.zsIdle.sheet
  for (const [dx, al] of [[-46, 0.30], [46, 0.30], [0, 0.18]]) ghost(c, f, sheet, 0, dx * (f.facing || 1), al * fade, 'rgba(40,10,50,0.55)')
}
// Oni Giri / Shishi Sonson draw-through: a 3-ghost trail of the current dash frame behind him.
function drawDashGhosts(c, f, dir) {
  const act = f.spriteHandler?.currentAction, def = ZORO_ANIM[act]
  if (!def) return
  const fr = f.spriteHandler?.frameIndex || 0
  for (let i = 1; i <= 3; i++) ghost(c, f, def.sheet, fr, -dir * i * 22, 0.32 - i * 0.08, 'rgba(230,255,235,0.35)')
}
// CONQUEROR'S HAKI: a black-red shockwave ring expanding to the 320px pulse radius over 40 frames.
function drawHakiRing(c, f, s) {
  const p = 1 - s.haki / 40, cx = f.x + (f.w || 48) / 2, cy = f.y + (f.h || 100) * 0.5, r = 30 + p * 300
  c.save()
  c.fillStyle = `rgba(0,0,0,${0.22 * (1 - p)})`; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill()
  c.strokeStyle = `rgba(20,0,0,${0.9 * (1 - p)})`; c.lineWidth = 10 * (1 - p) + 2; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = `rgba(200,20,40,${0.8 * (1 - p)})`; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r * 0.82, 0, Math.PI * 2); c.stroke()
  for (let k = 0; k < 8; k++) {   // jagged haki "cracks" (fixed angles → deterministic visuals)
    const ang = k * Math.PI / 4 + 0.3, r0 = r * 0.55, r1 = r * 0.95
    c.beginPath(); c.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0)
    c.lineTo(cx + Math.cos(ang + 0.08) * (r0 + r1) / 2, cy + Math.sin(ang + 0.08) * (r0 + r1) / 2)
    c.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); c.stroke()
  }
  c.restore()
}
