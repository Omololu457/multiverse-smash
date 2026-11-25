// kitUltFrame.js — a RENDER-ONLY cinematic frame for ultimates that live inside a character's own kit state machine (the Ranger
// squads' sSuper / Duplicate Raid / Final Strike never reach abilities.triggerUltimate, and freezing them would stall the kit's
// own move clock). It never writes game state: it watches the fighters (camera.update / updateMulti are wrapped pass-through to
// learn who is fighting — the same p1 / p2 the camera frames) and while a fighter's ultimate move runs it paints:
//   OPENING   letterbox in, the form's colour grade, a big cut-in of the Ranger (their real sprite) on a slashed band with the
//             technique name + kanji, a push-in on the caster
//   CONTACTS  every hit that lands (read from the foe's health): a push-in pulse on the foe, a form-coloured rim flash, the
//             form's motif (wind arcs / rocks / water / bolts / blade slashes / siren bars / afterimages / saber light), a hit tally;
//             the biggest contact gets a white → inverted impact frame + shockwave rings
//   FINISH    the move ends → the technique + total damage slam in, the closing line, letterbox out
// makeKitUltFrame(cfg): cfg = { id, match(f) → form-config | null (non-null only while f's ultimate move runs), grace }
// form-config: { title, kanji, sub, who, col, rgb, motif, open, close }
// Deterministic sim untouched (reads only); visual noise = integer hash.
import { camera } from './camera.js'
import { registerCineScreen } from './cineRegistry.js'
import { clamp, smooth, outE, hash, ctrX, feet, view, sprite, punchIn, wash, title, sub, letterbox, glow, rings, speedLines, calligraphy,
  calmMotion, calmFlash, animOf } from './bleachUltKit.js'

// ── who is fighting (render-side discovery; pass-through wrappers) ──
const SEEN = { list: [], tick: 0 }   // tick = camera.update calls = one per simulated frame (the render rate never matters)
for (const m of ['update', 'updateMulti']) {
  const orig = camera[m]
  if (typeof orig === 'function' && !orig.__kitUltSpy) {
    const w = function (a, b, ...rest) { try { SEEN.list = m === 'update' ? [a, b] : (Array.isArray(a) ? a.slice() : []); SEEN.tick++ } catch (_) {} SEEN.inUpd = true; try { return orig.call(this, a, b, ...rest) } finally { SEEN.inUpd = false } }
    w.__kitUltSpy = true; camera[m] = w
  }
}
// camera.advance = the camera held in place (a frozen cinematic, or a live ultimate that holds the ground shot — Homelander's
// Flight 37 / Omni-Man's Escape Velocity). Counted separately: frames opted in with cfg.advanceTicks also run on it.
SEEN.adv = 0
{ const orig = camera.advance
  if (typeof orig === 'function' && !orig.__kitUltSpy) { const w = function (...a) { if (!SEEN.inUpd) SEEN.adv++; return orig.apply(this, a) }; w.__kitUltSpy = true; camera.advance = w } }
export const liveFighters = () => SEEN.list.filter(Boolean)
export const simTick = () => SEEN.tick
const foeOf = f => liveFighters().find(o => o && o !== f && !o.eliminated) || null

export function makeKitUltFrame(cfg) {
  const RUN = new Map(), GRACE = cfg.grace ?? 20, FIN = 64
  let lastTick = SEEN.tick, lastAdv = SEEN.adv, stall = 0
  registerCineScreen(cfg.id, (ctx, canvas) => {
    const fs = liveFighters(), adv = cfg.advanceTicks && RUN.size ? SEEN.adv - lastAdv : 0
    const dt = Math.max(0, Math.min(30, SEEN.tick - lastTick + adv)); lastTick = SEEN.tick; lastAdv = SEEN.adv
    for (const f of fs) {
      let fc = null; try { fc = cfg.match(f) } catch (_) {}
      let R = RUN.get(f)
      if (fc && (!R || (R.endR != null && R.r - R.endR > 8))) { const t = foeOf(f); R = { fc, r: 0, last: 0, t, hp0: t?.health ?? 0, hpPrev: t?.health ?? 0, hits: [], big: null, endR: null }; RUN.set(f, R) }
      if (!R) continue
      R.r += dt
      if (fc) R.last = R.r
      else if (R.endR == null && R.r - R.last > GRACE) R.endR = R.r
      if (R.endR != null && R.r - R.endR > FIN) { RUN.delete(f); continue }
      const t = R.t
      if (t) { const d = (R.hpPrev || 0) - (t.health || 0); if (d > 0.5 && R.endR == null) { R.hits.push({ r: R.r, d }); if (!R.big || d > R.big.d) { if (d >= 40) R.big = { r: R.r, d } } } R.hpPrev = t.health }
    }
    for (const k of [...RUN.keys()]) if (!fs.includes(k)) RUN.delete(k)
    let any = false
    stall = dt > 0 ? 0 : stall + 1
    // the sim clock stopped (another frozen cinematic owns the screen, or the game is paused) → stay out of its picture
    if (stall < 6) for (const [f, R] of RUN) { try { draw(ctx, canvas, f, R) } catch (_) {} any = true }
    return false && any   // live gameplay: the HUD stays
  })
  return { active: () => RUN.size > 0, status: () => [...RUN.values()].map(R => ({ r: R.r, hits: R.hits.length, dmg: Math.round((R.hp0 || 0) - (R.t?.health || 0)), ended: R.endR != null })) }
}

// ── drawing ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function draw(ctx, canvas, f, R) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, fc = R.fc, r = R.r, t = R.t
  const V = view(W, H), z = V.z, fp = V.p(ctrX(f), feet(f)), fc0 = { x: fp.x, y: fp.y - 60 * z }
  const tp = t ? V.p(ctrX(t), feet(t)) : null, tc = tp ? { x: tp.x, y: tp.y - 55 * z } : fc0
  const end = R.endR != null ? r - R.endR : -1, live = end < 0
  const fade = live ? clamp(r / 8, 0, 1) : clamp(1 - (end - 40) / 20, 0, 1)
  const dir = f.facing || 1
  // grade
  wash(ctx, W, H, fc.col, 0.13 * fade, 'soft-light'); wash(ctx, W, H, '#05060c', 0.22 * fade, 'multiply')
  // push-ins: on the caster for the opening, pulses on the foe per contact
  const last = R.hits[R.hits.length - 1], age = last ? r - last.r : 99
  if (r < 34 && live) punchIn(ctx, canvas, W, H, fc0.x, fc0.y, 1 + 0.28 * Math.sin(Math.PI * clamp(r / 34, 0, 1)))
  else if (age < 9 && live) punchIn(ctx, canvas, W, H, tc.x, tc.y, 1 + 0.14 * (1 - age / 9))
  // motif around the action
  if (live || end < 24) motif(ctx, W, H, fc, f, fp, tc, z, r, R, dir, fade)
  // contacts: rim flash + spark + tally
  if (last && age < 10) {
    const a = 1 - age / 10
    ctx.save(); ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = fc.col; ctx.lineWidth = H * 0.03; ctx.strokeRect(0, 0, W, H); ctx.restore()
    glow(ctx, tc.x, tc.y, (60 + 40 * (1 - a)) * z, fc.rgb, 0.7 * a)
    if (!calmMotion()) speedLines(ctx, W, H, tc.x, tc.y, 22, 7 + R.hits.length, fc.col, 0.3 * a, false, r)
  }
  if (R.hits.length && live) {
    const n = R.hits.length, pop = age < 6 ? 1 + 0.4 * (1 - age / 6) : 1, fs = H * 0.06 * pop
    ctx.save(); ctx.font = `900 ${Math.round(fs)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'
    const x = dir > 0 ? W * 0.94 : W * 0.06
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#000'; ctx.strokeText(`${n} HIT${n > 1 ? 'S' : ''}`, x, H * 0.36); ctx.fillStyle = fc.col; ctx.fillText(`${n} HIT${n > 1 ? 'S' : ''}`, x, H * 0.36); ctx.restore()
  }
  // the biggest contact → impact frame
  const bk = R.big ? r - R.big.r : 99
  if (bk < 2 && !calmFlash()) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, 0, W, H) }
  else if (bk >= 2 && bk < 5 && !calmFlash()) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore() }
  if (bk < 30) rings(ctx, tc.x, tc.y + 40 * z, bk / 30, 3, W * 0.55, bk < 8 ? '#ffffff' : fc.col, 10 * z, 0.4)
  // opening cut-in
  if (r < 34 && live) cutIn(ctx, W, H, f, fc, r, dir)
  // finish card
  if (!live && end < 56) {
    const dmg = Math.max(0, Math.round((R.hp0 || 0) - (t?.health || 0)))
    title(ctx, W, H, fc.title, `${fc.sub}  ·  ${dmg} DAMAGE`, clamp(end / 56, 0, 1), { y: 0.24, fs: 0.1, band: 'rgba(6,6,12,0.92)', edge: fc.col, fill: '#ffffff', stroke: '#000000', subCol: fc.col })
  }
  letterbox(ctx, W, H, Math.min(r, 10), 0, 1e9, 14, 0.11 * fade)
  if (live && r < 60 && fc.open) sub(ctx, W, H, r, 4, 60, fc.who, fc.open, fc.col)
  if (!live && fc.close) sub(ctx, W, H, end, 4, 56, fc.who, fc.close, fc.col)
}
// a slashed band from the side with the Ranger's real sprite blown up + the technique + kanji
function cutIn(ctx, W, H, f, fc, r, dir) {
  const inU = outE(clamp(r / 8, 0, 1)), outU = clamp((r - 26) / 8, 0, 1), sx = (1 - inU) * W * dir * -1 + outU * W * dir
  const by = H * 0.3, bh = H * 0.28, ia = animOf(f, 'intro') || animOf(f, 'idle'), sc = (bh * 1.15) / ((ia && ia.height) || 112)
  ctx.save(); ctx.translate(sx, 0)
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.5); ctx.lineTo(W, by - bh * 0.62); ctx.lineTo(W, by + bh * 0.45); ctx.lineTo(0, by + bh * 0.55); ctx.closePath()
  ctx.fillStyle = 'rgba(6,6,12,0.88)'; ctx.fill(); ctx.save(); ctx.clip()
  if (!calmMotion()) speedLines(ctx, W, H, dir > 0 ? W * 0.25 : W * 0.75, by, 40, 3, fc.col, 0.35, false, r)
  sprite(ctx, f, ['intro', 'taunt', 'idle'], (r >> 2) % 4, dir > 0 ? W * 0.27 : W * 0.73, by + bh * 0.62, 1, dir, { raw: true, s: sc })
  ctx.restore()
  ctx.strokeStyle = fc.col; ctx.lineWidth = H * 0.008
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.5); ctx.lineTo(W, by - bh * 0.62); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, by + bh * 0.55); ctx.lineTo(W, by + bh * 0.45); ctx.stroke()
  const tx = dir > 0 ? W * 0.47 : W * 0.06, fs = H * 0.075
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 ${Math.round(fs)}px Impact, "Arial Black", sans-serif`
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#000'; ctx.strokeText(fc.title, tx, by - fs * 0.2); ctx.fillStyle = '#ffffff'; ctx.fillText(fc.title, tx, by - fs * 0.2)
  ctx.font = `700 ${Math.round(fs * 0.36)}px system-ui, sans-serif`; ctx.fillStyle = fc.col; ctx.fillText(fc.sub, tx, by + fs * 0.62)
  ctx.restore()
  if (fc.kanji) calligraphy(ctx, W, H, fc.kanji, clamp(r / 40, 0, 1), { x: dir > 0 ? 0.92 : 0.08, y: 0.5, size: 0.09, col: fc.col })
}
function motif(ctx, W, H, fc, f, fp, tc, z, r, R, dir, a) {
  const cx = (fp.x + tc.x) / 2, gy = fp.y
  ctx.save(); ctx.globalAlpha = a
  switch (fc.motif) {
    case 'wind': {   // swirling arcs round the foe
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) { const ang = r * 0.18 + i * 1.05, rr = (50 + 20 * (i % 3)) * z; ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.7)' : fc.col; ctx.lineWidth = (3 + (i % 3)) * z
        ctx.beginPath(); ctx.ellipse(tc.x, tc.y, rr * 1.4, rr * 0.6, 0, ang, ang + 1.3); ctx.stroke() }
      break }
    case 'earth': {  // rocks heaving up under the foe
      for (let i = 0; i < 10; i++) { const u = ((r * 2 + i * 13) % 40) / 40, x = tc.x + (hash(i, 3) - 0.5) * 160 * z, y = gy - u * 140 * z, s = (6 + 10 * hash(i, 5)) * z
        ctx.fillStyle = i % 2 ? '#7a5a32' : '#b08a4a'; ctx.globalAlpha = a * (1 - u); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 1.2); ctx.lineTo(x + s, y - s * 0.2); ctx.lineTo(x + s * 0.3, y + s * 0.8); ctx.closePath(); ctx.fill() }
      break }
    case 'water': {  // droplets + a curling wave line
      ctx.strokeStyle = fc.col; ctx.lineWidth = 5 * z; ctx.beginPath()
      for (let x = -W * 0.1; x < W * 1.1; x += 20) { const y = gy - 20 * z - Math.sin(x * 0.02 + r * 0.25) * 16 * z; x === -W * 0.1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke()
      ctx.fillStyle = 'rgba(190,235,255,0.85)'
      for (let i = 0; i < 18; i++) { const u = ((r * 3 + i * 7) % 30) / 30, x = tc.x + (hash(i, 8) - 0.5) * 220 * z, y = tc.y + 40 * z - u * 120 * z + u * u * 160 * z
        ctx.beginPath(); ctx.arc(x, y, (2 + 3 * hash(i, 9)) * z, 0, Math.PI * 2); ctx.fill() }
      break }
    case 'thunder': { // bolts down onto the foe
      if (!calmFlash()) for (let i = 0; i < 2; i++) { if (hash(r >> 1, i + 40) < 0.5) continue
        let x = tc.x + (hash(r, i) - 0.5) * 60 * z, y = 0; ctx.strokeStyle = i ? '#ffffff' : fc.col; ctx.lineWidth = (i ? 2 : 6) * z; ctx.beginPath(); ctx.moveTo(x, y)
        while (y < tc.y) { y += 30 * z; x += (hash(y | 0, r) - 0.5) * 40 * z; ctx.lineTo(x, y) } ctx.stroke() }
      break }
    case 'blade': {   // crossing slash streaks through the foe
      ctx.lineCap = 'round'
      for (let i = 0; i < 3; i++) { const u = ((r + i * 9) % 27) / 27, ang = -0.6 + i * 0.6, len = 260 * z * outE(u), al = 1 - u
        ctx.strokeStyle = `rgba(${fc.rgb},${(0.85 * al).toFixed(3)})`; ctx.lineWidth = 6 * z * al; ctx.beginPath(); ctx.moveTo(tc.x - Math.cos(ang) * len / 2, tc.y - Math.sin(ang) * len / 2); ctx.lineTo(tc.x + Math.cos(ang) * len / 2, tc.y + Math.sin(ang) * len / 2); ctx.stroke() }
      break }
    case 'siren': {   // red / blue S.P.D. emergency light bars sweeping the screen edges
      const ph = (r >> 3) % 2
      for (const [x0, c] of [[0, ph ? '#ff2a2a' : '#2a6bff'], [W - W * 0.08, ph ? '#2a6bff' : '#ff2a2a']]) { const g = ctx.createLinearGradient(x0, 0, x0 + W * 0.08, 0); g.addColorStop(x0 ? 1 : 0, c); g.addColorStop(x0 ? 0 : 1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a * 0.5; ctx.fillStyle = g; ctx.fillRect(x0, 0, W * 0.08, H) }
      ctx.globalAlpha = a * 0.18; ctx.strokeStyle = fc.col; ctx.lineWidth = 1.5
      for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { const hx = W * 0.1 + i * W * 0.1 + (j % 2) * W * 0.05, hy = H * 0.15 + j * H * 0.17, s = H * 0.045; ctx.beginPath(); for (let q = 0; q < 6; q++) { const an = q * Math.PI / 3; q ? ctx.lineTo(hx + Math.cos(an) * s, hy + Math.sin(an) * s) : ctx.moveTo(hx + Math.cos(an) * s, hy + Math.sin(an) * s) } ctx.closePath(); ctx.stroke() }
      break }
    case 'clone': {   // ninja afterimages of the Ranger
      for (let i = 1; i <= 3; i++) sprite(ctx, f, ['idle'], (r >> 2) % 4, fp.x - dir * i * 26 * z, fp.y, z, dir, { alpha: a * (0.45 - i * 0.1), tint: fc.col, tintA: 0.8 })
      break }
    case 'saber': {   // white-gold light streaming off the saber
      if (!calmMotion()) speedLines(ctx, W, H, cx, fp.y - 70 * z, 30, 4, 'rgba(255,240,200,0.9)', 0.25, true, r)
      glow(ctx, fp.x + dir * 30 * z, fp.y - 80 * z, 60 * z, fc.rgb, 0.5 + 0.2 * Math.sin(r * 0.4))
      break }
  }
  ctx.restore(); void smooth
}
