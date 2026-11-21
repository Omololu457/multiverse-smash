// stageLayers.js — LAYERED BITMAP STAGES (render-only). A stage with `layers: "<set>"` in game.js STAGE_DEFS is drawn
// from cut-up sprite-sheet art instead of one flat picture:
//   • far layers scroll slower than the fighters (parallax), anchored so an art edge never scrolls into view;
//   • the floor is drawn ROW BY ROW, each row with its own scroll speed (far planks slow, the row the fighters stand
//     on locked to them, the front rim faster) — the arcade "line-scroll" perspective floor;
//   • animated pieces (crowd cheer frames, a flag) are painted over their parent layer at their found positions;
//   • props sit on the floor behind the fighters, and foreground props are drawn in FRONT of them (drawLayeredStageFront).
// Art + positions come from tools/stage_layers/slice_*.py → stages/<set>/layout.json. Everything here is presentation:
// wall-clock animation, no sim state, no Math.random — gameplay / netplay / replays are untouched.
import { camera } from "./camera.js"

// Per-set composition (native sheet pixels; S = screen pixels per native pixel).
const SETS = {
  ken_harbor: {
    dir: "./stages/ken_harbor/",
    S: 2,
    standRow: 44,                 // dock row the fighters' feet sit on (locked to the fighters: scroll factor 1)
    deckFrontRow: 53,             // last deck row; below it is the dock's front beam
    floor: { piece: "dock", farFactor: 0.70, rimFactor: 1.10 },
    // far → near. `p` = scroll factor (1 = moves with the fighters). `anchor` = the side whose art edge is a hard cut in
    // the sheet; `edge` = where that edge sits (screen px from the world centre) with the camera centred. When the view
    // would reach past the cut, the layer stops at the view edge instead (so the cut never shows, at any zoom).
    // `bottomRow` = dock row the layer's bottom sits on.
    back: [
      { piece: "sky",  p: 0.30, anchor: "right", edge: 660, bottomRow: 2, mirrorFill: { from: 0, to: 512 } },   // sea + yacht; open sea mirrored leftwards
      { piece: "ship", p: 0.62, anchor: "left", edge: -900, bottomRow: 6, bob: { amp: 1.5, period: 3.2 } },
    ],
    under: { piece: "sky", fromRow: 104, cols: [0, 512], p: 1.18, darken: 0.42 },   // the sea seen under the pier, below the dock beam
    props: [                       // on the deck, behind the fighters (x = fraction of the world width)
      { piece: "barrels", x: 0.12, bottomRow: 24 },
      { piece: "barrels", x: 0.90, bottomRow: 24, flip: true },
    ],
    front: [                       // on the dock's front lip, in front of the fighters
      { piece: "bollard",       x: 0.04, bottomRow: 58 },
      { piece: "bollard_small", x: 0.36, bottomRow: 58 },
      { piece: "bollard_small", x: 0.64, bottomRow: 58 },
      { piece: "bollard",       x: 0.96, bottomRow: 58 },
    ],
    animRate: { ship: [15, 19, 13, 17, 21, 14, 18], sky: [7] },   // ticks (1/60 s) per frame, per animated piece
  },
}

// THE BATCAVE — Guile's air base (SFII CE sheet) repainted by tools/stage_layers/slice_guile_batcave.py.
SETS.guile_batcave = {
  dir: "./stages/guile_batcave/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "deck", farFactor: 0.72, rimFactor: 1.12, center: true },   // Bat-symbol centred in the world
  back: [
    { piece: "depths",  p: 0.32, tile: "mirror", bottomRow: 2, fx: "batcomputer" }, // cave depths: vehicle bays, Batcomputer
    { piece: "ceiling", p: 0.26, tile: "mirror", bottomRow: -120 },            // rock ceiling, stalactites over the depths
    { piece: "batwing", p: 0.74, x: 0.42, bottomRow: 3 },                      // the Batwing on its deck
  ],
  props: [
    { piece: "fence",          x: 0.04, bottomRow: 10 },
    { piece: "mechanic",       x: 0.13, bottomRow: 16, rate: 20 },
    { piece: "butler_pair",    x: 0.31, bottomRow: 14, rate: 24 },
    { piece: "butlers_crates", x: 0.84, bottomRow: 18, rate: 16 },
  ],
  front: [],
  under: { piece: "ceiling", fromRow: 0, cols: [0, 1024], p: 1.12, darken: 0.35 },   // rock below the platform edge
  fx: "batcave",
  animRate: {},
}

// CITADEL OF RICKS — Zangief's factory (SFII sheet) repainted by tools/stage_layers/slice_zangief_citadel.py: a hall of the
// Citadel looking out on space through its windows (a city, a space cruiser, shuttles), portal-fluid reactor, portals, sci-fi crew.
SETS.zangief_citadel = {
  dir: "./stages/zangief_citadel/",
  S: 2,
  standRow: 40,
  deckFrontRow: 59,
  floor: { piece: "floor", farFactor: 0.7, rimFactor: 1.12, center: true, mirror: true },
  back: [
    { procedural: "space", p: 0.1 },
    { piece: "wall", p: 0.5, tile: "mirror", bottomRow: 1, scale: 0.7, fx: "citadelWall" },
  ],
  props: [
    { piece: "scaffold", x: 0.12, bottomRow: 2 },
    { piece: "fence",    x: 0.56, bottomRow: 2 },
    { piece: "pillar",   x: 0.90, bottomRow: 2 },
  ],
  front: [],
  fx: "citadel",
  animRate: { scaffold: [18] },
}

// ROOM3D sets are drawn as a real 3D room (one perspective projection for floor, ceiling, back + side walls, props).
// Units: lateral X = world x at the fighters' depth (z = 1); H = height above the floor in the same pixels; z = depth
// relative to the fighters (1 = their plane, > 1 = further back). Screen: x = camX + (X - camX) / z,
// y = horizon + (K - H) / z, horizon = groundY - K. So the fighters' plane scrolls with them and deeper things slower.
SETS.honda_training = {
  mode: "room3d",
  dir: "./stages/honda_training/",
  K: 240,              // groundY - horizon (camera height above the floor)
  zw: 1.7,             // back wall depth
  D0: 900,             // depth pixels per z unit (keeps floor tiles square)
  tile: 80,            // floor / ceiling square size at the fighters' depth
  wallTile: 64,        // back / side wall squares
  side: 60,            // side walls at X = -side and W + side
  wallScale: 1.6,      // the wall art's screen scale at the wall depth (→ its height sets the ceiling height)
  ring: { z: 1.08, rx: 1010, rd: 260 },                 // the sumo ring, now a glowing training ring
  startLines: { dx: 120, z0: 0.98, z1: 1.16 },          // its two start lines (shikiri-sen)
  tub: { z: 1.5, x: 0.5 }, bucket: { z: 1.24, x: 0.14 }, // bath tub → hologram platform; wash bucket
  door: { zFront: 1.12 },                                // side-wall door art runs from this depth to the back wall
  cubes: [                                               // floating hologram boxes (x = fraction of the world width)
    { x: 0.10, H: 250, z: 1.42, s: 46 }, { x: 0.24, H: 360, z: 1.62, s: 34 }, { x: 0.38, H: 395, z: 1.30, s: 28 },
    { x: 0.63, H: 380, z: 1.55, s: 40 }, { x: 0.78, H: 300, z: 1.36, s: 52 }, { x: 0.93, H: 210, z: 1.48, s: 38 },
    { x: 0.30, H: 455, z: 0.86, s: 30, front: true }, { x: 0.72, H: 470, z: 0.82, s: 26, front: true },
  ],
  colors: { bg: "#eef5fa", floor: "#f6fafd", ceil: "#e9f2f8", wall: "#f3f8fc", side: "#e6f0f7", line: "70,196,255" },
}

const cache = new Map()   // set → { layout, img: {file → Image}, failed }
function load(set) {
  let c = cache.get(set)
  if (c) return c
  c = { layout: null, img: {}, failed: false }
  cache.set(set, c)
  const def = SETS[set]
  if (!def || typeof fetch !== "function") { c.failed = true; return c }
  fetch(def.dir + "layout.json").then(r => r.json()).then(L => {
    const files = new Set(Object.values(L.pieces).map(p => p.file))
    for (const a of L.anims || []) for (const f of a.frames) files.add(f.file)
    for (const p of Object.values(L.pieces)) for (const f of p.frames || []) files.add(f)
    for (const f of files) { const im = new Image(); im.src = def.dir + f; c.img[f] = im }
    c.layout = L
  }).catch(() => { c.failed = true })
  return c
}
const ready = im => !!(im && im.complete && im.naturalWidth > 0)

/** true once the set's art is loaded (callers fall back to their normal backdrop until then) */
export function layeredStageReady(stage) {
  const set = stage?.layers; if (!set || !SETS[set]) return false
  const c = load(set); if (!c.layout) return false
  return Object.values(c.layout.pieces).every(p => ready(c.img[p.file]))
}

// Camera-dependent horizontal offset of a layer with scroll factor p (0 when the camera is centred on the world).
const shift = (p, W) => ((camera.x ?? W / 2) - W / 2) * (1 - p)
function view(cw, W) {
  const z = camera.zoom || 1, half = (cw / z) / 2, cx = camera.x ?? W / 2
  return { left: cx - half, right: cx + half }
}
// ping-pong frame index for animated piece k (wall clock → render only)
function frameOf(n, rate, k) {
  if (n <= 1) return 0
  const t = Math.floor((typeof performance !== "undefined" ? performance.now() : 0) / (1000 / 60) / rate) + k * 5
  const cyc = 2 * n - 2, i = t % cyc
  return i < n ? i : cyc - i
}

function drawAnims(ctx, c, def, parent, x0, y0, S) {
  let k = -1
  for (const a of c.layout.anims || []) {
    if (a.parent !== parent) continue
    k++
    const rate = (def.animRate[parent] || [])[k] || 16
    const fi = frameOf(a.frames.length, rate, k)
    if (fi === a.anchor) continue                      // the anchor frame is already painted on the parent art (-1: none)
    const f = a.frames[fi], im = c.img[f.file]
    if (ready(im)) ctx.drawImage(im, x0 + f.x * S, y0 + f.y * S, f.w * S, f.h * S)
  }
}

// Scroll factor of floor row r: far rows slower, the standing row = 1, deck in front of it faster, front beam fastest.
function rowFactor(def, r) {
  const { farFactor, rimFactor } = def.floor, R = def.standRow
  if (r > def.deckFrontRow) return rimFactor
  const f = r <= R ? farFactor + (1 - farFactor) * (r / R) : 1 + (rimFactor - 1) * ((r - R) / (def.deckFrontRow + 1 - R))
  return f
}

function drawSprite(ctx, im, x, y, w, h, flip) {
  if (!flip) { ctx.drawImage(im, x, y, w, h); return }
  ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore()
}

/**
 * Draw the stage behind the fighters (world space, inside the camera transform). Returns false when the stage has no
 * layer set or its art is still loading (the caller then draws its normal backdrop).
 */
export function drawLayeredStageBack(ctx, stage, { canvasWidth, worldWidth: W, groundY, coverTop, coverBottom }) {
  const set = stage?.layers, def = SETS[set]
  if (!def || !layeredStageReady(stage)) return false
  if (def.mode === "room3d") return drawRoom3d(ctx, def, cache.get(set), { canvasWidth, W, groundY, coverTop, coverBottom })
  const c = cache.get(set), L = c.layout, P = L.pieces, S = def.S
  const dockTop = groundY - def.standRow * S
  const v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const wasSmooth = ctx.imageSmoothingEnabled
  ctx.save()
  ctx.imageSmoothingEnabled = false

  // 1. fill: sky colour above the art, sea colour down to the dock, the under-dock shadow below the beam
  ctx.fillStyle = L.colors.skyTop;    ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  ctx.fillStyle = L.colors.under;     ctx.fillRect(padL, dockTop, padR - padL, Math.max(0, coverBottom - dockTop))

  // 2. far layers (parallax, edge-anchored)
  const t = (typeof performance !== "undefined" ? performance.now() : 0) / 1000
  const drawn = {}
  for (const ly of def.back) {
    if (ly.procedural === "space") { drawSpace(ctx, def, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    const pc = P[ly.piece], im = c.img[pc.file], ls = S * (ly.scale || 1), w = pc.w * ls, h = pc.h * ls
    if (ly.tile === "mirror" || ly.x != null) {               // repeating cave walls / a single placed object
      const x0 = (ly.x != null ? ly.x * W : W / 2) - w / 2 + shift(ly.p, W)
      const y = dockTop + ly.bottomRow * S - h
      drawn[ly.piece] = { x: x0, y, S: ls }
      if (ly.tile !== "mirror") { ctx.drawImage(im, x0, y, w, h); continue }
      if (ly.fx === "citadelWall") citadelWindows(ctx, { x: x0, y, S: ls }, { W, w, padL, padR, p: ly.p })   // the view, behind the frames
      const after = ly.fx === "batcomputer" ? () => batcomputer(ctx, c, drawn[ly.piece], S)
        : ly.fx === "citadelWall" ? () => citadelWall(ctx, def, c, drawn[ly.piece], { W, w, h, padL, padR, dockTop, coverTop, p: ly.p }) : null
      for (let k = Math.floor((padL - x0) / w); x0 + k * w < padR; k++) {
        const xx = x0 + k * w, odd = Math.abs(k) % 2 === 1
        if (!odd) { ctx.drawImage(im, Math.floor(xx), y, w + 1, h); continue }
        ctx.save(); ctx.translate(Math.floor(xx) + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w + 1, h); ctx.restore()
      }
      if (after) after()
      continue
    }
    let x
    if (ly.anchor === "right") x = Math.max(W / 2 + ly.edge + shift(ly.p, W), v.right + 2) - w
    else if (ly.anchor === "left") x = Math.min(W / 2 + ly.edge + shift(ly.p, W), v.left - 2)
    else x = (W - w) / 2 + shift(ly.p, W)
    let y = dockTop + ly.bottomRow * S - h
    if (ly.bob) y += Math.round(Math.sin((t / ly.bob.period) * Math.PI * 2) * ly.bob.amp) * S
    if (ly.mirrorFill) {                                 // extend the open part of the art on the cut-free side, mirrored
      const sw = (ly.mirrorFill.to - ly.mirrorFill.from) * S
      if (ly.anchor === "right") {
        for (let k = 1, xx = x - sw; xx + sw > padL; k++, xx -= sw) {
          ctx.save(); ctx.translate(xx + (k % 2 ? sw : 0), y); ctx.scale(k % 2 ? -1 : 1, 1)
          ctx.drawImage(im, ly.mirrorFill.from, 0, ly.mirrorFill.to - ly.mirrorFill.from, pc.h, 0, 0, sw, h)
          ctx.restore()
        }
      }
    }
    ctx.drawImage(im, x, y, w, h)
    drawAnims(ctx, c, def, ly.piece, x, y, S)
    if (ly.mirrorFill) {                                 // soften the art's top edge into the plain sky above it
      const g = ctx.createLinearGradient(0, y - 1, 0, y + 48)
      g.addColorStop(0, L.colors.skyTop); g.addColorStop(1, L.colors.skyTop + "00")
      ctx.fillStyle = g; ctx.fillRect(padL, y - 1, padR - padL, 49)
    }
  }

  // 3. the floor, one row at a time (perspective line-scroll), tiled across the view
  const fl = P[def.floor.piece], fim = c.img[fl.file], tw = fl.w * S
  const org = def.floor.center ? W / 2 - tw / 2 : 0
  for (let r = 0; r < fl.h; r++) {
    const off = shift(rowFactor(def, r), W) + org
    if (def.floor.mirror) {                                // tiles alternately mirrored (art that doesn't tile seamlessly)
      const k0 = Math.floor((padL - off) / tw)
      for (let k = k0, x = off + k0 * tw; x < padR; k++, x += tw) {
        if (Math.abs(k) % 2 === 0) { ctx.drawImage(fim, 0, r, fl.w, 1, Math.floor(x), dockTop + r * S, tw + 1, S); continue }
        ctx.save(); ctx.translate(Math.floor(x) + tw, dockTop + r * S); ctx.scale(-1, 1); ctx.drawImage(fim, 0, r, fl.w, 1, 0, 0, tw + 1, S); ctx.restore()
      }
      continue
    }
    let x = ((off - padL) % tw + tw) % tw - tw + padL      // first tile start at or left of the view's left edge
    for (; x < padR; x += tw) ctx.drawImage(fim, 0, r, fl.w, 1, Math.floor(x), dockTop + r * S, tw + 1, S)
  }

  // 3b. under the pier: the sea's lower rows, tiled (mirrored vertically) and darkened, scrolling a little faster
  const un = def.under
  if (un) {
    // open-sea columns only (no yacht), tiles alternately mirrored (sideways and up/down) so every seam matches
    const sp = P[un.piece], sim = c.img[sp.file], rows = sp.h - un.fromRow, [c0, c1] = un.cols, cw = c1 - c0
    const tw2 = cw * S, th = rows * S, top = dockTop + fl.h * S, off = shift(un.p, W)
    ctx.fillStyle = L.colors.seaBottom; ctx.fillRect(padL, top, padR - padL, Math.max(0, coverBottom - top))
    const x0 = ((off - padL) % (2 * tw2) + 2 * tw2) % (2 * tw2) - 2 * tw2 + padL
    for (let j = 0, x = x0; x < padR; j++, x += tw2) {     // one band of water, then it fades into the deep
      ctx.save(); ctx.translate(Math.floor(x) + (j % 2 ? tw2 : 0), top); ctx.scale(j % 2 ? -1 : 1, 1)
      ctx.drawImage(sim, c0, un.fromRow, cw, rows, 0, 0, tw2 + 1, th); ctx.restore()
    }
    const g = ctx.createLinearGradient(0, top, 0, top + th)
    g.addColorStop(0, `rgba(0,0,0,${Math.min(0.9, un.darken + 0.3)})`); g.addColorStop(0.35, `rgba(0,0,0,${un.darken})`); g.addColorStop(1, "rgba(0,0,0,0.78)")
    ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, th)
    ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(padL, top + th, padR - padL, Math.max(0, coverBottom - top - th))
  }

  // 4. props standing on the deck, behind the fighters
  drawProps(ctx, c, def, def.props, W, dockTop)
  if (def.fx === "batcave") batcaveFx(ctx, def, c, drawn, { W, dockTop, padL, padR, coverTop })
  if (def.fx === "citadel") citadelFloor(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  ctx.restore()
  ctx.imageSmoothingEnabled = wasSmooth
  return true
}

function drawProps(ctx, c, def, list, W, dockTop) {
  const S = def.S
  for (const pr of list) {
    const pc = c.layout.pieces[pr.piece]
    const im = c.img[pc.frames ? pc.frames[frameOf(pc.frames.length, pr.rate || 14, Math.round(pr.x * 10))] : pc.file]
    if (!ready(im)) continue
    const w = pc.w * S, h = pc.h * S
    const x = pr.x * W - w / 2 + shift(rowFactor(def, pr.bottomRow), W)
    drawSprite(ctx, im, Math.round(x), dockTop + pr.bottomRow * S - h, w, h, pr.flip)
    if (!pr.flip) drawAnims(ctx, c, def, pr.piece, Math.round(x), dockTop + pr.bottomRow * S - h, S)
  }
}

/** Foreground props, drawn AFTER the fighters (world space). No-op for stages without a layer set. */
export function drawLayeredStageFront(ctx, stage, worldWidth, groundY) {
  const set = stage?.layers, def = SETS[set]
  if (def?.mode === "room3d") { if (layeredStageReady(stage)) drawRoomFront(ctx, def, worldWidth, groundY); return }
  if (!def || !def.front?.length || !layeredStageReady(stage)) return
  const wasSmooth = ctx.imageSmoothingEnabled
  ctx.save(); ctx.imageSmoothingEnabled = false
  drawProps(ctx, cache.get(set), def, def.front, worldWidth, groundY - def.standRow * def.S)
  ctx.restore(); ctx.imageSmoothingEnabled = wasSmooth
}

// ───────────────────────────── ROOM3D (hologram training center) ─────────────────────────────
function roomCam(def, W, groundY, c) {
  const cx = camera.x ?? W / 2, yh = groundY - def.K
  const P = (X, H, z) => [cx + (X - cx) / z, yh + (def.K - H) / z]
  const Hc = c.layout.pieces.wall.h * def.wallScale * def.zw
  return { cx, yh, P, Hc }
}
const now = () => (typeof performance !== "undefined" ? performance.now() : 0) / 1000
// glowing hologram stroke: wide faint halo + bright core
function glow(ctx, rgb, w, a, path) {
  for (const [lw, al] of [[w * 5, 0.07], [w * 2.4, 0.18], [w, 0.9]]) {
    ctx.strokeStyle = `rgba(${rgb},${al * a})`; ctx.lineWidth = lw; ctx.beginPath(); path(); ctx.stroke()
  }
}
function poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath() }

function drawRoom3d(ctx, def, c, { canvasWidth, W, groundY, coverTop, coverBottom }) {
  const { yh, P, Hc } = roomCam(def, W, groundY, c), C = def.colors, LN = C.line
  const v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const XL = -def.side, XR = W + def.side, zw = def.zw, t = now()
  const flick = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 2.1)          // hologram shimmer
  const zFloor = Math.max(0.12, def.K / Math.max(1, coverBottom - yh))         // nearest visible floor depth
  const zCeil = Math.max(0.12, (Hc - def.K) / Math.max(1, yh - coverTop))      // nearest visible ceiling depth
  const zNear = Math.min(zFloor, zCeil, 0.5)
  const stepZ = def.tile / def.D0
  ctx.save()
  ctx.fillStyle = C.bg; ctx.fillRect(padL, coverTop, padR - padL, coverBottom - coverTop)

  // ── ceiling + floor planes (trapezoids between the side walls) with square grids
  const plane = (H, zn, fill, alphaK) => {
    ctx.fillStyle = fill; ctx.beginPath(); poly(ctx, [P(XL, H, zw), P(XR, H, zw), P(XR, H, zn), P(XL, H, zn)]); ctx.fill()
    for (let X = Math.ceil(XL / def.tile) * def.tile; X <= XR; X += def.tile)            // lines running into the room
      glow(ctx, LN, 1, 0.55 * alphaK * flick, () => { const a = P(X, H, zw), b = P(X, H, zn); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    for (let z = zw; z > zn; z -= stepZ) {                                               // lines across, fainter with depth
      const a = P(XL, H, z), b = P(XR, H, z), k = Math.min(1, 1.25 / z)
      glow(ctx, LN, 1, 0.55 * alphaK * k * flick, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    }
  }
  plane(Hc, zCeil, C.ceil, 0.7)
  // ceiling light panels: every third square glows softly
  for (let X = Math.ceil(XL / (def.tile * 3)) * def.tile * 3; X < XR; X += def.tile * 3)
    for (let z = zw - stepZ; z > zCeil + stepZ; z -= stepZ * 3) {
      const q = [P(X, Hc, z), P(X + def.tile, Hc, z), P(X + def.tile, Hc, z - stepZ), P(X, Hc, z - stepZ)]
      ctx.fillStyle = `rgba(255,255,255,${0.75 * flick})`; ctx.beginPath(); poly(ctx, q); ctx.fill()
    }
  plane(0, zFloor, C.floor, 1)

  // ── back wall: white squares, then Honda's wall art (wash stations → consoles, mural → projection screen)
  const [wl, wt] = P(XL, Hc, zw), [wr, wb] = P(XR, 0, zw)
  ctx.fillStyle = C.wall; ctx.fillRect(wl, wt, wr - wl, wb - wt)
  for (let X = Math.ceil(XL / def.wallTile) * def.wallTile; X <= XR; X += def.wallTile)
    glow(ctx, LN, 1, 0.35 * flick, () => { const a = P(X, 0, zw), b = P(X, Hc, zw); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  for (let H = def.wallTile; H < Hc; H += def.wallTile)
    glow(ctx, LN, 1, 0.35 * flick, () => { const a = P(XL, H, zw), b = P(XR, H, zw); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  const L = c.layout, wp = L.pieces.wall, wim = c.img[wp.file], S = def.wallScale
  const aw = wp.w * S, ah = wp.h * S, ax = P(W / 2, 0, zw)[0] - aw / 2, ay = wb - ah
  ctx.save(); ctx.beginPath(); ctx.rect(wl, wt, wr - wl, wb - wt); ctx.clip()
  ctx.drawImage(wim, ax, ay, aw, ah)
  const rep = L.wallRepeat
  for (const side of ["left", "right"]) {                 // run the wash-station strips out to the side walls (mirrored)
    const [c0, c1] = rep[side], sw = (c1 - c0) * S
    for (let k = 1; k < 40; k++) {
      const x = side === "left" ? ax - k * sw : ax + aw + (k - 1) * sw
      if (side === "left" ? x + sw < wl : x > wr) break
      ctx.save(); ctx.translate(x + (k % 2 ? sw : 0), ay); ctx.scale(k % 2 ? -1 : 1, 1)
      ctx.drawImage(wim, c0, 0, c1 - c0, wp.h, 0, 0, sw, ah); ctx.restore()
    }
  }
  // projection screen: a soft light sweep travels down the mural, plus a header
  const [mx, my, mw, mh] = wp.mural, sx = ax + mx * S, sy = ay + my * S, sW = mw * S, sH = mh * S
  const sweep = ((t * 0.35) % 1.3) - 0.15
  const g = ctx.createLinearGradient(0, sy + sH * (sweep - 0.12), 0, sy + sH * (sweep + 0.12))
  g.addColorStop(0, "rgba(120,215,255,0)"); g.addColorStop(0.5, `rgba(120,215,255,${0.28 * flick})`); g.addColorStop(1, "rgba(120,215,255,0)")
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sW, sH)
  ctx.fillStyle = `rgba(255,255,255,${0.10 + 0.05 * Math.sin(t * 3)})`
  for (let y = sy; y < sy + sH; y += 4) ctx.fillRect(sx, y, sW, 1)                      // scanlines
  glow(ctx, LN, 2, flick, () => ctx.rect(sx, sy, sW, sH))
  ctx.font = `800 ${Math.round(48 / zw)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
  ctx.fillStyle = `rgba(40,170,245,${flick})`; ctx.shadowColor = "rgba(70,196,255,1)"; ctx.shadowBlur = 14
  ctx.fillText("T R A I N I N G   C E N T E R", sx + sW / 2, sy - 8); ctx.shadowBlur = 0
  ctx.restore()

  // ── side walls (X = XL and XR) with squares; Honda's door/curtain art mapped onto each, column by column
  const dp = L.pieces.door, dim = c.img[dp.file]
  for (const X of [XL, XR]) {
    ctx.fillStyle = C.side; ctx.beginPath(); poly(ctx, [P(X, 0, zw), P(X, Hc, zw), P(X, Hc, zNear), P(X, 0, zNear)]); ctx.fill()
    for (let z = zw; z > zNear; z -= def.wallTile / def.D0)
      glow(ctx, LN, 1, 0.4 * Math.min(1, 1.25 / z) * flick, () => { const a = P(X, 0, z), b = P(X, Hc, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    for (let H = def.wallTile; H < Hc; H += def.wallTile)
      glow(ctx, LN, 1, 0.4 * flick, () => { const a = P(X, H, zw), b = P(X, H, zNear); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    // door art: column 0 nearest (zFront), last column at the back wall
    const zf = def.door.zFront, n = dp.w
    for (let col = 0; col < n; col++) {
      const u0 = col / n, u1 = (col + 1) / n
      const z0 = 1 / (1 / zf + (1 / zw - 1 / zf) * u0), z1 = 1 / (1 / zf + (1 / zw - 1 / zf) * u1)
      const [xa, yf] = P(X, 0, z0), [xb] = P(X, 0, z1)
      const hgt = (Hc * 0.9) / z0                       // the door art fills 90% of the wall height at its depth
      const x0 = Math.min(xa, xb), w0 = Math.abs(xb - xa) + 0.6
      if (w0 < 0.2) continue
      ctx.drawImage(dim, col, 0, 1, dp.h, x0, yf - hgt, w0, hgt)   // geometry mirrors it on the right wall
    }
  }

  // ── floor markings: the sumo ring → a glowing training ring; its start lines → light bars
  const R = def.ring, ringPts = []
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2, X = W / 2 + Math.cos(a) * R.rx, z = R.z + (Math.sin(a) * R.rd) / def.D0
    ringPts.push(P(X, 0, z))
  }
  const pulse = 0.75 + 0.25 * Math.sin(t * 2.2)
  glow(ctx, LN, 3, pulse, () => { ctx.moveTo(ringPts[0][0], ringPts[0][1]); for (const p of ringPts) ctx.lineTo(p[0], p[1]) })
  const inner = ringPts.map((_, i) => { const a = (i / 120) * Math.PI * 2; return P(W / 2 + Math.cos(a) * (R.rx - 40), 0, R.z + (Math.sin(a) * (R.rd - 12)) / def.D0) })
  glow(ctx, LN, 1, 0.6 * pulse, () => { ctx.moveTo(inner[0][0], inner[0][1]); for (const p of inner) ctx.lineTo(p[0], p[1]) })
  for (const sgn of [-1, 1]) {
    const X = W / 2 + sgn * def.startLines.dx, a = P(X, 0, def.startLines.z0), b = P(X, 0, def.startLines.z1)
    glow(ctx, "255,255,255", 4, 0.9, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
    glow(ctx, LN, 2, 0.8, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) })
  }

  // ── props at their depth: bath tub (hologram platform, glowing water), bucket
  const prop = (piece, X, z) => {
    const pc = L.pieces[piece], im = c.img[pc.file], sc = (def.wallScale * zw) / z
    const [px, py] = P(X, 0, z), w = pc.w * sc, h = pc.h * sc
    ctx.drawImage(im, px - w / 2, py - h, w, h); return [px - w / 2, py - h, w, h]
  }
  const cubesBack = def.cubes.filter(q => !q.front).sort((a, b) => b.z - a.z)
  for (const q of cubesBack.filter(q => q.z >= def.tub.z)) drawCube(ctx, def, P, q, W, t)
  const [tx, ty, tw, th] = prop("tub", W * def.tub.x, def.tub.z)
  const wg = ctx.createLinearGradient(tx, 0, tx + tw, 0), ph = (t * 0.4) % 1
  wg.addColorStop(0, "rgba(120,215,255,0.10)"); wg.addColorStop(Math.max(0, ph - 0.1), "rgba(120,215,255,0.10)")
  wg.addColorStop(ph, `rgba(190,240,255,${0.55 * flick})`); wg.addColorStop(Math.min(1, ph + 0.1), "rgba(120,215,255,0.10)"); wg.addColorStop(1, "rgba(120,215,255,0.10)")
  ctx.fillStyle = wg; ctx.fillRect(tx + tw * 0.03, ty + th * 0.06, tw * 0.94, th * 0.3)
  prop("bucket", W * def.bucket.x, def.bucket.z)
  for (const q of cubesBack.filter(q => q.z < def.tub.z)) drawCube(ctx, def, P, q, W, t)

  // ── a slow scan line sweeping the whole room (very faint)
  const sy2 = coverTop + ((t * 90) % Math.max(1, coverBottom - coverTop))
  const sg = ctx.createLinearGradient(0, sy2 - 30, 0, sy2 + 30)
  sg.addColorStop(0, "rgba(120,215,255,0)"); sg.addColorStop(0.5, "rgba(120,215,255,0.07)"); sg.addColorStop(1, "rgba(120,215,255,0)")
  ctx.fillStyle = sg; ctx.fillRect(padL, sy2 - 30, padR - padL, 60)
  ctx.restore()
  return true
}

// hologram box: translucent white faces + glowing edges, slowly turning and bobbing (wall clock)
function drawCube(ctx, def, P, q, W, t) {
  const X0 = q.x * W, s = q.s / 2, a = t * 0.5 + q.x * 9, bob = Math.sin(t * 1.3 + q.x * 7) * 10
  const ca = Math.cos(a), sa = Math.sin(a)
  const V = []
  for (const dy of [-s, s]) for (const [dx, dz] of [[-s, -s], [s, -s], [s, s], [-s, s]]) {
    const rx = dx * ca - dz * sa, rz = dx * sa + dz * ca
    V.push(P(X0 + rx, q.H + bob + dy, q.z + rz / def.D0))
  }
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
  ctx.fillStyle = "rgba(235,248,255,0.22)"
  for (const f of faces) { ctx.beginPath(); poly(ctx, f.map(i => V[i])); ctx.fill() }
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  glow(ctx, def.colors.line, 1.5, 0.95, () => { for (const [i, j] of edges) { ctx.moveTo(V[i][0], V[i][1]); ctx.lineTo(V[j][0], V[j][1]) } })
}

function drawRoomFront(ctx, def, W, groundY) {
  const { P } = roomCam(def, W, groundY, cache.get(Object.keys(SETS).find(k => SETS[k] === def))), t = now()
  ctx.save()
  for (const q of def.cubes.filter(q => q.front)) drawCube(ctx, def, P, q, W, t)
  ctx.restore()
}

// ───────────────────────────── BATCAVE ambience (render-only, wall clock) ─────────────────────────────
const _h = n => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x >>> 0) / 4294967296 }
// Batcomputer: live screens on the centre copy of the cave depths (drawn with that layer, so behind the Batwing)
function batcomputer(ctx, c, d, S) {
  const t = now(), L = c.layout
  if (d && L.computer) {
    const scr = ([x, y, w, h]) => [d.x + x * S, d.y + y * S, w * S, h * S]
    const [mx, my, mw, mh] = scr(L.computer.main)
    const g = ctx.createLinearGradient(0, my, 0, my + mh)
    g.addColorStop(0, "rgba(40,120,220,0.55)"); g.addColorStop(1, "rgba(10,40,100,0.55)")
    ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh)
    ctx.strokeStyle = "rgba(140,210,255,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath()            // waveform
    for (let i = 0; i <= 40; i++) { const xx = mx + (i / 40) * mw, yy = my + mh * (0.55 + 0.25 * Math.sin(i * 0.6 + t * 4) * Math.sin(i * 0.17 + t)); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy) }
    ctx.stroke()
    ctx.fillStyle = "rgba(170,225,255,0.9)"; ctx.font = `700 ${Math.round(5 * S)}px monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top"
    ctx.fillText(["GOTHAM CITY  ● LIVE", "ARKHAM  ● SECURE", "BATWING  ● READY"][Math.floor(t / 2.5) % 3], mx + 3, my + 3)
    ctx.fillStyle = "rgba(255,255,255,0.08)"; for (let y = my; y < my + mh; y += 3) ctx.fillRect(mx, y, mw, 1)
    L.computer.small.forEach((r, i) => {
      const [sx, sy, sw, sh] = scr(r), on = 0.35 + 0.35 * Math.abs(Math.sin(t * (1.3 + i * 0.4) + i))
      ctx.fillStyle = `rgba(60,150,255,${on})`; ctx.fillRect(sx, sy, sw, sh)
      ctx.fillStyle = "rgba(200,235,255,0.6)"
      for (let k = 0; k < 4; k++) ctx.fillRect(sx + 3, sy + 4 + k * 4 * S / 2, sw * (0.3 + 0.6 * _h(i * 9 + k + Math.floor(t * 2))), 2)
    })
  }
}
function batcaveFx(ctx, def, c, drawn, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), S = def.S
  // spotlights from the ceiling onto the Batwing
  const b = drawn.batwing
  if (b) for (const fx of [0.42, 0.66]) {
    const cx = b.x + 1024 * S * fx, top = coverTop, bot = dockTop + 20 * S
    const g = ctx.createLinearGradient(0, top, 0, bot)
    g.addColorStop(0, "rgba(160,200,255,0.0)"); g.addColorStop(0.6, "rgba(160,200,255,0.07)"); g.addColorStop(1, "rgba(160,200,255,0.12)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 30, top); ctx.lineTo(cx + 30, top); ctx.lineTo(cx + 190, bot); ctx.lineTo(cx - 190, bot); ctx.closePath(); ctx.fill()
  }
  // bats: a loose colony crossing the upper cave (parallax with the depths)
  const sh = (b0 => b0)(((camera.x ?? W / 2) - W / 2) * (1 - 0.45))
  for (let i = 0; i < 14; i++) {
    const dir = _h(i) < 0.5 ? -1 : 1, sp = 40 + 70 * _h(i + 50), span = W + 800
    const x = ((_h(i + 9) * span + dir * t * sp) % span + span) % span - 400 + sh
    if (x < padL - 40 || x > padR + 40) continue
    const y = dockTop - 170 * S + _h(i + 20) * 110 * S + Math.sin(t * 2 + i) * 14
    const sz = 6 + 9 * _h(i + 30), flap = Math.sin(t * (14 + i % 5) + i)
    ctx.fillStyle = "#04050a"; ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x - sz * 0.6 * dir, y - sz * flap, x - sz * 1.6, y - sz * 0.6 * flap)
    ctx.quadraticCurveTo(x - sz * 0.8, y + sz * 0.15, x, y + sz * 0.3)
    ctx.quadraticCurveTo(x + sz * 0.8, y + sz * 0.15, x + sz * 1.6, y - sz * 0.6 * flap)
    ctx.quadraticCurveTo(x + sz * 0.6 * dir, y - sz * flap, x, y)
    ctx.fill()
  }
  // water dripping from the stalactites
  for (let i = 0; i < 7; i++) {
    const per = 2.2 + 1.6 * _h(i + 70), ph = ((t + _h(i + 80) * per) % per) / per
    const x = W * (0.08 + 0.13 * i) + shift(0.55, W), y0 = dockTop - 120 * S, y1 = dockTop + 6 * S
    if (ph < 0.55) {
      const y = y0 + (y1 - y0) * (ph / 0.55) ** 2
      ctx.fillStyle = "rgba(150,200,255,0.55)"; ctx.fillRect(x, y, 2, 7)
    } else if (ph < 0.7) {
      const k = (ph - 0.55) / 0.15
      ctx.strokeStyle = `rgba(150,200,255,${0.5 * (1 - k)})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(x + 1, y1, 4 + 14 * k, 2 + 3 * k, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
}

// ───────────────────────────── CITADEL OF RICKS (render-only, wall clock) ─────────────────────────────
// a portal, the show's way: bright lime rim + glow, pale yellow-green core, darker green arms swirling inward
function drawPortal(ctx, x, y, rx, ry, t, open = 1) {
  if (open <= 0.01) return
  rx *= open; ry *= open
  ctx.save(); ctx.translate(x, y)
  const glow = ctx.createRadialGradient(0, 0, Math.min(rx, ry) * 0.6, 0, 0, Math.max(rx, ry) * 1.7)
  glow.addColorStop(0, "rgba(150,230,80,0.35)"); glow.addColorStop(1, "rgba(150,230,80,0)")
  ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.7, ry * 1.7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.scale(1, ry / rx)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  core.addColorStop(0, "#f4ffb8"); core.addColorStop(0.45, "#b8ee5a"); core.addColorStop(0.85, "#62c22e"); core.addColorStop(1, "#2f8f1c")
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill()
  ctx.lineCap = "round"
  for (let arm = 0; arm < 5; arm++) {                     // swirl arms
    ctx.strokeStyle = arm % 2 ? "rgba(40,120,20,0.55)" : "rgba(230,255,150,0.5)"; ctx.lineWidth = Math.max(1.5, rx * 0.07)
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, ang = t * 2.4 + arm * (Math.PI * 2 / 5) + u * 4.2, rr = rx * (0.95 - u * 0.85)
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = "#c8ff6a"; ctx.lineWidth = Math.max(2, rx * 0.09); ctx.beginPath(); ctx.arc(0, 0, rx * 0.97, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

// a space cruiser: grey saucer-car hull, glass bubble with a little alien pilot, thruster
function drawCruiser(ctx, x, y, sc, dir, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * dir, sc)
  const fl = 0.6 + 0.4 * Math.sin(t * 30)
  ctx.fillStyle = `rgba(120,240,255,${0.55 * fl})`; ctx.beginPath(); ctx.ellipse(-46, 4, 14 + 6 * fl, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#5d646e"; ctx.beginPath(); ctx.ellipse(0, 9, 40, 9, 0, 0, Math.PI * 2); ctx.fill()           // underside
  ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.moveTo(-42, 4); ctx.quadraticCurveTo(-36, -8, -6, -8); ctx.lineTo(30, -6)
  ctx.quadraticCurveTo(46, -2, 44, 6); ctx.lineTo(-42, 8); ctx.closePath(); ctx.fill()                         // hull
  ctx.fillStyle = "#e8ebef"; ctx.fillRect(-30, -5, 56, 3)
  ctx.fillStyle = "#b0373a"; ctx.fillRect(-40, -1, 8, 4)                                                       // tail light
  ctx.fillStyle = "#d8dce2"; ctx.beginPath(); ctx.moveTo(-36, -4); ctx.lineTo(-44, -14); ctx.lineTo(-30, -6); ctx.fill()   // fin
  ctx.fillStyle = "#7fd36a"; ctx.beginPath(); ctx.arc(2, -13, 4.6, 0, Math.PI * 2); ctx.fill()                 // the pilot: a small green alien
  ctx.fillStyle = "#111"; ctx.fillRect(0, -14, 1.6, 2); ctx.fillRect(3.4, -14, 1.6, 2)
  ctx.strokeStyle = "#7fd36a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -17); ctx.lineTo(0, -22); ctx.stroke()
  ctx.fillStyle = "#e9ff7a"; ctx.beginPath(); ctx.arc(0, -22, 1.4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(170,230,255,0.35)"; ctx.strokeStyle = "rgba(220,245,255,0.8)"; ctx.lineWidth = 1
  ctx.beginPath(); ctx.ellipse(3, -9, 17, 13, 0, Math.PI, 0); ctx.fill(); ctx.stroke()                         // bubble
  ctx.restore()
}

// the Citadel of Ricks: a disc with a city of towers rising above and hanging below
function drawCitadel(ctx, x, y, sc, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 200); g.addColorStop(0, "rgba(120,170,255,0.18)"); g.addColorStop(1, "rgba(120,170,255,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI * 2); ctx.fill()
  for (const dirY of [-1, 1]) for (let i = -9; i <= 9; i++) {
    const hh = (dirY < 0 ? 120 : 86) * (1 - Math.abs(i) / 11) * (0.6 + 0.4 * _h(i * 7 + (dirY + 3))), w = 8 + 6 * _h(i + 40)
    const bx = i * 11 - w / 2
    ctx.fillStyle = dirY < 0 ? "#7d8ea6" : "#5f6f87"; ctx.fillRect(bx, dirY < 0 ? -hh : 0, w, hh)
    ctx.fillStyle = "#c4d2e4"; ctx.fillRect(bx, dirY < 0 ? -hh : 0, 2, hh)
    for (let k = 6; k < hh - 4; k += 9) if (_h(i * 31 + k + dirY) > 0.45) {
      ctx.fillStyle = `rgba(255,236,160,${0.5 + 0.5 * Math.abs(Math.sin(t * 0.7 + i + k))})`; ctx.fillRect(bx + 3, dirY < 0 ? -k : k, 2, 2)
    }
  }
  ctx.fillStyle = "#9fb0c6"; ctx.beginPath(); ctx.ellipse(0, 0, 118, 20, 0, 0, Math.PI * 2); ctx.fill()           // the disc
  ctx.fillStyle = "#c9d6e6"; ctx.beginPath(); ctx.ellipse(0, -4, 112, 11, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(140,255,120,0.9)"; for (let i = -10; i <= 10; i++) if ((i + Math.floor(t * 3)) % 4 === 0) ctx.fillRect(i * 10, 7, 3, 2)
  ctx.restore()
}

function drawSpace(ctx, def, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), sh = shift(p, W), top = coverTop, bot = dockTop
  const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, "#03020a"); g.addColorStop(1, "#140a2e")
  ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, bot - top + 2)
  for (const [nx, ny, r, c] of [[0.25, 0.35, 380, "90,40,160"], [0.7, 0.5, 460, "40,140,90"], [0.5, 0.15, 300, "40,70,170"]]) {
    const cx = W * nx + sh, cy = top + (bot - top) * ny, ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    ng.addColorStop(0, `rgba(${c},0.32)`); ng.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = ng; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  for (let i = 0; i < 220; i++) {
    const x = (_h(i) * (W + 1600) - 800) + sh, y = top + _h(i + 999) * (bot - top)
    if (x < padL || x > padR) continue
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + _h(i + 5)) + i)), sz = _h(i + 77) > 0.92 ? 2 : 1
    ctx.fillStyle = `rgba(230,236,255,${a})`; ctx.fillRect(x, y, sz, sz)
  }
  for (let i = 0; i < 5; i++) {                                        // Citadel shuttles drifting
    const dir = i % 2 ? 1 : -1, span = W + 1200, sp = 18 + 14 * _h(i + 3)
    const x = ((_h(i + 11) * span + dir * t * sp) % span + span) % span - 600 + sh * 1.6, y = dockTop - 150 - 150 * _h(i + 21)
    ctx.fillStyle = "#b8c4d4"; ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = (Math.floor(t * 2 + i) % 2) ? "#9dff6a" : "#ff6a6a"; ctx.fillRect(x - 1, y + 2, 2, 2)
  }
}

// what you see through each viewport (rows 70..150, x < 392 of every wall copy): deep space framed by the window —
// the Citadel's tower city, a ringed planet, and a cruiser gliding past. Drawn BEFORE the wall, so frames/pillars sit on top.
function citadelWindows(ctx, d, { W, w, padL, padR, p }) {
  const t = now(), S = d.S, vy0 = d.y + 66 * S, vh = 90 * S, vw = 392 * S, sh = shift(p, W)
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, vx0 = odd ? x0 + w - vw : x0
    if (vx0 > padR || vx0 + vw < padL) continue
    ctx.save(); ctx.beginPath(); ctx.rect(vx0, vy0, vw, vh); ctx.clip()
    const g = ctx.createLinearGradient(0, vy0, 0, vy0 + vh); g.addColorStop(0, "#07051a"); g.addColorStop(1, "#1d0f3e")
    ctx.fillStyle = g; ctx.fillRect(vx0, vy0, vw, vh)
    const par = -sh * 0.25                                      // the view shifts a little as the camera moves: depth
    const ng = ctx.createRadialGradient(vx0 + vw * 0.3 + par, vy0 + vh * 0.4, 0, vx0 + vw * 0.3 + par, vy0 + vh * 0.4, vw * 0.5)
    ng.addColorStop(0, "rgba(60,170,120,0.35)"); ng.addColorStop(1, "rgba(60,170,120,0)"); ctx.fillStyle = ng; ctx.fillRect(vx0, vy0, vw, vh)
    for (let i = 0; i < 90; i++) {
      const sx = vx0 + ((_h(i + k * 131) * vw * 1.4 + par * 0.5) % (vw * 1.4)) - vw * 0.2, sy = vy0 + _h(i + 500 + k) * vh
      ctx.fillStyle = `rgba(235,240,255,${0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + _h(i)) + i))})`; ctx.fillRect(sx, sy, _h(i + 9) > 0.9 ? 2 : 1, _h(i + 9) > 0.9 ? 2 : 1)
    }
    // a ringed planet low on one side
    const px = vx0 + vw * (odd ? 0.2 : 0.82) + par * 0.6, py = vy0 + vh * 0.78, pr = vh * 0.42
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr)
    pg.addColorStop(0, "#f2a35e"); pg.addColorStop(0.7, "#a2462e"); pg.addColorStop(1, "#3a1420")
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "rgba(240,210,160,0.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.32, -0.25, 0, Math.PI * 2); ctx.stroke()
    // the Citadel city, floating in the middle distance
    drawCitadel(ctx, vx0 + vw * (odd ? 0.62 : 0.4) + par, vy0 + vh * 0.5, vh / 300, t)
    // a cruiser gliding past this window now and then
    const per = 9 + (Math.abs(k) % 3) * 2, ph = ((t + k * 3.7) % per) / per, dir = (k % 2) ? -1 : 1
    if (ph < 0.6) {
      const u = ph / 0.6, cx = dir > 0 ? vx0 - 60 + (vw + 120) * u : vx0 + vw + 60 - (vw + 120) * u
      drawCruiser(ctx, cx, vy0 + vh * 0.3 + Math.sin(t * 2.3 + k) * 4, vh / 160, dir, t)
    }
    ctx.restore()
  }
}

function citadelWall(ctx, def, c, d, { W, w, h, padL, padR, dockTop, coverTop, p }) {
  if (!d) return
  if (d.y > coverTop) {                                            // the hall's ceiling above the wall (enclosed, no open sky)
    const g = ctx.createLinearGradient(0, coverTop, 0, d.y); g.addColorStop(0, "#05070c"); g.addColorStop(1, "#141a26")
    ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, d.y - coverTop + 1)
    ctx.fillStyle = "#1f2735"
    for (let k = Math.floor((padL - d.x) / 90); d.x + k * 90 < padR; k++) ctx.fillRect(d.x + k * 90, coverTop, 6, d.y - coverTop)
    for (let yy = d.y - 14; yy > coverTop; yy -= 46) ctx.fillRect(padL, yy, padR - padL, 4)
  }
  { // glass reflections on the viewport (rows 70..150, x < 392 of each wall copy)
    const S = d.S, vy0 = d.y + 70 * S, vh = 80 * S   // (the view itself: citadelWindows)
    ctx.save(); ctx.beginPath(); ctx.rect(padL, vy0, padR - padL, vh); ctx.clip()
    for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
      const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, vx0 = odd ? x0 + w - 392 * S : x0, vw = 392 * S
      ctx.fillStyle = "rgba(120,200,255,0.05)"; ctx.fillRect(vx0, vy0, vw, vh)
      for (const [f, ww] of [[0.12, 26], [0.2, 9], [0.58, 34], [0.67, 10]]) {
        ctx.fillStyle = "rgba(210,240,255,0.07)"; ctx.beginPath()
        ctx.moveTo(vx0 + vw * f, vy0 + vh); ctx.lineTo(vx0 + vw * f + ww, vy0 + vh); ctx.lineTo(vx0 + vw * f + ww + vh * 0.6, vy0); ctx.lineTo(vx0 + vw * f + vh * 0.6, vy0); ctx.fill()
      }
    }
    ctx.restore()
  }
  const t = now(), L = c.layout, S = d.S
  const [rx, ry, rw, rh] = L.pieces.wall.reactor
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  const pulse = 0.18 + 0.14 * Math.sin(t * 3.1)
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {      // the reactor glow on every copy of the wall
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w
    const gx = odd ? x0 + w - (rx + rw) * S : x0 + rx * S
    const g = ctx.createLinearGradient(0, d.y + ry * S, 0, d.y + (ry + rh) * S)
    g.addColorStop(0, "rgba(160,255,80,0)"); g.addColorStop(0.5, `rgba(160,255,80,${pulse})`); g.addColorStop(1, "rgba(160,255,80,0)")
    ctx.fillStyle = g; ctx.fillRect(gx, d.y + ry * S, rw * S, rh * S)
  }
  ctx.restore()
  const [qx0, qy0, qx1, qy1] = L.pieces.wall.sign                   // the hall sign, crisp at any scale
  ctx.save(); ctx.fillStyle = "#123c28"; ctx.font = `800 ${Math.round((qy1 - qy0) * S * 0.7)}px system-ui, sans-serif`
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (let k = Math.floor((padL - d.x) / w); d.x + k * w < padR; k++) {
    const odd = Math.abs(k) % 2 === 1, x0 = d.x + k * w, cx = (qx0 + qx1) / 2 * S
    ctx.fillText("CITADEL OF RICKS", odd ? x0 + w - cx : x0 + cx, d.y + (qy0 + qy1) / 2 * S + 1, (qx1 - qx0) * S * 0.92)
  }
  ctx.restore()
  // portals opening and closing on the hall wall (world positions, the wall's parallax)
  const sh = shift(p, W)
  const SPOTS = [[0.16, 150], [0.38, 205], [0.63, 165], [0.86, 215], [0.5, 120]]
  SPOTS.forEach(([fx, hgt], i) => {
    const per = 7 + i * 1.3, ph = ((t + i * 2.9) % per) / per
    const open = ph < 0.12 ? easeOutBack(ph / 0.12) : ph < 0.55 ? 1 : ph < 0.65 ? 1 - (ph - 0.55) / 0.1 : 0
    drawPortal(ctx, W * fx + sh, dockTop - hgt * 0.75, 28, 36, t + i, open)
  })
}
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }

// a portal lying flat in the middle of the floor, where the old emblem was
function citadelFloor(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const fl = c.layout.pieces.floor, [ex, ey, ew, eh] = fl.emblem, S = def.S
  // below the deck: the platform's front face (a lit lip + armour plates), then the lower machine level
  const top = dockTop + fl.h * S, t = now()
  if (coverBottom > top) {
    const lipH = 10, faceH = 46, off = shift(1.12, W)
    ctx.fillStyle = "#2c3644"; ctx.fillRect(padL, top, padR - padL, lipH)
    ctx.fillStyle = "#8fa3b8"; ctx.fillRect(padL, top, padR - padL, 2)
    ctx.fillStyle = `rgba(170,255,90,${0.75 + 0.25 * Math.sin(t * 2)})`; ctx.fillRect(padL, top + lipH - 3, padR - padL, 2)
    const fg = ctx.createLinearGradient(0, top + lipH, 0, top + lipH + faceH); fg.addColorStop(0, "#1a2230"); fg.addColorStop(1, "#0d121b")
    ctx.fillStyle = fg; ctx.fillRect(padL, top + lipH, padR - padL, faceH)
    const pw = 120, x0 = ((off - padL) % pw + pw) % pw - pw + padL
    for (let x = x0, i = 0; x < padR; x += pw, i++) {                 // armour plates with rivets and a vent
      ctx.fillStyle = "#0a0e15"; ctx.fillRect(Math.floor(x), top + lipH, 3, faceH)
      ctx.fillStyle = "#4a5768"; for (const rx of [12, pw - 14]) for (const ry of [8, faceH - 10]) ctx.fillRect(Math.floor(x) + rx, top + lipH + ry, 3, 3)
      if (i % 2 === 0) { ctx.fillStyle = "#06090e"; for (let v = 0; v < 4; v++) ctx.fillRect(Math.floor(x) + 40, top + lipH + 14 + v * 6, 40, 3) }
    }
    const low = top + lipH + faceH                                     // the lower level: dark, with glowing conduits
    if (coverBottom > low) {
      const lg = ctx.createLinearGradient(0, low, 0, coverBottom); lg.addColorStop(0, "#070a10"); lg.addColorStop(1, "#020305")
      ctx.fillStyle = lg; ctx.fillRect(padL, low, padR - padL, coverBottom - low)
      const off2 = shift(1.2, W)
      for (const [dy, wdt, a] of [[18, 6, 0.8], [40, 4, 0.5], [70, 8, 0.35]]) {
        if (low + dy > coverBottom) continue
        ctx.fillStyle = `rgba(40,110,30,${a})`; ctx.fillRect(padL, low + dy, padR - padL, wdt)
        ctx.fillStyle = `rgba(190,255,110,${a * (0.6 + 0.4 * Math.sin(t * 3 + dy))})`; ctx.fillRect(padL, low + dy + 1, padR - padL, 1)
        const bw = 220, bx0 = ((off2 - padL) % bw + bw) % bw - bw + padL
        ctx.fillStyle = "#1a2230"; for (let x = bx0; x < padR; x += bw) ctx.fillRect(Math.floor(x), low + dy - 2, 10, wdt + 4)   // pipe clamps
      }
      for (let i = 0; i < 12; i++) {                                    // portal-fluid droplets of light drifting along
        const x = padL + ((t * (30 + 20 * _h(i)) + _h(i + 3) * 4000) % (padR - padL + 40)) - 20
        ctx.fillStyle = "rgba(220,255,150,0.9)"; ctx.fillRect(x, low + [18, 40, 70][i % 3] + 1, 4, 2)
      }
    }
  }
  const x = W / 2 - (fl.w * S) / 2 + ex * S + shift(rowFactor(def, ey), W)
  const y = dockTop + ey * S
  ctx.save(); ctx.globalAlpha = 0.8; drawPortal(ctx, x, y, ew * S * 0.26, eh * S * 0.26, now() * 0.6, 1); ctx.restore()
}
