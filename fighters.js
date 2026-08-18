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
// MAIN EXPORT — drawCharacter()
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// POSE / EXPRESSION LAYER
// Procedural squash-stretch + lean applied around the fighter's feet BEFORE
// the per-character body is drawn. Because every drawX() renders relative to
// the logical (x,y,w,h) box, a single canvas transform here makes ALL
// characters (and the fallback + Ben 10) react to combat state — idle
// breathing, run lean, jump stretch, fall squash, attack windup→lunge→settle,
// and a hurt recoil/flinch — with no per-frame allocations and no per-character
// rewrites. Feet stay planted (pivot at bottom-center) so motion reads cleanly.
// ─────────────────────────────────────────────────────────────────
function _applyPoseTransform(ctx, fighter, x, y, w, h) {
  const pivotX = x + w / 2
  const pivotY = y + h            // feet
  const t  = (fighter._poseClock = (fighter._poseClock || 0) + 1)
  const dir = fighter.facing >= 0 ? 1 : -1

  let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0

  const grounded = fighter.grounded ?? fighter.onGround ?? true
  const atk = fighter.attacking ? fighter.currentAttack : null

  if ((fighter.hitstun || 0) > 0) {
    // HURT — recoil away from facing, tip back, and jitter for the first frames.
    const f = Math.min(1, (fighter.hitstun || 0) / 12)
    dx  = -dir * 6 * f + Math.sin(t * 1.7) * 2.2 * f
    rot = -dir * 0.13 * f
    sy  = 1 - 0.06 * f
    sx  = 1 + 0.04 * f
  } else if (atk && atk.total) {
    // ATTACK — windup (coil back) → active (lunge + extend) → recovery (settle).
    const elapsed = (atk.total || 1) - (atk.timer || 0)
    if (elapsed < atk.activeStart) {
      const p = atk.activeStart ? elapsed / atk.activeStart : 1
      dx = -dir * 5 * p; rot = -dir * 0.07 * p; sy = 1 - 0.05 * p; sx = 1 + 0.03 * p
    } else if (elapsed <= atk.activeEnd) {
      const heavy = atk.category === "heavy" || atk.launcher || atk.spike || atk.isSpecial || atk.isUltimate
      const a = heavy ? 1 : 0.7
      dx = dir * 13 * a; rot = dir * 0.16 * a; sx = 1 + 0.13 * a; sy = 1 - 0.05 * a
      if (atk.launcher) { dy = -6 * a; rot = -dir * 0.12 }      // up-attack arcs upward
      if (atk.spike)    { dy =  4 * a; rot =  dir * 0.22 }      // down-air drives down
    } else {
      const span = Math.max(1, (atk.total || 1) - atk.activeEnd)
      const p = 1 - Math.min(1, (elapsed - atk.activeEnd) / span)
      dx = dir * 6 * p; rot = dir * 0.05 * p
    }
  } else if (!grounded) {
    // AIRBORNE — rising stretches tall/thin, falling squashes wide; slight lean.
    const vy = fighter.vy || 0
    if (vy < 0) { sy = 1 + Math.min(0.18, -vy * 0.007); sx = 1 - Math.min(0.11, -vy * 0.004) }
    else        { sy = 1 - Math.min(0.11,  vy * 0.005); sx = 1 + Math.min(0.09,  vy * 0.004) }
    rot = dir * 0.05
  } else if (Math.abs(fighter.vx || 0) > 0.4) {
    // RUN — lean into travel with a light footfall bounce.
    const runDir = (fighter.vx || 0) > 0 ? 1 : -1
    rot = runDir * 0.07
    dy  = -Math.abs(Math.sin(t * 0.45)) * 2.5
    sy  = 1 + Math.abs(Math.sin(t * 0.45)) * 0.02
  } else {
    // IDLE — gentle breathing bob.
    const b = Math.sin(t * 0.06)
    sy = 1 + b * 0.02; sx = 1 - b * 0.012; dy = b * 1.4
  }

  ctx.translate(pivotX + dx, pivotY + dy)
  if (rot) ctx.rotate(rot)
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
  ctx.translate(-pivotX, -pivotY)
}

// ─────────────────────────────────────────────────────────────────
// ── OMNI-MAN (Viltrumite) ─────────────────────────────────────────
// White suit, red Viltrumite emblem + cape, black hair and signature 'stache.
// ─────────────────────────────────────────────────────────────────
function drawOmniMan(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing ?? 1
  // Cape
  ctx.fillStyle = "#b91c1c"
  ctx.beginPath()
  ctx.moveTo(x + w * 0.2, y + h * 0.2)
  ctx.lineTo(x - w * 0.1, y + h * 0.95)
  ctx.lineTo(x + w * 1.1, y + h * 0.95)
  ctx.lineTo(x + w * 0.8, y + h * 0.2)
  ctx.closePath(); ctx.fill()

  // Body (white suit)
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
  bodyGrad.addColorStop(0, "#f8fafc"); bodyGrad.addColorStop(1, "#cbd5e1")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x, y + h * 0.18, w, h * 0.82, 10); ctx.fill()

  // Red emblem band + chest mark
  ctx.fillStyle = "#dc2626"
  ctx.fillRect(x + 4, y + h * 0.5, w - 8, h * 0.07)
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h * 0.30); ctx.lineTo(x + w / 2 - 10, y + h * 0.44); ctx.lineTo(x + w / 2 + 10, y + h * 0.44)
  ctx.closePath(); ctx.fill()

  // Boots
  ctx.fillStyle = "#b91c1c"
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  // Head + black hair + mustache
  const hx = x + w / 2, hy = y + h * 0.12
  ctx.fillStyle = "#fcd9b6"; ctx.beginPath(); ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#111827"
  ctx.beginPath(); ctx.arc(hx, hy - h * 0.05, h * 0.1, Math.PI, 0); ctx.fill()
  ctx.fillRect(hx - h * 0.045, hy + h * 0.02, h * 0.09, h * 0.022)   // mustache
  ctx.fillStyle = "#0f172a"
  const eo = facing >= 0 ? 4 : -4
  ctx.beginPath(); ctx.arc(hx + eo, hy - 1, 2.4, 0, Math.PI * 2); ctx.fill()

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, "Omni-Man", hx, y, "#dc2626")
  drawFacingDot(ctx, x, y, w, facing, "#fff")
  drawShadow(ctx, x, y, w, h)
}

// (drawThragg removed 2026-07-27 — Thragg was pruned as a data-only stub; see characters.js.)

export function drawCharacter(ctx, fighter) {
  if (!fighter || !ctx) return

  const x = fighter.x ?? 0
  const y = fighter.y ?? 0
  const w = fighter.w ?? fighter.width ?? 60
  const h = fighter.h ?? fighter.height ?? 110

  const key = (fighter.rosterKey || fighter.id || fighter.name || "").toLowerCase()

  ctx.save()
  _applyPoseTransform(ctx, fighter, x, y, w, h)

  switch (key) {
    case "goku":    drawGoku(ctx, x, y, w, h, fighter);    break
    case "naruto":  drawNaruto(ctx, x, y, w, h, fighter);  break
    case "gojo":    drawGojo(ctx, x, y, w, h, fighter);    break
    case "sukuna":  drawSukuna(ctx, x, y, w, h, fighter);  break
    case "omololu": drawOmololu(ctx, x, y, w, h, fighter); break
    case "ben10":   drawBen10(ctx, fighter);               break   // ★ Ben 10
    case "albedo":  drawBen10(ctx, fighter);               break   // ★ Albedo (Ben's clone, red tint)
    case "omniman": drawOmniMan(ctx, x, y, w, h, fighter); break   // ★ Invincible (procedural fallback; real render is sprite-based)
    default:        drawFallback(ctx, x, y, w, h, fighter); break
  }

  _drawCombatFlashes(ctx, x, y, w, h, fighter)
  ctx.restore()
}

function drawFallback(ctx, x, y, w, h, fighter) {
  const facing = fighter.facing >= 0 ? 1 : -1
  const color  = fighter.color || (fighter.side === "p1" ? "#3b82f6" : "#ef4444")
  const hx = x + w / 2
  const hy = y + h * 0.13

  // Limbs first (behind torso) so even an unkeyed character reads as a body
  // with arms and legs rather than a plain box. The pose transform above gives
  // these motion; the lead arm extends toward facing while attacking.
  const reach = fighter.attacking ? 0.30 : 0.16
  ctx.strokeStyle = color
  ctx.lineCap     = "round"
  ctx.lineWidth   = Math.max(5, w * 0.16)
  // arms
  ctx.beginPath()
  ctx.moveTo(hx, y + h * 0.40)
  ctx.lineTo(hx + facing * w * reach, y + h * (fighter.attacking ? 0.42 : 0.55))
  ctx.moveTo(hx, y + h * 0.40)
  ctx.lineTo(hx - facing * w * 0.14, y + h * 0.58)
  ctx.stroke()
  // legs
  ctx.lineWidth = Math.max(6, w * 0.18)
  ctx.beginPath()
  ctx.moveTo(hx, y + h * 0.82)
  ctx.lineTo(x + w * 0.30, y + h)
  ctx.moveTo(hx, y + h * 0.82)
  ctx.lineTo(x + w * 0.70, y + h)
  ctx.stroke()

  // Torso
  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0, color)
  grad.addColorStop(1, "rgba(0,0,0,0.35)")
  ctx.fillStyle = grad
  roundRect(ctx, x + w * 0.12, y + h * 0.24, w * 0.76, h * 0.6, 10)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.3)"
  ctx.lineWidth   = 2
  roundRect(ctx, x + w * 0.12, y + h * 0.24, w * 0.76, h * 0.6, 10)
  ctx.stroke()

  // Head + a facing eye so the silhouette has a clear front.
  ctx.fillStyle = "#fde68a"
  ctx.beginPath()
  ctx.arc(hx, hy, h * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#1a1a1a"
  ctx.beginPath()
  ctx.arc(hx + facing * 4, hy - 1, 2.4, 0, Math.PI * 2)
  ctx.fill()

  drawHitFlash(ctx, x, y, w, h, fighter.colorFlash)
  drawNameTag(ctx, fighter.name || "?", hx, y, "#ffffff")
  drawFacingDot(ctx, x, y, w, facing, "#fff")
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
// ART-BACKED ALIENS — the ONLY aliens offered in the Omnitrix loadout picker and allowed into
// an active loadout. Every other entry in BEN10_ALIEN_POOL stays as valid (procedurally-drawn)
// data so nothing breaks — it's simply HIDDEN from selection until real sprite art is sourced.
// This is the loadout "prune" gate (no pool data deleted); add keys here as art arrives.
export const BEN10_ART_ALIENS = ["xlr8", "diamondhead", "feedback"]
const _artAlienSet = new Set(BEN10_ART_ALIENS)
export function isArtBackedAlien(key) { return _artAlienSet.has(key) }

// Default loadout = the art-backed aliens (a fresh transform always shows real sprites).
export const DEFAULT_OMNITRIX = [...BEN10_ART_ALIENS]

const SWITCH_COOLDOWN = 45 // frames between transforms (Omnitrix recharge)

// ─────────────────────────────────────────────────────────────────
// PER-FORM SPRITE SETS (Stage 1 — movement/state). Ben 10 is ONE fighter whose
// look changes with the active alien, so transforming swaps the WHOLE animationData
// set via fighter._skinAnim (the Vegeta-SSJ / Goku-Black-Rose precedent). _skinAnim
// is EXCLUSIVE (no merge with base), so each set must define every reachable action
// or a missing key renders the 128² fallback box → every set below is movement-complete.
// The untransformed HUMAN look is the base characters.ben10.animationData (set null).
// Art-less aliens set _skinAnim = null → fall back to the Ben-human base until their
// own art is sourced (they're hidden from the loadout in Step 5 so this isn't reachable).
// STAGE-1 STOPGAPS (flagged for later): guard is omitted (sprite.js falls to idle);
// hurt + intro reuse the idle strip (no dedicated hit/entrance art on disk yet).
// ─────────────────────────────────────────────────────────────────
// Retag an alien form's sheets to a recolor variant (X.png → X__<tag>.png), matching abilities.js
// retagFormAnim. Used so a Ben-10 with an active recolor SKIN keeps that skin after transforming into an
// alien — otherwise applyAlien would clobber the skin's _skinAnim with the alien's raw sheets. Cosmetic-only
// (no move/stat change); falls straight through (returns the anim unchanged) whenever no tag is active.
// (Edo Tensei's reanimation tint no longer uses a tag — it's a live ctx.filter gated on _edoActive.)
// Cached per (anim,tag).
const _alienTagCache = new WeakMap()
function _retagAlienAnim(anim, tag) {
  if (!tag || !anim) return anim
  let byTag = _alienTagCache.get(anim); if (!byTag) { byTag = new Map(); _alienTagCache.set(anim, byTag) }
  if (byTag.has(tag)) return byTag.get(tag)
  const out = {}
  for (const [k, d] of Object.entries(anim)) out[k] = d?.sheet ? { ...d, sheet: d.sheet.replace(/\.(png|jpe?g)$/i, `__${tag}.png`) } : d
  byTag.set(tag, out); return out
}

const BEN10_FORM_ANIM = {
  xlr8: {
    idle:  { frames: 5, width: 60, height: 43, speed: 7, anchorY: 0, sheet: "./ben10_xlr8_idle_uniform.png" },
    walk:  { frames: 4, width: 75, height: 43, speed: 6, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    run:   { frames: 4, width: 75, height: 43, speed: 3, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    dash:  { frames: 4, width: 75, height: 43, speed: 2, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    jump:  { frames: 3, width: 91, height: 55, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_jump_uniform.png" },
    fall:  { frames: 3, width: 91, height: 55, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_jump_uniform.png" },
    hurt:  { frames: 1, width: 60, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_idle_uniform.png" },   // STOPGAP: no hit art
    intro: { frames: 5, width: 60, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_idle_uniform.png" },   // STOPGAP: no intro art
    // STAGE-2 NORMALS (XLR8). light = quick 3-frame claw; heavy = full 5-frame slash. up = rising slash
    // strip. air/down_air/grab reuse the front-slash (no dedicated air/dive art — flagged).
    light:    { frames: 3, width: 60, height: 39, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    heavy:    { frames: 5, width: 60, height: 39, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    up:       { frames: 6, width: 57, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_up_uniform.png" },
    air:      { frames: 3, width: 60, height: 39, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },   // STOPGAP: reuse front
    down_air: { frames: 3, width: 60, height: 39, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },   // STOPGAP: reuse front
    grab:     { frames: 3, width: 60, height: 39, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    // STAGE-2 command chain (Fwd+Heavy → re-tap Heavy ×2): 3-stage speed combo sliced from the 11-frame
    // combo strip (cell 60 → stage boundaries at frames 0-3 / 4-7 / 8-10 via sourceX).
    xlCombo1: { frames: 4, width: 60, height: 48, speed: 2, sourceX: 0,   anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    xlCombo2: { frames: 4, width: 60, height: 48, speed: 2, sourceX: 240, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    xlCombo3: { frames: 3, width: 60, height: 48, speed: 3, sourceX: 480, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    // STAGE-3 specials: Dash Strike (neutral quick lunge, front-slash pose) / Sonic Rush (Fwd launcher
    // dash — combo extender, the 6-frame front of the combo strip).
    xlDash: { frames: 5, width: 60, height: 39, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    xlRush: { frames: 6, width: 60, height: 48, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    // STAGE-4 ultimate: Sonic Blitz — the full 11-frame combo flurry as a blitz dash.
    xlUlt:  { frames: 11, width: 60, height: 48, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    taunt:  { frames: 5, width: 60, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_idle_uniform.png" }   // in-form taunt-heal pose (no dedicated art → idle)
  },
  diamondhead: {
    idle:  { frames: 4, width: 49, height: 72, speed: 6, anchorY: 0, sheet: "./ben10_diamond_head_idle_uniform.png" },
    walk:  { frames: 5, width: 63, height: 73, speed: 7, anchorY: 0, sheet: "./ben10_diamond_head_run_uniform.png" },
    run:   { frames: 5, width: 63, height: 73, speed: 4, anchorY: 0, sheet: "./ben10_diamond_head_run_uniform.png" },
    dash:  { frames: 5, width: 63, height: 73, speed: 3, anchorY: 0, sheet: "./ben10_diamond_head_run_uniform.png" },
    jump:  { frames: 4, width: 66, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_jump_uniform.png" },
    fall:  { frames: 4, width: 66, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_jump_uniform.png" },
    hurt:  { frames: 1, width: 49, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_idle_uniform.png" },  // STOPGAP: no hit art
    intro: { frames: 4, width: 49, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_idle_uniform.png" },  // STOPGAP: no intro art
    // STAGE-2 NORMALS (Diamondhead). light = quick 3-frame crystal jab; heavy = full 5-frame blade thrust.
    // up/air/down_air/grab reuse the forward crystal swing (only one melee strip on disk — flagged).
    light:    { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },
    heavy:    { frames: 5, width: 76, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },
    up:       { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },   // STOPGAP: reuse swing
    air:      { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },   // STOPGAP: reuse swing
    down_air: { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },   // STOPGAP: reuse swing
    grab:     { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },
    // STAGE-2 command chain (Fwd+Heavy → re-tap Heavy): 2-stage crystal swing sliced from the 5-frame
    // forward strip (cell 76 → dhSwing1 = frames 0-2, dhSwing2 = frames 2-4 via sourceX).
    dhSwing1: { frames: 3, width: 76, height: 77, speed: 3, sourceX: 0,   anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },
    dhSwing2: { frames: 3, width: 76, height: 77, speed: 3, sourceX: 152, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_forward_uniform.png" },
    // STAGE-3 special CAST poses: Shard Barrage (neutral, crystal-cannon fire → projectile) / Rising
    // Diamonds (Down, hand-slam → ground-eruption hitbox). The projectile/eruption hitboxes are spawned
    // separately (procedural crystal-cyan for now — flagged); these are just the shooter poses.
    dhShoot:  { frames: 3, width: 74, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_shooting_uniform.png" },
    dhRising: { frames: 3, width: 55, height: 84, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_rising_uniform.png" },
    // STAGE-4 ultimate: Crystal Storm — the hand-slam cast (reuses the rising strip) while a field of
    // eruptions marches forward (spawned separately in fireDhCrystalStorm).
    dhUlt:    { frames: 3, width: 55, height: 84, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_rising_uniform.png" },
    taunt:    { frames: 4, width: 49, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_diamond_head_idle_uniform.png" }   // in-form taunt-heal pose (no dedicated art → idle)
  },
  // ── FEEDBACK (Conductoid — energy-absorption specialist) ──────────────────
  // Small art batch: idle/run/jump movement + a charge (absorb) stance, an
  // electric-shot discharge pose, and a 5-frame ultimate beam cast. No dedicated
  // melee/guard/hurt art → normals REUSE the electric-shot discharge pose with
  // per-move hitbox tuning (flagged in Stage 2); guard omitted (→idle); hurt/intro
  // reuse idle (STOPGAP). dash reuses the run strip (the raw dash sheet's wide
  // motion-blur cell isn't a clean loop — reserved). Projectiles are procedural
  // electric-cyan (the raw projectile strips split on their spark lines — reserved).
  feedback: {
    idle:  { frames: 4, width: 44, height: 51, speed: 7, anchorY: 0, sheet: "./feedback_idle_uniform.png" },
    walk:  { frames: 4, width: 57, height: 49, speed: 6, anchorY: 0, sheet: "./feedback_run_uniform.png" },
    run:   { frames: 4, width: 57, height: 49, speed: 4, anchorY: 0, sheet: "./feedback_run_uniform.png" },
    dash:  { frames: 4, width: 57, height: 49, speed: 3, anchorY: 0, sheet: "./feedback_run_uniform.png" },
    jump:  { frames: 3, width: 37, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_jump_uniform.png" },
    fall:  { frames: 3, width: 37, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_jump_uniform.png" },
    guard: { frames: 1, width: 44, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_idle_uniform.png" },   // STOPGAP: no block art (idle pose keeps blocking IN-FORM, not human-Ben)
    hurt:  { frames: 1, width: 44, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_idle_uniform.png" },   // STOPGAP: no hit art
    intro: { frames: 4, width: 44, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_idle_uniform.png" },   // STOPGAP: no intro art
    // STAGE-2 NORMALS (Feedback). NO dedicated melee art in the batch → all normals REUSE the 2-frame
    // electric-shot discharge pose (feedback_electric_shot_uniform.png) with per-move HITBOX/DAMAGE/TIMING
    // tuning from BEN10_ALIEN_POOL.feedback.basic_attacks. Reads as short-range electric jabs (thematically
    // clean for a Conductoid). FLAGGED: shared underlying frames, distinct move data. No genuine animation
    // overflow exists → no command chain (skipped honestly).
    light:    { frames: 2, width: 60, height: 52, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    heavy:    { frames: 2, width: 60, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    up:       { frames: 2, width: 60, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    air:      { frames: 2, width: 60, height: 52, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    down_air: { frames: 2, width: 60, height: 52, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    grab:     { frames: 2, width: 60, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    // STAGE-3 special poses. fbCharge = the ABSORB STANCE (blue energy gathering) — the reactive-counter
    // windup, looped so it pulses through the counter window. fbShot = the electric-discharge cast (the
    // amplified redirect + the proactive Down discharge). Projectile is procedural electric-cyan.
    fbCharge: { frames: 2, width: 52, height: 90, speed: 6, anchorY: 0, loop: true, sheet: "./feedback_charge_animation_uniform.png" },
    fbShot:   { frames: 2, width: 60, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_electric_shot_uniform.png" },
    // STAGE-4 ultimate cast: OVERLOAD — the 5-frame two-hand energy beam (amplified discharge).
    fbUlt:    { frames: 5, width: 61, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_ultimate_uniform.png" },
    taunt:    { frames: 4, width: 44, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./feedback_idle_uniform.png" }   // in-form taunt-heal pose (no dedicated art → idle)
  }
}

// Every alien as a character object (handy if a roster builds from this).
export function ben10Characters(prefix = "ben_") {
  const out = {}
  for (const [k, v] of Object.entries(BEN10_ALIEN_POOL)) out[prefix + k] = { ...v }
  return out
}

export function createOmnitrixState(selected = DEFAULT_OMNITRIX) {
  // Only art-backed aliens are allowed into a live loadout (the rest are hidden from the picker);
  // a stale saved loadout that names hidden aliens is filtered down, then defaulted if nothing's left.
  // De-duped so cycling never lands on the same form twice. No art-less fill (the loadout is just the
  // art-backed aliens the player picked — grows to 5 as more aliens get art).
  let aliens = (selected || []).filter(k => _artAlienSet.has(k) && BEN10_ALIEN_POOL[k])
  aliens = [...new Set(aliens)].slice(0, 5)
  if (aliens.length === 0) aliens = [...DEFAULT_OMNITRIX]
  return { aliens, index: 0, switchCooldown: 0 }
}

export function applyAlien(fighter, alienKey) {
  const alien = BEN10_ALIEN_POOL[alienKey]
  if (!fighter || !alien) return false

  fighter.activeAlien = alienKey
  fighter.activeAlienName = alien.name
  // Albedo is Ben's clone: same aliens, different identity label.
  const who = (fighter.rosterKey || "").toLowerCase() === "albedo" ? "Albedo" : "Ben 10"
  fighter.name = `${who} (${alien.name})`
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

  // Form sprite-swap: art-backed aliens carry their own animationData set; others
  // fall back to the Ben-human base (_skinAnim = null). See BEN10_FORM_ANIM.
  // Retag to the active recolor SKIN variant so a skinned Ben keeps his skin in-alien. (An Edo-reanimated Ben
  // has _recolorTag=null → raw alien sheets, tinted live by EDO_REANIM_TINT since he stays _edoActive.)
  fighter._skinAnim = _retagAlienAnim(BEN10_FORM_ANIM[alienKey] || null, fighter._recolorTag)

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

// DELIBERATE slot transform — the Omnitrix "dial to a specific alien" primitive (replaces cycling).
// Works from ANY state: from human it re-engages the device (transformed=true, gated on energy/recharge
// exactly like tryTransform); from another alien it switches directly (gated on switchCooldown). Returns
// false (a no-op) when the slot is out of range, already active, or a gate blocks it — so a slot-combo
// can't misfire into the wrong alien. Slot count is whatever omx.aliens holds (data-driven; NOT fixed 5).
export function selectAlienSlot(fighter, slot) {
  const omx = fighter?.omnitrix
  if (!omx || slot < 0 || slot >= omx.aliens.length) return false
  if (fighter.transformed) {
    if (omx.switchCooldown > 0) return false           // mid-recharge between switches
    if (omx.index === slot) return false               // already this alien — nothing to do
  } else {
    // Re-engaging from human: same gate as tryTransform (recharge lockout + min energy).
    if ((fighter.deviceRecharge || 0) > 0) return false
    if ((fighter.energy || 0) < TRANSFORM_ENERGY.MIN_TRANSFORM_ENERGY) return false
  }
  omx.index = slot
  applyAlien(fighter, omx.aliens[slot])
  fighter.transformed = true                            // ensure a human→slot morph actually engages
  omx.switchCooldown = SWITCH_COOLDOWN
  fighter.teleportFlash = 10
  return true
}

export function updateOmnitrix(fighter) {
  const omx = fighter?.omnitrix
  if (omx && omx.switchCooldown > 0) omx.switchCooldown--
}

// ═══════════════════════════════════════════════════════════════════
// TRANSFORM-DEVICE ENERGY SYSTEM   (Omnitrix = Ben, Ultimatrix = Albedo)
// Shared by every transform-device fighter. While transformed into an alien a
// drain meter (the fighter's energy bar) depletes — stronger forms drain
// faster. Holding Charge (no direction) refills it fast, BUT you can't block
// while charging and a hit interrupts it. At zero energy the fighter is
// FORCE-REVERTED to a weak human form and must wait out a recharge before
// transforming again. Human form regenerates energy slowly on its own.
// All rates are per-SECOND and tuned here.
// ═══════════════════════════════════════════════════════════════════
export const TRANSFORM_ENERGY = {
  DRAIN_PER_SEC:          6,    // base meter lost/sec while transformed
  ATTACK_DRAIN_BONUS:     10,   // extra drain/sec while an attack is active
  STRONG_FORM_SCALE:      1.0,  // how much (alienHP/1000) amplifies drain (titans drain more)
  CHARGE_RESTORE_PER_SEC: 45,   // refill/sec while holding Charge alone
  HUMAN_REGEN_PER_SEC:    10,   // passive regen/sec while human
  MIN_TRANSFORM_ENERGY:   15,   // energy needed to (re)transform
  RECHARGE_FRAMES:        150   // forced-revert lockout (~2.5s @60fps)
}

// Weak un-transformed baseline so a reverted fighter is functional, never stuck.
// HUMAN_FORM — the LIVE Ben-human kit (revertToHuman applies this). SINGLE SOURCE OF TRUTH for the
// human form's numbers; characters.ben10.basic_attacks mirrors these for the select-screen display.
// Rebalanced (2026-07-28 re-audit): the old values (light 28 / heavy 52) sat BELOW the documented
// roster floor (Rick light 34 / heavy 60) with no zoner tools to justify it — a confirmed too-weak
// outlier. Bumped to the roster's low-but-honest band (near Hisoka/Rangers) so the no-powers baseline
// is viable, not strictly worse than everything. heavy regains superArmor (the char entry's intent) —
// Ben's one committal poke. All ×0.60-scaled like every normal.
const HUMAN_FORM = {
  basic_attacks: {
    light:    { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 16, knockbackX: 5, knockbackY: 1, superArmor: true },
    up:       { damage: 62, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 2, knockbackY: -8 },
    air:      { damage: 50, startup: 6, active: 3, recovery: 11, hitstun: 12, knockbackX: 2, knockbackY: -2 },
    down_air: { damage: 66, startup: 9, active: 4, recovery: 15, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 14, hitstun: 16, throwForceX: 4, throwForceY: -3 }
  },
  stats: { maxJumps: 2, jumpPower: 20, speed: 7 },
  baseW: 56, baseH: 108
}

export function isTransformDevice(fighter) {
  const k = (fighter?.rosterKey || "").toLowerCase()
  return k === "ben10" || k === "albedo"
}

function _isAlbedo(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "albedo" }

// Snap to human form (feet-anchored). Always clears attack state so a forced
// revert can never leave the fighter locked mid-swing.
export function revertToHuman(fighter, { forced = false } = {}) {
  if (!fighter) return
  const oldH = fighter.h ?? fighter.height ?? 110
  fighter.transformed    = false
  fighter.isCharging     = false
  fighter.basic_attacks  = HUMAN_FORM.basic_attacks
  fighter.specials       = {}
  fighter.ultimate       = null
  fighter.activeAlien    = null
  fighter.activeAlienName = "Human"
  fighter.name  = _isAlbedo(fighter) ? "Albedo" : "Ben"
  fighter.color = _isAlbedo(fighter) ? "#dc2626" : "#84cc16"
  fighter.maxJumps  = HUMAN_FORM.stats.maxJumps
  fighter.jumpForce = -HUMAN_FORM.stats.jumpPower
  fighter.baseSpeed = HUMAN_FORM.stats.speed
  fighter.speed     = HUMAN_FORM.stats.speed
  const nw = HUMAN_FORM.baseW, nh = HUMAN_FORM.baseH
  fighter.w = nw; fighter.width = nw
  fighter.y = (fighter.y ?? 0) + (oldH - nh)
  fighter.h = nh; fighter.height = nh
  fighter.attacking = false
  fighter.currentAttack = null
  fighter.currentMove = null
  fighter._skinAnim = null   // human form uses the base Ben-human sprite set
  if (forced) {
    fighter.deviceRecharge = TRANSFORM_ENERGY.RECHARGE_FRAMES
    fighter.colorFlash = 12
    fighter.teleportFlash = 12
  }
}

// (Re)transform into the device's currently-selected alien, if allowed.
export function tryTransform(fighter) {
  if (!isTransformDevice(fighter) || !fighter.omnitrix) return false
  if (fighter.transformed) return false
  if ((fighter.deviceRecharge || 0) > 0) return false
  if ((fighter.energy || 0) < TRANSFORM_ENERGY.MIN_TRANSFORM_ENERGY) return false
  applyAlien(fighter, fighter.omnitrix.aliens[fighter.omnitrix.index])
  fighter.transformed = true
  fighter.teleportFlash = 10
  return true
}

// Per-frame device update — call from the game loop with real delta ms.
export function updateTransformDevice(fighter, deltaMs = 1000 / 60) {
  if (!isTransformDevice(fighter) || !fighter.omnitrix) return
  const dt  = Math.max(0, deltaMs) / 1000
  const max = fighter.maxEnergy || 100
  if ((fighter.deviceRecharge || 0) > 0) fighter.deviceRecharge--

  if (!fighter.transformed) {
    fighter.energy = Math.min(max, (fighter.energy || 0) + TRANSFORM_ENERGY.HUMAN_REGEN_PER_SEC * dt)
    return
  }

  if (fighter.hitstun > 0) fighter.isCharging = false   // a hit interrupts the charge

  if (fighter.isCharging) {
    fighter.energy = Math.min(max, (fighter.energy || 0) + TRANSFORM_ENERGY.CHARGE_RESTORE_PER_SEC * dt)
  } else {
    const alien  = BEN10_ALIEN_POOL[fighter.activeAlien]
    const strong = alien ? Math.max(0.6, (alien.maxHealth || 1000) / 1000) : 1   // titans drain faster
    let drain = TRANSFORM_ENERGY.DRAIN_PER_SEC * (1 + (strong - 1) * TRANSFORM_ENERGY.STRONG_FORM_SCALE)
    if (fighter.attacking && fighter.currentAttack) drain += TRANSFORM_ENERGY.ATTACK_DRAIN_BONUS
    fighter.energy = Math.max(0, (fighter.energy || 0) - drain * dt)
  }

  if ((fighter.energy || 0) <= 0) revertToHuman(fighter, { forced: true })
}

export function setupBen10(fighter, selected = DEFAULT_OMNITRIX) {
  if (!fighter) return
  if (!fighter.rosterKey) fighter.rosterKey = "ben10"   // don't clobber a clone (Albedo)
  fighter.omnitrix       = createOmnitrixState(selected)
  fighter.deviceRecharge = 0
  fighter.isCharging     = false
  fighter.transformed    = true   // start in the first alien; the drain meter ticks from here
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

  const albedo      = _isAlbedo(fighter)
  const transformed = fighter.transformed !== false   // legacy ben (no flag) = transformed
  const alien       = transformed ? BEN10_ALIEN_POOL[fighter.activeAlien] : null
  // Human form uses Ben-green / Albedo-red; alien form uses the alien palette.
  const col       = (transformed && alien) ? alien.color : (albedo ? "#dc2626" : "#84cc16")
  const label     = (transformed && alien) ? alien.name : (albedo ? "Albedo" : "Ben")
  const symbolCol = albedo ? "#ef4444" : "#22c55e"    // Albedo's Ultimatrix dial glows red
  const symbolRim = albedo ? "#450a0a" : "#052e16"

  ctx.save()

  // Charging glow (refilling, vulnerable) / forced-revert recharge ring.
  const t = performance.now() * 0.001
  if (fighter.isCharging) {
    ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(t * 12) * 0.2
    ctx.strokeStyle = symbolCol; ctx.lineWidth = 4; ctx.shadowBlur = 18; ctx.shadowColor = symbolCol
    _benRR(ctx, x - 5, y - 5, w + 10, h + 10, 14); ctx.stroke(); ctx.restore()
  } else if (!transformed && (fighter.deviceRecharge || 0) > 0) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3
    ctx.setLineDash([6, 6]); _benRR(ctx, x - 4, y - 4, w + 8, h + 8, 14); ctx.stroke(); ctx.restore()
  }

  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, col); g.addColorStop(1, _benShade(col, -0.35))
  ctx.fillStyle = g
  _benRR(ctx, x, y + h * 0.18, w, h * 0.82, 10); ctx.fill()

  // Omnitrix / Ultimatrix chest dial.
  const bx = x + w / 2, by = y + h * 0.42
  ctx.fillStyle = symbolRim; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = symbolCol; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = symbolRim; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.stroke()

  const hx = x + w / 2, hy = y + h * 0.12
  ctx.fillStyle = _benShade(col, 0.15)
  ctx.beginPath(); ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2); ctx.fill()

  // Albedo has red eyes (Galvan-clone "Negative" tell); Ben's are dark.
  ctx.fillStyle = albedo ? "#ef4444" : "#0f172a"
  const eyeOff = facing >= 0 ? 4 : -4
  ctx.beginPath(); ctx.arc(hx + eyeOff, hy - 1, 2.6, 0, Math.PI * 2); ctx.fill()
  if (albedo) { ctx.shadowBlur = 6; ctx.shadowColor = "#ef4444"; ctx.fill(); ctx.shadowBlur = 0 }

  ctx.fillStyle = _benShade(col, -0.5)
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  if ((fighter.colorFlash || 0) > 0) {
    ctx.globalAlpha = Math.min(1, fighter.colorFlash / 6) * 0.85
    ctx.fillStyle = "#fff"; _benRR(ctx, x, y, w, h, 12); ctx.fill(); ctx.globalAlpha = 1
  }

  ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(hx - 40, y - 18, 80, 16)
  ctx.fillStyle = col; ctx.fillText(label, hx, y - 4)

  ctx.globalAlpha = 0.25; ctx.fillStyle = "#000"
  ctx.beginPath(); ctx.ellipse(hx, y + h + 6, w * 0.45, 10, 0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}
