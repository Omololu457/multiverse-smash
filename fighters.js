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
  xlr8:       mkAlien({ name: "XLR8", color: "#0ea5e9", role: "speed", hp: 900, spd: 99, jumps: 3, jump: 23, dmg: 0.75, weight: "light",
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
  clockwork:  mkAlien({ name: "Clockwork", color: "#65a30d", role: "zoner", hp: 1050, spd: 74, dmg: 0.95, weight: "heavy",
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

// ART-BACKED ALIENS — the ONLY aliens offered in the Omnitrix loadout picker and allowed into
// an active loadout. Every other entry in BEN10_ALIEN_POOL stays as valid (procedurally-drawn)
// data so nothing breaks — it's simply HIDDEN from selection until real sprite art is sourced.
// This is the loadout "prune" gate (no pool data deleted); add keys here as art arrives.
export const BEN10_ART_ALIENS = ["xlr8", "diamondhead", "feedback", "wildmutt", "heatblast", "fourarms", "upgrade", "eyeguy", "alienx", "cannonbolt", "clockwork", "chromastone", "brainstorm"]
const _artAlienSet = new Set(BEN10_ART_ALIENS)
export function isArtBackedAlien(key) { return _artAlienSet.has(key) }
// Phase 3: whether an alien has ACTUAL sprite sheets on disk. They were wiped with the Ben 10 redo, so
// every form currently renders as a PLACEHOLDER (human-Ben frames + a render-only Omnitrix tint). When
// real ben10_<alien>_*.png sheets are sourced, list the ready keys here and the retag path lights up.
const _artOnDiskSet = new Set([])
export function benAlienHasArt(key) { return _artOnDiskSet.has(key) }

// Loadout pick-cap. MUST match BEN10_SLOT_COMBOS.length in game.js (the in-fight transform
// system exposes exactly this many CHARGE+direction slots — ↓←→↑). Lowered 6->4 in the
// 2026-09-07 simplification pass. fighters.js can't import game.js (would cycle), so this is
// the leaf-module mirror of that single source of truth; keep the two numbers equal.
export const MAX_OMNITRIX_SLOTS = 5   // Phase 3: five Omnitrix slots (↓↓ + Light/Heavy/Special/L+H/H+S)
// Default loadout = the first MAX_OMNITRIX_SLOTS art-backed aliens (fallback when the player
// picks nothing). Capped so a fallback loadout never exceeds the number of reachable slots.
export const DEFAULT_OMNITRIX = [...BEN10_ART_ALIENS].slice(0, MAX_OMNITRIX_SLOTS)

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
    // STAGE 1 (2026-08-22): movement/state re-sourced from the ipmugen #11 sheet (teal/black raptor,
    // reslice_xlr8.py). Native cells ~64px → ×spriteScale 2.0 ≈128px on-screen (was 43px→86px "reads
    // short"; now sits between old-XLR8 and Diamondhead — full per-form height normalization still a
    // deferred height-pass concern). guard/knockdown/getup/crouch are NEW real art (were idle stopgaps).
    idle:  { frames: 16, width: 64, height: 64, speed: 5, anchorY: 0, sheet: "./ben10_xlr8_idle_uniform.png" },
    walk:  { frames: 18, width: 68, height: 71, speed: 3, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    run:   { frames: 18, width: 68, height: 71, speed: 2, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    dash:  { frames: 18, width: 68, height: 71, speed: 2, anchorY: 0, sheet: "./ben10_xlr8_run_uniform.png" },
    crouch:{ frames: 2,  width: 66, height: 58, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_crouch_uniform.png" },
    jump:  { frames: 3,  width: 61, height: 65, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_jump_uniform.png" },
    fall:  { frames: 3,  width: 55, height: 64, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_fall_uniform.png" },
    guard: { frames: 8,  width: 54, height: 70, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_guard_uniform.png" },        // GAP FILLED (was idle)
    hurt:  { frames: 2,  width: 48, height: 71, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_hurt_uniform.png" },         // GAP FILLED (was idle)
    knockdown: { frames: 3, width: 73, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_knockdown_uniform.png" }, // GAP FILLED (new)
    getup: { frames: 5,  width: 73, height: 71, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_getup_uniform.png" },        // GAP FILLED (reversed injured — flagged)
    intro: { frames: 16, width: 64, height: 64, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_idle_uniform.png" },         // STOPGAP: no intro art on #11
    // STAGE-2 NORMALS (XLR8) — RE-SOURCED from ipmugen #11 (2026-08-22 un-mix): light/air/down_air/grab/Dash
    // = PUNCH claw thrust (front); heavy = PUNCH2 committed strike. `up` DELIBERATELY KEEPS the Dragonrod #10
    // rising-attack strip — a sprite actually drawn as a rising attack (content-fidelity exception to the
    // single-source switch; reads brighter-blue/slightly smaller than the #11 body — flagged in XLR8_ASSET_MAP.md).
    light:    { frames: 5, width: 71, height: 67, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    heavy:    { frames: 6, width: 79, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_heavy_uniform.png" },
    up:       { frames: 6, width: 57, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_up_uniform.png" },   // Dragonrod #10 rising-attack (KEPT — content-fidelity exception)
    air:      { frames: 5, width: 71, height: 67, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },   // reuse claw (no dedicated aerial on #11)
    down_air: { frames: 5, width: 71, height: 67, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },   // reuse claw
    grab:     { frames: 5, width: 71, height: 67, speed: 3, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    // STAGE-2 command chain (Fwd+Heavy → re-tap Heavy ×2): 3-stage speed combo from the 18-frame FASTER
    // PUNCH flurry (cell 72 → stage boundaries at frames 0-5 / 6-11 / 12-17 via sourceX = 0 / 432 / 864).
    xlCombo1: { frames: 6, width: 72, height: 66, speed: 2, sourceX: 0,   anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    xlCombo2: { frames: 6, width: 72, height: 66, speed: 2, sourceX: 432, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    xlCombo3: { frames: 6, width: 72, height: 66, speed: 3, sourceX: 864, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    // STAGE-3 specials: Dash Strike (neutral quick lunge, claw pose) / Sonic Rush (Fwd launcher dash —
    // the first FASTER PUNCH row, 9f).
    xlDash: { frames: 5, width: 71, height: 67, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_front_uniform.png" },
    xlRush: { frames: 9, width: 72, height: 66, speed: 2, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    // STAGE-4 ultimate: Sonic Blitz — the full 18-frame FASTER PUNCH flurry as a blitz dash.
    xlUlt:  { frames: 18, width: 72, height: 66, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_combo_uniform.png" },
    taunt:  { frames: 16, width: 64, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_xlr8_idle_uniform.png" }   // in-form taunt-heal pose (no dedicated art → idle)
  },
  // WILDMUTT — STAGE 1 (2026-08-22, PROVISIONAL, pixel sign-off DEFERRED): movement/state from #13
  // Dragonrod (reslice_wildmutt.py, white-key, UNLABELED sheet). NOT yet added to BEN10_ART_ALIENS —
  // the kit is incomplete (normals/Pounce/Feral-Frenzy = later stages), so wildmutt stays hidden from
  // the loadout picker; this _skinAnim only renders when the form is force-applied (e.g. harness/tests).
  // Confidence: idle HIGH; jump/fall (pounce-leap/landing) MED. walk/run/dash = idle STOPGAP — the
  // stride row (74px) is likely rearing/lunge, not a low walk; real locomotion awaits the visual pass.
  // WILDMUTT — unhidden in pass 2 (now in BEN10_ART_ALIENS). Vulpimancer feral rusher: bite + pounce
  // normals, a leaping Pounce special, and a bite->pounce command chain. Movement uses the CLEAN roll
  // sheet (the stride_uniform sheet is a malformed rearing/lunge slice — see reslice_wildmutt.py:105 note,
  // vertical-stack merge, only frame 0 clean — so it stays unwired).
  wildmutt: {
    idle:  { frames: 2, width: 56, height: 43, speed: 8, anchorY: 0, sheet: "./ben10_wildmutt_idle_uniform.png" },
    // LOCOMOTION from the clean 10-frame roll strip (66px cells): frames 0-1 = the low quadruped lope
    // (walk/run), frames 2-9 = the spin-ball burst (dash). Real motion art — no longer the idle stopgap.
    walk:  { frames: 2, width: 66, height: 46, speed: 7, sourceX: 0,   anchorY: 0, sheet: "./ben10_wildmutt_roll_uniform.png" },
    run:   { frames: 2, width: 66, height: 46, speed: 4, sourceX: 0,   anchorY: 0, sheet: "./ben10_wildmutt_roll_uniform.png" },
    dash:  { frames: 8, width: 66, height: 46, speed: 2, sourceX: 132, anchorY: 0, sheet: "./ben10_wildmutt_roll_uniform.png" },   // spin-ball roll burst
    jump:  { frames: 5, width: 69, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_jump_uniform.png" },
    fall:  { frames: 3, width: 66, height: 43, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_land_uniform.png" },
    hurt:  { frames: 2, width: 56, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_idle_uniform.png" },   // STOPGAP: no hit art
    intro: { frames: 2, width: 56, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_idle_uniform.png" },   // STOPGAP: no intro art
    taunt: { frames: 2, width: 56, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_idle_uniform.png" },   // STOPGAP: no taunt art
    // NORMALS — bite (quick snap, 4f/61px) + pounce (committed lunge, 6f/127px).
    light:    { frames: 4, width: 61,  height: 38, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_bite_uniform.png" },
    heavy:    { frames: 6, width: 127, height: 46, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_pounce_uniform.png" },
    up:       { frames: 4, width: 61,  height: 38, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_bite_uniform.png" },   // rear-up bite = anti-air
    air:      { frames: 4, width: 61,  height: 38, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_bite_uniform.png" },
    down_air: { frames: 6, width: 127, height: 46, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_pounce_uniform.png" },   // pounce dive
    grab:     { frames: 4, width: 61,  height: 38, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_bite_uniform.png" },
    // COMMAND CHAIN (Fwd+Heavy -> re-tap on hit): bite opener -> pounce launcher finisher.
    wmCombo1: { frames: 4, width: 61,  height: 38, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_bite_uniform.png" },
    wmCombo2: { frames: 6, width: 127, height: 46, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_pounce_uniform.png" },
    // SPECIAL — Pounce (leaping lunge), reuses the pounce leap art.
    wmPounce: { frames: 6, width: 127, height: 46, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_wildmutt_pounce_uniform.png" }
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
  },

  // HEATBLAST (pass 2, Stage 3) — Pyronite ZONER. Clean Dragonrod sheet (tools/reslice_heatblast.py,
  // green-key CC boxes). Fireball zoner: Fwd-punch normals + a projectile Fireball special. hurt/intro/
  // taunt reuse idle (no such art on the sheet — honestly flagged).
  heatblast: {
    idle:   { frames: 4, width: 29, height: 46, speed: 7, anchorY: 0, sheet: "./ben10_heatblast_idle_uniform.png" },
    walk:   { frames: 6, width: 40, height: 45, speed: 5, anchorY: 0, sheet: "./ben10_heatblast_walk_uniform.png" },
    run:    { frames: 6, width: 40, height: 45, speed: 3, anchorY: 0, sheet: "./ben10_heatblast_walk_uniform.png" },
    dash:   { frames: 6, width: 40, height: 45, speed: 2, anchorY: 0, sheet: "./ben10_heatblast_walk_uniform.png" },
    jump:   { frames: 2, width: 40, height: 45, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_jump_uniform.png" },
    fall:   { frames: 2, width: 37, height: 44, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_fall_uniform.png" },
    crouch: { frames: 2, width: 28, height: 44, speed: 6, anchorY: 0, loop: true, sheet: "./ben10_heatblast_crouch_uniform.png" },
    hurt:   { frames: 1, width: 29, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 29, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 29, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 3, width: 30, height: 38, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_light_uniform.png" },
    heavy:    { frames: 4, width: 53, height: 30, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_heavy_uniform.png" },   // flame-dash streak
    up:       { frames: 3, width: 38, height: 48, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_up_uniform.png" },
    air:      { frames: 3, width: 33, height: 39, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_air_uniform.png" },
    down_air: { frames: 3, width: 33, height: 39, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_air_uniform.png" },   // reuse aerial swipe
    grab:     { frames: 3, width: 30, height: 38, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_light_uniform.png" },
    hbFire:   { frames: 4, width: 48, height: 44, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_heatblast_fire_uniform.png" }   // Fireball cast pose
  },

  // FOUR ARMS (pass 2, Stage 3) — Tetramand HEAVY (armor). Clean Dragonrod sheet
  // (tools/reslice_fourarms.py, peach-key CC boxes). Big-punch bruiser + a Quad Slam special.
  // hurt/intro/taunt reuse idle (no such art — flagged).
  fourarms: {
    idle:   { frames: 4, width: 47, height: 56, speed: 7, anchorY: 0, sheet: "./ben10_fourarms_idle_uniform.png" },
    walk:   { frames: 6, width: 54, height: 53, speed: 5, anchorY: 0, sheet: "./ben10_fourarms_walk_uniform.png" },
    run:    { frames: 6, width: 54, height: 53, speed: 3, anchorY: 0, sheet: "./ben10_fourarms_walk_uniform.png" },
    dash:   { frames: 6, width: 54, height: 53, speed: 2, anchorY: 0, sheet: "./ben10_fourarms_walk_uniform.png" },
    jump:   { frames: 2, width: 51, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_jump_uniform.png" },
    fall:   { frames: 1, width: 47, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_fall_uniform.png" },
    crouch: { frames: 1, width: 48, height: 39, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_crouch_uniform.png" },
    hurt:   { frames: 1, width: 47, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 47, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 47, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 63, height: 58, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_light_uniform.png" },
    heavy:    { frames: 3, width: 72, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_heavy_uniform.png" },
    up:       { frames: 2, width: 63, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_up_uniform.png" },
    air:      { frames: 2, width: 68, height: 50, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_air_uniform.png" },
    down_air: { frames: 2, width: 68, height: 50, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 63, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_light_uniform.png" },
    faSlam:   { frames: 3, width: 56, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_fourarms_slam_uniform.png" }   // Quad Slam
  },

  // UPGRADE (pass 2, Stage 3) — Galvanic Mechomorph ZONER. Clean Dragonrod sheet
  // (tools/reslice_upgrade.py, blue-key CC boxes). Plasma-whip reach + a Plasma Beam special.
  // fall reuses jump (its own fall frames were an ambiguous whip pose); hurt/intro/taunt reuse idle.
  upgrade: {
    idle:   { frames: 4, width: 38, height: 61, speed: 7, anchorY: 0, sheet: "./ben10_upgrade_idle_uniform.png" },
    walk:   { frames: 6, width: 58, height: 53, speed: 5, anchorY: 0, sheet: "./ben10_upgrade_walk_uniform.png" },
    run:    { frames: 6, width: 58, height: 53, speed: 3, anchorY: 0, sheet: "./ben10_upgrade_walk_uniform.png" },
    dash:   { frames: 6, width: 58, height: 53, speed: 2, anchorY: 0, sheet: "./ben10_upgrade_walk_uniform.png" },
    jump:   { frames: 1, width: 37, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_jump_uniform.png" },
    fall:   { frames: 1, width: 37, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_jump_uniform.png" },   // reuse jump (clean airborne pose)
    crouch: { frames: 1, width: 38, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_crouch_uniform.png" },
    hurt:   { frames: 1, width: 38, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 38, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 38, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 41,  height: 51, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_light_uniform.png" },
    heavy:    { frames: 3, width: 131, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_heavy_uniform.png" },   // plasma whip lash
    up:       { frames: 3, width: 43,  height: 123, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_up_uniform.png" },     // upward whip
    air:      { frames: 2, width: 49,  height: 61, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_air_uniform.png" },
    down_air: { frames: 2, width: 49,  height: 61, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 41,  height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_light_uniform.png" },
    upBeam:   { frames: 4, width: 131, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_upgrade_beam_uniform.png" }   // Plasma Beam cast
  },

  // EYE GUY (pass 2, Stage 3) — Opticoid ZONER. Clean Dragonrod sheet (tools/reslice_eyeguy.py,
  // teal-gray-key CC boxes). Eye-beam aim poses + an Eye Beams special. fall reuses jump; hurt/intro/
  // taunt reuse idle. MINOR: a couple attack frames include the sheet's tiny red "FX." annotation.
  eyeguy: {
    idle:   { frames: 4, width: 43, height: 56, speed: 7, anchorY: 0, sheet: "./ben10_eyeguy_idle_uniform.png" },
    walk:   { frames: 6, width: 48, height: 57, speed: 5, anchorY: 0, sheet: "./ben10_eyeguy_walk_uniform.png" },
    run:    { frames: 6, width: 48, height: 57, speed: 3, anchorY: 0, sheet: "./ben10_eyeguy_walk_uniform.png" },
    dash:   { frames: 6, width: 48, height: 57, speed: 2, anchorY: 0, sheet: "./ben10_eyeguy_walk_uniform.png" },
    jump:   { frames: 1, width: 41, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_jump_uniform.png" },
    fall:   { frames: 1, width: 41, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_jump_uniform.png" },   // reuse jump
    crouch: { frames: 1, width: 38, height: 54, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_crouch_uniform.png" },
    hurt:   { frames: 1, width: 43, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 43, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 43, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 47, height: 56, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_light_uniform.png" },
    heavy:    { frames: 2, width: 58, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_heavy_uniform.png" },
    up:       { frames: 2, width: 43, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_up_uniform.png" },
    air:      { frames: 2, width: 51, height: 66, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_air_uniform.png" },
    down_air: { frames: 2, width: 51, height: 66, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 47, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_light_uniform.png" },
    egBeam:   { frames: 3, width: 58, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_eyeguy_beam_uniform.png" }   // Eye Beams cast
  },

  // ALIEN X (pass 2, Stage 3) — Celestialsapien BRAWLER (armor). ipmugen JPEG rip
  // (tools/reslice_alienx.py, cyan-key CC boxes, upper 2/3 only — skips the winged creatures).
  // ★QUALITY CAVEAT: near-BLACK silhouette + JPEG → a faint green edge fringe (on-theme, cosmic)
  // and pose identity is silhouette-ambiguous (jump/crouch/up are approximate). Real art, no box.
  // fall reuses jump; hurt/intro/taunt reuse idle.
  alienx: {
    idle:   { frames: 4, width: 28, height: 75, speed: 7, anchorY: 0, sheet: "./ben10_alienx_idle_uniform.png" },
    walk:   { frames: 6, width: 69, height: 74, speed: 5, anchorY: 0, sheet: "./ben10_alienx_walk_uniform.png" },
    run:    { frames: 6, width: 69, height: 74, speed: 3, anchorY: 0, sheet: "./ben10_alienx_walk_uniform.png" },
    dash:   { frames: 6, width: 69, height: 74, speed: 2, anchorY: 0, sheet: "./ben10_alienx_walk_uniform.png" },
    jump:   { frames: 2, width: 43, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_jump_uniform.png" },
    fall:   { frames: 2, width: 43, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_jump_uniform.png" },   // reuse jump (own fall frame ambiguous)
    crouch: { frames: 1, width: 69, height: 73, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_crouch_uniform.png" },
    hurt:   { frames: 1, width: 28, height: 75, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 28, height: 75, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 28, height: 75, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 38, height: 75, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_light_uniform.png" },
    heavy:    { frames: 2, width: 54, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_heavy_uniform.png" },
    up:       { frames: 2, width: 37, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_up_uniform.png" },
    air:      { frames: 2, width: 42, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_air_uniform.png" },
    down_air: { frames: 2, width: 42, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 38, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_light_uniform.png" },
    axWarp:   { frames: 3, width: 52, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_alienx_warp_uniform.png" }   // Reality Warp
  },

  // CANNONBOLT (pass 2, Stage 3) — Arburian Pelarota HEAVY (armor, bigSpike). Clean Dragonrod sheet
  // (tools/reslice_cannonbolt.py). Roller: dash + jump/fall use the curled roll-ball (canon — he curls
  // to move/leap), Roll Smash special. hurt/intro/taunt reuse idle.
  cannonbolt: {
    idle:   { frames: 3, width: 50, height: 46, speed: 7, anchorY: 0, sheet: "./ben10_cannonbolt_idle_uniform.png" },
    walk:   { frames: 4, width: 70, height: 46, speed: 5, anchorY: 0, sheet: "./ben10_cannonbolt_walk_uniform.png" },
    run:    { frames: 4, width: 70, height: 46, speed: 3, anchorY: 0, sheet: "./ben10_cannonbolt_walk_uniform.png" },
    dash:   { frames: 6, width: 44, height: 47, speed: 2, anchorY: 0, sheet: "./ben10_cannonbolt_roll_uniform.png" },   // rolling dash (signature)
    jump:   { frames: 1, width: 44, height: 47, speed: 5, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_roll_uniform.png" },   // curled ball
    fall:   { frames: 1, width: 44, height: 47, speed: 5, sourceX: 0, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_roll_uniform.png" },
    crouch: { frames: 1, width: 39, height: 38, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_crouch_uniform.png" },
    hurt:   { frames: 1, width: 50, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 3, width: 50, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 3, width: 50, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 41, height: 40, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_light_uniform.png" },
    heavy:    { frames: 3, width: 41, height: 41, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_heavy_uniform.png" },   // roll smash
    up:       { frames: 1, width: 47, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_up_uniform.png" },
    air:      { frames: 2, width: 41, height: 40, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_air_uniform.png" },
    down_air: { frames: 2, width: 41, height: 40, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 41, height: 40, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_light_uniform.png" },
    cbRoll:   { frames: 6, width: 44, height: 47, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_cannonbolt_roll_uniform.png" }   // Roll Smash
  },

  // CLOCKWORK (pass 2, Stage 3) — Chronosapien ZONER. ipmugen JPEG rip "clocwork..." (cyan-key CC
  // boxes, tools/reslice_clockwork.py). Big gold robot + a Time Ray special. fall reuses jump; hurt/
  // intro/taunt reuse idle. QUALITY: JPEG source -> faint edge fringe; picks best-effort (avoided the
  // sheet's standalone clock-face icon).
  clockwork: {
    idle:   { frames: 4, width: 49, height: 57, speed: 7, anchorY: 0, sheet: "./ben10_clockwork_idle_uniform.png" },
    walk:   { frames: 4, width: 58, height: 58, speed: 5, anchorY: 0, sheet: "./ben10_clockwork_walk_uniform.png" },
    run:    { frames: 4, width: 58, height: 58, speed: 3, anchorY: 0, sheet: "./ben10_clockwork_walk_uniform.png" },
    dash:   { frames: 4, width: 58, height: 58, speed: 2, anchorY: 0, sheet: "./ben10_clockwork_walk_uniform.png" },
    jump:   { frames: 1, width: 27, height: 56, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_jump_uniform.png" },
    fall:   { frames: 1, width: 27, height: 56, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_jump_uniform.png" },   // reuse jump
    crouch: { frames: 1, width: 36, height: 54, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_crouch_uniform.png" },
    hurt:   { frames: 1, width: 49, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 49, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 49, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 58,  height: 58, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_light_uniform.png" },
    heavy:    { frames: 2, width: 58,  height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_heavy_uniform.png" },
    up:       { frames: 1, width: 49,  height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_up_uniform.png" },
    air:      { frames: 2, width: 76, height: 57, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_air_uniform.png" },
    down_air: { frames: 2, width: 76, height: 57, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 58,  height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_light_uniform.png" },
    cwRay:    { frames: 3, width: 57,  height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_clockwork_ray_uniform.png" }   // Time Ray cast
  },

  // CHROMASTONE (pass 2, Stage 3) — Crystalsapien ZONER. ipmugen JPEG rip (cyan-key CC boxes,
  // tools/reslice_chromastone.py). Dark crystal body w/ purple shard highlights + an Ultraviolet Beam
  // special. fall reuses jump; hurt/intro/taunt reuse idle. QUALITY: JPEG faint fringe; picks
  // best-effort (dark body -> some pose ambiguity, less than Alien X thanks to the purple accents).
  chromastone: {
    idle:   { frames: 4, width: 22, height: 57, speed: 7, anchorY: 0, sheet: "./ben10_chromastone_idle_uniform.png" },
    walk:   { frames: 6, width: 47, height: 49, speed: 5, anchorY: 0, sheet: "./ben10_chromastone_walk_uniform.png" },
    run:    { frames: 6, width: 47, height: 49, speed: 3, anchorY: 0, sheet: "./ben10_chromastone_walk_uniform.png" },
    dash:   { frames: 6, width: 47, height: 49, speed: 2, anchorY: 0, sheet: "./ben10_chromastone_walk_uniform.png" },
    jump:   { frames: 1, width: 46, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_jump_uniform.png" },
    fall:   { frames: 1, width: 46, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_jump_uniform.png" },   // reuse jump
    crouch: { frames: 1, width: 33, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_crouch_uniform.png" },
    hurt:   { frames: 1, width: 22, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 22, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 22, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 31, height: 47,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_light_uniform.png" },
    heavy:    { frames: 2, width: 37, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_heavy_uniform.png" },
    up:       { frames: 1, width: 36, height: 35,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_up_uniform.png" },
    air:      { frames: 2, width: 46, height: 48,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_air_uniform.png" },
    down_air: { frames: 2, width: 46, height: 48,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 31, height: 47,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_light_uniform.png" },
    csBeam:   { frames: 3, width: 32, height: 56,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_chromastone_beam_uniform.png" }   // Ultraviolet Beam cast
  },

  // BRAINSTORM (pass 2, Stage 3) — Cerebrocrustacean ZONER. DS/DSi rip (giant 23MP teal sheet w/ black
  // cells); the full-res CC-label stalls, so tools/reslice_brainstorm.py DETECTS on a 3x-downscaled copy
  // then crops full-res. Orange crab-alien; open-shell lightning attacks + a Lightning Storm special.
  // fall reuses jump; hurt/intro/taunt reuse idle. Well-sized (~111px on-screen).
  brainstorm: {
    idle:   { frames: 4, width: 51, height: 48, speed: 7, anchorY: 0, sheet: "./ben10_brainstorm_idle_uniform.png" },
    walk:   { frames: 4, width: 60, height: 51, speed: 5, anchorY: 0, sheet: "./ben10_brainstorm_walk_uniform.png" },
    run:    { frames: 4, width: 60, height: 51, speed: 3, anchorY: 0, sheet: "./ben10_brainstorm_walk_uniform.png" },
    dash:   { frames: 4, width: 60, height: 51, speed: 2, anchorY: 0, sheet: "./ben10_brainstorm_walk_uniform.png" },
    jump:   { frames: 1, width: 42, height: 47, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_jump_uniform.png" },
    fall:   { frames: 1, width: 42, height: 47, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_jump_uniform.png" },   // reuse jump
    crouch: { frames: 1, width: 78, height: 47, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_crouch_uniform.png" },
    hurt:   { frames: 1, width: 51, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_idle_uniform.png" },   // STOPGAP: no hit art
    intro:  { frames: 4, width: 51, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_idle_uniform.png" },   // STOPGAP: no intro art
    taunt:  { frames: 4, width: 51, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_idle_uniform.png" },   // STOPGAP: no taunt art
    light:    { frames: 2, width: 54, height: 45, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_light_uniform.png" },
    heavy:    { frames: 2, width: 51, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_heavy_uniform.png" },   // open-shell lightning
    up:       { frames: 2, width: 51, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_up_uniform.png" },
    air:      { frames: 2, width: 51, height: 45, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_air_uniform.png" },
    down_air: { frames: 2, width: 51, height: 45, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_air_uniform.png" },   // reuse aerial
    grab:     { frames: 2, width: 54, height: 45, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_light_uniform.png" },
    bsBolt:   { frames: 3, width: 63, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_brainstorm_bolt_uniform.png" }   // Lightning Storm cast
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
  // art-backed aliens the player picked — capped at MAX_OMNITRIX_SLOTS, matching the pick-cap/slot count).
  let aliens = (selected || []).filter(k => _artAlienSet.has(k) && BEN10_ALIEN_POOL[k])
  aliens = [...new Set(aliens)].slice(0, MAX_OMNITRIX_SLOTS)
  if (aliens.length === 0) aliens = [...DEFAULT_OMNITRIX]
  // Phase 3: the Omnitrix state object IS the GAME_STATE sub-structure. currentForm mirrors
  // activeAlien; power mirrors fighter.energy; the lockouts/timers drive transform/swap/timeout.
  return {
    aliens, index: 0, switchCooldown: 0,
    currentForm: null,      // active alien key (null = human)
    formTimer: 0,           // frames spent in the current alien form
    power: 0,               // mirror of fighter.energy (Omnitrix Power), kept in sync each frame
    startup: 0,             // transform startup frames remaining (vulnerable); applies the alien at 0
    pendingSlot: 0,         // slot the in-progress transform will land on
    swapLockout: 0,         // frames until the next alien→alien swap is allowed
    timeoutCooldown: 0,     // frames until a transform is allowed again after a 0-Power forced revert
    manualLockout: 0,       // frames until re-transform after a DELIBERATE revert (no timeout penalty)
    vowActive: false,       // BINDING VOW glitch mode (opt-in) — transform/swap picks the alien by hash
    lastVowPick: -1         // last hash-picked slot (determinism harness reads this)
  }
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
  // SHARED HEALTH POOL (Ben 10 framework, Phase 2/3): the HUMAN variant's maxHealth is the ONE pool for
  // every alien form — transforming NEVER heals and NEVER resizes the bar. Current health carries across
  // unchanged (only clamped into the pool). The alien's own `maxHealth` stat is used ONLY for in-form
  // drain-scaling (updateTransformDevice), never the health bar. (Replaced the old per-form maxHealth
  // with %-scaled carry, which conflicted with the shared-pool spec.)
  if (typeof fighter.health === "number" && (fighter.maxHealth || 0) > 0) {
    fighter.health = Math.max(0, Math.min(fighter.maxHealth, fighter.health))
  }
  fighter.stats = { ...(fighter.stats || {}), ...s, maxHealth: fighter.maxHealth }

  // Size change (Way Big / Atomix etc.), bottom-anchored so feet stay put.
  const oldH = fighter.h ?? fighter.height ?? 110
  const sw = s.sizeW || 60
  const sh = s.sizeH || 110
  fighter.w = sw; fighter.width = sw
  fighter.y = (fighter.y ?? 0) + (oldH - sh)
  fighter.h = sh; fighter.height = sh

  // PLACEHOLDER-ALIEN RENDER (Phase 3 framework): alien sprite art is not yet sourced, so every form
  // renders the HUMAN-Ben frames with a render-only green/colour Omnitrix overlay (fighter.skinTint →
  // tintColor at draw) instead of a missing sheet — fully playable before art lands. The form's move
  // table still swaps in above. When a form's real sheets arrive (benAlienHasArt), the retag path
  // (art-backed animationData, recolor-aware) lights up with no other change.
  if (benAlienHasArt(alienKey)) {
    fighter._skinAnim = _retagAlienAnim(BEN10_FORM_ANIM[alienKey] || null, fighter._recolorTag)
    fighter.skinTint  = fighter._baseSkinTint ?? null
  } else {
    fighter._skinAnim    = null                                  // human-Ben frames
    fighter.skinTint     = alien.color || "#39ff14"              // render-only Omnitrix tint (placeholder)
    fighter.tintStrength = 0.5
    fighter._benPlaceholderForm = true
  }

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

// ═══════════════════════════════════════════════════════════════════════════════
// BEN 10 OMNITRIX ENGINE (Phase 3) — transform / swap / timeout / Binding Vow.
// All randomness is a deterministic hash(matchSeed, frame, playerIndex) — NO Math.random/gameRng,
// so LAN/replay-identical. All mutable state lives on fighter.omnitrix (the sim fighter = GAME_STATE).
// ═══════════════════════════════════════════════════════════════════════════════
function _omxHash(seed, frame, playerIndex) {
  let h = ((seed | 0) ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ ((frame | 0) + 0x85ebca6b), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((playerIndex | 0) + 0x27d4eb2f), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

// BINDING VOW pick: alien = hash(seed, frame, playerIndex) mod nSlots. Re-hash with frame+1 (≤5 tries)
// if it equals the CURRENT form so a vow swap always lands on a different alien. Deterministic → the
// determinism harness replays the exact same sequence for a given seed.
export function ben10VowPick(fighter, seed = 1, frame = 0, playerIndex = 0) {
  const omx = fighter?.omnitrix; if (!omx) return 0
  const n = Math.max(1, omx.aliens.length)
  const cur = fighter.transformed ? omx.index : -1
  let pick = Math.floor(_omxHash(seed, frame, playerIndex) * n) % n
  for (let t = 1; t <= 5 && pick === cur; t++) pick = Math.floor(_omxHash(seed, frame + t, playerIndex) * n) % n
  omx.lastVowPick = pick
  return pick
}

// Begin a HUMAN→alien transform: spend TRANSFORM_COST, open a 40-frame VULNERABLE startup (the alien is
// applied when startup hits 0, in updateTransformDevice). Gated by the timeout cooldown + manual-revert
// lockout + enough Power. Returns true if armed.
export function ben10BeginTransform(fighter, slot) {
  const omx = fighter?.omnitrix; if (!omx || fighter.transformed) return false
  if ((omx.timeoutCooldown || 0) > 0 || (omx.manualLockout || 0) > 0) return false
  if ((omx.startup || 0) > 0) return false                              // already mid-transform
  if ((fighter.energy || 0) < TRANSFORM_ENERGY.TRANSFORM_COST) return false
  slot = Math.max(0, Math.min(omx.aliens.length - 1, slot | 0))
  fighter.energy -= TRANSFORM_ENERGY.TRANSFORM_COST
  omx.pendingSlot = slot
  omx.startup = TRANSFORM_ENERGY.TRANSFORM_STARTUP                      // vulnerable flash; alien applied at 0
  fighter._omxVulnerable = true
  fighter.attacking = false; fighter.currentAttack = null
  fighter.isCharging = false; fighter.vx = 0
  fighter._spriteCastMove = "transform"; fighter._spriteCastTimer = TRANSFORM_ENERGY.TRANSFORM_STARTUP
  fighter._attackInputLock = 6
  fighter.teleportFlash = 8
  return true
}

// Swap ALIEN→alien (allowed mid-combo / mid-air): flat SWAP_COST (VOW_SWAP_COST under a vow), 30-frame
// lockout + a short flash. Rejected during hitstun, during an existing swap lockout, or into the SAME form.
export function ben10Swap(fighter, slot) {
  const omx = fighter?.omnitrix; if (!omx || !fighter.transformed) return false
  if ((omx.swapLockout || 0) > 0) return false
  if ((fighter.hitstun || 0) > 0) return false                         // cannot swap during hitstun
  slot = Math.max(0, Math.min(omx.aliens.length - 1, slot | 0))
  if (omx.index === slot) return false                                 // same form — rejected
  const cost = omx.vowActive ? TRANSFORM_ENERGY.VOW_SWAP_COST : TRANSFORM_ENERGY.SWAP_COST
  if ((fighter.energy || 0) < cost) return false
  fighter.energy -= cost
  omx.index = slot
  applyAlien(fighter, omx.aliens[slot])
  fighter.transformed = true
  omx.swapLockout = TRANSFORM_ENERGY.SWAP_LOCKOUT
  fighter._attackInputLock = 6
  fighter.teleportFlash = 6
  return true
}

// Unified transform/swap entry for the input handler. Under a Binding Vow the chosen slot is IGNORED —
// the alien is the deterministic hash pick (player can't choose). Returns "transform" | "swap" | null.
export function ben10TransformOrSwap(fighter, slot, vowCtx = null) {
  const omx = fighter?.omnitrix; if (!omx) return null
  if (omx.vowActive && vowCtx) slot = ben10VowPick(fighter, vowCtx.seed, vowCtx.frame, vowCtx.playerIndex)
  if (!fighter.transformed) return ben10BeginTransform(fighter, slot) ? "transform" : null
  return ben10Swap(fighter, slot) ? "swap" : null
}

// Manual revert (↓↓ + Light+Special): 20-frame lockout, NO timeout penalty (that is only for a 0-Power
// forced revert). Cancels any in-progress transform startup too.
export function ben10Revert(fighter) {
  const omx = fighter?.omnitrix; if (!omx) return false
  if (!fighter.transformed && (omx.startup || 0) <= 0) return false
  omx.startup = 0; omx.pendingSlot = 0; fighter._omxVulnerable = false
  revertToHuman(fighter, { forced: false })
  omx.manualLockout = TRANSFORM_ENERGY.MANUAL_REVERT_LOCKOUT
  fighter._attackInputLock = 6
  return true
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
  DRAIN_PER_SEC:          5,    // base meter lost/sec while transformed (Phase 3 spec: ~20s from full; was 6)
  ATTACK_DRAIN_BONUS:     10,   // extra drain/sec while an attack is active
  STRONG_FORM_SCALE:      1.0,  // how much (alienHP/1000) amplifies drain (titans drain more)
  CHARGE_RESTORE_PER_SEC: 45,   // refill/sec while holding Charge alone
  HUMAN_REGEN_PER_SEC:    4,    // passive Omnitrix-Power regen/sec while human (Phase 2 spec; was 10)
  MIN_TRANSFORM_ENERGY:   15,   // energy needed to (re)transform (legacy gate, kept for tryTransform)
  RECHARGE_FRAMES:        150,  // legacy forced-revert lockout (deviceRecharge; superseded by TIMEOUT_FRAMES)
  // ── Phase 3 Omnitrix framework economy ──
  TRANSFORM_COST:         20,   // Power spent to transform HUMAN→alien
  TRANSFORM_STARTUP:      40,   // vulnerable startup frames (transform_flash) before the alien is applied
  TIMEOUT_FRAMES:         360,  // forced-revert (0 Power) timeout cooldown, 6s @60fps — no transform allowed
  MANUAL_REVERT_LOCKOUT:  20,   // lockout after a DELIBERATE revert (no timeout penalty)
  SWAP_COST:              15,   // Power spent to swap ALIEN→alien (mid-combo/mid-air)
  SWAP_LOCKOUT:           30,   // frames between swaps
  VOW_DMG_MULT:           1.25, // Binding Vow: alien damage ×1.25
  VOW_DRAIN_MULT:         1.6,  // Binding Vow: drain ×1.6
  VOW_SWAP_COST:          22    // Binding Vow: swap costs 22 (vs 15)
}

// ── BEN 10 DEFENSIVE TOOLS (Phase 6) ─────────────────────────────────────────────────────────────
// Green Flash Roll (←← + Light): a 12-frame dodge roll, i-frames on frames 4-12, 5s cooldown.
// Energy Guard (Block + Heavy): opens a 90f absorb window that negates ONE hit, costs 10 Power, 8s cd.
// Last Resort (passive): ONCE per round below 15% HP → +30 Power + 2s of 20% damage reduction.
export const BEN10_DEFENSE = {
  ROLL_FRAMES: 12, ROLL_IFRAME_FROM: 4, ROLL_IFRAME_TO: 12, ROLL_CD: 300, ROLL_SPEED: 13,
  GUARD_COST: 10, GUARD_WINDOW: 90, GUARD_CD: 480,
  LAST_RESORT_HP: 0.15, LAST_RESORT_POWER: 30, LAST_RESORT_DR_FRAMES: 120, LAST_RESORT_DR: 0.80   // DR = ×0.80 (−20%)
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

// ── PER-VARIANT HUMAN NORMALS (Phase 4) ──────────────────────────────────────────────────────────
// Brief frame data (startup / damage, + an on-block feel): Alien Force balanced, Classic faster-but-
// weaker, Prime slower-but-stronger. jab→light, heavy→heavy, launcher→up, air→air, low→down_air; grab
// kept from HUMAN_FORM. Recovery is tuned to the brief's on-block ordering (safest Classic → least-safe
// Prime); exact on-block is approximate (documented in docs/ben10/SPRITE_LEDGER.md). Human Ben is
// deliberately a weak-but-honest baseline — his power is the Omnitrix forms (see BALANCE_NOTES).
const _mkBenNormals = (o) => ({
  light:    { ...HUMAN_FORM.basic_attacks.light,    startup: o.jab[0],      damage: o.jab[1],      recovery: o.jab[2] },
  heavy:    { ...HUMAN_FORM.basic_attacks.heavy,    startup: o.heavy[0],    damage: o.heavy[1],    recovery: o.heavy[2] },
  up:       { ...HUMAN_FORM.basic_attacks.up,       startup: o.launcher[0], damage: o.launcher[1], recovery: o.launcher[2] },
  air:      { ...HUMAN_FORM.basic_attacks.air,      startup: o.air[0],      damage: o.air[1],      recovery: o.air[2] },
  down_air: { ...HUMAN_FORM.basic_attacks.down_air, startup: o.low[0],      damage: o.low[1],      recovery: o.low[2] },
  grab:     { ...HUMAN_FORM.basic_attacks.grab }
})
export const BEN10_VARIANT_NORMALS = {
  alienforce: _mkBenNormals({ jab: [5, 20, 11], heavy: [13, 55, 20], low: [7, 28, 15], launcher: [11, 50, 19], air: [8, 34, 11] }),
  classic:    _mkBenNormals({ jab: [4, 18, 10], heavy: [11, 46, 18], low: [6, 26, 14], launcher: [10, 44, 18], air: [7, 30, 11] }),
  prime:      _mkBenNormals({ jab: [5, 22, 12], heavy: [14, 60, 21], low: [7, 30, 16], launcher: [12, 54, 20], air: [8, 36, 12] }),
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
  fighter.basic_attacks  = BEN10_VARIANT_NORMALS[fighter._benVariant] || HUMAN_FORM.basic_attacks   // Phase 4: per-variant human normals
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
  fighter.skinTint = fighter._baseSkinTint ?? null   // clear the placeholder-alien Omnitrix tint
  fighter._benPlaceholderForm = false
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
  // Phase 3: route through the framework transform (cost 20 + 40f vulnerable startup + timeout gate)
  // so AI / auto-re-engage obeys the same economy a human player does.
  return ben10BeginTransform(fighter, fighter.omnitrix.index)
}

// Per-frame device update — call from the game loop with real delta ms.
export function updateTransformDevice(fighter, deltaMs = 1000 / 60) {
  if (!isTransformDevice(fighter) || !fighter.omnitrix) return
  const omx = fighter.omnitrix
  // Phase 3: tick lockouts/cooldowns every frame (even during Alien X windup / transform startup).
  if ((omx.swapLockout || 0) > 0) omx.swapLockout--
  if ((omx.timeoutCooldown || 0) > 0) omx.timeoutCooldown--
  if ((omx.manualLockout || 0) > 0) omx.manualLockout--
  if ((fighter._attackInputLock || 0) > 0) fighter._attackInputLock--

  // ── Phase 6 DEFENSE: cooldowns, roll i-frames (4-12), Energy Guard window, Last Resort passive ──
  if ((fighter._benRollCd || 0) > 0) fighter._benRollCd--
  if ((fighter._benGuardCd || 0) > 0) fighter._benGuardCd--
  if ((fighter._benEnergyGuard || 0) > 0) fighter._benEnergyGuard--
  if ((fighter._benDR || 0) > 0) fighter._benDR--
  if ((fighter._benRoll || 0) > 0) {
    const elapsed = BEN10_DEFENSE.ROLL_FRAMES - fighter._benRoll         // 0..12
    if (elapsed >= BEN10_DEFENSE.ROLL_IFRAME_FROM && elapsed <= BEN10_DEFENSE.ROLL_IFRAME_TO) fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 2)
    fighter._benRoll--
  }
  // LAST RESORT: re-arm on a round-start refill (health back to full), then fire once below 15% HP.
  const _maxH = fighter.maxHealth || 1
  if ((fighter.health || 0) >= _maxH) fighter._benLastResortUsed = false
  else if (!fighter._benLastResortUsed && (fighter.health || 0) > 0 && (fighter.health || 0) < BEN10_DEFENSE.LAST_RESORT_HP * _maxH) {
    fighter._benLastResortUsed = true
    fighter.energy = Math.min(fighter.maxEnergy || 100, (fighter.energy || 0) + BEN10_DEFENSE.LAST_RESORT_POWER)
    fighter._benDR = BEN10_DEFENSE.LAST_RESORT_DR_FRAMES
    fighter.colorFlash = Math.max(fighter.colorFlash || 0, 14)
  }

  // TRANSFORM STARTUP: a vulnerable windup — the alien is APPLIED when it completes. No drain/regen meanwhile.
  if ((omx.startup || 0) > 0) {
    omx.startup--
    fighter._omxVulnerable = omx.startup > 0
    if (omx.startup <= 0) {
      const slot = Math.max(0, Math.min(omx.aliens.length - 1, omx.pendingSlot | 0))
      omx.index = slot
      applyAlien(fighter, omx.aliens[slot])
      fighter.transformed = true
      fighter._omxVulnerable = false
    }
    omx.power = fighter.energy; omx.currentForm = fighter.activeAlien
    return
  }

  // Alien X's ultimate has a ~3.3s vulnerable windup; PAUSE the drain meter for its duration.
  if (fighter._axUltWindup) { omx.power = fighter.energy; return }

  const dt  = Math.max(0, deltaMs) / 1000
  const max = fighter.maxEnergy || 100
  if ((fighter.deviceRecharge || 0) > 0) fighter.deviceRecharge--

  // BINDING VOW: alien damage ×1.25 while transformed (generic offense buff; Ben has no other source).
  if (omx.vowActive) fighter.damageMultiplier = fighter.transformed ? TRANSFORM_ENERGY.VOW_DMG_MULT : 1

  if (!fighter.transformed) {
    omx.currentForm = null; omx.formTimer = 0
    fighter.energy = Math.min(max, (fighter.energy || 0) + TRANSFORM_ENERGY.HUMAN_REGEN_PER_SEC * dt)
    omx.power = fighter.energy
    return
  }

  omx.currentForm = fighter.activeAlien; omx.formTimer = (omx.formTimer || 0) + 1
  if (fighter.hitstun > 0) fighter.isCharging = false   // a hit interrupts the charge

  if (fighter.isCharging) {
    fighter.energy = Math.min(max, (fighter.energy || 0) + TRANSFORM_ENERGY.CHARGE_RESTORE_PER_SEC * dt)
  } else {
    const alien  = BEN10_ALIEN_POOL[fighter.activeAlien]
    const strong = alien ? Math.max(0.6, (alien.maxHealth || 1000) / 1000) : 1   // titans drain faster
    let drain = TRANSFORM_ENERGY.DRAIN_PER_SEC * (1 + (strong - 1) * TRANSFORM_ENERGY.STRONG_FORM_SCALE)
    if (fighter.attacking && fighter.currentAttack) drain += TRANSFORM_ENERGY.ATTACK_DRAIN_BONUS
    if (omx.vowActive) drain *= TRANSFORM_ENERGY.VOW_DRAIN_MULT
    fighter.energy = Math.max(0, (fighter.energy || 0) - drain * dt)
  }
  omx.power = fighter.energy

  // 0 Power → FORCED revert + 6s timeout cooldown (no transform allowed during it).
  if ((fighter.energy || 0) <= 0) {
    revertToHuman(fighter, { forced: true })
    omx.timeoutCooldown = TRANSFORM_ENERGY.TIMEOUT_FRAMES
    omx.currentForm = null; omx.formTimer = 0
  }
}

export function setupBen10(fighter, selected = DEFAULT_OMNITRIX) {
  if (!fighter) return
  if (!fighter.rosterKey) fighter.rosterKey = "ben10"   // don't clobber a clone (Albedo)
  fighter.omnitrix       = createOmnitrixState(selected)
  fighter.deviceRecharge = 0
  fighter.isCharging     = false
  fighter._baseSkinTint  = fighter.skinTint ?? null   // Phase 3: restored on revert (placeholder tint clears)
  fighter._attackInputLock = 0
  // Albedo renders as a red/gray recolor of Ben: tag his forms so applyAlien (on the first mid-match
  // transform) retags each alien's sheets to its __albedo variant. Set BEFORE revertToHuman so the tag
  // persists into the human base render too. Cosmetic only — no mechanics change.
  if (_isAlbedo(fighter) && !fighter._recolorTag) fighter._recolorTag = "albedo"
  // START HUMAN (2026-09-07 loadout-simplification): a match begins in Ben's base/human form, NOT
  // pre-transformed into loadout slot 1. revertToHuman is the single source of truth for the human kit
  // (HUMAN_FORM normals + human size/stats; the Special button routes to Hoverboard via
  // executeBen10Special when activeAlien===null). The player morphs into a loadout alien mid-match via
  // CHARGE+direction (handleOmnitrixSwitch) exactly as before — that mechanic is untouched. Starting
  // human also FIXES the old "advertised != actual" stat gap: maxHealth stays the char-def value
  // (Ben/Albedo 1250) instead of being overwritten by slot-1's alien (e.g. XLR8's 900).
  revertToHuman(fighter)
}

// ── BEN 10 — PER-VARIANT BASE STATS (Phase 2) ────────────────────────────────────────────────
// The three human variants (skins.js SKINS.ben10) carry their own base stats. The brief's
// walk/run/jump/weight are a different SCALE than the engine (createFighter floors move speed at
// DEFAULT_SPEED=9, jumpPower norm ≈30, weight is not consumed by physics) — so the values below map
// the brief's RELATIVE ordering (Classic faster/lighter, Prime slower/heavier) onto engine units,
// anchored to Alien Force = the existing Ben feel (effective speed 9, jumpPower 19, dashSpeed 15).
// Health uses the brief's ABSOLUTE values (950/900/1000) and IS the shared pool (applyAlien keeps it).
// `weight` is stored for docs/AI only (physics has no weight field). Applied AFTER applySkin in game.js.
export const BEN10_VARIANT_STATS = {
  default:      { variant: "alienforce", maxHealth:  950, speed: 9.0, dashSpeed: 15, jumpPower: 19, weight: 1.0  },
  ben10Classic: { variant: "classic",    maxHealth:  900, speed: 9.7, dashSpeed: 16, jumpPower: 20, weight: 0.9  },
  ben10Prime:   { variant: "prime",      maxHealth: 1000, speed: 8.6, dashSpeed: 14, jumpPower: 18, weight: 1.05 },
}
export function applyBen10VariantStats(fighter, skinId = "default") {
  if (!fighter) return
  const k = (fighter.rosterKey || "").toLowerCase()
  if (k !== "ben10" && k !== "albedo") return
  const V = BEN10_VARIANT_STATS[skinId] || BEN10_VARIANT_STATS.default
  fighter.maxHealth = V.maxHealth
  fighter.health    = V.maxHealth           // full at round start (this is the SHARED pool)
  fighter.speed     = V.speed
  fighter.baseSpeed = V.speed
  fighter.dashSpeed = V.dashSpeed
  fighter.jumpForce = -(V.jumpPower)
  fighter._benWeight  = V.weight
  fighter._benVariant = V.variant           // engine/HUD marker (alienforce | classic | prime)
  fighter.stats = { ...(fighter.stats || {}), maxHealth: V.maxHealth, speed: V.speed, dashSpeed: V.dashSpeed, jumpPower: V.jumpPower }
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
