// camera.js — dynamic camera that FRAMES BOTH FIGHTERS and guarantees they stay
// on screen, including during triple jumps / air combos.
//
// What changed from the last version:
//  - The camera now fits the full BOUNDING BOX of both fighters (including their
//    heights), not just the midpoint. If one fighter rockets upward, the camera
//    zooms out and rises to keep BOTH in view.
//  - An anti-lag "fit guarantee" pass: if smoothing falls behind a fast jump, the
//    camera snaps just enough to keep nobody off the top/bottom edge.
//  - Lower minZoom so it can pull out far enough for a sky-high triple jump.
//  - Same exported API, so it's still a straight drop-in replacement.

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

  // Soft vertical limits — a safety net, not a fixed frame. minY is very negative
  // so the camera can chase a triple jump straight up.
  minY: -1600,
  maxY: 2000,

  // Zoom range — lower floor so it can fit a tall vertical fight.
  minZoom: 0.40,
  maxZoom: 1.15,

  // Smoothing — snappier so the camera keeps up with a fast rise.
  moveSmooth: 0.15,
  zoomSmooth: 0.12,
  verticalMoveSmooth: 0.15,

  // Padding around the fighters' bounding box.
  horizontalPadding: 200,
  verticalPadding: 160,

  // Horizontal lead toward where fighters are moving.
  leadStrength: 5,

  // Margin kept between a fighter and the screen edge (world units).
  edgeMargin: 50,

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
    this.shakeStrength = Math.max(this.shakeTimer > 0 ? this.shakeStrength : 0, strength)
    this.shakeTimer = Math.max(this.shakeTimer, duration)
  },

  update(f1, f2, canvas) {
    if (!f1 || !f2) return
    const { width: cw, height: ch } = getCanvasMetrics(canvas)

    // ── BOUNDING BOX of both fighters (full height included) ──
    const a = boxOf(f1), b = boxOf(f2)
    const bbL = Math.min(a.l, b.l)
    const bbR = Math.max(a.r, b.r)
    const bbT = Math.min(a.t, b.t)
    const bbB = Math.max(a.b, b.b)

    const avgVx = ((f1.vx || 0) + (f2.vx || 0)) * 0.5

    const centerX = (bbL + bbR) / 2 + clamp(avgVx * this.leadStrength, -160, 160)
    const centerY = (bbT + bbB) / 2

    // ── ZOOM to fit the whole box ──
    const needW = (bbR - bbL) + this.horizontalPadding * 2
    const needH = (bbB - bbT) + this.verticalPadding * 2

    this.targetZoom = clamp(Math.min(cw / needW, ch / needH), this.minZoom, this.maxZoom)
    this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSmooth)

    // ── POSITION (free vertical follow) ──
    this.targetX = centerX
    this.targetY = centerY
    this.x = lerp(this.x, this.targetX, this.moveSmooth)
    this.y = lerp(this.y, this.targetY, this.verticalMoveSmooth)

    // ── WORLD CLAMP (only when the world is bigger than the view) ──
    let halfVW = (cw / this.zoom) / 2
    let halfVH = (ch / this.zoom) / 2

    if (this.worldWidth > halfVW * 2) this.x = clamp(this.x, halfVW, this.worldWidth - halfVW)
    else this.x = this.worldWidth / 2

    if (this.worldHeight > halfVH * 2) this.y = clamp(this.y, this.minY + halfVH, this.worldHeight - halfVH)

    // ── FIT GUARANTEE (anti-lag): never let a fighter leave top/bottom ──
    const m = this.edgeMargin
    const boxH = (bbB - bbT) + m * 2

    if (boxH > halfVH * 2) {
      // Box is taller than the view even after smoothing → pull zoom out hard and center.
      this.zoom = clamp(ch / boxH, this.minZoom, this.maxZoom)
      halfVH = (ch / this.zoom) / 2
      halfVW = (cw / this.zoom) / 2
      this.y = (bbT + bbB) / 2
    } else {
      // It fits — just make sure smoothing didn't leave someone past an edge.
      const viewT = this.y - halfVH
      const viewB = this.y + halfVH
      if (bbT < viewT + m) this.y = bbT - m + halfVH
      if (bbB > viewB - m) this.y = bbB + m - halfVH
    }

    // Re-clamp X in case the zoom changed.
    if (this.worldWidth > halfVW * 2) this.x = clamp(this.x, halfVW, this.worldWidth - halfVW)
    else this.x = this.worldWidth / 2

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

    // Keep fighters from sliding off the SIDES only (never vertical).
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
      if (f.x < vL + pad) { f.x = vL + pad; f.vx = Math.max(0, f.vx || 0) }
      if (f.x + fw > vR - pad) { f.x = vR - pad - fw; f.vx = Math.min(0, f.vx || 0) }
      // No vertical clamp — fighters jump as high as they like; the camera frames them.
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
