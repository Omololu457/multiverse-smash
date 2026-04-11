// ui.js
// Shared UI rendering and menu layout helpers.
// HUD LAYOUT: Health bars → TOP of screen | Energy bars → BOTTOM of screen

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
  ctx.font        = font
  ctx.fillStyle   = fill
  ctx.textAlign   = align
  ctx.textBaseline = baseline
  ctx.shadowBlur  = shadowBlur
  ctx.shadowColor = shadowColor
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
  const { width: w, height: h } = getCanvasSize(canvas)
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
    const rect     = rects[i]
    const isCursor = i === selectedIndex
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

  const sky    = stage?.sky   || "#6fb5ff"
  const mid    = stage?.mid   || "#6cb27f"
  const floor  = stage?.floor || "#4d5c41"
  const accent = stage?.accent || "#ffffff"
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

  // Distant mountains
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

  const x      = fighter.x ?? 0
  const y      = fighter.y ?? 0
  const width  = fighter.width  ?? fighter.w ?? 80
  const height = fighter.height ?? fighter.h ?? 120
  const faceRight = typeof fighter.facingRight === "boolean"
    ? fighter.facingRight
    : (fighter.facing ?? 1) >= 0

  const bodyColor = fighter.color || fighter.fill || (fighter.isCPU ? "#ff8b8b" : "#8ec5ff")

  ctx.save()

  // Drop shadow
  ctx.globalAlpha = 0.22
  ctx.fillStyle   = "#000"
  ctx.beginPath()
  ctx.ellipse(x + width / 2, y + height + 8, width * 0.42, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Flash white on hit
  if ((fighter.colorFlash || 0) > 0) {
    ctx.fillStyle = "#ffffff"
    fighter.colorFlash--
  } else {
    ctx.fillStyle = bodyColor
  }
  fillRoundRect(ctx, x, y, width, height, 14)

  ctx.strokeStyle = "rgba(255,255,255,0.32)"
  ctx.lineWidth   = 2
  strokeRoundRect(ctx, x, y, width, height, 14)

  // Head
  ctx.fillStyle = "rgba(255,255,255,0.85)"
  ctx.beginPath()
  ctx.arc(x + width / 2, y + 24, 13, 0, Math.PI * 2)
  ctx.fill()

  // Facing dot
  ctx.fillStyle = "rgba(20,24,40,0.75)"
  if (faceRight) ctx.fillRect(x + width - 18, y + 18, 8, 8)
  else           ctx.fillRect(x + 10,          y + 18, 8, 8)

  // Name tag
  if (fighter.name) {
    drawCenteredText(ctx, fighter.name, x + width / 2, y - 12, {
      font: "700 12px Arial", fill: "#ffffff"
    })
  }

  ctx.restore()
}

export function drawProjectiles(ctx, projectiles = [], camera = null) {
  if (!Array.isArray(projectiles)) return
  projectiles.forEach(p => {
    const x    = p.x ?? 0
    const y    = p.y ?? 0
    const size = p.radius || p.size || 12
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
    // Hurtbox (blue)
    ctx.strokeStyle = "rgba(90, 180, 255, 0.8)"
    ctx.lineWidth   = 2
    ctx.strokeRect(x, y, w, h)
    // Hitbox (red)
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
export function drawHealthAndEnergyBars(ctx, p1, p2, canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)

  const barW     = clamp(w * 0.28, 240, 440)
  const barH     = 20
  const energyH  = 14
  const padding  = 16
  const radius   = 6

  const p1MaxHp  = Math.max(1, p1?.maxHealth || 100)
  const p2MaxHp  = Math.max(1, p2?.maxHealth || 100)
  const p1MaxEn  = Math.max(1, p1?.maxEnergy || 100)
  const p2MaxEn  = Math.max(1, p2?.maxEnergy || 100)

  const p1HpRatio = clamp((p1?.health ?? p1MaxHp) / p1MaxHp, 0, 1)
  const p2HpRatio = clamp((p2?.health ?? p2MaxHp) / p2MaxHp, 0, 1)
  const p1EnRatio = clamp((p1?.energy ?? 0)        / p1MaxEn, 0, 1)
  const p2EnRatio = clamp((p2?.energy ?? 0)        / p2MaxEn, 0, 1)

  // ── HEALTH BARS — top of screen ────────────────────────────────
  const hpY = padding

  // P1 health panel (left)
  drawPanel(ctx, padding, hpY, barW + 24, barH + 28, {
    radius: 10, fill: "rgba(0,0,0,0.52)", stroke: "rgba(255,255,255,0.14)", lineWidth: 1
  })
  // P1 name
  drawCenteredText(ctx, p1?.name || "P1", padding + 8, hpY + 10, {
    font: "700 12px Arial", fill: "#8fd0ff", align: "left", baseline: "alphabetic"
  })
  // P1 health track
  ctx.fillStyle = "rgba(255,255,255,0.12)"
  ctx.beginPath(); roundRect(ctx, padding + 8, hpY + 14, barW, barH, radius); ctx.fill()
  // P1 health fill — red when low
  const p1HpColor = p1HpRatio > 0.4 ? "#52d46b" : p1HpRatio > 0.2 ? "#f59e0b" : "#ef4444"
  ctx.fillStyle = p1HpColor
  ctx.beginPath(); roundRect(ctx, padding + 8, hpY + 14, barW * p1HpRatio, barH, radius); ctx.fill()

  // P2 health panel (right, fills right-to-left)
  const p2PanelX = w - padding - barW - 24
  drawPanel(ctx, p2PanelX, hpY, barW + 24, barH + 28, {
    radius: 10, fill: "rgba(0,0,0,0.52)", stroke: "rgba(255,255,255,0.14)", lineWidth: 1
  })
  drawCenteredText(ctx, p2?.name || "P2", w - padding - 8, hpY + 10, {
    font: "700 12px Arial", fill: "#ff9f9f", align: "right", baseline: "alphabetic"
  })
  // P2 health track
  ctx.fillStyle = "rgba(255,255,255,0.12)"
  ctx.beginPath(); roundRect(ctx, p2PanelX + 8, hpY + 14, barW, barH, radius); ctx.fill()
  // P2 health fill — fills right to left
  const p2HpColor = p2HpRatio > 0.4 ? "#52d46b" : p2HpRatio > 0.2 ? "#f59e0b" : "#ef4444"
  const p2FillX = p2PanelX + 8 + barW * (1 - p2HpRatio)
  ctx.fillStyle = p2HpColor
  ctx.beginPath(); roundRect(ctx, p2FillX, hpY + 14, barW * p2HpRatio, barH, radius); ctx.fill()

  // ── ENERGY BARS — bottom of screen ────────────────────────────
  // Only draw if the character actually uses energy
  const p1HasEnergy = (p1?.maxEnergy || 0) > 0
  const p2HasEnergy = (p2?.maxEnergy || 0) > 0

  const enY = h - energyH - padding - 12

  if (p1HasEnergy) {
    drawPanel(ctx, padding, enY - 16, barW + 24, energyH + 24, {
      radius: 8, fill: "rgba(0,0,0,0.52)", stroke: "rgba(255,255,255,0.12)", lineWidth: 1
    })
    drawCenteredText(ctx, "ENERGY", padding + 8, enY - 6, {
      font: "600 10px Arial", fill: "rgba(91,180,255,0.8)", align: "left", baseline: "alphabetic"
    })
    ctx.fillStyle = "rgba(255,255,255,0.10)"
    ctx.beginPath(); roundRect(ctx, padding + 8, enY, barW, energyH, 4); ctx.fill()
    ctx.fillStyle = "#5bb4ff"
    ctx.beginPath(); roundRect(ctx, padding + 8, enY, barW * p1EnRatio, energyH, 4); ctx.fill()
  }

  if (p2HasEnergy) {
    const p2EnPanelX = w - padding - barW - 24
    drawPanel(ctx, p2EnPanelX, enY - 16, barW + 24, energyH + 24, {
      radius: 8, fill: "rgba(0,0,0,0.52)", stroke: "rgba(255,255,255,0.12)", lineWidth: 1
    })
    drawCenteredText(ctx, "ENERGY", w - padding - 8, enY - 6, {
      font: "600 10px Arial", fill: "rgba(255,159,159,0.8)", align: "right", baseline: "alphabetic"
    })
    ctx.fillStyle = "rgba(255,255,255,0.10)"
    ctx.beginPath(); roundRect(ctx, p2EnPanelX + 8, enY, barW, energyH, 4); ctx.fill()
    const p2EnFillX = p2EnPanelX + 8 + barW * (1 - p2EnRatio)
    ctx.fillStyle = "#ff9f9f"
    ctx.beginPath(); roundRect(ctx, p2EnFillX, enY, barW * p2EnRatio, energyH, 4); ctx.fill()
  }

  // ── ROUND PIPS (center top) ────────────────────────────────────
  // Small dots showing round wins — 2 wins needed
  const pipCX  = w / 2
  const pipY   = hpY + 14
  const pipR   = 6
  const pipGap = 18

  ;[0, 1].forEach(i => {
    const px = pipCX - pipGap / 2 - pipR + i * (pipGap + pipR * 2)
    ctx.beginPath()
    ctx.arc(px, pipY + barH / 2, pipR, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255,255,255,0.18)"
    ctx.fill()
  })
}

// ─────────────────────────────────────────────
// CONTROLS INFO (bottom-left)
// ─────────────────────────────────────────────
export function drawControlsInfo(ctx, canvas) {
  const { height: h } = getCanvasSize(canvas)

  // Positioned above the energy bar
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

  // Push below the health bar (which is ~60px tall at top)
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
