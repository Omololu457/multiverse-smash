// ghostfaceUltFx.js — RENDER-ONLY half of Ghostface's THE FINAL ACT (ghostfaceUlt.js). One screen pass (cineRegistry overlay,
// identity transform) owns the picture while the cinematic runs: world → screen from camera.js's live transform; Ghostface
// (taunt / gfUlt slash strip / gfLunge / gfLowCut / heavy) and the foe from their REAL sheets. A slasher-movie grade:
// film grain + scratches + vignette → the blackout with a flashlight cone → the jump-scare mask (his own sprite, blown up) →
// red-lit kill with slash streaks → the blood moon → impact frames → the clapperboard "CUT!" / THE END? card → letterbox +
// subtitles. PG-13: red slash streaks and a red wash, no gore. Pure functions of the scene frames; noise = integer hash.
// Reduce Flashing → no white/inverted frames or scare flash; Reduce Motion → no jitter / grain flicker.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, glow, rings,
  damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

export function drawGhostfaceUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.hitReal != null ? S.real - S.hitReal : -1
  const spr = S.lastStab ? S.real - S.lastStab.real : 99
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 18 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 18 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor), t0 = V.p(S.tx0, S.tFloor), floorY = fp.y
  const tc = { x: tp.x, y: tp.y - 55 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grade: cold horror desaturation; the blackout; red light for the kill
  desat(ctx, W, H, 0.55)
  wash(ctx, W, H, '#06080e', k < B.darkAt ? 0.45 * smooth(S.real / 16) : 0)
  const dark = k >= B.darkAt && k < B.killAt ? clamp((k - B.darkAt) / 6, 0, 1) : 0
  const red = k >= B.killAt && k < B.cutAt ? 1 : k >= B.cutAt ? clamp(1 - (k - B.cutAt) / 20, 0, 1) : 0
  if (red > 0) { wash(ctx, W, H, '#3a0004', 0.55 * red, 'multiply'); wash(ctx, W, H, '#ff1020', 0.12 * red, 'soft-light') }

  // 2) fighters (the blackout hides them below; the flashlight re-reveals the foe)
  if (k >= B.raiseAt && k < B.finalAt + 30) moon(ctx, W, H, clamp((k - B.raiseAt) / 14, 0, 1) * (k > B.finalAt ? 1 - (k - B.finalAt) / 30 : 1))
  if (k < B.darkAt + 10 || k >= B.killAt) drawGhostface(ctx, S, V, k, fp, B)
  drawFoe(ctx, S, V, k, tp, B)
  if (dark > 0) blackout(ctx, W, H, tc, z, k, dark, B)

  // 3) stab streaks
  if (S.lastStab && spr < 14 && k < B.raiseAt + 4) {
    const a = 1 - spr / 14, ang = [-0.7, 0.8, -0.2, 1.1, -1.0][S.lastStab.i]
    slash(ctx, tc.x, tc.y, ang, 200 * z * outE(Math.min(1, spr / 3)), a, z)
    glow(ctx, tc.x, tc.y, 110 * z, '200,10,20', a * 0.6)
  }
  if (k >= B.killAt && k < B.raiseAt && !calmMotion()) speedLines(ctx, W, H, tc.x, tc.y, 36, 9 + (S.lastStab?.i | 0), '#1a0002', 0.35, true, S.real)
  const kp = k - B.finalAt
  if (pr >= 10 && kp < 40) { const a = clamp(1 - kp / 40, 0, 1); slash(ctx, t0.x, tc.y, -0.5, Math.hypot(W, H) * 0.7, a, 2.2); slash(ctx, t0.x, tc.y + 20 * z, -0.42, Math.hypot(W, H) * 0.6, a * 0.7, 1.4) }
  if (kp >= 0 && kp < 40) rings(ctx, t0.x, floorY - 40 * z, kp / 40, 2, W * 0.6, '#ff3040', 10 * z, 0.4)

  // 4) close-ups
  if (k < B.darkAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 100 * z, 1.15 + 0.4 * smooth(k / 36))
  else if (k >= B.darkAt + 8 && k < B.scareAt) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1.15 + 0.2 * smooth((k - B.darkAt - 8) / 30))
  else if (k >= B.killAt && k < B.raiseAt) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1.3 + (spr < 4 ? 0.15 * (1 - spr / 4) : 0))
  else if (k >= B.raiseAt + 6 && k < B.finalAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 90 * z, 1 + 0.35 * smooth((k - B.raiseAt - 6) / 20))

  // 5) the JUMP SCARE: the mask fills the frame
  if (k >= B.scareAt && k < B.killAt) scare(ctx, W, H, S, k - B.scareAt, B)

  // 6) film grain / scratches / vignette over everything (the movie look)
  film(ctx, W, H, S.real, k < B.cutAt ? 1 : 0.6)

  // 7) titles
  if (k >= 8 && k < B.darkAt) phone(ctx, W, H, k)
  if (k >= B.raiseAt + 4 && k < B.finalAt + 22) title(ctx, W, H, 'THE FINAL ACT', 'GHOSTFACE  ·  “EVERY MOVIE NEEDS A KILLER ENDING”', (k - B.raiseAt - 4) / (B.finalAt + 22 - B.raiseAt - 4),
    { y: 0.2, fs: 0.12, band: 'rgba(6,0,2,0.94)', edge: '#c8101c', fill: '#f4f4f4', stroke: '#5a0008', subCol: '#c8c8c8' })
  if (S.lastStab && spr < 16 && k < B.raiseAt) stabTag(ctx, W, H, S.lastStab.i, spr, dir)

  // 8) impact frames
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, '#000000', '#d01020', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, t0.x, t0.y - H * 0.3, pr - 10, '#ff3040')
  else if (S.lastStab && spr < 40 && k < B.raiseAt + 6) damageNumber(ctx, W, H, S, tc.x - dir * 120 * z, tc.y - H * 0.1, spr + 20, '#ffffff')
  if (k >= B.cutAt) clapper(ctx, W, H, k - B.cutAt, B.outAt + 6 - B.cutAt)

  letterbox(ctx, W, H, S.real, k, B.outAt, 12, 0.13)
  sub(ctx, W, H, k, 2, B.darkAt, 'GHOSTFACE', '“What’s your favourite scary movie?”', '#e8e8e8')
  sub(ctx, W, H, k, B.killAt + 2, B.raiseAt, 'GHOSTFACE', 'STAB!', '#e8e8e8')
  sub(ctx, W, H, k, B.raiseAt + 2, B.finalAt, 'GHOSTFACE', 'Death by a thousand cuts.', '#e8e8e8')
  sub(ctx, W, H, k, B.cutAt + 4, B.outAt + 4, 'GHOSTFACE', 'See you soon!', '#e8e8e8')
  return true
}

function gPose(S, k, B) {
  if (k < B.darkAt) return { keys: ['taunt', 'idle'], fr: k < 24 ? 0 : 1 }
  if (k < B.raiseAt) {
    let i = 0; for (let j = 0; j < B.stabs.length; j++) if (k >= B.stabs[j] - 6) i = j
    const into = k - (B.stabs[i] - 6)
    return [{ keys: ['gfUlt'], fr: into < 6 ? 0 : 1 }, { keys: ['gfLunge'], fr: into < 6 ? 0 : 1 }, { keys: ['gfUlt'], fr: into < 6 ? 3 : 4 },
      { keys: ['gfLowCut'], fr: into < 6 ? 1 : 2 }, { keys: ['heavy'], fr: into < 6 ? 0 : 1 }][i]
  }
  if (k < B.finalAt) return { keys: ['gfUlt'], fr: 5 }
  if (k < B.cutAt) return { keys: ['gfUlt'], fr: 4 }
  return { keys: ['taunt', 'idle'], fr: 1 }
}
function drawGhostface(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, P = gPose(S, k, B), face = S.fFace || S.dir
  const into = k >= B.killAt && k < B.raiseAt ? (k - B.killAt) : 99
  if (into < 10) sprite(ctx, f, P.keys, P.fr, fp.x, fp.y, z, face, { alpha: into / 10, tint: '#000000', tintA: 1 - into / 10 })
  else sprite(ctx, f, P.keys, P.fr, fp.x, fp.y, z, face, { tint: k >= B.raiseAt && k < B.finalAt ? '#000000' : null, tintA: 0.55 })
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, kp = k - B.finalAt
  // in the dark they look around — left… right…
  const look = k >= B.darkAt + 8 && k < B.scareAt ? (((k - B.darkAt - 8) / 12) | 0) % 2 === 0 ? -S.dir : S.dir : -S.dir
  if (kp < 0) {
    const hit = S.lastStab && S.real - S.lastStab.real < 10
    sprite(ctx, t, S.blocked && k >= B.killAt ? ['guard', 'idle'] : hit || k >= B.raiseAt ? ['hurt', 'idle'] : ['idle'], hit ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, look,
      { tint: hit && S.real - S.lastStab.real < 3 ? '#ff2030' : null, tintA: 0.6 }); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, -S.dir); return }
  sprite(ctx, t, kp < 14 ? ['hurt', 'idle'] : ['knockdown', 'hurt'], 9, tp.x, tp.y, z, -S.dir, { tint: kp < 4 ? '#ffffff' : '#600008', tintA: kp < 4 ? 0.8 : 0.25 })
}
function blackout(ctx, W, H, tc, z, k, a, B) {
  ctx.save(); ctx.globalAlpha = a
  // darkness everywhere except a flashlight cone sweeping onto the foe
  const sweep = Math.sin((k - B.darkAt) * 0.12) * 50 * z, cx = tc.x + sweep, cy = tc.y, r = 110 * z
  const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.97)')
  ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.25
  ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.moveTo(cx - 20 * z, -20); ctx.lineTo(cx + 20 * z, -20); ctx.lineTo(cx + r, cy + 50 * z); ctx.lineTo(cx - r, cy + 50 * z); ctx.closePath(); ctx.fill()
  ctx.restore()
}
// the mask fills the frame — his own sprite, blown up, lunging at the lens
function scare(ctx, W, H, S, kk, B) {
  const u = clamp(kk / 5, 0, 1), a = kk < 12 ? 1 : clamp(1 - (kk - 12) / 4, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  if (!calmFlash() && kk < 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
  const sc = (H / 128) * (1.1 + 0.9 * outE(u)), shake = calmMotion() ? 0 : (hash(kk, 3) - 0.5) * 24
  sprite(ctx, S.caster, ['idle'], 0, W / 2 + shake, H * 0.42 + 112 * sc, 1, -S.dir, { raw: true, s: sc })   // head-on: the mask fills the frame
  ctx.restore(); void B
}
function slash(ctx, x, y, ang, len, a, zz) {
  if (a <= 0) return
  const ux = Math.cos(ang), uy = Math.sin(ang)
  ctx.save(); ctx.lineCap = 'round'
  for (const [lw, col, comp] of [[16 * zz, `rgba(150,0,10,${(0.6 * a).toFixed(3)})`, 'source-over'], [6 * zz, `rgba(230,30,40,${a.toFixed(3)})`, 'source-over'], [2 * zz, `rgba(255,230,230,${a.toFixed(3)})`, 'lighter']]) {
    ctx.globalCompositeOperation = comp; ctx.strokeStyle = col; ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(x - ux * len / 2, y - uy * len / 2); ctx.lineTo(x + ux * len / 2, y + uy * len / 2); ctx.stroke()
  }
  ctx.restore()
}
function moon(ctx, W, H, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a
  const x = W * 0.5, y = H * 0.38, r = H * 0.2
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.8); g.addColorStop(0, 'rgba(255,60,50,0.9)'); g.addColorStop(0.55, 'rgba(160,0,10,0.5)'); g.addColorStop(1, 'rgba(60,0,0,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#d82030'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(90,0,8,0.4)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (hash(i, 3) - 0.5) * r * 1.2, y + (hash(i, 4) - 0.5) * r * 1.2, r * (0.08 + hash(i, 5) * 0.12), 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
function film(ctx, W, H, real, a) {
  ctx.save()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${(0.7 * a).toFixed(3)})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  if (!calmMotion()) {
    const fr = real >> 1
    ctx.globalAlpha = 0.08 * a; ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 140; i++) ctx.fillRect(hash(i, fr) * W, hash(i + 500, fr) * H, 2, 2)
    ctx.globalAlpha = 0.18 * a; ctx.fillStyle = '#d8d8d8'
    for (let i = 0; i < 3; i++) if (hash(i, fr + 7) > 0.5) ctx.fillRect(hash(i, fr + 9) * W, 0, 1, H)
  }
  ctx.restore()
}
function phone(ctx, W, H, k) {   // a ringing phone glyph pulsing in the corner
  const a = clamp((k - 8) / 6, 0, 1), ring = (k >> 2) % 2, x = W * 0.12, y = H * 0.24, s = H * 0.05
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x + (ring ? 2 : -2), y)
  ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 0.7, s * 0.8, s * 1.4, s * 0.12); ctx.fill()
  ctx.fillStyle = '#101418'; ctx.fillRect(-s * 0.3, -s * 0.55, s * 0.6, s * 0.95)
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 3
  for (let i = 1; i <= 3; i++) { ctx.globalAlpha = a * (ring ? 1 : 0.4) * (1 - i * 0.2); ctx.beginPath(); ctx.arc(0, 0, s * (0.7 + i * 0.3), -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * (0.7 + i * 0.3), Math.PI - 0.6, Math.PI + 0.6); ctx.stroke() }
  ctx.globalAlpha = a; ctx.font = `800 ${Math.round(H * 0.026)}px system-ui, sans-serif`; ctx.fillStyle = '#e8e8e8'; ctx.textAlign = 'center'; ctx.fillText('UNKNOWN CALLER', 0, s * 1.3)
  ctx.restore()
}
function stabTag(ctx, W, H, i, age, dir) {
  const a = clamp((16 - age) / 6, 0, 1), sc = 1 + Math.max(0, 1 - age / 3) * 0.6, x = W * ((i % 2 ? dir < 0 : dir > 0) ? 0.8 : 0.2)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, H * 0.34); ctx.scale(sc, sc); ctx.rotate((i % 2 ? 1 : -1) * 0.1)
  const fs = Math.round(H * 0.07); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#000'; ctx.strokeText('STAB!', 0, 0); ctx.fillStyle = '#e01828'; ctx.fillText('STAB!', 0, 0); ctx.restore()
}
function clapper(ctx, W, H, kk, life) {
  const a = Math.min(clamp(kk / 6, 0, 1), clamp((life - kk) / 10, 0, 1)), snap = kk < 6 ? (1 - kk / 6) * 0.5 : 0
  const x = W * 0.5, y = H * 0.4, w = H * 0.42, h = H * 0.24
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y)
  ctx.fillStyle = '#111'; ctx.fillRect(-w / 2, -h / 2 + h * 0.18, w, h * 0.82)
  ctx.save(); ctx.translate(-w / 2, -h / 2 + h * 0.18); ctx.rotate(-snap); ctx.fillStyle = '#111'; ctx.fillRect(0, -h * 0.18, w, h * 0.18)
  ctx.fillStyle = '#eee'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * w / 6, -h * 0.18); ctx.lineTo(i * w / 6 + w / 12, -h * 0.18); ctx.lineTo(i * w / 6 + w / 12 - h * 0.1, 0); ctx.lineTo(i * w / 6 - h * 0.1, 0); ctx.closePath(); ctx.fill() }
  ctx.restore()
  ctx.fillStyle = '#eee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.round(h * 0.32)}px Impact, "Arial Black", sans-serif`; ctx.fillText('CUT!', 0, h * 0.2)
  ctx.font = `700 ${Math.round(h * 0.12)}px Georgia, serif`; ctx.fillStyle = '#d01020'; ctx.fillText('THE END?', 0, h * 0.44)
  ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 55 * z, 90, 11 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, ['gfUlt'], 4, fp.x, fp.y, z, S.fFace || -S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
