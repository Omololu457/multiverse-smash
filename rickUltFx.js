// rickUltFx.js — Rick Sanchez "SELF-DESTRUCT" cinematic, RENDER ONLY (rickUlt.js owns the simulation; this file only reads
// rickUltScene()). One screen pass (registerCineScreen, after the world, before the HUD): punch-zoom re-blits, the wall /
// sky / swarm / homecoming PORTALS, the five DIMENSION CUTS (procedural backdrops — nothing copied from the show — with the
// real Rick / foe / Meeseeks sprites redrawn on top from sprite.js's recorded frames), the Meeseeks pile, the countdown,
// the green portal-energy detonation, impact frames, letterbox, title cut-in, subtitles, hit counter, damage numbers.
// No Math.random: every bit of variation is hash(i, seed).
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { cachedSpriteSheet } from './sprite.js'
import { juiceSettings } from './juiceSettings.js'
import { rickUltScene, RICK_ULT as U, RICK_DIMENSIONS, dimAt, launchAt } from './rickUlt.js'

const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
const cl = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => cl((k - a) / (b - a), 0, 1)
const easeO = u => 1 - (1 - u) * (1 - u)
const sm = u => { u = cl(u, 0, 1); return u * u * (3 - 2 * u) }
const ready = img => !!(img && img.complete && img.naturalWidth > 0)
const GREEN = '#8be04e', GLOW = '#c6ff6e', DEEP = '#1f7a1f'

let W = 1280, H = 720, S = 1
let VX = { sx: 0, sy: 0, z: 1 }                 // the virtual camera's re-blit (screen → zoomed screen)
const vmap = p => ({ x: (p.x - VX.sx) * VX.z, y: (p.y - VX.sy) * VX.z })
// VIRTUAL CAMERA keys [script frame, zoom, subject]: f = Rick, t = the foe, mid = between them
const VCAM = () => [[0, 1, 'f'], [5, 1.5, 'f'], [15, 1.5, 'f'], [21, 1.05, 'mid'], [36, 1, 'mid'], [166, 1, 't'], [180, 1.05, 't'], [188, 1.3, 't'],
  [210, 1.3, 't'], [214, 1.1, 'f'], [219, 1.55, 'f'], [226, 1.5, 'f'], [231, 1.12, 'mid'], [256, 1.4, 'f'], [263, 1.6, 'f'], [264, 1, 'mid'],
  [312, 1, 'mid'], [322, 1.4, 'f'], [340, 1.3, 'f'], [352, 1, 'f']]
function vcam(sc, k, tp) {
  const f = sc.caster, fp = toScreen((f.x || 0) + (f.w || 60) / 2, (f.y || 0) + (f.h || 100) * 0.5)
  const pt = w => w === 'f' ? fp : w === 't' ? tp : { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 }
  const K = VCAM(); let i = 0; while (i < K.length - 2 && k >= K[i + 1][0]) i++
  const A = K[i], B = K[i + 1], u = sm((k - A[0]) / Math.max(1, B[0] - A[0])), pa = pt(A[2]), pb = pt(B[2])
  return { z: A[1] + (B[1] - A[1]) * u, x: pa.x + (pb.x - pa.x) * u, y: pa.y + (pb.y - pa.y) * u }
}
const toScreen = (wx, wy) => ({ x: (wx - camera.x - (camera.leadX || 0) + (camera.shakeX || 0)) * camera.zoom + W / 2, y: (wy - camera.y + (camera.shakeY || 0)) * camera.zoom + H / 2 })

// ── sprite redraw from sprite.js's recorded frame (f._fxRecord → f._lastFrameDraw) ─────────────────────────────────────
// (fx, fy) = screen point of the FEET centre; hPx = on-screen height; opts: flip (±1 override), rot, alpha, filter
function drawFighter(c, f, fx, fy, hPx, o = {}) {
  const L = f && f._lastFrameDraw; if (!L || !ready(L.img) || !(L.h > 0)) return
  const s = hPx / L.h, w = L.w * s, h = L.h * s
  // the recorded rect's feet sit at y + h (anchored to the hitbox bottom); centre it on the hitbox centre
  const cxOff = ((f.x + (f.w || 60) / 2) - L.x) * s, footOff = (L.y + L.h - (f.y + (f.h || 100))) * s
  const flip = o.flip != null ? o.flip === -1 : L.flip
  c.save(); c.imageSmoothingEnabled = false
  c.globalAlpha *= o.alpha == null ? 1 : o.alpha
  if (o.filter) c.filter = o.filter
  c.translate(fx, fy - h * 0.5 + footOff); if (o.rot) c.rotate(o.rot)
  const x0 = -(flip ? (w - cxOff) : cxOff), y0 = -h * 0.5
  if (flip) { c.scale(-1, 1); c.drawImage(L.img, L.sx, L.sy, L.sw, L.sh, -x0 - w, y0, w, h) }
  else c.drawImage(L.img, L.sx, L.sy, L.sw, L.sh, x0, y0, w, h)
  c.restore()
}
const SEEK_RUN = './meeseeks_run_attack.png', SEEK_IDLE = './meeseeks_idle.png', ROCKET = './rick_rocket_specail.png'
function drawMeeseeks(c, x, feetY, hPx, frame, flip, run = true, alpha = 1) {
  const img = cachedSpriteSheet(run ? SEEK_RUN : SEEK_IDLE); if (!ready(img)) return
  const fw = run ? 60 : 38, fh = run ? 80 : 82, n = run ? 7 : 5, s = hPx / fh, fr = ((frame % n) + n) % n
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha; c.translate(x, feetY - hPx); if (flip) c.scale(-1, 1)
  c.drawImage(img, fr * fw, 0, fw, fh, -fw * s / 2, 0, fw * s, hPx); c.restore()
}

// ── PORTAL: the green swirl (screen space) ─────────────────────────────────────────────────────────────────────────────
function portal(c, x, y, rx, ry, open, spin, a = 1) {
  if (open <= 0.01 || a <= 0.01) return
  rx *= open; ry *= open
  c.save(); c.globalAlpha *= a; c.translate(x, y)
  const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry) * 1.6)
  g.addColorStop(0, 'rgba(230,255,190,0.95)'); g.addColorStop(0.35, 'rgba(150,240,80,0.9)'); g.addColorStop(0.62, 'rgba(40,170,40,0.55)'); g.addColorStop(1, 'rgba(20,120,20,0)')
  c.save(); c.scale(1, ry / Math.max(1, rx)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx * 1.6, 0, Math.PI * 2); c.fill(); c.restore()
  c.fillStyle = '#7ee04a'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#d9ff9a'; c.beginPath(); c.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2); c.fill()
  c.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const r0 = 0.25 + 0.11 * i, a0 = spin * (1 + i * 0.13) + i * 1.7
    c.strokeStyle = i & 1 ? 'rgba(30,140,30,0.85)' : 'rgba(250,255,220,0.8)'; c.lineWidth = Math.max(1.2, rx * 0.05)
    c.beginPath(); c.ellipse(0, 0, rx * r0, ry * r0, 0, a0, a0 + 2.2); c.stroke()
  }
  c.strokeStyle = 'rgba(20,90,20,0.9)'; c.lineWidth = Math.max(2, rx * 0.06); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke()
  for (let i = 0; i < 10; i++) {            // goo drips / sparks orbiting the rim
    const an = spin * 0.6 + i * 0.628, px = Math.cos(an) * rx * 1.08, py = Math.sin(an) * ry * 1.08
    c.fillStyle = i % 3 ? '#b6ff5c' : '#ffffff'; c.beginPath(); c.arc(px, py, Math.max(1.5, rx * 0.045), 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

// ── type ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function card(c, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#0b2a08', font = 'Impact, "Arial Black", sans-serif') {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = cl(a, 0, 1); c.translate(x, y); if (rot) c.rotate(rot)
  c.font = `900 italic ${Math.round(size)}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 6); c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore()
}
function subtitle(c, txt, a, bar) {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = a; c.font = `700 ${Math.round(26 * S)}px "Trebuchet MS", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  const y = H - bar - 30 * S, w = c.measureText(txt).width + 40 * S
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(W / 2 - w / 2, y - 20 * S, w, 40 * S)
  c.fillStyle = '#b6ff5c'; c.fillText('RICK:', W / 2 - w / 2 + 44 * S, y); c.fillStyle = '#ffffff'
  c.textAlign = 'left'; c.fillText(txt, W / 2 - w / 2 + 84 * S, y); c.restore()
}
function speedLines(c, cx, cy, al, seed, n = 48, col = '#ffffff') {
  if (al <= 0.01) return
  c.save(); c.globalAlpha = al; c.fillStyle = col
  const R0 = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const a = (i + hash(i, seed) * 0.8) / n * Math.PI * 2, r1 = H * (0.2 + 0.2 * hash(i * 3, seed)), w = 0.006 + 0.012 * hash(i + 7, seed)
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a - w) * R0, cy + Math.sin(a - w) * R0); c.lineTo(cx + Math.cos(a + w) * R0, cy + Math.sin(a + w) * R0); c.closePath(); c.fill()
  }
  c.restore()
}
function shock(c, x, y, age, life, rMax, col, lw) {
  if (age < 0 || age > life) return
  const u = easeO(age / life)
  c.save(); c.globalAlpha = (1 - age / life) * 0.9; c.strokeStyle = col; c.lineWidth = lw * (1 - u * 0.7)
  c.beginPath(); c.ellipse(x, y, rMax * u, rMax * u * 0.42, 0, 0, Math.PI * 2); c.stroke(); c.restore()
}

// ── DIMENSION BACKDROPS (procedural) ───────────────────────────────────────────────────────────────────────────────────
function bgGrid(c, t) {
  const hz = H * 0.58, g = c.createLinearGradient(0, 0, 0, hz)
  g.addColorStop(0, '#0c0024'); g.addColorStop(0.6, '#4a0a6b'); g.addColorStop(1, '#ff3d8b'); c.fillStyle = g; c.fillRect(0, 0, W, hz)
  for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * hash(i, 5)})`; c.fillRect(hash(i, 1) * W, hash(i, 2) * hz * 0.7, 2 * S, 2 * S) }
  const sr = H * 0.2, sx = W * 0.5, sy = hz - sr * 0.35, sg = c.createLinearGradient(0, sy - sr, 0, sy + sr)
  sg.addColorStop(0, '#fff36b'); sg.addColorStop(1, '#ff2d95')
  c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.clip(); c.fillStyle = sg; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2)
  c.fillStyle = '#4a0a6b'; for (let i = 0; i < 7; i++) { const y = sy + sr * (0.05 + i * 0.14), h = 3 * S + i * 2 * S; c.fillRect(sx - sr, y, sr * 2, h) }
  c.restore()
  const fg = c.createLinearGradient(0, hz, 0, H); fg.addColorStop(0, '#2a0040'); fg.addColorStop(1, '#05000f'); c.fillStyle = fg; c.fillRect(0, hz, W, H - hz)
  c.strokeStyle = '#ff3dd8'; c.lineWidth = 2 * S; c.shadowColor = '#ff3dd8'; c.shadowBlur = 8 * S
  for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * 0.02, hz); c.lineTo(W / 2 + i * W * 0.2, H); c.stroke() }
  const off = (t * 0.04) % 1
  for (let j = 0; j < 12; j++) { const u = (j + off) / 12, y = hz + (H - hz) * u * u; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke() }
  c.shadowBlur = 0
}
function cube(c, x, y, s, rot, top, left, right) {
  c.save(); c.translate(x, y); c.rotate(rot)
  const h = s * 0.5
  c.fillStyle = top; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.87, -h); c.lineTo(0, 0); c.lineTo(-s * 0.87, -h); c.closePath(); c.fill()
  c.fillStyle = left; c.beginPath(); c.moveTo(-s * 0.87, -h); c.lineTo(0, 0); c.lineTo(0, s); c.lineTo(-s * 0.87, h); c.closePath(); c.fill()
  c.fillStyle = right; c.beginPath(); c.moveTo(s * 0.87, -h); c.lineTo(0, 0); c.lineTo(0, s); c.lineTo(s * 0.87, h); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(40,10,0,0.6)'; c.lineWidth = 2; c.stroke(); c.restore()
}
const CUBE_COL = [['#ffe08a', '#e0952e', '#b5611c'], ['#9ef0ff', '#3fa6d6', '#24688f'], ['#ffb0d8', '#e0569a', '#a12c66'], ['#c9ff9a', '#6cc23a', '#3f7d1e']]
function bgCubes(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ff7a3d'); g.addColorStop(0.55, '#ffc25c'); g.addColorStop(1, '#fff0b0'); c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(W * 0.82, H * 0.2, H * 0.12, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(160,60,20,0.35)'; c.beginPath(); c.arc(W * 0.12, H * 0.28, H * 0.06, 0, Math.PI * 2); c.fill()
  for (let i = 0; i < 26; i++) {
    const s = (12 + 60 * hash(i, 11)) * S, x = ((hash(i, 12) * W + t * (0.3 + hash(i, 13)) * 2) % (W + 200)) - 100, y = hash(i, 14) * H * 0.9 + Math.sin(t * 0.05 + i) * 8 * S
    const col = CUBE_COL[i % 4]; c.globalAlpha = 0.45 + 0.55 * hash(i, 15); cube(c, x, y, s, Math.sin(t * 0.02 + i) * 0.4, ...col)
  }
  c.globalAlpha = 1
  c.fillStyle = '#c4682a'; c.fillRect(0, H * 0.86, W, H * 0.14)
  for (let i = 0; i < 9; i++) cube(c, W * (i / 8), H * 0.88, 40 * S, 0, '#e0952e', '#b5611c', '#8a4512')
}
function bgGoop(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ff9ad5'); g.addColorStop(0.45, '#c77dff'); g.addColorStop(1, '#3b0d5e'); c.fillStyle = g; c.fillRect(0, 0, W, H)
  for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(255,255,255,${0.12 + i * 0.05})`; c.beginPath(); c.arc(W * (0.2 + i * 0.3), H * (0.15 + 0.05 * i), H * (0.05 + 0.03 * i), 0, Math.PI * 2); c.fill() }
  const layers = [['#1fd1a5', 0.58, 1.0], ['#13a98a', 0.66, 1.4], ['#0b7a66', 0.76, 1.9]]
  for (const [col, base, sp] of layers) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, H)
    for (let x = 0; x <= W; x += 16 * S) c.lineTo(x, H * base + Math.sin(x / (70 * S) + t * 0.06 * sp) * 14 * S + Math.sin(x / (23 * S) - t * 0.11) * 5 * S)
    c.lineTo(W, H); c.closePath(); c.fill()
  }
  for (let i = 0; i < 34; i++) {
    const x = hash(i, 21) * W, r = (3 + 10 * hash(i, 22)) * S, y = H - ((t * (1 + 2 * hash(i, 23)) * S + hash(i, 24) * H) % (H * 0.5))
    c.strokeStyle = 'rgba(220,255,240,0.7)'; c.lineWidth = 2 * S; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke()
  }
}
function bgInvert(c, t) {
  c.fillStyle = '#f4f0ff'; c.fillRect(0, 0, W, H)
  c.save(); c.translate(W / 2, H * 0.5)
  for (let i = 18; i > 0; i--) {
    const r = i * Math.max(W, H) * 0.045, a = t * 0.03 * (i & 1 ? 1 : -1)
    c.fillStyle = i & 1 ? '#160026' : '#f4f0ff'; c.beginPath()
    for (let j = 0; j <= 12; j++) { const an = a + j / 12 * Math.PI * 2, rr = r * (1 + 0.08 * Math.sin(j * 3 + t * 0.1)); j ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr) }
    c.closePath(); c.fill()
  }
  c.restore()
  c.fillStyle = 'rgba(120,0,200,0.18)'; c.fillRect(0, 0, W, H)
}
function bgRocket(c, t) {
  c.fillStyle = '#02030d'; c.fillRect(0, 0, W, H)
  const neb = [['rgba(60,90,255,0.35)', 0.25, 0.35, 0.4], ['rgba(200,40,180,0.28)', 0.7, 0.6, 0.35], ['rgba(40,220,200,0.2)', 0.5, 0.15, 0.3]]
  for (const [col, x, y, r] of neb) { const g = c.createRadialGradient(W * x, H * y, 0, W * x, H * y, H * r * 1.6); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  for (let i = 0; i < 120; i++) {
    const sp = 6 + 30 * hash(i, 31), x = W - ((hash(i, 32) * W + t * sp * S) % (W + 120)), y = hash(i, 33) * H, l = sp * 2.2 * S
    c.strokeStyle = `rgba(255,255,255,${0.35 + 0.6 * hash(i, 34)})`; c.lineWidth = (1 + hash(i, 35) * 1.5) * S
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke()
  }
  c.fillStyle = '#e2622a'; c.beginPath(); c.arc(W * 0.86, H * 0.82, H * 0.22, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(W * 0.83, H * 0.79, H * 0.22, 0, Math.PI * 2); c.fill()
}
const BACKDROP = { grid: bgGrid, cubes: bgCubes, goop: bgGoop, invert: bgInvert, rocket: bgRocket }

// ── one DIMENSION CUT ─────────────────────────────────────────────────────────────────────────────────────────────────
function dimensionCut(c, sc, D) {
  const f = sc.caster, t = sc.target, L = D.local, hit = U.dimHit, side = D.i & 1 ? -1 : 1, quiet = calm()
  const inX = W * (0.5 - side * 0.36), outX = W * (0.5 + side * 0.36), cx = W * 0.5, cy = H * 0.6, hPx = H * 0.34
  // portal-wipe in from the entry portal (the new dimension opens up through it)
  const wipe = easeO(seg(L, 0, 5)), R = Math.hypot(W, H) * wipe
  c.save()
  if (wipe < 1) { c.beginPath(); c.arc(inX, cy - hPx * 0.4, Math.max(1, R), 0, Math.PI * 2); c.clip() }
  BACKDROP[D.d.id](c, sc.real + D.i * 97)
  // the foe's path: out of the entry portal → contact at the centre → tumbling into the exit portal
  let px, py, rot, sz = 1, alpha = 1
  if (L <= hit) { const u = sm(L / hit); px = inX + (cx - inX) * u; py = cy - Math.sin(Math.PI * u) * 40 * S; rot = side * (0.4 - 0.4 * u) }
  else { const u = sm((L - hit) / (U.dimLen - 1 - hit)); px = cx + (outX - cx) * u; py = cy - Math.sin(Math.PI * u) * 90 * S; rot = side * u * 4.2; sz = 1 - 0.55 * u; alpha = 1 - seg(L, U.dimLen - 3, U.dimLen) }
  const spin = sc.real * 0.12
  portal(c, inX, cy - hPx * 0.42, 70 * S, 120 * S, easeO(seg(L, 0, 4)) * (1 - seg(L, hit + 2, hit + 8)), spin)
  portal(c, outX, cy - hPx * 0.42, 70 * S, 120 * S, easeO(seg(L, hit - 2, hit + 4)), -spin)
  // the hitter
  const hitU = L - hit
  if (D.d.id === 'grid') {
    const rx = W * (0.5 - side * 0.3), rp = easeO(seg(L, 2, 8))
    portal(c, rx, cy - hPx * 0.42, 60 * S, 105 * S, rp * (1 - seg(L, 20, 25)), spin * 1.3)
    drawFighter(c, f, rx + side * 20 * S, cy, hPx * 0.95, { flip: side, alpha: rp })
    if (L >= hit - 2 && L <= hit + 4) {
      const y = cy - hPx * 0.62, a = 1 - seg(L, hit + 1, hit + 4)
      c.save(); c.globalAlpha = a; c.strokeStyle = '#d9ff9a'; c.lineWidth = 16 * S; c.shadowColor = GREEN; c.shadowBlur = 24 * S
      c.beginPath(); c.moveTo(rx + side * 70 * S, y); c.lineTo(px, cy - hPx * 0.5); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 5 * S; c.stroke(); c.restore()
    }
  } else if (D.d.id === 'cubes') {
    const u = seg(L, 2, hit), cs = 150 * S
    if (L <= hit + 6) cube(c, px, -cs + (cy - hPx * 0.9 + cs) * u * u, cs, 0.3 - 0.3 * u, '#ffe08a', '#e0952e', '#b5611c')
    if (hitU >= 0) for (let i = 0; i < 14; i++) { const an = -Math.PI * hash(i, 41), v = (4 + 9 * hash(i, 42)) * hitU * S
      cube(c, px + Math.cos(an) * v, cy - hPx * 0.9 + Math.sin(an) * v + 0.5 * hitU * hitU * S, (8 + 12 * hash(i, 43)) * S, hitU * 0.3, '#ffe08a', '#e0952e', '#b5611c') }
  } else if (D.d.id === 'goop') {
    const u = easeO(seg(L, 3, hit)), mx = px - side * 70 * S, my = H * 0.62 + (1 - u) * 160 * S
    drawMeeseeks(c, mx, my, hPx * 0.95, hitU >= 0 ? 5 : Math.floor(L / 2), side < 0, true, 1 - seg(L, 20, 25))
    if (hitU >= 0 && hitU < 10) card(c, 'CAN DO!', mx, my - hPx * 1.05, 34 * S, '#7fd6ff', 1 - hitU / 10, -0.1, '#06324a')
    if (hitU >= 0) for (let i = 0; i < 16; i++) { const an = Math.PI * (1 + hash(i, 51)), v = (3 + 8 * hash(i, 52)) * hitU * S
      c.fillStyle = '#2ee6b8'; c.globalAlpha = Math.max(0, 1 - hitU / 14); c.beginPath(); c.arc(px + Math.cos(an) * v, H * 0.62 + Math.sin(an) * v + 0.4 * hitU * hitU * S, (3 + 5 * hash(i, 53)) * S, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1 }
  } else if (D.d.id === 'invert') {
    const rx = px - side * (220 - 150 * sm(seg(L, 3, hit))) * S
    drawFighter(c, f, rx, cy, hPx, { flip: side, alpha: 1 - seg(L, 20, 25), rot: side * 0.15 })
  } else if (D.d.id === 'rocket') {
    const img = cachedSpriteSheet(ROCKET), u = seg(L, 1, hit), rxx = inX - side * 200 * S + (px - inX + side * 200 * S) * u
    drawFighter(c, f, rxx - side * 140 * S, cy + 10 * S, hPx * 0.9, { flip: side, alpha: 1 - seg(L, 20, 25) })
    if (ready(img) && hitU < 1) { c.save(); c.imageSmoothingEnabled = false; c.translate(rxx, cy - hPx * 0.45); if (side < 0) c.scale(-1, 1); const s = (120 * S) / img.naturalHeight
      c.drawImage(img, -img.naturalWidth * s / 2, -img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); c.restore() }
    if (hitU >= 0 && hitU < 16) { const r = (40 + 14 * hitU) * S, g = c.createRadialGradient(px, cy - hPx * 0.5, 0, px, cy - hPx * 0.5, r)
      g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.4, 'rgba(255,170,40,0.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); c.globalAlpha = 1 - hitU / 16; c.fillStyle = g; c.beginPath(); c.arc(px, cy - hPx * 0.5, r, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1 }
  }
  // the foe (its real sprite, hurt pose), tumbling
  drawFighter(c, t, px, py, hPx * sz, { flip: -side, rot, alpha })
  if (D.d.id === 'invert') { c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over' }
  // contact: speed lines + flash + shock
  if (hitU >= 0 && hitU < 10 && !quiet) speedLines(c, px, py - hPx * 0.5, 0.45 * (1 - hitU / 10), D.i * 13 + (sc.real >> 1))
  if (hitU >= 0) shock(c, px, py - hPx * 0.5, hitU, 16, 260 * S, '#ffffff', 10 * S)
  if (sc.hold > 0 && hitU === 0) { c.globalAlpha = quiet ? 0.25 : 0.55 * (sc.hold / U.stop.dim); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  c.restore()
  // the wipe's leading edge (a green rim) + the dimension stamp
  if (wipe < 1) { c.save(); c.strokeStyle = GLOW; c.lineWidth = 10 * S; c.shadowColor = GREEN; c.shadowBlur = 20 * S; c.beginPath(); c.arc(inX, cy - hPx * 0.4, Math.max(1, R), 0, Math.PI * 2); c.stroke(); c.restore() }
  const la = seg(L, 2, 5) * (1 - seg(L, U.dimLen - 4, U.dimLen))
  if (la > 0) {
    c.save(); c.globalAlpha = la; c.translate(W * 0.04, H * 0.2); c.textAlign = 'left'; c.textBaseline = 'middle'
    c.font = `900 italic ${Math.round(40 * S)}px Impact, "Arial Black", sans-serif`; c.lineWidth = 7 * S; c.strokeStyle = '#000'; c.strokeText(D.d.name, 0, 0); c.fillStyle = '#ffffff'; c.fillText(D.d.name, 0, 0)
    c.font = `800 ${Math.round(18 * S)}px Arial, sans-serif`; c.lineWidth = 4 * S; c.strokeText(D.d.tag + `  ·  ${D.i + 1} / ${RICK_DIMENSIONS.length}`, 0, 32 * S); c.fillStyle = GLOW; c.fillText(D.d.tag + `  ·  ${D.i + 1} / ${RICK_DIMENSIONS.length}`, 0, 32 * S)
    c.restore()
  }
}

// ── the home world: portals, Meeseeks swarm, device, countdown, detonation, homecoming ──────────────────────────────────
function worldFx(c, sc) {
  const k = sc.k, f = sc.caster, t = sc.target, z = camera.zoom, spin = sc.real * 0.12, floorY = sc.floor
  // the wall portal the shot knocks the foe into
  if (k >= U.shot - 2 && k < U.dim0 + 4) { const p = toScreen(sc.portalX, floorY - 58); portal(c, p.x, p.y, 42 * z, 70 * z, easeO(seg(k, U.shot - 2, U.shot + 4)) * (1 - seg(k, U.intoPortal + 2, U.dim0 + 4)), spin) }
  // the portal-gun bolt
  if (k >= U.shot - 3 && k <= U.shot + 2) {
    const a = toScreen(sc.fx0 + sc.dir * 34, floorY - 62), b = toScreen(sc.tx0, floorY - 55)
    c.save(); c.strokeStyle = '#d9ff9a'; c.lineWidth = 10 * z; c.shadowColor = GREEN; c.shadowBlur = 20; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.restore()
  }
  if (k >= U.shot && k < U.shot + 14) { const b = toScreen(sc.tx0, floorY - 55); shock(c, b.x, b.y, k - U.shot, 14, 120 * z, GLOW, 6 * z) }
  // the sky portal that drops the foe home
  if (k >= U.drop - 6 && k < U.land + 10) { const p = toScreen(sc.tx0, floorY - 330); portal(c, p.x, p.y, 70 * z, 26 * z, easeO(seg(k, U.drop - 6, U.drop)) * (1 - seg(k, U.land, U.land + 10)), spin) }
  if (k >= U.land && k < U.land + 18) { const p = toScreen(sc.tx0, floorY); shock(c, p.x, p.y, k - U.land, 18, 220 * z, '#ffffff', 8 * z); dust(c, p.x, p.y, k - U.land, 18, z) }
  // the MEESEEKS SWARM: six portals ring the foe, the Meeseeks pour out and pile on
  if (k >= U.land && k < U.device + 6) {
    const tx = sc.tx0, n = 6
    for (let i = 0; i < n; i++) {
      const side = i & 1 ? 1 : -1, dist = 90 + 55 * (i >> 1), px = tx + side * dist, hy = floorY - (i >= 4 ? 140 : 0)
      const open = easeO(seg(k, U.land + 2 + i * 2, U.land + 8 + i * 2)) * (1 - seg(k, U.device - 4, U.device + 6))
      const pp = toScreen(px, hy - 50); portal(c, pp.x, pp.y, 30 * z, 50 * z, open, spin + i)
      const go = seg(k, U.land + 6 + i * 2, U.seeks[i % 3] + (i > 2 ? 4 : 0)), mx = px + (tx - side * (16 + 10 * (i % 3)) - px) * sm(go)
      const my = hy + (floorY - hy) * sm(go) - Math.sin(Math.PI * go) * 30 - (i >= 4 ? 34 * sm(go) : 0)
      if (go > 0) { const s = toScreen(mx, my); drawMeeseeks(c, s.x, s.y, 120 * z, (sc.real >> 2) + i, side > 0, true, 1 - seg(k, U.device - 2, U.device + 6)) }
    }
    U.seeks.forEach((at, i) => { const a = k - at; if (a >= 0 && a < 14) { const p = toScreen(tx + (i - 1) * 24, floorY - 70 - i * 10); card(c, ['CAN DO!', 'OOOH YEAH!', 'LOOK AT ME!'][i], p.x, p.y - 80 * z, (30 + 6 * i) * S, '#7fd6ff', 1 - a / 14, (i - 1) * 0.12, '#06324a')
      c.save(); c.translate(p.x, p.y); for (let j = 0; j < 8; j++) { const an = j / 8 * Math.PI * 2 + i; c.strokeStyle = '#ffffff'; c.globalAlpha = 1 - a / 14; c.lineWidth = 3 * S; c.beginPath(); c.moveTo(Math.cos(an) * 18 * z, Math.sin(an) * 18 * z); c.lineTo(Math.cos(an) * (30 + a * 5) * z, Math.sin(an) * (30 + a * 5) * z); c.stroke() } c.restore() } })
  }
  // the DEVICE: a pulsing green core in Rick's hands, arcs crawling out of it
  if (k >= U.device && k < U.boom) {
    const p = toScreen(sc.fx0 + sc.dir * 14, floorY - 56), u = seg(k, U.device, U.boom), pulse = 0.5 + 0.5 * Math.sin(sc.real * (0.3 + u * 0.9))
    const r = (10 + 30 * u + 8 * pulse) * z, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3)
    g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.25, 'rgba(180,255,100,0.9)'); g.addColorStop(1, 'rgba(60,200,40,0)')
    c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r * 3, 0, Math.PI * 2); c.fill()
    c.save(); c.strokeStyle = '#eaffc4'; c.lineWidth = 2 * S; c.shadowColor = GREEN; c.shadowBlur = 10
    for (let i = 0; i < 4 + Math.floor(u * 8); i++) { const an = hash(i, sc.real >> 1) * Math.PI * 2, len = (30 + 90 * u * hash(i, 61)) * z
      c.beginPath(); c.moveTo(p.x, p.y); for (let j = 1; j <= 4; j++) { const q = j / 4; c.lineTo(p.x + Math.cos(an) * len * q + (hash(i * 7 + j, sc.real) - 0.5) * 16 * z, p.y + Math.sin(an) * len * q + (hash(i * 5 + j, sc.real + 3) - 0.5) * 16 * z) } c.stroke() }
    c.restore()
    // suction: particles streaming INTO the core before the blast
    if (k >= U.count[1]) for (let i = 0; i < 40; i++) { const an = hash(i, 71) * Math.PI * 2, ph = ((sc.real * (0.04 + 0.03 * hash(i, 72)) + hash(i, 73)) % 1), rr = (1 - ph) * (260 + 200 * hash(i, 74)) * z
      c.fillStyle = i % 3 ? '#b6ff5c' : '#ffffff'; c.globalAlpha = ph; c.fillRect(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr * 0.6, 3 * S, 3 * S) }
    c.globalAlpha = 1
  }
  // the DETONATION: a green portal-energy sphere, rings, debris, smoke
  const b = k - U.boom
  if (b >= 0 && b < 110) {
    const p = toScreen(sc.fx0, floorY - 50), grow = easeO(cl((b + (sc.hold > 0 ? (U.stop.boom - sc.hold) * 0.25 : 0)) / 30, 0, 1))
    const R = (60 + 520 * grow) * z, fade = 1 - seg(b, 30, 90)
    if (fade > 0) {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
      g.addColorStop(0, `rgba(255,255,240,${fade})`); g.addColorStop(0.3, `rgba(200,255,120,${0.95 * fade})`); g.addColorStop(0.7, `rgba(60,210,40,${0.75 * fade})`); g.addColorStop(1, 'rgba(20,120,20,0)')
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fill()
      c.save(); c.globalAlpha = 0.8 * fade; c.translate(p.x, p.y); c.lineCap = 'round'
      for (let i = 0; i < 9; i++) { const a0 = sc.real * 0.1 * (i & 1 ? 1 : -1) + i; c.strokeStyle = i & 1 ? '#1f8a1f' : '#f4ffd8'; c.lineWidth = (6 + i) * z; c.beginPath(); c.arc(0, 0, R * (0.2 + i * 0.08), a0, a0 + 2.4); c.stroke() }
      c.restore()
    }
    for (let i = 0; i < 4; i++) shock(c, p.x, toScreen(0, floorY).y, b - i * 5, 40, (700 + i * 160) * z, i & 1 ? GLOW : '#ffffff', (18 - i * 3) * z)
    for (let i = 0; i < 30; i++) { const an = -Math.PI * (0.05 + 0.9 * hash(i, 81)), v = (5 + 12 * hash(i, 82)) * z, x = p.x + Math.cos(an) * v * b, y = p.y + Math.sin(an) * v * b + 0.18 * b * b * z
      if (y > H + 20) continue; c.fillStyle = i % 4 ? '#3a2c1c' : '#b6ff5c'; c.globalAlpha = 1 - seg(b, 40, 80); c.fillRect(x, y, (4 + 6 * hash(i, 83)) * z, (4 + 6 * hash(i, 84)) * z) }
    c.globalAlpha = 1
    const sa = seg(b, 18, 50) * (1 - seg(b, 70, 110))
    if (sa > 0) for (let i = 0; i < 16; i++) { const an = Math.PI * (1.0 + hash(i, 91)), rr = (120 + 260 * hash(i, 92) * seg(b, 18, 90)) * z
      const x = p.x + Math.cos(an) * rr, y = toScreen(0, floorY).y - 30 * z - Math.abs(Math.sin(an)) * rr * 0.5, r = (60 + 50 * hash(i, 93)) * z
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(70,90,60,${0.55 * sa})`); g.addColorStop(1, 'rgba(70,90,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill() }
    // the scorch / green crater glow
    const cr = toScreen(sc.fx0, floorY), ca = seg(b, 2, 10) * (1 - seg(b, 80, 110))
    if (ca > 0) { c.save(); c.globalAlpha = ca; const g = c.createRadialGradient(cr.x, cr.y, 0, cr.x, cr.y, 220 * z); g.addColorStop(0, 'rgba(160,255,90,0.8)'); g.addColorStop(1, 'rgba(40,120,20,0)')
      c.fillStyle = g; c.beginPath(); c.ellipse(cr.x, cr.y, 220 * z, 40 * z, 0, 0, Math.PI * 2); c.fill(); c.restore() }
  }
  if (k >= U.landAt && k < U.landAt + 18) { const L = launchAt(k), p = toScreen(L.x, sc.floor); dust(c, p.x, p.y, k - U.landAt, 18, z) }
  // the homecoming portal: Rick strolls out of it
  if (k >= U.portal - 2 && k < U.total) {
    const p = toScreen(sc.homeX - sc.dir * 6, floorY - 62); portal(c, p.x, p.y, 44 * z, 74 * z, easeO(seg(k, U.portal - 2, U.portal + 6)) * (1 - seg(k, U.out - 4, U.total)), spin)
    // Rick strolls out IN FRONT of the portal (his real sprite, redrawn over it)
    const L = f._lastFrameDraw
    if (k >= U.stepOut && L) { const fp = toScreen((f.x || 0) + (f.w || 60) / 2, (f.y || 0) + (f.h || 100)); drawFighter(c, f, fp.x, fp.y, L.h * z, { alpha: f._fxAlpha == null ? 1 : f._fxAlpha }) }
  }
}
function dust(c, x, y, a, life, z) {
  for (let i = 0; i < 14; i++) { const side = i & 1 ? 1 : -1, v = (2 + 5 * hash(i, 101)) * z, px = x + side * v * a * 1.6, py = y - (6 + 10 * hash(i, 102)) * z * Math.sqrt(a), r = (10 + 14 * hash(i, 103)) * z * (0.6 + a / life)
    c.fillStyle = `rgba(200,190,170,${0.5 * (1 - a / life)})`; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill() }
}

// ── title cut-in ──────────────────────────────────────────────────────────────────────────────────────────────────────
function titleCard(c, sc, k) {
  if (k > 34) return
  const a = k < 3 ? k / 3 : k > 28 ? (34 - k) / 6 : 1, slide = easeO(cl(k / 7, 0, 1)), y0 = H * 0.14, bh = 150 * S
  c.save(); c.globalAlpha = a; c.translate((1 - slide) * W, 0)
  c.beginPath(); c.moveTo(0, y0 + 28 * S); c.lineTo(W, y0 - 28 * S); c.lineTo(W, y0 - 28 * S + bh); c.lineTo(0, y0 + 28 * S + bh); c.closePath()
  const g = c.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, 'rgba(10,40,8,0.94)'); g.addColorStop(1, 'rgba(2,14,4,0.94)'); c.fillStyle = g; c.fill()
  c.fillStyle = GREEN; c.fillRect(0, y0 + 4 * S, W, 4 * S); c.fillRect(0, y0 + bh - 8 * S, W, 4 * S)
  for (let i = 0; i < 10; i++) { const sx = ((k * (26 + i * 6) + i * 170) % (W + 300)) - 150, sy = y0 + 20 * S + hash(i, 5) * (bh - 40 * S); c.fillStyle = 'rgba(200,255,150,0.45)'; c.fillRect(sx, sy, 80 + 120 * hash(i, 6), 2 * S) }
  // a portal behind the portrait + the portrait
  portal(c, W * 0.15, y0 + bh * 0.5, 62 * S, 62 * S, easeO(seg(k, 1, 8)), k * 0.2)
  const por = cachedSpriteSheet('./rick_pfp.png')
  if (ready(por)) { const ph = bh * 0.95, pw = ph * por.naturalWidth / por.naturalHeight, r = 54 * S * easeO(seg(k, 1, 8))
    c.save(); c.beginPath(); c.arc(W * 0.15, y0 + bh * 0.5, r, 0, Math.PI * 2); c.clip(); c.imageSmoothingEnabled = false; c.drawImage(por, W * 0.15 - pw / 2, y0 + bh / 2 - ph / 2 + 10 * S, pw, ph); c.restore()
    c.save(); c.strokeStyle = GLOW; c.lineWidth = 4 * S; c.beginPath(); c.arc(W * 0.15, y0 + bh * 0.5, r, 0, Math.PI * 2); c.stroke(); c.restore() }
  const slam = k < 5 ? 0 : k < 11 ? 1.9 - 0.9 * easeO((k - 5) / 6) : 1
  if (slam > 0) card(c, 'SELF-DESTRUCT', W * 0.58, y0 + bh * 0.42, 80 * S * slam, '#ffffff', 1, -0.04, '#0b3a08')
  if (k >= 10) card(c, 'RICK SANCHEZ  ·  ULTIMATE', W * 0.6, y0 + bh * 0.8, 24 * S, GLOW, cl((k - 10) / 5, 0, 1), -0.04)
  c.restore()
}
const SUBS = () => [[0, 40, 'Wubba lubba dub dub!'], [U.dim0 - 6, U.dim0 + 40, "Let's take the scenic route."], [U.land + 2, U.device - 2, 'Meeseeks — make his day worse.'],
  [U.device, U.count[1], "It's called a deterrent."], [U.cool, U.total, '…Well, that\'s cool.']]

function drawScreen(ctx, canvas) {
  const sc = rickUltScene(); if (!sc) return false
  W = canvas.width; H = canvas.height; S = H / 720
  const k = sc.k, quiet = calm(), c = ctx
  const last = sc.impacts[sc.impacts.length - 1], age = last ? sc.real - last.r : 999, P = last?.power || 1
  const t = sc.target, tp = toScreen((t.x || 0) + (t.w || 60) / 2, (t.y || 0) + (t.h || 100) * 0.45)
  // 1. VIRTUAL CAMERA + PUNCH-ZOOM: re-blit the finished world frame scaled about the subject (close-ups past the engine
  //    camera's reach), punched in on every contact; the world FX below are drawn through the same mapping.
  const D = dimAt(k)
  VX = { sx: 0, sy: 0, z: 1 }
  if (!D) {
    const V = vcam(sc, k, tp)
    let z = quiet ? Math.min(V.z, 1.3) : V.z
    if (!quiet && age < 12) z *= 1 + 0.05 * P * (1 - age / 12) * (age < 2 ? 1.5 : 1)
    if (z > 1.01) {
      const sw = W / z, sh = H / z, sx = cl(V.x - sw * 0.5, 0, W - sw), sy = cl(V.y - sh * 0.58, 0, H - sh)
      try { c.imageSmoothingEnabled = false; c.drawImage(canvas, sx, sy, sw, sh, 0, 0, W, H); VX = { sx, sy, z } } catch (_) {}
    }
    // 2. the home-world FX (portals, swarm, device, blast), through the virtual camera
    c.save(); c.setTransform(VX.z, 0, 0, VX.z, -VX.sx * VX.z, -VX.sy * VX.z)
    worldFx(c, sc)
    c.restore()
  }
  // 3. grade: countdown alarm (dark + red pulse), the burp warm-up
  if (k >= U.count[0] && k < U.boom) {
    const u = seg(k, U.device, U.boom), pulse = 0.5 + 0.5 * Math.sin(sc.real * 0.45)
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${(0.35 + 0.35 * pulse) * u})`)
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = `rgba(0,10,0,${0.25 * u})`; c.fillRect(0, 0, W, H)
  }
  // 4. the five dimension cuts own the whole frame
  if (D) dimensionCut(c, sc, D)
  // 5. IMPACT FRAMES (world only — bars + type stay crisp)
  const b = k - U.boom
  if (b >= 0 && b < 40 && !D) {
    if (sc.real - (sc.impacts.find(i => i.kind === 'blast')?.r ?? sc.real) < 2) { c.fillStyle = quiet ? 'rgba(255,255,255,0.35)' : '#ffffff'; c.fillRect(0, 0, W, H) }
    else if (!quiet && sc.hold > U.stop.boom - 7) { c.save(); c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.restore() }
    else { c.fillStyle = `rgba(190,255,140,${(quiet ? 0.15 : 0.5) * (1 - seg(b, 0, 30))})`; c.fillRect(0, 0, W, H) }
    if (!quiet && b < 20) speedLines(c, vmap(toScreen(sc.fx0, sc.floor - 50)).x, vmap(toScreen(sc.fx0, sc.floor - 50)).y, 0.35 * (1 - b / 20), 77 + (sc.real >> 1), 56, '#eaffd0')
  } else if (!D && last && age < 10 && last.kind !== 'blast') {
    c.fillStyle = `rgba(255,255,255,${(quiet ? 0.1 : 0.35) * (1 - age / 10)})`; c.fillRect(0, 0, W, H)
    if (!quiet && age < 6) speedLines(c, vmap(tp).x, vmap(tp).y, 0.3 * (1 - age / 6), last.k)
  }
  // portal-out flash on the way into the multiverse / back
  if (k >= U.intoPortal - 2 && k < U.dim0) { c.fillStyle = `rgba(190,255,120,${0.7 * seg(k, U.intoPortal - 2, U.dim0)})`; c.fillRect(0, 0, W, H) }
  if (k >= U.drop && k < U.drop + 6) { c.fillStyle = `rgba(190,255,120,${0.7 * (1 - seg(k, U.drop, U.drop + 6))})`; c.fillRect(0, 0, W, H) }
  // 6. letterbox
  const inU = easeO(cl(sc.real / 10, 0, 1)), outU = easeO(cl((U.total - k) / 14, 0, 1)), bar = H * 0.11 * Math.min(inU, outU)
  c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
  c.globalAlpha = Math.min(inU, outU); c.fillStyle = GREEN; c.fillRect(0, bar - 2 * S, W, 2 * S); c.fillRect(0, H - bar, W, 2 * S); c.globalAlpha = 1
  // 7. title, the burp, the countdown, BOOM
  titleCard(c, sc, k)
  if (k >= 3 && k < 26) { const fp = vmap(toScreen(sc.fx0, sc.floor - 70)); card(c, '*BURRRP*', cl(fp.x - 120 * S, 120 * S, W - 120 * S), cl(fp.y, H * 0.36, H * 0.7), 36 * S * (k < 7 ? 1.4 - 0.1 * (k - 3) : 1), '#e8ffd0', 1 - seg(k, 20, 26), 0.12) }
  U.count.forEach((at, i) => { const a = k - at; if (a >= 0 && a < 12) { const pop = a < 4 ? 1.8 - 0.2 * a : 1; card(c, String(3 - i), W / 2, H * 0.46, 190 * S * pop, i === 2 ? '#ff4a3a' : '#ffffff', 1 - seg(a, 8, 12), 0, '#300') } })
  if (k >= U.device && k < U.boom) card(c, 'SELF-DESTRUCT ARMED', W / 2, bar + 34 * S, 30 * S, (sc.real >> 3) & 1 ? '#ff4a3a' : '#ffffff', seg(k, U.device, U.device + 5), 0, '#300')
  if (b >= 2 && b < 50) { const pop = b < 8 ? 2.2 - 1.2 * easeO((b - 2) / 6) : 1; card(c, 'BOOM.', W / 2, H * 0.34, 150 * S * pop, '#c6ff6e', 1 - seg(b, 38, 50), -0.05, '#0b3a08') }
  // 8. subtitles in Rick's voice
  for (const [a0, a1, txt] of SUBS()) if (k >= a0 && k < a1) subtitle(c, txt, seg(k, a0, a0 + 4) * (1 - seg(k, a1 - 4, a1)), bar)
  // 9. hit counter + damage numbers
  if (sc.hits > 0) {
    const lh = sc.impacts.filter(i => i.dealt > 0).pop(), ha = lh ? sc.real - lh.r : 99, pop = ha < 6 ? 1.35 - 0.35 * ha / 6 : 1
    c.save(); c.translate(W - 40 * S, bar + 50 * S); c.scale(pop, pop); c.textAlign = 'right'; c.textBaseline = 'middle'
    c.font = `italic 900 ${Math.round(46 * S)}px Impact, 'Arial Black', sans-serif`; c.lineWidth = 6 * S; c.strokeStyle = '#0b2a08'
    const txt = `${sc.hits} HIT${sc.hits > 1 ? 'S' : ''}`; c.strokeText(txt, 0, 0); c.fillStyle = GLOW; c.fillText(txt, 0, 0)
    c.font = `italic 800 ${Math.round(17 * S)}px Arial, sans-serif`; c.lineWidth = 4 * S; const dm = `${Math.round(sc.dmg)} DAMAGE`
    c.strokeText(dm, 0, 34 * S); c.fillStyle = '#fff'; c.fillText(dm, 0, 34 * S); c.restore()
  }
  for (const n of sc.nums || []) {
    const a = sc.real - n.r; if (a > 46) continue
    const big = n.kind === 'boom', base = D ? { x: W * 0.5, y: H * 0.34 } : big ? { x: W * 0.78, y: H * 0.62 } : vmap(toScreen((t.x || 0) + (t.w || 60) / 2, (t.y || 0) - 10))
    card(c, String(n.v), base.x + (hash(n.r, 3) - 0.5) * 60 * S, base.y - a * 1.4 * S, (big ? 64 : D ? 44 : 32) * S * (a < 4 ? 1.4 - 0.1 * a : 1), big ? '#c6ff6e' : '#ffffff', 1 - seg(a, 30, 46), 0, '#111')
  }
  return true
}
registerCineScreen('rick_self_destruct', drawScreen)
