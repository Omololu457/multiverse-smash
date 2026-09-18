// harness/camera_ultrawide.test.mjs
// TRACK E: the camera must never reveal background PAST the world at the sides — even on an ultrawide
// viewport at the low zoom floor. Pure-node test of camera.js: a viewport-aware minimum zoom keeps the
// visible width ≤ worldWidth, so the world always spans the screen (position-centering then keeps the
// view inside [0, worldWidth]). Also proves NO change on ≤16:9 viewports.
import { camera } from "../camera.js"

let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }

const WORLD = 3200
// Drive advance() to steady state at the given viewport with the target pinned to the LOW floor
// (worst case = the camera trying to zoom all the way out). Returns {zoom, viewW, left, right}.
function settle(cw, ch) {
  camera.worldWidth = WORLD
  camera.zoom = camera.minZoom
  camera.targetZoom = camera.minZoom          // ask to zoom ALL the way out (the bug's trigger)
  camera.x = WORLD * 0.5
  camera.y = 300; camera.targetX = WORLD * 0.5; camera.targetY = 300
  camera.shakeTimer = 0
  const canvas = { width: cw, height: ch }
  for (let i = 0; i < 400; i++) camera.advance(canvas)   // converge past the per-frame zoom rate limit
  const viewW = cw / camera.zoom
  const left = camera.x - viewW / 2, right = camera.x + viewW / 2
  return { zoom: camera.zoom, viewW, left, right }
}

section("ULTRAWIDE 3440×1440 (21:9) — the reported edge case")
let r = settle(3440, 1440)
check("min zoom raised so the world fills the width", r.zoom >= 3440 / WORLD - 1e-6, `zoom=${r.zoom.toFixed(3)} need≥${(3440 / WORLD).toFixed(3)}`)
check("visible width does NOT exceed the world", r.viewW <= WORLD + 0.5, `viewW=${r.viewW.toFixed(1)} world=${WORLD}`)
check("view LEFT edge never goes past world start (0)", r.left >= -0.5, `left=${r.left.toFixed(1)}`)
check("view RIGHT edge never goes past worldWidth", r.right <= WORLD + 0.5, `right=${r.right.toFixed(1)}`)

section("SUPER-ULTRAWIDE 5120×1440 (32:9)")
r = settle(5120, 1440)
check("visible width does NOT exceed the world", r.viewW <= WORLD + 0.5, `viewW=${r.viewW.toFixed(1)}`)
check("both view edges within [0, world]", r.left >= -0.5 && r.right <= WORLD + 0.5, `[${r.left.toFixed(1)}, ${r.right.toFixed(1)}]`)

section("REGRESSION — normal 16:9 viewports are UNCHANGED (min zoom stays 0.40)")
check("1280×720 min-zoom-for-view === static minZoom", Math.abs(camera.minZoomForView(1280) - camera.minZoom) < 1e-6, `${camera.minZoomForView(1280)} vs ${camera.minZoom}`)
r = settle(1280, 720)
check("1280×720 still reaches the low zoom floor (0.40)", Math.abs(r.zoom - camera.minZoom) < 1e-6, `zoom=${r.zoom.toFixed(3)}`)
check("1920×1080 fullscreen floor = 0.60 (fills the wider width)", Math.abs(camera.minZoomForView(1920) - 0.60) < 1e-6, `${camera.minZoomForView(1920).toFixed(3)}`)

console.log(`\n${FAIL === 0 ? "✅" : "❌"} camera-ultrawide: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL === 0 ? 0 : 1)
