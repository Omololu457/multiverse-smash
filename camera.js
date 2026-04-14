// camera.js — MK1-style dynamic camera + viewport clamping

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

  minY: 0,
  maxY: 1600,

  // Tightened zoom limits
  minZoom: 0.65,
  maxZoom: 1.0,

  // Smoothing
  moveSmooth: 0.08,
  zoomSmooth: 0.05,
  verticalMoveSmooth: 0.06,

  // Tighter framing
  horizontalPadding: 260,
  verticalOffset: -80,

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
    this.y = this.worldHeight * 0.35
    this.zoom = 0.9

    this.targetX = this.x
    this.targetY = this.y
    this.targetZoom = this.zoom

    this.shakeTimer = 0
    this.shakeX = 0
    this.shakeY = 0
  },

  shake(strength = 10, duration = 15) {
    this.shakeStrength = strength
    this.shakeTimer = duration
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return

    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    // ── MIDPOINT ─────────────────────────
    const f1cx = getCenterX(f1)
    const f1cy = getCenterY(f1)
    const f2cx = getCenterX(f2)
    const f2cy = getCenterY(f2)

    const midX = (f1cx + f2cx) * 0.5
    const midY = (f1cy + f2cy) * 0.5

    // ── ZOOM ─────────────────────────────
    const spreadX = Math.abs(f1cx - f2cx) + this.horizontalPadding * 2
    const spreadY = Math.abs(f1cy - f2cy) + 260

    const zoomForWidth  = cw / Math.max(1, spreadX)
    const zoomForHeight = ch / Math.max(1, spreadY)

    this.targetZoom = clamp(
      Math.min(zoomForWidth, zoomForHeight),
      this.minZoom,
      this.maxZoom
    )

    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    // ── POSITION ─────────────────────────
    this.targetX = midX
    this.targetY = midY + this.verticalOffset

    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    // ── WORLD CLAMP ──────────────────────
    const viewW = cw / this.zoom
    const viewH = ch / this.zoom

    const halfVW = viewW * 0.5
    const halfVH = viewH * 0.5

    this.x = clamp(this.x, halfVW, this.worldWidth - halfVW)
    this.y = clamp(this.y, halfVH + this.minY, this.worldHeight - halfVH)

    // ── SHAKE ────────────────────────────
    if (this.shakeTimer > 0) {
      this.shakeTimer--
      this.shakeX = (Math.random() - 0.5) * this.shakeStrength
      this.shakeY = (Math.random() - 0.5) * this.shakeStrength
    } else {
      this.shakeX = 0
      this.shakeY = 0
    }

    // ── KEEP FIGHTERS IN VIEW ────────────
    this.clampFightersToView(f1, f2, canvas)
  },

  clampFightersToView(f1, f2, canvas) {
    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    const vL = this.x - (cw / this.zoom) / 2
    const vR = this.x + (cw / this.zoom) / 2
    const vT = this.y - (ch / this.zoom) / 2
    const vB = this.y + (ch / this.zoom) / 2

    const pad = 30

    for (const f of [f1, f2]) {
      if (!f) continue

      if (f.x < vL + pad) {
        f.x = vL + pad
        f.vx = Math.max(0, f.vx)
      }

      if (f.x + f.w > vR - pad) {
        f.x = vR - pad - f.w
        f.vx = Math.min(0, f.vx)
      }

      if (f.y < vT + pad) {
        f.y = vT + pad
        f.vy = Math.max(0, f.vy)
      }

      if (f.y + f.h > vB - pad) {
        f.y = vB - pad - f.h
        f.vy = 0
      }
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
