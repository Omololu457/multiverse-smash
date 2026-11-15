// Hiromi Higuruma (higuruma) — RENDER-ONLY FX, HUD, courtroom presentation, intro card and audio cues. Reads sim state
// (f._higuruma, the ultimate view), never writes it. Sprites are only the supplied art (the fighter's own frames, the
// portrait); the courtroom is SIMPLE code-drawn lines, panels, floor markings and text — no Judgeman, no detailed
// courtroom background and no opponent art are drawn or implied.
// Bounded: images cached once per URL, no per-frame canvases, pixel reads or image decoding; every list is capped in the
// sim. No Math.random (decorative variation = sim tick). Reduced effects (juiceSettings.reduceFlashing / reduceMotion)
// → static material phase, no flicker, softer dim.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { higuruma, CASE } from './higurumaData.js'
import { HIGURUMA_CELL } from './higurumaSprites.js'
import { higurumaUltView, isHigurumaUltActive, higurumaActiveUltView } from './higurumaState.js'
import { HIGURUMA_FX_COLORS } from './higurumaSkins.js'

const FW = HIGURUMA_CELL.w, FH = HIGURUMA_CELL.h
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const higurumaFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && HIGURUMA_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => HIGURUMA_FX_COLORS[tagOf(f)] || HIGURUMA_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/higuruma/skins/${tagOf(f)}/${rel}` : `./assets/higuruma/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const isHg = f => f?.rosterKey === 'higuruma'

// ── skin MATERIAL (stars / circuit / glitter): precomputed overlay strip of the drawn action, inside the body's own
// draw rect (suit pixels only by construction). Slow crossfade between 4 phases; static phase 0 under reduced effects.
const warmed = new Set()
const stripName = sh => sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW) return
  if (!warmed.has(tag)) { warmed.add(tag); for (const d of Object.values(higuruma.animationData)) for (let k = 0; k < 4; k++) image(`./assets/higuruma/skins/${tag}/mat/p${k}/${stripName(d.sheet)}.png`) }
  const strip = stripName(higuruma.animationData[f._lastSpriteAction]?.sheet); if (!strip) return
  const fr = f._lastSpriteFrame ?? 0, t = f._higuruma?.tick || 0
  const layer = (k, al) => {
    const im = image(`./assets/higuruma/skins/${tag}/mat/p${k}/${strip}.png`); if (!ready(im) || al <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / FW)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = al
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (calm()) { layer(0, 0.8); return }
  const P = 48, k = Math.floor(t / P) % 4, u = (t % P) / P, fade = Math.max(0, (u - 0.6) / 0.4)
  layer(k, 0.9 * (1 - fade)); layer((k + 1) % 4, 0.9 * fade)
}

function drawEvents(c, f, s) {
  const { hud, fx } = colsOf(f)
  for (const e of s.fx) {
    const al = Math.max(0, 1 - e.t / 30)
    c.save(); c.globalAlpha = al
    if (e.kind === 'mark') {
      c.font = 'bold 13px Arial'; c.textAlign = 'center'
      const txt = CASE.labels[e.cat] || ''
      c.fillStyle = '#0c0c14'; c.fillText(txt, e.x + 1, e.y - e.t * 0.5 + 1); c.fillStyle = hud[1]; c.fillText(txt, e.x, e.y - e.t * 0.5)
    } else if (e.kind === 'token') {
      c.font = 'bold 15px Arial'; c.textAlign = 'center'
      c.fillStyle = '#0c0c14'; c.fillText('PRECEDENT', e.x + 1, e.y - 18 - e.t * 0.4 + 1); c.fillStyle = hud[0]; c.fillText('PRECEDENT', e.x, e.y - 18 - e.t * 0.4)
    } else if (e.kind === 'precedent') {
      c.strokeStyle = hud[0]; c.lineWidth = 3
      for (let i = 0; i < 3; i++) { const x = e.x - e.dir * (10 + i * 14 + e.t * 2); c.beginPath(); c.moveTo(x, e.y + 30); c.lineTo(x - e.dir * 18, e.y + 30); c.stroke() }
    } else if (e.kind === 'objection') {
      c.strokeStyle = hud[1]; c.lineWidth = 3
      c.beginPath(); c.arc(e.x, e.y, 10 + e.t * 1.6, 0, Math.PI * 2); c.stroke()
      c.font = 'bold 16px Arial'; c.textAlign = 'center'; c.fillStyle = '#0c0c14'; c.fillText('OBJECTION!', e.x + 1, e.y - 34 + 1); c.fillStyle = hud[0]; c.fillText('OBJECTION!', e.x, e.y - 34)
    } else if (e.kind === 'shock') {
      // Order in the Court: a SHORT dust ring at the impact (presentation only; the one impact box is the hit)
      c.strokeStyle = fx[1]; c.lineWidth = 3; c.globalAlpha = al * 0.9
      c.beginPath(); c.ellipse(e.x, e.y - 2, 14 + e.t * 3, 4 + e.t * 0.4, 0, 0, Math.PI * 2); c.stroke()
    }
    c.restore()
  }
}

// World layer (after the fighters).
export function drawHigurumaFx(c, f) {
  if (!isHg(f)) return
  drawMaterial(c, f)
  const s = f._higuruma; if (!s) return
  drawEvents(c, f, s)
  const v = higurumaUltView(f)
  if (v && v.frame >= 200 && v.frame < 216 && v.target) {   // the sword stroke across the defendant (presentation)
    const t = v.target, u = (v.frame - 200) / 16, { sword } = colsOf(f)
    c.save(); c.globalAlpha = calm() ? 0.6 : 0.9 * (1 - u); c.strokeStyle = sword[1]; c.lineWidth = 5
    const x0 = ctrX(t) - 60, y0 = t.y + 10, x1 = ctrX(t) + 60, y1 = t.y + t.h - 10
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + (x1 - x0) * Math.min(1, u * 3), y0 + (y1 - y0) * Math.min(1, u * 3)); c.stroke(); c.restore()
  }
}

// ── COURTROOM (Deadly Sentencing) ──
// Screen layer UNDER the fighters: the stage dims (silhouettes stay full-brightness because fighters draw on top),
// with simple framing: a judge's-bench panel, two side rails and pillars. No Judgeman, no detailed background.
const courtView = () => higurumaActiveUltView()
const fadeOf = fr => Math.min(1, fr / 12, (260 - fr) / 14)
export function drawHigurumaCourt(c, cv) {
  const v = courtView(); if (!v) return
  const f = v.caster, cw = cv?.width || 1280, ch = cv?.height || 720, a = Math.max(0, fadeOf(v.frame)), [hud0, hud1] = colsOf(f).hud
  c.save()
  c.globalAlpha = a * (calm() ? 0.55 : 0.72); c.fillStyle = '#07070d'; c.fillRect(0, 0, cw, ch)
  c.globalAlpha = a * 0.85; c.strokeStyle = hud0; c.lineWidth = 3
  const bw = Math.min(560, cw * 0.46), bx = cw / 2 - bw / 2, by = ch * 0.12, bh = ch * 0.1
  c.strokeRect(bx, by, bw, bh); c.beginPath(); c.moveTo(bx - 30, by + bh + 8); c.lineTo(bx + bw + 30, by + bh + 8); c.stroke()   // judge's bench
  c.globalAlpha = a * 0.5; c.lineWidth = 2
  for (const px of [cw * 0.08, cw * 0.18, cw * 0.82, cw * 0.92]) { c.beginPath(); c.moveTo(px, ch * 0.08); c.lineTo(px, ch * 0.86); c.stroke() }   // pillars
  c.globalAlpha = a * 0.7; c.strokeStyle = hud1
  for (const y of [ch * 0.6, ch * 0.64]) { c.beginPath(); c.moveTo(cw * 0.03, y); c.lineTo(cw * 0.26, y); c.moveTo(cw * 0.74, y); c.lineTo(cw * 0.97, y); c.stroke() }   // rails
  c.restore()
}
// World layer UNDER the fighters: floor markings — the defendant's box around the target and the aisle to the bench.
export function drawHigurumaUnder(c, p1, p2) {
  const v = courtView(); if (!v || ![p1, p2].includes(v.caster)) return
  const f = v.caster, t = v.target, a = Math.max(0, fadeOf(v.frame)), [hud0, hud1] = colsOf(f).hud
  if (!t) return
  const feet = t.y + (t.h || 94), cx = ctrX(t)
  c.save(); c.globalAlpha = a * 0.9; c.strokeStyle = hud0; c.lineWidth = 3
  c.strokeRect(cx - 54, feet - 6, 108, 12)                                    // the defendant's box (floor marking)
  c.globalAlpha = a * 0.6; c.strokeStyle = hud1; c.lineWidth = 2
  const fx = ctrX(f), ff = f.y + (f.h || 94)
  c.beginPath(); c.moveTo(Math.min(fx, cx) - 80, ff + 2); c.lineTo(Math.max(fx, cx) + 80, ff + 2); c.stroke()
  for (let i = -2; i <= 2; i++) { const x = (fx + cx) / 2 + i * 70; c.beginPath(); c.moveTo(x, ff - 2); c.lineTo(x, ff + 8); c.stroke() }
  c.restore()
}

// ── Screen layer: Case File HUD + the cinematic captions ──
export function higurumaHudLabel(f) {
  const s = f?._higuruma
  return { marks: s ? { ...s.caseFile } : { close: false, reach: false, weight: false }, token: s?.token || 0, locked: !!s?.pdLock }
}
function drawCaseFile(c, f, x, y, flip) {
  const L = higurumaHudLabel(f), [hud0, hud1] = colsOf(f).hud, t = f._higuruma?.tick || 0
  c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'middle'; c.textAlign = 'center'
  const bw = 44, gap = 4, total = bw * 3 + gap * 2 + 70
  let cx = flip ? x - total : x
  c.fillStyle = 'rgba(8,8,14,0.7)'; c.fillRect(cx - 4, y - 2, total + 8, 16)
  CASE.categories.forEach((k, i) => {
    const on = L.marks[k], bx = cx + i * (bw + gap)
    c.fillStyle = on ? hud0 : 'rgba(255,255,255,0.10)'; c.fillRect(bx, y, bw, 12)
    c.strokeStyle = hud0; c.lineWidth = 1; c.strokeRect(bx + 0.5, y + 0.5, bw - 1, 11)
    c.fillStyle = on ? '#0c0c14' : 'rgba(255,255,255,0.55)'; c.fillText(CASE.labels[k], bx + bw / 2, y + 6.5)
  })
  const px = cx + 3 * (bw + gap) + 2
  const pulse = L.token && !calm() ? 0.75 + 0.25 * Math.sin(t / 8) : 1
  c.globalAlpha = L.token ? pulse : 1
  c.fillStyle = L.token ? hud1 : 'rgba(255,255,255,0.10)'; c.fillRect(px, y, 66, 12)
  c.globalAlpha = 1; c.fillStyle = L.token ? '#0c0c14' : 'rgba(255,255,255,0.45)'; c.fillText(L.token ? (L.locked ? 'PRECEDENT·USED' : 'PRECEDENT') : 'PRECEDENT —', px + 33, y + 6.5)
  c.restore()
}
const CAPTION = { convene: 'DOMAIN EXPANSION — DEADLY SENTENCING', case: 'CASE REVIEW', confiscation: 'CONFISCATION', verdict: 'VERDICT: GUILTY', sword: "EXECUTIONER'S SWORD" }
function drawUltOverlay(c, cw, ch, f, v) {
  const [hud0, hud1] = colsOf(f).hud, fr = v.frame
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'
  // portrait cut-in (court convenes)
  if (fr < 40) {
    const por = art(f, 'portrait.png'), u = fr / 40, al = Math.min(1, u / 0.15, (1 - u) / 0.2)
    if (ready(por)) {
      const ph = Math.round(ch * 0.42), pw = Math.round(ph * por.naturalWidth / por.naturalHeight)
      const left = (f.facing ?? 1) >= 0, px = (left ? cw * 0.06 : cw * 0.94 - pw) + (calm() ? 0 : (1 - Math.min(1, u / 0.2)) * (left ? -80 : 80))
      c.globalAlpha = al; c.drawImage(por, px, ch * 0.2, pw, ph)
    }
  }
  const cap = CAPTION[v.beat]
  if (cap) {
    const big = v.beat === 'convene' || v.beat === 'verdict'
    c.globalAlpha = Math.min(1, fadeOf(fr) * 1.2)
    c.font = `900 ${big ? Math.round(Math.min(44, cw / 26)) : Math.round(Math.min(30, cw / 38))}px Arial`
    const y = v.beat === 'convene' ? ch * 0.17 : ch * 0.17
    c.fillStyle = '#05050a'; c.fillText(cap, cw / 2 + 2, y + 2); c.fillStyle = v.beat === 'verdict' ? hud1 : hud0; c.fillText(cap, cw / 2, y)
  }
  if (v.beat === 'case' && v.review) {   // the marks HE earned this match (gameplay categories, not accusations)
    const r = v.review, rows = CASE.categories.map(k => [CASE.labels[k], r[k]])
    const pw = 260, ph = 100, px = cw / 2 - pw / 2, py = ch * 0.24
    c.globalAlpha = 0.9; c.fillStyle = 'rgba(10,10,16,0.88)'; c.fillRect(px, py, pw, ph); c.strokeStyle = hud0; c.lineWidth = 2; c.strokeRect(px, py, pw, ph)
    c.font = 'bold 13px Arial'; c.textAlign = 'left'
    rows.forEach(([k, n], i) => {
      const shown = fr - 40 >= i * 12
      c.fillStyle = shown ? hud1 : 'rgba(255,255,255,0.3)'
      c.fillText(`${k} evidence`, px + 18, py + 24 + i * 26)
      c.textAlign = 'right'; c.fillText(shown ? (n > 0 ? `×${n}` : 'none on file') : '…', px + pw - 18, py + 24 + i * 26); c.textAlign = 'left'
    })
  }
  if (v.beat === 'confiscation') {
    c.globalAlpha = 0.85; c.strokeStyle = hud1; c.lineWidth = 4
    const w = Math.min(380, cw * 0.3); c.strokeRect(cw / 2 - w / 2, ch * 0.27, w, 44)
    c.font = 'bold 14px Arial'; c.fillStyle = hud1; c.fillText('(presentation only — no ability is removed)', cw / 2, ch * 0.27 + 62)
  }
  c.restore()
}
export function drawHigurumaHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => { if (!isHg(f)) return; drawCaseFile(c, f, flip ? cw - pad - 8 : pad + 8, 78, flip) }
  if (!isHigurumaUltActive()) { one(p1, false); one(p2, true) }
  for (const f of [p1, p2]) { const v = isHg(f) ? higurumaUltView(f) : null; if (v) drawUltOverlay(c, cw, ch, f, v) }
}

// INTRO CARD — portrait + name in the existing intro phase while a Higuruma's own intro plays (repurposed supplied poses:
// he turns, the gavel manifests, he settles). Presentation only; skip / rematch clear _introPlaying.
export function drawHigurumaIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isHg(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 20) / 10)); if (al <= 0) return
  const name = higuruma.introTitle, [hud0, hud1] = colsOf(f).hud, por = art(f, 'portrait.png')
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 30px Arial'
  const bw = c.measureText(name).width + 140, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 64
  c.fillStyle = 'rgba(10,10,16,0.84)'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = hud0; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.save(); c.beginPath(); c.rect(bx + 4, by + 4, 56, bh - 8); c.clip(); c.drawImage(por, bx + 4, by + 2, 56, 56); c.restore() }
  c.fillStyle = '#f1f5f9'; c.shadowBlur = 16; c.shadowColor = hud1
  c.fillText(name, cw / 2 + 28, by + bh / 2)
  c.restore()
}

const AFTER_DEFEAT_MUTE = /^(swing|extend|giant|slam|cross|rise|objection|counter|mark|token|precedent|ult|domain|confiscate|verdict|sword)/
export function playHigurumaCues(f) {
  const q = f?._higuruma?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('higuruma_' + v) } catch (_) {} }
  q.length = 0
}
