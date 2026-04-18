// matchFlow.js
// Complete match flow: round countdown, fight, round end, victory screen,
// rematch system, and live match statistics tracking.
// Import into game.js and wire into the game loop.

import { sound, SFX, MUSIC } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// MATCH STATISTICS
// Tracked live during a match, displayed on victory screen.
// ─────────────────────────────────────────────────────────────────
export function createMatchStats() {
  return {
    p1: {
      damageDealt:    0,
      hitsLanded:     0,
      specialsUsed:   0,
      ultimatesUsed:  0,
      maxCombo:       0,
      roundsWon:      0,
      perfectRounds:  0,   // rounds where p1 took zero damage
      timeSurvived:   0    // frames
    },
    p2: {
      damageDealt:    0,
      hitsLanded:     0,
      specialsUsed:   0,
      ultimatesUsed:  0,
      maxCombo:       0,
      roundsWon:      0,
      perfectRounds:  0,
      timeSurvived:   0
    },
    totalRounds:     0,
    matchDuration:   0,    // frames
    roundStartHealth:{ p1: 0, p2: 0 }  // snapshot at round start for perfect detection
  }
}

export function recordHit(stats, side, damage, combo, isSpecial, isUltimate) {
  if (!stats || !stats[side]) return
  const s = stats[side]
  s.damageDealt  += damage  || 0
  s.hitsLanded   += 1
  s.maxCombo      = Math.max(s.maxCombo, combo || 0)
  if (isSpecial)  s.specialsUsed++
  if (isUltimate) s.ultimatesUsed++
}

export function recordRoundEnd(stats, winnerSide, p1HealthRemaining, p2HealthRemaining) {
  if (!stats) return
  stats.totalRounds++
  if (winnerSide === "p1") {
    stats.p1.roundsWon++
    if (p1HealthRemaining >= stats.roundStartHealth.p1) {
      stats.p1.perfectRounds++
    }
  } else if (winnerSide === "p2") {
    stats.p2.roundsWon++
    if (p2HealthRemaining >= stats.roundStartHealth.p2) {
      stats.p2.perfectRounds++
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// COUNTDOWN RENDERER
// ─────────────────────────────────────────────────────────────────
export function drawRoundCountdown(ctx, canvas, countdown, roundNumber) {
  const cw = canvas.width, ch = canvas.height
  const seconds = Math.ceil(countdown / 60)

  if (countdown > 120) {
    // "ROUND X" banner
    ctx.save()
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    ctx.font         = "900 52px Arial"
    ctx.fillStyle    = "#f1f5f9"
    ctx.shadowBlur   = 22
    ctx.shadowColor  = "rgba(120,170,255,0.5)"
    ctx.fillText(`ROUND ${roundNumber}`, cw / 2, ch / 2 - 30)
    ctx.shadowBlur   = 0
    ctx.font         = "700 24px Arial"
    ctx.fillStyle    = "rgba(200,210,230,0.7)"
    ctx.fillText("READY", cw / 2, ch / 2 + 28)
    ctx.restore()
  } else if (countdown > 0) {
    // Numeric countdown
    const scale = 1 + Math.max(0, (countdown % 60) / 60) * 0.3
    ctx.save()
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    ctx.font         = `900 ${Math.floor(96 * scale)}px Arial`
    ctx.fillStyle    = seconds <= 1 ? "#ef4444" : "#ffffff"
    ctx.shadowBlur   = 30
    ctx.shadowColor  = seconds <= 1 ? "#ef4444" : "rgba(120,170,255,0.5)"
    ctx.fillText(String(seconds), cw / 2, ch / 2)
    ctx.shadowBlur   = 0
    ctx.restore()
  } else {
    // "FIGHT!"
    ctx.save()
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    ctx.font         = "900 88px Arial"
    ctx.fillStyle    = "#fbbf24"
    ctx.shadowBlur   = 30
    ctx.shadowColor  = "#f59e0b"
    ctx.fillText("FIGHT!", cw / 2, ch / 2)
    ctx.shadowBlur   = 0
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
// ROUND BREAK BANNER
// ─────────────────────────────────────────────────────────────────
export function drawRoundBreak(ctx, canvas, winnerText = "ROUND OVER") {
  const cw = canvas.width, ch = canvas.height

  // Dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.48)"
  ctx.fillRect(0, 0, cw, ch)

  // Panel
  const pw = 500, ph = 160
  const px = cw / 2 - pw / 2, py = ch / 2 - ph / 2

  ctx.fillStyle = "rgba(8,12,28,0.88)"
  _rrectFill(ctx, px, py, pw, ph, 22)
  ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 2
  _rrectStroke(ctx, px, py, pw, ph, 22)

  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.font         = "900 44px Arial"
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 14; ctx.shadowColor = "rgba(120,170,255,0.3)"
  ctx.fillText(winnerText, cw / 2, ch / 2 - 16)
  ctx.shadowBlur   = 0
  ctx.font         = "400 18px Arial"
  ctx.fillStyle    = "rgba(200,210,230,0.7)"
  ctx.fillText("Next round starting...", cw / 2, ch / 2 + 30)
}

// ─────────────────────────────────────────────────────────────────
// VICTORY SCREEN
// Full screen — drawn over the frozen battle scene.
// ─────────────────────────────────────────────────────────────────
export function drawVictoryScreen(ctx, canvas, state) {
  const {
    winnerName    = "Player 1",
    winnerSide    = "p1",
    stats         = createMatchStats(),
    rematchHover  = false,
    menuHover     = false,
    fadeAlpha     = 1
  } = state

  const cw = canvas.width, ch = canvas.height

  ctx.save()
  ctx.globalAlpha = fadeAlpha

  // Background gradient overlay
  const bg = ctx.createLinearGradient(0, 0, 0, ch)
  bg.addColorStop(0, "rgba(4, 8, 22, 0.92)")
  bg.addColorStop(1, "rgba(10, 16, 38, 0.96)")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cw, ch)

  // Decorative top line
  const topLine = ctx.createLinearGradient(0, 0, cw, 0)
  topLine.addColorStop(0, "transparent")
  topLine.addColorStop(0.5, winnerSide === "p1" ? "#38bdf8" : "#f87171")
  topLine.addColorStop(1, "transparent")
  ctx.fillStyle = topLine
  ctx.fillRect(0, 2, cw, 3)

  // ── WINNER DECLARATION ─────────────────────────────────────────
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"

  ctx.font      = "700 18px Arial"
  ctx.fillStyle = "rgba(200,210,230,0.6)"
  ctx.fillText("WINNER", cw / 2, ch * 0.18)

  ctx.font         = `900 ${Math.min(72, Math.floor(cw * 0.055))}px Arial`
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 28
  ctx.shadowColor  = winnerSide === "p1" ? "#38bdf8" : "#f87171"
  ctx.fillText(winnerName, cw / 2, ch * 0.27)
  ctx.shadowBlur   = 0

  // ── MATCH STATS ────────────────────────────────────────────────
  const statY  = ch * 0.4
  const statW  = Math.min(560, cw * 0.7)
  const statH  = 220
  const statX  = cw / 2 - statW / 2

  // Stats panel
  ctx.fillStyle = "rgba(255,255,255,0.04)"
  _rrectFill(ctx, statX, statY, statW, statH, 16)
  ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1
  _rrectStroke(ctx, statX, statY, statW, statH, 16)

  // Column headers
  const colMid = statX + statW / 2
  ctx.font      = "700 12px Arial"
  ctx.fillStyle = "rgba(200,210,230,0.5)"
  ctx.textAlign = "left";  ctx.fillText("P1", statX + 20, statY + 22)
  ctx.textAlign = "right"; ctx.fillText("P2", statX + statW - 20, statY + 22)
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,210,230,0.35)"
  ctx.fillText("STAT", colMid, statY + 22)

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(statX + 12, statY + 34); ctx.lineTo(statX + statW - 12, statY + 34); ctx.stroke()

  const statRows = [
    ["Damage Dealt",   stats.p1.damageDealt,   stats.p2.damageDealt],
    ["Hits Landed",    stats.p1.hitsLanded,    stats.p2.hitsLanded],
    ["Max Combo",      stats.p1.maxCombo,       stats.p2.maxCombo],
    ["Specials Used",  stats.p1.specialsUsed,  stats.p2.specialsUsed],
    ["Ultimates Used", stats.p1.ultimatesUsed, stats.p2.ultimatesUsed],
    ["Rounds Won",     stats.p1.roundsWon,     stats.p2.roundsWon],
  ]

  statRows.forEach(([label, v1, v2], i) => {
    const ry   = statY + 50 + i * 27
    const bold = v1 > v2 ? "p1" : v2 > v1 ? "p2" : "draw"

    ctx.font      = "500 13px Arial"
    ctx.textAlign = "left"
    ctx.fillStyle = bold === "p1" ? "#7dd3fc" : "rgba(200,210,230,0.75)"
    ctx.fillText(String(v1), statX + 20, ry)

    ctx.textAlign = "right"
    ctx.fillStyle = bold === "p2" ? "#fca5a5" : "rgba(200,210,230,0.75)"
    ctx.fillText(String(v2), statX + statW - 20, ry)

    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(200,210,230,0.45)"
    ctx.font      = "400 12px Arial"
    ctx.fillText(label, colMid, ry)
  })

  // Perfect round badges
  if (stats.p1.perfectRounds > 0) {
    ctx.font = "700 11px Arial"; ctx.textAlign = "left"
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(`✦ PERFECT ×${stats.p1.perfectRounds}`, statX + 20, statY + statH - 16)
  }
  if (stats.p2.perfectRounds > 0) {
    ctx.font = "700 11px Arial"; ctx.textAlign = "right"
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(`PERFECT ×${stats.p2.perfectRounds} ✦`, statX + statW - 20, statY + statH - 16)
  }

  // ── BUTTONS ────────────────────────────────────────────────────
  const btnW = 180, btnH = 52, btnGap = 20
  const btnsY = ch * 0.82
  const btn1X = cw / 2 - btnW - btnGap / 2
  const btn2X = cw / 2 + btnGap / 2

  _drawVictoryBtn(ctx, btn1X, btnsY, btnW, btnH, "REMATCH",   rematchHover, "#3b82f6", "#60a5fa")
  _drawVictoryBtn(ctx, btn2X, btnsY, btnW, btnH, "MAIN MENU", menuHover,   "#374151", "#9ca3af")

  // Footer hint
  ctx.font      = "13px Arial"
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,210,230,0.35)"
  ctx.fillText("Click or press R to rematch  •  Esc / M for main menu", cw / 2, ch - 24)

  ctx.restore()
}

function _drawVictoryBtn(ctx, x, y, w, h, label, hovered, baseColor, hoverColor) {
  ctx.fillStyle = hovered ? hoverColor + "44" : baseColor + "22"
  _rrectFill(ctx, x, y, w, h, 12)
  ctx.strokeStyle = hovered ? hoverColor : baseColor + "88"
  ctx.lineWidth   = hovered ? 2 : 1
  _rrectStroke(ctx, x, y, w, h, 12)

  if (hovered) {
    ctx.save()
    ctx.shadowBlur  = 16
    ctx.shadowColor = hoverColor
    _rrectStroke(ctx, x, y, w, h, 12)
    ctx.restore()
  }

  ctx.font         = "700 16px Arial"
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle    = hovered ? "#f1f5f9" : "#94a3b8"
  ctx.fillText(label, x + w / 2, y + h / 2)
}

// ─────────────────────────────────────────────────────────────────
// INTRO SEQUENCE — shown before round 1 of a fresh match
// ─────────────────────────────────────────────────────────────────
export function drawMatchIntro(ctx, canvas, state) {
  const { p1Name = "P1", p2Name = "P2", timer = 0, maxTimer = 90 } = state
  const cw = canvas.width, ch = canvas.height
  const progress = 1 - timer / maxTimer  // 0 → 1

  ctx.save()

  // Slide-in banner from both sides
  const bannerH = 80
  const p1X = -cw * (1 - _easeOut(progress))
  const p2X =  cw * (1 - _easeOut(progress))

  // P1 banner (slides from left)
  ctx.fillStyle = "rgba(30,60,120,0.92)"
  ctx.fillRect(p1X, ch * 0.38, cw * 0.45, bannerH)
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2
  ctx.strokeRect(p1X, ch * 0.38, cw * 0.45, bannerH)

  ctx.textAlign    = "right"
  ctx.textBaseline = "middle"
  ctx.font         = "900 32px Arial"
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 16; ctx.shadowColor = "#38bdf8"
  ctx.fillText(p1Name, p1X + cw * 0.4, ch * 0.38 + bannerH / 2)
  ctx.shadowBlur   = 0

  // P2 banner (slides from right)
  const p2BannerX = cw * 0.55 + p2X
  ctx.fillStyle = "rgba(120,30,30,0.92)"
  ctx.fillRect(p2BannerX, ch * 0.52, cw * 0.45, bannerH)
  ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2
  ctx.strokeRect(p2BannerX, ch * 0.52, cw * 0.45, bannerH)

  ctx.textAlign    = "left"
  ctx.font         = "900 32px Arial"
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 16; ctx.shadowColor = "#f87171"
  ctx.fillText(p2Name, p2BannerX + cw * 0.05, ch * 0.52 + bannerH / 2)
  ctx.shadowBlur   = 0

  // "VS" center
  if (progress > 0.5) {
    const vsAlpha = Math.min(1, (progress - 0.5) * 4)
    ctx.globalAlpha = vsAlpha
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    ctx.font         = "900 64px Arial"
    ctx.fillStyle    = "#fbbf24"
    ctx.shadowBlur   = 24; ctx.shadowColor = "#f59e0b"
    ctx.fillText("VS", cw / 2, ch / 2)
    ctx.shadowBlur   = 0
  }

  ctx.restore()
}

function _easeOut(t) {
  return 1 - Math.pow(1 - Math.min(1, t), 3)
}

// ─────────────────────────────────────────────────────────────────
// VICTORY SCREEN STATE MANAGER
// Use this in game.js to manage the victory screen lifecycle.
// ─────────────────────────────────────────────────────────────────
export function createVictoryState() {
  return {
    active:       false,
    fadeAlpha:    0,
    fadeTimer:    0,
    winnerName:   "",
    winnerSide:   "p1",
    stats:        createMatchStats(),
    rematchHover: false,
    menuHover:    false
  }
}

export function updateVictoryState(vs, mouse, canvas) {
  if (!vs.active) return

  // Fade in
  vs.fadeAlpha = Math.min(1, vs.fadeAlpha + 0.04)

  const cw = canvas.width, ch = canvas.height
  const btnW = 180, btnH = 52, btnGap = 20
  const btnsY = ch * 0.82
  const btn1X = cw / 2 - btnW - btnGap / 2
  const btn2X = cw / 2 + btnGap / 2

  vs.rematchHover = _inRect(mouse.x, mouse.y, btn1X, btnsY, btnW, btnH)
  vs.menuHover    = _inRect(mouse.x, mouse.y, btn2X, btnsY, btnW, btnH)
}

export function handleVictoryClick(vs, mouse, canvas) {
  if (!vs.active || vs.fadeAlpha < 0.5) return null

  const cw = canvas.width, ch = canvas.height
  const btnW = 180, btnH = 52, btnGap = 20
  const btnsY = ch * 0.82

  if (_inRect(mouse.x, mouse.y, cw / 2 - btnW - btnGap / 2, btnsY, btnW, btnH)) return "rematch"
  if (_inRect(mouse.x, mouse.y, cw / 2 + btnGap / 2,        btnsY, btnW, btnH)) return "menu"
  return null
}

export function handleVictoryKey(vs, key) {
  if (!vs.active) return null
  if (key === "r")      return "rematch"
  if (key === "escape" || key === "m") return "menu"
  if (key === "enter")  return vs.rematchHover ? "rematch" : "menu"
  return null
}

// ─────────────────────────────────────────────────────────────────
// FIGHTER RESET — full state wipe for rematch
// ─────────────────────────────────────────────────────────────────
export function resetFighterForRematch(fighter) {
  if (!fighter) return

  const keep = {
    rosterKey: fighter.rosterKey,
    name:      fighter.name,
    side:      fighter.side,
    controls:  fighter.controls,
    playerNumber: fighter.playerNumber,
    // Base stats from character data
    maxHealth:    fighter.maxHealth,
    maxEnergy:    fighter.maxEnergy,
    baseSpeed:    fighter.baseSpeed,
    baseJump:     fighter.baseJump,
    dashSpeed:    fighter.dashSpeed,
    dashDuration: fighter.dashDuration,
    dashCooldownMax: fighter.dashCooldownMax,
    maxJumps:     fighter.maxJumps,
    jumpForce:    fighter.jumpForce,
    color:        fighter.color,
    energyConfig: fighter.energyConfig,
    animationData:fighter.animationData,
    spriteHandler:fighter.spriteHandler,
    basic_attacks:fighter.basic_attacks,
    specials:     fighter.specials,
    ultimate:     fighter.ultimate,
    transformationOrder: fighter.transformationOrder,
    transformations:     fighter.transformations,
    baseForm:     fighter.baseForm,
    traits:       fighter.traits,
    stats:        fighter.stats,
    w: fighter.w, h: fighter.h
  }

  // Reset all live combat state
  const resetFields = {
    health:        fighter.maxHealth,
    energy:        0,
    vx: 0, vy: 0,
    facing:        fighter.side === "p1" ? 1 : -1,
    onGround:      true,
    grounded:      true,
    isLaunched:    false,
    attacking:     false,
    currentAttack: null,
    currentMove:   null,
    moveTimer:     0,
    movePhase:     "idle",
    hitstun:       0,
    blockstun:     0,
    hitstop:       0,
    attackCooldown:0,
    comboCounter:  0,
    comboTimer:    0,
    invulnTimer:   0,
    colorFlash:    0,
    parryFlash:    0,
    armorFlash:    0,
    clashFlash:    0,
    isGrabbed:     false,
    grabTimer:     0,
    grabInputBuffer: 0,
    knockdownState:  false,
    knockdownTimer:  0,
    techRoll:        null,
    wallBounce:      false,
    dashTimer:       0,
    dashCooldown:    0,
    jumpCount:       0,
    jumpHeld:        false,
    airDashCount:    0,
    airDashing:      false,
    airDashTimer:    0,
    // Transformation reset
    currentForm:     fighter.transformationOrder?.[0] || "base",
    currentFormData: fighter.transformations?.[fighter.transformationOrder?.[0] || "base"] || null,
    transformIndex:  0,
    permanentForm:   false,
    oneWayTransformation: false,
    deathRitual:     false,
    ritualActive:    false,
    isMahoraga:      false,
    disabledSpecials:[],
    pendingCharacterSwap: null,
    domainBuff:      false,
    activeDomainTimer: 0,
    summonCooldown:  0,
    isUltimateActive:false,
    ultimateTimer:   0,
    wasInStartup:    false,
    _parryInputBuffer: 0,
    _wallBounceShake:  false,
    _pendingSpawn:     null,
    _techDash:         0,
    attackMultiplier:  1,
    damageMultiplier:  1,
    speedMultiplier:   1,
    defenseMultiplier: 1,
    infinityActive:    false,
    directionHistory:  [],
    adaptationLevels:  null
  }

  Object.assign(fighter, keep, resetFields)
}

// ─────────────────────────────────────────────────────────────────
// LOW HEALTH WARNING
// Draw a red pulse on the screen edges when a fighter is critical.
// ─────────────────────────────────────────────────────────────────
export function drawLowHealthWarning(ctx, canvas, p1, p2, globalFrameCount) {
  const cw = canvas.width, ch = canvas.height
  const p1Crit = (p1?.health || 0) / Math.max(1, p1?.maxHealth || 1) < 0.2
  const p2Crit = (p2?.health || 0) / Math.max(1, p2?.maxHealth || 1) < 0.2

  if (!p1Crit && !p2Crit) return

  const pulse = (Math.sin(globalFrameCount * 0.15) * 0.5 + 0.5) * 0.25

  ctx.save()

  if (p1Crit) {
    const grad = ctx.createLinearGradient(0, 0, cw * 0.3, 0)
    grad.addColorStop(0, `rgba(239,68,68,${pulse})`)
    grad.addColorStop(1, "transparent")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, cw, ch)
  }

  if (p2Crit) {
    const grad = ctx.createLinearGradient(cw, 0, cw * 0.7, 0)
    grad.addColorStop(0, `rgba(239,68,68,${pulse})`)
    grad.addColorStop(1, "transparent")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, cw, ch)
  }

  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// ROUND TIMER HUD (optional — draws in center top)
// ─────────────────────────────────────────────────────────────────
export function drawRoundTimer(ctx, canvas, framesRemaining, maxFrames = 5400) {
  if (framesRemaining < 0) return
  const cw      = canvas.width
  const seconds = Math.ceil(framesRemaining / 60)
  const urgent  = seconds <= 10

  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.font         = `900 ${urgent ? 30 : 26}px Arial`
  ctx.fillStyle    = urgent ? "#ef4444" : "rgba(255,255,255,0.85)"
  if (urgent) { ctx.shadowBlur = 12; ctx.shadowColor = "#ef4444" }
  ctx.fillText(String(seconds), cw / 2, 20)
  ctx.shadowBlur = 0
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function _inRect(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h
}

function _rrectFill(ctx, x, y, w, h, r = 10) { _rr(ctx, x, y, w, h, r); ctx.fill() }
function _rrectStroke(ctx, x, y, w, h, r = 10) { _rr(ctx, x, y, w, h, r); ctx.stroke() }
function _rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}
