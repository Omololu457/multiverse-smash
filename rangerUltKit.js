// rangerUltKit.js — shared cinematic plumbing for the Power Rangers' personal ultimates (2026-11-25, owner: "for the Power Rangers
// go to each one of the Power Rangers — even for the characters that have multiple Power Rangers — and give them all cinematics").
// Holds NO Ranger content (rangerUlts.js is the table). Three tools:
//   1) MORPH CALL (makeRangerCall): a frozen pre-roll (demonSlayerCinematics registerUltPreroll engine — the same freeze contract
//      as the MMPR / Samurai pre-rolls) that plays the frame a Ranger's own ultimate move starts, then hands the world back to that
//      move UNCHANGED (its clock is frozen with everything else, so damage / timing / invuln are the move's own):
//        MORPH  [0,28)   morph flash, Ranger-colour energy helix spirals up the body, the morph call (calligraphy), push-in
//        VISOR  [26,70)  the helmet cut-in: a slashed band, the Ranger's real sprite blown up to a helmet close-up, a visor glint
//                        sweeping across, the Ranger's emblem (S.P.D. badge number / Ninja Storm crest / Dino gem / Omega), the
//                        name + power title card
//        ZORD   [66,104) the Zord / weapon call: the emblem towers behind the Ranger, the Zord name slams across, the element motif
//                        fills the screen, shockwave rings + shake
//        WHIP   [100,120) whip-pan to the foe on speed lines — then the live ultimate resumes
//      Started by a SIM-side watcher (camera.update pass-through = once per simulated frame, the same spy kitUltFrame.js uses):
//      the frame a listed Ranger's ultimate move is first seen. Deterministic (frame-indexed; integer hash noise; no RNG / clock).
//   2) LIVE FRAME: kitUltFrame.js makeKitUltFrame over the live move (contacts → push-ins, impact frame, damage slam).
//   3) makeRangerStrikeUlt: a full frozen cinematic ultimate (bleachUltKit makeCineUlt) for Rangers whose kit had NO ultimate.
import { camera } from './camera.js'
import { registerUltPreroll, startDemonSlayerPreroll, isDemonSlayerPrerollActive } from './demonSlayerCinematics.js'
import { makeKitUltFrame } from './kitUltFrame.js'
import { makeCineUlt, cineHit, sfx, clamp, smooth, outE, hash, ctrX, feet, sprite, animOf, view, punchIn, wash, speedLines, title, sub,
  letterbox, glow, rings, calmMotion, calmFlash, preloadAnims, lerp } from './bleachUltKit.js'
import { toScreen, cx as dcx } from './dsCineKit.js'

export const isUlt = a => !!a && (a.isUltimate || a.category === 'ultimate' || a.name === 'ultimate')
const ez = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k))
const FONT = 'Impact, "Arial Black", sans-serif'
export const T_CALL = 120
const P_VIS = 26, P_ZORD = 66, P_WHIP = 100

// ── emblems ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function emblem(ctx, x, y, r, D, rot = 0, a = 1) {
  if (r <= 1 || a <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.lineJoin = 'round'
  const col = D.col, dark = '#07080e'
  switch (D.emblem) {
    case 'badge': {   // S.P.D. badge: a shield, gold rim, the Ranger's number
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.86, -r * 0.62); ctx.lineTo(r * 0.74, r * 0.3); ctx.lineTo(0, r); ctx.lineTo(-r * 0.74, r * 0.3); ctx.lineTo(-r * 0.86, -r * 0.62); ctx.closePath()
      ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#e8c040'; ctx.stroke(); ctx.lineWidth = r * 0.05; ctx.strokeStyle = col; ctx.stroke()
      ctx.fillStyle = col; ctx.font = `900 ${Math.round(r * 1.05)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(D.num || 'S', 0, r * 0.06)
      ctx.font = `900 ${Math.round(r * 0.26)}px ${FONT}`; ctx.fillStyle = '#e8c040'; ctx.fillText('S.P.D.', 0, -r * 0.62)
      break }
    case 'omega': {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#e8c040'; ctx.stroke()
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${Math.round(r * 1.4)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Ω', 0, r * 0.06)
      break }
    case 'ninja': case 'thunder': case 'samurai': {   // Ninja Storm crest: a ring, three storm blades (or a bolt / a star)
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = r * 0.1; ctx.strokeStyle = col; ctx.stroke()
      ctx.fillStyle = col
      if (D.emblem === 'ninja') for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.quadraticCurveTo(r * 0.7, -r * 0.5, r * 0.18, -r * 0.82); ctx.quadraticCurveTo(r * 0.36, -r * 0.42, 0, -r * 0.12); ctx.fill(); ctx.restore() }
      else if (D.emblem === 'thunder') { ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.8); ctx.lineTo(-r * 0.4, r * 0.1); ctx.lineTo(-r * 0.02, r * 0.1); ctx.lineTo(-r * 0.2, r * 0.8); ctx.lineTo(r * 0.42, -r * 0.14); ctx.lineTo(r * 0.04, -r * 0.14); ctx.closePath(); ctx.fill() }
      else { ctx.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.32 : r * 0.78; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) } ctx.closePath(); ctx.fill() }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill()
      break }
    case 'dino': {   // Dino gem: a gold-framed triangle gem with the three-claw slash
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.92, r * 0.62); ctx.lineTo(-r * 0.92, r * 0.62); ctx.closePath(); ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = r * 0.1; ctx.strokeStyle = '#e8c040'; ctx.stroke()
      const g = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, dark)
      ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.5, r * 0.36); ctx.lineTo(-r * 0.5, r * 0.36); ctx.closePath(); ctx.fillStyle = g; ctx.fill()
      ctx.strokeStyle = dark; ctx.lineWidth = r * 0.07; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.2 - r * 0.1, -r * 0.1); ctx.lineTo(i * r * 0.2 + r * 0.1, r * 0.3); ctx.stroke() }
      break }
    default: { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill() }
  }
  ctx.restore()
}

// ── element motif (screen-wide, the ZORD beat) ───────────────────────────────────────────────────────────────────────
export function motif(ctx, W, H, D, k, ox, oy, z, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'
  const col = D.col
  switch (D.motif) {
    case 'siren': { const ph = (k >> 3) % 2
      for (const [x0, c] of [[0, ph ? '#ff2a2a' : '#2a6bff'], [W * 0.88, ph ? '#2a6bff' : '#ff2a2a']]) { const g = ctx.createLinearGradient(x0, 0, x0 + W * 0.12, 0); g.addColorStop(x0 ? 1 : 0, c); g.addColorStop(x0 ? 0 : 1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a * 0.6; ctx.fillStyle = g; ctx.fillRect(x0, 0, W * 0.12, H) }
      break }
    case 'saber': speedLines(ctx, W, H, ox, oy, 34, 4, 'rgba(255,244,210,0.95)', 0.4 * a, true, k); break
    case 'wind': for (let i = 0; i < 10; i++) { const an = k * 0.16 + i * 0.63, rr = (90 + 40 * (i % 4)) * z; ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.75)' : col; ctx.lineWidth = (3 + (i % 3) * 2) * z
      ctx.beginPath(); ctx.ellipse(ox, oy, rr * 1.6, rr * 0.55, -0.15, an, an + 1.4); ctx.stroke() } break
    case 'earth': for (let i = 0; i < 18; i++) { const u = ((k * 2 + i * 11) % 44) / 44, x = ox + (hash(i, 3) - 0.5) * W * 0.8, y = oy + 90 * z - u * 260 * z, s = (8 + 16 * hash(i, 5)) * z
      ctx.fillStyle = i % 2 ? '#7a5a32' : '#c09a52'; ctx.globalAlpha = a * (1 - u); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 1.2); ctx.lineTo(x + s, y - s * 0.2); ctx.lineTo(x + s * 0.3, y + s * 0.8); ctx.closePath(); ctx.fill() } break
    case 'water': { ctx.strokeStyle = col; ctx.lineWidth = 8 * z; for (let L = 0; L < 3; L++) { ctx.globalAlpha = a * (0.7 - L * 0.2); ctx.beginPath()
      for (let x = -20; x < W + 40; x += 18) { const y = oy + (60 - L * 50) * z - Math.sin(x * 0.012 + k * 0.22 + L) * 26 * z; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
      ctx.fillStyle = 'rgba(200,240,255,0.9)'; for (let i = 0; i < 30; i++) { const u = ((k * 3 + i * 7) % 34) / 34; ctx.beginPath(); ctx.arc(hash(i, 8) * W, oy + 60 * z - u * 220 * z + u * u * 240 * z, (2 + 4 * hash(i, 9)) * z, 0, Math.PI * 2); ctx.fill() } break }
    case 'thunder': if (!calmFlash()) for (let i = 0; i < 4; i++) { if (hash(k >> 1, i + 40) < 0.45) continue
      let x = hash(k >> 1, i) * W, y = 0; ctx.strokeStyle = i % 2 ? '#ffffff' : col; ctx.lineWidth = (i % 2 ? 2 : 7) * z; ctx.beginPath(); ctx.moveTo(x, y)
      while (y < H) { y += 34; x += (hash(y | 0, k + i) - 0.5) * 60; ctx.lineTo(x, y) } ctx.stroke() } break
    case 'blade': for (let i = 0; i < 6; i++) { const u = ((k + i * 7) % 24) / 24, an = -0.8 + i * 0.32, len = W * 0.7 * outE(u), al = 1 - u
      ctx.strokeStyle = `rgba(${D.rgb},${(0.9 * al).toFixed(3)})`; ctx.lineWidth = 9 * z * al; ctx.beginPath(); ctx.moveTo(ox - Math.cos(an) * len / 2, oy - Math.sin(an) * len / 2); ctx.lineTo(ox + Math.cos(an) * len / 2, oy + Math.sin(an) * len / 2); ctx.stroke() } break
    case 'sonic': for (let i = 0; i < 7; i++) { const u = ((k * 1.5 + i * 9) % 60) / 60; ctx.strokeStyle = i % 2 ? '#ffffff' : col; ctx.globalAlpha = a * (1 - u) * 0.8; ctx.lineWidth = (10 - 6 * u) * z
      ctx.beginPath(); ctx.arc(ox, oy, 30 * z + u * W * 0.6, -0.7, 0.7); ctx.stroke(); ctx.beginPath(); ctx.arc(ox, oy, 30 * z + u * W * 0.6, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke() } break
    case 'claw': for (let i = 0; i < 3; i++) { const u = clamp((k % 30) / 10 - i * 0.25, 0, 1); if (u <= 0) continue; ctx.strokeStyle = i === 1 ? '#ffffff' : col; ctx.lineWidth = 14 * z
      const x0 = ox - W * 0.3 + i * 46 * z, y0 = oy - H * 0.3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + W * 0.5 * u, y0 + H * 0.55 * u); ctx.stroke() } break
    case 'barrier': case 'aura': case 'diamond': { const n = 14
      for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + k * 0.03, rr = (120 + 30 * Math.sin(k * 0.2 + i)) * z, x = ox + Math.cos(an) * rr * 1.3, y = oy + Math.sin(an) * rr * 0.8, s = (14 + 8 * hash(i, 2)) * z
        ctx.strokeStyle = col; ctx.fillStyle = `rgba(${D.rgb},0.18)`; ctx.lineWidth = 3 * z; ctx.beginPath()
        if (D.motif === 'barrier') for (let q = 0; q < 6; q++) { const t = q * Math.PI / 3; ctx.lineTo(x + Math.cos(t) * s, y + Math.sin(t) * s) }
        else if (D.motif === 'diamond') { ctx.moveTo(x, y - s * 1.3); ctx.lineTo(x + s * 0.7, y); ctx.lineTo(x, y + s * 1.3); ctx.lineTo(x - s * 0.7, y) }
        else ctx.ellipse(x, y, s * 1.2, s * 0.5, an, 0, Math.PI * 2)
        ctx.closePath(); ctx.fill(); ctx.stroke() } break }
  }
  ctx.restore()
}

// a rising Ranger-colour energy helix around the body (screen coords)
function helix(ctx, bx, top, bot, z, D, k, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let s = 0; s < 2; s++) { ctx.beginPath()
    for (let y = bot; y > top - 40 * z; y -= 4) { const u = (bot - y) / Math.max(1, bot - top), x = bx + Math.sin(u * 9 + k * 0.32 + s * Math.PI) * (34 + 10 * u) * z * 0.6; y === bot ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
    ctx.strokeStyle = s ? '#ffffff' : D.col; ctx.globalAlpha = a * (s ? 0.55 : 0.85); ctx.lineWidth = (s ? 3 : 8) * Math.max(0.7, z * 0.5); ctx.stroke() }
  for (let i = 0; i < 20; i++) { const u = ((k * 2 + i * 13) % 60) / 60, x = bx + (hash(i, 4) - 0.5) * 110 * z * 0.6, y = bot - u * (bot - top + 80 * z)
    ctx.globalAlpha = a * (1 - u); ctx.fillStyle = i % 3 ? D.col : '#ffffff'; ctx.fillRect(x - 2, y - 7, 4, 14) }
  ctx.restore()
}

// the helmet cut-in band (u = 0..1 over the beat)
export function visorBand(ctx, W, H, c, D, V, u, k, dir) {
  const inU = outE(clamp(u * 5, 0, 1)), outU = clamp((u - 0.86) / 0.14, 0, 1), sx = (1 - inU) * -W * dir + outU * W * dir
  const by = H * 0.46, bh = H * 0.36
  ctx.save(); ctx.translate(sx, 0)
  const path = () => { ctx.beginPath(); ctx.moveTo(0, by - bh * 0.46); ctx.lineTo(W, by - bh * 0.58); ctx.lineTo(W, by + bh * 0.44); ctx.lineTo(0, by + bh * 0.56); ctx.closePath() }
  path(); const bg = ctx.createLinearGradient(0, 0, W, 0); ctx.fillStyle = 'rgba(6,7,12,0.93)'; ctx.fill(); bg.addColorStop(0, `rgba(${D.rgb},0.05)`); bg.addColorStop(0.5, `rgba(${D.rgb},0.32)`); bg.addColorStop(1, `rgba(${D.rgb},0.05)`); ctx.fillStyle = bg; ctx.fill()
  ctx.save(); path(); ctx.clip()
  if (!calmMotion()) speedLines(ctx, W, H, dir > 0 ? W * 0.3 : W * 0.7, by, 46, 5, D.col, 0.3, false, k)
  const ex = dir > 0 ? W * 0.3 : W * 0.7
  emblem(ctx, ex, by, bh * 0.62, D, Math.sin(k * 0.05) * 0.08, 0.32)
  // the Ranger's own sprite, blown up so the helmet + chest fill the band (slow push-in)
  const ia = animOf(c, D.pose?.[0]) || animOf(c, 'intro') || animOf(c, 'idle'), fh = (ia && ia.height) || 96
  const sc = (bh * 2.2 / fh) * (1 + 0.08 * u)
  const keys = [...(D.pose || []), 'intro', 'win', 'idle'], m = sprite(ctx, c, keys, 0, ex, by, 1, dir, { raw: true, s: sc, alpha: 0 })   // measure
  if (m) sprite(ctx, c, keys, 0, ex, by + (by - bh * 0.42) - m.top, 1, dir, { raw: true, s: sc })   // helmet top just under the band's top edge
  // the visor glint
  const gx = -W * 0.2 + clamp(u * 1.6 - 0.15, 0, 1) * W * 1.4
  ctx.globalCompositeOperation = 'lighter'
  const lg = ctx.createLinearGradient(gx - 70, 0, gx + 70, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lg; ctx.save(); ctx.transform(1, 0, -0.5, 1, 0, 0); ctx.fillRect(gx + by * 0.5 - 70, by - bh, 140, bh * 2); ctx.restore()
  ctx.restore()
  ctx.strokeStyle = D.col; ctx.lineWidth = H * 0.01
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.46); ctx.lineTo(W, by - bh * 0.58); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, by + bh * 0.56); ctx.lineTo(W, by + bh * 0.44); ctx.stroke()
  // name + power title card
  const tx = dir > 0 ? W * 0.52 : W * 0.06, fs = H * 0.08, tu = outE(clamp(u * 4 - 0.4, 0, 1))
  ctx.globalAlpha = tu; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = `800 ${Math.round(fs * 0.34)}px system-ui, sans-serif`; ctx.fillStyle = D.col; ctx.fillText(V.rank || D.rank, tx + (1 - tu) * 60 * dir, by - fs * 1.05)
  ctx.font = `900 ${Math.round(fs)}px ${FONT}`; { const room = (dir > 0 ? W - tx : W * 0.44) - W * 0.03, tw = ctx.measureText(V.title).width; if (tw > room) ctx.font = `900 ${Math.round(fs * room / tw)}px ${FONT}` }
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#000'; ctx.strokeText(V.title, tx, by - fs * 0.15); ctx.fillStyle = '#ffffff'; ctx.fillText(V.title, tx, by - fs * 0.15)
  ctx.font = `700 ${Math.round(fs * 0.36)}px system-ui, sans-serif`; ctx.fillStyle = '#e8e8f0'; ctx.fillText(`${D.who}  ·  ${V.power || D.power}`, tx, by + fs * 0.62)
  ctx.restore()
}

// the Zord / weapon call (u = 0..1 over the beat)
function zordCall(ctx, W, H, c, D, V, u, k, b, z, dir) {
  const a = clamp(u * 6, 0, 1) * clamp((1 - u) * 5, 0, 1)
  wash(ctx, W, H, `rgba(${D.rgb},1)`, 0.16 * a, 'soft-light')
  const er = H * (0.22 + 0.1 * outE(u)), ex = b.x - dir * W * 0.08, ey = b.y - H * 0.08
  glow(ctx, ex, ey, er * 1.6, D.rgb, 0.45 * a)
  emblem(ctx, ex, ey, er, D, (u - 0.5) * 0.5, 0.55 * a)
  motif(ctx, W, H, D, k, b.x + dir * W * 0.18, b.y, Math.max(0.8, z * 0.6), a)
  const fs = H * 0.13, slide = (1 - outE(clamp(u * 4, 0, 1))) * W * 0.6 * dir
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.round(fs)}px ${FONT}`; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#000'; ctx.strokeText(V.zord, W / 2 - slide, H * 0.68); ctx.fillStyle = D.col; ctx.fillText(V.zord, W / 2 - slide, H * 0.68)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#ffffff'; ctx.fillText(V.zord, W / 2 - slide, H * 0.68)
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.font = `700 ${Math.round(fs * 0.26)}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText(V.zordSub || 'ZORD POWER — ONLINE', W / 2 + slide * 0.5, H * 0.68 + fs * 0.7)
  ctx.restore()
  if (u < 0.5) rings(ctx, b.x, b.y + 40 * z * 0.5, u * 2, 3, W * 0.7, u < 0.12 ? '#ffffff' : D.col, 10, 0.4)
}

// the whole opener painted at screen pose (b = body centre, top / bot = head / feet y) for script frame k of T_CALL
export function drawCall(ctx, W, H, k, c, D, V, b, top, bot, z, dir, opp) {
  if (k < 6 && !calmFlash()) { ctx.save(); ctx.globalAlpha = 0.75 * (1 - k / 6); ctx.fillStyle = D.pale || '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore() }
  helix(ctx, b.x, top, bot, z, D, k, k < P_ZORD ? clamp(k / 8, 0, 1) : clamp(1 - (k - P_ZORD) / 20, 0, 1))
  if (k < 30) { ctx.save(); ctx.globalAlpha = clamp(1 - k / 30, 0, 1) * 0.8; ctx.font = `900 ${Math.round(H * 0.05)}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'
    ctx.strokeText(V.call || D.call, W / 2, H * 0.2); ctx.fillStyle = '#ffffff'; ctx.fillText(V.call || D.call, W / 2, H * 0.2); ctx.restore() }
  if (k >= P_VIS && k < P_ZORD + 4) visorBand(ctx, W, H, c, D, V, (k - P_VIS) / (P_ZORD + 4 - P_VIS), k, dir)
  if (k >= P_ZORD && k < P_WHIP + 4) zordCall(ctx, W, H, c, D, V, (k - P_ZORD) / (P_WHIP + 4 - P_ZORD), k, b, z, dir)
  if (k === P_ZORD || k === P_ZORD + 1) { if (!calmFlash()) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore() } }
  if (k >= P_WHIP) { const u = (k - P_WHIP) / (T_CALL - P_WHIP)
    if (!calmMotion()) speedLines(ctx, W, H, opp ? opp.x : W / 2, opp ? opp.y : H / 2, 60, 9, '#ffffff', 0.5 * (1 - u * 0.6), true, k)
    ctx.save(); ctx.globalAlpha = 0.45 * (1 - u); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 28; i++) ctx.fillRect(0, hash(i, k >> 1) * H, W, 1 + (i % 3)); ctx.restore() }
}

// ── 1) MORPH CALL pre-roll ───────────────────────────────────────────────────────────────────────────────────────────
const CALLS = {}   // rosterKey → D (+ D.moves[moveName] → per-move overrides)
const varOf = (D, f) => { const n = f?.currentAttack?.name; return { ...D, ...((n && D.moves?.[n]) || {}) } }
export function registerRangerCall(key, D) {
  CALLS[key] = D
  registerUltPreroll('rgk:' + key, {
    total: T_CALL, accent: D.col, ink: D.pale || '#ffffff', tint: D.tint || '8,8,16', words: [], restoreCast: true,
    pick(c) { const V = varOf(D, c); return { words: [[4, V.kanji || D.kanji, V.call || D.call]] } },
    pose() {},
    camera(cam, c, opp, f) {
      if (f < P_VIS) { cam.focusOnFighter(c, 1.7 + 0.8 * ez(f / P_VIS)); cam.targetY = (c.y || 0) + (c.h || 100) * 0.35 }
      else if (f < P_ZORD) { cam.focusOnFighter(c, 2.5); cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
      else if (f < P_WHIP) { cam.focusOnFighter(c, 1.6) }
      else { if (opp) { cam.focusBetween ? cam.focusBetween(c, opp, 1.35) : cam.focusOnFighter(opp, 1.4); cam.maxPanStep = 200 } else cam.focusOnFighter(c, 1.3) }
      if (cam.shake && f === P_ZORD) cam.shake(16, 16)
      if (cam.shake && f > P_ZORD && f < P_WHIP && f % 10 === 0) cam.shake(4, 5)
    },
    update(f, { snd }) {
      const p = (id, g) => { try { snd?.playJuiceSfx?.(id, { gain: g }) } catch (_) {} }
      if (f === 1) { p('charge_swell_riser', 0.8); try { snd?.play?.('mz_call') } catch (_) {} }
      if (f === P_VIS) p('swish_fast_02', 0.9)
      if (f === P_VIS + 8) p('sting_pitch_rise_hold', 0.6)
      if (f === P_ZORD) { p('boom_huge_01', 0.9); try { snd?.play?.('mz_zords') } catch (_) {} }
      if (f === P_ZORD + 10) p('rumble_tail_01', 0.6)
      if (f === P_WHIP) p('whoosh_medium_01', 0.9)
    },
    draw(ctx, W, H, f, c, cam, cine) {
      const V = varOf(D, c), dir = c.facing || 1
      const b = toScreen(cam, W, H, dcx(c), (c.y || 0) + (c.h || 100) * 0.5), top = toScreen(cam, W, H, dcx(c), c.y || 0).y, bot = toScreen(cam, W, H, dcx(c), (c.y || 0) + (c.h || 100)).y
      const o = cine?.opponent ? toScreen(cam, W, H, dcx(cine.opponent), (cine.opponent.y || 0) + (cine.opponent.h || 100) * 0.5) : null
      drawCall(ctx, W, H, f, c, D, V, b, top, bot, b.z || 1, dir, o)
    },
  })
}
// the SIM watcher: the first simulated frame a listed Ranger's ultimate move is up → the morph call (once per cast)
function watch(list) {
  for (const f of list) {
    if (!f) continue
    const D = CALLS[f.rosterKey], a = f.attacking ? f.currentAttack : null
    const on = !!(D && a && isUlt(a) && !(D.skip || []).includes(a.name) && !(D.skipSquads || []).includes(f._squad?.id))
    if (on && !f._rgkUlt) {
      f._rgkUlt = 1
      if (!isDemonSlayerPrerollActive() && !(f.health <= 0)) startDemonSlayerPreroll('rgk:' + f.rosterKey, f, list.find(o => o && o !== f && !o.eliminated) || null)
    } else if (!on && f._rgkUlt) f._rgkUlt = 0
  }
}
for (const m of ['update', 'updateMulti']) {
  const orig = camera[m]
  if (typeof orig === 'function' && !orig.__rgkSpy) {
    const w = function (a, b, ...rest) { try { watch(m === 'update' ? [a, b] : (Array.isArray(a) ? a : [])) } catch (_) {} return orig.call(this, a, b, ...rest) }
    w.__rgkSpy = true; Object.keys(orig).forEach(p => { w[p] = orig[p] }); camera[m] = w
  }
}
export const rangerCallKeys = () => Object.keys(CALLS)

// ── 2) LIVE FRAME over the move (solo fighters; the squads' own frames keep theirs) ──────────────────────────────────
export function registerRangerFrames(id, table, skipSquads = []) {
  return makeKitUltFrame({ id, grace: 20, match: f => {
    if (!f || skipSquads.includes(f._squad?.id) || !(f.attacking && isUlt(f.currentAttack))) return null
    const D = table[f.rosterKey]; if (!D || (D.skip || []).includes(f.currentAttack.name)) return null
    const V = varOf(D, f)
    return { title: V.title, kanji: V.kanji || D.kanji, sub: `${D.rank}  ·  ${V.power || D.power}`, who: D.who, col: D.col, rgb: D.rgb, motif: D.frameMotif || D.motif, open: V.open || D.open, close: V.close || D.close }
  } })
}

// ── 3) a full frozen cinematic ultimate for a Ranger whose kit had none ──────────────────────────────────────────────
// cfg = { id, table: { rosterKey: D (+ strike: { hits:[[k, raw, pose]], fin:[k, raw], poses }) }, cost, range }
export function makeRangerStrikeUlt(cfg) {
  const B = { call: 40, dash: 52, fin: 124, after: 132, outAt: 178, total: 186 }
  const C = makeCineUlt({
    id: cfg.id, keys: Object.keys(cfg.table), total: B.total, maxZoom: 2.2, cost: cfg.cost ?? 100,
    gate(f, t) {
      if (!(t.health > 0) || (t.invulnTimer || 0) > 0 || t.isGrabbed) return false
      return Math.abs(ctrX(t) - ctrX(f)) <= (cfg.range || 200) && Math.abs(feet(t) - feet(f)) < 120 ? true : false
    },
    setup(S) { S.D = cfg.table[S.key]; S.land = S.tx0 + S.dir * 170; S.fFace = S.dir; S.tFloor = S.floor; S.real0 = 0 },
    preload(S) { preloadAnims(S.caster, ['ultimate', 'intro', 'win', 'dash', 'run', 'idle', ...S.D.strike.hits.map(h => h[2]), S.D.strike.fin[2]]); preloadAnims(S.target, ['hurt', 'knockdown', 'idle']) },
    beats(S, ctx, k) {
      const D = S.D, st = D.strike
      if (k === 1) { sfx(ctx, 'charge_swell_riser', 0.8); try { ctx?.sound?.play?.('mz_call') } catch (_) {} }
      if (k === 16) sfx(ctx, 'swish_fast_02', 0.9)
      if (k === B.call) sfx(ctx, 'whoosh_medium_01', 0.9)
      for (const [hk, raw] of st.hits) if (k === hk) { cineHit(S, raw, { attacker: true }); sfx(ctx, hk % 2 ? 'impact_hit_01' : 'hit_heavy_boom_01', 0.85); S.hold = 3; S.flashAt = S.real; ctx?.camera?.shake?.(8, 8)}
      if (k === B.dash + 40) { sfx(ctx, 'boom_anticipation_suck', 0.8); try { ctx?.sound?.play?.('mz_zords') } catch (_) {} }
      if (k === B.dash + 48) sfx(ctx, 'charge_hum_rise', 0.7)
      if (k === st.fin[0]) { cineHit(S, st.fin[1], { attacker: true }); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.8); S.hold = 12; S.bigAt = S.real; ctx?.camera?.shake?.(24, 22)}
      if (k === st.fin[0] + 20) sfx(ctx, 'rumble_tail_01', 0.7)
    },
    place(S, k) {
      const st = S.D.strike, hitEnd = st.fin[0]
      if (k < B.call) { S.fx = S.fx0 }
      else if (k < B.dash) S.fx = lerp(S.fx0, S.tx0 - S.dir * 64, outE((k - B.call) / (B.dash - B.call)))
      else if (k < B.dash + 40) { S.fx = S.tx0 - S.dir * 64; S.tx = S.tx0 + S.dir * 6 * Math.min(4, ((k - B.dash) / 10) | 0) }
      else if (k < hitEnd) { S.fx = S.tx0 - S.dir * 64 - S.dir * 90 * outE((k - B.dash - 40) / 12); S.fy = 60 * Math.sin(Math.PI * clamp((k - B.dash - 40) / (hitEnd - B.dash - 40), 0, 1)) }
      else { S.fy = 0; const u = clamp((k - hitEnd) / 40, 0, 1); S.tx = lerp(S.tx0 + S.dir * 24, S.land, outE(u)); S.ty = Math.max(0, 150 * Math.sin(Math.PI * u)) }
    },
    camera(S, cam, k) {
      const f = S.caster, t = S.target
      if (k < B.call) { cam.focusOnFighter(f, 1.8 + 0.5 * smooth(k / B.call)); cam.targetY = (f.y || 0) + (f.h || 94) * 0.35 }
      else if (k < S.D.strike.fin[0] - 10) cam.focusBetween(f, t, 1.55)
      else if (k < S.D.strike.fin[0] + 4) cam.focusOnFighter(t, 1.9)
      else cam.focusBetween(f, t, 1.2)
    },
    finish(S) {},
    draw(ctx, canvas, S) { drawStrike(ctx, canvas, S, B); return true },
  })
  return C
}

function drawStrike(ctx, canvas, S, B) {
  const W = canvas.width, H = canvas.height, f = S.caster, t = S.target, D = S.D, st = D.strike, k = S.frame, r = S.real, dir = S.dir
  const Vw = view(W, H), z = Vw.z, fp = Vw.p(S.fx, S.floor - (S.fy || 0)), tp = Vw.p(S.tx, S.tFloor - (S.ty || 0))
  const fin = st.fin[0]
  wash(ctx, W, H, '#05060c', 0.28, 'multiply'); wash(ctx, W, H, D.col, 0.1, 'soft-light')
  // the foe
  const hurt = k >= fin ? ['knockdown', 'hurt'] : st.hits.some(h => k >= h[0] && k < h[0] + 8) ? ['hurt'] : ['hurt', 'idle']
  sprite(ctx, t, hurt, 0, tp.x, tp.y, z, -dir, { tint: (S.flashAt && r - S.flashAt < 4) ? '#ffffff' : null, tintA: 0.7 })
  // the Ranger
  let pose = ['ultimate', 'intro', 'win', 'idle'], fr = (k >> 3) % 2
  if (k >= B.call && k < B.dash) pose = ['dash', 'run']
  else if (k >= B.dash && k < B.dash + 40) { const h = [...st.hits].reverse().find(x => k >= x[0] - 6) || st.hits[0]; pose = [h[2], 'light', 'heavy']; fr = clamp(((k - h[0] + 6) / 4) | 0, 0, 4) }
  else if (k >= B.dash + 40) { pose = [st.fin[2], 'ultimate', 'heavy']; fr = k < fin ? 0 : 2 }
  if (k >= B.call && k < fin + 10 && !calmMotion()) for (let i = 1; i <= 3; i++) sprite(ctx, f, pose, fr, fp.x - dir * i * 18 * z, fp.y, z, dir, { alpha: 0.4 - i * 0.1, tint: D.col, tintA: 0.85 })
  sprite(ctx, f, pose, fr, fp.x, fp.y, z, dir)
  const b = { x: fp.x, y: fp.y - 55 * z }, tc = { x: tp.x, y: tp.y - 55 * z }
  // opener (morph + visor), compressed into the first B.call frames
  if (k < B.call + 6) drawCall(ctx, W, H, Math.min(P_ZORD - 1, Math.round(k * (P_ZORD - 2) / B.call)), f, D, D, b, fp.y - 110 * z, fp.y, z, dir, tc)
  // flurry contacts
  const lh = [...st.hits].reverse().find(h => k >= h[0]), age = lh ? k - lh[0] : 99
  if (age < 8 && k < fin) { punchIn(ctx, canvas, W, H, tc.x, tc.y, 1 + 0.16 * (1 - age / 8)); glow(ctx, tc.x, tc.y, (50 + 50 * (1 - age / 8)) * z, D.rgb, 0.8 * (1 - age / 8)); motif(ctx, W, H, D, k, tc.x, tc.y, z, 0.8 * (1 - age / 8))
    if (!calmMotion()) speedLines(ctx, W, H, tc.x, tc.y, 26, 7 + age, D.col, 0.35, false, r) }
  // the ZORD call → charge
  if (k >= B.dash + 40 && k < fin) { const u = (k - B.dash - 40) / (fin - B.dash - 40)
    zordCall(ctx, W, H, f, D, D, Math.min(0.95, u * 0.9), k, { x: (b.x + tc.x) / 2, y: b.y }, z, dir)
    // the Zord rushes in from behind the Ranger as a giant glowing emblem-headed comet
    const zx = lerp(dir > 0 ? -W * 0.2 : W * 1.2, tc.x, inE2(u)), zy = lerp(H * 0.25, tc.y, inE2(u)), zr = H * 0.12 * (0.6 + 0.6 * u)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.12 * (10 - i) / 10; ctx.fillStyle = D.col; ctx.beginPath(); ctx.arc(zx - dir * i * zr * 0.45, zy - (zy - H * 0.25) * i * 0.04, zr * (1 - i * 0.05), 0, Math.PI * 2); ctx.fill() }
    ctx.restore(); emblem(ctx, zx, zy, zr, D, u * 3, 1) }
  // the finisher impact
  const bk = S.bigAt != null ? r - S.bigAt : 99
  if (bk < 3 && !calmFlash()) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(0, 0, W, H) }
  else if (bk < 7 && !calmFlash()) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore()
    sprite(ctx, t, ['knockdown', 'hurt'], 0, tp.x, tp.y, z, -dir, { tint: '#000000', tintA: 1 }) }
  if (bk < 40) { rings(ctx, tc.x, tc.y + 40 * z, bk / 40, 4, W * 0.7, bk < 10 ? '#ffffff' : D.col, 12 * z, 0.4); glow(ctx, tc.x, tc.y, 160 * z, D.rgb, 0.6 * (1 - bk / 40)) }
  if (bk >= 3 && bk < 12) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1 + 0.3 * (1 - (bk - 3) / 9))
  // aftermath: the title + damage slam
  if (k >= B.after) title(ctx, W, H, D.title, `${D.who}  ·  ${D.zord}  ·  ${Math.round(S.dmg)} DAMAGE`, clamp((k - B.after) / 46, 0, 1), { y: 0.24, fs: 0.1, band: 'rgba(6,6,12,0.92)', edge: D.col, fill: '#ffffff', stroke: '#000000', subCol: D.col })
  if (k >= B.dash && k < fin) { const n = st.hits.filter(h => k >= h[0]).length; if (n) { ctx.save(); ctx.font = `900 ${Math.round(H * 0.06)}px ${FONT}`; ctx.textAlign = dir > 0 ? 'right' : 'left'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'
    const x = dir > 0 ? W * 0.94 : W * 0.06; ctx.strokeText(`${n} HIT${n > 1 ? 'S' : ''}`, x, H * 0.36); ctx.fillStyle = D.col; ctx.fillText(`${n} HIT${n > 1 ? 'S' : ''}`, x, H * 0.36); ctx.restore() } }
  sub(ctx, W, H, k, B.call, B.dash + 30, D.who, D.open, D.col)
  sub(ctx, W, H, k, B.after + 6, B.outAt, D.who, D.close, D.col)
  letterbox(ctx, W, H, r, k, B.outAt, 8, 0.12)
}
const inE2 = u => { u = clamp(u, 0, 1); return u * u }
