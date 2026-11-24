// dinoFx.js — MSV1-DINO RENDER-ONLY layer for the Dino Thunder Rangers (dinothunder). Reads f._duo / f._ninja, never writes
// sim state (the only fields it writes are underscore render counters: f._dtIntroFx, f._dtHudPre). Draws:
//   bursts dtRing / dtSparkle / dtShatter / dtBoom / dtStreak / dtScream (the sheets' DINO ZORD rings + sparkle),
//   the Drago Clone strips (premade darker Trent: assets/dt_white/clone), Super Speed / Evil / Super Dino Mode auras,
//   Camouflage shimmer + footstep dust, the supers (Raptor Rider, Tricera head, Ptera head, Drago slashes), Z-REX BLASTER
//   ("GO!" flash, BOSS KILLED cut-in, braided beam, Trent's slash), the intro ride-in and the HUD (swap strip while P is
//   held, the gem bar label, the Corruption bar while Trent is in). Reduce Motion / Flashing → calmer versions.
import { DINO_ID } from './dinoState.js'
import { VICTORY_ART } from './matchflow.js'
import { ZREX } from './dinoSupers.js'

const cache = new Map()
const image = src => { let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const X = n => `./assets/dinothunder/${n}.png`
const GEM = { dt_red: '#e0201c', dt_blue: '#1e5bff', dt_yellow: '#f6c600', dt_white: '#e8e8f0' }
const KEYS = [['dt_red', 'J'], ['dt_blue', 'K'], ['dt_yellow', 'L'], ['dt_white', 'O']]
export const isDino = f => !!(f && f._duo && f._duo.id === DINO_ID)
const jit = (n, i) => (((Math.imul(n * 31 + i, 2654435761) >>> 0) % 1000) / 1000) * 2 - 1   // fixed per-burst scatter (no Math.random)
// Ranger art a team skin has its own copy of (tools/dinoskins EXTRAS); zord heads / GO! / emblems carry no Ranger
const SKIN_ART = new Set(['red_rider', 'blue_rider', 'yellow_rider', 'blue_mission', 'yellow_mission', 'bossKilled', 'bossKilled_blue'])
const art = (f, name) => (f?._dtSkinArt && SKIN_ART.has(name)) ? `${f._dtSkinArt}/extra/${name}.png` : X(name)
// a partner Ranger's strip: the skin's own when a team skin is on
const skinForm = (f, formAnim) => (form, key) => f?._dtSkinForms?.[form]?.[key] || formAnim(form, key)
function img(c, name, x, y, sc = 1, alpha = 1, dir = 1, rot = 0) {
  const im = image(name.startsWith('./') ? name : X(name)); if (!ready(im)) return false
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha; c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc); c.restore(); return true
}

// the Drago Clone: Trent's own strip from the premade clone folder (null for everyone else → nsFx draws as before)
const cloneAnims = new Map()
export function dinoCloneAnim(f, key) {
  if (!isDino(f) || f._duo.form !== 'dt_white') return null
  const A = (f.animationData || {})[key] || (f.animationData || {}).idle; if (!A) return null   // always the base Trent strips (one premade clone set)
  let C = cloneAnims.get(A.sheet)
  if (!C) { C = { ...A, sheet: A.sheet.replace(/\/([^/]+\.png)$/, '/clone/$1') }; cloneAnims.set(A.sheet, C) }
  return C
}

// ── bursts (s.fx entries the sim pushed with dinothunder.js burst kinds). true = handled ──
export function drawDinoBurst(c, f, e, u, calm) {
  if (!isDino(f)) return false
  const col = e.col || GEM[f._duo.form] || '#fff'
  switch (e.k) {
    case 'dtRing': {   // the sheets' DINO ZORD energy rings, growing out of the feet
      const blue = col === GEM.dt_blue, sc = (e.small ? 0.8 : e.big ? 1.9 : 1.4) * (1 + u * 0.8)
      img(c, (e.ring === 2 ? 'ring2' : 'ring1') + (blue ? '_blue' : ''), e.x, e.y - 48, sc, 0.95 * (1 - u))
      c.save(); c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = 0.7 * (1 - u)
      c.beginPath(); c.ellipse(e.x, e.y - 2, 18 + u * (e.big ? 110 : 60), 5 + u * 10, 0, 0, Math.PI * 2); c.stroke(); c.restore()
      return true
    }
    case 'dtSparkle': {
      const blue = col === GEM.dt_blue
      img(c, blue ? 'sparkle_blue' : 'sparkle', e.x, e.y - 60, 1.6 + (calm ? 0 : Math.sin(u * 9) * 0.2), 1 - u)
      if (!calm) { c.save(); c.fillStyle = col; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.globalAlpha = 0.8 * (1 - u); c.fillRect(e.x + Math.cos(a) * (10 + u * 50) - 2, e.y - 60 + Math.sin(a) * (10 + u * 50) - 2, 4, 4) } c.restore() }
      return true
    }
    case 'dtShatter': {   // the clone breaking into dark glass + afterimage shards
      c.save(); c.fillStyle = '#2a2a32'; c.strokeStyle = '#c01a1a'; c.lineWidth = 1
      for (let i = 0; i < 10; i++) { const a = jit(e.n, i) * Math.PI, d = 6 + u * (40 + i * 6), x = e.x + Math.cos(a) * d, y = e.y - 50 + Math.sin(a) * d * 0.8 + u * u * 40
        c.globalAlpha = 0.9 * (1 - u); c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 4, y + 3); c.lineTo(x - 4, y + 4); c.closePath(); c.fill(); c.stroke() }
      c.restore(); return true
    }
    case 'dtBoom': {   // ground explosion (Tyranno Slam / Shield Quake / supers)
      c.save(); const r = 20 + u * 90
      const g = c.createRadialGradient(e.x, e.y - 20, 4, e.x, e.y - 20, r); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(0.45, 'rgba(255,150,40,0.8)'); g.addColorStop(1, 'rgba(160,30,10,0)')
      c.globalAlpha = calm ? 0.6 * (1 - u) : 1 - u; c.fillStyle = g; c.beginPath(); c.ellipse(e.x, e.y - 20, r, r * 0.7, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#6a4a2a'; for (let i = 0; i < 7; i++) { const a = (i + 0.5) / 7 * Math.PI; c.fillRect(e.x + Math.cos(a) * u * 70 - 3, e.y - Math.sin(a) * u * 80 - 3 + u * u * 50, 6, 6) }
      c.restore(); return true
    }
    case 'dtStreak': {
      c.save(); c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = 0.6 * (1 - u)
      for (let i = 0; i < 4; i++) { const yy = e.y - 20 - i * 20, len = 40 + (i * 29) % 50; c.beginPath(); c.moveTo(e.x - (e.dir || 1) * 14, yy); c.lineTo(e.x - (e.dir || 1) * (14 + len), yy); c.stroke() }
      c.restore(); return true
    }
    case 'dtScream': {   // sonic rings travelling along the cone (yellow)
      const dir = e.dir || 1, ang = (e.ang || 0) * Math.PI / 180, d = (e.len || 240) * u
      const x = e.x + dir * d * Math.cos(ang), y = e.y + d * Math.sin(ang)
      c.save(); c.strokeStyle = GEM.dt_yellow; c.lineWidth = 3; c.globalAlpha = 0.85 * (1 - u)
      c.beginPath(); c.ellipse(x, y, 8 + u * 14, 18 + u * 50, dir * ang, 0, Math.PI * 2); c.stroke()
      c.strokeStyle = '#fff7c0'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x - dir * 6, y, 5 + u * 10, 12 + u * 38, dir * ang, 0, Math.PI * 2); c.stroke()
      c.restore(); return true
    }
  }
  return false
}

// ── behind the body: auras, Camouflage dust, Super Speed / Evil afterimages ──
export function drawDinoUnder(c, f, drawPose, calm) {
  if (!isDino(f)) return
  const d = f._duo, cx = f.x + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94), t = d.t || 0
  if (d.sdm > 0) {   // SUPER DINO MODE: the gem colour flaring up from the feet
    c.save(); c.globalAlpha = 0.5 * Math.min(1, d.sdm / 40); c.strokeStyle = GEM[d.form]; c.lineWidth = 3
    c.beginPath(); c.ellipse(cx, feet - 56, 36 + (calm ? 0 : Math.sin(t / 4) * 4), 72, 0, 0, Math.PI * 2); c.stroke()
    if (!calm) { c.fillStyle = GEM[d.form]; for (let i = 0; i < 8; i++) { const yy = feet - ((t * 3 + i * 19) % 140); c.globalAlpha = 0.6 * (1 - (feet - yy) / 140); c.fillRect(cx + Math.sin(t / 6 + i * 2.1) * 30 - 2, yy - 2, 4, 4) } }
    c.restore()
  }
  if (d.evil > 0) {   // EVIL WHITE RANGER: a black-red aura
    c.save(); c.globalAlpha = 0.55; c.fillStyle = 'rgba(120,0,0,0.5)'; c.beginPath(); c.ellipse(cx, feet - 50, 44 + (calm ? 0 : Math.sin(t / 3) * 5), 76, 0, 0, Math.PI * 2); c.fill(); c.restore()
  }
  if ((d.speed > 0 || (d.form === 'dt_white' && f._ninja?.streak)) && !calm) {   // afterimages (Super Speed red / Trent white)
    const key = f._lastSpriteAction || 'run', fr = f._lastSpriteFrame | 0, dir = f.facing || 1, mv = Math.sign(f.vx || 0) || dir
    for (let i = 3; i >= 1; i--) drawPose(c, f, key, fr, cx - mv * i * 22, feet, dir, 0.22 / i)
  }
  if (d.camo > 0) {   // CAMOUFLAGE: footstep dust + a faint shimmer outline (both players see it)
    c.save(); c.fillStyle = '#c9b48a'; c.globalAlpha = 0.5
    if (Math.abs(f.vx || 0) > 0.5 && t % 10 < 5) { c.beginPath(); c.ellipse(cx - (f.facing || 1) * 8, feet - 3, 9, 3, 0, 0, Math.PI * 2); c.fill() }
    c.strokeStyle = 'rgba(230,240,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, feet - 52, 22 + (calm ? 0 : Math.sin(t / 2) * 2), 56, 0, 0, Math.PI * 2); c.stroke()
    c.restore()
  }
}

// ── in front: supers + ultimate + the Drago Clone glint ──
export function drawDinoFx(c, f, drawPose, formAnim0, calm) {
  const formAnim = skinForm(f, formAnim0)
  if (!isDino(f)) return
  const s = f._ninja, u = s?.sup, feetF = (f.y || 0) + (f.h || 94)
  if (s?.mirror && f._duo.form === 'dt_white' && (s.mirror.t % 45) < 8 && !calm) {   // the clone's red visor glint (its tell)
    const m = s.mirror, hx = m.ix + (f.w || 48) / 2 + (m.dir || 1) * 6, hy = m.ifeet - (f.h || 94) * 0.9
    c.save(); c.fillStyle = '#ff2a2a'; c.globalAlpha = 0.9; c.beginPath(); c.arc(hx, hy, 3.5, 0, Math.PI * 2); c.fill(); c.restore()
  }
  drawWinArt(c, f)
  if (!u) return
  const floor = u.floor || feetF
  if (u.kind === 'sSuper' && u.form === 'dt_red' && u.rx != null) img(c, art(f, 'red_rider'), u.rx, floor - 70, 1.9, 1, u.dir)
  if (u.kind === 'sSuper' && u.form === 'dt_blue') {
    if (u.phase === 'sparkle') img(c, 'sparkle_blue', u.x0, floor - 70, 2.2, 0.9)
    if (u.phase === 'rings') img(c, 'ring2_blue', u.x0, floor - 60, 2.4, 0.8)
    if (u.hx != null) img(c, 'triceraHead', u.hx, floor - 110, 1.4, 1, u.dir)
  }
  if (u.kind === 'sSuper' && u.form === 'dt_yellow') {
    if (u.phase === 'rings') img(c, 'ring2', u.x0, floor - 60, 2.4, 0.8)
    if (u.px != null) img(c, 'pteraHead', u.px, u.py, 1.3, 1, u.tx != null ? Math.sign(u.tx - u.ox) || u.dir : u.dir, u.tx != null ? 0.5 * (Math.sign(u.tx - u.ox) || 1) : 0)
  }
  if (u.kind === 'sSuper' && u.form === 'dt_white' && u.slash) {   // the Drago slashes: a white-gold cut line per direction
    const a = u.slash.ang * Math.PI / 180, L = 150
    c.save(); c.strokeStyle = '#fff6d0'; c.lineWidth = 5; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(u.slash.x - Math.cos(a) * L, u.slash.y - Math.sin(a) * L); c.lineTo(u.slash.x + Math.cos(a) * L, u.slash.y + Math.sin(a) * L); c.stroke()
    c.strokeStyle = '#d4a520'; c.lineWidth = 2; c.stroke(); c.restore()
    const A = formAnim('dt_white', 'dragoCut'); drawPose(c, f, 'dragoCut', 1, u.slash.x + Math.cos(a) * 70, u.slash.y + (f.h || 94) / 2, Math.cos(a) >= 0 ? 1 : -1, 0.55, 0, A)
  }
  if (u.kind === 'sZrex') drawZrex(c, f, u, drawPose, formAnim, calm)
}
// ── Z-REX BLASTER, world part (dinoSupers.js ZREX timeline): the team assembles, the energy gathers over the count, the
// braided beam crosses to the target and detonates. The SHOTS (close-ups, whip, pull-back) are the screen pass below.
const ZT = { call: ZREX.call, arrive: ZREX.arrive, leap: 12, count: ZREX.count, boom: ZREX.boom, blast: ZREX.blastAt, total: ZREX.total }
let CINE = null   // render-only memo for the screen pass, rebuilt every frame the move is drawn
function zrexSlots(c, f, u, cx) {
  // the three partners stand behind the caster; if the screen has no room behind, the formation steps forward instead
  const m = c.getTransform(), W = c.canvas.width, sx = x => m.a * x + m.e
  const behind = [0, 1, 2].map(i => cx - u.dir * (92 + i * 84))
  const off = behind.some(x => sx(x) < W * 0.04 || sx(x) > W * 0.96)
  return off ? [0, 1, 2].map(i => cx + u.dir * (88 + i * 80)) : behind
}
function drawZrex(c, f, u, drawPose, formAnim, calm) {
  const t = u.t ?? 0, cx = f.x + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94), dir = u.dir
  const mates = ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white'].filter(k => k !== f._duo.form), slots = zrexSlots(c, f, u, cx)
  // 1. the partners leap in one at a time (an arc from off-shot behind them), then hold their victory pose
  mates.forEach((form, i) => {
    const at = ZT.arrive[i]; if (t < at) return
    const k = Math.min(1, (t - at) / ZT.leap), x = slots[i] - dir * 240 * (1 - k), y = feet - Math.sin(k * Math.PI) * 120
    if (k < 1) { const A = formAnim(form, 'jump'); for (let g = 2; g >= 1; g--) drawPose(c, f, 'jump', 1, x - dir * g * 26, y, dir, 0.25 / g, 0, A); drawPose(c, f, 'jump', Math.min((A?.frames || 1) - 1, 1), x, y, dir, 1, 0, A) }
    else { const A = t < ZT.boom ? formAnim(form, 'win') : formAnim(form, 'idle'); drawPose(c, f, t < ZT.boom ? 'win' : 'idle', 0, x, feet, dir, 1, 0, A) }
    if (k >= 1 && t - at - ZT.leap < 8 && !calm) { c.save(); c.globalAlpha = 0.6 * (1 - (t - at - ZT.leap) / 8); c.strokeStyle = GEM[form]; c.lineWidth = 4; c.beginPath(); c.ellipse(slots[i], feet, 30 + (t - at - ZT.leap) * 6, 8, 0, 0, Math.PI * 2); c.stroke(); c.restore() }   // landing ring
  })
  // the muzzle: in front of the front-most Ranger, chest height
  const front = [cx, ...slots].reduce((a, x) => dir > 0 ? Math.max(a, x) : Math.min(a, x)), mx = front + dir * 34, my = feet - (f.h || 94) * 0.55
  // 2. the count: the four gem colours spiral into the muzzle, the ball grows with each number
  if (t >= ZT.count && t < ZT.boom) {
    const k = (t - ZT.count) / (ZT.boom - ZT.count), r = 8 + 26 * k
    c.save(); c.globalCompositeOperation = 'lighter'
    ;['#e0201c', '#1e5bff', '#f6c600', '#e8e8f0'].forEach((col, i) => { for (let j = 0; j < 5; j++) { const a = t * 0.18 + i * 1.57 + j * 0.4, d = (90 - j * 16) * (1 - k * 0.6)
      c.globalAlpha = 0.5; c.fillStyle = col; c.beginPath(); c.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.6, 4 - j * 0.5, 0, Math.PI * 2); c.fill() } })
    const g = c.createRadialGradient(mx, my, 0, mx, my, r * 1.8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,230,160,0.8)'); g.addColorStop(1, 'rgba(255,80,40,0)')
    c.globalAlpha = calm ? 0.6 : 0.85 + 0.15 * Math.sin(t * 0.9); c.fillStyle = g; c.beginPath(); c.arc(mx, my, r * 1.8, 0, Math.PI * 2); c.fill(); c.restore()
  }
  // 3. BOOM → FOUR lasers, one per Ranger in their gem colour, burst from each Ranger's chest and fan out; the shot
  // SLOWS RIGHT DOWN while they wrap around each other and the colours mix, they fuse into ONE white beam, then it
  // ACCELERATES into the foe and stops exactly at their centre (where the foe was frozen) — impact explosion.
  const tx = u.tx ?? (mx + dir * 600), ty = u.ty ?? my, b = t - ZT.boom, HIT = ZREX.beamAt[0] - ZT.boom   // HIT = 44
  let tip = mx, tipY = my
  if (b >= 0 && t < ZT.blast + 10) {
    // speed profile: a fast burst (0-8) → slow motion (8-32) → acceleration (32-HIT)
    const reach = b < 8 ? 0.22 * ease(b / 8) : b < 32 ? 0.22 + 0.18 * ((b - 8) / 24) : b < HIT ? 0.40 + 0.60 * Math.pow((b - 32) / (HIT - 32), 2) : 1
    const fade = t > ZT.blast ? 1 - (t - ZT.blast) / 10 : 1, spin = calm ? 0 : (b < 8 ? b * 0.5 : b < 32 ? 4 + (b - 8) * 0.12 : 6.9 + (b - 32) * 0.6)
    const unite = Math.min(1, Math.max(0, (b - 22) / 16))              // 0 = four separate colours … 1 = one white beam (fused by b 38)
    tip = mx + (tx - mx) * reach; tipY = my + (ty - my) * reach
    const P = k => ({ x: mx + (tip - mx) * k, y: my + (tipY - my) * k })
    const cols = { dt_red: '#ff2a1a', dt_blue: '#2a6aff', dt_yellow: '#ffd21a', dt_white: '#f4f4ff' }
    const origins = [[f._duo.form, cx], ...mates.map((m, i) => [m, slots[i]])]
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'
    origins.forEach(([form, ox], j) => { c.globalAlpha = 0.95 * fade * (1 - unite * 0.8); c.strokeStyle = 'rgba(10,8,20,0.55)'; c.lineWidth = 13; c.beginPath(); c.moveTo(ox, my - 6 + j * 4); c.lineTo(mx, my); c.stroke(); c.strokeStyle = cols[form]; c.lineWidth = 9; c.stroke() })   // each Ranger's own laser into the muzzle
    // the four strands: wide apart at first (a fan of colours), wrapping tighter and tighter until they are one
    const N = 80, spread = 34 * (1 - unite)
    origins.forEach(([form], j) => {
      c.globalAlpha = fade * (1 - unite * 0.9)
      c.beginPath()
      for (let i = 0; i <= N; i++) { const k = i / N, q = P(k), amp = (8 + spread) * (1 - k * 0.55), ph = (k * Math.abs(tip - mx)) / (46 - 18 * unite) - spin + j * Math.PI / 2
        const y = q.y + Math.sin(ph) * amp, x = q.x + Math.cos(ph) * amp * 0.15; i ? c.lineTo(x, y) : c.moveTo(x, y) }
      c.strokeStyle = 'rgba(10,8,20,0.5)'; c.lineWidth = 14 - unite * 6; c.stroke()   // a dark edge so the colour reads on any stage
      c.strokeStyle = cols[form]; c.lineWidth = 10 - unite * 5; c.stroke()
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.22 * fade * (1 - unite); c.lineWidth = 24; c.stroke(); c.globalCompositeOperation = 'source-over'   // each colour's glow
    })
    // where the strands cross, the colours mix: soft blended flares along the braid
    if (unite > 0.05 && unite < 1) for (let i = 1; i < 10; i++) { c.globalCompositeOperation = 'lighter'; const k = i / 10, q = P(k), r = 10 + 14 * unite
      c.globalAlpha = 0.35 * fade * Math.sin(unite * Math.PI); c.fillStyle = ['#ff8a40', '#a06aff', '#80ffb0', '#ffffff'][i % 4]; c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.fill() }
    // the white core: a thin thread while the colours braid → the full united beam
    c.globalCompositeOperation = 'lighter'; const core = 1 + unite * 28
    c.globalAlpha = 0.4 * fade * unite; c.strokeStyle = '#ffe8c0'; c.lineWidth = core * 2.6; c.beginPath(); c.moveTo(mx, my); c.lineTo(tip, tipY); c.stroke()
    c.globalAlpha = fade * (0.3 + 0.7 * unite); c.strokeStyle = '#ffffff'; c.lineWidth = core; c.beginPath(); c.moveTo(mx, my); c.lineTo(tip, tipY); c.stroke()
    // the tip: a bright head that stretches as it accelerates
    if (b < HIT) { const st = b >= 32 ? 1 + (b - 32) * 0.6 : 1; c.globalAlpha = fade; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(tip - dir * 6 * st, tipY, 7 + 9 * st * unite, 6 + unite * 10, 0, 0, Math.PI * 2); c.fill() }
    if (b < 8 && !calm) { c.globalAlpha = 1 - b / 8; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(mx, my, 40 + b * 16, 0, Math.PI * 2); c.fill() }   // muzzle flash
    if (b >= HIT) { const k = (t % 6) / 6; c.globalAlpha = 0.85 * fade; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(tx, ty, 26 + k * 16, 0, Math.PI * 2); c.fill() }   // pouring into the foe's centre
    // IMPACT EXPLOSION as the beam arrives: a fireball in the four colours, debris and a shockwave
    const e = b - HIT
    if (e >= 0 && e < 30) {
      const k = e / 30
      c.globalAlpha = (calm ? 0.5 : 1) * (1 - k); const g = c.createRadialGradient(tx, ty, 0, tx, ty, 50 + k * 150); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,200,90,0.95)'); g.addColorStop(0.7, 'rgba(255,70,30,0.6)'); g.addColorStop(1, 'rgba(120,20,10,0)')
      c.fillStyle = g; c.beginPath(); c.arc(tx, ty, 50 + k * 150, 0, Math.PI * 2); c.fill()
      ;['#ff2a1a', '#2a6aff', '#ffd21a', '#ffffff'].forEach((col, i) => { c.globalAlpha = Math.max(0, 0.9 - k - i * 0.05); c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.arc(tx, ty, 30 + k * (140 + i * 40), 0, Math.PI * 2); c.stroke() })
      for (let i = 0; i < 22; i++) { const a = i * 0.2856 + jit(i, 11), d = k * (150 + 110 * Math.abs(jit(i, 13))); c.globalAlpha = 1 - k; c.fillStyle = ['#fff6d0', '#ffb040', '#ff5030', '#ffffff'][i % 4]; c.fillRect(tx + Math.cos(a) * d - 4, ty + Math.sin(a) * d - 4, 8, 8) }
    }
    c.restore()
  }
  // 4. FINAL BLAST on the target: white core, four gem rings, sparks
  if (u.blast && t - u.blast.t < 28) {
    const k = (t - u.blast.t) / 28, X0 = u.blast.x, Y0 = u.blast.y
    c.save(); c.globalCompositeOperation = 'lighter'
    if (!calm || k > 0.2) { c.globalAlpha = 1 - k; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(X0, Y0, 30 + k * 120, 0, Math.PI * 2); c.fill() }
    ;['#e0201c', '#1e5bff', '#f6c600', '#e8e8f0'].forEach((col, i) => { c.globalAlpha = Math.max(0, 1 - k - i * 0.08); c.strokeStyle = col; c.lineWidth = 8 - i; c.beginPath(); c.arc(X0, Y0, 40 + k * (180 + i * 50), 0, Math.PI * 2); c.stroke() })
    for (let i = 0; i < 18; i++) { const a = i * 0.349 + jit(i, 3), d = k * (160 + 90 * jit(i, 5)); c.globalAlpha = 1 - k; c.fillStyle = i % 2 ? '#fff6d0' : '#ffb040'; c.fillRect(X0 + Math.cos(a) * d - 3, Y0 + Math.sin(a) * d - 3, 6, 6) }
    c.restore()
  }
  // the screen pass reads where everything is THIS frame (screen pixels)
  const m = c.getTransform(), S = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f })
  const team = [cx, ...slots.filter((_, i) => t >= ZT.arrive[i])]
  CINE = { fresh: true, t, calm, dir, form: f._duo.form, caster: S(cx, feet - 58), mates: slots.map(x => S(x, feet - 58)), team: S(team.reduce((a, x) => a + x, 0) / team.length, feet - 52),
    muzzle: S(mx, my), tip: S(tip, tipY), target: S(tx, ty), blast: u.blast ? S(u.blast.x, u.blast.y) : null, scale: m.a }
}

// ── Z-REX BLASTER, the SCREEN pass (game.js, after the world, before the HUD; the HUD is hidden while it runs). A
// virtual camera: the finished frame is cropped and blown up (nearest-neighbour) — the real camera, the physics camera
// clamp and the sim never move. Shots: caster close-up → each Ranger as they land → the team over 3 · 2 · 1 → BOOM
// whip to the laser → ride the beam to the target → hold on the target as it is hit, pulling back out.
let _buf = null
const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k)
const mixP = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
function zrexShot(C, H) {
  const t = C.t, z0 = H / 720   // zoom in CANVAS terms (the frame is already at the game camera's zoom)
  const caster = C.caster, team = C.team, mate = i => C.mates[i]
  if (t < ZT.call) return { p: caster, z: 3.4 + 0.3 * t / ZT.call }
  if (t < ZT.count) {
    const i = Math.min(2, Math.floor((t - ZT.call) / 20)), k = ease((t - ZT.arrive[i]) / 6), from = i === 0 ? caster : mate(i - 1)
    return { p: mixP(from, mate(i), k), z: 3.0 + 0.2 * ((t - ZT.arrive[i]) / 20) }
  }
  if (t < ZT.boom) { const k = (t - ZT.count) / (ZT.boom - ZT.count), beat = (t - ZT.count) % 20; return { p: team, z: 1.7 + 0.45 * k + (beat < 3 ? 0.08 * (3 - beat) : 0) } }
  const tgt = C.target, mid = mixP(C.muzzle, tgt, 0.5), b = t - ZT.boom, HIT = ZREX.beamAt[0] - ZT.boom
  if (b < 6) { const k = ease(b / 6); return { p: mixP(team, C.muzzle, k), z: 2.15 + (2.6 - 2.15) * k, whip: 1 - k } }        // BOOM: whip onto the lasers
  if (b < 32) { const k = (b - 6) / 26; return { p: mixP(C.muzzle, C.tip, 0.55), z: 2.6 + 0.25 * k, slow: 1 } }                // slow motion, tight on the colours wrapping
  if (b < HIT) { const k = ease((b - 32) / (HIT - 32)); return { p: mixP(mixP(C.muzzle, C.tip, 0.55), C.tip, k), z: 2.85 - 1.0 * k, whip: 0.6 * k } }   // accelerating with the tip
  if (t < ZT.blast) { const k = (t - ZREX.beamAt[0]) / (ZT.blast - ZREX.beamAt[0]); return { p: mixP(tgt, mid, 0.2 * k), z: 2.0 - 0.6 * k, shake: Math.max(0, 1 - (b - HIT) / 12) } }   // the impact, easing out
  const k = ease((t - ZT.blast) / (ZT.total - ZT.blast)); return { p: C.blast || tgt, z: 1.4 - 0.4 * k, out: k }
}
export function drawDinoZrexCinematic(ctx, canvas) {
  const C = CINE; if (!C || !C.fresh) { CINE = null; return false }
  C.fresh = false
  const W = canvas.width, H = canvas.height, sh = zrexShot(C, H), Z = Math.max(1, sh.z)
  if (!_buf || _buf.width !== W || _buf.height !== H) { _buf = document.createElement('canvas'); _buf.width = W; _buf.height = H }
  const b = _buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H); b.drawImage(canvas, 0, 0)
  const cw = W / Z, chh = H / Z, sx = Math.max(0, Math.min(W - cw, sh.p.x - cw / 2)), sy = Math.max(0, Math.min(H - chh, sh.p.y - chh * 0.55))
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; try { ctx.filter = 'none' } catch (_) {}
  const shk = (sh.shake && !C.calm) ? sh.shake * 14 : 0, jx = shk ? Math.round(jit(C.t, 21) * shk) : 0, jy = shk ? Math.round(jit(C.t, 23) * shk) : 0
  ctx.drawImage(_buf, sx, sy, cw, chh, jx, jy, W, H)
  if (sh.slow) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }   // slow-motion: the world dims around the colours
  // whip: horizontal speed streaks across the frame
  if (sh.whip && !C.calm) { ctx.globalAlpha = 0.5 * sh.whip; ctx.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) { const y = ((i * 97) % 100) / 100 * H, w = W * (0.3 + ((i * 53) % 40) / 100); ctx.fillRect(((i * 211) % 100) / 100 * W - w / 2, y, w, 2 + (i % 3)) } }
  // BOOM flash
  const bt = C.t - ZT.boom
  if (bt >= 0 && bt < 8) { ctx.globalAlpha = (C.calm ? 0.35 : 0.9) * (1 - bt / 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) }
  // 3 · 2 · 1 — big gem-coloured numerals that punch in on each beat
  if (C.t >= ZT.count && C.t < ZT.boom) {
    const i = Math.floor((C.t - ZT.count) / 20), beat = (C.t - ZT.count) % 20, k = Math.min(1, beat / 5), sc = 1.7 - 0.7 * k
    const col = ['#ff3a2a', '#3a7aff', '#ffd21a'][i], size = Math.round(H * 0.5 * sc)
    ctx.globalAlpha = beat > 15 ? 1 - (beat - 15) / 5 : 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${size}px Impact, 'Arial Black', Arial, sans-serif`
    ctx.lineWidth = Math.max(6, size * 0.07); ctx.strokeStyle = '#0a0a12'; ctx.strokeText(String(3 - i), W / 2, H * 0.46); ctx.fillStyle = col; ctx.fillText(String(3 - i), W / 2, H * 0.46)
    ctx.globalAlpha *= 0.6; ctx.fillStyle = '#ffffff'; ctx.fillText(String(3 - i), W / 2 - size * 0.02, H * 0.46 - size * 0.03)
  }
  // letterbox: slides in over the first frames, out over the last
  const lb = Math.min(1, C.t / 8) * (1 - (sh.out || 0)), bar = Math.round(H * 0.1 * lb)
  ctx.globalAlpha = 1; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  ctx.restore()
  return (sh.out || 0) < 0.6   // hide the HUD until the camera has nearly handed back
}
// ── intro: the active Ranger rides in on a Raptor Rider; Trent appears out of afterimages. true = handled ──
export function drawDinoIntro(c, f, drawPose) {
  if (!isDino(f)) return false
  if (!f._introPlaying) { f._dtIntroFx = 0; return true }
  const t = (f._dtIntroFx = (f._dtIntroFx || 0) + 1), T = 40, form = f._duo?.form || 'dt_red', dir = f.facing || 1, cx = f.x + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94)
  if (t > T + 20) return true
  if (form === 'dt_white') { const k = Math.min(1, t / T); for (let i = 4; i >= 1; i--) drawPose(c, f, 'dashOne', 0, cx - dir * i * 40 * (1 - k), feet, dir, 0.4 * (1 - k) / i * 2); return true }
  const rider = { dt_red: 'red_rider', dt_blue: 'blue_rider', dt_yellow: 'yellow_rider' }[form]
  const k = Math.min(1, t / T), x = cx - dir * 420 * (1 - k) - dir * (t > T ? (t - T) * 18 : 0)
  img(c, art(f, rider), x, feet - 66, 1.6, t > T ? Math.max(0, 1 - (t - T) / 20) : 1, dir)
  return true
}

// ── HUD ──
export function dinoHudTag(f) {
  if (!isDino(f)) return null
  const d = f._duo
  if (d.evil > 0) return `EVIL WHITE ${Math.ceil(d.evil / 60)}s`
  if (d.sdm > 0) return `SUPER DINO ${Math.ceil(d.sdm / 60)}s`
  if (f._ninja?.mirror) return `DRAGO CLONE ${Math.ceil((360 - f._ninja.mirror.t) / 60)}s`
  return 'GEM'
}
export function drawDinoHud(ctx, f, x, y, w, o) {
  const d = f._duo, np = f._ninja?.np || 0
  if (!f._dtHudPre) { f._dtHudPre = true; for (const [k] of KEYS) image(f._dtSkinArt ? `${f._dtSkinArt}/${k}/portrait_small.png` : `./assets/${k}/portrait_small.png`) }
  // CORRUPTION bar (Trent in, or still decaying)
  if (d.form === 'dt_white' || d.corr > 0) {
    const cy = y + 14, u = Math.min(1, d.corr / 100)
    ctx.save(); ctx.fillStyle = 'rgba(10,12,20,0.8)'; ctx.fillRect(x - 1, cy - 1, w + 2, 5)
    ctx.fillStyle = d.evil > 0 ? '#ff2020' : '#7a1020'; if (o.flip) ctx.fillRect(x + w * (1 - u), cy, w * u, 3); else ctx.fillRect(x, cy, w * u, 3)
    ctx.font = 'bold 7px Arial'; ctx.textAlign = o.flip ? 'left' : 'right'; ctx.fillStyle = '#ff9a9a'; ctx.fillText(d.evil > 0 ? 'EVIL' : 'CORRUPTION', o.flip ? x : x + w, cy + 11)
    ctx.restore()
  }
  // the swap strip: shown while P is held (or swapping) — four portraits with their key, the active one framed
  const show = d.held || d.swap
  const S = 20, gap = 4, total = KEYS.length * (S + gap), px0 = o.flip ? x + w - total : x, py = y - S - 30
  ctx.save()
  KEYS.forEach(([form, key], i) => {
    const px = px0 + i * (S + gap), act = form === d.form, im = image(f._dtSkinArt ? `${f._dtSkinArt}/${form}/portrait_small.png` : `./assets/${form}/portrait_small.png`)
    if (!show && !act) return
    const sx = show ? px : (o.flip ? x + w + 6 : x - S - 6)
    ctx.globalAlpha = show ? 1 : 0.9
    ctx.fillStyle = 'rgba(10,12,20,0.85)'; ctx.fillRect(sx - 2, py - 2, S + 4, S + 4)
    if (ready(im)) { ctx.imageSmoothingEnabled = false; if (!act && (d.cd > 0 || np < 15 || d.evil > 0)) { try { ctx.filter = 'grayscale(1) brightness(0.6)' } catch (_) {} } ctx.drawImage(im, sx, py, S, S); try { ctx.filter = 'none' } catch (_) {} }
    ctx.strokeStyle = GEM[form]; ctx.lineWidth = act ? 2.5 : 1; ctx.strokeRect(sx - 1, py - 1, S + 2, S + 2)
    if (show) { ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = act ? GEM[form] : '#ffffff'; ctx.fillText(key, sx + S / 2, py + S + 9) }
  })
  if (show && d.cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px0, py + S * (1 - d.cd / 90), total - gap, S * d.cd / 90) }
  ctx.restore()
}

// ── WIN: MISSION ACCOMPLISHED over Blue / Yellow once the foe is down (the sheets' own art); the result screen gets BOSS
// KILLED (a provider on matchflow's VICTORY_ART list, keyed to the side + name of the last Dino Thunder winner) ──
let lastWin = null   // render-only memo { side, name, form }
function drawWinArt(c, f) {
  const s = f._ninja; if (!s?.wonSaid) { f._dtWinT = 0; return }
  const t = (f._dtWinT = (f._dtWinT || 0) + 1)
  lastWin = { side: f.side || (f.playerNumber === 2 ? 'p2' : 'p1'), name: f.name, form: f._duo.form, skinArt: f._dtSkinArt || null }
  const win = { dt_blue: 'blue_mission', dt_yellow: 'yellow_mission' }[f._duo.form]
  if (!win || t < 30) return
  img(c, art(f, win), f.x + (f.w || 48) / 2, (f.y || 0) - 90, 1.2, Math.min(1, (t - 30) / 20))
}
VICTORY_ART.push((ctx, canvas, st) => {
  if (!lastWin || st.winnerSide !== lastWin.side || st.winnerName !== lastWin.name) return
  const im = image(art({ _dtSkinArt: lastWin.skinArt }, lastWin.form === 'dt_blue' ? 'bossKilled_blue' : 'bossKilled')); if (!ready(im)) return
  const k = Math.min(canvas.height * 0.32 / im.height, canvas.width * 0.22 / im.width), w = im.width * k, h = im.height * k
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= 0.95
  ctx.drawImage(im, Math.max(8, canvas.width * 0.135 - w / 2), canvas.height * 0.6 - h / 2, w, h); ctx.restore()   // the empty margin left of the stats panel
})
