// dinoFx.js — MSV1-DINO RENDER-ONLY layer for the Dino Thunder Rangers (dinothunder). Reads f._duo / f._ninja, never writes
// sim state (the only fields it writes are underscore render counters: f._dtIntroFx, f._dtHudPre). Draws:
//   bursts dtRing / dtSparkle / dtShatter / dtBoom / dtStreak / dtScream (the sheets' DINO ZORD rings + sparkle),
//   the Drago Clone strips (premade darker Trent: assets/dt_white/clone), Super Speed / Evil / Super Dino Mode auras,
//   Camouflage shimmer + footstep dust, the supers (Raptor Rider, Tricera head, Ptera head, Drago slashes), Z-REX BLASTER
//   ("GO!" flash, BOSS KILLED cut-in, braided beam, Trent's slash), the intro ride-in and the HUD (swap strip while P is
//   held, the gem bar label, the Corruption bar while Trent is in). Reduce Motion / Flashing → calmer versions.
import { DINO_ID } from './dinoState.js'
import { VICTORY_ART } from './matchflow.js'

const cache = new Map()
const image = src => { let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const X = n => `./assets/dinothunder/${n}.png`
const GEM = { dt_red: '#e0201c', dt_blue: '#1e5bff', dt_yellow: '#f6c600', dt_white: '#e8e8f0' }
const KEYS = [['dt_red', 'J'], ['dt_blue', 'K'], ['dt_yellow', 'L'], ['dt_white', 'O']]
export const isDino = f => !!(f && f._duo && f._duo.id === DINO_ID)
const jit = (n, i) => (((Math.imul(n * 31 + i, 2654435761) >>> 0) % 1000) / 1000) * 2 - 1   // fixed per-burst scatter (no Math.random)
function img(c, name, x, y, sc = 1, alpha = 1, dir = 1, rot = 0) {
  const im = image(X(name)); if (!ready(im)) return false
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
export function drawDinoFx(c, f, drawPose, formAnim, calm) {
  if (!isDino(f)) return
  const s = f._ninja, u = s?.sup, feetF = (f.y || 0) + (f.h || 94)
  if (s?.mirror && f._duo.form === 'dt_white' && (s.mirror.t % 45) < 8 && !calm) {   // the clone's red visor glint (its tell)
    const m = s.mirror, hx = m.ix + (f.w || 48) / 2 + (m.dir || 1) * 6, hy = m.ifeet - (f.h || 94) * 0.9
    c.save(); c.fillStyle = '#ff2a2a'; c.globalAlpha = 0.9; c.beginPath(); c.arc(hx, hy, 3.5, 0, Math.PI * 2); c.fill(); c.restore()
  }
  drawWinArt(c, f)
  if (!u) return
  const floor = u.floor || feetF
  if (u.kind === 'sSuper' && u.form === 'dt_red' && u.rx != null) img(c, 'red_rider', u.rx, floor - 70, 1.9, 1, u.dir)
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
function drawZrex(c, f, u, drawPose, formAnim, calm) {
  const a = f.currentAttack, t = a ? a.total - a.timer : 0, cx = f.x + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94)
  if (u.phase === 'go') {   // "GO!" flash over the team
    img(c, t % 4 < 2 ? 'go1' : 'go2', cx, feet - 150, 3, 1)
    if (!calm) { c.save(); c.globalAlpha = 0.25 * (1 - t / 8); c.fillStyle = '#ffffff'; c.fillRect(f.x - 400, feet - 400, 800 + (f.w || 48), 460); c.restore() }
  }
  if (u.phase === 'cut') {   // BOSS KILLED cut-in sliding across
    const k = Math.min(1, (t - 8) / 8), x = cx - u.dir * 260 + u.dir * 260 * k
    c.save(); c.globalAlpha = 0.85; c.fillStyle = '#0a0a12'; c.fillRect(cx - 640, feet - 340, 1280, 330); c.restore()
    img(c, 'bossKilled', x, feet - 176, 1.9, 1)
  }
  // the four Rangers in a line behind the cannon
  if (u.phase === 'beam' || u.phase === 'cut') ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white'].filter(k => k !== f._duo.form).forEach((form, i) => { const A = formAnim(form, 'idle'); drawPose(c, f, 'idle', 0, cx - u.dir * (78 + i * 70), feet, u.dir, 0.95, 0, A) })   // the other three Rangers lined up behind the cannon
  if (u.beam) {   // braided red / blue / yellow beam
    const len = Math.min(1400, 120 + u.beam.t * 60), x0 = cx + u.dir * 30, y = u.beam.y
    c.save()
    ;[['#e0201c', 0], ['#1e5bff', 2.1], ['#f6c600', 4.2]].forEach(([col, ph]) => {
      c.strokeStyle = col; c.lineWidth = 9; c.globalAlpha = 0.9; c.beginPath()
      for (let i = 0; i <= 40; i++) { const k = i / 40, x = x0 + u.dir * len * k, yy = y + Math.sin(k * 18 + ph + (calm ? 0 : u.beam.t * 0.6)) * 10; i ? c.lineTo(x, yy) : c.moveTo(x, yy) }
      c.stroke()
    })
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + u.dir * len, y); c.stroke()
    c.restore()
  }
  if (u.trent && t - u.trent.t < 14) {   // Trent's afterimage slash finishes it
    const k = (t - u.trent.t) / 14, A = formAnim('dt_white', 'dragoCut')
    for (let i = 0; i < 4; i++) drawPose(c, f, 'dragoCut', 1, u.trent.x0 + (u.trent.x1 - u.trent.x0) * Math.max(0, k - i * 0.08), feet, u.dir, 0.8 - i * 0.18, 0, A)
    c.save(); c.strokeStyle = '#fff6d0'; c.lineWidth = 6; c.globalAlpha = 1 - k; c.beginPath(); c.moveTo(u.trent.x0, feet - 60); c.lineTo(u.trent.x1, feet - 50); c.stroke(); c.restore()
  }
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
  img(c, rider, x, feet - 66, 1.6, t > T ? Math.max(0, 1 - (t - T) / 20) : 1, dir)
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
  if (!f._dtHudPre) { f._dtHudPre = true; for (const [k] of KEYS) image(`./assets/${k}/portrait_small.png`) }
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
    const px = px0 + i * (S + gap), act = form === d.form, im = image(`./assets/${form}/portrait_small.png`)
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
  lastWin = { side: f.side || (f.playerNumber === 2 ? 'p2' : 'p1'), name: f.name, form: f._duo.form }
  const art = { dt_blue: 'blue_mission', dt_yellow: 'yellow_mission' }[f._duo.form]
  if (!art || t < 30) return
  img(c, art, f.x + (f.w || 48) / 2, (f.y || 0) - 90, 1.2, Math.min(1, (t - 30) / 20))
}
VICTORY_ART.push((ctx, canvas, st) => {
  if (!lastWin || st.winnerSide !== lastWin.side || st.winnerName !== lastWin.name) return
  const im = image(X(lastWin.form === 'dt_blue' ? 'bossKilled_blue' : 'bossKilled')); if (!ready(im)) return
  const k = Math.min(canvas.height * 0.32 / im.height, canvas.width * 0.22 / im.width), w = im.width * k, h = im.height * k
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= 0.95
  ctx.drawImage(im, Math.max(8, canvas.width * 0.135 - w / 2), canvas.height * 0.6 - h / 2, w, h); ctx.restore()   // the empty margin left of the stats panel
})
