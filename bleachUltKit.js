// bleachUltKit.js — shared plumbing for the Bleach cinematic ULTIMATES (2026-11-24, roster-wide "every character gets their own
// special ultimate" pass): zarakiUlt.js, byakuyaUlt.js, mayuriUlt.js, ichigoUlt.js. Two halves:
//   1) makeCineUlt(cfg) — the SIM controller (cineRegistry registerUltCast + registerFreezeCine + registerCineScreen): cast gate
//      + meter spend, the frozen script clock (frame / real / hit-stop hold), camera zoom-cap lift, engine sprites hidden
//      (_fxAlpha = 0) and restored, a sure-hit damage helper, a clean finish + clear() for every reset path.
//   2) render helpers (pure, deterministic: integer-hash noise, no Math.random) — real-sheet sprite blits, world→screen from
//      camera.js's live transform, re-blit punch-ins, speed lines, title bands, vertical calligraphy, subtitles, letterbox.
// Each character module owns its OWN beats / staging / art; this file holds no character content.
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'

// ── math / noise ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
export const outE = u => { u = clamp(u, 0, 1); return 1 - (1 - u) ** 3 }
export const inE = u => { u = clamp(u, 0, 1); return u * u * u }
export const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
export const ctrX = o => (o.x || 0) + (o.w || 48) / 2
export const feet = o => (o.y || 0) + (o.h || 94)
export const calmMotion = () => !!juiceSettings?.reduceMotion
export const calmFlash = () => !!juiceSettings?.reduceFlashing
export const lerp = (a, b, u) => a + (b - a) * u

// ── SIM CONTROLLER ───────────────────────────────────────────────────────────────────────────────────────────────────
// cfg = { id, keys:[rosterKeys], total, cost (n | f=>n), maxZoom?, gate?(f,t,context,opts) → true | false | undefined,
//         setup?(S, context), beats(S, ctx, k), place(S, k), camera(S, cam, k), finish?(S), draw(ctx, canvas, S), preload?(S) }
export function makeCineUlt(cfg) {
  const S = { active: false }
  const reset = () => { for (const k of Object.keys(S)) delete S[k]; S.active = false }
  const restore = () => {
    const f = S.caster, t = S.target, cam = S.cam, sv = S.camSaved
    if (f) { if (S.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = S.fAlpha0 }
    if (t) { if (S.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = S.tAlpha0 }
    if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
  }
  function cast(f, context, opts = {}) {
    const key = (f?.rosterKey || '').toLowerCase()
    if (!f || !cfg.keys.includes(key)) return undefined
    if (S.active) return false
    if ((f.attackCooldown || 0) > 0 || f.attacking) return false
    const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
    const t = getOpp(f)
    if (!t || t.eliminated) return undefined                     // no foe → the legacy path
    if (cfg.gate) { const g = cfg.gate(f, t, context, opts); if (g !== true) return g }
    const cost = typeof cfg.cost === 'function' ? cfg.cost(f) : (cfg.cost || 0)
    if (cost && !f.infiniteEnergy) { if ((f.energy || 0) < cost) return false; f.energy = Math.max(0, (f.energy || 0) - cost) }
    const dir = ctrX(t) >= ctrX(f) ? 1 : -1
    Object.assign(S, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, key, dir, stage: context?.worldWidth || 3200,
      floor: feet(f), tFloor: feet(t), fx0: ctrX(f), tx0: ctrX(t), blocked: !!t.isBlocking, dmg: 0, hits: 0, ko: false, done: {},
      cam: null, camSaved: null, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha, land: ctrX(t), fx: ctrX(f), tx: ctrX(t), ty: 0, flashes: [] })
    f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
    t.hitstun = Math.max(t.hitstun || 0, 9999)
    f._fxAlpha = 0; t._fxAlpha = 0
    try { cfg.setup?.(S, context) } catch (_) {}
    try { cfg.preload?.(S) } catch (_) {}
    return true
  }
  function update(ctx = {}) {
    if (!S.active) return
    const f = S.caster, t = S.target
    if (!f || !t) return clear()
    const cam = ctx.camera
    if (cam && !S.cam) { S.cam = cam; S.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = cfg.maxZoom || 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
    S.real++
    if (S.hold > 0) { S.hold--; cfg.place(S, S.frame); pin(); return }
    const k = S.frame
    S.ctx = ctx
    cfg.beats(S, ctx, k)
    cfg.place(S, k); pin()
    if (cam?.focusOnFighter) cfg.camera(S, cam, k)
    if (++S.frame > cfg.total) finish()
  }
  // keep both engine bodies glued to the staged positions (the engine's sprites stay hidden)
  function pin() {
    const f = S.caster, t = S.target
    for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null; o.vx = 0; o.vy = 0; o._fxAlpha = 0 }
    f.x = Math.round(S.fx - (f.w || 48) / 2); f.y = S.floor - (f.h || 94) - Math.max(0, S.fy || 0); f.facing = S.fFace || S.dir
    f.onGround = !(S.fy > 0); f.grounded = f.onGround
    t.x = Math.round(S.tx - (t.w || 48) / 2); t.y = Math.round(S.tFloor - (t.h || 94) - Math.max(0, S.ty || 0))
    t.onGround = !(S.ty > 0); t.grounded = t.onGround; t.hitstun = Math.max(t.hitstun || 0, 9999)
    t.isBlocking = S.blocked && !S.guardBroken
  }
  function finish() {
    const f = S.caster, t = S.target
    try { cfg.finish?.(S) } catch (_) {}
    if (t) {
      const lx = clamp(S.land, 60, S.stage - 60)
      t.x = Math.round(lx - (t.w || 48) / 2); t.y = S.tFloor - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
      t.hitstun = 0; t.isBlocking = false
      if (S.blocked) t.blockstun = Math.max(t.blockstun || 0, 22)
      else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 44); t.hitstun = 20 }
    }
    if (f) {
      try { clearInputBuffer(f) } catch (_) {}
      f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
      f.x = Math.round(clamp(S.fx, 40, S.stage - 40) - (f.w || 48) / 2); f.y = S.floor - (f.h || 94); f.onGround = true; f.grounded = true; f.facing = S.fFace || S.dir
    }
    restore(); reset()
  }
  function clear() {
    if (!S.active) return
    const f = S.caster, t = S.target
    if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; if (t.y + (t.h || 94) < S.tFloor) t.y = S.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
    if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = S.floor - (f.h || 94); f.onGround = true; f.grounded = true }
    restore(); reset()
  }
  registerUltCast && cfg.keys.forEach(k => registerUltCast(k, cast))
  registerFreezeCine(cfg.id, { active: () => !!S.active, update, clear })
  registerCineScreen(cfg.id, (ctx, canvas) => (S.active ? cfg.draw(ctx, canvas, S) : false))
  return { S, cast, update, clear, active: () => !!S.active, status: () => ({ active: !!S.active, frame: S.frame | 0, real: S.real | 0, dmg: Math.round(S.dmg || 0), hits: S.hits | 0, blocked: !!S.blocked, ko: !!S.ko }) }
}

// one sure-hit application (a held guard chips it). o = { blockMult, attacker, move, stun }
export function cineHit(S, raw, o = {}) {
  const t = S.target, f = S.caster
  if (!t || !(t.health > 0)) return 0
  const before = t.health
  const amt = S.blocked ? Math.round(raw * (o.blockMult ?? 0.25)) : raw
  const opts = { source: 'ability' }
  if (o.attacker) opts.attacker = f
  if (o.move) opts.move = o.move
  try { applyScaledDamage(t, amt, opts) } catch (_) {}
  const d = Math.max(0, before - t.health)
  S.dmg += d; S.hits++; S.lastHit = { d, real: S.real }
  t.colorFlash = 14
  if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) S.ko = true
  return d
}
export const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
export const voice = (ctx, S, file) => { try { if (file) ctx?.sound?.playSfxFile?.(file, null, { owner: S.caster }) } catch (_) {} }
export const pick = (arr, seed) => (arr && arr.length ? arr[Math.floor(hash(seed, 7) * arr.length) % arr.length] : null)
export const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })

// ── RENDER: images + sprites ─────────────────────────────────────────────────────────────────────────────────────────
const imgs = new Map(), boxes = new Map()
export const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
export const ready = im => im && im.complete && im.naturalWidth > 0
export const animOf = (f, key) => (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key] || null
export function preloadAnims(f, keys) { for (const k of keys) { const a = animOf(f, k); if (a?.sheet) image(a.sheet) } }
function frameBox(im, sx, sy, w, h, key) {
  let b = boxes.get(key); if (b) return b
  try {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let l = w, t = h, r = -1, bo = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bo) bo = y }
    b = r < 0 ? { l: 0, t: 0, r: w, b: h } : { l, t, r: r + 1, b: bo + 1 }
  } catch (_) { b = { l: 0, t: 0, r: w, b: h } }
  boxes.set(key, b); return b
}
let _tint = null
function tintCanvas(w, h) { if (!_tint) { const cv = document.createElement('canvas'); _tint = { cv, g: cv.getContext('2d') } }
  if (_tint.cv.width < w || _tint.cv.height < h) { _tint.cv.width = Math.max(_tint.cv.width, w); _tint.cv.height = Math.max(_tint.cv.height, h) } return _tint }
// one frame of fighter f's action keys[0..] (or a raw sheet {sheet,frames,width,height}), content-centred on x, content bottom on
// feetY (screen px), zoom z, facing dir. o: { s, alpha, tint, tintA, rot, sx, sy, skew, comp, anchor:'centre' }
export function sprite(c, f, keys, frame, x, feetY, z, dir, o = {}) {
  let a = null
  if (keys && !Array.isArray(keys) && keys.sheet) a = keys
  else for (const k of keys) if ((a = animOf(f, k))) break
  if (!a?.sheet) return null
  const im = image(a.sheet); if (!ready(im)) return null
  const n = Math.max(1, a.frames || 1), fi = clamp(frame | 0, 0, n - 1), w = a.width, h = a.height
  const sx = (a.sourceX || 0) + fi * w, sy = a.sourceY || 0
  const bx = frameBox(im, sx, sy, w, h, a.sheet + '#' + sx + ',' + sy + ',' + w + ',' + h)
  const s = (o.raw ? 1 : (f?.spriteScale || 1.8) * (a.scale || 1)) * z * (o.s || 1), ccx = o.frame ? w / 2 : (bx.l + bx.r) / 2, ccy = (bx.t + bx.b) / 2, bot = o.frame ? h : bx.b
  let src = im, ssx = sx, ssy = sy
  if (o.tint) {
    const sc = tintCanvas(w, h); sc.g.clearRect(0, 0, sc.cv.width, sc.cv.height); sc.g.globalCompositeOperation = 'source-over'; sc.g.globalAlpha = 1
    sc.g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    sc.g.globalCompositeOperation = 'source-atop'; sc.g.globalAlpha = o.tintA ?? 0.6; sc.g.fillStyle = o.tint; sc.g.fillRect(0, 0, w, h)
    src = sc.cv; ssx = 0; ssy = 0
  }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= o.alpha ?? 1
  if (o.comp) c.globalCompositeOperation = o.comp
  if (o.rot || o.anchor === 'centre') {
    c.translate(Math.round(x), Math.round(feetY - (bot - ccy) * s)); if (o.rot) c.rotate(o.rot); if (dir < 0) c.scale(-1, 1); if (o.sx || o.sy) c.scale(o.sx || 1, o.sy || 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -ccy * s, w * s, h * s)
  } else {
    c.translate(Math.round(x), Math.round(feetY)); if (o.sx || o.sy) c.scale(o.sx || 1, o.sy || 1); if (o.skew) c.transform(1, 0, o.skew, 1, 0, 0); if (dir < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -bot * s, w * s, h * s)
  }
  c.restore()
  return { top: feetY - (bot - bx.t) * s, h: (bx.b - bx.t) * s, w: (bx.r - bx.l) * s, s, front: x + dir * (bx.r - ccx) * s }
}

// world → screen (camera.applyTransform maths)
export function view(W, H) {
  const z = camera.zoom || 1, ox = (camera.x || 0) + (camera.leadX || 0) - (camera.shakeX || 0), oy = (camera.y || 0) - (camera.shakeY || 0)
  return { z, p: (x, y) => ({ x: (x - ox) * z + W / 2, y: (y - oy) * z + H / 2 }) }
}

// ── RENDER: screen pieces ────────────────────────────────────────────────────────────────────────────────────────────
let _scr = null
function scratch(W, H) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== W || _scr.cv.height !== H) { _scr.cv.width = W; _scr.cv.height = H } return _scr }
export function punchIn(ctx, canvas, W, H, cx, cy, z) {   // re-blit the finished frame scaled about (cx, cy) — a real close-up
  if (z <= 1.001) return
  const S = scratch(W, H); S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(canvas, 0, 0)
  ctx.save(); ctx.imageSmoothingEnabled = false
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy)
  ctx.drawImage(S.cv, 0, 0); ctx.restore()
}
export function wash(ctx, W, H, col, a, comp = 'source-over') { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = comp; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore() }
export function desat(ctx, W, H, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore() }
export function speedLines(ctx, W, H, cx, cy, n, seed, col, a, inward = true, real = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'source-over'
  const R = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * Math.PI * 2, u = calmMotion() ? 0.5 : ((real * 1.7 + hash(i, seed + 3) * 20) % 20) / 20
    const r0 = R * (inward ? 0.62 - u * 0.25 : 0.2 + u * 0.3), len = R * (0.12 + hash(i, seed + 5) * 0.25), wv = 1 + hash(i, seed + 2) * 5
    ctx.fillStyle = col; ctx.globalAlpha = a * (0.3 + 0.7 * hash(i, seed + 9))
    const c = Math.cos(ang), s = Math.sin(ang)
    ctx.beginPath(); ctx.moveTo(cx + c * r0 - s * wv * 0.2, cy + s * r0 + c * wv * 0.2); ctx.lineTo(cx + c * (r0 + len) - s * wv, cy + s * (r0 + len) + c * wv); ctx.lineTo(cx + c * (r0 + len) + s * wv, cy + s * (r0 + len) - c * wv); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}
export function hLines(ctx, W, y0, y1, n, seed, col, a, real, dir = 1) {
  ctx.save()
  for (let i = 0; i < n; i++) {
    const y = y0 + hash(i, seed) * (y1 - y0), len = W * (0.25 + hash(i, seed + 1) * 0.6)
    let x = ((hash(i, seed + 2) * W * 2 + (calmMotion() ? 0 : real * (30 + hash(i, 4) * 40))) % (W * 1.6)) - W * 0.3
    if (dir < 0) x = W - x - len
    ctx.globalAlpha = a * (0.25 + 0.6 * hash(i, seed + 3)); ctx.fillStyle = col; ctx.fillRect(x, y, len, 1 + hash(i, seed + 5) * 3)
  }
  ctx.restore()
}
// a slanted cut-in band with a slammed title. o: { y, bh, fs, band, edge, fill, stroke, from, subCol, kanji, kanjiCol }
export function title(ctx, W, H, text, sub, u, o = {}) {
  const inU = clamp(u / 0.14, 0, 1), outU = clamp((u - 0.86) / 0.14, 0, 1)
  const ease = outE(inU), slideX = (1 - ease) * W * 0.8 * (o.from || 1) - outU * W * 0.9 * (o.from || 1), by = H * (o.y || 0.5), bh = H * (o.bh || 0.17)
  ctx.save(); ctx.translate(slideX, 0)
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.62); ctx.lineTo(W, by - bh * 0.42); ctx.lineTo(W, by + bh * 0.5); ctx.lineTo(0, by + bh * 0.4); ctx.closePath()
  ctx.fillStyle = o.band || 'rgba(8,4,4,0.92)'; ctx.fill()
  ctx.strokeStyle = o.edge || '#f2b705'; ctx.lineWidth = Math.max(3, H * 0.006); ctx.stroke()
  if (o.kanji) {
    const kf = Math.round(bh * 1.25)
    ctx.save(); ctx.font = `900 ${kf}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.22; ctx.fillStyle = o.kanjiCol || '#ffffff'; ctx.fillText(o.kanji, W * 0.5, by); ctx.restore()
  }
  const punch = 1 + Math.max(0, 1 - u / 0.05) * 0.6, fs = Math.round(H * (o.fs || 0.12) * punch)
  ctx.translate(W * 0.5, by); ctx.transform(1, 0, -0.16, 1, 0, 0)
  ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = o.stroke || '#b3120f'; ctx.strokeText(text, 0, 0)
  ctx.fillStyle = o.fill || '#ffe14d'; ctx.fillText(text, 0, 0)
  if (sub) { ctx.font = `700 ${Math.round(H * 0.028)}px system-ui, sans-serif`; ctx.fillStyle = o.subCol || '#ffffff'; ctx.fillText(sub, 0, fs * 0.66) }
  ctx.restore()
}
// vertical brush calligraphy stamped one glyph at a time (u = 0..1 over its life). o: { x, y, size, col, edge, glow }
export function calligraphy(ctx, W, H, text, u, o = {}) {
  if (u <= 0 || u >= 1) return
  const chars = [...text], size = Math.round(H * (o.size || 0.13)), x = W * (o.x ?? 0.85), y0 = H * (o.y ?? 0.2)
  const fade = Math.min(clamp(u / 0.06, 0, 1), clamp((1 - u) / 0.12, 0, 1))
  ctx.save(); ctx.font = `900 ${size}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  chars.forEach((ch, i) => {
    const ci = clamp(u * (chars.length + 2) - i, 0, 1); if (ci <= 0) return
    const sc = 1 + (1 - outE(ci)) * 0.9
    ctx.save(); ctx.translate(x, y0 + i * size * 1.02); ctx.scale(sc, sc); ctx.globalAlpha = fade * clamp(ci * 2, 0, 1)
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * 0.3 }
    ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.14; ctx.strokeStyle = o.edge || '#000'; ctx.strokeText(ch, 0, 0)
    ctx.fillStyle = o.col || '#ffffff'; ctx.fillText(ch, 0, 0); ctx.restore()
  })
  ctx.restore()
}
export function subtitle(ctx, W, H, who, line, a, whoCol = '#f2b705') {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const fs = Math.round(H * 0.032), y = H * 0.935
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const tw = ctx.measureText(line).width, nf = Math.round(fs * 0.62)
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(line, W / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(line, W / 2, y)
  ctx.font = `900 ${nf}px system-ui, sans-serif`; ctx.fillStyle = whoCol; ctx.textAlign = 'left'; ctx.fillText(who, W / 2 - tw / 2, y - fs * 0.95)
  ctx.restore()
}
// subtitle window helper: show `line` between frames a..b with fades
export function sub(ctx, W, H, k, a, b, who, line, col) { if (k >= a && k < b) subtitle(ctx, W, H, who, line, Math.min((k - a) / 6, (b - k) / 8), col) }
export function letterbox(ctx, W, H, real, k, outAt, outLen = 14, frac = 0.12) {
  const lbIn = clamp(real / 10, 0, 1), lbOut = k >= outAt ? clamp(1 - (k - outAt) / outLen, 0, 1) : 1, bar = H * frac * Math.min(lbIn, lbOut)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
}
export function star(ctx, x, y, r, a, rot = 0, col = '#ffffff') {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col
  ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath()
  for (let i = 0; i < 8; i++) { const rr = i & 1 ? r * 0.16 : r; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath(); ctx.fill()
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
export function glow(ctx, x, y, r, rgb, a) {
  if (a <= 0 || r <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${clamp(a, 0, 1).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
export function rings(ctx, x, y, u, n, maxR, col, lw = 8, squash = 0.5) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let j = 0; j < n; j++) { const uj = clamp(u * 1.5 - j * 0.16, 0, 1); if (uj <= 0 || uj >= 1) continue
    ctx.globalAlpha = (1 - uj) * 0.9; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, lw * (1 - uj))
    ctx.beginPath(); ctx.ellipse(x, y, 10 + uj * maxR, (10 + uj * maxR) * squash, 0, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
}
// classic anime impact frame: flat bg, burst lines, silhouettes drawn by the caller's fn(fg)
export function impactFrame(ctx, W, H, bg, fg, cx, cy, seed, real, sil) {
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, cx, cy, 80, seed, fg, 0.9, false, real)
  try { sil?.(fg) } catch (_) {}
  ctx.restore()
}
export function damageNumber(ctx, W, H, S, x, y, pr, col = '#ff3b2f') {
  if (!(S.dmg > 0) || pr < 0 || pr > 90) return
  const u = pr / 90, fs = Math.round(H * 0.085 * (1 + Math.max(0, 1 - pr / 6) * 0.6))
  const nx = clamp(x, W * 0.1, W * 0.9), ny = clamp(y, H * 0.2, H * 0.8) - u * H * 0.08
  ctx.save(); ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#1a0000'; ctx.strokeText(String(Math.round(S.dmg)), nx, ny); ctx.fillStyle = S.blocked ? '#ffd27a' : col; ctx.fillText(String(Math.round(S.dmg)), nx, ny); ctx.restore()
}
// jagged ground fissure from x0 toward dir (screen px), grown to u
export function fissure(ctx, x0, y, dir, len, u, z, seed, glowCol = 'rgba(255,60,40,0.8)') {
  if (u <= 0) return
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const pts = []; let px = x0, py = y; const n = 14
  for (let i = 0; i <= n * u; i++) { pts.push([px, py]); px += dir * len / n; py = y + (hash(seed, i) - 0.5) * 10 * z }
  for (const [lw, col, comp] of [[14 * z, glowCol, 'lighter'], [6 * z, '#120404', 'source-over'], [2 * z, '#ffd9b0', 'lighter']]) {
    ctx.globalCompositeOperation = comp; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke()
  }
  ctx.restore()
}
export function debris(ctx, x, y, kp, n, z, seed, col = '#6b5a48', spread = 300, up = 22) {
  if (kp < 0 || kp > 80 || calmMotion()) return
  ctx.save()
  for (let i = 0; i < n; i++) {
    const vx = (hash(i, seed) - 0.5) * spread / 30, vy = -(6 + hash(i, seed + 1) * up), tt = kp * 0.9
    const px = x + vx * tt * 3 * z, py = y + (vy * tt + 0.45 * tt * tt) * z, sz = (3 + hash(i, seed + 2) * 9) * z
    if (py > y + 6 * z) continue
    ctx.globalAlpha = clamp(1 - kp / 80, 0, 1); ctx.fillStyle = i % 3 ? col : '#a89478'
    ctx.save(); ctx.translate(px, py); ctx.rotate(tt * 0.2 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.8); ctx.restore()
  }
  ctx.restore()
}
