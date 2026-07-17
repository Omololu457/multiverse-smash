// ui.js
// Shared UI rendering and menu layout helpers.
// HUD LAYOUT: Health bars → TOP of screen | Energy bars → BOTTOM of screen

import { drawCharacter } from "./fighters.js"
import { characters } from "./characters.js"
import { isDevUnlocked } from "./progression.js"
import { isFileApiSupported, saveFileStatus } from "./account.js"
import { countShadowClones } from "./summons.js"

const startScreenImage = new Image()
startScreenImage.src = "./start-screen.png"

const stageBackgroundImages = new Map()

function resolveStageImagePath(path) {
  if (!path) return ""
  if (
    path.startsWith("./")   ||
    path.startsWith("../")  ||
    path.startsWith("/")    ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) return path
  return `./${path}`
}

function getStageBackgroundImage(stage) {
  const key = stage?.backgroundImage
  if (!key) return null
  if (!stageBackgroundImages.has(key)) {
    const img = new Image()
    img.src   = resolveStageImagePath(key)
    stageBackgroundImages.set(key, img)
  }
  return stageBackgroundImages.get(key)
}

// ─────────────────────────────────────────────
// CHARACTER PORTRAITS (per-rosterKey, lazily loaded + cached)
// Files: ./<rosterKey>_portrait.png. Never blocks: callers must check
// _imageReady() and fall back to their existing rendering if not loaded/404.
// ─────────────────────────────────────────────
const portraitImages = new Map()

function getPortraitImage(rosterKey) {
  // Prefer the character's EXPLICIT `portrait` field (exact on-disk filename incl.
  // extension + case — GitHub is case-sensitive). Falls back to the legacy
  // ./<rosterKey>_portrait.png convention for any character without the field.
  const key = String(rosterKey || "").trim()
  if (!key) return null
  if (!portraitImages.has(key)) {
    const src = characters?.[key]?.portrait || `./${key}_portrait.png`
    const img = new Image()
    img.src = src
    portraitImages.set(key, img)
  }
  return portraitImages.get(key)
}

function _imageReady(img) {
  return !!(img && img.complete && img.naturalWidth > 0)
}

// cover-fit a square-ish portrait into a rect: scale to fill, center-crop,
// biased slightly toward the TOP so the face (upper-center of a headshot) stays
// in frame rather than being cropped at the chin.
function _coverDrawImage(ctx, img, x, y, w, h, topBias = 0.30) {
  const iw = img.naturalWidth, ih = img.naturalHeight
  if (!iw || !ih) return
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale, dh = ih * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * topBias, dw, dh)
}

// ─────────────────────────────────────────────
// BASIC HELPERS
// ─────────────────────────────────────────────
function getCanvasSize(canvas) {
  return {
    width:  canvas?.width  || canvas?.clientWidth  || window.innerWidth,
    height: canvas?.height || canvas?.clientHeight || window.innerHeight
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Local hit-test (input.js owns the exported pointInRect; ui.js stays
// dependency-light and just needs this for hover highlighting).
function _inRect(x, y, r) {
  return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function normalizeToArray(value) {
  return Array.isArray(value) ? value : []
}

function roundRect(ctx, x, y, w, h, r = 18) {
  const radius = Math.min(r, w * 0.5, h * 0.5)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, w, h, r = 18) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, w, h, r = 18) {
  roundRect(ctx, x, y, w, h, r)
  ctx.stroke()
}

function drawPanel(ctx, x, y, w, h, options = {}) {
  const {
    radius    = 18,
    fill      = "rgba(10, 16, 36, 0.72)",
    stroke    = "rgba(255,255,255,0.16)",
    lineWidth = 2
  } = options
  ctx.save()
  ctx.fillStyle = fill
  fillRoundRect(ctx, x, y, w, h, radius)
  ctx.strokeStyle = stroke
  ctx.lineWidth   = lineWidth
  strokeRoundRect(ctx, x, y, w, h, radius)
  ctx.restore()
}

function drawCenteredText(ctx, text, x, y, options = {}) {
  const {
    font        = "700 24px Arial",
    fill        = "#ffffff",
    align       = "center",
    baseline    = "middle",
    shadowBlur  = 0,
    shadowColor = "transparent"
  } = options
  ctx.save()
  ctx.font         = font
  ctx.fillStyle    = fill
  ctx.textAlign    = align
  ctx.textBaseline = baseline
  ctx.shadowBlur   = shadowBlur
  ctx.shadowColor  = shadowColor
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawSubText(ctx, text, x, y, options = {}) {
  drawCenteredText(ctx, text, x, y, {
    font:     options.font     || "16px Arial",
    fill:     options.fill     || "rgba(220,230,255,0.82)",
    align:    options.align    || "center",
    baseline: options.baseline || "middle"
  })
}

function drawBackdrop(ctx, canvas, top = "#070d1b", bottom = "#17243f") {
  const { width: w, height: h } = getCanvasSize(canvas)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, top)
  bg.addColorStop(1, bottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.22
  const glow1 = ctx.createRadialGradient(w * 0.22, h * 0.18, 10, w * 0.22, h * 0.18, w * 0.34)
  glow1.addColorStop(0, "#5d89ff")
  glow1.addColorStop(1, "transparent")
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, w, h)

  const glow2 = ctx.createRadialGradient(w * 0.78, h * 0.28, 10, w * 0.78, h * 0.28, w * 0.30)
  glow2.addColorStop(0, "#ff6fb7")
  glow2.addColorStop(1, "transparent")
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function getGridLayout(count, canvas, options = {}) {
  const { width: w } = getCanvasSize(canvas)
  const cols   = options.cols  || 3
  const cardW  = options.cardW || 300
  const cardH  = options.cardH || 120
  const gap    = options.gap   || 24
  const startY = options.startY || 150

  const totalW = cols * cardW + (cols - 1) * gap
  const startX = (w - totalW) / 2
  const rects  = []

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    rects.push({
      x: startX + col * (cardW + gap),
      y: startY + row * (cardH + gap),
      w: cardW,
      h: cardH
    })
  }
  return rects
}

function getVerticalMenuLayout(canvas, labels = []) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const n = Math.max(1, labels.length)
  const menuWidth  = clamp(w * 0.34, 320, 520)
  // Fit the buttons in the band BELOW the header and ABOVE the footer at any
  // screen size / item count — shrink the row height + gap instead of overflowing.
  const topMargin    = 150
  const bottomMargin = 70
  const avail        = Math.max(140, h - topMargin - bottomMargin)
  const gap          = n > 6 ? 12 : 18
  let buttonHeight   = (avail - (n - 1) * gap) / n
  buttonHeight       = clamp(buttonHeight, 46, 92)
  const totalHeight  = n * buttonHeight + (n - 1) * gap
  const startX       = w / 2 - menuWidth / 2
  const startY       = topMargin + Math.max(0, (avail - totalHeight) / 2)

  return labels.map((label, index) => ({
    id:       label.id       || String(index),
    label:    label.label    || String(label),
    subLabel: label.subLabel || "",
    locked:   !!label.locked,            // carried through for greyed/disabled rendering
    lockNote: label.lockNote || "",
    x: startX,
    y: startY + index * (buttonHeight + gap),
    w: menuWidth,
    h: buttonHeight
  }))
}

function drawButton(ctx, rect, options = {}) {
  const { label = "", subLabel = "", active = false, accent = "#8fb3ff" } = options

  const fill   = active ? "rgba(82, 119, 230, 0.34)" : "rgba(255,255,255,0.08)"
  const stroke = active ? "#dbe8ff" : "rgba(255,255,255,0.18)"

  ctx.save()
  drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, { radius: 22, fill, stroke, lineWidth: active ? 3 : 2 })

  if (active) {
    ctx.shadowBlur  = 26
    ctx.shadowColor = accent
    ctx.strokeStyle = accent
    ctx.lineWidth   = 1
    strokeRoundRect(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 18)
    ctx.shadowBlur  = 0
  }

  // Scale text to the row height so labels never clip on a compact menu.
  const labelSize = Math.round(clamp(rect.h * 0.34, 16, 26))
  const subSize   = Math.round(clamp(rect.h * 0.18, 11, 15))
  const showSub   = subLabel && rect.h >= 58
  const labelY    = showSub ? rect.y + rect.h * 0.40 : rect.y + rect.h * 0.52
  drawCenteredText(ctx, label, rect.x + rect.w / 2, labelY, {
    font: `700 ${labelSize}px Arial`,
    fill: "#ffffff"
  })
  if (showSub) {
    drawSubText(ctx, subLabel, rect.x + rect.w / 2, rect.y + rect.h * 0.74, {
      font: `${subSize}px Arial`,
      fill: "rgba(220,230,255,0.76)"
    })
  }
  ctx.restore()
}

function drawHeader(ctx, canvas, title, subtitle = "") {
  const { width: w } = getCanvasSize(canvas)
  drawCenteredText(ctx, title, w / 2, 72, {
    font: "800 40px Arial", fill: "#f3f7ff",
    shadowBlur: 22, shadowColor: "rgba(120,170,255,0.35)"
  })
  if (subtitle) {
    drawSubText(ctx, subtitle, w / 2, 112, { font: "18px Arial", fill: "rgba(220,230,255,0.78)" })
  }
}

function drawFooterHint(ctx, canvas, text) {
  const { width: w, height: h } = getCanvasSize(canvas)
  drawSubText(ctx, text, w / 2, h - 34, { font: "15px Arial", fill: "rgba(220,230,255,0.78)" })
}

// ─────────────────────────────────────────────
// MENU LAYOUT EXPORTS
// ─────────────────────────────────────────────
export function getStartMenuRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "play", label: "PLAY", subLabel: "Enter the multiverse" }
  ])
}

export function getGameplaySelectRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "training", label: "TRAINING",  subLabel: "1 player practice mode"      },
    { id: "vs",       label: "VS MATCH",  subLabel: "1 player vs the CPU"         },
    { id: "pvp",      label: "2 PLAYER",  subLabel: "Local versus — P1 vs P2"     },
    { id: "tower",    label: "TOWER",     subLabel: "Climb a ladder of CPU fights" },
    { id: "back",     label: "BACK",      subLabel: "Return to title"             }
  ])
}

// TOWER TIER SELECT — 5 tiers by floor count (labels mirror game.js TOWER_TIERS ids).
export function getTowerSelectRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "tier1", label: "TIER 1", subLabel: "3 opponents"                       },
    { id: "tier2", label: "TIER 2", subLabel: "10 opponents"                      },
    { id: "tier3", label: "TIER 3", subLabel: "25 opponents"                      },
    { id: "tier4", label: "TIER 4", subLabel: "40 opponents"                      },
    { id: "tier5", label: "TIER 5", subLabel: "INFINITE — difficulty escalates"   },
    { id: "back",  label: "BACK",   subLabel: "Return to mode select"             }
  ])
}

export function getAIDifficultyRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "easy",       label: "EASY",       subLabel: "Low pressure, simple AI"    },
    { id: "adaptive",   label: "ADAPTIVE",   subLabel: "Learns and responds"        },
    { id: "impossible", label: "IMPOSSIBLE", subLabel: "Aggressive and relentless"  },
    { id: "back",       label: "BACK",       subLabel: "Return to mode select"      }
  ])
}

export function getUniverseCardRects(canvas, universes = []) {
  universes = normalizeToArray(universes)
  return getGridLayout(universes.length, canvas, { cols: 3, cardW: 300, cardH: 110, gap: 24, startY: 150 })
}

export function getCharacterCardRects(canvas, roster = []) {
  roster = normalizeToArray(roster)
  return getGridLayout(roster.length, canvas, { cols: 4, cardW: 220, cardH: 110, gap: 18, startY: 148 })
}

export function getStageCardRects(canvas, stages = []) {
  stages = normalizeToArray(stages)
  return getGridLayout(stages.length, canvas, { cols: 3, cardW: 310, cardH: 120, gap: 24, startY: 160 })
}

// ─────────────────────────────────────────────
// START SCREEN
// ─────────────────────────────────────────────
export function drawStartScreen(ctx, canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx   = w / 2
  const cy   = h / 2
  const time = performance.now() * 0.001

  ctx.clearRect(0, 0, w, h)

  if (startScreenImage.complete && startScreenImage.naturalWidth > 0) {
    ctx.drawImage(startScreenImage, 0, 0, w, h)
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, "#030814")
    bgGrad.addColorStop(0.45, "#061225")
    bgGrad.addColorStop(1, "#0b1630")
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.fillStyle = "rgba(0,0,0,0.34)"
  ctx.fillRect(0, 0, w, h)

  const pulse = 0.92 + Math.sin(time * 2.2) * 0.08

  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"

  ctx.shadowBlur  = 28
  ctx.shadowColor = "rgba(120,180,255,0.45)"
  ctx.fillStyle   = "#eef4ff"
  ctx.font        = `900 ${Math.floor(Math.max(54, w * 0.046))}px Arial`
  ctx.fillText("MULTIVERSE SMASH", cx, cy - 96)

  ctx.shadowBlur  = 16
  ctx.shadowColor = "rgba(255,190,225,0.35)"
  ctx.strokeStyle = "rgba(255,210,235,0.22)"
  ctx.lineWidth   = 2
  ctx.strokeText("MULTIVERSE SMASH", cx, cy - 96)

  ctx.shadowBlur  = 16
  ctx.shadowColor = "rgba(110,140,255,0.35)"
  ctx.fillStyle   = "#dfe8ff"
  ctx.font        = `700 ${Math.floor(Math.max(26, w * 0.018))}px Arial`
  ctx.fillText("ULTIMATE", cx, cy - 30)
  ctx.restore()

  drawSubText(ctx, "A collision of worlds begins here", cx, cy + 28, {
    font: `${Math.floor(Math.max(14, w * 0.0105))}px Arial`,
    fill: "rgba(220,230,255,0.85)"
  })

  const [playButton] = getStartMenuRects(canvas)
  drawButton(ctx, playButton, {
    label: "PLAY", subLabel: "Enter the multiverse",
    active: true,
    accent: `rgba(255, 180, 220, ${0.18 + (pulse - 0.9) * 0.8})`
  })

  drawFooterHint(ctx, canvas, "Click PLAY to continue")
}

// ─────────────────────────────────────────────
// START INFO PANEL
// Cycling fighter spotlight + control legends shown on the title screen.
// data = { fighters: [{name,universe,type,hp,speed,hint}], p1Controls }
// ─────────────────────────────────────────────
function drawControlList(ctx, x, y, w, h, title, accent, rows) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.78)", stroke: accent, lineWidth: 2, radius: 14 })
  drawCenteredText(ctx, title, x + 16, y + 26, { font: "800 15px Arial", fill: accent, align: "left", baseline: "middle" })
  ctx.save()
  ctx.font = "13px Arial"
  ctx.textBaseline = "middle"
  let ry = y + 52
  for (const [label, value] of rows) {
    ctx.textAlign = "left"
    ctx.fillStyle = "rgba(220,230,255,0.72)"
    ctx.fillText(label, x + 16, ry)
    ctx.textAlign = "right"
    ctx.fillStyle = "#ffffff"
    ctx.fillText(value, x + w - 16, ry)
    ry += 21
  }
  ctx.restore()
}

export function drawStartInfoPanel(ctx, canvas, data = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const fighters = normalizeToArray(data.fighters)
  const c = data.p1Controls || {}
  const up = (s) => String(s || "—").toUpperCase()

  // ── Fighter spotlight (left) — auto-cycles through the roster ──
  if (fighters.length) {
    const idx = Math.floor(performance.now() / 2600) % fighters.length
    const f   = fighters[idx]
    const pw  = clamp(w * 0.26, 270, 360)
    const ph  = 212
    const px  = 28
    const py  = h * 0.5 - ph * 0.5 + 30

    drawPanel(ctx, px, py, pw, ph, { fill: "rgba(8,14,30,0.78)", stroke: "rgba(130,170,255,0.5)", lineWidth: 2, radius: 16 })
    drawCenteredText(ctx, "FIGHTER SPOTLIGHT", px + 18, py + 26, { font: "800 14px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
    drawCenteredText(ctx, f.name, px + 18, py + 58, { font: "800 24px Arial", fill: "#ffffff", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `${f.universe}${f.universe && f.type ? "  •  " : ""}${f.type}`, px + 18, py + 84, { font: "13px Arial", fill: "rgba(220,230,255,0.72)", align: "left", baseline: "middle" })

    // HP + SPEED bars
    const barX = px + 18, barW = pw - 36
    const drawStat = (label, val, max, color, yy) => {
      drawCenteredText(ctx, label, barX, yy, { font: "700 12px Arial", fill: "rgba(220,230,255,0.8)", align: "left", baseline: "middle" })
      ctx.fillStyle = "rgba(255,255,255,0.12)"; fillRoundRect(ctx, barX + 64, yy - 7, barW - 64, 12, 6)
      ctx.fillStyle = color; fillRoundRect(ctx, barX + 64, yy - 7, (barW - 64) * clamp(val / max, 0, 1), 12, 6)
      drawCenteredText(ctx, String(val), barX + barW, yy - 22, { font: "700 12px Arial", fill: "#fff", align: "right", baseline: "middle" })
    }
    drawStat("HEALTH", f.hp, 1500, "#ff7a7a", py + 122)
    drawStat("SPEED", f.speed, 12, "#7fe0ff", py + 152)
    if (f.hint) drawCenteredText(ctx, `★ ${f.hint}`, px + 18, py + 184, { font: "italic 13px Arial", fill: "rgba(255,220,150,0.9)", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `${idx + 1}/${fighters.length}`, px + pw - 16, py + 26, { font: "700 12px Arial", fill: "rgba(220,230,255,0.5)", align: "right", baseline: "middle" })
  }

  // ── Control legends (right) — P1 keyboard + P2 controller ──
  const cw = clamp(w * 0.24, 250, 320)
  const cx = w - cw - 28
  const kbRows = [
    ["Move",          `${up(c.left)} / ${up(c.right)}`],
    ["Jump / Up",     up(c.up)],
    ["Crouch / Block",up(c.down)],
    ["Light",         up(c.light)],
    ["Heavy",         up(c.heavy)],
    ["Special",       up(c.special)],
    ["Ultimate",      up(c.ultimate)],
    ["Dash",          up(c.dash)],
    ["Grab",          up(c.grab)]
  ]
  const padRows = [
    ["Move / Jump", "L-Stick / D-Pad"],
    ["Light",       "✕ (Cross)"],
    ["Heavy",       "□ (Square)"],
    ["Special",     "△ (Triangle)"],
    ["Dash",        "○ (Circle)"],
    ["Ultimate",    "L2 / R2"],
    ["Grab",        "L1"],
    ["Omnitrix",    "R1  (+ ← / →)"]
  ]
  const kbH = 52 + kbRows.length * 21 + 10
  const padH = 52 + padRows.length * 21 + 10
  const totalH = kbH + padH + 14
  let cy = clamp(h * 0.5 - totalH * 0.5 + 30, 90, h - totalH - 20)
  drawControlList(ctx, cx, cy, cw, kbH, "PLAYER 1 — KEYBOARD", "#7fd3ff", kbRows)
  drawControlList(ctx, cx, cy + kbH + 14, cw, padH, "PLAYER 2 — CONTROLLER", "#ff9f9f", padRows)
  drawCenteredText(ctx, "Toggle keyboard/controller in SETTINGS", cx + cw / 2, cy + totalH + 6, { font: "12px Arial", fill: "rgba(220,230,255,0.6)" })
}

// ─────────────────────────────────────────────
// BEN 10 — OMNITRIX LOADOUT SELECT (pick 5 aliens)
// ─────────────────────────────────────────────
function alienCardMetrics(canvas) {
  const { width: w } = getCanvasSize(canvas)
  const gap   = 12
  const cols  = 7
  const cardW = clamp((Math.min(w, 1280) * 0.92 - (cols - 1) * gap) / cols, 96, 168)
  const cardH = 58
  return { gap, cols, cardW, cardH, startY: 168 }
}

export function getAlienSelectCardRects(canvas, aliens = []) {
  aliens = normalizeToArray(aliens)
  const { gap, cols, cardW, cardH, startY } = alienCardMetrics(canvas)
  return getGridLayout(aliens.length, canvas, { cols, cardW, cardH, gap, startY })
}

export function getAlienSelectButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const bw = 200, bh = 56, gap = 24
  const y = h - bh - 28
  return [
    { id: "back",    label: "BACK",    x: w / 2 - bw - gap / 2, y, w: bw, h: bh },
    { id: "confirm", label: "CONFIRM", x: w / 2 + gap / 2,      y, w: bw, h: bh }
  ]
}

export function drawAlienSelectScreen(ctx, canvas, options = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const aliens = normalizeToArray(options.aliens)
  const draft  = normalizeToArray(options.draft)
  const player = options.player || 1

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0a1810", "#16241a")
  drawHeader(ctx, canvas, `PLAYER ${player} — OMNITRIX LOADOUT`, `Pick 5 aliens for Ben 10  (${draft.length}/5)`)

  const rects = getAlienSelectCardRects(canvas, aliens)
  aliens.forEach((a, i) => {
    const r = rects[i]
    if (!r) return
    const slot = draft.indexOf(a.key)
    const picked = slot >= 0
    drawPanel(ctx, r.x, r.y, r.w, r.h, {
      fill: picked ? "rgba(34,197,94,0.28)" : "rgba(255,255,255,0.06)",
      stroke: picked ? "#22c55e" : "rgba(255,255,255,0.14)",
      lineWidth: picked ? 3 : 2, radius: 10
    })
    // colour swatch
    ctx.fillStyle = a.color || "#888"
    fillRoundRect(ctx, r.x + 8, r.y + r.h / 2 - 9, 18, 18, 5)
    drawCenteredText(ctx, a.name, r.x + 34, r.y + r.h / 2, {
      font: "700 13px Arial", fill: "#fff", align: "left", baseline: "middle"
    })
    if (picked) {
      ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(r.x + r.w - 16, r.y + 16, 11, 0, Math.PI * 2); ctx.fill()
      drawCenteredText(ctx, String(slot + 1), r.x + r.w - 16, r.y + 16, { font: "800 13px Arial", fill: "#bbf7d0" })
    }
  })

  // buttons
  const buttons = getAlienSelectButtons(canvas)
  for (const b of buttons) {
    const enabled = b.id !== "confirm" || draft.length === 5
    drawButton(ctx, b, { label: b.label, active: enabled, accent: enabled ? "#86efac" : "#555" })
    if (!enabled) {
      ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = "#000"
      fillRoundRect(ctx, b.x, b.y, b.w, b.h, 22); ctx.restore()
    }
  }
  drawFooterHint(ctx, canvas, "Click aliens to add/remove • each alien has its own moveset • switch in-fight with Charge + ← / →")
}

// ─────────────────────────────────────────────
// MAIN MENU (after pressing PLAY on the title)
// ─────────────────────────────────────────────
export function getMainMenuRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "play",     label: "PLAY",      subLabel: "Training • VS CPU • 2 Player • Tower" },
    // ONLINE is locked until the dev code is entered (Task 5/6). isDevUnlocked()
    // flips it selectable (leads to a placeholder screen — no netcode yet).
    { id: "online",   label: "ONLINE",    subLabel: isDevUnlocked() ? "Dev-unlocked (placeholder)" : "Coming soon — online play", locked: !isDevUnlocked(), lockNote: "Online play is coming soon" },
    { id: "devcode",  label: "DEV CODE",  subLabel: isDevUnlocked() ? "✓ Everything unlocked (session only)" : "Enter unlock code" },
    { id: "moveList", label: "MOVE LIST", subLabel: "Fighters, moves, combos & controls"  },
    { id: "tutorial", label: "HOW TO PLAY", subLabel: "Controls & mechanics walkthrough"  },
    { id: "account",  label: "ACCOUNT",   subLabel: "Create / switch local profile"       },
    // SAVE FILE (File System Access API). Loads/creates a local game_player_data.json so
    // progress persists; subLabel reflects live status (or that the browser can't do it).
    { id: "savefile", label: "SAVE FILE", subLabel: isFileApiSupported() ? saveFileStatus() : "Not supported here — progress stays in-memory" },
    { id: "settings", label: "SETTINGS",  subLabel: "Keyboard / controller setup"         },
    { id: "back",     label: "BACK",      subLabel: "Return to title"                     }
  ])
}

export function drawMainMenuScreen(ctx, canvas, hoverIndex = 0, account = null) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#08111f", "#182845")
  drawHeader(ctx, canvas, "MAIN MENU", "Where do you want to go?")

  // Logged-in-as banner (top-right) so the current account is always visible.
  const { width: w } = getCanvasSize(canvas)
  const label = account ? `Logged in as ${account.username}` : "Not logged in"
  ctx.save(); ctx.font = "700 14px Arial"; ctx.textBaseline = "middle"
  const bw = ctx.measureText(label).width + 28
  drawPanel(ctx, w - bw - 24, 24, bw, 34, { fill: "rgba(8,14,30,0.8)", stroke: account ? "#86efac" : "rgba(255,255,255,0.18)", lineWidth: 1.5, radius: 10 })
  ctx.fillStyle = account ? "#bbf7d0" : "rgba(220,230,255,0.7)"
  ctx.textAlign = "center"; ctx.fillText(label, w - bw / 2 - 24, 41)
  ctx.restore()

  const rects = getMainMenuRects(canvas)
  rects.forEach((r, i) => {
    drawButton(ctx, r, { label: r.label, subLabel: r.subLabel, active: i === hoverIndex && !r.locked })
    if (r.locked) {
      // LOCKED placeholder (e.g. ONLINE): grey wash + a single lock pill on the
      // right, vertically centered so it never collides with the label/sub.
      ctx.save()
      ctx.fillStyle = "rgba(8,12,24,0.55)"; roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill()
      const pillW = 96, pillH = 26, px = r.x + r.w - pillW - 16, py = r.y + r.h / 2 - pillH / 2
      ctx.fillStyle = "rgba(30,41,59,0.95)"; roundRect(ctx, px, py, pillW, pillH, 13); ctx.fill()
      ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.lineWidth = 1; roundRect(ctx, px, py, pillW, pillH, 13); ctx.stroke()
      ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.font = "600 13px Arial"; ctx.fillText("🔒 Locked", px + pillW / 2, py + pillH / 2 + 1)
      ctx.restore()
    }
  })
  drawFooterHint(ctx, canvas, "Tip: new here? Open HOW TO PLAY for the controls and core mechanics")
}

// ─────────────────────────────────────────────
// MOVE LIST / KIT BROWSER
// opts = { fighters:[{key,name,universe}], selectedIndex, kit, showControls, controlRef }
// ─────────────────────────────────────────────
function moveListLayout(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const top    = 116
  const listX  = 24
  const listCols = 2
  const listGap  = 8
  const listW  = clamp(w * 0.30, 300, 430)
  const colW   = (listW - listGap * (listCols - 1)) / listCols
  const rowH   = 30
  const panelX = listX + listW + 24
  const panelW = w - panelX - 24
  return { w, h, top, listX, listW, listCols, listGap, colW, rowH, panelX, panelW }
}

export function getMoveListCardRects(canvas, count) {
  const L = moveListLayout(canvas)
  const rows = Math.ceil(count / L.listCols)
  const rects = []
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / rows)   // fill column-by-column (alphabetical-ish down each column)
    const row = i % rows
    rects.push({
      x: L.listX + col * (L.colW + L.listGap),
      y: L.top + row * (L.rowH + 4),
      w: L.colW, h: L.rowH
    })
  }
  return rects
}

export function getMoveListButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  return [
    { id: "back",     label: "BACK",     x: 24,        y: h - 64, w: 150, h: 44 },
    { id: "controls", label: "CONTROLS", x: w - 24 - 200, y: h - 64, w: 200, h: 44 }
  ]
}

function drawKitPanel(ctx, x, y, w, h, kit) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.8)", stroke: "rgba(130,170,255,0.4)", lineWidth: 2, radius: 14 })
  if (!kit) { drawCenteredText(ctx, "Select a fighter", x + w / 2, y + h / 2, { font: "18px Arial", fill: "rgba(220,230,255,0.6)" }); return }

  const pad = 18
  let cy = y + 26
  const left = x + pad
  const colR = x + w - pad

  drawCenteredText(ctx, kit.name || "", left, cy, { font: "800 22px Arial", fill: "#fff", align: "left", baseline: "middle" })
  drawCenteredText(ctx, kit.difficulty || "", colR, cy, { font: "700 13px Arial", fill: "#ffd27f", align: "right", baseline: "middle" })
  cy += 22
  drawCenteredText(ctx, `${kit.type || ""}   •   Energy: ${kit.energy || "—"}`, left, cy, { font: "13px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
  cy += 20
  // summary (wrapped)
  cy = wrapText(ctx, kit.summary || "", left, cy, w - pad * 2, 16, { font: "13px Arial", fill: "rgba(220,230,255,0.8)" })
  cy += 4

  const section = (title) => {
    cy += 8
    drawCenteredText(ctx, title, left, cy, { font: "800 13px Arial", fill: "#7fd3ff", align: "left", baseline: "middle" })
    cy += 16
  }
  const row = (a, b, c) => {
    ctx.save(); ctx.textBaseline = "middle"; ctx.font = "12px Arial"
    ctx.textAlign = "left";  ctx.fillStyle = "#fff";                 ctx.fillText(a, left, cy)
    ctx.textAlign = "left";  ctx.fillStyle = "rgba(150,200,255,0.95)"; ctx.fillText(b, left + 150, cy)
    if (c != null) { ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,210,140,0.9)"; ctx.fillText(c, colR, cy) }
    ctx.restore(); cy += 16
  }

  if (kit.passive) { section("PASSIVE"); row(kit.passive.name, "", ""); cy -= 16
    cy = wrapText(ctx, kit.passive.effect || "", left + 150, cy, w - pad * 2 - 150, 14, { font: "italic 11px Arial", fill: "rgba(220,230,255,0.7)" }); cy += 2 }

  section("SPECIALS  (cost)")
  for (const s of kit.specials || []) row(s.name, s.input, s.cost ? `${s.cost} CE` : "free")
  if (kit.mobility) { row(kit.mobility.name, kit.mobility.input, kit.mobility.cost ? `${kit.mobility.cost} CE` : "free") }
  if (kit.ultimate) { row(kit.ultimate.name, kit.ultimate.input, kit.ultimate.cost ? `${kit.ultimate.cost} CE` : "free") }

  section("COMBOS")
  for (const c of kit.combos || []) {
    drawCenteredText(ctx, `${c.name}:`, left, cy, { font: "700 12px Arial", fill: "#ffd27f", align: "left", baseline: "middle" })
    drawCenteredText(ctx, c.sequence, left + 130, cy, { font: "12px Arial", fill: "#cfe0ff", align: "left", baseline: "middle" })
    cy += 16
  }

  section("BASIC ATTACKS  (no energy)")
  for (const b of kit.basics || []) row(b.name, b.input, "")
}

function drawControlsPanel(ctx, x, y, w, h, ref) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.8)", stroke: "rgba(130,170,255,0.4)", lineWidth: 2, radius: 14 })
  if (!ref) return
  const pad = 18
  const colW = (w - pad * 2 - 24) / 3
  const cols = [
    { title: "PLAYER 1 — KEYBOARD", rows: ref.keyboardP1, accent: "#7fd3ff" },
    { title: "PLAYER 2 — KEYBOARD", rows: ref.keyboardP2, accent: "#ffd27f" },
    { title: "CONTROLLER",          rows: ref.controller, accent: "#ff9f9f" }
  ]
  cols.forEach((col, ci) => {
    const cx = x + pad + ci * (colW + 12)
    let cy = y + 28
    drawCenteredText(ctx, col.title, cx, cy, { font: "800 13px Arial", fill: col.accent, align: "left", baseline: "middle" })
    cy += 20
    ctx.save(); ctx.font = "12px Arial"; ctx.textBaseline = "middle"
    for (const [label, key] of col.rows) {
      ctx.textAlign = "left";  ctx.fillStyle = "rgba(220,230,255,0.78)"; ctx.fillText(label, cx, cy)
      ctx.textAlign = "right"; ctx.fillStyle = "#fff";                   ctx.fillText(key, cx + colW - 8, cy)
      cy += 20
    }
    ctx.restore()
  })
  // how-to-specials footer
  let hy = y + h - 16 - (ref.howToSpecials.length * 16)
  drawCenteredText(ctx, "HOW TO PERFORM SPECIAL MOVES", x + pad, hy, { font: "800 13px Arial", fill: "#86efac", align: "left", baseline: "middle" })
  hy += 18
  for (const line of ref.howToSpecials) {
    drawCenteredText(ctx, "• " + line, x + pad, hy, { font: "12px Arial", fill: "rgba(220,230,255,0.82)", align: "left", baseline: "middle" })
    hy += 16
  }
}

export function drawMoveListScreen(ctx, canvas, opts = {}) {
  const L = moveListLayout(canvas)
  const fighters = normalizeToArray(opts.fighters)
  const selectedIndex = opts.selectedIndex ?? 0

  ctx.clearRect(0, 0, L.w, L.h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2240")
  drawHeader(ctx, canvas, "MOVE LIST", opts.showControls ? "Controls & how to perform specials" : "Pick a fighter to see their kit")

  // left list
  const rects = getMoveListCardRects(canvas, fighters.length)
  fighters.forEach((f, i) => {
    const r = rects[i]
    const sel = i === selectedIndex
    drawPanel(ctx, r.x, r.y, r.w, r.h, {
      fill: sel ? "rgba(70,110,210,0.4)" : "rgba(255,255,255,0.05)",
      stroke: sel ? "#dbe7ff" : "rgba(255,255,255,0.12)", lineWidth: sel ? 2 : 1, radius: 8
    })
    drawCenteredText(ctx, f.name, r.x + 12, r.y + r.h / 2, { font: sel ? "700 13px Arial" : "13px Arial", fill: sel ? "#fff" : "rgba(220,230,255,0.85)", align: "left", baseline: "middle" })
  })

  // right panel
  const panelY = L.top
  const panelH = L.h - panelY - 80
  if (opts.showControls) drawControlsPanel(ctx, L.panelX, panelY, L.panelW, panelH, opts.controlRef)
  else                   drawKitPanel(ctx, L.panelX, panelY, L.panelW, panelH, opts.kit)

  // buttons
  for (const b of getMoveListButtons(canvas)) {
    const active = b.id === "controls" ? !!opts.showControls : false
    drawButton(ctx, b, { label: b.id === "controls" && opts.showControls ? "MOVES" : b.label, active })
  }
}

// Simple word-wrap helper — returns the new y after drawing.
function wrapText(ctx, text, x, y, maxW, lineH, style = {}) {
  ctx.save()
  ctx.font = style.font || "13px Arial"; ctx.fillStyle = style.fill || "#fff"
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  const words = String(text).split(/\s+/)
  let line = ""
  for (const word of words) {
    const test = line ? line + " " + word : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = word
    } else line = test
  }
  if (line) { ctx.fillText(line, x, y); y += lineH }
  ctx.restore()
  return y
}

// ─────────────────────────────────────────────
// GAMEPLAY SELECT
// ─────────────────────────────────────────────
export function drawGameplaySelectScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#08111f", "#182845")
  drawHeader(ctx, canvas, "GAMEPLAY SELECT", "Choose how you want to play")
  getGameplaySelectRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Training = 1 player practice • VS Match = player vs CPU")
}

// ─────────────────────────────────────────────
// TOWER TIER SELECT
// ─────────────────────────────────────────────
export function drawTowerSelectScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#2a1c3d")
  drawHeader(ctx, canvas, "TOWER", "Pick a tier — beat every floor to clear it")
  getTowerSelectRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Random opponent + stage each floor • Tier 5 never ends — how high can you climb?")
}

// ─────────────────────────────────────────────
// AI DIFFICULTY SELECT
// ─────────────────────────────────────────────
export function drawAIDifficultyScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0c0d1e", "#231c3d")
  drawHeader(ctx, canvas, "AI DIFFICULTY", "Pick your opponent level")
  getAIDifficultyRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Easy • Adaptive • Impossible")
}

// ─────────────────────────────────────────────
// UNIVERSE SELECT
// ─────────────────────────────────────────────
export function drawUniverseSelectScreen(ctx, canvas, universes = [], selectedIndex = 0) {
  const { width: w, height: h } = getCanvasSize(canvas)
  universes = normalizeToArray(universes)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#171f37")
  drawHeader(ctx, canvas, "UNIVERSE SELECT", "Choose a universe")

  if (!universes.length) {
    drawSubText(ctx, "No universes available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  const rects = getUniverseCardRects(canvas, universes)
  universes.forEach((universe, i) => {
    const rect       = rects[i]
    const isSelected = i === selectedIndex
    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill:      isSelected ? "rgba(58, 79, 149, 0.65)" : "rgba(255,255,255,0.08)",
      stroke:    isSelected ? "#e8efff" : "rgba(255,255,255,0.16)",
      lineWidth: isSelected ? 3 : 2
    })
    drawCenteredText(ctx, universe?.name || universe?.id || universe?.label || `Universe ${i + 1}`,
      rect.x + rect.w / 2, rect.y + 58, { font: "700 24px Arial", fill: "#ffffff" })
  })

  drawFooterHint(ctx, canvas, "Choose the universe for the current fighter")
}

// ─────────────────────────────────────────────
// CHARACTER SELECT
// ─────────────────────────────────────────────
export function drawCharacterSelectScreen(ctx, canvas, options = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const roster        = normalizeToArray(options.roster)
  const selectedIndex = options.selectedIndex ?? 0
  const p1Selected    = options.p1Selected    ?? null
  const p2Selected    = options.p2Selected    ?? null
  const currentPlayer = options.currentPlayer ?? 1
  const title         = options.title         || "CHARACTER SELECT"

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2240")
  drawHeader(ctx, canvas, title, `Player ${currentPlayer} choose your fighter`)

  if (!roster.length) {
    drawSubText(ctx, "No fighters available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  const rects = getCharacterCardRects(canvas, roster)
  roster.forEach((fighter, i) => {
    const rect      = rects[i]
    const isCursor  = i === selectedIndex
    const fighterId = fighter?.id || fighter?.key || fighter?.name || String(i)
    const isP1 = p1Selected === fighterId || p1Selected === i
    const isP2 = p2Selected === fighterId || p2Selected === i

    let fill   = "rgba(255,255,255,0.07)"
    let stroke = "rgba(255,255,255,0.14)"

    if (isCursor)       { fill = "rgba(70,110,210,0.35)";  stroke = "#dbe7ff" }
    if (isP1 && isP2)   { fill = "rgba(180,120,255,0.35)"; stroke = "#d7b8ff" }
    else if (isP1)      { fill = "rgba(70,190,255,0.28)";  stroke = "#7fd3ff" }
    else if (isP2)      { fill = "rgba(255,110,110,0.28)"; stroke = "#ff9f9f" }

    // Portrait fill behind the panel (cover-fit, clipped to the card). Falls back
    // to the plain box below when the image isn't loaded/decoded or 404s.
    const portrait = getPortraitImage(fighter?.rosterKey || fighter?.id || fighter?.key)
    const hasPortrait = _imageReady(portrait)
    if (hasPortrait) {
      ctx.save()
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18)
      ctx.clip()
      _coverDrawImage(ctx, portrait, rect.x, rect.y, rect.w, rect.h)
      // Legibility scrim — darker top (name) and bottom (universe), portrait
      // stays visible through the middle.
      const scrim = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      scrim.addColorStop(0,    "rgba(8,12,26,0.55)")
      scrim.addColorStop(0.45, "rgba(8,12,26,0.18)")
      scrim.addColorStop(1,    "rgba(8,12,26,0.62)")
      ctx.fillStyle = scrim
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      ctx.restore()
    }

    // Panel: when a portrait shows, only the selection TINT + border go on top
    // (a transparent base fill so the art isn't washed out); otherwise the
    // original opaque box renders exactly as before.
    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: hasPortrait && fill === "rgba(255,255,255,0.07)" ? "rgba(0,0,0,0)" : fill,
      stroke, lineWidth: 2
    })

    const fighterName = fighter?.name || fighter?.id || fighter?.displayName || fighter?.label || `Fighter ${i + 1}`
    const universe    = fighter?.universe || fighter?.series || fighter?.origin || ""

    drawCenteredText(ctx, fighterName, rect.x + rect.w / 2, rect.y + 38, {
      font: "700 20px Arial", fill: "#ffffff",
      shadowBlur: hasPortrait ? 4 : 0, shadowColor: "rgba(0,0,0,0.85)"
    })
    if (universe) {
      drawSubText(ctx, universe, rect.x + rect.w / 2, rect.y + 68, { font: "13px Arial", fill: "rgba(220,230,255,0.72)" })
    }
    if (isP1) drawCenteredText(ctx, "P1", rect.x + 18,          rect.y + 16, { font: "700 12px Arial", fill: "#7fd3ff", align: "left",  baseline: "alphabetic" })
    if (isP2) drawCenteredText(ctx, "P2", rect.x + rect.w - 18, rect.y + 16, { font: "700 12px Arial", fill: "#ff9f9f", align: "right", baseline: "alphabetic" })
  })

  drawFooterHint(ctx, canvas, "Click a fighter card to lock in")
}

// ─────────────────────────────────────────────
// STAGE SELECT
// ─────────────────────────────────────────────
export function drawStageSelectScreen(ctx, canvas, stages = [], selectedIndex = 0) {
  const { width: w, height: h } = getCanvasSize(canvas)
  stages = normalizeToArray(stages)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2742")
  drawHeader(ctx, canvas, "STAGE SELECT", "Choose where the battle begins")

  if (!stages.length) {
    drawSubText(ctx, "No stages available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  const rects = getStageCardRects(canvas, stages)
  stages.forEach((stage, i) => {
    const rect       = rects[i]
    const isSelected = i === selectedIndex
    const bgImage    = getStageBackgroundImage(stage)

    ctx.save()
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20)
    ctx.clip()

    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, rect.x, rect.y, rect.w, rect.h)
      const overlay = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      overlay.addColorStop(0, "rgba(0,0,0,0.08)")
      overlay.addColorStop(0.62, "rgba(0,0,0,0.18)")
      overlay.addColorStop(1, "rgba(0,0,0,0.34)")
      ctx.fillStyle = overlay
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    } else {
      const preview = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      preview.addColorStop(0, stage?.sky   || "#6ea8ff")
      preview.addColorStop(0.62, stage?.mid || "#5d7bd8")
      preview.addColorStop(1, stage?.floor  || "#3d465c")
      ctx.fillStyle = preview
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }

    ctx.fillStyle = "rgba(0,0,0,0.16)"
    ctx.fillRect(rect.x, rect.y + rect.h * 0.64, rect.w, rect.h * 0.36)
    ctx.fillStyle = stage?.accent || "rgba(255,255,255,0.22)"
    ctx.fillRect(rect.x, rect.y + rect.h * 0.62, rect.w, 4)
    ctx.restore()

    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: "rgba(0,0,0,0)", stroke: isSelected ? "#e8efff" : "rgba(255,255,255,0.18)", lineWidth: isSelected ? 3 : 2
    })

    drawCenteredText(ctx, stage?.name || stage?.id || `Stage ${i + 1}`,
      rect.x + rect.w / 2, rect.y + rect.h - 28, { font: "700 18px Arial", fill: "#ffffff" })
  })

  drawFooterHint(ctx, canvas, "Click a stage card to begin the match")
}

// ─────────────────────────────────────────────
// BATTLE BACKGROUND
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// PROCEDURAL STAGE LANDMARKS
// Distinct, series-recognizable skylines drawn behind the fighters. Keyed by
// stage.landmark. Sits above groundY (the floor covers their base). Returns
// true when it drew a custom landmark, false to use the generic mountains.
// Window/light patterns are deterministic (no per-frame flicker).
// ─────────────────────────────────────────────
function _litWindows(ctx, x, y, w, h, cols, rows, color, seed = 1) {
  const cw = w / cols, ch = h / rows
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    if (((c * 7 + r * 13 + seed * 5) % 5) < 2) continue
    ctx.fillStyle = color
    ctx.fillRect(x + c * cw + cw * 0.2, y + r * ch + ch * 0.2, cw * 0.55, ch * 0.5)
  }
}

function drawStageLandmarks(ctx, stage, worldWidth, groundY, h, accent) {
  const id = stage?.landmark
  if (!id) return false
  const t = performance.now() * 0.001
  ctx.save()

  switch (id) {
    case "jujutsu_high": {
      // Rolling hills + a Japanese school hall with a sloped tiled roof + sakura.
      ctx.fillStyle = "rgba(40,80,55,0.5)"
      ctx.beginPath(); ctx.moveTo(0, groundY)
      for (let x = 0; x <= worldWidth; x += worldWidth / 6) ctx.lineTo(x, groundY - 120 - Math.sin(x * 0.002) * 50)
      ctx.lineTo(worldWidth, groundY); ctx.closePath(); ctx.fill()
      const bx = worldWidth * 0.4, bw = worldWidth * 0.2, by = groundY - 200
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(bx, by, bw, 200)
      ctx.fillStyle = "#475569"; ctx.beginPath()
      ctx.moveTo(bx - 24, by); ctx.lineTo(bx + bw / 2, by - 60); ctx.lineTo(bx + bw + 24, by); ctx.closePath(); ctx.fill()
      _litWindows(ctx, bx, by + 20, bw, 160, 8, 4, "rgba(120,170,255,0.5)", 2)
      for (const sx of [worldWidth * 0.12, worldWidth * 0.7, worldWidth * 0.88]) {
        ctx.fillStyle = "#5b3a29"; ctx.fillRect(sx, groundY - 90, 10, 90)
        ctx.fillStyle = "rgba(249,168,212,0.8)"
        ctx.beginPath(); ctx.arc(sx + 5, groundY - 100, 34, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case "shibuya": {
      // Night skyscrapers + a giant neon billboard + crossing glow.
      const cols = 9
      for (let i = 0; i < cols; i++) {
        const bw = worldWidth / cols, bx = i * bw
        const bh = 180 + ((i * 53) % 160)
        ctx.fillStyle = i % 2 ? "#0a0f1f" : "#11182b"
        ctx.fillRect(bx + 6, groundY - bh, bw - 12, bh)
        _litWindows(ctx, bx + 6, groundY - bh, bw - 12, bh, 5, Math.floor(bh / 26), "rgba(255,210,120,0.45)", i)
      }
      const sx = worldWidth * 0.55, sy = groundY - 320
      ctx.fillStyle = "#020308"; ctx.fillRect(sx, sy, 220, 130)
      const glow = ctx.createLinearGradient(sx, sy, sx + 220, sy + 130)
      glow.addColorStop(0, "#ef4444"); glow.addColorStop(0.5, "#a855f7"); glow.addColorStop(1, "#3b82f6")
      ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.2; ctx.fillStyle = glow
      ctx.fillRect(sx + 8, sy + 8, 204, 114); ctx.globalAlpha = 1
      ctx.fillStyle = "rgba(120,180,255,0.10)"; ctx.fillRect(0, groundY - 24, worldWidth, 24)
      break
    }
    case "hidden_leaf": {
      // Hokage Rock cliff with carved faces on the left + village rooftops.
      const cw = worldWidth * 0.34
      ctx.fillStyle = "#6b4f2a"; ctx.fillRect(0, groundY - 300, cw, 300)
      ctx.fillStyle = "#7c5a30"
      ctx.beginPath(); ctx.moveTo(cw, groundY - 300); ctx.lineTo(cw + 90, groundY - 230); ctx.lineTo(cw + 60, groundY); ctx.lineTo(cw, groundY); ctx.closePath(); ctx.fill()
      for (let f = 0; f < 4; f++) {
        const fx = 30 + f * (cw - 60) / 4
        ctx.fillStyle = "rgba(40,28,14,0.55)"; ctx.fillRect(fx, groundY - 250, (cw - 60) / 4 - 16, 90)
        ctx.fillStyle = "rgba(20,14,6,0.7)"
        ctx.fillRect(fx + 10, groundY - 225, 8, 8); ctx.fillRect(fx + 34, groundY - 225, 8, 8)
      }
      for (let i = 0; i < 7; i++) {
        const rx = cw + 40 + i * (worldWidth - cw) / 7
        ctx.fillStyle = "#b45309"; ctx.fillRect(rx, groundY - 70, 90, 70)
        ctx.fillStyle = "#7c2d12"; ctx.beginPath()
        ctx.moveTo(rx - 8, groundY - 70); ctx.lineTo(rx + 45, groundY - 100); ctx.lineTo(rx + 98, groundY - 70); ctx.closePath(); ctx.fill()
      }
      break
    }
    case "valley_of_end": {
      // Two colossal facing statues over a waterfall + mist.
      const wf = worldWidth * 0.5
      ctx.fillStyle = "#cbd5e1"; ctx.globalAlpha = 0.8
      ctx.fillRect(wf - 70, groundY - 360, 140, 360); ctx.globalAlpha = 1
      const drawStatue = (sx, dir) => {
        ctx.fillStyle = "#445"
        ctx.fillRect(sx - 50 * dir, groundY - 330, 100, 330)              // body
        ctx.beginPath(); ctx.arc(sx, groundY - 350, 40, 0, Math.PI * 2); ctx.fill()  // head
        ctx.fillRect(sx, groundY - 250, 130 * dir, 28)                    // outstretched arm
      }
      drawStatue(worldWidth * 0.16, 1)
      drawStatue(worldWidth * 0.84, -1)
      ctx.fillStyle = "rgba(226,232,240,0.18)"
      ctx.fillRect(0, groundY - 60, worldWidth, 60)
      break
    }
    case "namek": {
      // Twin suns + jagged blue-green spires and a rock arch.
      ctx.fillStyle = "rgba(254,240,138,0.7)"
      ctx.beginPath(); ctx.arc(worldWidth * 0.2, 120, 60, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(worldWidth * 0.78, 90, 40, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#0f766e"
      for (let i = 0; i < 6; i++) {
        const sx = worldWidth * (0.08 + i * 0.16)
        ctx.beginPath(); ctx.moveTo(sx, groundY); ctx.lineTo(sx + 40, groundY - 200 - (i % 3) * 60); ctx.lineTo(sx + 80, groundY); ctx.closePath(); ctx.fill()
      }
      ctx.strokeStyle = "#115e59"; ctx.lineWidth = 26
      ctx.beginPath(); ctx.arc(worldWidth * 0.5, groundY, 120, Math.PI, 0); ctx.stroke()
      break
    }
    case "tournament": {
      // Bright stadium: tiered stands with a crowd + banner flags + ring apron.
      ctx.fillStyle = "#7c5236"; ctx.fillRect(0, groundY - 150, worldWidth, 150)
      for (let tier = 0; tier < 3; tier++) {
        const ty = groundY - 150 + tier * 46
        ctx.fillStyle = tier % 2 ? "#92400e" : "#a3540f"; ctx.fillRect(0, ty, worldWidth, 42)
        for (let x = 0; x < worldWidth; x += 22) {
          ctx.fillStyle = `hsl(${(x + tier * 40) % 360}, 60%, 60%)`
          ctx.beginPath(); ctx.arc(x + 11, ty + 14, 5, 0, Math.PI * 2); ctx.fill()
        }
      }
      for (let i = 0; i <= 8; i++) {
        const fx = i * worldWidth / 8
        ctx.fillStyle = i % 2 ? "#ef4444" : "#fde68a"
        ctx.beginPath(); ctx.moveTo(fx, groundY - 170); ctx.lineTo(fx + 26, groundY - 162); ctx.lineTo(fx, groundY - 154); ctx.closePath(); ctx.fill()
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, groundY - 170); ctx.lineTo(fx, groundY - 150); ctx.stroke()
      }
      break
    }
    case "mugen_train": {
      // Full moon + a steam locomotive on rails with rising smoke.
      ctx.fillStyle = "#f1f5f9"; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.arc(worldWidth * 0.78, 110, 64, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
      const tx = worldWidth * 0.16, ty = groundY - 120
      ctx.fillStyle = "#0b0b12"; ctx.fillRect(tx, ty, worldWidth * 0.6, 90)               // carriages
      ctx.fillStyle = "#15151f"; ctx.fillRect(tx - 130, ty - 20, 150, 110)               // engine
      ctx.fillStyle = "#1f2937"; ctx.fillRect(tx - 70, ty - 60, 36, 44)                  // funnel
      ctx.fillStyle = "rgba(245,158,11,0.8)"
      for (let i = 0; i < 10; i++) ctx.fillRect(tx + 14 + i * (worldWidth * 0.6 / 10), ty + 30, 22, 26)  // windows
      ctx.fillStyle = "#334155"; ctx.fillRect(tx - 140, ty + 92, worldWidth * 0.66, 8)   // rail
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#cbd5e1"
      for (let i = 0; i < 5; i++) { const sx = tx - 50 + Math.sin(t + i) * 14; ctx.beginPath(); ctx.arc(sx, ty - 70 - i * 26, 16 + i * 5, 0, Math.PI * 2); ctx.fill() }
      ctx.globalAlpha = 1
      break
    }
    case "citadel": {
      // Sci-fi spires + swirling green portals in an alien sky.
      ctx.fillStyle = "#0b1020"
      for (let i = 0; i < 7; i++) {
        const bx = i * worldWidth / 7 + 20, bh = 200 + ((i * 71) % 180)
        ctx.fillRect(bx, groundY - bh, worldWidth / 12, bh)
        ctx.fillStyle = "rgba(57,255,20,0.35)"; ctx.fillRect(bx + 4, groundY - bh, 4, bh)
        ctx.fillStyle = "#0b1020"
      }
      for (const [px, py, pr] of [[worldWidth * 0.3, 160, 70], [worldWidth * 0.72, 220, 95]]) {
        for (let k = 4; k >= 0; k--) {
          ctx.globalAlpha = 0.18 + k * 0.12
          ctx.strokeStyle = k % 2 ? "#39ff14" : "#16a34a"; ctx.lineWidth = 6
          ctx.beginPath(); ctx.arc(px, py, pr - k * 11, t * (1 + k * 0.3) % (Math.PI * 2), Math.PI * 1.6 + t); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      break
    }
    case "null_void": {
      // Purple void: floating rock islands, a green rift glow, flickering bolts.
      const glow = ctx.createRadialGradient(worldWidth * 0.5, groundY - 200, 20, worldWidth * 0.5, groundY - 200, 360)
      glow.addColorStop(0, "rgba(34,211,238,0.4)"); glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow; ctx.fillRect(0, 0, worldWidth, groundY)
      ctx.fillStyle = "#3b1d63"
      for (const [ix, iy, iw] of [[worldWidth * 0.18, groundY - 260, 220], [worldWidth * 0.62, groundY - 320, 180], [worldWidth * 0.85, groundY - 200, 140]]) {
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + iw, iy); ctx.lineTo(ix + iw * 0.7, iy + 70); ctx.lineTo(ix + iw * 0.3, iy + 60); ctx.closePath(); ctx.fill()
        ctx.fillStyle = "#4c1d95"; ctx.fillRect(ix + iw * 0.2, iy - 16, iw * 0.6, 16); ctx.fillStyle = "#3b1d63"
      }
      if (Math.sin(t * 6) > 0.6) {
        ctx.strokeStyle = "rgba(34,211,238,0.8)"; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(worldWidth * 0.5, 40)
        ctx.lineTo(worldWidth * 0.46, groundY * 0.4); ctx.lineTo(worldWidth * 0.54, groundY * 0.55); ctx.lineTo(worldWidth * 0.48, groundY - 180); ctx.stroke()
      }
      break
    }
    case "shadow_garden": {
      // Gothic pillars in mist with drifting red rose petals.
      ctx.fillStyle = "rgba(30,20,45,0.7)"
      for (let i = 0; i < 6; i++) {
        const px = worldWidth * (0.08 + i * 0.17)
        ctx.fillRect(px, groundY - 280, 46, 280)
        ctx.fillRect(px - 12, groundY - 280, 70, 18)
        ctx.fillRect(px - 12, groundY - 30, 70, 18)
      }
      ctx.fillStyle = "rgba(124,58,237,0.12)"; ctx.fillRect(0, groundY - 120, worldWidth, 120)
      ctx.fillStyle = "rgba(239,68,68,0.7)"
      for (let i = 0; i < 14; i++) {
        const rx = (i * worldWidth / 14 + t * 30) % worldWidth
        const ry = (groundY - 260 + ((i * 80 + t * 40) % 240))
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    default:
      ctx.restore()
      return false
  }

  ctx.restore()
  return true
}

export function drawBattleBackground(ctx, canvas, stage = {}, groundY = 600, floorHeight = 120) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const parsedWorldWidth = Number(stage?.worldWidth)
  const worldWidth       = Number.isFinite(parsedWorldWidth) ? Math.max(parsedWorldWidth, w) : w

  const sky     = stage?.sky   || "#6fb5ff"
  const mid     = stage?.mid   || "#6cb27f"
  const floor   = stage?.floor || "#4d5c41"
  const accent  = stage?.accent || "#ffffff"
  const bgImage = getStageBackgroundImage(stage)

  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, sky)
  bg.addColorStop(0.62, mid)
  bg.addColorStop(1, floor)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, worldWidth, h)

  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.save()
    ctx.drawImage(bgImage, 0, 0, worldWidth, h)
    const overlay = ctx.createLinearGradient(0, 0, 0, h)
    overlay.addColorStop(0, "rgba(255,255,255,0.04)")
    overlay.addColorStop(0.55, "rgba(0,0,0,0.08)")
    overlay.addColorStop(1, "rgba(0,0,0,0.18)")
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, worldWidth, h)
    ctx.restore()
  }

  // Per-stage procedural landmarks (skyline/landmarks). Skipped when a real
  // background image is present; falls back to a generic mountain silhouette.
  const drewLandmark = (bgImage && bgImage.complete && bgImage.naturalWidth > 0)
    ? true
    : drawStageLandmarks(ctx, stage, worldWidth, groundY, h, accent)

  if (!drewLandmark) {
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle   = "rgba(20,30,50,0.55)"
    ctx.beginPath()
    ctx.moveTo(-60, groundY - 180)
    ctx.lineTo(worldWidth * 0.18, groundY - 280)
    ctx.lineTo(worldWidth * 0.36, groundY - 190)
    ctx.lineTo(worldWidth * 0.56, groundY - 310)
    ctx.lineTo(worldWidth * 0.76, groundY - 210)
    ctx.lineTo(worldWidth + 80,   groundY - 290)
    ctx.lineTo(worldWidth + 80,   groundY)
    ctx.lineTo(-60, groundY)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)"
  ctx.fillRect(0, groundY - 20, worldWidth, 10)

  ctx.fillStyle = floor
  ctx.fillRect(0, groundY, worldWidth, floorHeight)
  ctx.fillStyle = "rgba(0,0,0,0.10)"
  ctx.fillRect(0, groundY + 30, worldWidth, Math.max(0, floorHeight - 30))

  if (stage?.name) {
    drawPanel(ctx, 22, 22, 250, 44, {
      radius: 14, fill: "rgba(0,0,0,0.35)", stroke: "rgba(255,255,255,0.14)", lineWidth: 1
    })
    drawCenteredText(ctx, stage.name, 147, 44, { font: "700 16px Arial", fill: accent })
  }
}

// ─────────────────────────────────────────────
// FIGHTER / EFFECTS / PROJECTILES
// ─────────────────────────────────────────────
export function drawFighter(ctx, fighter, camera = null) {
  if (!fighter) return
  drawCharacter(ctx, fighter)
}

// Lazy image cache for OPTIONAL projectile sprite sheets (Task 3 seam).
const _projImgCache = new Map()
function _projImg(src) {
  if (!src) return null
  let img = _projImgCache.get(src)
  if (!img) { img = new Image(); img.src = src; _projImgCache.set(src, img) }
  return img
}

export function drawProjectiles(ctx, projectiles = [], camera = null) {
  if (!Array.isArray(projectiles)) return
  projectiles.forEach(p => {
    const x = p.x ?? 0
    const y = p.y ?? 0

    // OPTIONAL SPRITE HOOK (Task 3): if the projectile carries a `sheet` (a
    // horizontal strip of `spriteFrames` cells of `spriteW`×`spriteH`), draw the
    // animated sprite, flipped to its travel direction. Until art is dropped in,
    // `sheet` is null and the colored shape below renders unchanged.
    const img = p.sheet ? _projImg(p.sheet) : null
    if (img && img.complete && img.naturalWidth > 0) {
      const frames = p.spriteFrames || 1
      const fw = p.spriteW || (img.naturalWidth / frames)
      const fh = p.spriteH || img.naturalHeight
      p._animT = (p._animT || 0) + 1
      const fi = Math.floor(p._animT / (p.spriteSpeed || 4)) % frames
      const scale = p.spriteScale || 1
      const dw = fw * scale, dh = fh * scale
      const dir = (p.vx || 0) < 0 ? -1 : 1
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(dir, 1)
      ctx.drawImage(img, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
      return
    }

    // FALLBACK: procedural energy orb. Drawn as an outer glow + colored body +
    // bright white core + dark outline so it reads clearly on ANY background
    // (the plain single-arc version could wash out — Task 2 visibility). The
    // draw size has a floor so small orbs (e.g. Gojo Blue, r≈9) still register;
    // collision still uses the data radius, so hitboxes are unchanged.
    const size  = Math.max(13, p.radius || p.size || 12)
    const color = p.color || "#ffd166"
    ctx.save()
    ctx.shadowBlur  = 24
    ctx.shadowColor = color
    ctx.fillStyle   = color
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 0.9
    ctx.fillStyle = "#ffffff"
    ctx.beginPath(); ctx.arc(x, y, size * 0.42, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(0,0,0,0.35)"
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  })
}

export function drawHitSparks(ctx, hitSparks = [], camera = null) {
  if (!Array.isArray(hitSparks) || !hitSparks.length) return

  for (const spark of hitSparks) {
    const { x, y, category = "light", color, timer, maxTimer, lines, radius } = spark
    const mt    = maxTimer || timer || 10
    const alpha = Math.min(1, timer / Math.max(1, mt))
    const c     = color || "#fff1a8"
    const n     = lines  || _defaultLines(category)
    const r     = radius || _defaultRadius(category)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = c
    ctx.lineWidth   = category === "ultimate" ? 4 : category === "clash" ? 3 : category === "special" ? 3 : 2
    if (category !== "light") { ctx.shadowBlur = 10; ctx.shadowColor = c }

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n
      const len   = r * (0.65 + (i % 3) * 0.18)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    if (category !== "light") {
      ctx.fillStyle = c + "44"
      ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill()
    }

    if (category === "ultimate" || category === "clash") {
      const ringR = r * 0.4 + r * 1.6 * (1 - alpha)
      ctx.strokeStyle = c + "55"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
    }

    if (category === "parry") {
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(x, y, r * (0.4 + 0.6 * (1 - alpha)), 0, Math.PI * 2); ctx.stroke()
    }

    ctx.restore()
  }
}

// `getHitbox(fighter)` (optional) returns the LIVE attack hitbox {x,y,w,h} or null when
// the fighter isn't attacking — so the red box tracks the real move (combat.getAttackHitbox)
// instead of the stale static fighter.attackBox. Blue = body/hurtbox (always).
export function drawTrainingCollisionBoxes(ctx, fighters = [], getHitbox = null) {
  if (!Array.isArray(fighters)) return
  fighters.forEach(fighter => {
    if (!fighter) return
    const x = fighter.x ?? 0
    const y = fighter.y ?? 0
    const w = fighter.width  ?? fighter.w ?? 80
    const h = fighter.height ?? fighter.h ?? 120

    ctx.save()
    ctx.strokeStyle = "rgba(90, 180, 255, 0.8)"   // body / hurtbox
    ctx.lineWidth   = 2
    ctx.strokeRect(x, y, w, h)

    // Live attack hitbox (only present mid-attack). Prefer the passed-in getter.
    const hb = (typeof getHitbox === "function" ? getHitbox(fighter) : null)
      || fighter.attackHitbox || null
    if (hb) {
      ctx.strokeStyle = "rgba(255, 90, 90, 0.9)"
      ctx.strokeRect(hb.x, hb.y, hb.w ?? hb.width, hb.h ?? hb.height)
    }
    ctx.restore()
  })
}

// ─────────────────────────────────────────────
// HUD — Health TOP, Energy BOTTOM
// ─────────────────────────────────────────────
export function drawHealthAndEnergyBars(ctx, p1, p2, canvas, roundWins = { p1: 0, p2: 0 }, globalFrameCount = 0) {
  const cw = canvas?.width  || window.innerWidth
  const ch = canvas?.height || window.innerHeight

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }

  function rrect(ctx, x, y, w, h, r = 6) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
    ctx.closePath()
  }

  const barW  = clamp(cw * 0.28, 220, 420)
  const barH  = 20
  const enH   = 13
  const pad   = 14
  const hpY   = pad

  function hpColor(ratio) {
    if (ratio > 0.5) return "#22c55e"
    if (ratio > 0.25) return "#f59e0b"
    return "#ef4444"
  }

  function drawHealthPanel(x, flip, fighter) {
    if (!fighter) return
    const maxHp = Math.max(1, fighter.maxHealth || 100)
    const ratio = clamp((fighter.health ?? maxHp) / maxHp, 0, 1)

    ctx.fillStyle = "rgba(0,0,0,0.55)"
    rrect(ctx, x, hpY, barW + 20, barH + 26, 10); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1
    rrect(ctx, x, hpY, barW + 20, barH + 26, 10); ctx.stroke()

    const nameX = flip ? x + barW + 12 : x + 8
    const nameAlign = flip ? "right" : "left"
    const nameColor = flip ? "#fca5a5" : "#7dd3fc"
    ctx.font = "bold 11px Arial"; ctx.textAlign = nameAlign; ctx.textBaseline = "alphabetic"
    ctx.fillStyle = nameColor
    ctx.fillText(fighter.name || (flip ? "P2" : "P1"), nameX, hpY + 12)

    ctx.fillStyle = "rgba(255,255,255,0.1)"
    rrect(ctx, x + 8, hpY + 14, barW, barH, 5); ctx.fill()

    const fillW = barW * ratio
    const fillX = flip ? x + 8 + barW - fillW : x + 8
    ctx.fillStyle = hpColor(ratio)
    rrect(ctx, fillX, hpY + 14, fillW, barH, 5); ctx.fill()
  }

  drawHealthPanel(pad, false, p1)
  drawHealthPanel(cw - pad - barW - 20, true,  p2)

  const pipCX = cw / 2, pipY = hpY + 22, pipR = 7, pipGap = 20, maxWins = 2
  for (let i = 0; i < maxWins; i++) {
    const px1 = pipCX - pipGap - pipR - i * (pipR * 2 + 5)
    ctx.beginPath(); ctx.arc(px1, pipY, pipR, 0, Math.PI*2)
    const p1Won = i < (roundWins?.p1 || 0)
    ctx.fillStyle = p1Won ? "#7dd3fc" : "rgba(255,255,255,0.10)"; ctx.fill()
    if (p1Won) { ctx.shadowBlur=10; ctx.shadowColor="#7dd3fc"; ctx.strokeStyle="#bae6fd"; ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0 }

    const px2 = pipCX + pipGap + pipR + i * (pipR * 2 + 5)
    ctx.beginPath(); ctx.arc(px2, pipY, pipR, 0, Math.PI*2)
    const p2Won = i < (roundWins?.p2 || 0)
    ctx.fillStyle = p2Won ? "#fca5a5" : "rgba(255,255,255,0.10)"; ctx.fill()
    if (p2Won) { ctx.shadowBlur=10; ctx.shadowColor="#fca5a5"; ctx.strokeStyle="#fecaca"; ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0 }
  }
  ctx.font="bold 12px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="rgba(255,255,255,0.5)"
  ctx.fillText(`RD ${(roundWins?.p1||0)+(roundWins?.p2||0)+1}`, pipCX, pipY)

  const enY = ch - enH - pad - 14

  function drawEnergyPanel(x, flip, fighter) {
    if (!fighter) return
    const ec      = fighter.energyConfig || {}
    let   label   = ec.label   || "ENERGY"
    let   mainCol = ec.color   || "#38bdf8"
    const emptyC  = ec.emptyColor || "rgba(255,255,255,0.08)"
    let   glowC   = ec.glowColor  || mainCol
    const hasEnergy = (fighter.maxEnergy || 0) > 0 && ec.regenRate !== "none"
    const isHeavRes = label === "——"

    // Transform device (Ben/Albedo): this meter IS the drain gauge. Relabel and
    // recolor it to read as the Omnitrix/Ultimatrix, and reflect its 3 live
    // states — transformed (draining), CHARGING (refilling, vulnerable), and the
    // forced-revert RECHARGE lockout while human.
    const isDevice = fighter.rosterKey === "ben10" || fighter.rosterKey === "albedo"
    const charging = isDevice && !!fighter.isCharging
    const reverted = isDevice && fighter.transformed === false
    if (isDevice) {
      const albedo = fighter.rosterKey === "albedo"
      mainCol = albedo ? "#ef4444" : "#22c55e"
      glowC   = mainCol
      label   = charging ? "CHARGING"
              : reverted ? "RECHARGE"
              : (albedo ? "ULTIMATRIX" : "OMNITRIX")
      if (reverted) mainCol = "#f59e0b"   // amber while locked out in human form
    }

    ctx.fillStyle = "rgba(0,0,0,0.52)"
    rrect(ctx, x, enY - 14, barW + 20, enH + 22, 8); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1
    rrect(ctx, x, enY - 14, barW + 20, enH + 22, 8); ctx.stroke()

    const labelX = flip ? x + barW + 12 : x + 8
    const labelAlign = flip ? "right" : "left"
    ctx.font = "bold 9px Arial"; ctx.textAlign = labelAlign; ctx.textBaseline = "alphabetic"

    if (isHeavRes) {
      ctx.fillStyle = "rgba(107,114,128,0.6)"
      ctx.fillText("HEAVENLY RESTRICTION", labelX, enY - 2)
      ctx.fillStyle = "#111827"
      rrect(ctx, x + 8, enY, barW, enH, 4); ctx.fill()
      return
    }

    ctx.fillStyle = (ec.color || "#38bdf8") + "bb"
    // Ultimate-cooldown hint (optional): while the universal recast lockout ticks,
    // append "· ULT Ns" to the meter label so ULT-not-ready is visible even at full meter.
    const ultCd = (fighter.ultimateCooldown || 0) > 0 ? `  · ULT ${Math.ceil(fighter.ultimateCooldown / 60)}s` : ""
    ctx.fillText(label + ultCd, labelX, enY - 2)

    if (!hasEnergy) return

    const maxEn  = Math.max(1, fighter.maxEnergy || 100)
    // Naruto's chakra is ONE shared pool (fighter.energy is the single source of
    // truth) split evenly across live bodies (him + clones). Spawning a clone
    // spends NOTHING — it only DIVIDES the displayed share, so the bar drops to
    // the per-body split (½ with 1 clone, ⅓ with 2, ¼ with 3) with NO net pool
    // loss. Chakra is permanently lost only when a clone is DESTROYED
    // (summons.loseCloneShare shrinks the pool). Mirrors spendNarutoChakra's
    // gate (usable share = energy / bodies), so the bar shows what you can spend.
    const bodies = fighter.rosterKey === "naruto" ? 1 + countShadowClones(fighter) : 1
    const ratio  = clamp((fighter.energy || 0) / (maxEn * bodies), 0, 1)
    const isCrit = ratio < 0.15
    const isHigh = ratio > 0.80

    ctx.fillStyle = emptyC
    rrect(ctx, x + 8, enY, barW, enH, 4); ctx.fill()

    let fillColor = mainCol
    if (isCrit) {
      const pulse = Math.sin(globalFrameCount * 0.2) * 0.5 + 0.5
      fillColor = _lerpHex(mainCol, emptyC, pulse * 0.5)
    }

    if (isHigh) {
      ctx.shadowBlur  = 8
      ctx.shadowColor = glowC
    }

    // CHARGING: bright pulsing fill + strong glow so the refill (and its
    // can't-defend vulnerability window) is unmistakable.
    if (charging) {
      const pulse = Math.sin(globalFrameCount * 0.4) * 0.5 + 0.5
      fillColor = _lerpHex(mainCol, "#ffffff", 0.35 + pulse * 0.45)
      ctx.shadowBlur  = 14
      ctx.shadowColor = glowC
    }

    const fillW = barW * ratio
    const fillX = flip ? x + 8 + barW - fillW : x + 8
    ctx.fillStyle = fillColor
    rrect(ctx, fillX, enY, fillW, enH, 4); ctx.fill()
    ctx.shadowBlur = 0

    // Device: notch at the minimum energy needed to (re)transform (mirrors
    // fighters.js TRANSFORM_ENERGY.MIN_TRANSFORM_ENERGY = 15 of 100), so the
    // player can see when a forced-reverted fighter may transform again.
    if (isDevice) {
      const notch = 0.15
      const nx = flip ? x + 8 + barW - barW * notch : x + 8 + barW * notch
      ctx.strokeStyle = reverted ? "#fde047" : "rgba(255,255,255,0.5)"
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(nx, enY - 1); ctx.lineTo(nx, enY + enH + 1); ctx.stroke()
    }
  }

  drawEnergyPanel(pad, false, p1)
  drawEnergyPanel(cw - pad - barW - 20, true, p2)
}

// Simple hex color lerp helper
function _lerpHex(a, b, t) {
  try {
    const pr = (hex) => {
      const n = hex.replace("#","")
      if (n.length < 6) return [128,128,128]
      return [parseInt(n.slice(0,2),16),parseInt(n.slice(2,4),16),parseInt(n.slice(4,6),16)]
    }
    const [ar,ag,ab] = pr(a), [br,bg,bb] = pr(b)
    const r = Math.round(ar+(br-ar)*t), g = Math.round(ag+(bg-ag)*t), bv = Math.round(ab+(bb-ab)*t)
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bv.toString(16).padStart(2,"0")}`
  } catch (_) { return a }
}

function _defaultLines(cat) {
  if (cat === "ultimate" || cat === "clash") return 16
  if (cat === "special" || cat === "parry")  return 10
  if (cat === "heavy")  return 8
  return 6
}

function _defaultRadius(cat) {
  if (cat === "ultimate" || cat === "clash") return 40
  if (cat === "special" || cat === "parry")  return 28
  if (cat === "heavy")   return 22
  return 14
}

// ─────────────────────────────────────────────
// CONTROLS INFO (bottom-left)
// ─────────────────────────────────────────────
export function drawControlsInfo(ctx, canvas) {
  const { height: h } = getCanvasSize(canvas)

  const panelY = h - 170
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.fillRect(18, panelY, 310, 110)
  ctx.strokeStyle = "rgba(255,255,255,0.18)"
  ctx.strokeRect(18, panelY, 310, 110)

  ctx.fillStyle   = "#ffffff"
  ctx.font        = "700 14px Arial"
  ctx.textAlign   = "left"
  ctx.fillText("Controls", 32, panelY + 22)

  ctx.font      = "12px Arial"
  ctx.fillStyle = "rgba(255,255,255,0.82)"
  ctx.fillText("Move: A/D  Jump: W  Down: Crouch/Block (hold S)", 32, panelY + 42)
  ctx.fillText("Light: J  Heavy: K  Special: I  Ultimate: L", 32, panelY + 58)
  ctx.fillText("Dash: Shift  Grab: Down+Light (S+J)", 32, panelY + 74)
  ctx.fillText("Charge: C  Transform: U  Toggle: Q", 32, panelY + 90)
  ctx.restore()
}

// ─────────────────────────────────────────────
// COUNTDOWN
// ─────────────────────────────────────────────
export function drawCountdown(ctx, canvas, countdown = 0) {
  if (countdown <= 0) return
  const { width: w, height: h } = getCanvasSize(canvas)
  const seconds = Math.ceil(countdown / 60)
  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.font         = "900 96px Arial"
  ctx.fillStyle    = "rgba(255,255,255,0.95)"
  ctx.shadowBlur   = 24
  ctx.shadowColor  = "rgba(120,170,255,0.42)"
  ctx.fillText(String(seconds), w / 2, h / 2)
  ctx.restore()
}

// ─────────────────────────────────────────────
// TRAINING OVERLAY (top-left, below health bar)
// ─────────────────────────────────────────────
export function drawTrainingOverlay(ctx, canvas, info = {}) {
  const { width: w } = getCanvasSize(canvas)

  const fd = info.frameData
  const fdLine = fd
    ? `${fd.who} ${fd.name}: ${fd.startup}/${fd.active}/${fd.recovery}  [${fd.phase} ${fd.elapsed}/${fd.total}]`
    : "Move: —  (start/active/recovery)"

  const lines = [
    "Training Mode",
    `Combo: ${info.combo ?? 0}    Last Dmg: ${info.damage ?? 0}`,
    fdLine,
    `Infinite HP/EN: ${info.infinite ? "ON" : "OFF"} [F3]`,
    `Dummy: ${info.dummy ?? "stand"} [F4]    Reset [F2]`,
    `Frame: ${info.frame ?? 0}`
  ]

  const p1Inputs = Array.isArray(info.p1Inputs) ? info.p1Inputs.join(" ") : ""
  const p2Inputs = Array.isArray(info.p2Inputs) ? info.p2Inputs.join(" ") : ""

  const panelY = 70
  const panelW = 320

  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(16, panelY, panelW, 196)
  ctx.strokeStyle = "rgba(255,255,255,0.16)"
  ctx.strokeRect(16, panelY, panelW, 196)

  ctx.fillStyle = "#fff"
  ctx.font      = "13px Arial"
  ctx.textAlign = "left"

  lines.forEach((line, i) => {
    // Highlight the live frame-data line while a move is active.
    if (i === 2) ctx.fillStyle = fd ? "#ffe08a" : "rgba(255,255,255,0.55)"
    else ctx.fillStyle = "#fff"
    ctx.fillText(line, 28, panelY + 22 + i * 18)
  })

  if (p1Inputs) {
    ctx.fillStyle = "#7fd3ff"
    ctx.fillText(`P1: ${p1Inputs}`, 28, panelY + 152)
  }
  if (p2Inputs) {
    ctx.fillStyle = "#ff9f9f"
    ctx.fillText(`P2: ${p2Inputs}`, 28, panelY + 170)
  }
  if (Array.isArray(info.history) && info.history.length && w >= 980) {
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.fillText(`Last: ${info.history[0]?.display || "Neutral"}`, 28, panelY + 188)
  }

  ctx.restore()
}

// ─────────────────────────────────────────────
// ROUND BREAK / MATCH END
// ─────────────────────────────────────────────
export function drawRoundBreak(ctx, canvas, winnerText = "ROUND BREAK") {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.42)"
  ctx.fillRect(0, 0, w, h)
  drawPanel(ctx, w / 2 - 240, h / 2 - 90, 480, 180, {
    radius: 22, fill: "rgba(8,12,28,0.78)", stroke: "rgba(255,255,255,0.16)", lineWidth: 2
  })
  drawCenteredText(ctx, winnerText,              w / 2, h / 2 - 10, { font: "800 42px Arial", fill: "#ffffff" })
  drawSubText(ctx, "Prepare for the next round", w / 2, h / 2 + 42, { font: "18px Arial" })
  ctx.restore()
}

export function drawMatchEnd(ctx, canvas, winnerText = "MATCH OVER") {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.52)"
  ctx.fillRect(0, 0, w, h)
  drawPanel(ctx, w / 2 - 280, h / 2 - 110, 560, 220, {
    radius: 24, fill: "rgba(8,12,28,0.82)", stroke: "rgba(255,255,255,0.18)", lineWidth: 2
  })
  drawCenteredText(ctx, winnerText,                           w / 2, h / 2 - 18, { font: "900 46px Arial", fill: "#ffffff" })
  drawSubText(ctx, "Click or press Enter to return to title", w / 2, h / 2 + 42, { font: "18px Arial", fill: "rgba(220,230,255,0.80)" })
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// NEW — PAUSE MENU
// Call drawPauseMenu(ctx, canvas, selectedIndex) from game.js
// when gameState === "paused"
// ─────────────────────────────────────────────────────────────────
export function drawPauseMenu(ctx, canvas, selectedIndex = 0) {
  const cw = canvas?.width  || window.innerWidth
  const ch = canvas?.height || window.innerHeight

  ctx.fillStyle = "rgba(0,0,0,0.62)"
  ctx.fillRect(0, 0, cw, ch)

  const panelW = 380
  const panelH = 392   // fits 4 items (resume / restart / training / quit)
  const panelX = cw / 2 - panelW / 2
  const panelY = ch / 2 - panelH / 2

  ctx.fillStyle   = "rgba(8,14,30,0.94)"
  ctx.strokeStyle = "rgba(255,255,255,0.18)"
  ctx.lineWidth   = 2
  _roundRectPath(ctx, panelX, panelY, panelW, panelH, 20)
  ctx.fill()
  ctx.stroke()

  ctx.font         = "900 28px Arial"
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 14
  ctx.shadowColor  = "rgba(120,170,255,0.4)"
  ctx.fillText("PAUSED", cw / 2, panelY + 44)
  ctx.shadowBlur   = 0

  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(panelX + 32, panelY + 68)
  ctx.lineTo(panelX + panelW - 32, panelY + 68)
  ctx.stroke()

  const items = [
    { label: "Resume",        sub: "Continue the match" },
    { label: "Restart Round", sub: "Reset this round" },
    { label: "Training Mode", sub: "Practice vs a frozen dummy" },
    { label: "Quit to Menu",  sub: "Return to the title screen" }
  ]

  const itemH   = 58
  const itemGap = 10
  const startY  = panelY + 88

  items.forEach((item, i) => {
    const iy     = startY + i * (itemH + itemGap)
    const active = i === selectedIndex
    const ix     = panelX + 24
    const iw     = panelW - 48

    ctx.fillStyle = active
      ? "rgba(59,130,246,0.28)"
      : "rgba(255,255,255,0.05)"
    _roundRectPath(ctx, ix, iy, iw, itemH, 12)
    ctx.fill()

    ctx.strokeStyle = active ? "#93c5fd" : "rgba(255,255,255,0.14)"
    ctx.lineWidth   = active ? 2 : 1
    _roundRectPath(ctx, ix, iy, iw, itemH, 12)
    ctx.stroke()

    if (active) {
      ctx.save()
      ctx.shadowBlur  = 18
      ctx.shadowColor = "#3b82f6"
      _roundRectPath(ctx, ix, iy, iw, itemH, 12)
      ctx.stroke()
      ctx.restore()
    }

    ctx.font      = "700 18px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = active ? "#f0f9ff" : "#e2e8f0"
    ctx.fillText(item.label, cw / 2, iy + itemH * 0.38)

    ctx.font      = "400 12px Arial"
    ctx.fillStyle = active ? "rgba(186,230,253,0.85)" : "rgba(200,210,230,0.55)"
    ctx.fillText(item.sub, cw / 2, iy + itemH * 0.72)
  })

  ctx.font      = "13px Arial"
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,210,230,0.5)"
  ctx.fillText("↑↓ / W S  to navigate   •   Enter / J to select   •   Esc to resume", cw / 2, panelY + panelH - 18)
}

function _roundRectPath(ctx, x, y, w, h, r = 10) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export const PAUSE_MENU_ITEMS = ["resume", "restartRound", "trainingMode", "quitToMenu"]

// ═════════════════════════════════════════════════════════════════════════
// TUTORIAL / HOW TO PLAY
// Key LABELS are derived from the live control map passed in (controls) so the
// page stays in sync with whatever bindings the engine actually uses — nothing
// is hardcoded as a separate string. The prose explains how the engine truly
// behaves (combined inputs like up+attack, hold-down to block, parry on heavy).
// ═════════════════════════════════════════════════════════════════════════

// Pretty-print a raw key binding ("arrowup", "shift", "j") for display.
function prettyKey(k) {
  if (k == null) return "—"
  const map = {
    arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→",
    " ": "Space", shift: "Shift", control: "Ctrl", escape: "Esc", enter: "Enter"
  }
  const s = String(k).toLowerCase()
  if (map[s]) return map[s]
  return s.length === 1 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1)
}
// Combine two bindings into "A + B".
function comboKeys(a, b) { return `${prettyKey(a)} + ${prettyKey(b)}` }

// Build the page list. c = live controls map (P1_CONTROLS). Each "row" is
// [actionLabel, keyLabel, description]. keyLabel is always derived from c.
function buildTutorialPages(c = {}) {
  return [
    {
      title: "MOVEMENT", accent: "#7fd3ff",
      blurb: "Stay mobile — spacing wins fights. Dash to close gaps or bait attacks.",
      rows: [
        ["Move left / right", `${prettyKey(c.left)} / ${prettyKey(c.right)}`, "Walk and control spacing."],
        ["Jump",              prettyKey(c.jump),  "Tap to leap; some fighters can double-jump."],
        ["Crouch",            prettyKey(c.down),  "Lowers your profile — also the guard input (see Defense)."],
        ["Dash",              prettyKey(c.dash),  "Quick burst; some characters teleport on a double-tap."]
      ]
    },
    {
      title: "ATTACKS", accent: "#ffd27f",
      blurb: "Normals are direction-sensitive: the same buttons do different moves on the ground, in the air, or with up/down held.",
      rows: [
        ["Light attack", prettyKey(c.light), "Fast poke. Chains into combos."],
        ["Heavy attack", prettyKey(c.heavy), "Slower, bigger damage and knockback."],
        ["Up attack (launcher)", comboKeys(c.up, c.light), "Hold Up + an attack to pop the enemy airborne."],
        ["Air attack",   `${prettyKey(c.light)} (airborne)`, "Press Light while jumping to juggle."],
        ["Down-air spike", `${prettyKey(c.heavy)} (airborne)`, "Press Heavy in the air to slam them down."],
        ["Grab / throw", comboKeys(c.down, c.light), "Beats blocking. Hold Down + Light up close."]
      ]
    },
    {
      title: "DEFENSE", accent: "#86efac",
      blurb: "You can't act out of hitstun, so blocking and parries are how you survive pressure.",
      rows: [
        ["Block", `Hold ${prettyKey(c.down)}`, "Hold to guard. Blocking bleeds small CHIP damage but stops the combo."],
        ["Parry", `${prettyKey(c.heavy)} (timed)`, "Tap Heavy just as an attack STARTS up to deflect it and stagger the attacker."],
        ["Tech roll", `${prettyKey(c.left)} / ${prettyKey(c.right)} on knockdown`, "Hold a direction as you land to roll and recover safely."]
      ]
    },
    {
      title: "METER & SPECIALS", accent: "#c4b5fd",
      blurb: "Specials and Ultimates spend your energy meter (it also regenerates slowly). Bigger moves cost more.",
      rows: [
        ["Special", prettyKey(c.special),   "Signature move — costs energy. Some are projectiles."],
        ["Ultimate", prettyKey(c.ultimate), "Highest-cost finisher. Save meter for it."],
        ["Charge energy", `Hold ${prettyKey(c.charge)}`, "Stand and build meter (leaves you open)."],
        ["Transform", prettyKey(c.transform), "Enter a stronger form (e.g. Super Saiyan) — boosts damage."]
      ]
    },
    {
      title: "COMBOS & GIMMICKS", accent: "#ff9fc4",
      blurb: "Launch, jump, juggle: Up-attack → jump → air attacks → down-air spike is the core combo. Each fighter also has a unique system.",
      rows: [
        ["Combo scaling", "—", "Each hit in a combo does a little less — open with your heavy hitters."],
        ["Gojo: Infinity", prettyKey(c.toggle), "Toggle a field that slows anything approaching you."],
        ["Ben 10: Omnitrix", `${prettyKey(c.charge)} + ${prettyKey(c.left)}/${prettyKey(c.right)}`, "Cycle your 5 aliens mid-fight (tap Charge for next)."],
        ["Domain Expansion", "—", "Some fighters can activate a damage-boosting domain — watch the meter bar."]
      ]
    }
  ]
}

let _tutorialPageCache = null
let _tutorialCacheKey  = null
function getTutorialPages(controls) {
  // Re-derive only if the bindings object identity changes (cheap & in-sync).
  if (controls !== _tutorialCacheKey) {
    _tutorialPageCache = buildTutorialPages(controls)
    _tutorialCacheKey  = controls
  }
  return _tutorialPageCache
}

export function getTutorialPageCount(controls) {
  return getTutorialPages(controls).length
}

export function getTutorialButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  return [
    { id: "prev", label: "‹ BACK",  x: 24,             y: h - 70, w: 150, h: 48 },
    { id: "next", label: "NEXT ›",  x: w - 24 - 150,   y: h - 70, w: 150, h: 48 },
    { id: "menu", label: "MAIN MENU", x: w / 2 - 90,   y: h - 70, w: 180, h: 48 }
  ]
}

// opts = { page, controls, mouse }
export function drawTutorialScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const pages = getTutorialPages(opts.controls)
  const page  = clamp(opts.page || 0, 0, pages.length - 1)
  const P     = pages[page]

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0a1020", "#1a1530")
  drawHeader(ctx, canvas, "HOW TO PLAY", `${P.title}   —   page ${page + 1} of ${pages.length}`)

  // Page-dot indicator
  const dotY = 138, dotGap = 22, dotX0 = w / 2 - ((pages.length - 1) * dotGap) / 2
  for (let i = 0; i < pages.length; i++) {
    ctx.fillStyle = i === page ? P.accent : "rgba(255,255,255,0.25)"
    ctx.beginPath(); ctx.arc(dotX0 + i * dotGap, dotY, i === page ? 6 : 4, 0, Math.PI * 2); ctx.fill()
  }

  // Content panel
  const panelX = clamp(w * 0.5 - 430, 40, w)
  const panelW = Math.min(860, w - panelX * 2)
  const panelY = 168
  const panelH = h - panelY - 100
  drawPanel(ctx, panelX, panelY, panelW, panelH, { fill: "rgba(8,14,30,0.82)", stroke: P.accent, lineWidth: 2, radius: 16 })

  const pad = 28
  let cy = panelY + 34
  drawCenteredText(ctx, P.title, panelX + pad, cy, { font: "800 24px Arial", fill: P.accent, align: "left", baseline: "middle" })
  cy += 30
  cy = wrapText(ctx, P.blurb, panelX + pad, cy, panelW - pad * 2, 20, { font: "15px Arial", fill: "rgba(220,230,255,0.82)" })
  cy += 14

  // Rows: action | KEY chip | description
  const keyColX = panelX + pad + 230
  const descX   = keyColX + 150
  for (const [action, keyLabel, desc] of P.rows) {
    ctx.save(); ctx.textBaseline = "middle"
    ctx.textAlign = "left"; ctx.font = "700 15px Arial"; ctx.fillStyle = "#ffffff"
    ctx.fillText(action, panelX + pad, cy)
    // key chip
    ctx.font = "700 14px Arial"
    const chipW = Math.max(46, ctx.measureText(keyLabel).width + 22)
    ctx.fillStyle = "rgba(120,170,255,0.18)"
    fillRoundRect(ctx, keyColX, cy - 14, chipW, 28, 8)
    ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5; strokeRoundRect(ctx, keyColX, cy - 14, chipW, 28, 8)
    ctx.fillStyle = "#eaf1ff"; ctx.textAlign = "center"
    ctx.fillText(keyLabel, keyColX + chipW / 2, cy)
    ctx.restore()
    cy = wrapText(ctx, desc, descX, cy, panelX + panelW - pad - descX, 18, { font: "14px Arial", fill: "rgba(220,230,255,0.75)" })
    cy += 12
  }

  // Nav buttons (hover highlight via mouse)
  const m = opts.mouse
  for (const b of getTutorialButtons(canvas)) {
    const active = m ? _inRect(m.x, m.y, b) : false
    drawButton(ctx, b, { label: b.label, active, accent: P.accent })
  }
  drawFooterHint(ctx, canvas, "← / → to flip pages • Esc returns to the menu")
}

// ═════════════════════════════════════════════════════════════════════════
// ACCOUNT SCREEN (front-end stub — see account.js)
// opts = { account, draftName, message, accounts, mouse, caretOn }
// ═════════════════════════════════════════════════════════════════════════
export function getAccountButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx = w / 2
  return [
    { id: "generate", label: "GENERATE ACCOUNT", x: cx - 170, y: 360, w: 340, h: 56 },
    { id: "new",      label: "NEW / SWITCH",      x: cx - 170, y: 430, w: 160, h: 48 },
    { id: "menu",     label: "MAIN MENU",         x: cx + 10,  y: 430, w: 160, h: 48 }
  ]
}

export function drawAccountScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx = w / 2
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#08111f", "#101a33")
  drawHeader(ctx, canvas, "ACCOUNT", "Local profile (no server yet — saved in memory only)")

  // Current account banner
  const acc = opts.account
  const bannerW = 520, bannerX = cx - bannerW / 2, bannerY = 150
  drawPanel(ctx, bannerX, bannerY, bannerW, 70, { fill: "rgba(8,14,30,0.8)", stroke: acc ? "#86efac" : "rgba(255,255,255,0.18)", lineWidth: 2, radius: 14 })
  if (acc) {
    drawCenteredText(ctx, `Logged in as ${acc.username}`, bannerX + 20, bannerY + 28, { font: "800 20px Arial", fill: "#bbf7d0", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `id: ${acc.accountId}`, bannerX + 20, bannerY + 50, { font: "12px Arial", fill: "rgba(220,230,255,0.6)", align: "left", baseline: "middle" })
  } else {
    drawCenteredText(ctx, "No account yet — type a username and generate one.", cx, bannerY + 35, { font: "16px Arial", fill: "rgba(220,230,255,0.75)" })
  }

  // Username entry field
  const fieldW = 340, fieldX = cx - fieldW / 2, fieldY = 270, fieldH = 56
  drawCenteredText(ctx, "USERNAME", fieldX, fieldY - 14, { font: "700 13px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
  drawPanel(ctx, fieldX, fieldY, fieldW, fieldH, { fill: "rgba(255,255,255,0.06)", stroke: "#8fb3ff", lineWidth: 2, radius: 10 })
  const draft = String(opts.draftName || "")
  const caret = opts.caretOn ? "|" : ""
  ctx.save(); ctx.textBaseline = "middle"; ctx.textAlign = "left"
  ctx.font = "700 22px Arial"
  ctx.fillStyle = draft ? "#ffffff" : "rgba(220,230,255,0.4)"
  ctx.fillText(draft ? draft + caret : "enter name…" , fieldX + 16, fieldY + fieldH / 2)
  ctx.restore()

  // Buttons
  const m = opts.mouse
  for (const b of getAccountButtons(canvas)) {
    const active = m ? _inRect(m.x, m.y, b) : false
    drawButton(ctx, b, { label: b.label, active, accent: b.id === "generate" ? "#86efac" : "#8fb3ff" })
  }

  // Message / saved-accounts count
  if (opts.message) {
    drawCenteredText(ctx, opts.message, cx, 510, { font: "15px Arial", fill: "#ffd27f" })
  }
  const count = normalizeToArray(opts.accounts).length
  if (count > 0) drawFooterHint(ctx, canvas, `${count} local account${count === 1 ? "" : "s"} this session • type to edit name • Enter to generate`)
  else           drawFooterHint(ctx, canvas, "Type a username • Enter to generate • Esc to go back")
}
