// camera.js
// Optimized MK1-Style Dynamic Panning & Zooming

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function getCenterX(entity) {
  return (entity?.x || 0) + (entity?.w || entity?.width || 0) * 0.5
}

function getCenterY(entity) {
  return (entity?.y || 0) + (entity?.h || entity?.height || 0) * 0.5
}

function getCanvasMetrics(canvasOrCtx) {
  const canvas = canvasOrCtx?.canvas || canvasOrCtx || null
  return {
    width: canvas?.width || window.innerWidth || 1280,
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

  worldWidth: 3200,
  worldHeight: 1600,

  // Vertical limits (Clamps camera to stage floor)
  minY: 0,
  maxY: 1600,

  // Zoom limits: 0.7 allows significant pan out, 1.0 is default
  minZoom: 0.7, 
  maxZoom: 1.0,

  // Smoothing (Lower = smoother/slower)
  moveSmooth: 0.1,
  zoomSmooth: 0.06,
  verticalMoveSmooth: 0.08,

  // Framing
  horizontalPadding: 250, // Distance players can get to the edge before zoom/pan
  verticalOffset: -60,    // Shifts camera upward to show more of the air

  // Shake system
  shakeTimer: 0,
  shakeStrength: 0,
  shakeX: 0,
  shakeY: 0,

  setWorldBounds(width, height) {
    this.worldWidth = width || this.worldWidth
    this.worldHeight = height || this.worldHeight
  },

  setVerticalLimits(minY, maxY) {
    this.minY = minY;
    this.maxY = maxY;
  },

  reset() {
    this.x = this.worldWidth * 0.5
    this.y = 400
    this.zoom = 1
    this.shakeTimer = 0
  },

  shake(strength = 10, duration = 15) {
    this.shakeStrength = strength
    this.shakeTimer = duration
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return;
    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas)

    // 1. CALCULATE MIDPOINT
    const midX = (getCenterX(f1) + getCenterX(f2)) * 0.5
    const midY = (getCenterY(f1) + getCenterY(f2)) * 0.5

    // 2. CALCULATE ZOOM BASED ON DISTANCE
    const distanceX = Math.abs(getCenterX(f1) - getCenterX(f2))
    const neededWidth = distanceX + this.horizontalPadding * 2
    
    this.targetZoom = canvasWidth / Math.max(1, neededWidth)
    this.targetZoom = clamp(this.targetZoom, this.minZoom, this.maxZoom)
    
    // Smoothly apply zoom
    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    // 3. APPLY TARGETS
    this.targetX = midX
    this.targetY = midY + this.verticalOffset

    // 4. SMOOTH MOVEMENT (LERP)
    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    // 5. BOUNDARY CLAMPING (Keep camera inside world)
    const viewW = canvasWidth / this.zoom
    const viewH = canvasHeight / this.zoom

    this.x = clamp(this.x, viewW / 2, this.worldWidth - viewW / 2)
    this.y = clamp(this.y, viewH / 2, this.worldHeight - viewH / 2)

    // 6. SHAKE LOGIC
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
    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas || ctx)

    ctx.save()
    // Center the scale/transform to the middle of the screen
    ctx.translate(canvasWidth * 0.5, canvasHeight * 0.5)
    ctx.scale(this.zoom, this.zoom)
    // Move the world relative to camera position + shake
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY)
  },

  clearTransform(ctx) {
    if (!ctx) return
    ctx.restore()
  }
}
