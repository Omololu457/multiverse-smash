// sukunaDomainFx.js — RENDER-ONLY half of the rebuilt MALEVOLENT SHRINE domain (sukunaDomainCine.js). Two passes:
//   drawShrineBackdrop(ctx, W, H, domain, groundY)  — domains.js drawDomainBackground (screen space, UNDER the fighters):
//       a crimson-to-black sky with ash rising, a horizon furnace glow, the shrine as a LOOMING FIXED SET PIECE (the project's
//       own shrine painting alt_sukuna_domain3 — mouths + skull heap — centred, towering, half-sunk in the blood, barely
//       parallaxing), a blood pool floor with ripple bands, rings under the caster and at every cut, faint scars in the air.
//       During the opening it is revealed in stages (void → blood flood → silhouette → lit from below).
//   drawShrineOverlay(ctx, canvas, SD, OPEN)       — cineRegistry screen pass (OVER everything, before the HUD): the opening
//       (hand-sign punch-in + 領域展開 stamp, flood flash, 伏魔御廚子 title, first rake), then during the live domain the
//       full-screen slash rakes synced to each Dismantle / Cleave, an occasional Cleave X close-up, and the end beat.
// Distinct from alt_sukuna's ult (altSukunaUltFx.js: shrine RISES beside him under a black sun, slanted title band):
// here the shrine never moves — it is already there, a colossal silhouette that the blood light reveals; no sun.
// Pure functions of the frame counters; noise = integer hash. Reduce Flashing → no white/red flash frames.
import { clamp, smooth, outE, hash, view, image, ready, punchIn, glow, rings, subtitle, letterbox, speedLines, calmMotion, calmFlash } from './bleachUltKit.js'
import { SD as _SD, OPEN as _OPEN } from './sukunaDomainCine.js'   // read-only (circular import, used only inside functions)

const SHRINE_ART = './alt_sukuna_domain3.png'
const RED = '255,40,40'
let _sil = null
function silCanvas(w, h) { if (!_sil) { const cv = document.createElement('canvas'); _sil = { cv, g: cv.getContext('2d') } } if (_sil.cv.width !== w || _sil.cv.height !== h) { _sil.cv.width = w; _sil.cv.height = h } return _sil }

// the animation clock follows the SIM (opening frame, then the domain's own elapsed frames) so slashes / ripples stay in
// sync with the hits at any render rate; only the post-collapse fade-out (no domain left) runs on the render counter.
function simClock(SD, OPEN, domain) {
  if (SD.active) return SD.k
  if (domain) return OPEN.len + (domain.timerMax || 0) - (domain.timer || 0)
  return SD.tick
}
// opening-relative reveal amounts (1 = fully revealed; the live domain is always 1)
function reveal(SD, OPEN) {
  if (!SD.active) return { sky: 1, pool: 1, loom: 1, lit: 1 }
  const k = SD.k
  return { sky: smooth((k - OPEN.flood + 6) / 24), pool: outE((k - OPEN.flood) / 26), loom: smooth((k - OPEN.loom) / 22), lit: smooth((k - OPEN.lit) / 34) }
}

// ── BACKDROP ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function drawShrineBackdrop(ctx, W, H, domain, groundY) {
  const SD = _SD, OPEN = _OPEN, R = reveal(SD, OPEN), t = simClock(SD, OPEN, domain)
  const V = view(W, H), z = V.z, floorY = V.p(0, groundY || H * 0.8).y
  const ownerX = SD.owner ? V.p((SD.owner.x || 0) + (SD.owner.w || 48) / 2, 0).x : W / 2
  const ownerFeet = SD.owner ? V.p(0, (SD.owner.y || 0) + (SD.owner.h || 94)).y : floorY
  const el = domain ? (domain.timerMax || 0) - (domain.timer || 0) : 0
  const left = domain ? (domain.timer || 0) : 0
  // end beat: the last 70 frames the shrine sinks into the blood; a clash loss shatters it during the fade-out
  const sink = domain && !SD.active ? smooth((70 - left) / 70) : (!domain ? 1 : 0)

  // 1) the void, then the sky bleeds crimson from the horizon up
  ctx.fillStyle = '#030000'; ctx.fillRect(-20, -20, W + 40, H + 40)
  if (R.sky > 0) {
    ctx.save(); ctx.globalAlpha *= R.sky
    const g = ctx.createLinearGradient(0, 0, 0, floorY)
    g.addColorStop(0, '#070000'); g.addColorStop(0.45, '#2a0204'); g.addColorStop(0.82, '#7a0a0a'); g.addColorStop(1, '#c0261a')
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, floorY + 20)
    // cloud bands drifting slowly sideways
    for (let i = 0; i < 9; i++) {
      const y = floorY * (0.12 + 0.09 * i), sp = calmMotion() ? 0 : t * (0.15 + hash(i, 3) * 0.25)
      const x = ((hash(i, 1) * W * 2 + sp) % (W * 1.8)) - W * 0.4, w = W * (0.4 + hash(i, 2) * 0.5)
      ctx.globalAlpha = R.sky * (0.10 + 0.12 * hash(i, 4)); ctx.fillStyle = i % 3 ? '#1a0000' : '#5a0808'
      ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, (8 + hash(i, 5) * 18) * z, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
    glow(ctx, W / 2, floorY, W * 0.55, '255,70,30', 0.35 * R.sky)                 // furnace glow on the horizon
  }

  // 2) THE SHRINE — a colossal fixed set piece, centred, half-sunk in the blood (barely parallaxes with the camera)
  const im = image(SHRINE_ART)
  if (R.loom > 0 && ready(im)) {
    const breathe = calmMotion() ? 0 : Math.sin(t * 0.045) * 0.008
    const sh = H * 1.02 * (1 + breathe), sw = im.width * sh / im.height
    const par = clamp((V.p(0, 0).x - W / 2) * 0.06, -W * 0.05, W * 0.05)
    const cx = W / 2 + par, by = floorY + sh * 0.16 + sink * sh * 0.85
    const shatter = !domain && SD.ended?.early
    const sil = silCanvas(Math.ceil(sw), Math.ceil(sh)), sg = sil.g
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; sg.clearRect(0, 0, sil.cv.width, sil.cv.height)
    sg.imageSmoothingEnabled = false; sg.drawImage(im, 0, 0, sw, sh)
    // unlit = black silhouette; the blood light climbs from the base upward (lit) — then stays as a dark crimson grade
    sg.globalCompositeOperation = 'source-atop'
    const litY = sh * (1 - R.lit * 1.15)
    sg.fillStyle = '#000'; sg.globalAlpha = 1; sg.fillRect(0, 0, sw, Math.max(0, litY))
    const lg = sg.createLinearGradient(0, litY, 0, litY + sh * 0.15); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0)')
    sg.fillStyle = lg; sg.fillRect(0, litY, sw, sh * 0.15)
    sg.globalAlpha = 0.42; sg.fillStyle = '#3a0000'; sg.fillRect(0, 0, sw, sh)                              // backdrop grade: fighters pop
    if (sink > 0) { sg.globalAlpha = 0.6 * sink; sg.fillStyle = '#000'; sg.fillRect(0, 0, sw, sh) }
    ctx.save(); ctx.globalAlpha *= R.loom * (shatter ? clamp(1 - (t - SD.ended.tick) / 16, 0, 1) : 1)
    ctx.beginPath(); ctx.rect(-20, -20, W + 40, floorY + 6 * z + 20); ctx.clip()                              // the pool swallows its base
    if (shatter) {                                                                                         // clash loss: the set piece splits
      const u = clamp((t - SD.ended.tick) / 16, 0, 1)
      for (let s = 0; s < 2; s++) { ctx.save(); ctx.beginPath(); s ? ctx.rect(cx, -20, W, H + 40) : ctx.rect(-20, -20, cx + 20, H + 40); ctx.clip()
        ctx.translate((s ? 1 : -1) * u * 60 * z, u * 80 * z); ctx.rotate((s ? 1 : -1) * u * 0.06); ctx.drawImage(sil.cv, cx - sw / 2, by - sh); ctx.restore() }
    } else ctx.drawImage(sil.cv, cx - sw / 2, by - sh)
    ctx.restore()
    // the mouths breathe a red heat; rim light from the pool
    glow(ctx, cx, by - sh * 0.38, sw * 0.35, RED, (0.14 + (calmMotion() ? 0 : 0.06 * Math.sin(t * 0.09))) * R.lit * (1 - sink))
  }

  // 3) faint scars in the air — the domain is always cutting
  if (R.lit > 0 && domain && !calmMotion()) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const cyc = 50 + (i * 13) % 40, ph = (t + i * 23) % cyc; if (ph > 8) continue
      const sd = ((t + i * 23) / cyc) | 0, x = hash(sd, i) * W, y = hash(sd, i + 9) * floorY * 0.9, L = (60 + hash(sd, i + 4) * 160) * z, an = -0.3 - hash(sd, i + 7) * 1.2
      ctx.globalAlpha = 0.35 * (1 - ph / 8) * R.lit; ctx.strokeStyle = '#ffb0b0'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x - Math.cos(an) * L / 2, y - Math.sin(an) * L / 2); ctx.lineTo(x + Math.cos(an) * L / 2, y + Math.sin(an) * L / 2); ctx.stroke()
    }
    ctx.restore()
  }

  // 4) ash / embers rising
  if (!calmMotion() && R.sky > 0) {
    ctx.save()
    for (let i = 0; i < 46; i++) {
      const sp = 0.4 + hash(i, 2) * 0.9, ph = ((t * sp + hash(i, 3) * 900) % 900) / 900
      const x = hash(i, 4) * W + Math.sin(t * 0.02 + i) * 14, y = floorY - ph * floorY * 1.05
      ctx.globalAlpha = R.sky * Math.sin(Math.PI * ph) * (i % 4 ? 0.45 : 0.8); ctx.fillStyle = i % 4 ? '#5a1a14' : '#ff6a3a'
      ctx.fillRect(x, y, (i % 4 ? 3 : 2) * z, (i % 4 ? 3 : 2) * z)
    }
    ctx.restore()
  }

  // 5) the blood pool — floods outward from his feet during the opening, then a still, rippling floor
  if (R.pool > 0) {
    const reach = R.pool >= 1 ? W * 2 : W * 1.1 * R.pool
    ctx.save()
    ctx.beginPath(); ctx.rect(ownerX - reach, floorY - 2 * z, reach * 2, H - floorY + 40); ctx.clip()
    const pg = ctx.createLinearGradient(0, floorY, 0, H); pg.addColorStop(0, '#6a0606'); pg.addColorStop(0.25, '#3a0202'); pg.addColorStop(1, '#120000')
    ctx.fillStyle = pg; ctx.fillRect(-20, floorY - 2 * z, W + 40, H - floorY + 40)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 16; i++) {                                                                 // perspective ripple bands
      const yy = floorY + Math.pow(i / 16, 1.6) * (H - floorY), ph = calmMotion() ? 0 : t * 0.035 + i * 0.7
      ctx.strokeStyle = `rgba(255,${60 + i * 4},${50 + i * 3},${0.22 - i * 0.01})`; ctx.lineWidth = 1 + i * 0.12
      ctx.beginPath(); for (let x = -20; x <= W + 20; x += 20) { const v = yy + Math.sin(x * (0.018 - i * 0.0006) + ph) * (1 + i * 0.25) * z; x === -20 ? ctx.moveTo(x, v) : ctx.lineTo(x, v) } ctx.stroke()
    }
    // reflection of the horizon glow + the shrine's shadow in the blood
    glow(ctx, W / 2, floorY + 10 * z, W * 0.4, '255,60,40', 0.18)
    ctx.restore()
    // rings: steady under the caster, a burst wherever a cut lands
    if (SD.owner && !calmMotion()) for (let r = 0; r < 3; r++) { const u = ((t + r * 30) % 90) / 90; ringE(ctx, ownerX, ownerFeet + 2 * z, u * 140 * z, u * 18 * z, 0.35 * (1 - u)) }
    if (SD.foe) for (const s of SD.slashes) {
      const a = el - s.at; if (a < 0 || a > 40) continue
      const fx = V.p((SD.foe.x || 0) + (SD.foe.w || 48) / 2, 0).x, u = a / 40
      ringE(ctx, fx, floorY + 4 * z, (20 + u * (s.cleave ? 260 : 160)) * z, (4 + u * 24) * z, (s.cleave ? 0.75 : 0.5) * (1 - u))
    }
  }
  return true
}
function ringE(ctx, x, y, rx, ry, a) {
  if (a <= 0 || rx <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = '#ff7060'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(1, ry), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
}

// ── OVERLAY ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export function drawShrineOverlay(ctx, canvas, SD, OPEN) {
  SD.tick++
  const W = canvas?.width || 1280, H = canvas?.height || 720
  if (SD.active) return opening(ctx, canvas, W, H, SD, OPEN)
  const d = SD.domain
  if (d) { live(ctx, canvas, W, H, SD, d); return false }
  return false
}

function casterHead(W, H, SD) {
  const V = view(W, H), f = SD.owner
  const p = V.p((f.x || 0) + (f.w || 48) / 2, (f.y || 0) + (f.h || 94) * 0.32)
  return { x: p.x, y: p.y, z: V.z, feet: V.p(0, (f.y || 0) + (f.h || 94)).y }
}

function opening(ctx, canvas, W, H, SD, OPEN) {
  const k = SD.k, c = casterHead(W, H, SD), dir = (SD.owner.facing || 1)
  // A) the hand sign — a real close-up (re-blit of the finished frame), red rim + converging lines
  if (k < OPEN.sign) {
    const u = smooth(k / OPEN.sign)
    punchIn(ctx, canvas, W, H, c.x, c.y, 1.9 + 0.5 * u)
    vignette(ctx, W, H, 0.85)
    speedLines(ctx, W, H, W / 2, H * 0.45, 60, 17, '#2a0000', 0.55, true, k)
    stamp(ctx, W, H, '領域展開', (k - 6) / 30, H * 0.8, H * 0.13, k < OPEN.sign - 6 ? 1 : clamp((OPEN.sign - k) / 6, 0, 1))
  }
  // B) blood flood — a crimson flash from his feet, rings racing out
  if (k >= OPEN.flood - 2 && k < OPEN.flood + 10 && !calmFlash()) {
    const a = 1 - (k - OPEN.flood + 2) / 12
    ctx.save(); ctx.globalAlpha = 0.75 * a; ctx.fillStyle = '#b00000'; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  if (k >= OPEN.flood && k < OPEN.flood + 40) rings(ctx, c.x, c.feet, (k - OPEN.flood) / 40, 3, W * 1.2, '#ff5a4a', 10 * c.z, 0.2)
  // C) title: 伏魔御廚子 — a centred brush stamp with hairline rules (not a slanted band)
  if (k >= OPEN.title && k < OPEN.rake + 10) {
    const u = (k - OPEN.title) / (OPEN.rake + 10 - OPEN.title)
    shrineTitle(ctx, W, H, u)
  }
  // D) the first rake — six cuts tear across the whole screen
  if (k >= OPEN.rake) for (const [i, r] of [0, 5, 9, 14, 18, 22].entries()) rake(ctx, W, H, k - OPEN.rake - r, i + 1, i % 3 === 2, W / 2, H * 0.55)
  if (k >= OPEN.rake + 24 && k < OPEN.rake + 28 && !calmFlash()) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore() }
  letterbox(ctx, W, H, k + 10, k, OPEN.out, OPEN.len - OPEN.out, 0.11)
  if (k < OPEN.sign) subtitle(ctx, W, H, 'SUKUNA', 'Domain Expansion.', Math.min((k - 4) / 6, (OPEN.sign - k) / 8), '#ff5a5a')
  else if (k >= OPEN.title + 4 && k < OPEN.rake + 6) subtitle(ctx, W, H, 'SUKUNA', 'Malevolent Shrine.', Math.min((k - OPEN.title - 4) / 6, (OPEN.rake + 6 - k) / 8), '#ff5a5a')
  return true
}

function live(ctx, canvas, W, H, SD, d) {
  const el = (d.timerMax || 0) - (d.timer || 0)
  const V = view(W, H), z = V.z, foe = SD.foe
  const tp = foe ? V.p((foe.x || 0) + (foe.w || 48) / 2, (foe.y || 0) + (foe.h || 94) * 0.45) : { x: W / 2, y: H / 2 }
  for (const s of SD.slashes) {
    const a = el - s.at; if (a < 0 || a > 30) continue
    // Dismantle: a fan of thin cuts raking the entire screen through the target; Cleave: two heavy crossing cuts
    if (s.cleave) { rake(ctx, W, H, a, s.n * 7 + 1, true, tp.x, tp.y, -0.62); rake(ctx, W, H, a - 3, s.n * 7 + 2, true, tp.x, tp.y, 0.62) }
    else for (let i = 0; i < 6; i++) rake(ctx, W, H, a - i * 2, s.n * 11 + i, false, tp.x + (hash(s.n, i) - 0.5) * 160 * z, tp.y + (hash(s.n, i + 5) - 0.5) * 120 * z)
    if (a < 3 && !calmFlash()) { ctx.save(); ctx.globalAlpha = (s.cleave ? 0.35 : 0.18) * (1 - a / 3); ctx.fillStyle = '#ff2020'; ctx.fillRect(0, 0, W, H); ctx.restore() }
    // the occasional Cleave X close-up (every other Cleave): punch in on the target, a colossal X, 捌
    if (s.cleave && s.n % 4 === 2 && a < 26) {
      const u = a / 26, zin = 1 + 0.5 * outE(clamp(a / 5, 0, 1)) * (1 - smooth((a - 18) / 8))
      punchIn(ctx, canvas, W, H, tp.x, tp.y, zin)
      vignette(ctx, W, H, 0.7 * (1 - smooth((a - 18) / 8)))
      bigX(ctx, W, H, W / 2 + (tp.x - W / 2) * 0.2, H * 0.5 + (tp.y - H / 2) * 0.2, a, z)
      glyph(ctx, W * (tp.x < W / 2 ? 0.82 : 0.18), H * 0.3, '捌', H * 0.16, clamp(Math.min(a / 3, (26 - a) / 6), 0, 1))
      void u
    }
  }
  // end beat: the shrine sinks — "It is done."
  const left = d.timer || 0
  if (left <= 70 && left > 0) subtitle(ctx, W, H, 'SUKUNA', 'It is done.', Math.min((70 - left) / 8, left / 10), '#ff5a5a')
}

// ── pieces ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function vignette(ctx, W, H, a) {
  if (a <= 0) return
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,0,0,${a})`)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// one cut raking the whole screen through (x, y) — grows in 3 frames, lingers as a scar, fades
function rake(ctx, W, H, a, seed, heavy, x, y, angle) {
  if (a < 0 || a > 22) return
  const an = angle ?? (-0.15 - hash(seed, 1) * 1.1) * (hash(seed, 2) < 0.5 ? 1 : -1)
  const L = Math.hypot(W, H) * 1.1 * outE(clamp((a + 1) / 4, 0, 1)), al = a < 5 ? 1 : clamp(1 - (a - 5) / 17, 0, 1)
  const c = Math.cos(an) * L / 2, s = Math.sin(an) * L / 2, off = (hash(seed, 3) - 0.5) * 40
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const layers = heavy ? [[34, `rgba(${RED},${0.35 * al})`], [12, `rgba(255,160,160,${0.8 * al})`], [4, `rgba(255,255,255,${al})`]]
                       : [[10, `rgba(${RED},${0.3 * al})`], [2.5, `rgba(255,235,235,${0.95 * al})`]]
  for (const [lw, col] of layers) { ctx.strokeStyle = col; ctx.lineWidth = lw * (H / 720); ctx.beginPath(); ctx.moveTo(x - c, y - s + off); ctx.lineTo(x + c, y + s + off); ctx.stroke() }
  ctx.restore()
}
function bigX(ctx, W, H, x, y, a, z) {
  const L = Math.hypot(W, H) * 0.75 * outE(clamp((a + 1) / 4, 0, 1)), al = a < 10 ? 1 : clamp(1 - (a - 10) / 16, 0, 1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt'
  for (const an of [-0.8, 0.8]) {
    const c = Math.cos(an) * L / 2, s = Math.sin(an) * L / 2
    for (const [lw, col] of [[70, `rgba(${RED},${0.3 * al})`], [24, `rgba(255,120,120,${0.75 * al})`], [7, `rgba(255,255,255,${al})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw * (H / 720); ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke()
    }
  }
  ctx.restore()
}
function glyph(ctx, x, y, ch, size, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(size)}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(255,40,40,0.9)'; ctx.shadowBlur = size * 0.25
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.12; ctx.strokeStyle = '#1a0000'; ctx.strokeText(ch, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(ch, x, y)
  ctx.restore()
}
// horizontal brush stamp, one glyph at a time, slammed in (領域展開)
function stamp(ctx, W, H, text, u, y, size, fade) {
  if (u <= 0) return
  const chars = [...text], gap = size * 1.08, x0 = W / 2 - gap * (chars.length - 1) / 2
  chars.forEach((ch, i) => {
    const ci = clamp(u * (chars.length + 1.5) - i, 0, 1); if (ci <= 0) return
    const sc = 1 + (1 - outE(ci)) * 1.2
    ctx.save(); ctx.translate(x0 + i * gap, y); ctx.scale(sc, sc)
    glyph(ctx, 0, 0, ch, size, fade * clamp(ci * 2, 0, 1)); ctx.restore()
  })
}
function shrineTitle(ctx, W, H, u) {
  const inA = clamp(u / 0.12, 0, 1), outA = clamp((1 - u) / 0.12, 0, 1), a = Math.min(inA, outA)
  const cy = H * 0.24, ruleW = W * 0.42 * outE(clamp(u / 0.25, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  // dark band of blood-mist behind the words
  const g = ctx.createLinearGradient(0, cy - H * 0.13, 0, cy + H * 0.13); g.addColorStop(0, 'rgba(10,0,0,0)'); g.addColorStop(0.5, 'rgba(10,0,0,0.75)'); g.addColorStop(1, 'rgba(10,0,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, cy - H * 0.13, W, H * 0.26)
  ctx.fillStyle = '#ff3a3a'
  ctx.fillRect(W / 2 - ruleW, cy - H * 0.105, ruleW * 2, Math.max(2, H * 0.003)); ctx.fillRect(W / 2 - ruleW, cy + H * 0.105, ruleW * 2, Math.max(2, H * 0.003))
  ctx.font = `700 ${Math.round(H * 0.022)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffb0b0'
  ctx.fillText('D O M A I N   E X P A N S I O N', W / 2, cy - H * 0.08)
  ctx.restore()
  const punch = 1 + Math.max(0, 1 - u / 0.06) * 0.5
  ctx.save(); ctx.translate(W / 2, cy - H * 0.01); ctx.scale(punch, punch); glyph(ctx, 0, 0, '伏魔御廚子', H * 0.1, a); ctx.restore()
  ctx.save(); ctx.globalAlpha = a; ctx.font = `600 ${Math.round(H * 0.03)}px Georgia, "Times New Roman", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(255,40,40,0.8)'; ctx.shadowBlur = 10; ctx.fillText('M A L E V O L E N T    S H R I N E', W / 2, cy + H * 0.075); ctx.restore()
}
