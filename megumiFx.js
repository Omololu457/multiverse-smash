// Megumi Fushiguro (megumi_fushiguro) — RENDER-ONLY FX, HUD, intro card, Mahoraga intro showcase, ultimate presentation
// and audio cues. Reads sim state (f._megumi, the ultimate view), never writes it. Every sprite drawn here is a supplied
// sheet cell (summon strips from tools/megumi/extract.py, Megumi's own current frame for Shadow Step echoes); the only
// code-drawn pieces are small ground shadows / warning ellipses, HUD pips and text.
// Bounded: images cached once per URL, no per-frame canvases, pixel reads or image decoding; every list is capped in
// the sim. No Math.random. Reduced effects (juiceSettings.reduceFlashing / reduceMotion) → no echoes, no blinking.
// Summons are separate creatures and are NOT recoloured by skins (skins change Megumi and the HUD accent only).
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { megumi_fushiguro as MG, NUE, AIRNUE, RABBIT, SERPENT, ELEPHANT, TOAD, ULT, MAHORAGA_INTRO, ROUTE } from './megumiData.js'
import { MEGUMI_SUMMON_ANIM as SA } from './megumiSprites.js'
import { megumiUltView } from './megumiState.js'
import { MEGUMI_FX_COLORS } from './megumiSkins.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const megumiFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && MEGUMI_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => MEGUMI_FX_COLORS[tagOf(f)] || MEGUMI_FX_COLORS.default
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const isMg = f => f?.rosterKey === 'megumi_fushiguro'

// Presentation scale per summon (integer nearest-neighbour). Megumi himself is ×3; the sheet already draws the large
// shikigami far bigger than him, so the large ones use ×2 to keep them on screen. Hit volumes are sized to these.
export const SUMMON_SCALE = { dog: 2, toad: 3, nue: 2, airNue: 2, rabbit: 3, serpent: 2, elephant: 2, kon: 2, mahoraga: 3 }   // Mahoraga: the sheet draws it at Megumi's own scale → ×3 like him
// Strip timelines (elapsed summon frame → strip cell). Each matches the sim schedule in megumiData.js.
const TL = {
  toad: [[0, 0], [3, 1], [6, 2], [9, 3], [TOAD.warn - 1, 4], [TOAD.warn, 5], [14, 6], [16, 7], [18, 8], [21, 9], [24, 10], [28, 11], [32, 12], [36, 13]],
  nue: [[0, 0], [5, 1], [10, 2], [15, 3], [NUE.burstAt, 4], [NUE.burstAt + 2, 5], [NUE.burstAt + 4, 6], [30, 7], [38, 8]],
  airNue: [[0, 0], [4, 1], [10, 2], [AIRNUE.burstAt, 3], [AIRNUE.burstAt + 2, 4], [AIRNUE.burstAt + 5, 5], [25, 6], [30, 7], [36, 8], [42, 9]],
  serpent: [[0, 0], [7, 1], [14, 2], [SERPENT.warn + 2, 3], [SERPENT.warn + 4, 4], [30, 5], [44, 6]],
  elephant: [[0, 0], [6, 1], [12, 2], [18, 3], [24, 4], [30, 5], [36, 6], [40, 7], [46, 8], [52, 9], [56, 10], [62, 11], [72, 12], [84, 13], [96, 14], [108, 15]],
  konMiss: [[0, 0], [4, 1], [8, 2], [12, 3], [18, 4], [26, 5], [38, 6]],
}
const at = (tl, t) => { let fr = tl[0][1]; for (const [k, v] of tl) if (t >= k) fr = v; return fr }

function drawCell(c, im, i, A, x, yBottom, scale, flip = 1, alpha = 1, originX = null) {
  if (!ready(im) || alpha <= 0.01) return
  const ox = originX ?? A.originX
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha
  c.translate(Math.round(x), Math.round(yBottom)); c.scale(flip, 1)
  c.drawImage(im, i * A.width, 0, A.width, A.height, -ox * scale, -A.originY * scale, A.width * scale, A.height * scale); c.restore()
}
const strip = k => image(SA[k].sheet)
function shadowPool(c, x, y, rx, al = 0.45) {
  c.save(); c.globalAlpha = al; c.fillStyle = '#05050c'; c.beginPath(); c.ellipse(x, y - 1, rx, Math.max(3, rx * 0.18), 0, 0, Math.PI * 2); c.fill(); c.restore()
}

function drawSummon(c, f, s) {
  const z = s.summon; if (!z) return
  const d = z.dir || 1, t = z.t
  switch (z.kind) {
    case 'dog': {
      const k = z.col === 'black' ? 'dogBlack' : 'dogWhite', fr = z.fading ? 4 : t < 4 ? 0 : 1 + Math.floor(t / 4) % 3
      shadowPool(c, z.x, z.y, 36, z.fading ? 0.3 : 0.4)
      drawCell(c, strip(k), fr, SA[k], z.x, z.y, SUMMON_SCALE.dog, d, z.fading ? Math.max(0, 1 - z.fading / 10) : 1)
      break
    }
    case 'toad':
      shadowPool(c, z.x, z.y, 26)
      drawCell(c, strip('toad'), at(TL.toad, t), SA.toad, z.x, z.y, SUMMON_SCALE.toad, d)
      break
    case 'nue':
      drawCell(c, strip('nue'), at(TL.nue, t), SA.nue, z.x, z.y + SA.nue.height * SUMMON_SCALE.nue / 2, SUMMON_SCALE.nue, d)
      break
    case 'airNue':
      drawCell(c, strip('airNue'), at(TL.airNue, t), SA.airNue, z.x, z.y + SA.airNue.height * SUMMON_SCALE.airNue / 2, SUMMON_SCALE.airNue, d)
      break
    case 'serpent': {
      if (t <= SERPENT.warn + 2) {   // emergence warning: a widening shadow pool at the captured point (blinks unless calm)
        const al = calm() ? 0.6 : (t % 6 < 3 ? 0.7 : 0.45)
        shadowPool(c, z.x, z.y, 18 + t * 1.2, al)
      } else shadowPool(c, z.x, z.y, 40, 0.5)
      drawCell(c, strip('serpent'), at(TL.serpent, t), SA.serpent, z.x, z.y, SUMMON_SCALE.serpent, d)
      break
    }
    case 'elephant': {
      shadowPool(c, z.x + d * 40, z.y, 90, 0.5)
      drawCell(c, strip('elephant'), at(TL.elephant, t), SA.elephant, z.x, z.y, SUMMON_SCALE.elephant, d)
      break
    }
    case 'kon':
      shadowPool(c, z.x, z.y, 50)
      drawCell(c, strip('konMiss'), at(TL.konMiss, t), SA.konMiss, z.x, z.y, SUMMON_SCALE.kon, d)
      break
  }
}
const RABBIT_OFFS = [-64, -36, -12, 14, 40, 66]
function drawRabbits(c, f, s) {
  const rb = s.rabbits; if (!rb) return
  const A = SA.rabbit, im = strip('rabbit'), t = rb.t
  RABBIT_OFFS.slice(0, RABBIT.count).forEach((dx, i) => {
    const fr = t < 4 ? 0 : t > RABBIT.life - 6 ? 7 : 1 + (Math.floor(t / 4) + i) % 6
    const hop = calm() ? 0 : Math.abs(Math.sin((t + i * 5) / 5)) * 10
    drawCell(c, im, fr, A, rb.x + dx, rb.y - hop, SUMMON_SCALE.rabbit, i % 2 ? -1 : 1)
  })
  if (!rb.hopUsed && t <= RABBIT.window) {   // hop window marker under Megumi
    c.save(); c.globalAlpha = 0.8; c.strokeStyle = colsOf(f).hud[1]; c.lineWidth = 2
    c.beginPath(); c.ellipse(ctrX(f), f.y + f.h - 2, 26, 6, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
}
const SINK = { dog: 'dogBlack', toad: 'toad', nue: 'nue', airNue: 'airNue', serpent: 'serpent', elephant: 'elephant', kon: 'konMiss' }
const LAST = { dogBlack: 4, toad: 13, nue: 8, airNue: 9, serpent: 6, elephant: 0, konMiss: 6 }
function drawEvents(c, f, s) {
  const [hud0, hud1] = colsOf(f).hud
  for (const e of s.fx) {
    if (e.kind === 'sink') {   // dismissed summon: its supplied silhouette cell sinks back into the shadow
      const kk = SINK[e.what]; const A = kk && SA[kk]; if (!A) continue
      drawCell(c, strip(kk), LAST[kk] || 0, A, e.x, e.y + e.t * 0.8, SUMMON_SCALE[e.what] || 2, e.dir || 1, Math.max(0, 0.8 - e.t / 24))
    } else if (e.kind === 'stock') {
      c.save(); c.globalAlpha = Math.max(0, 1 - e.t / 30); c.font = 'bold 14px Arial'; c.textAlign = 'center'
      c.fillStyle = '#05050c'; c.fillText('SHADOW ROUTE', e.x + 1, e.y - e.t * 0.6 + 1); c.fillStyle = hud1; c.fillText('SHADOW ROUTE', e.x, e.y - e.t * 0.6); c.restore()
    }
  }
}
// Shadow Step echoes: fading dark copies of Megumi's ACTUAL current frame at his recent positions (cosmetic only).
function drawGhosts(c, f, s) {
  if (calm() || !s.ghosts.length || f._lastDrawX == null) return
  const d = (f._skinAnim && f._skinAnim[f._lastSpriteAction]) || MG.animationData[f._lastSpriteAction]; if (!d?.sheet) return
  const im = image(d.sheet); if (!ready(im)) return
  const fr = f._lastSpriteFrame ?? 0
  for (const gh of s.ghosts) {
    const dx = gh.x - f.x, al = 0.42 * (1 - gh.t / 15); if (al <= 0) continue
    // darkened silhouette of the real frame via a per-draw filter (a source-atop fill would tint the opaque world canvas)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = al; c.filter = 'brightness(0.18) saturate(0.4)'
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + dx + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX + dx, f._lastDrawY)
    c.drawImage(im, fr * d.width, 0, d.width, d.height, 0, 0, f._lastDrawW, f._lastDrawH)
    c.restore()
  }
}

// ── ultimate presentation (world layer): every shikigami here is a supplied strip; damage is in the sim ──
function drawUlt(c, f, v) {
  const k = v.frame, d = v.dir, y = v.feet, tx = v.tx
  if (k >= 75 && k < 112) drawCell(c, strip('konHit'), Math.min(9, Math.floor((k - 75) / 4)), SA.konHit, tx - d * 30, y, SUMMON_SCALE.kon, d)
  if (k >= 104 && k < 130) drawCell(c, strip('nue'), Math.min(8, 3 + Math.floor((k - 104) / 4)), SA.nue, tx, y - 150 + SA.nue.height, SUMMON_SCALE.nue, d)
  if (k >= 128 && k < 166) drawCell(c, strip('elephant'), Math.min(15, 4 + Math.floor((k - 128) / 3)), SA.elephant, tx - d * 420, y, SUMMON_SCALE.elephant, d)
  if (k >= 166 && k < 190) {   // final shadow strike: Totality's supplied shadow silhouette lunges through the target
    const u = (k - 166) / 24
    drawCell(c, strip('konMiss'), 0, SA.konMiss, tx - d * 220 + d * 440 * u, y, SUMMON_SCALE.kon, d, 1 - Math.max(0, u - 0.8) * 5)
  }
}

// World layer (after the fighters).
export function drawMegumiFx(c, f) {
  if (!isMg(f)) return
  const s = f._megumi
  if (f._introPlaying && f._introVariant === 'introMahoraga') drawMahoraga(c, f)
  if (!s) return
  const v = megumiUltView(f); if (v) drawUlt(c, f, v)
  drawGhosts(c, f, s)
  drawSummon(c, f, s)
  drawRabbits(c, f, s)
  drawEvents(c, f, s)
}

// ── MAHORAGA (non-combat intro showcase, honestly labelled): Megumi's supplied Makora hand sign plays as his intro
// action; the supplied 29-cell Mahoraga sequence plays ahead of him. No hitbox, no state, no gameplay effect.
function drawMahoraga(c, f) {
  const k = f._introRevealFrame || 0, M = MAHORAGA_INTRO
  if (k < M.startAt) return
  const i = Math.floor((k - M.startAt) / M.step); if (i >= M.frames + 6) return
  const al = i >= M.frames ? Math.max(0, 1 - (i - M.frames) / 6) : Math.min(1, (k - M.startAt) / 8)
  const d = f.facing || 1, x = ctrX(f) + d * M.ahead, y = f.y + f.h
  shadowPool(c, x, y, 70, 0.5 * al)
  drawCell(c, strip('mahoraga'), Math.min(M.frames - 1, i), SA.mahoraga, x, y, SUMMON_SCALE.mahoraga, d, al)
}

// ── Screen layer ──
export function megumiHudLabel(f) {
  const s = f?._megumi
  return { stocks: s?.route?.stocks || 0, max: ROUTE.maxStocks, families: [...(s?.route?.fam || [])], routeUsed: !!s?.route?.usedCombo,
    confirm: !!s?.route?.confirm, summon: s?.summon?.kind || null, rabbits: !!s?.rabbits,
    step: s ? Math.max(0, (s.stepReady || 0) - (s.clock || 0)) : 0, airEnd: !!s?.airEnd, airNue: !!s?.airNue }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, al = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const d = MG.animationData.ultSign, im = image(((f._skinAnim && f._skinAnim.ultSign) || d).sheet); if (!ready(im)) return
  const sc = Math.max(3, Math.floor(Math.min(cw, 1400) / 300)), bw = d.width * sc, bh = d.height * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.26), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.85 * al; c.fillStyle = '#06060e'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = al; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  const fr = Math.min(d.frames - 1, Math.floor(v.frame / 4))
  c.imageSmoothingEnabled = false; c.save()
  if (!left) { c.translate(bx + bw, by); c.scale(-1, 1); c.drawImage(im, fr * d.width, 0, d.width, d.height, 0, 0, bw, bh) } else c.drawImage(im, fr * d.width, 0, d.width, d.height, bx, by, bw, bh)
  c.restore()
  c.font = `bold ${Math.round(12 + sc * 2)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud0; c.fillText('DOMAIN EXPANSION', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.36)
  c.font = `900 ${Math.round(16 + sc * 4)}px Arial`; c.fillStyle = hud1
  c.fillText('CHIMERA SHADOW GARDEN', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.64)
  c.restore()
}
// Shadow Route stocks in the existing per-player HUD row (under the health / energy bars, like the other roster
// gauges): each stock pip is the supplied Divine Dog shadow silhouette cell; family progress is a pair of small dots.
export function drawMegumiHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const icon = strip('dogBlack'), A = SA.dogBlack
  const one = (f, flip) => {
    if (!isMg(f)) return
    const L = megumiHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const x0 = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74
    c.save(); c.imageSmoothingEnabled = false
    for (let i = 0; i < L.max; i++) {
      const ix = flip ? x0 + barW - 40 - i * 38 : x0 + i * 38
      c.globalAlpha = i < L.stocks ? 1 : 0.25
      if (ready(icon)) c.drawImage(icon, 0, 0, A.width, A.height, ix, y0, A.width / 2, A.height / 2)
      if (i < L.stocks) { c.fillStyle = hud1; c.fillRect(ix + 4, y0 + A.height / 2 + 1, A.width / 2 - 8, 2) }
    }
    c.globalAlpha = 1
    for (let i = 0; i < ROUTE.perStock; i++) {
      const dx = flip ? x0 + barW - 40 - L.max * 38 - i * 10 : x0 + L.max * 38 + i * 10
      c.fillStyle = i < L.families.length ? hud0 : 'rgba(255,255,255,0.25)'; c.fillRect(dx, y0 + 8, 6, 6)
    }
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? x0 + barW - 40 - L.max * 38 - 26 : x0 + L.max * 38 + 26
    c.fillStyle = L.confirm && L.stocks && !L.routeUsed ? hud1 : 'rgba(255,255,255,0.6)'
    c.fillText(L.confirm && L.stocks && !L.routeUsed ? 'ROUTE — R1!' : `SHADOW ROUTE ${L.stocks}/${L.max}`, tx, y0 + 2)
    c.fillStyle = L.step ? 'rgba(255,255,255,0.45)' : hud0
    c.fillText(L.step ? `SHADOW STEP ${Math.ceil(L.step / 6) / 10}s` : 'SHADOW STEP READY', tx, y0 + 14)
    c.restore()
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = isMg(f) ? megumiUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// INTRO CARD — lower-third banner (namecall styling) while Megumi's own intro plays; the Mahoraga variant is labelled
// as a showcase so it never reads as a playable move.
export function drawMegumiIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isMg(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 24) / 10)); if (al <= 0) return
  const maho = f._introVariant === 'introMahoraga'
  const name = MG.introTitle, sub = maho ? 'INTRO SHOWCASE — MAHORAGA (presentation only)' : 'TOKYO JUJUTSU HIGH',
    [hud0, hud1] = colsOf(f).hud, por = image(tagOf(f) ? `./assets/megumi_fushiguro/skins/${tagOf(f)}/portrait.png` : MG.portrait)
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 32px Arial'
  const bw = c.measureText(name).width + 150, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 70
  c.fillStyle = 'rgba(6,6,16,0.84)'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = hud0; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.save(); c.beginPath(); c.rect(bx + 4, by + 4, 56, bh - 8); c.clip(); c.drawImage(por, bx + 6, by + 2, 48, 72); c.restore() }
  c.fillStyle = '#eef2ff'; c.shadowBlur = 16; c.shadowColor = hud1
  c.fillText(name, cw / 2 + 28, by + bh * 0.4)
  c.shadowBlur = 0; c.font = 'bold 12px Arial'; c.fillStyle = hud1; c.fillText(sub, cw / 2 + 28, by + bh * 0.78)
  c.restore()
}

const AFTER_DEFEAT_MUTE = /^(sign|summon|zap|rise|water|pull|route|step|hop|swing|blade|reject|ult|claw|stock)/
export function playMegumiCues(f) {
  const q = f?._megumi?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('megumi_' + v) } catch (_) {} }
  q.length = 0
}
