// camera.js
// MK1-Style Dynamic Panning & Zooming — fixed to always track both fighters

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function getCenterX(entity) {
  return (entity?.x || 0) + (entity?.w || entity?.width || 60) * 0.5
}

function getCenterY(entity) {
  return (entity?.y || 0) + (entity?.h || entity?.height || 100) * 0.5
}

function getCanvasMetrics(canvasOrCtx) {
  const canvas = canvasOrCtx?.canvas || canvasOrCtx || null
  return {
    width:  canvas?.width  || window.innerWidth  || 1280,
    height: canvas?.height || window.innerHeight || 720
  }
}

export const camera = {
  x: 0,
  y: 0,
  zoom: 1,
  targetX: 0,
  targetY: 0,
  targetZoom: 1,

  worldWidth:  3200,
  worldHeight: 1600,

  minY: 0,
  maxY: 1600,

  // Zoom limits — keep fighters visible without zooming out too far
  minZoom: 0.55,
  maxZoom: 1.0,

  // Smoothing — higher = snappier, lower = floatier
  moveSmooth:         0.08,
  zoomSmooth:         0.05,
  verticalMoveSmooth: 0.06,

  // Horizontal padding added on each side of the fighter spread
  // Increase this to zoom out more aggressively when fighters are far apart
  horizontalPadding: 320,

  // Shifts camera upward so jumps stay visible
  verticalOffset: -80,

  // Shake system
  shakeTimer:    0,
  shakeStrength: 0,
  shakeX:        0,
  shakeY:        0,

  setWorldBounds(width, height) {
    this.worldWidth  = width  || this.worldWidth
    this.worldHeight = height || this.worldHeight
  },

  setVerticalLimits(minY, maxY) {
    this.minY = minY
    this.maxY = maxY
  },

  reset() {
    // Start centered in the world
    this.x    = this.worldWidth  * 0.5
    this.y    = this.worldHeight * 0.35
    this.zoom = 0.9
    this.targetX    = this.x
    this.targetY    = this.y
    this.targetZoom = this.zoom
    this.shakeTimer = 0
    this.shakeX     = 0
    this.shakeY     = 0
  },

  shake(strength = 10, duration = 15) {
    this.shakeStrength = strength
    this.shakeTimer    = duration
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return

    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    // ── 1. MIDPOINT between both fighters ──────────────────────────
    const f1cx = getCenterX(f1)
    const f1cy = getCenterY(f1)
    const f2cx = getCenterX(f2)
    const f2cy = getCenterY(f2)

    const midX = (f1cx + f2cx) * 0.5
    const midY = (f1cy + f2cy) * 0.5

    // ── 2. ZOOM based on how far apart the fighters are ────────────
    // We need the viewport (in world units) to contain both fighters
    // plus padding on each side.
    const spreadX = Math.abs(f1cx - f2cx) + this.horizontalPadding * 2
    const spreadY = Math.abs(f1cy - f2cy) + 260

    const zoomForWidth  = cw / Math.max(1, spreadX)
    const zoomForHeight = ch / Math.max(1, spreadY)

    // Use whichever axis needs more zoom-out
    this.targetZoom = clamp(
      Math.min(zoomForWidth, zoomForHeight),
      this.minZoom,
      this.maxZoom
    )

    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    // ── 3. TARGET POSITION ─────────────────────────────────────────
    this.targetX = midX
    this.targetY = midY + this.verticalOffset

    // ── 4. SMOOTH LERP toward target ───────────────────────────────
    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    // ── 5. WORLD BOUNDARY CLAMPING ────────────────────────────────
    // Prevent the camera from showing outside the stage
    const viewW = cw / this.zoom
    const viewH = ch / this.zoom

    const halfVW = viewW * 0.5
    const halfVH = viewH * 0.5

    this.x = clamp(this.x, halfVW,                    this.worldWidth  - halfVW)
    this.y = clamp(this.y, halfVH + this.minY,        this.worldHeight - halfVH)

    // ── 6. SHAKE ──────────────────────────────────────────────────
    if (this.shakeTimer > 0) {
      this.shakeTimer--
      this.shakeX = (Math.random() - 0.5) * this.shakeStrength
      this.shakeY = (Math.random() - 0.5) * this.shakeStrength
    } else {
      this.shakeX = 0
      this.shakeY = 0
    }
  },

  applyTransform(ctx, canvas) {
    if (!ctx) return
    const { width: cw, height: ch } = getCanvasMetrics(canvas || ctx)

    ctx.save()
    // Pivot around screen center
    ctx.translate(cw * 0.5, ch * 0.5)
    ctx.scale(this.zoom, this.zoom)
    // Offset by camera world position + shake
    ctx.translate(
      -(this.x) + this.shakeX,
      -(this.y) + this.shakeY
    )
  },

  clearTransform(ctx) {
    if (!ctx) return
    ctx.restore()
  },

  // Optional: focus on a specific point (used by abilities)
  focusBetween(a, b, zoomTarget = 1.0, frames = 10) {
    if (!a || !b) return
    this.targetX    = (getCenterX(a) + getCenterX(b)) * 0.5
    this.targetY    = (getCenterY(a) + getCenterY(b)) * 0.5
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  },

  focusOnFighter(fighter, zoomTarget = 1.0, frames = 10) {
    if (!fighter) return
    this.targetX    = getCenterX(fighter)
    this.targetY    = getCenterY(fighter)
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  }
}
