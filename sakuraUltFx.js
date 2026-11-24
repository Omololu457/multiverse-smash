// sakuraUltFx.js — RENDER-ONLY half of Sakura's BYAKUGŌ · ŌKA SHŌSHŌ — DAICHI NO SAKEBI cinematic (sakuraUlt.js). One
// screen pass (cineRegistry overlay, identity transform) that owns the picture while it runs: world→screen from camera.js,
// both fighters drawn from their real sheets (skins included), the Byakugō manga panel, the pink chakra fist, the
// shattering stage (cracks, heaving slabs, the rock-spike wave and the colossal pillar from her own heavy_down_fx strip),
// the cherry-petal storm (her daichi_fx strip), titles, impact frames, damage pops, letterbox + subtitles.
// Pure functions of the scene's frames; noise = integer hash. Reduce Flashing / Reduce Motion respected.
import { SB, sakuraAt, foeAt } from './sakuraUlt.js'
import { image, ready, hash, clamp, smooth, outE, sprite, view, punchIn, speedLines, calmMotion, calmFlash,
  strip, letterbox, subtitle, lineA, kanjiTitle, damagePops, cracks, glow, rings, wash, desat, portraitPanel, skinned } from './narutoUltFxKit.js'

const PORTRAIT = './sakura_portrait.png'
const DOWN = './sakura_heavy_down_uniform.png', ROCK = './sakura_heavy_down_fx_uniform.png', PETALS = './sakura_daichi_fx_uniform.png'
const PINK = '255,120,180'

export function preloadSakuraUlt(f, t) {
  for (const s of [PORTRAIT, DOWN, ROCK, PETALS]) { image(s); image(skinned(f, s)) }
  for (const k of ['idle', 'charge', 'jump', 'sakuraByakugou', 'sakuraStrike', 'win']) { const a = f?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown']) { const a = t?.animationData?.[k]; if (a?.sheet) image(a.sheet) }
}

export function drawSakuraUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const ir = S.nums?.[0]?.real, pr = ir != null ? S.real - ir : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 14, y: (hash(S.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  const p = sakuraAt(S, k), q = foeAt(S, k)
  const sp = V.p(p.x, p.y), fl = V.p(S.slamX, S.floor), qp = V.p(q.x, q.y)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) grading: a soft pink morning for the resolve; the world drains + blushes pink while the fist gathers / hangs
  if (k < SB.sealAt) wash(ctx, W, H, '#ffd0e4', 0.16 * smooth(S.real / 12), 'soft-light')
  const slowA = k >= SB.gatherAt - 6 && k < SB.impactAt ? smooth((k - SB.gatherAt + 6) / 20) * (k >= SB.apexAt && k < SB.diveAt ? 0.9 : 0.6) : 0
  desat(ctx, W, H, slowA, '#6a2848', 0.35)
  if (k >= SB.impactAt && k < SB.settleAt + 40) wash(ctx, W, H, '#3a1808', 0.25 * (1 - smooth((k - SB.settleAt) / 40)), 'multiply')

  // 2) the ground: crater + cracks across the stage, heaving slabs
  if (k >= SB.impactAt) {
    const u = outE((k - SB.impactAt) / 20)
    ctx.save(); ctx.fillStyle = 'rgba(30,14,6,0.75)'; ctx.beginPath(); ctx.ellipse(fl.x + dir * 20 * z, fl.y + 2, (40 + 120 * u) * z, (8 + 16 * u) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    cracks(ctx, fl.x + dir * 30 * z, fl.y, W * 0.9, clamp((k - SB.impactAt) / 26, 0, 1), 23, 16, '#1a0c06', 'rgba(255,140,190,0.5)')
    slabs(ctx, S, V, k, fl)
  } else if (k >= SB.gatherAt) cracks(ctx, sp.x, V.p(0, S.floor).y, 160 * z, smooth((k - SB.gatherAt) / 40) * 0.5, 7, 8)

  if (k >= SB.impactAt) petalStorm(ctx, S, V, k, fl)
  // 3) rock spikes BEHIND the fighters (the far half of the wave)
  if (k >= SB.waveAt - 8) spikes(ctx, S, V, k, f, false)

  // 4) the fighters
  drawFoe(ctx, S, V, k, qp)
  drawSakura(ctx, S, V, k, sp)

  // 5) rock spikes IN FRONT + the colossal pillar under the foe
  if (k >= SB.waveAt - 8) spikes(ctx, S, V, k, f, true)
  if (k >= SB.pillarAt - 4) pillar(ctx, S, V, k, f)

  // 6) chakra + petals + debris
  const fist = { x: sp.x + dir * 14 * z, y: sp.y - 62 * z }
  if (k >= SB.gatherAt && k < SB.impactAt) {   // the fist: a pink sun
    const u = smooth((k - SB.gatherAt) / 28), hang = k >= SB.apexAt && k < SB.diveAt ? 1.5 : 1
    const fx = k >= SB.leapAt ? sp.x + dir * 6 * z : fist.x, fy = k >= SB.leapAt ? sp.y - (k >= SB.diveAt ? 20 : 90) * z : fist.y
    glow(ctx, fx, fy, (40 + 70 * u * hang) * z, PINK, 0.85 * u); glow(ctx, fx, fy, (14 + 20 * u) * z, '255,255,255', 0.9 * u)
    if (!calmMotion()) petalsIn(ctx, fx, fy, z, k, u)
  }
  if (k >= SB.gatherAt && k < SB.impactAt && !calmMotion()) pebbles(ctx, V.p(S.fx0, S.floor), z, k)
  if (k >= SB.diveAt && k < SB.impactAt) speedLines(ctx, W, H, fl.x, fl.y, 70, 13, '#ffffff', 0.6, true, S.real)
  if (pr >= 0 && pr < 40) rings(ctx, fl.x + dir * 30 * z, fl.y, pr / 40, 700 * z, '#ffd0e4', 3, 0.22, 12 * z)
  if (k >= SB.impactAt && k < SB.settleAt + 30) debris(ctx, S, k, fl, z, H)
  if (k >= SB.settleAt && !calmMotion()) driftPetals(ctx, W, H, k)

  // 7) punch-ins (camera.js caps zoom ≈1.15)
  const head = V.p(S.fx0, S.floor - 80)
  if (k < SB.sealAt) punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.4 * smooth((k - 4) / 30))
  else if (k >= SB.gatherAt + 10 && k < SB.leapAt) punchIn(ctx, canvas, W, H, fist.x, fist.y, 1 + 0.45 * smooth((k - SB.gatherAt - 10) / 20))
  else if (k >= SB.apexAt && k < SB.diveAt) punchIn(ctx, canvas, W, H, sp.x, sp.y - 60 * z, 1.35)
  else if (pr >= 0 && pr < 4) punchIn(ctx, canvas, W, H, fl.x, fl.y - 20 * z, 1.5)

  // 8) the Byakugō panel, titles
  if (k >= SB.sealAt && k < SB.gatherAt) byakugouPanel(ctx, W, H, S, k)
  if (k >= SB.gatherAt + 4 && k < SB.diveAt) kanjiTitle(ctx, W, H, '桜花衝', 'ŌKA SHŌSHŌ · CHERRY BLOSSOM IMPACT', (k - SB.gatherAt - 4) / (SB.diveAt - SB.gatherAt - 4), { side: -dir, fill: '#ffe4f0', stroke: '#5a0a2a', edge: '#ff8ab8' })
  if (k >= SB.waveAt && k < SB.settleAt + 6) kanjiTitle(ctx, W, H, '大地の叫び', 'DAICHI NO SAKEBI · THE EARTH\'S CRY', (k - SB.waveAt) / (SB.settleAt + 6 - SB.waveAt), { side: dir, fill: '#fff0f6', stroke: '#3a0a18', edge: '#ff8ab8', fs: 0.11 })
  if (pr >= 9 && k < SB.waveAt + 6) shannaro(ctx, W, H, pr, dir)

  // 9) impact frames: the fist in the earth → white → inverted
  if (pr >= 4 && pr < 10 && !calmFlash()) {
    const white = pr < 7, bg = white ? '#ffffff' : '#12000a', fg = white ? '#12000a' : '#ffd0e4'
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
    speedLines(ctx, W, H, fl.x, fl.y - 30 * z, 90, 31 + pr, fg, 0.9, false, pr)
    ctx.translate(W / 2, H * 0.62); ctx.scale(2, 2); ctx.translate(-(sp.x + qp.x) / 2, -sp.y)
    strip(ctx, skinned(f, DOWN), 4, 1, sp.x, sp.y, (f.spriteScale || 1.5) * z, { dir, tint: fg })
    sprite(ctx, t, ['hurt', 'idle'], 0, qp.x, qp.y, z, -dir, { tint: fg, tintA: 1 })
    ctx.restore()
  }
  if (!calmFlash() && k >= SB.pillarAt && k < SB.pillarAt + 2) wash(ctx, W, H, '#ffffff', 0.85)
  damagePops(ctx, W, H, S, V, '#ff4f9a')
  ctx.restore()

  // 10) letterbox + subtitles (steady)
  letterbox(ctx, W, H, k, S.real, SB.total)
  subtitle(ctx, W, H, 'SAKURA', "I'm done watching their backs. Now it's MY turn!", lineA(k, 2, SB.sealAt + 4), '#ff8ab8')
  subtitle(ctx, W, H, 'SAKURA', 'CHA! …Never underestimate a medical ninja.', lineA(k, SB.landAt - 6, SB.total - 4), '#ff8ab8')
  return true
}

// ── the fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────
function drawSakura(ctx, S, V, k, sp) {
  const f = S.caster, z = V.z, dir = S.dir, sc = (f.spriteScale || 1.5) * z
  if (k < SB.sealAt) { sprite(ctx, f, ['charge', 'idle'], (S.real >> 3) % 4, sp.x, sp.y, z, dir); glow(ctx, sp.x, sp.y - 50 * z, 90 * z, PINK, 0.25 * smooth(k / 20)); return }
  if (k < SB.gatherAt) { sprite(ctx, f, ['sakuraByakugou', 'charge'], Math.min(8, (k - SB.sealAt) >> 2), sp.x, sp.y, z, dir); return }
  if (k < SB.leapAt) { sprite(ctx, f, ['sakuraByakugou', 'charge'], 8, sp.x, sp.y, z, dir); return }
  if (k < SB.apexAt) { sprite(ctx, f, ['jump', 'idle'], Math.min(2, (k - SB.leapAt) >> 2), sp.x, sp.y, z, dir); return }
  if (k < SB.impactAt) {
    const fr = k < SB.diveAt ? 0 : 1
    if (k >= SB.diveAt && !calmMotion()) for (let g = 4; g >= 1; g--) sprite(ctx, f, ['sakuraStrike', 'idle'], 1, sp.x - dir * g * 10 * z, sp.y - g * 34 * z, z, dir, { alpha: 0.14 * (5 - g), tint: '#ffd0e4', tintA: 0.7 })
    sprite(ctx, f, ['sakuraStrike', 'idle'], fr, sp.x, sp.y, z, dir); return
  }
  if (k < SB.settleAt) { strip(ctx, skinned(f, DOWN), 4, k < SB.impactAt + 26 ? 1 : k < SB.impactAt + 40 ? 2 : 3, sp.x, sp.y, sc, { dir }); return }
  if (k < SB.settleAt + 10) { strip(ctx, skinned(f, DOWN), 4, 0, sp.x, sp.y, sc, { dir }); return }
  sprite(ctx, f, ['win', 'idle'], Math.min(3, (k - SB.settleAt - 10) >> 3), sp.x, sp.y, z, dir)
}
function drawFoe(ctx, S, V, k, qp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked) { sprite(ctx, t, k < SB.impactAt ? ['idle'] : ['guard', 'idle'], 9, qp.x, qp.y, z, fdir); return }
  if (k < SB.impactAt) { sprite(ctx, t, k > SB.diveAt ? ['hurt', 'idle'] : ['idle'], 0, qp.x, qp.y, z, fdir); return }
  if (k < SB.waveAt) { const u = (k - SB.impactAt) / (SB.waveAt - SB.impactAt); sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y + (1 - u) * 2, z, fdir, { sy: 1 - 0.12 * (1 - u), sx: 1 + 0.1 * (1 - u) }); return }
  if (k < SB.landAt) { sprite(ctx, t, ['hurt', 'idle'], 9, qp.x, qp.y, z, fdir, { rot: (k - SB.waveAt) * 0.22 * S.dir }); return }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, qp.x, qp.y, z, fdir)
  if (k < SB.landAt + 22) { const u = (k - SB.landAt) / 22; ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = '#c8a88a'; ctx.beginPath(); ctx.ellipse(qp.x, qp.y, (30 + u * 90) * z, (8 + u * 14) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

// ── the shattered stage ─────────────────────────────────────────────────────────────────────────────────────────────
function slabs(ctx, S, V, k, fl) {   // broken floor plates heaving up around the crater, then settling
  const z = V.z, u = outE((k - SB.impactAt) / 14), down = smooth((k - SB.settleAt - 20) / 40)
  ctx.save()
  for (let i = -5; i <= 8; i++) {
    if (i === 0) continue
    const x = fl.x + S.dir * i * 70 * z + (hash(i, 3) - 0.5) * 20 * z, w = (50 + hash(i, 4) * 40) * z, d = Math.abs(i)
    const lift = u * (1 - down * 0.7) * (60 - d * 5 + hash(i, 5) * 20) * z * clamp((k - SB.impactAt - d * 1.5) / 6, 0, 1)
    if (lift <= 0) continue
    const tilt = (i > 0 ? 1 : -1) * S.dir * (0.25 + hash(i, 6) * 0.35) * u
    ctx.save(); ctx.translate(x, fl.y); ctx.rotate(tilt)
    ctx.fillStyle = '#6b4a32'; ctx.fillRect(-w / 2, -lift, w, lift * 0.5 + 8 * z)
    ctx.fillStyle = '#a07c58'; ctx.fillRect(-w / 2, -lift, w, 6 * z)
    ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -lift, w, lift * 0.5 + 8 * z)
    ctx.restore()
  }
  ctx.restore()
}
function spikes(ctx, S, V, k, f, front) {   // the wave of rock spikes racing out from the fist (her own heavy_down_fx strip)
  const z = V.z, src = skinned(f, ROCK)
  for (let i = -4; i <= 9; i++) {
    if ((i % 2 === 0) !== front) continue
    if (front && i <= 0) continue
    const d = Math.abs(i), born = SB.waveAt - 6 + d * 2, age = k - born
    if (age < 0) continue
    const wx = S.slamX + S.dir * (40 + i * 46), p = V.p(wx, S.floor + (front ? 6 : -4))
    let fr = Math.min(4, age >> 1)
    if (k >= SB.settleAt + d * 2) fr = Math.min(7, 5 + ((k - SB.settleAt - d * 2) >> 3))
    const s = (2.4 + hash(i, 9) * 1.4) * z * (front ? 1.1 : 0.9)
    strip(ctx, src, 8, fr, p.x, p.y, s, { dir: (i + 20) % 3 ? S.dir : -S.dir, alpha: clamp(1 - (k - SB.landAt - d * 2) / 22, 0, 1) })
  }
}
function pillar(ctx, S, V, k, f) {   // the colossal pillar that blasts the foe sky-high
  const z = V.z, age = k - SB.pillarAt + 4, src = skinned(f, ROCK)
  const x = S.blocked ? S.land : foeAt(S, SB.pillarAt).x, p = V.p(x, S.floor + 8)
  let fr = Math.min(4, Math.max(0, age >> 1)); if (k >= SB.settleAt + 16) fr = Math.min(7, 5 + ((k - SB.settleAt - 16) >> 3))
  const grow = outE(clamp(age / 6, 0, 1)), s = 7.5 * z * (0.5 + 0.5 * grow)
  glow(ctx, p.x, p.y - 60 * z, 200 * z, PINK, 0.4 * clamp(1 - (k - SB.pillarAt) / 30, 0, 1))
  strip(ctx, src, 8, fr, p.x, p.y, s, { dir: S.dir, alpha: clamp(1 - (k - SB.landAt - 10) / 24, 0, 1) })
}
function petalsIn(ctx, x, y, z, k, u) {   // petals spiralling into the fist
  ctx.save()
  for (let i = 0; i < 46; i++) {
    const ph = ((k * (0.9 + hash(i, 2) * 0.8) + hash(i, 3) * 40) % 40) / 40, r = (30 + (1 - ph) * 320) * z, a = hash(i, 4) * Math.PI * 2 + ph * 4
    ctx.globalAlpha = u * Math.sin(Math.PI * ph) * 0.9; ctx.fillStyle = i % 3 ? '#ffb0d0' : '#ffe4f0'
    ctx.save(); ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); ctx.rotate(a + ph * 6)
    ctx.beginPath(); ctx.ellipse(0, 0, 5 * z, 2.6 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}
function pebbles(ctx, fp, z, k) {
  ctx.save()
  for (let i = 0; i < 24; i++) {
    const ph = ((k - SB.gatherAt) * 0.7 + hash(i, 5) * 60) % 70 / 70, px = fp.x + (hash(i, 6) - 0.5) * 320 * z, py = fp.y - ph * (100 + hash(i, 7) * 140) * z, sz = (2 + hash(i, 8) * 6) * z
    ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.9; ctx.fillStyle = i % 3 ? '#6b5a48' : '#a89478'
    ctx.save(); ctx.translate(px, py); ctx.rotate(ph * 3 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.8); ctx.restore()
  }
  ctx.restore()
}
function petalStorm(ctx, S, V, k, fl) {   // her daichi_fx petal clouds bursting along the shattered ground
  const z = V.z, src = skinned(S.caster, PETALS), age = k - SB.impactAt
  if (age > 110) return
  for (let i = 0; i < 6; i++) {
    const born = i * 5, a = age - born; if (a < 0) continue
    const x = fl.x + S.dir * (i * 1.3 - 1.5) * 80 * z + (hash(i, 2) - 0.5) * 40 * z, y = fl.y - (30 + hash(i, 3) * 120 + a * 1.1) * z
    const fade = clamp(1 - (a - 26) / 34, 0, 1)
    strip(ctx, src, 4, 1 + ((a >> 3) % 3), x, y, (1.5 + hash(i, 4) * 0.8 + a * 0.012) * z, { ay: 0.5, alpha: fade * 0.8 })
  }
}
function debris(ctx, S, k, fl, z, H) {   // chunks of rock flung up out of the crater
  const age = k - SB.impactAt
  ctx.save()
  for (let i = 0; i < 30; i++) {
    const vx = (hash(i, 1) - 0.5) * 16, vy = -8 - hash(i, 2) * 14, g = 0.5, x = fl.x + vx * age * z * 1.2, y = fl.y + (vy * age + g * age * age) * z
    if (y > fl.y + 10) continue
    const sz = (4 + hash(i, 3) * 10) * z
    ctx.fillStyle = i % 4 ? '#7a5636' : '#b08a60'; ctx.save(); ctx.translate(x, y); ctx.rotate(age * 0.2 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.75); ctx.restore()
  }
  ctx.restore(); void H; void S
}
function driftPetals(ctx, W, H, k) {
  const u = k - SB.settleAt
  ctx.save()
  for (let i = 0; i < 40; i++) {
    const x = ((hash(i, 1) * W * 1.3 + u * (0.6 + hash(i, 2))) % (W * 1.2)) - W * 0.1, y = ((hash(i, 3) * H * 0.4 + u * (1 + hash(i, 4) * 1.5)) % (H * 0.9)), r = H * (0.006 + hash(i, 5) * 0.006)
    ctx.globalAlpha = 0.8 * clamp(u / 20, 0, 1); ctx.fillStyle = i % 3 ? '#ffb0d0' : '#ffe4f0'
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * 0.05 + i); ctx.beginPath(); ctx.ellipse(0, 0, r * 2, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}

// ── panels + call-outs ──────────────────────────────────────────────────────────────────────────────────────────────
function byakugouPanel(ctx, W, H, S, k) {   // the seal releases: a manga panel, the diamond flares, the black marks crawl out
  const u = (k - SB.sealAt) / (SB.gatherAt - SB.sealAt), a = Math.min(clamp((k - SB.sealAt) / 4, 0, 1), clamp((SB.gatherAt - k) / 6, 0, 1))
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.05, W / 2, H / 2, H * 0.9); g.addColorStop(0, '#4a1030'); g.addColorStop(1, '#0a0208')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  speedLines(ctx, W, H, W / 2, H * 0.42, 70, 5, '#ff8ab8', 0.35, true, S.real)
  // the panel: head + shoulders, huge
  const ph = H * 0.74, pw = ph * 0.78, px = W / 2 - pw / 2 + (1 - outE(u / 0.2)) * W * 0.5 * S.dir, py = H * 0.12
  const crop = [6, 0, 34, 40], zoom = 1 + 0.1 * smooth(u)
  const ok = portraitPanel(ctx, PORTRAIT, crop, px, py, pw, ph, { dir: S.dir, zoom, bg: '#2a0a1a',
    bgFn: (x, y, w, h) => { ctx.fillStyle = 'rgba(255,138,184,0.12)'; for (let yy = y; yy < y + h; yy += 12) for (let xx = x + ((yy / 12) & 1) * 6; xx < x + w; xx += 12) ctx.fillRect(xx, yy, 4, 4) } })
  if (ok) {
    // where the brow lands: crop px (21, 8) → panel space
    const s = Math.max(pw / crop[2], ph / crop[3]) * zoom, cxp = px + pw / 2, cyp = py + ph / 2
    const bx = cxp + S.dir * (21 + 0.5 - (crop[0] + crop[2] / 2)) * s, by = cyp + (8.5 - (crop[1] + crop[3] / 2)) * s
    const flare = smooth((k - SB.sealAt - 6) / 10)
    // the Byakugō marks: black chakra lines crawling out of the diamond over the panel
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip()
    const grow = smooth((k - SB.sealAt - 10) / 34)
    ctx.strokeStyle = '#0a0006'; ctx.lineCap = 'round'
    for (let i = 0; i < 16; i++) {
      let x = bx, y = by; const ang0 = Math.PI * 0.5 + (i / 16 - 0.5) * Math.PI * 1.9 + (hash(i, 2) - 0.5) * 0.2, segs = 10
      ctx.lineWidth = Math.max(2, s * (0.55 - (i % 3) * 0.12)); ctx.beginPath(); ctx.moveTo(x, y)
      for (let j = 0; j < segs * grow; j++) { const ang = ang0 + (j % 2 ? 0.5 : -0.5) * (hash(i, j) * 0.8); x += Math.cos(ang) * s * 2.2; y += Math.sin(ang) * s * 2.2; ctx.lineTo(x, y) }
      ctx.stroke()
    }
    ctx.restore()
    // the diamond
    glow(ctx, bx, by, s * 16 * (0.6 + flare), '200,120,255', 0.9 * flare)
    ctx.save(); ctx.translate(bx, by); const d = s * (0.9 + 0.6 * flare)
    ctx.fillStyle = '#8a3cff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, s * 0.25)
    ctx.beginPath(); ctx.moveTo(0, -d * 1.3); ctx.lineTo(d, 0); ctx.lineTo(0, d * 1.3); ctx.lineTo(-d, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
  }
  ctx.restore()
  if (k >= SB.sealAt + 12) kanjiTitle(ctx, W, H, '百豪の術', 'BYAKUGŌ NO IN · STRENGTH OF A HUNDRED SEAL', (k - SB.sealAt - 12) / (SB.gatherAt - SB.sealAt - 8), { side: S.dir, fill: '#f0e0ff', stroke: '#2a0a3a', edge: '#b07cff' })
}
function shannaro(ctx, W, H, pr, dir) {   // the battle cry, stamped
  const su = clamp((pr - 9) / 5, 0, 1), sc = 1 + (1 - su) * 1.2, a = clamp(1 - (pr - 50) / 14, 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * (dir > 0 ? 0.3 : 0.7), H * 0.26); ctx.rotate(-0.08 * dir); ctx.scale(sc, sc)
  const fs = Math.round(H * 0.12)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#3a0016'; ctx.strokeText('SHANNARO!!', 0, 0)
  ctx.lineWidth = fs * 0.08; ctx.strokeStyle = '#ffffff'; ctx.strokeText('SHANNARO!!', 0, 0)
  ctx.fillStyle = '#ff4f9a'; ctx.fillText('SHANNARO!!', 0, 0)
  ctx.restore()
}
