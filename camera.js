// camera.js
// Simple MK-style fighting game camera
// Copy-paste replacement

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
  const canvas =
    canvasOrCtx?.canvas ||
    canvasOrCtx ||
    null

  return {
    width: canvas?.width || canvas?.clientWidth || window.innerWidth || 1280,
    height: canvas?.height || canvas?.clientHeight || window.innerHeight || 720
  }
}

export const camera = {
  // Camera center in world space
  x: 0,
  y: 0,
  zoom: 1,

  targetX: 0,
  targetY: 0,
  targetZoom: 1,

  // World/stage size
  worldWidth: 3200,
  worldHeight: 900,

  // Vertical limits
  minY: 0,
  maxY: 900,

  // Zoom limits
  minZoom: 0.78,
  maxZoom: 1.0,

  // Smoothing
  moveSmooth: 0.12,
  zoomSmooth: 0.08,
  verticalMoveSmooth: 0.04,

  // Padding / framing
  horizontalPadding: 340,
  verticalPadding: 180,
  verticalOffset: -40,
  verticalBias: 0,
  lookAheadStrength: 0,
  topSafeMargin: 0,
  bottomSafeMargin: 0,

  // Shake
  shakeTimer: 0,
  shakeStrength: 0,
  shakeX: 0,
  shakeY: 0,

  setWorldBounds(width, height) {
    this.worldWidth = Math.max(1, width || this.worldWidth)
    this.worldHeight = Math.max(1, height || this.worldHeight)

    if (!Number.isFinite(this.maxY) || this.maxY <= this.minY) {
      this.minY = 0
      this.maxY = this.worldHeight
    }
  },

  setVerticalLimits(minY, maxY) {
    this.minY = Number.isFinite(minY) ? minY : 0
    this.maxY = Number.isFinite(maxY) ? maxY : this.worldHeight

    if (this.maxY < this.minY) {
      const temp = this.minY
      this.minY = this.maxY
      this.maxY = temp
    }
  },

  reset() {
    this.x = this.worldWidth * 0.5
    this.y = (this.minY + this.maxY) * 0.5
    this.zoom = 1

    this.targetX = this.x
    this.targetY = this.y
    this.targetZoom = 1

    this.shakeTimer = 0
    this.shakeStrength = 0
    this.shakeX = 0
    this.shakeY = 0
  },

  shake(strength = 8, duration = 10) {
    this.shakeStrength = Math.max(this.shakeStrength, strength || 0)
    this.shakeTimer = Math.max(this.shakeTimer, duration || 0)
  },

  focusOnPoint(x, y, zoom = 1, frames = 10) {
    this.targetX = x
    this.targetY = y
    this.targetZoom = clamp(zoom, this.minZoom, this.maxZoom)
  },

  focusOnFighter(fighter, zoom = 1, frames = 10) {
    if (!fighter) return
    this.focusOnPoint(getCenterX(fighter), getCenterY(fighter), zoom, frames)
  },

  focusBetween(a, b, zoom = 1, frames = 10) {
    if (!a && !b) return
    if (!a) return this.focusOnFighter(b, zoom, frames)
    if (!b) return this.focusOnFighter(a, zoom, frames)

    const midX = (getCenterX(a) + getCenterX(b)) * 0.5
    const midY = (getCenterY(a) + getCenterY(b)) * 0.5
    this.focusOnPoint(midX, midY, zoom, frames)
  },

  getDesiredState(f1, f2, canvas) {
    const { width: canvasWidth } = getCanvasMetrics(canvas)

    const c1x = getCenterX(f1)
    const c2x = getCenterX(f2)
    const c1y = getCenterY(f1)
    const c2y = getCenterY(f2)

    const midX = (c1x + c2x) * 0.5
    const midY = (c1y + c2y) * 0.5

    const distanceX = Math.abs(c2x - c1x)

    // MK-style zoom: mostly horizontal separation
    const neededWidth = distanceX + this.horizontalPadding * 2
    let desiredZoom = canvasWidth / Math.max(1, neededWidth)
    desiredZoom = clamp(desiredZoom, this.minZoom, this.maxZoom)

    // Optional look-ahead using fighter movement
    const v1 = f1?.vx || 0
    const v2 = f2?.vx || 0
    const avgVelocityX = (v1 + v2) * 0.5
    const lookAheadX = avgVelocityX * this.lookAheadStrength

    // Horizontal camera follows midpoint
    const desiredX = midX + lookAheadX

    // Vertical camera stays stable but still supports your existing settings
    const desiredY = midY + this.verticalOffset + this.verticalBias

    return {
      x: desiredX,
      y: desiredY,
      zoom: desiredZoom
    }
  },

  update(f1, f2, canvas) {
    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas)

    const desired = this.getDesiredState(f1, f2, canvas)

    this.targetZoom = desired.zoom
    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    this.targetX = desired.x
    this.targetY = desired.y

    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    const halfViewW = canvasWidth / this.zoom / 2
    const halfViewH = canvasHeight / this.zoom / 2

    // Clamp horizontally to stage width
    this.x = clamp(
      this.x,
      halfViewW,
      Math.max(halfViewW, this.worldWidth - halfViewW)
    )

    // Clamp vertically to provided limits
    const minCameraY = this.minY + halfViewH + this.topSafeMargin
    const maxCameraY = this.maxY - halfViewH - this.bottomSafeMargin

    if (minCameraY <= maxCameraY) {
      this.y = clamp(this.y, minCameraY, maxCameraY)
    } else {
      this.y = (this.minY + this.maxY) * 0.5
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer--
      this.shakeX = (Math.random() * 2 - 1) * this.shakeStrength
      this.shakeY = (Math.random() * 2 - 1) * this.shakeStrength * 0.35

      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0
        this.shakeStrength = 0
        this.shakeX = 0
        this.shakeY = 0
      }
    } else {
      this.shakeX = 0
      this.shakeY = 0
    }
  },

  begin(ctx, canvas) {
    if (!ctx) return

    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas || ctx)

    ctx.save()
    ctx.translate(canvasWidth * 0.5, canvasHeight * 0.5)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY)
  },

  end(ctx) {
    if (!ctx) return
    ctx.restore()
  },

  applyTransform(ctx, canvas) {
    this.begin(ctx, canvas || ctx)
  },

  clearTransform(ctx) {
    this.end(ctx)
  },

  worldToScreen(x, y, canvas) {
    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas)

    return {
      x: (x - this.x) * this.zoom + canvasWidth * 0.5 + this.shakeX * this.zoom,
      y: (y - this.y) * this.zoom + canvasHeight * 0.5 + this.shakeY * this.zoom
    }
  },

  screenToWorld(x, y, canvas) {
    const { width: canvasWidth, height: canvasHeight } = getCanvasMetrics(canvas)

    return {
      x: (x - canvasWidth * 0.5) / this.zoom + this.x - this.shakeX,
      y: (y - canvasHeight * 0.5) / this.zoom + this.y - this.shakeY
    }
  }
}