// screenBreaker.js — SCREEN BREAKER, an in-game finisher (no cutaway). In the match-end FINISH window the winner
// inputs GRAB then SPECIAL (or GRAB then DOWN, or both at once): they walk up to the beaten opponent, lift them over
// their head, and hurl them AT THE CAMERA — the body tumbles toward the viewer, growing until it slams into the
// screen, the glass cracks into a spider-web, and the body slides down the inside of the screen leaving a smear.
// The fighters are the real in-game sprites (two generic presentation hooks in sprite.js: _fxRenderScale, _fxRot).
// Purely cosmetic: it only runs after the match is decided (loser at 0 HP) and hands back to the victory screen.
// Frame-driven; the world→screen transform is captured while the fighters are drawn (screenBreakerWorld).
import { sound } from "./sound.js"
import { camera } from "./camera.js"

const APPROACH = 22, LIFT = 48, WIND = 58, IMPACT = 92, SLIDE_END = 175, END = 235
let S = null
let _in = { grab: false, special: false, down: false, grabAt: -99, t: 0 }
export const screenBreakerActive = () => !!S && S.phase !== "done"
export const screenBreakerDone = () => !!S && S.phase === "done"
export const screenBreakerState = () => S ? { phase: S.phase, t: S.t, crack: !!S.crack, scale: +(S.v._fxRenderScale || 1).toFixed(2) } : { phase: null }
export function clearScreenBreaker() { if (S) for (const f of [S.w, S.v]) { f._fxRenderScale = 0; f._fxRot = 0 } S = null; _in = { grab: false, special: false, down: false, grabAt: -99, t: 0 } }

// FINISH-window input: GRAB, then SPECIAL or DOWN within ~0.6 s (or pressed together). Call once per frame.
export function screenBreakerInput(raw) {
  raw = raw || {}; _in.t++
  const g = !!raw.grab, sp = !!raw.special, dn = !!raw.down
  if (g && !_in.grab) _in.grabAt = _in.t
  const hit = ((sp && !_in.special) || (dn && !_in.down) || (g && !_in.grab && (sp || dn))) && _in.t - _in.grabAt <= 36
  _in.grab = g; _in.special = sp; _in.down = dn
  return hit
}
const has = (f, a) => !!(f._skinAnim?.[a] || f.animationData?.[a])
export function startScreenBreaker(winner, victim) {
  if (!winner || !victim) return false
  S = { phase: "run", t: 0, w: winner, v: victim, M: null, x0: victim.x, gy: (victim.groundY ?? 520), start: null, crack: null, smear: [] }
  winner.vx = 0; victim.vx = 0; victim.knockdownState = true; victim.knockdownTimer = 999
  sbWhoosh(0.2)
  return true
}
// world layer: called for each fighter while the camera transform is applied
export function screenBreakerWorld(c, f) { if (S && f === S.v) try { S.M = c.getTransform() } catch (_) {} }

const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u)
function centerOf(f) { return { x: (f._lastDrawX ?? f.x) + (f._lastDrawW || f.w || 50) / 2, y: (f._lastDrawY ?? f.y) + (f._lastDrawH || f.h || 100) / 2 } }
function toScreen(p) { const M = S.M; return M ? { x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f } : p }
function toWorld(p) { const M = S.M; if (!M) return p; const i = M.inverse(); return { x: i.a * p.x + i.c * p.y + i.e, y: i.b * p.x + i.d * p.y + i.f } }
function placeCenter(f, wp) { const c = centerOf(f); f.x += wp.x - c.x; f.y += wp.y - c.y }   // drawn-centre placement (corrected each frame)

export function updateScreenBreaker(cw = 1280, ch = 720) {
  if (!S || S.phase === "done") return
  const t = ++S.t, w = S.w, v = S.v, d = (v.x + (v.w || 50) / 2) >= (w.x + (w.w || 50) / 2) ? 1 : -1
  w.facing = d; w.hitstun = 0; w.isBlocking = false
  const wTop = (w.groundY ?? 520) - (w.h || 100), vTop = (v.groundY ?? 520) - (v.h || 100)
  if (t <= APPROACH) {   // walk up to the body
    const tx = v.x - d * ((w.w || 50) * 0.8), st = (tx - w.x) / Math.max(1, APPROACH - t + 1)
    w.x += st; w.vx = st; w.attacking = false
  } else if (t <= LIFT) {   // grab it and lift it overhead
    const u = ease((t - APPROACH) / (LIFT - APPROACH))
    w.vx = 0; w.y = wTop; if (has(w, "grab")) { w.attacking = true; w.currentMove = "grab"; w.currentAttack = null } else w.attacking = false
    v.knockdownState = false; v.knockdownTimer = 0; v.hitstun = 999; v.grounded = v.onGround = false
    v.x += ((w.x + (w.w || 50) / 2 - (v.w || 50) / 2) - v.x) * 0.25
    v.y = vTop - u * (w.h || 100) * 0.95; v._fxRot = -d * 1.4 * u
    if (t === APPROACH + 1) sound.playJuiceSfx?.("rumble_tail_01", { gain: 0.3 })
  } else if (t <= WIND) {   // wind up behind the head
    const u = (t - LIFT) / (WIND - LIFT); v.x -= d * 2.2; v.y -= 0.6; v._fxRot = -d * (1.4 + 0.5 * u)
    if (has(w, "heavy")) { w.attacking = true; w.currentMove = "heavy"; w.currentAttack = null }
  } else if (t < IMPACT) {   // HURLED AT THE CAMERA: tumbling, growing, flying toward the viewer
    if (!S.start) { S.start = toScreen(centerOf(v)); S.h0 = Math.max(40, (v._lastDrawH || 120) * Math.abs(S.M?.d || 1)); S.target = { x: cw * 0.5, y: ch * 0.42 }; S.scaleEnd = Math.max(3, (ch * 0.85) / S.h0); sbWhoosh(0.5) }
    const u = (t - WIND) / (IMPACT - WIND), k = u * u
    v._fxRenderScale = 1 + (S.scaleEnd - 1) * k * k
    v._fxRot = -d * (1.9 + u * Math.PI * 5)
    placeCenter(v, toWorld({ x: S.start.x + (S.target.x - S.start.x) * Math.sqrt(u), y: S.start.y + (S.target.y - S.start.y) * u - Math.sin(u * Math.PI) * ch * 0.12 }))
  } else {
    if (t === IMPACT) {   // SMASH into the glass
      S.crack = { x: cw * 0.5, y: ch * 0.42, seed: 0x9e3779b9 ^ (S.v.x | 0) }; S.splat = -d * 0.25
      camera.shake?.(26, 30); sbGlass(); sound.playJuiceSfx?.("rumble_tail_01", { gain: 0.8 })
    }
    v._fxRenderScale = S.scaleEnd; v._fxRot = S.splat
    // pressed flat against the screen, then slowly sliding down the inside of the glass
    const s = t - IMPACT, drop = s < 25 ? 0 : (s - 25) ** 1.8 * 0.035 * ch / 100
    const p = { x: S.crack.x, y: S.crack.y + drop }
    placeCenter(v, toWorld(p)); if (s > 25 && s % 3 === 0 && p.y < ch * 1.3) S.smear.push(p.y)
    if (t >= END) S.phase = "done"
  }
}
// screen layer: the cracked glass, the smear, the banner
export function drawScreenBreaker(c, canvas) {
  if (!S || !S.crack) return
  const W = canvas.width, H = canvas.height, s = S.t - IMPACT, { x, y } = S.crack
  let seed = S.crack.seed >>> 0; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296 }
  c.save()
  if (s < 6) { c.fillStyle = `rgba(255,255,255,${0.85 * (1 - s / 6)})`; c.fillRect(0, 0, W, H) }
  // the smear down the glass: a ragged streak (wide where the body hit, narrowing as it slid), with drips
  if (S.smear.length) { const bot = Math.min(H + 40, S.smear[S.smear.length - 1])
    c.fillStyle = "rgba(110,0,0,0.5)"
    for (let yy = y - 20; yy < bot; yy += 6) { const u = (yy - y) / Math.max(1, bot - y), wdt = (90 - 50 * u) * (0.8 + 0.25 * Math.sin(yy * 0.07) + 0.15 * Math.sin(yy * 0.23))
      c.beginPath(); c.ellipse(x + Math.sin(yy * 0.03) * 10, yy, wdt, 7, 0, 0, 7); c.fill() }
    c.fillStyle = "rgba(140,0,0,0.6)"
    for (let i = 0; i < 7; i++) { const dx = x - 60 + i * 20 + ((i * 37) % 9), y0 = y + 40 + ((i * 71) % 90), len = Math.min(H, (bot - y0) * (0.5 + ((i * 29) % 50) / 100) + 40)
      c.fillRect(dx - 2, y0, 4, len); c.beginPath(); c.arc(dx, y0 + len, 4, 0, 7); c.fill() } }
  // spider-web cracks
  const rays = 16, R = Math.hypot(W, H), pts = []
  c.lineCap = "round"
  for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2 + (rnd() - 0.5) * 0.35, len = R * (0.35 + 0.6 * rnd()), seg = []
    let px = x, py = y; seg.push([px, py]); const n = 8
    for (let k = 1; k <= n; k++) { const r = len * k / n, aa = a + (rnd() - 0.5) * 0.18; px = x + Math.cos(aa) * r; py = y + Math.sin(aa) * r; seg.push([px, py]) }
    pts.push(seg) }
  const grow = Math.min(1, (s + 1) / 4)
  for (const pass of [["rgba(0,0,0,0.55)", 4], ["rgba(235,245,255,0.95)", 1.6]]) { c.strokeStyle = pass[0]; c.lineWidth = pass[1]
    for (const seg of pts) { c.beginPath(); c.moveTo(seg[0][0], seg[0][1]); const m = Math.max(1, Math.round(seg.length * grow)); for (let k = 1; k < m; k++) c.lineTo(seg[k][0], seg[k][1]); c.stroke() }
    // concentric rings joining neighbouring rays
    for (const ring of [1, 2, 3, 5]) { if (ring / 8 > grow) continue; c.beginPath()
      for (let i = 0; i < pts.length; i++) { const A = pts[i][ring], B = pts[(i + 1) % pts.length][ring]; if (!A || !B) continue; c.moveTo(A[0], A[1]); c.lineTo((A[0] + B[0]) / 2 + (rnd() - 0.5) * 12, (A[1] + B[1]) / 2 + (rnd() - 0.5) * 12); c.lineTo(B[0], B[1]) } c.stroke() } }
  // the shattered centre
  c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = 40 + rnd() * 40; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) } c.closePath(); c.fill()
  // glints
  for (let i = 0; i < 14; i++) { const a = rnd() * 7, r = 30 + rnd() * 300; c.fillStyle = `rgba(255,255,255,${0.5 * Math.max(0, Math.sin(S.t * 0.2 + i))})`; c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 3) }
  if (s > 40) { const al = Math.min(1, (s - 40) / 12); c.globalAlpha = al; c.textAlign = "center"; c.font = `900 ${Math.floor(H * 0.1)}px Arial`; c.lineWidth = 6; c.strokeStyle = "#000"
    c.strokeText("SCREEN BREAKER", W / 2, H * 0.16); c.fillStyle = "#e61e22"; c.fillText("SCREEN BREAKER", W / 2, H * 0.16)
    c.font = `800 ${Math.floor(H * 0.05)}px Arial`; c.strokeText("FATALITY", W / 2, H * 0.24); c.fillStyle = "#ffd878"; c.fillText("FATALITY", W / 2, H * 0.24) }
  c.restore()
}
// ── synth sound (SFX master): a whoosh, the glass breaking ──
function ac() { const c = sound._ctx; return c && sound._master ? c : null }
function noise(c, dur) { const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); let s = 0x12345; for (let i = 0; i < d.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1 } const n = c.createBufferSource(); n.buffer = b; return n }
function sbWhoosh(vol) { const c = ac(); if (!c) return; const t0 = c.currentTime, n = noise(c, 0.6), bp = c.createBiquadFilter(), g = c.createGain()
  bp.type = "bandpass"; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.55)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); n.connect(bp); bp.connect(g); g.connect(sound._master); n.start(t0) }
function sbGlass() { const c = ac(); if (!c) return; const t0 = c.currentTime
  { const n = noise(c, 1.2), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = "highpass"; hp.frequency.value = 2500; g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1); n.connect(hp); hp.connect(g); g.connect(sound._master); n.start(t0) }
  { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.3); g.gain.setValueAtTime(1, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35); o.connect(g); g.connect(sound._master); o.start(t0); o.stop(t0 + 0.4) }
  let s = 77; for (let i = 0; i < 26; i++) { s = (s * 1103515245 + 12345) >>> 0; const f = 2400 + (s % 5200), at = t0 + 0.02 + (i / 26) ** 1.5 * 1.3, o = c.createOscillator(), g = c.createGain()
    o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12 + (s % 100) / 600); o.connect(g); g.connect(sound._master); o.start(at); o.stop(at + 0.4) } }
