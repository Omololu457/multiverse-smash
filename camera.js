// camera.js — smooth dynamic camera. Frames BOTH fighters, follows high jumps,
// and NEVER hard-snaps, so attacks/knockback/shake can't make the screen jerk.

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }
function lerp(a, b, t) { return a + (b - a) * t }

function getCanvasMetrics(c) {
  const cv = c?.canvas || c || null
  return {
    width:  cv?.width  || window.innerWidth  || 1280,
    height: cv?.height || window.innerHeight || 720
  }
}

function boxOf(f) {
  const w = f?.w || f?.width || 60
  const h = f?.h || f?.height || 110
  const x = f?.x || 0
  const y = f?.y || 0
  return { l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2 }
}

export const camera = {
  x: 0, y: 0, zoom: 1,
  targetX: 0, targetY: 0, targetZoom: 1,

  worldWidth: 3200,
  worldHeight: 2000,
  minY: -1600,
  maxY: 2000,

  minZoom: 0.40,
  maxZoom: 1.15,

  // Smoothing
  moveSmooth: 0.12,
  zoomSmooth: 0.08,
  verticalMoveSmooth: 0.12,

  // Max change per frame — prevents pops/jerks even on big position swings.
  maxZoomStep: 0.02,   // zoom units per frame
  maxPanStep: 60,      // world px per frame

  // Generous padding so the smoothed camera keeps both fighters framed without snapping.
  horizontalPadding: 280,
  verticalPadding: 260,

  leadStrength: 4,

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
    // Cap shake so it can never look like a glitch.
    strength = Math.min(strength, 14)
    this.shakeStrength = Math.max(this.shakeTimer > 0 ? this.shakeStrength : 0, strength)
    this.shakeTimer = Math.max(this.shakeTimer, duration)
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return
    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    const a = boxOf(f1), b = boxOf(f2)
    const bbL = Math.min(a.l, b.l)
    const bbR = Math.max(a.r, b.r)
    let   bbT = Math.min(a.t, b.t)
    const bbB = Math.max(a.b, b.b)

    // GIANT sprites (Sasuke's Susanoo): the drawn figure towers ~ch*frac ABOVE the feet —
    // far beyond the hitbox boxOf() sees — so the default framing cut the head off. Expand
    // the framed region upward to the sprite's real top; the zoom-to-fit below then pulls the
    // camera OUT so the whole figure fits (same intent as kurama's arena widen). Guarded by
    // _canvasHeightFrac → zero effect on normal fighters.
    for (const f of [f1, f2]) {
      if (f && f._canvasHeightFrac) {
        const feetY = (f.y || 0) + (f.h || f.height || 110)
        bbT = Math.min(bbT, feetY - ch * f._canvasHeightFrac)
      }
    }

    const avgVx = ((f1.vx || 0) + (f2.vx || 0)) * 0.5

    // ── TARGETS ──
    this.targetX = (bbL + bbR) / 2 + clamp(avgVx * this.leadStrength, -140, 140)
    this.targetY = (bbT + bbB) / 2

    const needW = (bbR - bbL) + this.horizontalPadding * 2
    const needH = (bbB - bbT) + this.verticalPadding * 2
    this.targetZoom = clamp(Math.min(cw / needW, ch / needH), this.minZoom, this.maxZoom)

    // Smooth toward those targets (shared with the cinematic path), then keep both
    // fighters framed.
    this.advance(canvas)
    this.clampFightersToView(f1, f2, canvas)
  },

  // Smooth + rate-limit the camera toward its CURRENT targets (targetX/Y/Zoom) and
  // tick shake — WITHOUT recomputing the two-fighter framing. update() calls this
  // after setting the framing targets; the domain cinematic calls it after
  // focusOnFighter() so a tight caster focus uses the exact same smoothing and
  // never hard-snaps.
  advance(canvas) {
    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    // ── SMOOTH + RATE-LIMIT (no snapping) ──
    let nextZoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)
    nextZoom = this.zoom + clamp(nextZoom - this.zoom, -this.maxZoomStep, this.maxZoomStep)
    this.zoom = clamp(nextZoom, this.minZoom, this.maxZoom)

    let nx = lerp(this.x, this.targetX, this.moveSmooth)
    let ny = lerp(this.y, this.targetY, this.verticalMoveSmooth)
    nx = this.x + clamp(nx - this.x, -this.maxPanStep, this.maxPanStep)
    ny = this.y + clamp(ny - this.y, -this.maxPanStep, this.maxPanStep)
    this.x = nx
    this.y = ny

    // ── WORLD CLAMP (only when the world is bigger than the view) ──
    const halfVW = (cw / this.zoom) / 2
    const halfVH = (ch / this.zoom) / 2
    if (this.worldWidth  > halfVW * 2) this.x = clamp(this.x, halfVW, this.worldWidth - halfVW)
    else this.x = this.worldWidth / 2
    if (this.worldHeight > halfVH * 2) this.y = clamp(this.y, this.minY + halfVH, this.worldHeight - halfVH)

    // ── SHAKE ──
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
  },

  clampFightersToView(f1, f2, canvas) {
    const { width: cw } = getCanvasMetrics(canvas)
    const vL = this.x - (cw / this.zoom) / 2
    const vR = this.x + (cw / this.zoom) / 2
    const pad = 30
    for (const f of [f1, f2]) {
      if (!f) continue
      const fw = f.w || f.width || 60
      if (f.x < vL + pad) { f.x = vL + pad; f.vx = Math.max(0, f.vx || 0) }
      if (f.x + fw > vR - pad) { f.x = vR - pad - fw; f.vx = Math.min(0, f.vx || 0) }
    }
  },

  applyTransform(ctx, canvas) {
    if (!ctx) return
    const { width: cw, height: ch } = getCanvasMetrics(canvas || ctx)
    ctx.save()
    ctx.translate(cw * 0.5, ch * 0.5)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY)
  },

  clearTransform(ctx) {
    if (!ctx) return
    ctx.restore()
  },

  focusBetween(p, q, zoomTarget = 1.0) {
    if (!p || !q) return
    const a = boxOf(p), b = boxOf(q)
    this.targetX = (a.cx + b.cx) * 0.5
    this.targetY = (a.cy + b.cy) * 0.5
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  },

  focusOnFighter(fighter, zoomTarget = 1.0) {
    if (!fighter) return
    const a = boxOf(fighter)
    this.targetX = a.cx
    this.targetY = a.cy
    this.targetZoom = clamp(zoomTarget, this.minZoom, this.maxZoom)
  }
}
