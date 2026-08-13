// platforms.js
// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY CLIMBABLE PLATFORMS — reusable primitive (Wood Release terrain, Stage 1).
//
// A standable surface that RISES out of the ground, HOLDS at full height, then RECEDES back down —
// the collision line and the visual are driven by ONE growth value so they can never desync (no ghost
// platform that is visually gone but still solid, or visually there but hollow).
//
// SOURCE OF TRUTH = the platform's own eased `growthP` (0..1). Everything else derives from it:
//   • standable top-Y  = groundY - maxHeight * growthP   (physics reads this via effectiveFloorFor)
//   • the visual        = the exact same rect (drawPlatforms) — in Stage 1 the drawn wood IS the
//                         collision box, so sync is correct by construction. (Stage 2 maps this same
//                         growthP onto Hashirama's tree sprite with a per-tier fill-height calibration.)
//
// ONE-WAY: a fighter lands on a platform when DESCENDING onto its top from above, and passes freely up
// through it from below — matching the "jump onto the wood and climb" fantasy without head-bonk trapping.
//
// DEFAULT-SAFE: with no platforms active, effectiveFloorFor returns the base ground unchanged, so
// physics.applyGravity behaves byte-for-byte as before for the whole roster.
//
// PURE + TESTABLE: no rendering deps in the state logic; drawPlatforms is the only browser-touching
// export and is a plain rect draw. Registry is a module-level array, cleared on startMatch.
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_DEFAULTS = {
  w:         120,   // standable span width (world px)
  maxHeight: 180,   // full standable height above the ground (world px)
  growDur:   26,    // frames to rise ground → full
  holdDur:   90,    // frames held at full height
  recedeDur: 30,    // frames to sink full → ground, then despawn
  landTol:   12,    // one-way catch tolerance — ALSO the ride-vs-fall threshold on a receding platform:
                    //   a platform sinking faster than ~landTol px/frame drops the rider (they fall) rather
                    //   than gluing them down. Grow/hold recede rates below stay under this → smooth ride.
}

const activePlatforms = []
let _pid = 0

const easeOutCubic = p => 1 - Math.pow(1 - p, 3)   // fast rise that settles — reads like wood erupting
const easeInCubic  = p => p * p * p                 // slow-then-quick sink on recede (mirror of the rise)
const clamp01 = p => (p < 0 ? 0 : p > 1 ? 1 : p)

// Recompute the derived height/top from the current phase + timer. Called every tick and at spawn.
function recompute(p) {
  let frac
  if (p.phase === "grow")        frac = p.growDur   > 0 ? easeOutCubic(clamp01(p.t / p.growDur))       : 1
  else if (p.phase === "hold")   frac = 1
  else /* recede */              frac = p.recedeDur > 0 ? 1 - easeInCubic(clamp01(p.t / p.recedeDur))  : 0
  p.growthP = frac
  p.height  = p.maxHeight * frac
  p.topY    = p.groundY - p.height            // standable surface (also the visible wood top in Stage 1)
}

// Spawn a climbable platform. Returns the platform object (also pushed to the active registry).
export function spawnPlatform(opts = {}) {
  const gy = opts.groundY != null ? opts.groundY : 520
  const p = {
    id:        opts.id != null ? opts.id : ("pf" + (++_pid)),
    owner:     opts.owner || null,          // optional fighter id/ref (cost attribution / future faction rules)
    x:         opts.x || 0,
    w:         opts.w         || PLATFORM_DEFAULTS.w,
    groundY:   gy,
    maxHeight: opts.maxHeight || PLATFORM_DEFAULTS.maxHeight,
    growDur:   opts.growDur   != null ? opts.growDur   : PLATFORM_DEFAULTS.growDur,
    holdDur:   opts.holdDur   != null ? opts.holdDur   : PLATFORM_DEFAULTS.holdDur,
    recedeDur: opts.recedeDur != null ? opts.recedeDur : PLATFORM_DEFAULTS.recedeDur,
    landTol:   opts.landTol   != null ? opts.landTol   : PLATFORM_DEFAULTS.landTol,
    phase:     "grow",
    t:         0,
    height:    0,
    topY:      gy,                           // starts flush with the ground (zero height)
    growthP:   0,
    sprite:    opts.sprite || null,          // optional tree-tier render config (drawPlatforms); null → plain box
  }
  recompute(p)
  activePlatforms.push(p)
  return p
}

// Advance every platform one frame through grow → hold → recede → despawn. Call once per battle frame
// BEFORE the fighters' applyGravity so the floor query reads the current top-Y.
export function updatePlatforms() {
  for (let i = activePlatforms.length - 1; i >= 0; i--) {
    const p = activePlatforms[i]
    p.t++
    if (p.phase === "grow" && p.t >= p.growDur)          { p.phase = "hold";   p.t = 0 }
    else if (p.phase === "hold" && p.t >= p.holdDur)     { p.phase = "recede"; p.t = 0 }
    else if (p.phase === "recede" && p.t >= p.recedeDur) { activePlatforms.splice(i, 1); continue }
    recompute(p)
  }
}

// The highest standable surface at/under the fighter's feet: the base ground, or any active platform the
// fighter is DESCENDING onto (one-way) or already resting on. Empty registry → returns baseFloor unchanged.
// Reads/writes only the fighter's own transient fields (_prevFeetY is stamped by applyGravity each frame).
export function effectiveFloorFor(fighter, baseFloor) {
  if (!fighter) return baseFloor
  if (!activePlatforms.length) { fighter._floorPlatformId = null; return baseFloor }   // registry empty → honest "on the ground"
  const fw = fighter.w || 0, fh = fighter.h || 0
  const curFeet  = fighter.y + fh
  const prevFeet = fighter._prevFeetY != null ? fighter._prevFeetY : curFeet
  const descending = (fighter.vy || 0) >= 0
  let best = baseFloor, bestId = null
  for (const p of activePlatforms) {
    if (!(fighter.x + fw > p.x && fighter.x < p.x + p.w)) continue   // horizontal span overlap
    const top = p.topY
    if (top >= baseFloor) continue                                   // not above the ground yet → nothing to stand on
    // ONE-WAY catch: feet must have come from at/above the surface (cameFromAbove) and reached it this
    // frame, while descending. Rising up through it (vy<0) or approaching from below is passed through.
    const tol = p.landTol
    if (!descending) continue
    if (prevFeet > top + tol) continue      // came from BELOW the surface → pass up through it
    if (curFeet  < top - tol) continue       // feet haven't reached it yet
    if (top < best) { best = top; bestId = p.id }   // higher surface wins (feet contact it first when falling)
  }
  fighter._floorPlatformId = bestId          // null = resting on the base ground (diagnostics / Stage-2 hooks)
  return best
}

export function clearPlatforms() { activePlatforms.length = 0; _pid = 0 }
export function getPlatforms() { return activePlatforms }

// Force a platform into its RECEDE phase early (e.g. a per-caster concurrent cap retiring the oldest one).
// No-op if already receding / unknown id.
export function recedePlatform(id) {
  const p = activePlatforms.find(z => z.id === id)
  if (p && p.phase !== "recede") { p.phase = "recede"; p.t = 0 }
  return !!p
}

// ── RENDER — the drawn wood's top edge IS the standable line, so the visual can't desync from collision.
// World-space: call inside the camera transform.
//   • Stage 1 default: a plain wood-toned box that IS the collision rect.
//   • Stage 2 (`p.sprite`): Hashirama's tree tier art. The FULLEST frame is drawn bottom-anchored at the
//     ground and scaled UNIFORMLY by growthP (height = p.height, width ∝ height), so the tree grows/recedes
//     out of the earth and its crown top lands on p.topY (the standable surface) — proven <1px since the
//     full frame is edge-to-edge opaque (padTopFrac ≈ 0.004). Frame-perfect sync by construction, no
//     per-frame alpha measurement needed.
const _imgCache = {}
function _img(src) {
  if (typeof Image === "undefined" || !src) return null
  let im = _imgCache[src]
  if (!im) { im = _imgCache[src] = new Image(); im.src = src }
  return (im.complete && im.naturalWidth > 0) ? im : null
}

export function drawPlatforms(ctx) {
  if (!ctx || !activePlatforms.length) return
  for (const p of activePlatforms) {
    if (p.height <= 0.5) continue
    const cx = p.x + p.w / 2

    if (p.sprite) {
      const img = _img(p.sprite.sheet)
      if (img) {
        const s = p.sprite
        const fi = (s.frames || 1) - 1                      // fullest growth frame
        const dh = p.height                                 // crown top → groundY-height = topY (padTop≈0 negligible)
        const dw = dh * (s.sw / s.sh)                        // proportional width → uniform scale (natural growth)
        ctx.drawImage(img, fi * s.sw, 0, s.sw, s.sh, cx - dw / 2, p.groundY - dh, dw, dh)
        continue
      }
      // sprite not decoded yet → fall through to the box so the surface is never invisible-but-solid.
    }

    const x = p.x, y = p.topY, w = p.w, h = p.height
    ctx.save()
    ctx.fillStyle = "#6b4a2b"                     // trunk
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = "rgba(0,0,0,0.18)"            // shaded right face for a little depth
    ctx.fillRect(x + w - 10, y, 10, h)
    ctx.fillStyle = "#8a6a3f"                     // standable lip (the actual collision top line)
    ctx.fillRect(x, y, w, 8)
    ctx.strokeStyle = "rgba(20,12,4,0.55)"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }
}
