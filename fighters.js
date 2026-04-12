// fighters.js
// Unique procedural canvas drawings for each character.
// Called from ui.js drawFighter() — no sprites required.
// Each fighter has a distinct silhouette, color palette, and detail marks.

// ─────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r = 10) {
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

// Draw a drop shadow under the fighter
function drawShadow(ctx, x, y, w, h) {
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.fillStyle   = "#000"
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h + 6, w * 0.45, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Draw a glowing aura around the fighter
function drawAura(ctx, x, y, w, h, color, alpha = 0.18, spread = 14) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowBlur  = spread * 2
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth   = spread
  roundRect(ctx, x - spread / 2, y - spread / 2, w + spread, h + spread, 16)
  ctx.stroke()
  ctx.restore()
}

// Draw a name label above the fighter
function drawNameTag(ctx, name, cx, y, color = "#ffffff") {
  ctx.save()
  ctx.font         = "bold 11px Arial"
  ctx.textAlign    = "center"
  ctx.textBaseline = "bottom"
  ctx.fillStyle    = "rgba(0,0,0,0.55)"
  ctx.fillRect(cx - 30, y - 18, 60, 16)
  ctx.fillStyle = color
  ctx.fillText(name, cx, y - 4)
  ctx.restore()
}

// Draw hitflash overlay
function drawHitFlash(ctx, x, y, w, h, flash) {
  if (!flash || flash <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, flash / 6) * 0.85
  ctx.fillStyle   = "#ffffff"
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.restore()
}

// Direction indicator (tiny eye/dot showing facing)
function drawFacingDot(ctx, x, y, w, facing, color) {
  ctx.save()
  ctx.fillStyle = color
  const dotX = facing >= 0 ? x + w - 12 : x + 6
  ctx.beginPath()
  ctx.arc(dotX, y + 22, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// ── GOKU ──────────────────────────────────────────────────────────
// Orange gi, spiky black hair silhouette, golden aura in SSJ forms
// ─────────────────────────────────────────────────────────────────
function drawGoku(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const form   = fighter.currentForm || "base"

  // Aura color by form
  const auraColors = {
    base:          null,
    ssj1:          "#ffd700",
    ssj2:          "#ffe44d",
    ssj3:          "#ffec80",
    ssblue:        "#60d0ff",
    ultraInstinct: "#e0e0ff"
  }
  const auraColor = auraColors[form]
  if (auraColor) drawAura(ctx, x, y, w, h, auraColor, 0.22, 16)

  // Body — orange gi
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#f97316")
  bodyGrad.addColorStop(0.5, "#ea580c")
  bodyGrad.addColorStop(1, "#c2410c")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // Gi belt — blue stripe
  ctx.fillStyle = "#1d4ed8"
  ctx.fillRect(x + 4, y + h * 0.55, w - 8, h * 0.08)

  // Wristbands
  ctx.fillStyle = "#1d4ed8"
  ctx.fillRect(x,         y + h * 0.65, w * 0.18, h * 0.12)
  ctx.fillRect(x + w - w * 0.18, y + h * 0.65, w * 0.18, h * 0.12)

  // Boots
  ctx.fillStyle = "#1e3a8a"
  ctx.fillRect(x + 4,       y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"  // skin
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Hair — spiky black (different color in SSJ forms)
  const hairColor = form === "base" ? "#1a1a1a"
    : form === "ultraInstinct" ? "#e0e0ff"
    : "#ffd700"

  ctx.fillStyle = hairColor
  // Main hair mass above head
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()
  // Spikes
  const spikeCount = 5
  for (let i = 0; i < spikeCount; i++) {
    const angle = Math.PI + (i / (spikeCount - 1)) * Math.PI
    const sx    = hx + Math.cos(angle) * h * 0.1
    const sy    = hy - h * 0.06 + Math.sin(angle) * h * 0.1
    const tipX  = hx + Math.cos(angle) * h * 0.19
    const tipY  = hy - h * 0.06 + Math.sin(angle) * h * 0.19
    ctx.beginPath()
    ctx.moveTo(sx - 4, sy)
    ctx.lineTo(tipX, tipY)
    ctx.lineTo(sx + 4, sy)
    ctx.fill()
  }

  // Eyes
  ctx.fillStyle = "#1a1a1a"
  const eyeOff  = facing >= 0 ? 4 : -4
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 2, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // SSJ3 forehead hair
  if (form === "ssj3") {
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(hx - 6, hy - h * 0.15, 12, h * 0.06)
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Goku", hx, y, auraColor || "#f97316")
  drawFacingDot(ctx, x, y, w, facing, "#fff")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── NARUTO ────────────────────────────────────────────────────────
// Orange jumpsuit, blonde spiky hair, whisker marks, Sage Mode toad eyes
// ─────────────────────────────────────────────────────────────────
function drawNaruto(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const form   = fighter.currentForm || "base"

  if (form === "kcmMode" || form === "baryonMode") {
    drawAura(ctx, x, y, w, h, "#ff6b00", 0.25, 18)
  } else if (form === "sageMode") {
    drawAura(ctx, x, y, w, h, "#a3e635", 0.2, 14)
  }

  // Body — orange jumpsuit
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#fb923c")
  bodyGrad.addColorStop(1, "#ea580c")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // Jacket zipper stripe
  ctx.fillStyle = "#fdba74"
  ctx.fillRect(x + w / 2 - 3, y + h * 0.22, 6, h * 0.42)

  // Scroll/pouch on side
  ctx.fillStyle = "#92400e"
  ctx.fillRect(x + (facing >= 0 ? w - 14 : 0), y + h * 0.52, 14, 18)

  // Boots
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillStyle = "#fdba74"  // boot straps
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, 4)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, 4)

  // Head
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Headband
  ctx.fillStyle = "#6b7280"
  ctx.fillRect(hx - h * 0.11, hy - h * 0.13, h * 0.22, h * 0.05)
  ctx.fillStyle = "#d1d5db"
  ctx.fillRect(hx - 8, hy - h * 0.125, 16, h * 0.04)  // leaf symbol placeholder

  // Hair — blonde spiky
  const hairColor = form === "baryonMode" ? "#ff8800"
    : form === "sageMode" ? "#a3e635"
    : "#fbbf24"
  ctx.fillStyle = hairColor
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.07, h * 0.1, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI * 0.2 + i * (Math.PI * 0.2)
    ctx.beginPath()
    ctx.moveTo(hx + Math.cos(Math.PI + angle) * h * 0.09, hy - h * 0.07 + Math.sin(Math.PI + angle) * h * 0.09)
    ctx.lineTo(hx + Math.cos(Math.PI + angle) * h * 0.18, hy - h * 0.07 + Math.sin(Math.PI + angle) * h * 0.18)
    ctx.lineTo(hx + Math.cos(Math.PI + angle + 0.3) * h * 0.09, hy - h * 0.07 + Math.sin(Math.PI + angle + 0.3) * h * 0.09)
    ctx.fill()
  }

  // Eyes — normal blue, or orange rings in Sage Mode
  const eyeColor = form === "sageMode" || form === "baryonMode" ? "#f97316" : "#2563eb"
  ctx.fillStyle  = eyeColor
  const eyeOff   = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 3, 0, Math.PI * 2)
  ctx.fill()

  // Whisker marks (3 lines each cheek)
  ctx.strokeStyle = "#92400e"
  ctx.lineWidth   = 1
  for (let i = -1; i <= 1; i++) {
    const wOff = facing >= 0 ? -8 : 8
    ctx.beginPath()
    ctx.moveTo(hx + wOff, hy + i * 3)
    ctx.lineTo(hx + wOff - facing * 8, hy + i * 3)
    ctx.stroke()
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Naruto", hx, y, hairColor)
  drawFacingDot(ctx, x, y, w, facing, "#fff")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── GOJO SATORU ───────────────────────────────────────────────────
// White uniform, blindfold, infinity shimmer, blue/red/purple aura
// ─────────────────────────────────────────────────────────────────
function drawGojo(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1

  if (fighter.infinityActive) {
    drawAura(ctx, x, y, w, h, "#a5f3fc", 0.3, 22)
    // Infinity ripple ring
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth   = 3
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, w * 0.75, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Body — white jujutsu uniform
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#f0f9ff")
  bodyGrad.addColorStop(0.5, "#e0f2fe")
  bodyGrad.addColorStop(1, "#bae6fd")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // Uniform collar & lapels
  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 5, y + h * 0.22)
  ctx.lineTo(x + w / 2,     y + h * 0.3)
  ctx.lineTo(x + w / 2 + 5, y + h * 0.22)
  ctx.stroke()

  // Belt
  ctx.fillStyle = "#0ea5e9"
  ctx.fillRect(x + 4, y + h * 0.54, w - 8, h * 0.06)

  // Boots
  ctx.fillStyle = "#0f172a"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head (skin)
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // White/silver hair
  ctx.fillStyle = "#f1f5f9"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()
  // Flowing side hair
  ctx.fillRect(hx - h * 0.1, hy - h * 0.06, h * 0.07, h * 0.1)
  ctx.fillRect(hx + h * 0.03, hy - h * 0.06, h * 0.07, h * 0.1)

  // Blindfold — black strip across eyes
  ctx.fillStyle = "#0f172a"
  ctx.fillRect(hx - h * 0.1, hy - h * 0.025, h * 0.2, h * 0.04)

  // Six eyes glow through blindfold when infinity is active
  if (fighter.infinityActive) {
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle   = "#38bdf8"
    ctx.beginPath()
    ctx.arc(hx - 4, hy - h * 0.005, 2.5, 0, Math.PI * 2)
    ctx.arc(hx + 4, hy - h * 0.005, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Gojo", hx, y, "#38bdf8")
  drawFacingDot(ctx, x, y, w, facing, "#0ea5e9")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── MEGUMI / MAHORAGA ─────────────────────────────────────────────
// Dark uniform, shadow hands detail; transforms into Mahoraga wheel
// ─────────────────────────────────────────────────────────────────
function drawMegumi(ctx, x, y, w, h, fighter) {
  const facing    = fighter.facing ?? 1
  const isMahoraga = !!fighter.isMahoraga

  if (isMahoraga) {
    drawMahoraga(ctx, x, y, w, h, fighter)
    return
  }

  // Body — dark jujutsu uniform
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#1e293b")
  bodyGrad.addColorStop(1, "#0f172a")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // White uniform stripe
  ctx.fillStyle = "#e2e8f0"
  ctx.fillRect(x + w / 2 - 3, y + h * 0.22, 6, h * 0.36)

  // Belt
  ctx.fillStyle = "#334155"
  ctx.fillRect(x + 4, y + h * 0.52, w - 8, h * 0.06)

  // Boots
  ctx.fillStyle = "#0f172a"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Shadow hand effect (purple wisps from hands)
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.fillStyle   = "#7c3aed"
  ctx.beginPath()
  ctx.ellipse(x + 8, y + h * 0.72, 10, 6, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + w - 8, y + h * 0.72, 10, 6, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Head
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Dark spiky hair
  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.07, h * 0.1, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    const bx = hx - h * 0.08 + i * h * 0.08
    ctx.beginPath()
    ctx.moveTo(bx - 4, hy - h * 0.12)
    ctx.lineTo(bx,     hy - h * 0.21)
    ctx.lineTo(bx + 4, hy - h * 0.12)
    ctx.fill()
  }

  // Eyes — blue-grey
  ctx.fillStyle = "#475569"
  const eyeOff  = facing >= 0 ? 4 : -4
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 2, 2.5, 0, Math.PI * 2)
  ctx.fill()

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Megumi", hx, y, "#7c3aed")
  drawFacingDot(ctx, x, y, w, facing, "#7c3aed")
  drawShadow(ctx, x, y, w, h)
}

function drawMahoraga(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const cx     = x + w / 2
  const cy     = y + h / 2

  // Dark purple aura
  drawAura(ctx, x, y, w, h, "#6d28d9", 0.35, 22)

  // Body — dark imposing form (wider, taller feel via color treatment)
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#3b0764")
  bodyGrad.addColorStop(0.5, "#581c87")
  bodyGrad.addColorStop(1, "#1e1b4b")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.15, w, h * 0.85, 8)
  ctx.fill()

  // Eight-handled wheel on back (signature mark)
  ctx.save()
  ctx.strokeStyle = "#a78bfa"
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.7
  const wr = w * 0.28
  const wx = cx
  const wy = y + h * 0.38
  ctx.beginPath()
  ctx.arc(wx, wy, wr, 0, Math.PI * 2)
  ctx.stroke()
  // 8 spokes
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx + Math.cos(angle) * wr, wy + Math.sin(angle) * wr)
    ctx.stroke()
  }
  ctx.restore()

  // Head — more menacing, larger
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.11, h * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // Dark hair with purple sheen
  ctx.fillStyle = "#2e1065"
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.05, h * 0.11, Math.PI, 0)
  ctx.fill()

  // Glowing eyes — yellow
  ctx.fillStyle  = "#fbbf24"
  ctx.shadowBlur = 8
  ctx.shadowColor = "#fbbf24"
  const eyeOff  = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.arc(cx + eyeOff, y + h * 0.1, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Adaptation level marks (small tally marks on arm)
  const adaptTotal = Object.values(fighter.adaptationLevels || {}).reduce((a, b) => a + b, 0)
  ctx.fillStyle = "#a78bfa"
  for (let i = 0; i < Math.floor(adaptTotal); i++) {
    ctx.fillRect(x + 6 + i * 5, y + h * 0.62, 3, 10)
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Mahoraga", cx, y, "#a78bfa")
  drawFacingDot(ctx, x, y, w, facing, "#fbbf24")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── SUKUNA ────────────────────────────────────────────────────────
// Red tattoo marks, grey skin, four arms implied by extra shoulder marks
// ─────────────────────────────────────────────────────────────────
function drawSukuna(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1

  drawAura(ctx, x, y, w, h, "#dc2626", 0.18, 14)

  // Body — grey/pale cursed body
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#9ca3af")
  bodyGrad.addColorStop(1, "#6b7280")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // Tattoo lines (red geometric marks)
  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 2

  // Left arm tattoo
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 4, y + h * (0.3 + i * 0.1))
    ctx.lineTo(x + 16, y + h * (0.3 + i * 0.1))
    ctx.stroke()
  }
  // Right arm tattoo
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + w - 4, y + h * (0.3 + i * 0.1))
    ctx.lineTo(x + w - 16, y + h * (0.3 + i * 0.1))
    ctx.stroke()
  }
  // Chest tattoo
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 12, y + h * 0.32)
  ctx.lineTo(x + w / 2 + 12, y + h * 0.32)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h * 0.28)
  ctx.lineTo(x + w / 2, y + h * 0.44)
  ctx.stroke()

  // Hakama/robe bottom — dark red
  ctx.fillStyle = "#7f1d1d"
  roundRect(ctx, x + 2, y + h * 0.56, w - 4, h * 0.44, 6)
  ctx.fill()

  // Boots
  ctx.fillStyle = "#450a0a"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head — grey/pale skin
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#d1d5db"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Pink spiky hair
  ctx.fillStyle = "#fb7185"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.07, h * 0.1, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 5; i++) {
    const bx = hx - h * 0.1 + i * h * 0.05
    ctx.beginPath()
    ctx.moveTo(bx - 3, hy - h * 0.12)
    ctx.lineTo(bx,     hy - h * 0.22)
    ctx.lineTo(bx + 3, hy - h * 0.12)
    ctx.fill()
  }

  // Face tattoos
  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 1.5
  // Under eye lines
  const eyeOff = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.moveTo(hx + eyeOff - 4, hy + 3)
  ctx.lineTo(hx + eyeOff + 4, hy + 3)
  ctx.stroke()

  // Eyes — narrow, menacing
  ctx.fillStyle = "#dc2626"
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 3, 0, Math.PI * 2)
  ctx.fill()

  // Second set of eyes on cheeks (Sukuna's four-eyes look)
  ctx.fillStyle  = "#dc2626"
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(hx - eyeOff * 1.5, hy + 5, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Sukuna", hx, y, "#dc2626")
  drawFacingDot(ctx, x, y, w, facing, "#dc2626")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── OMOLOLU ───────────────────────────────────────────────────────
// Athletic dark-skinned fighter, analytical markings, ramp glow
// ─────────────────────────────────────────────────────────────────
function drawOmololu(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const ramp   = Math.min((fighter.damageMultiplier || 1) - 1, 0.5) / 0.5  // 0→1

  if (ramp > 0.1) {
    drawAura(ctx, x, y, w, h, `rgba(251,191,36,${ramp * 0.3})`, ramp * 0.25, 16)
  }

  // Body — dark athletic gear
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#1c1917")
  bodyGrad.addColorStop(0.5, "#292524")
  bodyGrad.addColorStop(1, "#1c1917")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  // Accent stripe — gold, gets brighter with ramp
  const stripeColor = `hsl(43, 96%, ${40 + ramp * 30}%)`
  ctx.fillStyle     = stripeColor
  ctx.fillRect(x + w * 0.35, y + h * 0.22, w * 0.08, h * 0.56)

  // Analysis glyphs on torso (faint lines representing data processing)
  ctx.save()
  ctx.strokeStyle = "#fbbf24"
  ctx.lineWidth   = 1
  ctx.globalAlpha = 0.25 + ramp * 0.4
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 18, y + h * (0.28 + i * 0.1))
    ctx.lineTo(x + w - 18, y + h * (0.28 + i * 0.1))
    ctx.stroke()
  }
  ctx.restore()

  // Shorts
  ctx.fillStyle = "#44403c"
  ctx.fillRect(x + 4, y + h * 0.6, w - 8, h * 0.28)

  // Boots/feet
  ctx.fillStyle = "#1c1917"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head — darker skin tone
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#92400e"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Close-cropped hair
  ctx.fillStyle = "#1c1917"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.04, h * 0.11, Math.PI, 0)
  ctx.fill()

  // Eyes — analytical, sharp
  ctx.fillStyle = "#fbbf24"
  const eyeOff  = facing >= 0 ? 4 : -4
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Ramp indicator marks on forearm
  const markCount = Math.floor(ramp * 5)
  ctx.fillStyle   = "#fbbf24"
  for (let i = 0; i < markCount; i++) {
    ctx.fillRect(x + 5, y + h * 0.65 + i * 5, 8, 3)
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Omololu", hx, y, stripeColor)
  drawFacingDot(ctx, x, y, w, facing, "#fbbf24")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// ── TOJI ──────────────────────────────────────────────────────────
// Scar on lip, sleeveless, muscular, weapon chain detail
// ─────────────────────────────────────────────────────────────────
function drawToji(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const surging = fighter.isUltimateActive

  if (surging) drawAura(ctx, x, y, w, h, "#f43f5e", 0.28, 20)

  // Body — tan skin, sleeveless
  const skinColor = "#d97706"

  // Arms (exposed, muscular — wider at shoulder)
  ctx.fillStyle = skinColor
  // Left arm
  roundRect(ctx, x - 4, y + h * 0.24, w * 0.2, h * 0.46, 6)
  ctx.fill()
  // Right arm
  roundRect(ctx, x + w - w * 0.2 + 4, y + h * 0.24, w * 0.2, h * 0.46, 6)
  ctx.fill()

  // Torso — sleeveless black top
  ctx.fillStyle = "#1c1917"
  roundRect(ctx, x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.45, 8)
  ctx.fill()

  // Torn/open shirt texture
  ctx.strokeStyle = "#44403c"
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 8, y + h * 0.22)
  ctx.lineTo(x + w / 2,     y + h * 0.36)
  ctx.lineTo(x + w / 2 + 8, y + h * 0.22)
  ctx.stroke()

  // Weapon chain (coiled at waist)
  ctx.strokeStyle = "#9ca3af"
  ctx.lineWidth   = 2
  const chainX   = x + (facing >= 0 ? w - 10 : 10)
  ctx.beginPath()
  ctx.arc(chainX, y + h * 0.56, 8, 0, Math.PI * 2)
  ctx.stroke()

  // Pants/dark trousers
  ctx.fillStyle = "#292524"
  ctx.fillRect(x + 4, y + h * 0.62, w - 8, h * 0.38)

  // Boots
  ctx.fillStyle = "#1c1917"
  ctx.fillRect(x + 4,               y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head — tan skin
  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = skinColor
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  // Dark swept-back hair
  ctx.fillStyle = "#1c1917"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()
  // Swept back
  ctx.beginPath()
  ctx.moveTo(hx - h * 0.1, hy - h * 0.08)
  ctx.quadraticCurveTo(hx - h * 0.15, hy - h * 0.18, hx + h * 0.1, hy - h * 0.14)
  ctx.fill()

  // Eyes — sharp, half-lidded
  ctx.fillStyle = "#1c1917"
  const eyeOff  = facing >= 0 ? 5 : -5
  ctx.fillRect(hx + eyeOff - 5, hy - 3, 10, 4)

  // Mouth scar (signature)
  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.moveTo(hx - 3, hy + 5)
  ctx.lineTo(hx + 1, hy + 8)
  ctx.stroke()

  // Speed blur lines when dashing
  if ((fighter.dashTimer || 0) > 0 || (Math.abs(fighter.vx || 0) > 8)) {
    ctx.save()
    ctx.strokeStyle = "#f43f5e"
    ctx.lineWidth   = 2
    ctx.globalAlpha = 0.4
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(x - facing * 20, y + h * 0.3 + i * h * 0.15)
      ctx.lineTo(x - facing * 50, y + h * 0.3 + i * h * 0.15)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Toji", hx, y, "#f43f5e")
  drawFacingDot(ctx, x, y, w, facing, "#f43f5e")
  drawShadow(ctx, x, y, w, h)
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT — drawCharacter()
// Called from ui.js instead of the generic box
// ─────────────────────────────────────────────────────────────────
export function drawCharacter(ctx, fighter) {
  if (!fighter || !ctx) return

  const x = fighter.x ?? 0
  const y = fighter.y ?? 0
  const w = fighter.w ?? fighter.width  ?? 60
  const h = fighter.h ?? fighter.height ?? 110

  const key = (fighter.rosterKey || fighter.id || fighter.name || "").toLowerCase()

  ctx.save()

  switch (key) {
    case "goku":    drawGoku(ctx, x, y, w, h, fighter);    break
    case "naruto":  drawNaruto(ctx, x, y, w, h, fighter);  break
    case "gojo":    drawGojo(ctx, x, y, w, h, fighter);    break
    case "megumi":  drawMegumi(ctx, x, y, w, h, fighter);  break
    case "sukuna":  drawSukuna(ctx, x, y, w, h, fighter);  break
    case "omololu": drawOmololu(ctx, x, y, w, h, fighter); break
    case "toji":    drawToji(ctx, x, y, w, h, fighter);    break
    default:        drawFallback(ctx, x, y, w, h, fighter); break
  }

  ctx.restore()
}

// Generic fallback for any character not in the starter 7
function drawFallback(ctx, x, y, w, h, fighter) {
  const color = fighter.color || (fighter.side === "p1" ? "#3b82f6" : "#ef4444")
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.3)"
  ctx.lineWidth   = 2
  roundRect(ctx, x, y, w, h, 12)
  ctx.stroke()

  // Head
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h * 0.12, h * 0.1, 0, Math.PI * 2)
  ctx.fill()

  drawNameTag(ctx, fighter.name || "?", x + w / 2, y, "#ffffff")
  drawShadow(ctx, x, y, w, h)
}
