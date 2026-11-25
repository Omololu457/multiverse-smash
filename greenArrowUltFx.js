// greenArrowUltFx.js — RENDER-ONLY half of Green Arrow's ARROWSTORM PROTOCOL cinematic (greenArrowUlt.js). Two screen passes
// (cineRegistry overlays, identity transform): the frozen ACTIVATION (Oliver from his real sheets — idle / aim / draw / skyward —,
// the foe left to the engine, real close-ups by re-blitting the finished frame) and the LIVE storm frame (wave banners, the LAST
// LIGHT reticle / countdown / push-in / impact frame). Reads state only; noise = integer hash; honours Reduce Flashing / Motion.
import { clamp, smooth, outE, hash, ctrX, feet, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, glow, rings,
  calmMotion, calmFlash, image, ready } from './bleachUltKit.js'
import { getActiveMunitions } from './munitions.js'
import { simTick } from './kitUltFrame.js'

const GREEN = '#3cff7a', CYAN = '#5ff4ff', RED = '#ff3a3a'
const PAYLOAD = { sheet: './ga_payload_drop_sheet.png', frames: 6, width: 61, height: 19 }
const mono = px => `700 ${Math.round(px)}px "Courier New", ui-monospace, monospace`
// a point after punchIn(cx, cy, z)
const pz = (p, cx, cy, z) => ({ x: cx + (p.x - cx) * z, y: cy + (p.y - cy) * z })

function brackets(ctx, x, y, r, col, a, lw, rot = 0) {
  if (a <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'square'
  const s = r * 0.42
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(sx * r, sy * (r - s)); ctx.lineTo(sx * r, sy * r); ctx.lineTo(sx * (r - s), sy * r); ctx.stroke() }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.stroke()
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(dx * r * 0.3, dy * r * 0.3); ctx.lineTo(dx * r * 0.62, dy * r * 0.62); ctx.stroke() }
  ctx.restore()
}
function scan(ctx, W, H, real, a) {   // tactical scanlines + a sweeping bar
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = 0.07 * a; ctx.fillStyle = GREEN
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
  if (!calmMotion()) { ctx.globalAlpha = 0.12 * a; ctx.fillRect(0, (real * 9) % H, W, H * 0.012) }
  ctx.restore()
}
function corners(ctx, W, H, a, col = GREEN) {
  if (a <= 0) return
  const m = H * 0.06, l = H * 0.09
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, H * 0.004)
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y); ctx.stroke() }
  ctx.restore()
}
function stamp(ctx, x, y, text, fs, col, a, rot = -0.08) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot)
  ctx.font = `900 ${Math.round(fs)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0)
  ctx.strokeStyle = col; ctx.lineWidth = fs * 0.06; const w = ctx.measureText(text).width * 0.6; ctx.strokeRect(-w - fs * 0.25, -fs * 0.62, 2 * w + fs * 0.5, fs * 1.24)
  ctx.restore()
}
function panel(ctx, W, H, lines, x, y, a) {   // a monospace tactical readout (typed in)
  if (a <= 0) return
  const fs = H * 0.03, lh = fs * 1.45, w = H * 0.5
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(0,18,8,0.72)'; ctx.fillRect(x, y, w, lh * (lines.length + 1.2))
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, lh * (lines.length + 1.2))
  ctx.fillStyle = GREEN; ctx.fillRect(x, y, w, lh * 0.9)
  ctx.font = mono(fs); ctx.textBaseline = 'middle'; ctx.fillStyle = '#001a08'; ctx.fillText('OVERWATCH // DRONE NET', x + fs * 0.5, y + lh * 0.45)
  lines.forEach((L, i) => { if (!L) return; ctx.fillStyle = L.col || GREEN; ctx.fillText(L.t, x + fs * 0.5, y + lh * (1.5 + i)) })
  ctx.restore()
}

// ── ACTIVATION (frozen) ─────────────────────────────────────────────────────────────────────────────────────────────
export function drawGreenArrowActivation(ctx, canvas, A, GA) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = A.k | 0, f = A.f, t = A.t, dir = A.dir
  if (!f || !t) return false
  const V = view(W, H), z = V.z
  const fp = V.p(ctrX(f), feet(f)), tp = V.p(ctrX(t), feet(t)), tc = { x: tp.x, y: tp.y - 52 * z }
  const shake = A.hold > 0 && !calmMotion() ? { x: (hash(A.real, 1) - 0.5) * 14, y: (hash(A.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(shake.x, shake.y)
  // grade: night over Star City
  wash(ctx, W, H, '#02160a', 0.5, 'multiply'); desat(ctx, W, H, 0.35)
  // Oliver from his real sheets
  let keys = ['idle'], fr = (A.real >> 3) % 4
  if (k >= GA.lockAt && k < GA.drawAt) { keys = ['aim', 'idle']; fr = (A.real >> 3) % 2 }
  else if (k >= GA.drawAt && k < GA.looseAt) { keys = ['draw', 'aim']; fr = Math.floor(clamp((k - GA.drawAt) / (GA.looseAt - GA.drawAt - 4), 0, 1) * 6) }
  else if (k >= GA.looseAt) { keys = ['skyward', 'draw']; fr = 0 }
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir)
  const hand = { x: fp.x + dir * 34 * z, y: fp.y - 78 * z }
  if (k >= GA.drawAt && k < GA.looseAt) {   // the arrowhead charging
    const u = smooth((k - GA.drawAt) / (GA.looseAt - GA.drawAt))
    glow(ctx, hand.x, hand.y, (30 + 70 * u) * z, '60,255,122', 0.35 + 0.55 * u)
    if (!calmMotion()) speedLines(ctx, W, H, hand.x, hand.y, 30, 5, 'rgba(60,255,122,0.9)', 0.25 * u, true, A.real)
  }
  // close-ups (re-blit the finished frame)
  let cz = 1, cc = { x: W / 2, y: H / 2 }
  if (k < GA.lockAt) { cc = { x: fp.x, y: fp.y - 70 * z }; cz = 1.1 + 0.3 * smooth(k / GA.lockAt) }
  else if (k < GA.drawAt) { cc = tc; cz = 1.15 + 0.15 * smooth((k - GA.lockAt) / 30) }
  else if (k < GA.looseAt) { cc = { x: fp.x, y: fp.y - 70 * z }; cz = 1.2 + 0.3 * smooth((k - GA.drawAt) / 30) }
  punchIn(ctx, canvas, W, H, cc.x, cc.y, cz)
  scan(ctx, W, H, A.real, k < GA.looseAt ? 1 : clamp(1 - (k - GA.looseAt) / 12, 0, 1))
  corners(ctx, W, H, k < GA.looseAt ? 0.8 : 0)
  // 1) the drone roster boots
  if (k < GA.lockAt + 4) {
    const rows = [['AEGIS', 'ONLINE'], ['KESTREL', 'ONLINE'], ['OVERWATCH', 'ONLINE'], ['BULWARK', 'ONLINE'], ['PAYLOAD x3', 'ARMED']]
    const lines = rows.map((r, i) => (k >= 4 + i * 6 ? { t: `${r[0].padEnd(11, '.')} ${k >= 7 + i * 6 ? r[1] : '...'}`, col: i === 4 ? '#ffd24a' : GREEN } : null))
    panel(ctx, W, H, lines, dir > 0 ? W * 0.62 : W * 0.06, H * 0.2, clamp(k / 6, 0, 1) * clamp((GA.lockAt + 4 - k) / 4, 0, 1))
  }
  // 2) target lock
  if (k >= GA.lockAt && k < GA.drawAt + 6) {
    const u = outE((k - GA.lockAt) / 20), lk = k >= GA.lockAt + 22, p = pz(tc, cc.x, cc.y, cz)
    const r = (1 - u) * W * 0.45 + 74 * z * cz * u, col = lk ? RED : CYAN
    brackets(ctx, p.x, p.y, r, col, clamp((GA.drawAt + 6 - k) / 6, 0, 1), Math.max(3, H * 0.006), calmMotion() ? 0 : (1 - u) * 1.4)
    ctx.save(); ctx.font = mono(H * 0.028); ctx.fillStyle = col; ctx.textAlign = 'left'
    const nm = String(t.name || t.displayName || t.rosterKey || 'TARGET').toUpperCase()
    ctx.fillText(`TARGET ▸ ${nm}`, p.x + r + 14, p.y - r * 0.6); ctx.fillText(`RANGE  ▸ ${Math.round(Math.abs(ctrX(t) - ctrX(f)))} m`, p.x + r + 14, p.y - r * 0.6 + H * 0.04)
    ctx.fillText(`WIND   ▸ 0.${(k * 7) % 10} kt`, p.x + r + 14, p.y - r * 0.6 + H * 0.08); ctx.restore()
    if (lk) stamp(ctx, p.x, p.y + r + H * 0.06, 'LOCKED', H * 0.06 * (1 + Math.max(0, 1 - (k - GA.lockAt - 22) / 4) * 0.5), RED, 1)
  }
  // 3) LOOSE — the flare arrow streaks into the sky, the squadron crosses, the title
  const lp = k - GA.looseAt
  if (lp >= 0) {
    const sx = fp.x + dir * 20 * z, top = fp.y - 90 * z - outE(lp / 8) * H * 1.2
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
    for (const [lw, c] of [[22 * z, 'rgba(60,255,122,0.25)'], [8 * z, 'rgba(120,255,160,0.8)'], [3 * z, 'rgba(255,255,255,1)']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.globalAlpha = clamp(1 - lp / 26, 0, 1); ctx.beginPath(); ctx.moveTo(sx, fp.y - 90 * z); ctx.lineTo(sx, top); ctx.stroke() }
    ctx.restore()
    if (lp < 18) rings(ctx, sx, fp.y - 90 * z, lp / 18, 2, W * 0.4, GREEN, 8 * z, 0.35)
    // the Payload squadron (real drone strip) crosses the sky behind the title
    const im = image(PAYLOAD.sheet)
    if (ready(im)) for (let i = 0; i < 5; i++) {
      const u = (lp - i * 3) / 26, x = -W * 0.2 + u * W * 1.4 + (i % 2) * W * 0.05, y = H * (0.3 + (i % 3) * 0.05)
      if (u < 0 || u > 1.2) continue
      const s = H / 160, fi = ((A.real >> 2) + i) % PAYLOAD.frames
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.95
      ctx.drawImage(im, fi * PAYLOAD.width, 0, PAYLOAD.width, PAYLOAD.height, x - PAYLOAD.width * s / 2, y - PAYLOAD.height * s / 2, PAYLOAD.width * s, PAYLOAD.height * s)
      ctx.restore(); glow(ctx, x - PAYLOAD.width * s * 0.5, y, 18 * s, '255,160,60', 0.5)
    }
    title(ctx, W, H, 'ARROWSTORM PROTOCOL', 'GREEN ARROW  ·  “EVERY DRONE I’VE GOT — ON MY MARK”', clamp((lp + 2) / 30, 0, 1),
      { y: 0.66, fs: 0.1, band: 'rgba(0,14,6,0.94)', edge: GREEN, fill: '#f2fff4', stroke: '#06381a', subCol: '#bff5cc' })
    if (lp < 3 && !calmFlash()) { ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(-40, -40, W + 80, H + 80) }
    else if (lp < 6 && !calmFlash()) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.globalCompositeOperation = 'source-over' }
  }
  ctx.restore()
  letterbox(ctx, W, H, A.real, k, GA.total - 12, 12, 0.12)
  sub(ctx, W, H, k, 4, GA.lockAt, 'GREEN ARROW', '“Overwatch — give me eyes.”', '#7dff9e')
  sub(ctx, W, H, k, GA.lockAt + 2, GA.drawAt, 'OVERWATCH', 'TARGET ACQUIRED.', CYAN)
  sub(ctx, W, H, k, GA.drawAt + 2, GA.looseAt, 'GREEN ARROW', '“Every drone I’ve got… on my mark.”', '#7dff9e')
  sub(ctx, W, H, k, GA.looseAt + 4, GA.total, 'GREEN ARROW', '“Light ’em up.”', '#7dff9e')
  return true
}

// ── LIVE storm (gameplay keeps running; HUD stays) ─────────────────────────────────────────────────────────────────
const WAVES = { carpet: ['WAVE 1  ·  CARPET LINE', '14 PAYLOAD CHARGES'], hunters: ['WAVE 2  ·  HUNTERS', '4 GUIDED  +  EXPLOSIVE ARROWS'], scatter: ['WAVE 3  ·  SCATTER', '3 CLUSTER BOMBS'] }
export function drawGreenArrowLive(ctx, canvas, f, s, L) {
  const W = canvas?.width || 1280, H = canvas?.height || 720
  const now = simTick(); if (L.t0 == null) L.t0 = now; L.r = now - L.t0   // simulated frames (camera.update count), not render calls
  if (L.phase !== s.phase) { L.phase = s.phase; L.pr = L.r }
  const t = L.t || null, pr = L.r - L.pr
  if (t && L.hp0 == null) L.hp0 = t.health
  // tactical frame for the whole storm
  corners(ctx, W, H, 0.55)
  const wv = WAVES[s.phase]
  if (wv && pr < 80) {   // the wave banner slides in from the left
    const a = clamp(pr / 6, 0, 1) * clamp((80 - pr) / 12, 0, 1), x = -H * 0.6 * (1 - outE(pr / 10)), y = H * 0.2, w = H * 0.62
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, 0)
    ctx.fillStyle = 'rgba(0,16,6,0.82)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.lineTo(w - H * 0.03, y + H * 0.1); ctx.lineTo(0, y + H * 0.1); ctx.closePath(); ctx.fill()
    ctx.fillStyle = GREEN; ctx.fillRect(0, y, H * 0.012, H * 0.1)
    ctx.font = `900 ${Math.round(H * 0.045)}px Impact, "Arial Black", sans-serif`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2fff4'; ctx.fillText(wv[0], H * 0.03, y + H * 0.038)
    ctx.font = mono(H * 0.022); ctx.fillStyle = GREEN; ctx.fillText(wv[1], H * 0.03, y + H * 0.078)
    ctx.restore()
  }
  if (s.phase !== 'lastlight' || !t) return false
  // LAST LIGHT — the finisher
  const lt = s.lt | 0, V = view(W, H), z = V.z, tp = V.p(ctrX(t), feet(t)), tc = { x: tp.x, y: tp.y - 52 * z }
  let big = null; try { big = getActiveMunitions().find(m => m.type === 'big' && m.owner === f) || null } catch (_) {}
  if (big) L.bigSeen = true
  if (L.bigSeen && !big && L.impact == null) L.impact = L.r
  const ip = L.impact != null ? L.r - L.impact : -1
  const lin = clamp(lt / 10, 0, 1) * (ip < 0 ? 1 : clamp(1 - (ip - 40) / 14, 0, 1))
  desat(ctx, W, H, 0.6 * lin * (ip < 0 ? 1 : clamp(1 - ip / 30, 0, 1)))
  wash(ctx, W, H, '#001018', 0.35 * lin, 'multiply')
  // push in on the foe until the bomb lands
  const cz = ip < 0 ? 1 + 0.28 * smooth(lt / 40) : 1 + 0.28 * clamp(1 - ip / 8, 0, 1)
  punchIn(ctx, canvas, W, H, tc.x, tc.y, cz)
  if (ip < 0) {
    const lockU = clamp((lt - 40) / 6, 0, 1), col = lt >= 40 ? RED : CYAN, r = (60 + 50 * (1 - smooth(lt / 40))) * z * cz
    brackets(ctx, tc.x, tc.y, r, col, 0.95, Math.max(3, H * 0.006), calmMotion() ? 0 : (1 - lockU) * lt * 0.05)
    if (big) {   // the falling bomb's streak, straight down the reticle
      const bp = pz(V.p(big.x, big.y), tc.x, tc.y, cz)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,190,90,0.8)'; ctx.lineWidth = 10 * z; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(bp.x, bp.y - H * 0.25); ctx.lineTo(bp.x, bp.y); ctx.stroke(); ctx.restore(); glow(ctx, bp.x, bp.y, 40 * z, '255,180,80', 0.8)
    }
    if (lt < 40) { const n = 3 - Math.floor(lt / 13.4), u = (lt % 13.4) / 13.4; stamp(ctx, W / 2, H * 0.3, String(Math.max(1, n)), H * 0.16 * (1.4 - 0.4 * outE(u * 3)), CYAN, clamp(1.4 - u * 1.4, 0, 1), 0) }
    else title(ctx, W, H, 'LAST LIGHT', 'ONE BOMB  ·  ONE TARGET', clamp((lt - 40) / 90, 0, 0.8), { y: 0.22, fs: 0.12, band: 'rgba(0,10,14,0.92)', edge: CYAN, fill: '#f0feff', stroke: '#003040', subCol: '#bdf6ff' })
  } else {
    if (ip < 3 && !calmFlash()) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, W + 80, H + 80) }
    else if (ip < 8 && !calmFlash()) { ctx.fillStyle = '#000'; ctx.fillRect(-40, -40, W + 80, H + 80); speedLines(ctx, W, H, tc.x, tc.y, 90, 13 + ip, CYAN, 0.9, false, ip); glow(ctx, tc.x, tc.y, 120 * z, '95,244,255', 0.9) }
    if (ip < 34) rings(ctx, tc.x, tp.y - 10 * z, ip / 34, 3, W * 0.7, ip < 10 ? '#ffffff' : '#ffb050', 12 * z, 0.4)
    if (ip >= 4 && ip < 70) {
      const dmg = Math.max(0, Math.round((L.hp0 || 0) - (t.health || 0))), a = clamp((70 - ip) / 14, 0, 1), fs = H * 0.08 * (1 + Math.max(0, 1 - (ip - 4) / 6) * 0.5)
      ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(fs)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#001a08'; ctx.strokeText(`ARROWSTORM  ${dmg}`, W / 2, H * 0.3); ctx.fillStyle = '#7dff9e'; ctx.fillText(`ARROWSTORM  ${dmg}`, W / 2, H * 0.3); ctx.restore()
    }
  }
  letterbox(ctx, W, H, Math.min(lt, 10), 0, 1e9, 14, 0.1 * lin)
  if (ip >= 10) sub(ctx, W, H, ip, 10, 64, 'GREEN ARROW', '“That’s how you hit a target.”', '#7dff9e')
  else if (lt >= 2) sub(ctx, W, H, lt, 2, 40, 'GREEN ARROW', '“Last light. Don’t blink.”', '#7dff9e')
  return false
}
