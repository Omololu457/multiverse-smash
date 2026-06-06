// camera.js — dynamic MK1-style camera with vertical freedom + air-combo framing
//
// CHANGES IN THIS VERSION:
//  - No fixed height. The camera follows the fighters' midpoint vertically and
//    will chase a triple jump straight up instead of pinning to a set Y.
//  - Zoom reacts to BOTH horizontal and vertical spread, and eases out a little
//    when the action goes airborne so combos stay in frame.
//  - Velocity-based "lead" makes the camera drift toward where fighters are going.
//  - clampFightersToView no longer shoves fighters down — it only keeps them from
//    sliding off the sides, so jumps are never capped by the camera.
//  - Same exported API as before, so it's a straight drop-in replacement.

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }
function lerp(a, b, t) { return a + (b - a) * t }

function getCenterX(e) {
  return (e?.x || 0) + (e?.w || e?.width || 60) * 0.5
}

function getCenterY(e) {
  return (e?.y || 0) + (e?.h || e?.height || 100) * 0.5
}

function getCanvasMetrics(c) {
  const cv = c?.canvas || c || null
  return {
    width:  cv?.width  || window.innerWidth  || 1280,
    height: cv?.height || window.innerHeight || 720
  }
}

export const camera = {
  x: 0, y: 0, zoom: 1,
  targetX: 0, targetY: 0, targetZoom: 1,

  worldWidth: 3200,
  worldHeight: 1600,

  // Soft vertical limits — a safety net only, NOT a fixed frame.
  minY: -900,
  maxY: 1600,

  // Wider, more cinematic zoom range so the camera can really push and pull.
  minZoom: 0.5,
  maxZoom: 1.15,

  // Smoothing — snappier than before so motion reads as dynamic.
  moveSmooth: 0.12,
  zoomSmooth: 0.07,
  verticalMoveSmooth: 0.10,

  // Framing padding around the fighters.
  horizontalPadding: 240,
  verticalPadding: 200,

  // Lead: camera drifts toward where the fighters are heading.
  leadStrength: 6,

  // Shake
  shakeTimer: 0,
  shakeStrength: 0,
  shakeX: 0,
  shakeY: 0,

  setWorldBounds(w, h) {
    this.worldWidth  = w || this.worldWidth
    this.worldHeight = h || this.worldHeight
  },

  setVerticalLimits(mn, mx) {
    this.minY = mn
    this.maxY = mx
  },

  reset() {
    this.x = this.worldWidth * 0.5
    this.y = this.worldHeight * 0.45
    this.zoom = 0.85

    this.targetX = this.x
    this.targetY = this.y
    this.targetZoom = this.zoom

    this.shakeTimer = 0
    this.shakeStrength = 0
    this.shakeX = 0
    this.shakeY = 0
  },

  shake(strength = 10, duration = 15) {
    // A small shake shouldn't cancel a big in-progress one.
    this.shakeStrength = Math.max(this.shakeTimer > 0 ? this.shakeStrength : 0, strength)
    this.shakeTimer = Math.max(this.shakeTimer, duration)
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return

    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    const f1cx = getCenterX(f1), f1cy = getCenterY(f1)
    const f2cx = getCenterX(f2), f2cy = getCenterY(f2)

    // ── MIDPOINT (velocity-led) ──────────────────
    const avgVx = ((f1.vx || 0) + (f2.vx || 0)) * 0.5
    const avgVy = ((f1.vy || 0) + (f2.vy || 0)) * 0.5

    const midX = (f1cx + f2cx) * 0.5 + clamp(avgVx * this.leadStrength, -160, 160)
    const midY = (f1cy + f2cy) * 0.5 + clamp(avgVy * (this.leadStrength * 0.6), -150, 150)

    // ── ZOOM (reacts on both axes) ───────────────
    const spreadX = Math.abs(f1cx - f2cx) + this.horizontalPadding * 2
    const spreadY = Math.abs(f1cy - f2cy) + this.verticalPadding * 2

    // How high is the action? Ease the camera out a touch for air combos.
    const groundish = this.worldHeight * 0.62
    const highest   = Math.min(f1cy, f2cy)
    const airFactor = clamp((groundish - highest) / 600, 0, 1) // 0 grounded → 1 way up

    const zoomForWidth  = cw / Math.max(1, spreadX)
    const zoomForHeight = ch / Math.max(1, spreadY)

    let z = Math.min(zoomForWidth, zoomForHeight)
    z *= (1 - airFactor * 0.18)

    this.targetZoom = clamp(z, this.minZoom, this.maxZoom)
    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    // ── POSITION (vertical is free) ──────────────
    this.targetX = midX
    this.targetY = midY

    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    // ── WORLD CLAMP (generous, so it can chase a sky-high jump) ──
    const viewW = cw / this.zoom
    const viewH = ch / this.zoom
    const halfVW = viewW * 0.5
    const halfVH = viewH * 0.5

    this.x = clamp(this.x, halfVW, this.worldWidth - halfVW)

    const topGuard = this.minY + halfVH
    const botGuard = this.worldHeight - halfVH
    this.y = clamp(this.y, topGuard, Math.max(topGuard, botGuard))

    // ── SHAKE (with falloff) ─────────────────────
    if (this.shakeTimer > 0) {
      this.shakeTimer--
      const falloff = clamp(this.shakeTimer / 15, 0, 1)
      this.shakeX = (Math.random() - 0.5) * this.shakeStrength * falloff * 2
      this.shakeY = (Math.random() - 0.5) * this.shakeStrength * falloff * 2
      if (this.shakeTimer <= 0) this.shakeStrength = 0
    } else {
      this.shakeX = 0
      this.shakeY = 0
    }

    // ── KEEP FIGHTERS ON-SCREEN (sides only) ─────
    this.clampFightersToView(f1, f2, canvas)
  },

  clampFightersToView(f1, f2, canvas) {
    const { width: cw } = getCanvasMetrics(canvas)

    const vL = this.x - (cw / this.zoom) / 2
    const vR = this.x + (cw / this.zoom) / 2
    const pad = 30

    for (const f of [f1, f2]) {
      if (!f) continue
      const fw = f.w || f.width || 60

      if (f.x < vL + pad) {
        f.x = vL + pad
        f.vx = Math.max(0, f.vx || 0)
      }
      if (f.x + fw > vR - pad) {
        f.x = vR - pad - fw
        f.vx = Math.min(0, f.vx || 0)
      }
      // NOTE: no vertical clamp on purpose — fighters can jump as high as they like
      // and the camera handles keeping them framed.
    }
  },

  applyTransform(ctx, canvas) {
    if (!ctx) return
    const { width: cw, height: ch } = getCanvasMetrics(canvas || ctx)

    ctx.save()
    ctx.translate(cw * 0.5, ch * 0.5)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(
      -this.x + this.shakeX,
      -this.y + this.shakeY
    )
  },

  clearTransform(ctx) {
    if (!ctx) return
    ctx.restore()
  },

  focusBetween(a, b, zoomTarget = 1.0) {
    if (!a || !b) return
    this.targetX = (getCenterX(a) + getCenterX(b)) * 0.5
    this.targetY = (getCenterY(a) + getCenterY(b)) * 0.5
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  },

  focusOnFighter(fighter, zoomTarget = 1.0) {
    if (!fighter) return
    this.targetX = getCenterX(fighter)
    this.targetY = getCenterY(fighter)
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  }
}
