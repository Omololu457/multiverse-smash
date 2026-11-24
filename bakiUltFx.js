// bakiUltFx.js — RENDER-ONLY half of Baki Hanma's ONI NO SE activation cinematic (bakiUlt.js). Screen pass (cineRegistry
// overlay): both fighters drawn from their real sheets; the centrepiece is a full-screen close-up of his BACK (his own
// back-view strike frame, blown up) on which the muscles knot into a DEMON'S FACE — drawn procedurally as shadowed muscle
// ridges with igniting eyes — then the "roar" (red impact frames + shockwave) and the crimson-aura flex.
// Pure functions of the scene; noise = integer hash. Reduce Flashing / Reduce Motion honoured.
import { animOf, hash, clamp, smooth, outE, calmMotion, calmFlash, preloadAnims, sprite, view, punchIn, speedLines, hLines, title, subtitle, star, letterbox, ring } from './ippoUltFx.js'

export const BAKI_T = { turn: 34, face: 70, roar: 120, total: 176, out: 160 }
const T = BAKI_T
// the back-view stance: baki_heavy_uniform cell 5 (the 'heavy' action only plays cells 0-3, so it is addressed directly;
// the sheet path comes from the live (skinned) heavy action so recolours carry over)
const BACK = { frame: 5 }
const backAnim = f => { const h = animOf(f, 'heavy'); return h?.sheet ? { sheet: h.sheet, frames: 6, width: 46, height: 47, scale: h.scale } : null }

export function preloadBakiUlt(f, t) { preloadAnims(f, ['idle', 'heavy', 'bakiDemonBack']); if (t) preloadAnims(t, ['idle', 'hurt', 'guard']) }

export function drawBakiUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas.width, H = canvas.height, V = view(W, H), z = V.z, k = S.frame, f = S.caster, t = S.target, d = S.dir
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor)
  const rr = k - T.roar
  const jit = calmMotion() ? 0 : (rr >= 0 && rr < 24 ? (hash(S.real, 3) - 0.5) * H * 0.02 * (1 - rr / 24) : 0)
  ctx.save(); ctx.translate(jit, jit * 0.6)
  // 1) the world dims to a crimson-black dojo hush
  const dim = k < T.out ? smooth(k / 14) : smooth(1 - (k - T.out) / 16)
  ctx.fillStyle = `rgba(20,2,2,${(0.55 * dim).toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40)
  // 2) fighters
  if (t) {
    const flinch = rr >= 0 && rr < 30 ? 1 - rr / 30 : 0
    sprite(ctx, t, flinch > 0 ? ['hurt', 'idle'] : ['idle'], 0, tp.x + d * 10 * z * flinch, tp.y, z, -d, { skew: d * 0.15 * flinch })
  }
  // red heat haze around him (grows), then the crimson aura after the roar
  const aura = k < T.turn ? 0 : k < T.roar ? smooth((k - T.turn) / 40) * 0.6 : 1
  if (aura > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(fp.x, fp.y - 60 * z, 6, fp.x, fp.y - 60 * z, 130 * z); g.addColorStop(0, `rgba(255,40,30,${(0.35 * aura).toFixed(3)})`); g.addColorStop(1, 'rgba(255,20,10,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fp.x, fp.y - 60 * z, 130 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  let keys = ['idle'], fr = (S.real >> 3) % 8, sd = d
  if (k >= T.turn && k < T.roar) { keys = [backAnim(f), 'idle'].filter(Boolean); fr = k < T.turn + 6 ? 4 : BACK.frame }
  else if (k >= T.roar) { keys = ['bakiDemonBack', 'idle']; fr = (S.real >> 2) % 3 }
  const sw = k >= T.turn && k < T.roar ? 1 + 0.04 * smooth((k - T.turn) / 30) + (calmMotion() ? 0 : 0.012 * Math.sin(S.real * 0.5)) : 1
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, sd, { s: sw })
  if (k >= T.roar) {   // crackling crimson aura streaks rising off him
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 12; i++) { const ph = ((S.real * 2 + hash(i, 5) * 60) % 60) / 60, x = fp.x + (hash(i, 6) - 0.5) * 70 * z, y = fp.y - ph * 150 * z
      ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillStyle = i & 1 ? '#ff3020' : '#ffb0a0'; ctx.fillRect(x, y, 2 * z, (10 + hash(i, 7) * 18) * z) }
    ctx.restore()
  }
  // 3) roar shockwave off his back
  if (rr >= 0 && rr < 40) {
    const u = rr / 40
    for (let j = 0; j < 3; j++) ring(ctx, fp.x, fp.y - 60 * z, (30 + outE(clamp(u * 1.4 - j * 0.15, 0, 1)) * 700) * z, (1 - u) * 0.9, j ? '#ff4030' : '#ffffff', (10 - j * 3) * z, 0.55)
  }
  // 4) punch-ins
  const head = { x: fp.x, y: fp.y - 95 * z }
  if (k < T.turn) { const u = smooth((k - 2) / 30); punchIn(ctx, canvas, W, H, head.x, head.y + 20 * z, 1 + 0.5 * u, head.x + (W * 0.5 - head.x) * u, head.y + 20 * z + (H * 0.5 - head.y - 20 * z) * u) }
  else if (k < T.face) { const u = smooth((k - T.turn) / 30); punchIn(ctx, canvas, W, H, fp.x, fp.y - 60 * z, 1.4 + 0.8 * u, W / 2, H * 0.55) }
  else if (k >= T.roar && k < T.roar + 30) punchIn(ctx, canvas, W, H, (fp.x + (t ? tp.x : fp.x)) / 2, fp.y - 60 * z, 1.35 - 0.2 * smooth(rr / 30), W / 2, H * 0.58)
  // 5) THE DEMON FACE — a full-screen close-up of his back
  if (k >= T.face && k < T.roar + 6) demonPanel(ctx, W, H, S, k)
  // 6) roar impact frames
  if (rr >= 0 && rr < 8 && !calmFlash()) {
    ctx.fillStyle = rr < 3 ? '#ffffff' : '#8a0000'; ctx.fillRect(0, 0, W, H)
    speedLines(ctx, W, H, fp.x, fp.y - 60 * z, 90, 19 + rr, rr < 3 ? '#8a0000' : '#000000', 0.9, false, rr)
    sprite(ctx, f, ['bakiDemonBack', 'idle'], 2, fp.x, fp.y, z, d, { tint: rr < 3 ? '#000000' : '#ffd0c0', tintA: 1 })
  }
  if (k >= T.roar + 10 && k < T.out + 10) statCard(ctx, W, H, S, k)
  ctx.restore()
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.out ? clamp(1 - (k - T.out) / 14, 0, 1) : 1
  letterbox(ctx, W, H, Math.min(lbIn, lbOut))
  if (k >= 2 && k < T.face) subtitle(ctx, W, H, 'BAKI', '“I\'ll get even stronger.”  もっと強くなります', Math.min((k - 2) / 6, (T.face - k) / 8), { who: '#ff5a4a' })
  return true
}

function demonPanel(ctx, W, H, S, k) {
  const u = (k - T.face) / (T.roar - T.face), inA = clamp((k - T.face) / 5, 0, 1), outA = clamp((T.roar + 6 - k) / 6, 0, 1)
  ctx.save(); ctx.globalAlpha = Math.min(inA, outA)
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.05, W / 2, H / 2, H * 0.9); g.addColorStop(0, '#3a0606'); g.addColorStop(1, '#050000')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  hLines(ctx, W, 0, H, 50, 13, '#ff2a1a', 0.18, S.real)
  // the back, blown up: torso fills the frame
  const zoom = H * 1.05 / 47 / (S.caster.spriteScale || 1.97) * (1 + 0.06 * smooth(u)), pulse = calmMotion() ? 1 : 1 + 0.01 * Math.sin(S.real * 0.6)
  const r = sprite(ctx, S.caster, [backAnim(S.caster), 'idle'].filter(Boolean), BACK.frame, W / 2, H * 1.02, zoom * pulse, S.dir)
  if (r) {
    // the face sits between the shoulder blades
    const cx = W / 2 + S.dir * 3.5 * r.s, cy = H * 1.02 - 27 * r.s, sc = 2.1 * r.s
    oniFace(ctx, cx, cy, sc, u, S.real)
  }
  if (k >= T.face + 6) title(ctx, W, H, '鬼の背', 'ONI NO SE  ·  THE DEMON BACK', (k - T.face - 6) / (T.roar - T.face), { y: 0.78, fs: 0.09, edge: '#ff2a1a', fill: '#ffffff', stroke: '#6a0000', band: 'rgba(8,0,0,0.88)', bh: 0.16 })
  ctx.restore()
}
// the demon's face, drawn as shadowed muscle ridges + igniting eyes; u = 0..1 emergence
function oniFace(ctx, cx, cy, s, u, real) {
  const a = smooth(u / 0.5), eye = smooth((u - 0.45) / 0.25)
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  // brow ridge — a deep angry V of shadow
  const ridge = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)); ctx.stroke() }
  ctx.globalAlpha = a * 0.85
  ridge([[-3.6, -1.6], [-1.6, -0.2], [-0.3, 0.6]], s * 0.5, 'rgba(50,8,4,0.85)')
  ridge([[3.6, -1.6], [1.6, -0.2], [0.3, 0.6]], s * 0.5, 'rgba(50,8,4,0.85)')
  // cheek / jaw muscles — curving shadows
  ridge([[-3.2, 0.8], [-2.6, 2.6], [-1.4, 3.6]], s * 0.35, 'rgba(60,10,6,0.7)')
  ridge([[3.2, 0.8], [2.6, 2.6], [1.4, 3.6]], s * 0.35, 'rgba(60,10,6,0.7)')
  // nose ridge (the spine groove)
  ridge([[0, 0.4], [0, 2.0]], s * 0.28, 'rgba(50,8,4,0.7)')
  // the grin: a wide snarl with fangs (lower back muscles)
  ridge([[-2.2, 3.0], [-1.0, 3.6], [0, 3.4], [1.0, 3.6], [2.2, 3.0]], s * 0.3, 'rgba(40,4,2,0.85)')
  ctx.fillStyle = 'rgba(255,236,220,0.75)'
  for (const fx of [-1.3, 1.3]) { ctx.beginPath(); ctx.moveTo(cx + (fx - 0.25) * s, cy + 3.35 * s); ctx.lineTo(cx + (fx + 0.25) * s, cy + 3.35 * s); ctx.lineTo(cx + fx * s, cy + 4.1 * s); ctx.closePath(); ctx.fill() }
  // highlight the bulging muscle masses between the shadows
  ctx.globalCompositeOperation = 'lighter'
  for (const [x, y, r] of [[-2.2, -0.6, 1.1], [2.2, -0.6, 1.1], [-1.8, 2.0, 0.9], [1.8, 2.0, 0.9]]) {
    const g = ctx.createRadialGradient(cx + x * s, cy + y * s, 0, cx + x * s, cy + y * s, r * s); g.addColorStop(0, `rgba(255,150,110,${(0.22 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,120,80,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, r * s, 0, Math.PI * 2); ctx.fill()
  }
  // the eyes ignite
  if (eye > 0) {
    for (const ex of [-1.75, 1.75]) {
      const x = cx + ex * s, y = cy + 0.35 * s, fl = calmMotion() ? 1 : 0.85 + 0.15 * Math.sin(real * 0.9 + ex)
      ctx.globalAlpha = eye
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2); g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.3, 'rgba(255,80,30,0.6)'); g.addColorStop(1, 'rgba(255,0,0,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.2 * fl, 0, Math.PI * 2); ctx.fill()
      ctx.save(); ctx.translate(x, y); ctx.rotate(ex < 0 ? 0.35 : -0.35); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.75, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
  }
  ctx.restore()
}
function statCard(ctx, W, H, S, k) {
  const a = Math.min(clamp((k - T.roar - 10) / 6, 0, 1), clamp((T.out + 10 - k) / 8, 0, 1)), d = S.dir
  const x = d > 0 ? W * 0.06 : W * 0.94
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = d > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.round(H * 0.07)}px Impact, "Arial Black", sans-serif`; ctx.lineWidth = H * 0.012; ctx.strokeStyle = '#000'; ctx.strokeText('DEMON BACK', x, H * 0.22); ctx.fillStyle = '#ff3a2a'; ctx.fillText('DEMON BACK', x, H * 0.22)
  ctx.font = `700 ${Math.round(H * 0.028)}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText('DMG ×1.3  ·  SPD ×1.12  ·  12 s', x, H * 0.28)
  ctx.restore()
  void star
}
