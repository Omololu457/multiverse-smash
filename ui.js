// ui.js
// Shared UI rendering and menu layout helpers.
// HUD LAYOUT: Health bars → TOP of screen | Energy bars → BOTTOM of screen

import { drawCharacter } from "./fighters.js"

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
  const menuWidth    = clamp(w * 0.32, 320, 500)
  const buttonHeight = clamp(h * 0.095, 72, 100)
  const gap          = 22
  const totalHeight  = labels.length * buttonHeight + Math.max(0, labels.length - 1) * gap
  const startX       = w / 2 - menuWidth / 2
  const startY       = h / 2 - totalHeight / 2 + 50

  return labels.map((label, index) => ({
    id:       label.id       || String(index),
    label:    label.label    || String(label),
    subLabel: label.subLabel || "",
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

  drawCenteredText(ctx, label, rect.x + rect.w / 2, rect.y + rect.h * 0.42, {
    font: "700 26px Arial",
    fill: "#ffffff"
  })

  if (subLabel) {
    drawSubText(ctx, subLabel, rect.x + rect.w / 2, rect.y + rect.h * 0.72, {
      font: "15px Arial",
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
    { id: "training", label: "TRAINING",  subLabel: "1 player practice mode" },
    { id: "vs",       label: "VS MATCH",  subLabel: "Fight the CPU"          },
    { id: "back",     label: "BACK",      subLabel: "Return to title"        }
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

    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, { fill, stroke, lineWidth: 2 })

    const fighterName = fighter?.name || fighter?.id || fighter?.displayName || fighter?.label || `Fighter ${i + 1}`
    const universe    = fighter?.universe || fighter?.series || fighter?.origin || ""

    drawCenteredText(ctx, fighterName, rect.x + rect.w / 2, rect.y + 38, { font: "700 20px Arial", fill: "#ffffff" })
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

export function drawProjectiles(ctx, projectiles = [], camera = null) {
  if (!Array.isArray(projectiles)) return
  projectiles.forEach(p => {
    const x     = p.x ?? 0
    const y     = p.y ?? 0
    const size  = p.radius || p.size || 12
    const color = p.color || "#ffd166"
    ctx.save()
    ctx.fillStyle   = color
    ctx.shadowBlur  = 18
    ctx.shadowColor = color
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

export function drawHitSparks(ctx, hitSparks = [], camera = null) {
  if (!Array.isArray(hitSparks)) return
  hitSparks.forEach(spark => {
    const x     = spark.x ?? 0
    const y     = spark.y ?? 0
    const size  = spark.size  || 18
    const color = spark.color || "#fff1a8"
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth   = 3
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size)
      ctx.stroke()
    }
    ctx.restore()
  })
}

export function drawTrainingCollisionBoxes(ctx, fighters = []) {
  if (!Array.isArray(fighters)) return
  fighters.forEach(fighter => {
    if (!fighter) return
    const x = fighter.x ?? 0
    const y = fighter.y ?? 0
    const w = fighter.width  ?? fighter.w ?? 80
    const h = fighter.height ?? fighter.h ?? 120

    ctx.save()
    ctx.strokeStyle = "rgba(90, 180, 255, 0.8)"
    ctx.lineWidth   = 2
    ctx.strokeRect(x, y, w, h)

    if (fighter.attackHitbox) {
      const hb = fighter.attackHitbox
      ctx.strokeStyle = "rgba(255, 90, 90, 0.9)"
      ctx.strokeRect(hb.x, hb.y, hb.width, hb.height)
    } else if (fighter.attackBox) {
      const hb = fighter.attackBox
      ctx.strokeStyle = "rgba(255, 90, 90, 0.9)"
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h)
    }
    ctx.restore()
  })
}

// ─────────────────────────────────────────────
// HUD — Health TOP, Energy BOTTOM
// ─────────────────────────────────────────────
export function drawHealthAndEnergyBars(ctx, p1, p2, canvas, roundWins = { p1: 0, p2: 0 }) {
  const cw = canvas?.width  || window.innerWidth
  const ch = canvas?.height || window.innerHeight

  function clampLocal(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }

  function roundRectLocal(ctx, x, y, w, h, r = 6) {
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

  const barW  = clampLocal(cw * 0.28, 220, 420)
  const barH  = 20
  const enH   = 13
  const pad   = 14

  const hpY = pad

  const p1MaxHp = Math.max(1, p1?.maxHealth || 100)
  const p2MaxHp = Math.max(1, p2?.maxHealth || 100)
  const p1Hp    = clampLocal((p1?.health ?? p1MaxHp) / p1MaxHp, 0, 1)
  const p2Hp    = clampLocal((p2?.health ?? p2MaxHp) / p2MaxHp, 0, 1)

  function hpColor(ratio) {
    if (ratio > 0.5) return "#22c55e"
    if (ratio > 0.25) return "#f59e0b"
    return "#ef4444"
  }

  ctx.fillStyle = "rgba(0,0,0,0.55)"
  roundRectLocal(ctx, pad, hpY, barW + 20, barH + 26, 10)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth   = 1
  roundRectLocal(ctx, pad, hpY, barW + 20, barH + 26, 10)
  ctx.stroke()

  ctx.font         = "bold 11px Arial"
  ctx.textAlign    = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle    = "#7dd3fc"
  ctx.fillText(p1?.name || "P1", pad + 8, hpY + 12)

  ctx.fillStyle = "rgba(255,255,255,0.1)"
  roundRectLocal(ctx, pad + 8, hpY + 14, barW, barH, 5)
  ctx.fill()
  ctx.fillStyle = hpColor(p1Hp)
  roundRectLocal(ctx, pad + 8, hpY + 14, barW * p1Hp, barH, 5)
  ctx.fill()

  const p2PanelX = cw - pad - barW - 20
  ctx.fillStyle   = "rgba(0,0,0,0.55)"
  roundRectLocal(ctx, p2PanelX, hpY, barW + 20, barH + 26, 10)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  roundRectLocal(ctx, p2PanelX, hpY, barW + 20, barH + 26, 10)
  ctx.stroke()

  ctx.font         = "bold 11px Arial"
  ctx.textAlign    = "right"
  ctx.fillStyle    = "#fca5a5"
  ctx.fillText(p2?.name || "P2", cw - pad - 8, hpY + 12)

  ctx.fillStyle = "rgba(255,255,255,0.1)"
  roundRectLocal(ctx, p2PanelX + 8, hpY + 14, barW, barH, 5)
  ctx.fill()
  ctx.fillStyle = hpColor(p2Hp)
  const p2FillX = p2PanelX + 8 + barW * (1 - p2Hp)
  roundRectLocal(ctx, p2FillX, hpY + 14, barW * p2Hp, barH, 5)
  ctx.fill()

  const pipCX   = cw / 2
  const pipY    = hpY + 22
  const pipR    = 7
  const pipGap  = 20
  const maxWins = 2

  for (let i = 0; i < maxWins; i++) {
    const px = pipCX - pipGap - pipR - i * (pipR * 2 + 5)
    const won = i < (roundWins?.p1 || 0)

    ctx.beginPath()
    ctx.arc(px, pipY, pipR, 0, Math.PI * 2)

    if (won) {
      ctx.fillStyle = "#7dd3fc"
      ctx.fill()
      ctx.shadowBlur  = 10
      ctx.shadowColor = "#7dd3fc"
      ctx.strokeStyle = "#bae6fd"
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.shadowBlur  = 0
    } else {
      ctx.fillStyle   = "rgba(255,255,255,0.10)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.25)"
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }
  }

  for (let i = 0; i < maxWins; i++) {
    const px = pipCX + pipGap + pipR + i * (pipR * 2 + 5)
    const won = i < (roundWins?.p2 || 0)

    ctx.beginPath()
    ctx.arc(px, pipY, pipR, 0, Math.PI * 2)

    if (won) {
      ctx.fillStyle = "#fca5a5"
      ctx.fill()
      ctx.shadowBlur  = 10
      ctx.shadowColor = "#fca5a5"
      ctx.strokeStyle = "#fecaca"
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.shadowBlur  = 0
    } else {
      ctx.fillStyle   = "rgba(255,255,255,0.10)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.25)"
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }
  }

  ctx.font         = "bold 12px Arial"
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle    = "rgba(255,255,255,0.55)"
  ctx.fillText(`RD ${(roundWins?.p1 || 0) + (roundWins?.p2 || 0) + 1}`, pipCX, pipY)

  const p1HasEnergy = (p1?.maxEnergy || 0) > 0
  const p2HasEnergy = (p2?.maxEnergy || 0) > 0

  const p1MaxEn = Math.max(1, p1?.maxEnergy || 100)
  const p2MaxEn = Math.max(1, p2?.maxEnergy || 100)
  const p1En    = clampLocal((p1?.energy ?? 0) / p1MaxEn, 0, 1)
  const p2En    = clampLocal((p2?.energy ?? 0) / p2MaxEn, 0, 1)

  const enY = ch - enH - pad - 14

  if (p1HasEnergy) {
    ctx.fillStyle = "rgba(0,0,0,0.52)"
    roundRectLocal(ctx, pad, enY - 14, barW + 20, enH + 22, 8)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.10)"
    ctx.lineWidth   = 1
    roundRectLocal(ctx, pad, enY - 14, barW + 20, enH + 22, 8)
    ctx.stroke()

    ctx.font         = "bold 9px Arial"
    ctx.textAlign    = "left"
    ctx.textBaseline = "alphabetic"
    ctx.fillStyle    = "rgba(125,211,252,0.75)"
    ctx.fillText("ENERGY", pad + 8, enY - 2)

    ctx.fillStyle = "rgba(255,255,255,0.10)"
    roundRectLocal(ctx, pad + 8, enY, barW, enH, 4)
    ctx.fill()
    ctx.fillStyle = "#38bdf8"
    roundRectLocal(ctx, pad + 8, enY, barW * p1En, enH, 4)
    ctx.fill()
  }

  if (p2HasEnergy) {
    const p2EnX = cw - pad - barW - 20
    ctx.fillStyle = "rgba(0,0,0,0.52)"
    roundRectLocal(ctx, p2EnX, enY - 14, barW + 20, enH + 22, 8)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.10)"
    roundRectLocal(ctx, p2EnX, enY - 14, barW + 20, enH + 22, 8)
    ctx.stroke()

    ctx.font         = "bold 9px Arial"
    ctx.textAlign    = "right"
    ctx.fillStyle    = "rgba(252,165,165,0.75)"
    ctx.fillText("ENERGY", cw - pad - 8, enY - 2)

    ctx.fillStyle = "rgba(255,255,255,0.10)"
    roundRectLocal(ctx, p2EnX + 8, enY, barW, enH, 4)
    ctx.fill()
    const p2EnFillX = p2EnX + 8 + barW * (1 - p2En)
    ctx.fillStyle   = "#f87171"
    roundRectLocal(ctx, p2EnFillX, enY, barW * p2En, enH, 4)
    ctx.fill()
  }
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
  ctx.fillText("Move: A/D  Jump: W  Down: S", 32, panelY + 42)
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

  const lines = [
    "Training Mode",
    `Combo: ${info.combo ?? 0}`,
    `Damage: ${info.damage ?? 0}`,
    `State: ${info.state ?? "idle"}`,
    `Meter Gain: ${info.meterGain ?? 0}`,
    `Frame: ${info.frame ?? 0}`
  ]

  const p1Inputs = Array.isArray(info.p1Inputs) ? info.p1Inputs.join(" ") : ""
  const p2Inputs = Array.isArray(info.p2Inputs) ? info.p2Inputs.join(" ") : ""

  const panelY = 70

  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(16, panelY, 270, 190)
  ctx.strokeStyle = "rgba(255,255,255,0.16)"
  ctx.strokeRect(16, panelY, 270, 190)

  ctx.fillStyle = "#fff"
  ctx.font      = "14px Arial"
  ctx.textAlign = "left"

  lines.forEach((line, i) => {
    ctx.fillText(line, 28, panelY + 22 + i * 18)
  })

  if (p1Inputs) {
    ctx.fillStyle = "#7fd3ff"
    ctx.fillText(`P1: ${p1Inputs}`, 28, panelY + 148)
  }
  if (p2Inputs) {
    ctx.fillStyle = "#ff9f9f"
    ctx.fillText(`P2: ${p2Inputs}`, 28, panelY + 166)
  }
  if (Array.isArray(info.history) && info.history.length && w >= 980) {
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.fillText(`Last: ${info.history[0]?.display || "Neutral"}`, 28, panelY + 184)
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
  const panelH = 320
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

export const PAUSE_MENU_ITEMS = ["resume", "restartRound", "quitToMenu"]
