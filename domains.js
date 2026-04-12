// domains.js
// Domain Expansion system — activation, update, rendering, conflict resolution, HUD, and background effects.

import { sound, SFX, MUSIC } from "./sound.js"

export const activeDomains = []

const DOMAIN_DEFAULTS = {
  range: 320,
  duration: 8, // seconds
  cost: 100,
  priority: 1,
  damageBoost: 1.35,
  speedPenalty: 0.75,
  background: null
}

let _domainFadeIn = 0
let _domainFadeOut = 0
let _lastDomainBg = null

// ─────────────────────────────────────────────────────────────────
// ACTIVATION
// ─────────────────────────────────────────────────────────────────
export function activateDomain(fighter, options = {}, context = {}) {
  if (!fighter) return false

  const cost = options.cost ?? DOMAIN_DEFAULTS.cost
  if ((fighter.energy || 0) < cost && cost > 0) return false

  fighter.energy = Math.max(0, (fighter.energy || 0) - cost)

  const existing = activeDomains.findIndex(d => d.owner === fighter)
  if (existing >= 0) {
    collapseDomain(activeDomains[existing])
    activeDomains.splice(existing, 1)
  }

  const durationFrames = Math.floor((options.duration ?? fighter.domain?.duration ?? DOMAIN_DEFAULTS.duration) * 60)

  const domain = {
    owner: fighter,
    name: options.name || fighter.domain?.name || "Domain Expansion",
    priority: options.priority ?? fighter.domain?.priority ?? DOMAIN_DEFAULTS.priority,
    range: options.range ?? fighter.domain?.range ?? DOMAIN_DEFAULTS.range,
    timer: durationFrames,
    timerMax: durationFrames,
    background: options.background || fighter.domain?.background || DOMAIN_DEFAULTS.background,
    damageBoost: options.damageBoost ?? fighter.domain?.damageBoost ?? DOMAIN_DEFAULTS.damageBoost,
    speedPenalty: options.speedPenalty ?? fighter.domain?.speedPenalty ?? DOMAIN_DEFAULTS.speedPenalty,
    effect: options.effect || fighter.domain?.effect || null,
    active: true,
    rosterKey: (fighter.rosterKey || fighter.id || "").toLowerCase()
  }

  activeDomains.push(domain)

  fighter.domainBuff = true
  fighter.activeDomainTimer = durationFrames
  fighter.attackMultiplier = (fighter.attackMultiplier || 1) * domain.damageBoost

  _domainFadeIn = 6
  _domainFadeOut = 0
  _lastDomainBg = domain.rosterKey

  sound?.play?.(SFX.DOMAIN_ACTIVATE)
  sound?.playMusic?.(MUSIC.DOMAIN_LOOP, true)

  if (context?.camera?.shake) context.camera.shake(18, 20)

  return domain
}

// ─────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION
// ─────────────────────────────────────────────────────────────────
function resolveConflicts() {
  if (activeDomains.length <= 1) return

  activeDomains.sort((a, b) => b.priority - a.priority)

  for (let i = activeDomains.length - 1; i >= 1; i--) {
    collapseDomain(activeDomains[i])
    activeDomains.splice(i, 1)
  }
}

function collapseDomain(domain) {
  if (!domain?.owner) return

  const owner = domain.owner

  if (domain.damageBoost && domain.damageBoost !== 1) {
    owner.attackMultiplier = Math.max(1, (owner.attackMultiplier || 1) / domain.damageBoost)
  }

  owner.domainBuff = false
  owner.activeDomainTimer = 0
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
export function updateDomains(fighters = []) {
  resolveConflicts()

  if (_domainFadeIn > 0) _domainFadeIn--
  if (_domainFadeOut > 0) _domainFadeOut--

  for (let i = activeDomains.length - 1; i >= 0; i--) {
    const domain = activeDomains[i]
    if (!domain) {
      activeDomains.splice(i, 1)
      continue
    }

    domain.timer--
    if (domain.owner) {
      domain.owner.activeDomainTimer = Math.max(0, domain.timer)
    }

    for (const fighter of fighters) {
      if (!fighter || fighter === domain.owner) continue

      const ownerCX = (domain.owner.x || 0) + (domain.owner.w || 0) / 2
      const ownerCY = (domain.owner.y || 0) + (domain.owner.h || 0) / 2
      const fighterCX = (fighter.x || 0) + (fighter.w || 0) / 2
      const fighterCY = (fighter.y || 0) + (fighter.h || 0) / 2

      const dx = fighterCX - ownerCX
      const dy = fighterCY - ownerCY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > domain.range) continue

      if (domain.rosterKey === "gojo") {
        fighter.hitstun = Math.max(fighter.hitstun || 0, 4)
        fighter.vx = (fighter.vx || 0) * 0.8
        fighter.vy = (fighter.vy || 0) * 0.8
      } else if (domain.rosterKey === "sukuna") {
        if (Math.random() < 0.06) {
          fighter.health = Math.max(0, (fighter.health || 0) - 12)
          fighter.colorFlash = 4
          fighter.hitstun = Math.max(fighter.hitstun || 0, 4)
          fighter.vx = (fighter.vx || 0) * 0.5
          if (fighter.health <= 0) sound?.play?.(SFX.KO)
        }
      } else if (domain.rosterKey === "megumi") {
        fighter.vx = (fighter.vx || 0) * domain.speedPenalty
        fighter.vy = (fighter.vy || 0) * Math.max(0.85, domain.speedPenalty)
      } else {
        fighter.vx = (fighter.vx || 0) * domain.speedPenalty
        fighter.vy = (fighter.vy || 0) * Math.max(0.85, domain.speedPenalty)
      }

      if (typeof domain.effect === "function") {
        domain.effect(fighter, domain.owner, dist, domain.range)
      }
    }

    if (domain.timer <= 0) {
      collapseDomain(domain)
      activeDomains.splice(i, 1)
      _domainFadeOut = 20
      if (activeDomains.length === 0) sound?.stopMusic?.()
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// BACKGROUND DRAWING
// ─────────────────────────────────────────────────────────────────
export function drawDomainBackground(ctx, canvas, groundY, floorHeight) {
  if (activeDomains.length === 0 && _domainFadeOut <= 0) return
  if (!ctx) return

  const cw = canvas?.width || window.innerWidth
  const ch = canvas?.height || window.innerHeight
  const domain = activeDomains[0]
  const bgType = domain?.rosterKey || _lastDomainBg
  const fadeAlpha = domain ? 1 : Math.max(0, _domainFadeOut / 20)

  if (fadeAlpha <= 0) return

  ctx.save()
  ctx.globalAlpha = fadeAlpha

  switch (bgType) {
    case "gojo":
      _drawUnlimitedVoid(ctx, cw, ch)
      break
    case "sukuna":
      _drawMalevolentShrine(ctx, cw, ch)
      break
    case "megumi":
      _drawChimeraShadowGarden(ctx, cw, ch)
      break
    default:
      _drawGenericDomain(ctx, cw, ch, domain)
      break
  }

  ctx.restore()

  if (_domainFadeIn > 0) {
    ctx.save()
    ctx.fillStyle = "#ffffff"
    ctx.globalAlpha = (_domainFadeIn / 6) * 0.85
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
  }
}

function _drawUnlimitedVoid(ctx, cw, ch) {
  ctx.fillStyle = "#000008"
  ctx.fillRect(0, 0, cw, ch)

  const t = performance.now() * 0.0003
  ctx.fillStyle = "rgba(220,230,255,0.85)"

  for (let i = 0; i < 280; i++) {
    const sx = ((Math.sin(i * 127.1 + 1) * 0.5 + 0.5) * cw + t * 8 * (i % 5)) % cw
    const sy = (Math.cos(i * 311.7 + 2) * 0.5 + 0.5) * ch
    ctx.beginPath()
    ctx.arc(sx, sy, 0.5 + (i % 3) * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const nebulae = [
    { x: cw * 0.25, y: ch * 0.3, r: cw * 0.28, c: "rgba(30,40,140,0.18)" },
    { x: cw * 0.7, y: ch * 0.6, r: cw * 0.22, c: "rgba(80,20,120,0.15)" },
    { x: cw * 0.5, y: ch * 0.15, r: cw * 0.18, c: "rgba(20,60,180,0.12)" }
  ]

  nebulae.forEach(n => {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
    g.addColorStop(0, n.c)
    g.addColorStop(1, "transparent")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cw, ch)
  })

  ctx.strokeStyle = "rgba(180,200,255,0.05)"
  ctx.lineWidth = 1

  for (let gx = 0; gx < cw; gx += 60) {
    ctx.beginPath()
    ctx.moveTo(gx, 0)
    ctx.lineTo(gx, ch)
    ctx.stroke()
  }

  for (let gy = 0; gy < ch; gy += 60) {
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(cw, gy)
    ctx.stroke()
  }

  _drawDomainLabel(ctx, cw, ch, "Unlimited Void", "#60a5fa")
}

function _drawMalevolentShrine(ctx, cw, ch) {
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, "#1a0000")
  g.addColorStop(0.5, "#3b0000")
  g.addColorStop(1, "#0f0000")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  ctx.strokeStyle = "rgba(200,50,30,0.3)"
  ctx.lineWidth = 2

  ;[
    [cw * 0.1, ch * 0.85, cw * 0.2, ch * 0.75],
    [cw * 0.6, ch * 0.9, cw * 0.7, ch * 0.78],
    [cw * 0.4, ch * 0.95, cw * 0.55, ch * 0.75]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  })

  const t = Math.floor(performance.now() / 180)
  for (let i = 0; i < 6; i++) {
    const seed = (t + i * 17) % 100
    const alpha = ((t * 7 + i * 13) % 60) / 60
    if (alpha < 0.2) continue

    const x1 = (seed * 137 + i * 89) % cw
    const y1 = (seed * 231 + i * 47) % (ch * 0.8)

    ctx.save()
    ctx.globalAlpha *= alpha * 0.6
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + 80 + (seed % 60), y1 + 40 + (seed % 40))
    ctx.stroke()
    ctx.restore()
  }

  ctx.fillStyle = "rgba(80,0,0,0.55)"
  for (let i = 0; i < 12; i++) {
    const t2 = performance.now() * 0.0008 + i
    const bx = (Math.sin(i * 83.4 + t2) * 0.5 + 0.5) * cw
    const by = (Math.cos(i * 177.1 + t2 * 0.5) * 0.5 + 0.5) * ch * 0.7
    ctx.fillRect(bx - 6, by - 3, 12, 6)
  }

  _drawDomainLabel(ctx, cw, ch, "Malevolent Shrine", "#ef4444")
}

function _drawChimeraShadowGarden(ctx, cw, ch) {
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, cw, ch)

  const pg = ctx.createRadialGradient(cw / 2, ch * 0.85, 20, cw / 2, ch * 0.85, cw * 0.55)
  pg.addColorStop(0, "rgba(80,0,120,0.6)")
  pg.addColorStop(1, "transparent")
  ctx.fillStyle = pg
  ctx.fillRect(0, 0, cw, ch)

  const t = performance.now() * 0.0006
  ctx.strokeStyle = "rgba(120,40,180,0.12)"
  ctx.lineWidth = 1

  for (let i = 1; i < 5; i++) {
    const rad = 80 + i * 60 + Math.sin(t + i) * 15
    ctx.beginPath()
    ctx.arc(cw / 2, ch * 0.85, rad, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = "rgba(60,0,90,0.5)"
  ;[
    { x: cw * 0.12, y: ch * 0.55, rx: 30, ry: 18 },
    { x: cw * 0.78, y: ch * 0.35, rx: 40, ry: 24 },
    { x: cw * 0.62, y: ch * 0.58, rx: 33, ry: 25 },
    { x: cw * 0.3, y: ch * 0.4, rx: 50, ry: 36 }
  ].forEach(s => {
    ctx.beginPath()
    ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })

  _drawDomainLabel(ctx, cw, ch, "Chimera Shadow Garden", "#a78bfa")
}

function _drawGenericDomain(ctx, cw, ch, domain) {
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, "#0a000a")
  g.addColorStop(1, "#1a001a")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  _drawDomainLabel(ctx, cw, ch, domain?.name || "Domain Expansion", "#d8b4fe")
}

function _drawDomainLabel(ctx, cw, ch, name, color) {
  ctx.save()
  ctx.font = "900 28px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = color
  ctx.shadowBlur = 24
  ctx.shadowColor = color
  ctx.globalAlpha = 0.65
  ctx.fillText(name, cw / 2, ch * 0.12)
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// WORLD DRAWING
// ─────────────────────────────────────────────────────────────────
export function drawDomains(ctx) {
  if (!ctx) return

  for (const domain of activeDomains) {
    if (!domain?.owner) continue

    const owner = domain.owner
    const cx = (owner.x || 0) + (owner.w || 0) / 2
    const cy = (owner.y || 0) + (owner.h || 0) / 2
    const radius = domain.range
    const alpha = Math.min(0.22, (domain.timer / 60) * 0.04 + 0.08)

    ctx.save()

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = owner.color || "rgba(180,100,255,0.9)"
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.55
    ctx.stroke()

    ctx.globalAlpha = alpha
    ctx.fillStyle = owner.color || "rgba(130,60,200,0.4)"
    ctx.fill()

    ctx.globalAlpha = 1

    if (domain.name) {
      ctx.font = "700 14px Arial"
      ctx.fillStyle = owner.color || "#d0a0ff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(domain.name, cx, cy - radius + 22)
    }

    const timerRatio = Math.max(0, domain.timer / ((domain.timerMax || domain.timer) || 1))
    const barW = radius * 1.4

    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW, 8)

    ctx.fillStyle = owner.color || "#a855f7"
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW * timerRatio, 8)

    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
export function getDomainHUDData() {
  if (!activeDomains.length) return null

  const d = activeDomains[0]
  return {
    name: d.name,
    owner: d.owner?.name || "?",
    ratio: Math.max(0, d.timer / (d.timerMax || 1)),
    color: d.owner?.color || "#a78bfa",
    rosterKey: d.rosterKey
  }
}

export function isInsideDomain(fighter) {
  for (const domain of activeDomains) {
    if (!domain?.owner || domain.owner === fighter) continue

    const cx = (domain.owner.x || 0) + (domain.owner.w || 0) / 2
    const cy = (domain.owner.y || 0) + (domain.owner.h || 0) / 2
    const fx = (fighter.x || 0) + (fighter.w || 0) / 2
    const fy = (fighter.y || 0) + (fighter.h || 0) / 2
    const dx = fx - cx
    const dy = fy - cy

    if (Math.sqrt(dx * dx + dy * dy) <= domain.range) return domain
  }

  return null
}

export function clearDomains() {
  for (const d of activeDomains) collapseDomain(d)
  activeDomains.length = 0
  _domainFadeIn = 0
  _domainFadeOut = 0
  _lastDomainBg = null
  sound?.stopMusic?.()
}
