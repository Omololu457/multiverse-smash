// fighters.js
// Unique procedural canvas drawings for each character.
// Called from ui.js drawFighter() — no sprites required.
// Each fighter has a distinct silhouette, color palette, and detail marks.
//
// ★ BEN 10 is now baked into THIS file (bottom section). Delete ben10.js and point
//   any imports at "./fighters.js" instead. Exports: BEN10_ALIEN_POOL,
//   DEFAULT_OMNITRIX, ben10Characters, createOmnitrixState, applyAlien,
//   switchAlien, selectAlienSlot, updateOmnitrix, setupBen10, drawBen10.

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

function drawShadow(ctx, x, y, w, h) {
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.fillStyle   = "#000"
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h + 6, w * 0.45, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

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

function drawHitFlash(ctx, x, y, w, h, flash) {
  if (!flash || flash <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, flash / 6) * 0.85
  ctx.fillStyle   = "#ffffff"
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.restore()
}

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
// ─────────────────────────────────────────────────────────────────
function drawGoku(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const form   = fighter.currentForm || "base"

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

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#f97316")
  bodyGrad.addColorStop(0.5, "#ea580c")
  bodyGrad.addColorStop(1, "#c2410c")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  ctx.fillStyle = "#1d4ed8"
  ctx.fillRect(x + 4, y + h * 0.55, w - 8, h * 0.08)

  ctx.fillStyle = "#1d4ed8"
  ctx.fillRect(x, y + h * 0.65, w * 0.18, h * 0.12)
  ctx.fillRect(x + w - w * 0.18, y + h * 0.65, w * 0.18, h * 0.12)

  ctx.fillStyle = "#1e3a8a"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  const hairColor = form === "base" ? "#1a1a1a"
    : form === "ultraInstinct" ? "#e0e0ff"
    : "#ffd700"

  ctx.fillStyle = hairColor
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()

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

  ctx.fillStyle = "#1a1a1a"
  const eyeOff  = facing >= 0 ? 4 : -4
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 2, 2.5, 0, Math.PI * 2)
  ctx.fill()

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
// ─────────────────────────────────────────────────────────────────
function drawNaruto(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const form   = fighter.currentForm || "base"

  if (form === "kcmMode" || form === "baryonMode") {
    drawAura(ctx, x, y, w, h, "#ff6b00", 0.25, 18)
  } else if (form === "sageMode") {
    drawAura(ctx, x, y, w, h, "#a3e635", 0.2, 14)
  }

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#fb923c")
  bodyGrad.addColorStop(1, "#ea580c")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  ctx.fillStyle = "#fdba74"
  ctx.fillRect(x + w / 2 - 3, y + h * 0.22, 6, h * 0.42)

  ctx.fillStyle = "#92400e"
  ctx.fillRect(x + (facing >= 0 ? w - 14 : 0), y + h * 0.52, 14, 18)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillStyle = "#fdba74"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, 4)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, 4)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#6b7280"
  ctx.fillRect(hx - h * 0.11, hy - h * 0.13, h * 0.22, h * 0.05)
  ctx.fillStyle = "#d1d5db"
  ctx.fillRect(hx - 8, hy - h * 0.125, 16, h * 0.04)

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

  const eyeColor = form === "sageMode" || form === "baryonMode" ? "#f97316" : "#2563eb"
  ctx.fillStyle  = eyeColor
  const eyeOff   = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 3, 0, Math.PI * 2)
  ctx.fill()

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
// ─────────────────────────────────────────────────────────────────
function drawGojo(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1

  if (fighter.infinityActive) {
    drawAura(ctx, x, y, w, h, "#a5f3fc", 0.3, 22)
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth   = 3
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, w * 0.75, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#f0f9ff")
  bodyGrad.addColorStop(0.5, "#e0f2fe")
  bodyGrad.addColorStop(1, "#bae6fd")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 5, y + h * 0.22)
  ctx.lineTo(x + w / 2, y + h * 0.3)
  ctx.lineTo(x + w / 2 + 5, y + h * 0.22)
  ctx.stroke()

  ctx.fillStyle = "#0ea5e9"
  ctx.fillRect(x + 4, y + h * 0.54, w - 8, h * 0.06)

  ctx.fillStyle = "#0f172a"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#f1f5f9"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(hx - h * 0.1, hy - h * 0.06, h * 0.07, h * 0.1)
  ctx.fillRect(hx + h * 0.03, hy - h * 0.06, h * 0.07, h * 0.1)

  ctx.fillStyle = "#0f172a"
  ctx.fillRect(hx - h * 0.1, hy - h * 0.025, h * 0.2, h * 0.04)

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
// ─────────────────────────────────────────────────────────────────
function drawMegumi(ctx, x, y, w, h, fighter) {
  const facing     = fighter.facing ?? 1
  const isMahoraga = !!fighter.isMahoraga

  if (isMahoraga) {
    drawMahoraga(ctx, x, y, w, h, fighter)
    return
  }

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#1e293b")
  bodyGrad.addColorStop(1, "#0f172a")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  ctx.fillStyle = "#e2e8f0"
  ctx.fillRect(x + w / 2 - 3, y + h * 0.22, 6, h * 0.36)

  ctx.fillStyle = "#334155"
  ctx.fillRect(x + 4, y + h * 0.52, w - 8, h * 0.06)

  ctx.fillStyle = "#0f172a"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

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

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.07, h * 0.1, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    const bx = hx - h * 0.08 + i * h * 0.08
    ctx.beginPath()
    ctx.moveTo(bx - 4, hy - h * 0.12)
    ctx.lineTo(bx, hy - h * 0.21)
    ctx.lineTo(bx + 4, hy - h * 0.12)
    ctx.fill()
  }

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

  drawAura(ctx, x, y, w, h, "#6d28d9", 0.35, 22)

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#3b0764")
  bodyGrad.addColorStop(0.5, "#581c87")
  bodyGrad.addColorStop(1, "#1e1b4b")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.15, w, h * 0.85, 8)
  ctx.fill()

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
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx + Math.cos(angle) * wr, wy + Math.sin(angle) * wr)
    ctx.stroke()
  }
  ctx.restore()

  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.11, h * 0.12, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#2e1065"
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.05, h * 0.11, Math.PI, 0)
  ctx.fill()

  ctx.fillStyle   = "#fbbf24"
  ctx.shadowBlur  = 8
  ctx.shadowColor = "#fbbf24"
  const eyeOff    = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.arc(cx + eyeOff, y + h * 0.1, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

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
// ─────────────────────────────────────────────────────────────────
function drawSukuna(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1

  drawAura(ctx, x, y, w, h, "#dc2626", 0.18, 14)

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#9ca3af")
  bodyGrad.addColorStop(1, "#6b7280")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 2

  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 4, y + h * (0.3 + i * 0.1))
    ctx.lineTo(x + 16, y + h * (0.3 + i * 0.1))
    ctx.stroke()
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + w - 4, y + h * (0.3 + i * 0.1))
    ctx.lineTo(x + w - 16, y + h * (0.3 + i * 0.1))
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 12, y + h * 0.32)
  ctx.lineTo(x + w / 2 + 12, y + h * 0.32)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h * 0.28)
  ctx.lineTo(x + w / 2, y + h * 0.44)
  ctx.stroke()

  ctx.fillStyle = "#7f1d1d"
  roundRect(ctx, x + 2, y + h * 0.56, w - 4, h * 0.44, 6)
  ctx.fill()

  ctx.fillStyle = "#450a0a"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#d1d5db"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#fb7185"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.07, h * 0.1, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 5; i++) {
    const bx = hx - h * 0.1 + i * h * 0.05
    ctx.beginPath()
    ctx.moveTo(bx - 3, hy - h * 0.12)
    ctx.lineTo(bx, hy - h * 0.22)
    ctx.lineTo(bx + 3, hy - h * 0.12)
    ctx.fill()
  }

  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 1.5
  const eyeOff    = facing >= 0 ? 5 : -5
  ctx.beginPath()
  ctx.moveTo(hx + eyeOff - 4, hy + 3)
  ctx.lineTo(hx + eyeOff + 4, hy + 3)
  ctx.stroke()

  ctx.fillStyle = "#dc2626"
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle   = "#dc2626"
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
// ─────────────────────────────────────────────────────────────────
function drawOmololu(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  const ramp   = Math.min((fighter.damageMultiplier || 1) - 1, 0.5) / 0.5

  if (ramp > 0.1) {
    drawAura(ctx, x, y, w, h, `rgba(251,191,36,${ramp * 0.3})`, ramp * 0.25, 16)
  }

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#1c1917")
  bodyGrad.addColorStop(0.5, "#292524")
  bodyGrad.addColorStop(1, "#1c1917")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10)
  ctx.fill()

  const stripeColor = `hsl(43, 96%, ${40 + ramp * 30}%)`
  ctx.fillStyle     = stripeColor
  ctx.fillRect(x + w * 0.35, y + h * 0.22, w * 0.08, h * 0.56)

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

  ctx.fillStyle = "#44403c"
  ctx.fillRect(x + 4, y + h * 0.6, w - 8, h * 0.28)

  ctx.fillStyle = "#1c1917"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = "#92400e"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#1c1917"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.04, h * 0.11, Math.PI, 0)
  ctx.fill()

  ctx.fillStyle = "#fbbf24"
  const eyeOff  = facing >= 0 ? 4 : -4
  ctx.beginPath()
  ctx.arc(hx + eyeOff, hy - 1, 2.5, 0, Math.PI * 2)
  ctx.fill()

  const markCount = Math.floor(ramp * 5)
  ctx.fillStyle = "#fbbf24"
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
// ─────────────────────────────────────────────────────────────────
function drawToji(ctx, x, y, w, h, fighter) {
  const facing  = fighter.facing ?? 1
  const surging = fighter.isUltimateActive

  if (surging) drawAura(ctx, x, y, w, h, "#f43f5e", 0.28, 20)

  const skinColor = "#d97706"

  ctx.fillStyle = skinColor
  roundRect(ctx, x - 4, y + h * 0.24, w * 0.2, h * 0.46, 6)
  ctx.fill()
  roundRect(ctx, x + w - w * 0.2 + 4, y + h * 0.24, w * 0.2, h * 0.46, 6)
  ctx.fill()

  ctx.fillStyle = "#1c1917"
  roundRect(ctx, x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.45, 8)
  ctx.fill()

  ctx.strokeStyle = "#44403c"
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 8, y + h * 0.22)
  ctx.lineTo(x + w / 2, y + h * 0.36)
  ctx.lineTo(x + w / 2 + 8, y + h * 0.22)
  ctx.stroke()

  ctx.strokeStyle = "#9ca3af"
  ctx.lineWidth   = 2
  const chainX = x + (facing >= 0 ? w - 10 : 10)
  ctx.beginPath()
  ctx.arc(chainX, y + h * 0.56, 8, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = "#292524"
  ctx.fillRect(x + 4, y + h * 0.62, w - 8, h * 0.38)

  ctx.fillStyle = "#1c1917"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  const hx = x + w / 2
  const hy = y + h * 0.12
  ctx.fillStyle = skinColor
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#1c1917"
  ctx.beginPath()
  ctx.arc(hx, hy - h * 0.06, h * 0.1, Math.PI, 0)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(hx - h * 0.1, hy - h * 0.08)
  ctx.quadraticCurveTo(hx - h * 0.15, hy - h * 0.18, hx + h * 0.1, hy - h * 0.14)
  ctx.fill()

  ctx.fillStyle = "#1c1917"
  const eyeOff  = facing >= 0 ? 5 : -5
  ctx.fillRect(hx + eyeOff - 5, hy - 3, 10, 4)

  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.moveTo(hx - 3, hy + 5)
  ctx.lineTo(hx + 1, hy + 8)
  ctx.stroke()

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
// ─────────────────────────────────────────────────────────────────
export function drawCharacter(ctx, fighter) {
  if (!fighter || !ctx) return

  const x = fighter.x ?? 0
  const y = fighter.y ?? 0
  const w = fighter.w ?? fighter.width ?? 60
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
    case "ben10":   drawBen10(ctx, fighter);               break   // ★ Ben 10
    default:        drawFallback(ctx, x, y, w, h, fighter); break
  }

  _drawCombatFlashes(ctx, x, y, w, h, fighter)
  ctx.restore()
}

function drawFallback(ctx, x, y, w, h, fighter) {
  const color = fighter.color || (fighter.side === "p1" ? "#3b82f6" : "#ef4444")
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.3)"
  ctx.lineWidth   = 2
  roundRect(ctx, x, y, w, h, 12)
  ctx.stroke()

  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h * 0.12, h * 0.1, 0, Math.PI * 2)
  ctx.fill()

  drawNameTag(ctx, fighter.name || "?", x + w / 2, y, "#ffffff")
  drawShadow(ctx, x, y, w, h)
}

function _drawCombatFlashes(ctx, x, y, w, h, fighter) {
  const cx = x + w / 2
  const cy = y + h / 2
  const r  = Math.max(w, h) * 0.6

  if ((fighter.parryFlash || 0) > 0) {
    const alpha = fighter.parryFlash / 12
    ctx.save()
    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth   = 4
    ctx.shadowBlur  = 16
    ctx.shadowColor = "#38bdf8"
    ctx.beginPath()
    ctx.arc(cx, cy, r * (1 + (1 - alpha) * 0.4), 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = alpha * 0.5
    ctx.lineWidth   = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur  = 0
    ctx.restore()
  }

  if ((fighter.armorFlash || 0) > 0) {
    const alpha = fighter.armorFlash / 8
    ctx.save()
    ctx.globalAlpha = alpha * 0.85
    ctx.strokeStyle = "#fbbf24"
    ctx.lineWidth   = 5
    ctx.shadowBlur  = 18
    ctx.shadowColor = "#fbbf24"
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = alpha * 0.18
    ctx.fillStyle   = "#fbbf24"
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur  = 0
    ctx.restore()
  }

  if ((fighter.clashFlash || 0) > 0) {
    const alpha = fighter.clashFlash / 10
    ctx.save()
    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth   = 4
    ctx.shadowBlur  = 12
    ctx.shadowColor = "#ffffff"
    const pad = 6
    _roundRectStroke(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, 10)
    ctx.shadowBlur = 0
    ctx.restore()
  }

  if ((fighter.invulnTimer || 0) > 0 && (fighter.colorFlash || 0) > 0) {
    const alpha = Math.min(1, fighter.invulnTimer / 18) * 0.35
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle   = "#ffffff"
    _roundRectFill(ctx, x, y, w, h, 12)
    ctx.restore()
  }
}

function _roundRectStroke(ctx, x, y, w, h, r = 10) {
  _rr(ctx, x, y, w, h, r)
  ctx.stroke()
}

function _roundRectFill(ctx, x, y, w, h, r = 10) {
  _rr(ctx, x, y, w, h, r)
  ctx.fill()
}

function _rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ═════════════════════════════════════════════════════════════════
// ★★★ BEN 10 — OMNITRIX SYSTEM (was ben10.js) ★★★
// Pick "Ben 10" once; a button cycles his 5 aliens, each with its own moveset.
// Setup / per-frame update / switch-button are handled automatically inside
// physics.js, so no game.js edits are required.
// ═════════════════════════════════════════════════════════════════

const FRAME_PROFILES = {
  speed:   { l: [3, 2, 7],  h: [6, 3, 13], u: [5, 3, 12], a: [4, 2, 8],  d: [6, 3, 11] },
  rush:    { l: [4, 3, 8],  h: [8, 4, 16], u: [7, 4, 15], a: [5, 3, 9],  d: [8, 4, 13] },
  brawler: { l: [5, 3, 10], h: [9, 4, 18], u: [8, 4, 16], a: [5, 3, 10], d: [9, 4, 14] },
  zoner:   { l: [5, 3, 11], h: [9, 4, 19], u: [8, 4, 17], a: [5, 3, 10], d: [9, 4, 15] },
  heavy:   { l: [6, 3, 12], h: [11, 5, 20], u: [9, 4, 18], a: [6, 3, 11], d: [10, 4, 16] },
  titan:   { l: [8, 4, 16], h: [14, 6, 26], u: [12, 5, 24], a: [8, 4, 15], d: [13, 5, 22] }
}

const BASE_DMG = { l: 42, h: 85, u: 68, a: 56, d: 78 }

function _benKeyify(s) {
  return String(s).replace(/[^a-z0-9]/gi, "").replace(/^./, c => c.toLowerCase())
}

function mkAlien(cfg) {
  const {
    name, color, role = "brawler",
    hp = 1000, spd = 7, jumps = 2, jump = 22, weight = "medium",
    dmg = 1.0, sizeW, sizeH,
    special = {}, special2 = null,
    ult = {}, flags = {}
  } = cfg

  const fp = FRAME_PROFILES[role] || FRAME_PROFILES.brawler
  const D = (k) => Math.round(BASE_DMG[k] * dmg)
  const armor = !!flags.armor
  const spikeKy = flags.bigSpike ? 13 : 11

  const basic_attacks = {
    light:    { damage: D("l"), startup: fp.l[0], active: fp.l[1], recovery: fp.l[2], hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: D("h"), startup: fp.h[0], active: fp.h[1], recovery: fp.h[2], hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: armor },
    up:       { damage: D("u"), startup: fp.u[0], active: fp.u[1], recovery: fp.u[2], hitstun: 20, knockbackX: 2, knockbackY: -8 },
    air:      { damage: D("a"), startup: fp.a[0], active: fp.a[1], recovery: fp.a[2], hitstun: 13, knockbackX: 3, knockbackY: -2 },
    down_air: { damage: D("d"), startup: fp.d[0], active: fp.d[1], recovery: fp.d[2], hitstun: 18, knockbackX: 1, knockbackY: spikeKy }
  }

  const mkSpecial = (sp) => ({
    name: sp.name || "Special",
    damage: sp.damage || 100,
    isSpecial: true,
    category: "special",
    cost: sp.cost ?? 20,
    startup: sp.startup ?? 11,
    active: sp.active ?? 5,
    recovery: sp.recovery ?? 20,
    hitstun: sp.hitstun ?? 20,
    knockbackX: sp.knockbackX ?? 8,
    knockbackY: sp.knockbackY ?? -1,
    rangeX: sp.ranged ? 180 : 80,
    rangeY: 50,
    superArmor: !!sp.armor,
    projectileId: sp.projectileId || null,
    effect: sp.effect || ""
  })

  const specials = {}
  if (special && special.name) specials[_benKeyify(special.name)] = mkSpecial(special)
  if (special2 && special2.name) specials[_benKeyify(special2.name)] = mkSpecial(special2)

  const ultimate = {
    name: ult.name || "Ultimate",
    damage: ult.damage || 200,
    isUltimate: true,
    category: "ultimate",
    cost: ult.cost ?? 100,
    startup: ult.startup ?? 18,
    active: ult.active ?? 8,
    recovery: ult.recovery ?? 28,
    effect: ult.effect || ""
  }

  return {
    name, color,
    health: hp, maxHealth: hp,
    speed: spd, jump,
    maxEnergy: 100, energyType: "omnitrix", weight,
    stats: { maxHealth: hp, speed: spd, maxJumps: jumps, jumpPower: Math.round(jump), weight, sizeW: sizeW || null, sizeH: sizeH || null },
    basic_attacks, specials, ultimate
  }
}

export const BEN10_ALIEN_POOL = {
  heatblast:  mkAlien({ name: "Heatblast", color: "#f97316", role: "zoner", hp: 1000, spd: 7, dmg: 1.0,
                        special: { name: "Fireball", ranged: true, damage: 110, cost: 25, projectileId: "heatblast_fire" }, ult: { name: "Supernova", damage: 220 } }),
  fourarms:   mkAlien({ name: "Four Arms", color: "#dc2626", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 19, dmg: 1.25, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Quad Slam", damage: 130, cost: 25, armor: true }, ult: { name: "Ground Pound", damage: 240 } }),
  xlr8:       mkAlien({ name: "XLR8", color: "#0ea5e9", role: "speed", hp: 900, spd: 10, jumps: 3, jump: 23, dmg: 0.75, weight: "light",
                        special: { name: "Dash Strike", damage: 80, cost: 15 }, ult: { name: "Sonic Blitz", damage: 180, active: 10 } }),
  diamondhead:mkAlien({ name: "Diamondhead", color: "#22d3ee", role: "zoner", hp: 1100, spd: 6, dmg: 1.0, weight: "heavy",
                        special: { name: "Shard Barrage", ranged: true, damage: 100, cost: 20, projectileId: "diamond_shard" }, ult: { name: "Crystal Storm", damage: 210 } }),
  wildmutt:   mkAlien({ name: "Wildmutt", color: "#ea580c", role: "rush", hp: 1000, spd: 9, dmg: 0.9,
                        special: { name: "Pounce", damage: 95, cost: 15, knockbackY: -3 }, ult: { name: "Feral Frenzy", damage: 190, active: 10 } }),

  greymatter: mkAlien({ name: "Grey Matter", color: "#94a3b8", role: "speed", hp: 820, spd: 9, jumps: 3, jump: 24, dmg: 0.62, weight: "light", sizeW: 44, sizeH: 90,
                        special: { name: "Sabotage", damage: 72, cost: 15 }, ult: { name: "Mastermind", damage: 170, active: 8 } }),
  feedback:   mkAlien({ name: "Feedback", color: "#0891b2", role: "zoner", hp: 980, spd: 8, dmg: 0.95,
                        special: { name: "Energy Discharge", ranged: true, damage: 110, cost: 22, effect: "absorbs + fires energy" }, ult: { name: "Overload", damage: 210 } }),
  upgrade:    mkAlien({ name: "Upgrade", color: "#16a34a", role: "zoner", hp: 1050, spd: 7, dmg: 1.0,
                        special: { name: "Plasma Beam", ranged: true, damage: 105, cost: 22, projectileId: "upgrade_beam" }, ult: { name: "Tech Overload", damage: 205 } }),
  alienx:     mkAlien({ name: "Alien X", color: "#1e293b", role: "brawler", hp: 1400, spd: 7, dmg: 1.4, flags: { armor: true }, weight: "heavy",
                        special: { name: "Reality Warp", damage: 150, cost: 30, armor: true, knockbackY: -6 }, ult: { name: "Erasure", damage: 300, startup: 22, recovery: 32, effect: "omnipotent — balanced by long startup" } }),
  clockwork:  mkAlien({ name: "Clockwork", color: "#65a30d", role: "zoner", hp: 1050, spd: 5, dmg: 0.95, weight: "heavy",
                        special: { name: "Time Ray", ranged: true, damage: 100, cost: 25, effect: "slows target" }, ult: { name: "Time Stop", damage: 200, effect: "freezes opponent briefly" } }),
  brainstorm: mkAlien({ name: "Brainstorm", color: "#7c3aed", role: "zoner", hp: 960, spd: 6, dmg: 0.95,
                        special: { name: "Lightning Storm", ranged: true, damage: 115, cost: 25, projectileId: "brainstorm_bolt" }, ult: { name: "Mind Surge", damage: 205 } }),
  ampfibian:  mkAlien({ name: "Ampfibian", color: "#3b82f6", role: "speed", hp: 930, spd: 9, jumps: 3, jump: 23, dmg: 0.8, weight: "light",
                        special: { name: "Shock Pulse", ranged: true, damage: 95, cost: 18 }, ult: { name: "Electro Cyclone", damage: 185, active: 10 } }),
  gravattack: mkAlien({ name: "Gravattack", color: "#9333ea", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 18, dmg: 1.2, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Gravity Crush", damage: 130, cost: 28, armor: true, knockbackY: -7 }, ult: { name: "Black Hole", damage: 240, effect: "pulls + crushes" } }),
  lodestar:   mkAlien({ name: "Lodestar", color: "#f59e0b", role: "brawler", hp: 1100, spd: 6, dmg: 1.0, flags: { armor: true },
                        special: { name: "Magnetic Pull", ranged: true, damage: 100, cost: 22, effect: "drags opponent in" }, ult: { name: "Polarity Storm", damage: 210 } }),
  gutrot:     mkAlien({ name: "Gutrot", color: "#84cc16", role: "zoner", hp: 1000, spd: 6, dmg: 0.9,
                        special: { name: "Gas Bomb", ranged: true, damage: 100, cost: 22, effect: "lingering chemical damage" }, ult: { name: "Toxic Cloud", damage: 200 } }),
  atomix:     mkAlien({ name: "Atomix", color: "#22c55e", role: "heavy", hp: 1300, spd: 5, jumps: 1, jump: 18, dmg: 1.35, flags: { armor: true }, weight: "heavy", sizeW: 72, sizeH: 124,
                        special: { name: "Atomic Slam", damage: 140, cost: 28, armor: true }, ult: { name: "Nucleo Fusion Cannon", damage: 260, startup: 20 } }),
  bloxx:      mkAlien({ name: "Bloxx", color: "#f97316", role: "brawler", hp: 1200, spd: 6, dmg: 1.0, flags: { armor: true }, weight: "heavy",
                        special: { name: "Block Cannon", ranged: true, damage: 100, cost: 20 }, ult: { name: "Fortress Smash", damage: 220, armor: true } }),
  jetray:     mkAlien({ name: "Jetray", color: "#ef4444", role: "speed", hp: 920, spd: 10, jumps: 3, jump: 24, dmg: 0.8, weight: "light",
                        special: { name: "Neuroshock", ranged: true, damage: 100, cost: 20, projectileId: "jetray_blast" }, ult: { name: "Solar Dive", damage: 190 } }),
  chromastone:mkAlien({ name: "Chromastone", color: "#a855f7", role: "zoner", hp: 1050, spd: 6, dmg: 1.0,
                        special: { name: "Ultraviolet Beam", ranged: true, damage: 110, cost: 24, effect: "absorbs energy attacks" }, ult: { name: "Prism Burst", damage: 210 } }),
  waybig:     mkAlien({ name: "Way Big", color: "#dc2626", role: "titan", hp: 1500, spd: 4, jumps: 1, jump: 16, dmg: 1.6, flags: { armor: true, bigSpike: true }, weight: "heavy", sizeW: 92, sizeH: 150,
                        special: { name: "Cosmic Slam", damage: 160, cost: 30, armor: true }, ult: { name: "Cosmic Ray", damage: 320, ranged: true, startup: 22, recovery: 32 } }),
  juryrigg:   mkAlien({ name: "Jury Rigg", color: "#b91c1c", role: "speed", hp: 860, spd: 10, jumps: 3, jump: 24, dmg: 0.6, weight: "light", sizeW: 46, sizeH: 92,
                        special: { name: "Sabotage Frenzy", damage: 75, cost: 15, effect: "breaks projectiles" }, ult: { name: "Demolition", damage: 175, active: 10 } }),
  nanomech:   mkAlien({ name: "Nanomech", color: "#10b981", role: "speed", hp: 840, spd: 9, jumps: 3, jump: 24, dmg: 0.7, weight: "light", sizeW: 44, sizeH: 88,
                        special: { name: "Energy Pellets", ranged: true, damage: 90, cost: 16 }, ult: { name: "Nano Barrage", damage: 175, active: 10 } }),
  eyeguy:     mkAlien({ name: "Eye Guy", color: "#16a34a", role: "zoner", hp: 1000, spd: 6, dmg: 0.95,
                        special: { name: "Eye Beams", ranged: true, damage: 105, cost: 22 }, ult: { name: "Mega Eye Blast", damage: 210 } }),
  fasttrack:  mkAlien({ name: "Fasttrack", color: "#2563eb", role: "speed", hp: 950, spd: 10, jumps: 2, dmg: 0.85,
                        special: { name: "Speed Strike", damage: 85, cost: 15 }, ult: { name: "Hyper Rush", damage: 185, active: 10 } }),
  rath:       mkAlien({ name: "Rath", color: "#ea580c", role: "rush", hp: 1150, spd: 8, dmg: 1.1, flags: { armor: true },
                        special: { name: "Lariat Grab", damage: 120, cost: 22, armor: true }, ult: { name: "Tiger Rampage", damage: 220, active: 10 } }),
  armodrillo: mkAlien({ name: "Armodrillo", color: "#ca8a04", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 18, dmg: 1.2, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Drill Quake", damage: 130, cost: 26, armor: true }, ult: { name: "Seismic Pound", damage: 240 } }),
  nrg:        mkAlien({ name: "NRG", color: "#f43f5e", role: "heavy", hp: 1300, spd: 5, dmg: 1.0, flags: { armor: true }, weight: "heavy",
                        special: { name: "Radiation Beam", ranged: true, damage: 105, cost: 22 }, ult: { name: "Meltdown", damage: 220 } }),
  toepick:    mkAlien({ name: "Toepick", color: "#475569", role: "brawler", hp: 1000, spd: 6, dmg: 0.9,
                        special: { name: "Terror Reveal", damage: 90, cost: 25, effect: "stuns with fear" }, ult: { name: "Nightmare", damage: 200, effect: "fear lockdown" } }),
  kickinhawk: mkAlien({ name: "Kickin Hawk", color: "#d97706", role: "rush", hp: 1050, spd: 9, dmg: 1.0,
                        special: { name: "Talon Combo", damage: 100, cost: 18 }, ult: { name: "Sky High Kick", damage: 205 } }),
  whampire:   mkAlien({ name: "Whampire", color: "#7e22ce", role: "brawler", hp: 1050, spd: 8, dmg: 0.95,
                        special: { name: "Corrupting Bite", damage: 95, cost: 20, effect: "lifesteal — needs a hook in combat.js" }, ult: { name: "Bat Swarm", damage: 200 } }),
  snareoh:    mkAlien({ name: "Snare-oh", color: "#eab308", role: "zoner", hp: 1050, spd: 6, dmg: 0.9,
                        special: { name: "Bandage Snare", ranged: true, damage: 100, cost: 22, effect: "restrains opponent" }, ult: { name: "Sarcophagus Trap", damage: 200 } }),
  buzzshock:  mkAlien({ name: "Buzzshock", color: "#06b6d4", role: "speed", hp: 880, spd: 10, jumps: 3, jump: 24, dmg: 0.7, weight: "light", sizeW: 46, sizeH: 92,
                        special: { name: "Electro Split", ranged: true, damage: 90, cost: 16 }, ult: { name: "Overcharge", damage: 180, active: 10 } }),
  cannonbolt: mkAlien({ name: "Cannonbolt", color: "#facc15", role: "heavy", hp: 1300, spd: 6, dmg: 1.05, flags: { armor: true, bigSpike: true }, weight: "heavy",
                        special: { name: "Roll Smash", damage: 120, cost: 20, armor: true, active: 8 }, ult: { name: "Wrecking Ball", damage: 230, active: 10 } }),
  ditto:      mkAlien({ name: "Ditto", color: "#0ea5e9", role: "speed", hp: 900, spd: 9, dmg: 0.8,
                        special: { name: "Clone Strike", damage: 90, cost: 18, effect: "duplicate assists the hit" }, ult: { name: "Swarm Tactics", damage: 185, active: 10 } }),
  astrodactyl:mkAlien({ name: "Astrodactyl", color: "#0d9488", role: "speed", hp: 960, spd: 10, jumps: 3, jump: 24, dmg: 0.85, weight: "light",
                        special: { name: "Energy Whip", ranged: true, damage: 100, cost: 20 }, ult: { name: "Star Dive", damage: 190 } })
}

// The 5 aliens loaded into the Omnitrix. Edit this to change Ben's default loadout.
export const DEFAULT_OMNITRIX = ["fourarms", "xlr8", "heatblast", "diamondhead", "cannonbolt"]

const SWITCH_COOLDOWN = 45 // frames between transforms (Omnitrix recharge)

// Every alien as a character object (handy if a roster builds from this).
export function ben10Characters(prefix = "ben_") {
  const out = {}
  for (const [k, v] of Object.entries(BEN10_ALIEN_POOL)) out[prefix + k] = { ...v }
  return out
}

export function createOmnitrixState(selected = DEFAULT_OMNITRIX) {
  const aliens = selected.filter(k => BEN10_ALIEN_POOL[k]).slice(0, 5)
  let fill = 0
  while (aliens.length < 5) {
    const candidate = DEFAULT_OMNITRIX[fill++ % DEFAULT_OMNITRIX.length]
    if (!aliens.includes(candidate)) aliens.push(candidate)
    if (fill > 20) break
  }
  return { aliens, index: 0, switchCooldown: 0 }
}

export function applyAlien(fighter, alienKey) {
  const alien = BEN10_ALIEN_POOL[alienKey]
  if (!fighter || !alien) return false

  fighter.activeAlien = alienKey
  fighter.activeAlienName = alien.name
  fighter.name = `Ben 10 (${alien.name})`
  fighter.color = alien.color

  fighter.basic_attacks = alien.basic_attacks
  fighter.specials = alien.specials || {}
  fighter.ultimate = alien.ultimate || null

  const s = alien.stats || {}
  fighter.maxJumps  = s.maxJumps ?? 2
  fighter.jumpForce = -(s.jumpPower ?? 22)
  fighter.baseSpeed = s.speed ?? 7
  fighter.speed     = s.speed ?? 7
  if (s.maxHealth) fighter.maxHealth = s.maxHealth
  fighter.stats = { ...(fighter.stats || {}), ...s }

  // Size change (Way Big / Atomix etc.), bottom-anchored so feet stay put.
  const oldH = fighter.h ?? fighter.height ?? 110
  const sw = s.sizeW || 60
  const sh = s.sizeH || 110
  fighter.w = sw; fighter.width = sw
  fighter.y = (fighter.y ?? 0) + (oldH - sh)
  fighter.h = sh; fighter.height = sh

  fighter.colorFlash = 6
  return true
}

export function switchAlien(fighter, dir = 1) {
  const omx = fighter?.omnitrix
  if (!omx || omx.switchCooldown > 0) return false
  omx.index = (omx.index + dir + omx.aliens.length) % omx.aliens.length
  applyAlien(fighter, omx.aliens[omx.index])
  omx.switchCooldown = SWITCH_COOLDOWN
  fighter.teleportFlash = 10
  return true
}

export function selectAlienSlot(fighter, slot) {
  const omx = fighter?.omnitrix
  if (!omx || slot < 0 || slot >= omx.aliens.length || omx.switchCooldown > 0) return false
  omx.index = slot
  applyAlien(fighter, omx.aliens[slot])
  omx.switchCooldown = SWITCH_COOLDOWN
  fighter.teleportFlash = 10
  return true
}

export function updateOmnitrix(fighter) {
  const omx = fighter?.omnitrix
  if (omx && omx.switchCooldown > 0) omx.switchCooldown--
}

export function setupBen10(fighter, selected = DEFAULT_OMNITRIX) {
  if (!fighter) return
  fighter.rosterKey = "ben10"
  fighter.omnitrix = createOmnitrixState(selected)
  applyAlien(fighter, fighter.omnitrix.aliens[0])
}

// ── DRAW ──
function _benRR(ctx, x, y, w, h, r = 10) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function _benShade(hex, amt) {
  try {
    const n = hex.replace("#", "")
    let r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
    r = Math.max(0, Math.min(255, Math.round(r + r * amt)))
    g = Math.max(0, Math.min(255, Math.round(g + g * amt)))
    b = Math.max(0, Math.min(255, Math.round(b + b * amt)))
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  } catch (_) { return hex }
}

export function drawBen10(ctx, fighter) {
  if (!ctx || !fighter) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const w = fighter.w ?? fighter.width ?? 60
  const h = fighter.h ?? fighter.height ?? 110
  const facing = fighter.facing ?? 1
  const alien = BEN10_ALIEN_POOL[fighter.activeAlien] || BEN10_ALIEN_POOL.heatblast
  const col = alien.color

  ctx.save()

  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, col); g.addColorStop(1, _benShade(col, -0.35))
  ctx.fillStyle = g
  _benRR(ctx, x, y + h * 0.18, w, h * 0.82, 10); ctx.fill()

  const bx = x + w / 2, by = y + h * 0.42
  ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "#052e16"; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.stroke()

  const hx = x + w / 2, hy = y + h * 0.12
  ctx.fillStyle = _benShade(col, 0.15)
  ctx.beginPath(); ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = "#0f172a"
  const eyeOff = facing >= 0 ? 4 : -4
  ctx.beginPath(); ctx.arc(hx + eyeOff, hy - 1, 2.6, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = _benShade(col, -0.5)
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  if ((fighter.colorFlash || 0) > 0) {
    ctx.globalAlpha = Math.min(1, fighter.colorFlash / 6) * 0.85
    ctx.fillStyle = "#fff"; _benRR(ctx, x, y, w, h, 12); ctx.fill(); ctx.globalAlpha = 1
  }

  ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(hx - 40, y - 18, 80, 16)
  ctx.fillStyle = col; ctx.fillText(alien.name, hx, y - 4)

  ctx.globalAlpha = 0.25; ctx.fillStyle = "#000"
  ctx.beginPath(); ctx.ellipse(hx, y + h + 6, w * 0.45, 10, 0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}
