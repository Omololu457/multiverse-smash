// storyUI.js — MSV1-STORY: everything the story mode DRAWS (render-only: dialogue box, portraits, title cards, BOSS banner,
// relay HUD, mid-fight captions, tutorial hints, story menu). No game state is changed here; game.js owns the flow.
import { characters } from "./characters.js"

const SZ = canvas => ({ w: canvas?.width || 1280, h: canvas?.height || 720 })
const portraits = new Map()
export function storyPortrait(key) {
  if (!key) return null
  if (!portraits.has(key)) { const img = new Image(); img.src = characters[key]?.portrait || `./${key}_portrait.png`; portraits.set(key, img) }
  return portraits.get(key)
}
const stageImgs = new Map()
export function storyStageImage(stage) {
  const src = stage?.backgroundImage
  if (!src) return null
  if (!stageImgs.has(src)) { const img = new Image(); img.src = src; stageImgs.set(src, img) }
  return stageImgs.get(src)
}
const ready = img => !!(img && img.complete && img.naturalWidth > 0)
function fitCover(ctx, img, x, y, w, h, topBias = 0.25) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * topBias, dw, dh)
}
function fitContain(ctx, img, x, y, w, h) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh), dw, dh)
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }
// word-wrap that never overflows: words longer than the width are broken by character
export function storyWrap(ctx, text, maxW) {
  const out = []; let cur = ""
  for (const word of String(text).split(/\s+/)) {
    if (!word) continue
    const cand = cur ? cur + " " + word : word
    if (ctx.measureText(cand).width <= maxW) { cur = cand; continue }
    if (cur) out.push(cur)
    if (ctx.measureText(word).width <= maxW) { cur = word; continue }
    let piece = ""
    for (const ch of word) { if (ctx.measureText(piece + ch).width > maxW && piece) { out.push(piece); piece = ch } else piece += ch }
    cur = piece
  }
  if (cur) out.push(cur)
  return out
}
export const STORY_CPS = { slow: 28, normal: 55, fast: 120, instant: 1e9 }

// ── backdrop ──
function backdrop(ctx, canvas, stage, t, tint = "#1b1030") {
  const { w, h } = SZ(canvas)
  ctx.fillStyle = "#07060c"; ctx.fillRect(0, 0, w, h)
  const img = storyStageImage(stage)
  if (ready(img)) { ctx.save(); ctx.globalAlpha = 0.42; fitCover(ctx, img, 0, 0, w, h, 0.5); ctx.restore() }
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, "rgba(8,6,16,0.55)"); g.addColorStop(0.55, "rgba(8,6,16,0.25)"); g.addColorStop(1, "rgba(8,6,16,0.9)")
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // the tear: a thin vertical slit of light, drifting
  const x = w * (0.5 + 0.06 * Math.sin(t * 0.0004))
  const sg = ctx.createLinearGradient(x - 40, 0, x + 40, 0)
  sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(0.5, tint === "#1b1030" ? "rgba(200,140,255,0.16)" : tint); sg.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = sg; ctx.fillRect(x - 40, 0, 80, h)
}

// ── title cards (act / encounter / BOSS / intro / ending / credits) ──
function drawCard(ctx, canvas, card, t, age) {
  const { w, h } = SZ(canvas), cx = w / 2, cy = h * 0.36
  const a = Math.min(1, age / 400)
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const big = Math.round(Math.max(28, Math.min(64, w / 20)))
  if (card.boss) {
    const bh = big * 1.5, pulse = 0.75 + 0.25 * Math.sin(t / 160)
    ctx.fillStyle = `rgba(150,16,32,${0.82 * pulse})`; ctx.fillRect(0, cy - big * 2.1 - bh / 2, w, bh)
    ctx.fillStyle = "#ffd5d5"; ctx.font = `900 ${Math.round(big * 1.05)}px Arial`
    const label = card.finalBoss ? "FINAL BOSS" : "BOSS"
    ctx.fillText(`⚠  ${label}  ⚠`, cx, cy - big * 2.1)
  }
  let top = cy - big * 0.6
  if (card.label || card.enc) {
    ctx.font = `800 ${Math.round(big * 0.42)}px Arial`; ctx.fillStyle = card.boss ? "#ff9aa8" : "#c8a8ff"
    const tag = card.label ? card.label : card.secret ? `${card.enc} · SECRET` : `${card.enc}${card.tutorial ? " · TUTORIAL" : ""}`
    ctx.fillText(tag, cx, top - big * 0.55)
  }
  ctx.font = `900 ${big}px Arial`; ctx.fillStyle = "#fff"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(10,6,20,0.85)"
  const lines = storyWrap(ctx, card.title || "", w - 64)
  lines.forEach((ln, i) => { ctx.strokeText(ln, cx, top + i * big * 1.1); ctx.fillText(ln, cx, top + i * big * 1.1) })
  top += lines.length * big * 1.1
  if (card.sub) { ctx.font = `600 ${Math.round(big * 0.42)}px Arial`; ctx.fillStyle = "#e7dcff"; ctx.fillText(card.sub, cx, top) ; top += big * 0.6 }
  if (card.map) { ctx.font = `600 ${Math.round(big * 0.34)}px Arial`; ctx.fillStyle = "rgba(230,220,255,0.75)"; ctx.fillText(`Map · ${card.map}`, cx, top + big * 0.2) }
  ctx.restore()
}

// ── dialogue box ──
// line: storyEngine mkLine object · typed: characters revealed · opts: { hint, skipArmed, nameColor }
export function getStoryBoxRect(canvas) {
  const { w, h } = SZ(canvas)
  const pad = Math.max(16, Math.round(w * 0.03))
  const bh = Math.max(150, Math.min(250, Math.round(h * 0.3)))
  return { x: pad, y: h - bh - pad, w: w - pad * 2, h: bh }
}
export function getStorySkipRect(canvas) { const { w } = SZ(canvas); const bw = Math.max(120, Math.round(w * 0.1)); return { x: w - bw - 16, y: 16, w: bw, h: 40 } }
function drawLineBox(ctx, canvas, line, typed, opts = {}) {
  const { w, h } = SZ(canvas), B = getStoryBoxRect(canvas)
  const fs = Math.round(Math.max(17, Math.min(28, B.h * 0.14, w / 42)))
  const narr = !!line.narration, unsigned = !!line.unsigned
  // portrait (speaker's select-screen portrait; narration has none)
  let tx = B.x + 26, tw = B.w - 52
  if (!narr) {
    const ph = Math.round(Math.min(h * 0.62, B.h * 2.2)), pw = Math.round(ph * 0.78)
    const px = B.x + 10, py = B.y + B.h - ph
    const img = storyPortrait(line.speaker)
    ctx.save(); rr(ctx, px, py, pw, ph, 14); ctx.clip()
    const pg = ctx.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, "rgba(40,24,70,0.0)"); pg.addColorStop(1, "rgba(40,24,70,0.85)")
    ctx.fillStyle = pg; ctx.fillRect(px, py, pw, ph)
    if (ready(img)) fitContain(ctx, img, px, py, pw, ph)
    ctx.restore()
    tx = B.x + pw + 34; tw = B.x + B.w - tx - 26
  }
  // the box
  ctx.save()
  rr(ctx, B.x + (narr ? 0 : tx - B.x - 18), B.y, narr ? B.w : B.w - (tx - B.x - 18), B.h, 16)
  ctx.fillStyle = unsigned ? "rgba(6,30,34,0.92)" : narr ? "rgba(14,12,22,0.9)" : "rgba(20,12,36,0.92)"; ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = unsigned ? "rgba(90,255,230,0.75)" : narr ? "rgba(210,200,230,0.35)" : "rgba(200,150,255,0.8)"; ctx.stroke()
  ctx.restore()
  // name plate
  let ty = B.y + fs * 1.5
  ctx.save(); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"
  if (!narr) {
    ctx.font = `900 ${Math.round(fs * 0.95)}px Arial`; ctx.fillStyle = opts.nameColor || "#f0d9ff"
    ctx.fillText(line.name || "", tx, ty); ty += fs * 1.35
  } else if (unsigned) {
    ctx.font = `800 ${Math.round(fs * 0.7)}px monospace`; ctx.fillStyle = "rgba(120,255,235,0.85)"; ctx.fillText("▓ RIFT DISPLAY", tx, ty); ty += fs * 1.2
  }
  // text (typewriter, wrapped inside the box at every resolution)
  let text = line.text, label = ""
  if (line.telepathy) { label = "[Telepathy]"; text = text.replace(/^\[Telepathy\]\s*/, "") }
  const style = `${line.italic ? "italic " : ""}${line.italic ? 500 : 600} ${fs}px Arial`
  ctx.font = style
  const shown = Math.max(0, typed - (label ? label.length + 1 : 0))
  if (label) { ctx.font = `800 ${Math.round(fs * 0.8)}px Arial`; ctx.fillStyle = "#9ad7ff"; ctx.fillText(label, tx, ty); ty += fs * 1.2; ctx.font = style }
  const lines = storyWrap(ctx, text, tw)
  const lh = fs * 1.32, room = Math.max(1, Math.floor((B.y + B.h - 14 - ty + lh * 0.8) / lh))
  let left = shown
  ctx.fillStyle = line.italic ? "#d9d3ea" : unsigned ? "#c9fff6" : "#ffffff"
  for (let i = 0; i < lines.length && left > 0; i++) {
    const seg = lines[i].slice(0, left); left -= lines[i].length + 1
    const row = lines.length > room ? i - Math.max(0, lines.length - room) : i
    if (row < 0) continue
    ctx.fillText(seg, tx, ty + row * lh)
  }
  // advance hint
  ctx.font = `600 ${Math.round(fs * 0.58)}px Arial`; ctx.textAlign = "right"; ctx.fillStyle = "rgba(230,220,255,0.7)"
  ctx.fillText(opts.hint || "", B.x + B.w - 18, B.y + B.h - 12)
  ctx.restore()
  return { lines: lines.length, fs }
}

// ── the full story scene (one frame) ──
// s: { step, line, typed, age, stage, now, skipArmed, progress, hint, speed }
export function drawStoryScene(ctx, canvas, s) {
  const { w, h } = SZ(canvas), t = s.now || 0
  backdrop(ctx, canvas, s.stage, t, s.step?.card?.boss ? "rgba(255,70,90,0.18)" : undefined)
  if (s.step?.card) drawCard(ctx, canvas, s.step.card, t, s.cardAge ?? 1000)
  if (s.line) drawLineBox(ctx, canvas, s.line, s.typed, { hint: s.hint })
  else if (s.step?.card) {
    ctx.save(); ctx.textAlign = "center"; ctx.font = `600 ${Math.round(Math.max(14, w / 70))}px Arial`; ctx.fillStyle = "rgba(230,220,255,0.75)"
    ctx.fillText(s.hint || "", w / 2, h * 0.86); ctx.restore()
  }
  if (s.retry) drawRetry(ctx, canvas, s.retry)
  // SKIP SCENE (press twice)
  const R = getStorySkipRect(canvas)
  if (!s.retry) {
    ctx.save(); rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.fillStyle = s.skipArmed ? "rgba(160,30,60,0.9)" : "rgba(20,14,34,0.8)"; ctx.fill()
    ctx.strokeStyle = s.skipArmed ? "#ffb3c1" : "rgba(200,170,255,0.6)"; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `800 ${Math.round(R.h * 0.36)}px Arial`
    ctx.fillText(s.skipArmed ? "SKIP? AGAIN" : "SKIP SCENE", R.x + R.w / 2, R.y + R.h / 2 + 1); ctx.restore()
  }
  if (s.progress) {
    ctx.save(); ctx.textAlign = "left"; ctx.font = `700 ${Math.round(Math.max(13, w / 80))}px Arial`; ctx.fillStyle = "rgba(220,205,255,0.75)"
    ctx.fillText(s.progress, 66, 34); ctx.restore()   // right of the fullscreen button
  }
}
function drawRetry(ctx, canvas, r) {
  const { w, h } = SZ(canvas)
  ctx.save(); ctx.fillStyle = "rgba(5,3,10,0.55)"; ctx.fillRect(0, 0, w, h)
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const big = Math.round(Math.max(30, Math.min(64, w / 20)))
  ctx.font = `900 ${big}px Arial`; ctx.fillStyle = "#ffb3c1"; ctx.fillText("THE RIFT HOLDS", w / 2, h * 0.34)
  ctx.font = `600 ${Math.round(big * 0.36)}px Arial`; ctx.fillStyle = "#e7dcff"
  ctx.fillText(r.sub || "", w / 2, h * 0.34 + big * 0.9)
  for (const b of getStoryRetryRects(canvas)) {
    const on = r.hover === b.id
    ctx.save(); rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = on ? "rgba(120,60,200,0.95)" : "rgba(24,16,40,0.9)"; ctx.fill()
    ctx.strokeStyle = on ? "#fff" : "rgba(200,170,255,0.7)"; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = "#fff"; ctx.font = `800 ${Math.round(b.h * 0.34)}px Arial`; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1); ctx.restore()
  }
  ctx.restore()
}
export function getStoryRetryRects(canvas) {
  const { w, h } = SZ(canvas), bw = Math.min(300, (w - 48) / 2), bh = 58, y = h * 0.55
  return [{ id: "retry", label: "RETRY ENCOUNTER", x: w / 2 - bw - 8, y, w: bw, h: bh }, { id: "quit", label: "STORY MENU", x: w / 2 + 8, y, w: bw, h: bh }]
}

// ── in-battle overlays (render-only) ──
// relay HUD: "02 · The entrance exam   OPPONENT 2 / 5" (+ BOSS / RIFT MIRROR tags)
export function drawStoryBattleHud(ctx, canvas, hud) {
  if (!hud) return
  const { w, h } = SZ(canvas)
  const fs = Math.round(Math.max(12, Math.min(18, w / 75)))
  const txt = `${hud.enc} · ${hud.title}`, rel = hud.count > 1 ? `OPPONENT ${hud.index + 1} / ${hud.count}` : ""
  ctx.save(); ctx.font = `800 ${fs}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const tags = [hud.boss ? (hud.finalBoss ? "FINAL BOSS" : "BOSS") : "", hud.mirror ? "RIFT MIRROR" : ""].filter(Boolean)
  const full = [txt, rel, ...tags].filter(Boolean).join("   ·   ")
  const bw = Math.min(w - 24, ctx.measureText(full).width + 36), y = Math.round(h * 0.16) + 6
  rr(ctx, w / 2 - bw / 2, y - fs, bw, fs * 2, 10); ctx.fillStyle = hud.boss ? "rgba(110,14,30,0.82)" : "rgba(18,12,32,0.78)"; ctx.fill()
  ctx.strokeStyle = hud.boss ? "#ff8095" : "rgba(200,150,255,0.7)"; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = "#fff"
  let s = full
  while (ctx.measureText(s).width > bw - 20 && s.length > 8) s = s.slice(0, -2)
  ctx.fillText(s === full ? full : s + "…", w / 2, y + 1)
  if (hud.count > 1) {   // relay pips
    const n = hud.count, r = Math.max(4, fs * 0.32), gap = r * 3, x0 = w / 2 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x0 + i * gap, y + fs * 1.6, r, 0, 7); ctx.fillStyle = i < hud.index ? "#8b7aa8" : i === hud.index ? "#f0d9ff" : "rgba(255,255,255,0.22)"; ctx.fill() }
  }
  ctx.restore()
}
// caption over the match (does NOT pause it): mid-fight cue / second-map text
export function drawStoryCaption(ctx, canvas, line, alpha = 1) {
  if (!line || alpha <= 0) return
  const { w, h } = SZ(canvas)
  const fs = Math.round(Math.max(15, Math.min(24, w / 52)))
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.font = `${line.italic ? "italic " : ""}700 ${fs}px Arial`
  const maxW = Math.min(w - 40, 900), rows = storyWrap(ctx, line.text, maxW - (line.speaker ? fs * 3.4 : 0) - 32)
  const bh = rows.length * fs * 1.3 + fs * (line.name ? 1.9 : 1.0), bw = maxW, x = w / 2 - bw / 2, y = h * 0.7 - bh
  rr(ctx, x, y, bw, bh, 12); ctx.fillStyle = line.narration ? "rgba(12,10,20,0.86)" : "rgba(26,12,40,0.88)"; ctx.fill()
  ctx.strokeStyle = "rgba(200,150,255,0.8)"; ctx.lineWidth = 2; ctx.stroke()
  let tx = x + 16
  if (line.speaker) { const img = storyPortrait(line.speaker), ps = fs * 2.8; if (ready(img)) { ctx.save(); rr(ctx, x + 10, y + 10, ps, ps, 8); ctx.clip(); fitCover(ctx, img, x + 10, y + 10, ps, ps, 0.1); ctx.restore() } tx = x + 20 + ps }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"
  let ty = y + fs * 1.3
  if (line.name) { ctx.font = `900 ${Math.round(fs * 0.85)}px Arial`; ctx.fillStyle = "#f0d9ff"; ctx.fillText(line.name, tx, ty); ty += fs * 1.25 }
  ctx.font = `${line.italic ? "italic " : ""}600 ${fs}px Arial`; ctx.fillStyle = "#fff"
  rows.forEach((r, i) => ctx.fillText(r, tx, ty + i * fs * 1.3))
  ctx.restore()
}
export function drawStoryTutorialHints(ctx, canvas, hints, alpha = 1) {
  if (!hints?.length || alpha <= 0) return
  const { w, h } = SZ(canvas)
  const fs = Math.round(Math.max(12, Math.min(17, w / 80)))
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `700 ${fs}px Arial`; ctx.textAlign = "left"; ctx.textBaseline = "middle"
  const bw = Math.min(w - 32, Math.max(...hints.map(x => ctx.measureText(x.hint).width)) + 40), bh = hints.length * fs * 1.7 + fs * 2.2
  const x = 16, y = h * 0.24
  rr(ctx, x, y, bw, bh, 10); ctx.fillStyle = "rgba(10,20,30,0.78)"; ctx.fill(); ctx.strokeStyle = "rgba(120,220,255,0.7)"; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = "#7dd3fc"; ctx.font = `900 ${fs}px Arial`; ctx.fillText("TUTORIAL", x + 16, y + fs * 1.1)
  ctx.font = `600 ${fs}px Arial`
  hints.forEach((x2, i) => { ctx.fillStyle = "#e0f2fe"; let s = "• " + x2.hint; while (ctx.measureText(s).width > bw - 28 && s.length > 6) s = s.slice(0, -2); ctx.fillText(s, x + 16, y + fs * 2.5 + i * fs * 1.7) })
  ctx.restore()
}

// ── story menu ──
export function getStoryMenuRects(canvas, items) {
  const { w, h } = SZ(canvas)
  const narrow = w < 760
  const bw = narrow ? w - 32 : Math.min(520, w * 0.42), bh = Math.max(46, Math.min(62, h * 0.075)), gap = 10
  const x = narrow ? 16 : w * 0.52, y0 = Math.max(narrow ? h * 0.42 : 170, h * 0.5 - (items.length * (bh + gap)) / 2)
  return items.map((it, i) => ({ ...it, x, y: y0 + i * (bh + gap), w: bw, h: bh }))
}
export function drawStoryMenu(ctx, canvas, m) {
  const { w, h } = SZ(canvas), t = m.now || 0
  backdrop(ctx, canvas, m.stage, t)
  const narrow = w < 760
  // fighter portrait (left)
  const img = storyPortrait(m.fighterKey)
  const ph = narrow ? h * 0.3 : h * 0.72, pw = ph * 0.8, px = narrow ? w / 2 - pw / 2 : Math.max(16, w * 0.08), py = narrow ? 70 : h - ph - 40
  if (ready(img)) { ctx.save(); ctx.globalAlpha = 0.95; fitContain(ctx, img, px, py, pw, ph); ctx.restore() }
  ctx.save(); ctx.textAlign = narrow ? "center" : "left"; ctx.textBaseline = "alphabetic"
  const tx = narrow ? w / 2 : w * 0.52
  ctx.font = `800 ${Math.round(Math.max(13, w / 80))}px Arial`; ctx.fillStyle = "#c8a8ff"; ctx.fillText("STORY", tx, narrow ? 40 : 70)
  ctx.font = `900 ${Math.round(Math.max(20, Math.min(40, w / 32)))}px Arial`; ctx.fillStyle = "#fff"
  const titleRows = storyWrap(ctx, m.campaignTitle || "", narrow ? w - 32 : w * 0.46)
  if (!narrow) titleRows.forEach((r, i) => ctx.fillText(r, tx, 112 + i * Math.max(24, w / 30)))
  ctx.font = `700 ${Math.round(Math.max(13, w / 70))}px Arial`; ctx.fillStyle = "#e7dcff"
  ctx.fillText(m.fighterName ? `Playing as ${m.fighterName}` : "", tx, narrow ? h * 0.4 - 8 : 112 + titleRows.length * Math.max(24, w / 30) + 6)
  ctx.restore()
  for (const b of getStoryMenuRects(canvas, m.items)) {
    const on = m.hover === b.id
    ctx.save(); rr(ctx, b.x, b.y, b.w, b.h, 12)
    ctx.fillStyle = b.isNew ? (on ? "rgba(170,120,20,0.95)" : "rgba(80,56,10,0.9)") : on ? "rgba(120,60,200,0.95)" : "rgba(24,16,40,0.88)"; ctx.fill()
    ctx.strokeStyle = b.isNew ? "#fde68a" : on ? "#fff" : "rgba(200,170,255,0.6)"; ctx.lineWidth = 2; ctx.stroke()
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.font = `800 ${Math.round(b.h * 0.32)}px Arial`
    ctx.fillText(b.label, b.x + 18, b.y + b.h * (b.sub ? 0.36 : 0.5))
    if (b.sub) { ctx.font = `600 ${Math.round(b.h * 0.22)}px Arial`; ctx.fillStyle = "rgba(235,225,255,0.8)"; let s = b.sub; while (ctx.measureText(s).width > b.w - 36 && s.length > 6) s = s.slice(0, -2); ctx.fillText(s === b.sub ? s : s + "…", b.x + 18, b.y + b.h * 0.72) }
    if (b.isNew) { ctx.textAlign = "right"; ctx.font = `900 ${Math.round(b.h * 0.24)}px Arial`; ctx.fillStyle = "#fde68a"; ctx.fillText("NEW", b.x + b.w - 14, b.y + b.h * 0.36) }
    ctx.restore()
  }
  ctx.save(); ctx.textAlign = "center"; ctx.font = `600 ${Math.round(Math.max(12, w / 95))}px Arial`; ctx.fillStyle = "rgba(220,205,255,0.6)"
  ctx.fillText("↑↓ choose · Enter / J confirm · Esc back", w / 2, h - 14); ctx.restore()
}
