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

// HEAVEN'S ARENA — Ryu's Stage (SFII sheet) repainted by tools/stage_layers/slice_ryu_heaven.py: a fighting floor high
// in a tower above the clouds — dusk sky through tall windows, tiered stands with a crowd, a scoreboard, the stone
// barrier wall, a raised stone ring with a gold edge, banners naming the arena and the floor.
SETS.ryu_heaven = {
  dir: "./stages/ryu_heaven/",
  S: 2,
  standRow: 24,
  deckFrontRow: 35,
  floor: { piece: "floor", farFactor: 0.72, rimFactor: 1.1, center: true, mirror: true },
  back: [
    { procedural: "heavenHall", p: 0.15 },
    { piece: "wall", p: 0.8, tile: "mirror", bottomRow: 1, scale: 0.6 },
  ],
  props: [
    { piece: "banner", x: 0.3, bottomRow: 3 },
    { piece: "banner", x: 0.7, bottomRow: 3 },
  ],
  front: [],
  fx: "heaven",
  animRate: {},
}

// VALLEY OF THE END — the game's own painted backdrop (cliffs, the two statues, the waterfall) brought into 16-bit style
// and mixed with Guile's Stage (SFII CE): its tarmac is the wet riverbank rock. tools/stage_layers/slice_guile_valley.py.
SETS.guile_valley = {
  dir: "./stages/guile_valley/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "deck", farFactor: 0.72, rimFactor: 1.12, center: true },
  back: [{ procedural: "valley", p: 0.35 }],
  props: [],
  front: [],
  fx: "valley",
  animRate: {},
}

// HIDDEN LEAF VILLAGE — the "Hidden Leaf Village (SSF2)" stage pack by Guybesideyou64 (tools/stage_layers/import_ssf2_leaf.py):
// the far backdrop, the floating island with the village (fighters on its sand) and the pack's foreground, as layers.
SETS.ssf2_leaf = { dir: "./stages/ssf2_leaf/", mode: "ssf2", S: 1.35, bgScale: 1.3, bgVillageRow: 720 }

// INFINITY CASTLE — the "Infinity Castle (over Pokémon Stadium 3)" SSF2 mod's bitmaps (tools/stage_layers/import_infinity_castle.py):
// the castle backdrop with floating rooms drifting through it, the wooden platform's planks as the floor, its front
// wall below, and a row of its lanterns along the back edge, flickering.
SETS.infinity_castle = {
  dir: "./stages/infinity_castle/",
  S: 2,
  standRow: 44,
  deckFrontRow: 66,
  floor: { piece: "deck", farFactor: 0.7, rimFactor: 1.12, center: true, mirror: true },
  back: [{ procedural: "castle", p: 0.25 }],
  props: [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map(x => ({ piece: "lantern", x, bottomRow: 4 })),
  front: [],
  fx: "infinity",
  animRate: {},
}

// THE NULL VOID — Blanka's Stage (SFII sheet) repainted by tools/stage_layers/slice_blanka_nullvoid.py: an endless prison
// dimension — a void lit like the Unlimited Void (stars, nebulae, a faint grid), a swirling rift pulling debris in,
// glowing mist, drifting rock islands (one with a petrified tree, one with a wrecked shack), and the jagged underside of
// the floating island the fighters stand on.
SETS.blanka_nullvoid = {
  dir: "./stages/blanka_nullvoid/",
  S: 2,
  standRow: 44,
  deckFrontRow: 63,
  floor: { piece: "floor", farFactor: 0.72, rimFactor: 1.12, center: true, mirror: true },
  back: [{ procedural: "nullvoid", p: 0.12 }],
  props: [],
  front: [],
  fx: "nullvoid",
  animRate: {},
}

// SHIBUYA INCIDENT — Chun-Li's Stage (SFII sheet) repainted by tools/stage_layers/slice_chunli_shibuya.py: the market
// street at night under the dome, towers behind; bystanders, gore and city destruction drawn live (see drawShibuyaBack).
SETS.chunli_shibuya = {
  dir: "./stages/chunli_shibuya/",
  S: 2,
  standRow: 34,
  deckFrontRow: 79,
  floor: { piece: "street", farFactor: 0.8, rimFactor: 1.08, center: true, mirror: true },
  back: [{ procedural: "shibuya", p: 0.35 }],
  props: [],
  front: [],
  fx: "shibuya",
  animRate: {},
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
  if (def.mode === "ssf2") return drawSsf2Back(ctx, def, cache.get(set), { canvasWidth, W, groundY, coverTop, coverBottom })
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
    if (ly.procedural === "shibuya") { drawShibuyaBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }); continue }
    if (ly.procedural === "nullvoid") { drawNullVoidBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "castle") { drawCastleBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "valley") { drawValleyBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
    if (ly.procedural === "heavenHall") { drawHeavenHall(ctx, def, c, { W, dockTop, padL, padR, coverTop, p: ly.p }); continue }
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
  if (def.fx === "heaven") heavenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "valley") valleyRiver(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "infinity") infinityFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "shibuya") shibuyaFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
  if (def.fx === "nullvoid") nullVoidUnder(ctx, def, c, { W, dockTop, padL, padR, coverBottom })
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
export function drawLayeredStageFront(ctx, stage, worldWidth, groundY, world = null) {
  const set = stage?.layers, def = SETS[set]
  if (def?.fx === "shibuya" && world && layeredStageReady(stage)) shibuyaFront(ctx, def, cache.get(set), worldWidth, groundY, world)
  if (def?.mode === "room3d") { if (layeredStageReady(stage)) drawRoomFront(ctx, def, worldWidth, groundY); return }
  if (def?.mode === "ssf2") { if (layeredStageReady(stage)) drawSsf2Front(ctx, def, cache.get(set), worldWidth, groundY); return }
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

// ───────────────────────────── HEAVEN'S ARENA (render-only, wall clock) ─────────────────────────────
function drawHeavenHall(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, sk = P.sky, im = c.img[sk.file], S = def.S
  const wallH = P.wall.h * S * 0.6, standTop = dockTop - wallH - 100, sh = shift(p, W)
  // 1. the sky: the repainted SFII dusk, stretched tall, then a sea of clouds far below the tower
  const skH = Math.max(standTop - coverTop + 60, 200), skW = sk.w * (skH / sk.h)
  if (ready(im)) for (let k = Math.floor((padL - sh) / skW) - 1, x; (x = sh + k * skW) < padR; k++) {
    if (Math.abs(k) % 2 === 0) ctx.drawImage(im, Math.floor(x), coverTop, skW + 1, skH)
    else { ctx.save(); ctx.translate(Math.floor(x) + skW, coverTop); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, skW + 1, skH); ctx.restore() }
  }
  const cloudY = standTop - 70
  for (let layer = 0; layer < 3; layer++) {                       // cloud tops seen from far above, drifting
    const yy = cloudY + layer * 22, sp = 4 + layer * 3, par = shift(p + layer * 0.05, W)
    ctx.fillStyle = ["rgba(255,214,200,0.55)", "rgba(240,170,190,0.6)", "rgba(190,120,170,0.7)"][layer]
    for (let i = -2; i < 40; i++) {
      const cx = ((i * 130 + t * sp + par) % 5200 + 5200) % 5200 - 600 + padL * 0, r = 40 + 30 * _h(i + layer * 50)
      if (cx < padL - 120 || cx > padR + 120) continue
      ctx.beginPath(); ctx.ellipse(cx, yy + 10 * _h(i + 7), r * 1.6, r * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.fillStyle = "rgba(190,120,170,0.75)"; ctx.fillRect(padL, cloudY + 60, padR - padL, standTop - cloudY)
  // 2. the hall's window wall: tall panes between stone mullions, a heavy beam across the top
  const mw = 300, mx0 = ((sh * 2.2 - padL) % mw + mw) % mw - mw + padL
  for (let x = mx0; x < padR + mw; x += mw) {
    const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0); g.addColorStop(0, "#2a1c44"); g.addColorStop(0.5, "#6d5a96"); g.addColorStop(1, "#1d1232")
    ctx.fillStyle = g; ctx.fillRect(Math.floor(x) - 14, coverTop, 28, standTop - coverTop + 4)
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(Math.floor(x) + 40, coverTop, 22, standTop - coverTop); ctx.fillRect(Math.floor(x) + 74, coverTop, 8, standTop - coverTop)
  }
  ctx.fillStyle = "#24173c"; ctx.fillRect(padL, standTop - 8, padR - padL, 10)
  // 3. the stands: three tiers of spectators (original crowd: little heads + shoulders, bobbing, camera flashes)
  const tiers = 3, th = 100 / tiers, cpar = shift(0.55, W)
  for (let r = 0; r < tiers; r++) {
    const y0 = standTop + r * th
    ctx.fillStyle = r % 2 ? "#2d1f4a" : "#36265a"; ctx.fillRect(padL, y0, padR - padL, th + 1)
    ctx.fillStyle = "#4d3a7a"; ctx.fillRect(padL, y0 + th - 4, padR - padL, 3)
    const step = 15, x0 = ((cpar - padL) % step + step) % step - step + padL
    for (let x = x0, i = Math.floor((x0 - cpar) / step); x < padR + step; x += step, i++) {
      const id = i * 7 + r * 1013
      if (_h(id) < 0.12) continue                                   // an empty seat here and there
      const hue = Math.floor(_h(id + 1) * 6), bob = Math.max(0, Math.sin(t * (3 + _h(id + 2) * 3) + id)) * (_h(id + 3) > 0.6 ? 4 : 1.5)
      const bx = x + (_h(id + 4) - 0.5) * 5, by = y0 + th - 6 - bob
      ctx.fillStyle = ["#7a4b8f", "#3f6a9a", "#9a5a4a", "#5a7a4a", "#b08a3a", "#6a5a7a"][hue]
      ctx.beginPath(); ctx.ellipse(bx, by - 6, 6.5, 7, 0, Math.PI, 0); ctx.fill()                  // shoulders
      ctx.fillStyle = ["#f0c8a0", "#c89068", "#8a5a3a", "#e8b890"][Math.floor(_h(id + 5) * 4)]
      ctx.beginPath(); ctx.arc(bx, by - 15, 4.2, 0, Math.PI * 2); ctx.fill()                       // head
      ctx.fillStyle = ["#2a1a10", "#5a3a20", "#d8c070", "#1a1a1a", "#7a2a2a"][Math.floor(_h(id + 6) * 5)]
      ctx.beginPath(); ctx.arc(bx, by - 16.5, 4.3, Math.PI, 0); ctx.fill()                        // hair
      if (_h(id + 8) > 0.55) { ctx.strokeStyle = ctx.fillStyle = "#f0c8a0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, by - 10); ctx.lineTo(bx + 6, by - 20 - bob * 1.5); ctx.stroke() }  // a raised fist
      if (_h(id + Math.floor(t * 3)) > 0.995) { ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.arc(bx, by - 14, 6, 0, Math.PI * 2); ctx.fill() }   // camera flash
    }
  }
  // 4. the scoreboard hanging over the stands
  const sx = W / 2 + 460 + shift(0.35, W), sy = standTop - 84, sw = 250, shh = 62
  ctx.fillStyle = "#120a22"; ctx.fillRect(sx - 3, coverTop, 6, sy - coverTop)
  ctx.fillStyle = "#1b1030"; ctx.fillRect(sx - sw / 2 - 6, sy - 6, sw + 12, shh + 12)
  ctx.fillStyle = "#d6b14a"; ctx.fillRect(sx - sw / 2 - 6, sy - 6, sw + 12, 3); ctx.fillRect(sx - sw / 2 - 6, sy + shh + 3, sw + 12, 3)
  const sg = ctx.createLinearGradient(0, sy, 0, sy + shh); sg.addColorStop(0, "#0a1530"); sg.addColorStop(1, "#05091a")
  ctx.fillStyle = sg; ctx.fillRect(sx - sw / 2, sy, sw, shh)
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffe08a"; ctx.font = "800 22px 'Hiragino Sans','Noto Sans JP',system-ui,sans-serif"; ctx.fillText("天空闘技場", sx, sy + 20)
  ctx.fillStyle = `rgba(140,220,255,${0.75 + 0.25 * Math.sin(t * 4)})`; ctx.font = "800 16px system-ui,sans-serif"
  ctx.fillText(Math.floor(t / 4) % 2 ? "FLOOR 200" : "HEAVEN'S ARENA", sx, sy + 45)
  ctx.textAlign = "start"; ctx.textBaseline = "alphabetic"
}

function heavenFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now()
  // banner writing (vertical): the arena name on the left banner, the floor on the right
  const b = P.banner, w = b.w * S, h = b.h * S
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (const [fx, text] of [[0.3, "天空闘技場"], [0.7, "二百階"]]) {
    const x = fx * W - w / 2 + shift(rowFactor(def, 3), W), y = dockTop + 3 * S - h
    const [px0, py0, px1, py1] = b.paper, cx = x + (px0 + px1) / 2 * S, n = text.length, cell = (py1 - py0) * S / n
    ctx.fillStyle = "#1a1030"; ctx.font = `900 ${Math.floor(Math.min(cell * 0.86, (px1 - px0) * S * 0.86))}px 'Hiragino Mincho ProN','Noto Serif JP',serif`
    for (let i = 0; i < n; i++) ctx.fillText(text[i], cx, y + py0 * S + cell * (i + 0.5))
  }
  ctx.restore()
  // the ring is raised: a gold edge (the SFII floor trim), then its stone face, then the drop to the hall floor
  const top = dockTop + P.floor.h * S
  if (coverBottom <= top) return
  const tr = P.trim, tim = c.img[tr.file], tw = tr.w * S, off = shift(def.floor.rimFactor, W) + W / 2 - tw / 2
  if (ready(tim)) for (let k = Math.floor((padL - off) / tw); off + k * tw < padR; k++) ctx.drawImage(tim, Math.floor(off + k * tw), top, tw + 1, tr.h * S)
  const fTop = top + tr.h * S, faceH = 70
  const fg = ctx.createLinearGradient(0, fTop, 0, fTop + faceH); fg.addColorStop(0, "#b8b2c8"); fg.addColorStop(1, "#6a6282")
  ctx.fillStyle = fg; ctx.fillRect(padL, fTop, padR - padL, faceH)
  const bw = 96, bx0 = ((off - padL) % bw + bw) % bw - bw + padL
  ctx.fillStyle = "rgba(40,30,60,0.55)"
  for (let row = 0; row < 3; row++) {
    ctx.fillRect(padL, fTop + row * 24, padR - padL, 2)
    for (let x = bx0 + (row % 2) * bw / 2; x < padR; x += bw) ctx.fillRect(Math.floor(x), fTop + row * 24, 2, 24)
  }
  const dropTop = fTop + faceH
  if (coverBottom > dropTop) {
    const dg = ctx.createLinearGradient(0, dropTop, 0, coverBottom); dg.addColorStop(0, "#1a1030"); dg.addColorStop(1, "#08040f")
    ctx.fillStyle = dg; ctx.fillRect(padL, dropTop, padR - padL, coverBottom - dropTop)
    ctx.fillStyle = `rgba(214,177,74,${0.35 + 0.15 * Math.sin(t * 1.5)})`; ctx.fillRect(padL, dropTop, padR - padL, 3)   // floor lights
  }
}

// ───────────────────────────── VALLEY OF THE END (render-only, wall clock) ─────────────────────────────
// The painting is drawn ONCE, centred, scaled to fill from the top of the view down to the riverbank; past its edges the
// outer cliff strips (no statues) repeat mirrored, so the two statues are never duplicated however far the camera goes.
function drawValleyBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), pc = c.layout.pieces.valley, im = c.img[pc.file]
  if (!ready(im)) return
  const S = def.S, bottom = dockTop + 4 * S
  const viewH = (padR - padL - 16) * 9 / 16, sc = (viewH * 0.5) / pc.h      // fits the part of the view above the bank
  if (bottom - pc.h * sc > coverTop) {                            // a tall view: sky colour above the painting's top
    ctx.fillStyle = c.layout.colors.skyTop; ctx.fillRect(padL, coverTop, padR - padL, bottom - pc.h * sc - coverTop + 2)
  }
  const w = pc.w * sc, h = pc.h * sc, x0 = W / 2 - w / 2 + shift(p, W), y0 = bottom - h
  ctx.drawImage(im, Math.floor(x0), Math.floor(y0), Math.ceil(w), Math.ceil(h))
  const edge = Math.round(pc.w * 0.18), ew = edge * sc
  for (let k = 0, x = x0; x > padL; k++) {                       // left: cols [0, edge) mirrored outward
    x -= ew; ctx.save(); ctx.translate(Math.floor(x) + (k % 2 ? 0 : ew), Math.floor(y0)); ctx.scale(k % 2 ? 1 : -1, 1)
    ctx.drawImage(im, 0, 0, edge, pc.h, 0, 0, Math.ceil(ew) + 1, Math.ceil(h)); ctx.restore()
  }
  for (let k = 0, x = x0 + w; x < padR; k++, x += ew) {          // right: cols [w-edge, w) mirrored outward
    ctx.save(); ctx.translate(Math.floor(x) + (k % 2 ? 0 : ew), Math.floor(y0)); ctx.scale(k % 2 ? 1 : -1, 1)
    ctx.drawImage(im, pc.w - edge, 0, edge, pc.h, 0, 0, Math.ceil(ew) + 1, Math.ceil(h)); ctx.restore()
  }
  // the waterfall: bright streaks pouring down its face, mist where it lands
  const [fx, fy, fw, fh] = pc.falls, X = x0 + fx * sc, Y = y0 + fy * sc, FW = fw * sc, FH = fh * sc
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, FW, FH); ctx.clip()
  for (let i = 0; i < 26; i++) {
    const lx = X + _h(i) * FW, len = 18 + 30 * _h(i + 40), sp = 120 + 80 * _h(i + 80)
    const ly = Y + ((t * sp + _h(i + 120) * FH) % (FH + len)) - len
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * _h(i + 160)})`; ctx.fillRect(Math.floor(lx), Math.floor(ly), 2, len)
  }
  ctx.restore()
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.35 + _h(i)) % 1, mx = X + FW / 2 + (_h(i + 9) - 0.5) * FW * 1.6, my = Y + FH - ph * 40, r = 14 + 26 * ph
    ctx.fillStyle = `rgba(235,245,250,${0.22 * (1 - ph)})`; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill()
  }
  // the river below the falls glints
  const [rx, ry, rw, rh] = pc.river
  for (let i = 0; i < 14; i++) {
    const gx = x0 + (rx + _h(i + 300) * rw) * sc, gy = y0 + (ry + _h(i + 330) * rh) * sc, a = Math.max(0, Math.sin(t * 2 + i * 1.7))
    ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`; ctx.fillRect(Math.floor(gx), Math.floor(gy), 6, 2)
  }
}

// below the riverbank rock: the river itself, flowing past (bands of light sliding sideways, foam along the edge)
function valleyRiver(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), DH = P.deck.h, top = dockTop + DH * S
  // 1. the river from the foot of the falls runs down the MIDDLE of the ground toward the viewer: a channel that widens
  //    row by row with the floor's perspective (each row follows that floor row's scroll), its water sliding forward
  const halfAt = r => 70 + 210 * Math.pow(r / (DH - 1), 1.25)
  for (let r = 0; r < DH; r++) {
    const y = dockTop + r * S, cx = W / 2 + shift(rowFactor(def, r), W), hw = halfAt(r), u = r / (DH - 1)
    ctx.fillStyle = `rgb(${Math.round(40 + 18 * u)},${Math.round(112 + 22 * u)},${Math.round(122 + 14 * u)})`
    ctx.fillRect(Math.floor(cx - hw), y, Math.ceil(hw * 2), S)
    const n = 7 + Math.floor(u * 6)                                  // ripples rolling toward us (row phase moves with time)
    for (let i = 0; i < n; i++) {
      const ph = (r * 0.55 - t * 9 + _h(i + 70) * 20) % 6
      if (ph < -1 || ph > 0) continue
      const x = cx - hw + (i + 0.5) / n * hw * 2 + (_h(i + r * 3) - 0.5) * 10
      ctx.fillStyle = `rgba(210,245,245,${0.35 + 0.4 * u})`; ctx.fillRect(Math.floor(x - 6 - 10 * u), y, Math.ceil(12 + 20 * u), S)
    }
    ctx.fillStyle = "rgba(235,250,250,0.85)"                         // foam where the water meets the rock on each side
    const fw = 3 + 3 * u + 2 * Math.sin(t * 6 + r)
    ctx.fillRect(Math.floor(cx - hw - fw / 2), y, Math.ceil(fw), S); ctx.fillRect(Math.floor(cx + hw - fw / 2), y, Math.ceil(fw), S)
  }
  if (coverBottom <= top) return
  // 2. below the bank: the wide river, fed from the middle — its streaks run outward from the centre
  const g = ctx.createLinearGradient(0, top, 0, coverBottom); g.addColorStop(0, "#2f7880"); g.addColorStop(0.4, "#1b4d55"); g.addColorStop(1, "#0b2226")
  ctx.fillStyle = g; ctx.fillRect(padL, top, padR - padL, coverBottom - top)
  const mid = W / 2 + shift(def.floor.rimFactor, W), fhw = halfAt(DH - 1)
  ctx.fillStyle = "rgba(235,250,250,0.7)"
  for (let x = padL - ((t * 40) % 24); x < padR; x += 24) if (Math.abs(x - mid) > fhw) ctx.fillRect(Math.floor(x), top, 14, 2)   // foam at the bank
  for (let r = 0; r < 7; r++) {
    const yy = top + 10 + r * 16, sp = 50 + r * 12, len = 40 + r * 10, span = 1400
    ctx.fillStyle = `rgba(170,230,235,${0.32 - r * 0.035})`
    for (let i = 0; i < 22; i++) for (const dir of [-1, 1]) {
      const d = ((i * 97 + t * sp + r * 61) % span), x = mid + dir * d - (dir < 0 ? len : 0)
      if (x + len < padL || x > padR) continue
      ctx.fillRect(Math.floor(x), Math.floor(yy + 3 * Math.sin(t + i)), len, 2)
    }
  }
  // 3. where the channel reaches the front of the bank it spills over in a short cascade, splashing into the river
  const cTop = top - 2, cH = 34
  const cg = ctx.createLinearGradient(0, cTop, 0, cTop + cH); cg.addColorStop(0, "#5fb4bc"); cg.addColorStop(1, "#2a7680")
  ctx.fillStyle = cg; ctx.fillRect(Math.floor(mid - fhw), cTop, Math.ceil(fhw * 2), cH)
  for (let i = 0; i < 40; i++) {
    const lx = mid - fhw + _h(i + 900) * fhw * 2, len = 8 + 12 * _h(i + 940), ly = cTop + ((t * (90 + 60 * _h(i + 980)) + _h(i) * cH) % (cH + len)) - len
    ctx.fillStyle = `rgba(240,252,252,${0.35 + 0.4 * _h(i + 20)})`; ctx.fillRect(Math.floor(lx), Math.floor(Math.max(cTop, ly)), 2, Math.min(len, cTop + cH - Math.max(cTop, ly)))
  }
  for (let i = 0; i < 16; i++) {                                     // splash + mist at the bottom of the cascade
    const ph = (t * 0.8 + _h(i + 50)) % 1, x = mid - fhw + _h(i + 60) * fhw * 2, y = cTop + cH - ph * 10, rr = 4 + 10 * ph
    ctx.fillStyle = `rgba(240,252,252,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill()
  }
}

// ───────────────────────────── SSF2 stage pack (Hidden Leaf Village) ─────────────────────────────
function ssf2Place(def, c, W, groundY) {
  const P = c.layout.pieces, S = def.S, mw = P.mg.w * S, mh = P.mg.h * S
  return { S, x: W / 2 - mw / 2, y: groundY - c.layout.standRow * S, w: mw, h: mh }
}
function drawSsf2Back(ctx, def, c, { canvasWidth, W, groundY, coverTop, coverBottom }) {
  const P = c.layout.pieces, C = c.layout.colors, t = now(), v = view(canvasWidth, W), padL = v.left - 8, padR = v.right + 8
  const isl = ssf2Place(def, c, W, groundY)
  ctx.save()
  const g = ctx.createLinearGradient(0, coverTop, 0, coverBottom); g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyLow)
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, coverBottom - coverTop)
  // far: the Hokage-rock backdrop, slow parallax; mirrored copies if the view ever runs past it
  const bg = c.img[P.hokage.file], bs = def.bgScale, bw = P.hokage.w * bs, bh = P.hokage.h * bs
  const bx = W / 2 - bw / 2 + shift(0.3, W), by = isl.y + 150 * isl.S - def.bgVillageRow * bs
  if (ready(bg)) for (let k = Math.floor((padL - bx) / bw); bx + k * bw < padR; k++) {
    const x = bx + k * bw
    if (Math.abs(k) % 2 === 0) ctx.drawImage(bg, Math.floor(x), Math.floor(by), Math.ceil(bw) + 1, Math.ceil(bh))
    else { ctx.save(); ctx.translate(Math.floor(x) + bw, Math.floor(by)); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, Math.ceil(bw) + 1, Math.ceil(bh)); ctx.restore() }
  }
  if (by + bh < coverBottom) { ctx.fillStyle = C.skyLow; ctx.fillRect(padL, by + bh - 1, padR - padL, coverBottom - by - bh + 1) }
  // soft clouds drifting past below the island
  for (let i = 0; i < 10; i++) {
    const cx = padL + ((_h(i) * 3000 + t * (8 + 6 * _h(i + 5))) % (padR - padL + 400)) - 200, cy = isl.y + isl.h * (0.55 + 0.4 * _h(i + 9))
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(cx, cy, 70 + 50 * _h(i + 2), 16 + 8 * _h(i + 3), 0, 0, Math.PI * 2); ctx.fill()
  }
  // the island with the village (locked to the fighters)
  const mg = c.img[P.mg.file]; if (ready(mg)) ctx.drawImage(mg, Math.floor(isl.x), Math.floor(isl.y), Math.ceil(isl.w), Math.ceil(isl.h))
  ctx.restore()
  return true
}
function drawSsf2Front(ctx, def, c, W, groundY) {
  const isl = ssf2Place(def, c, W, groundY), fg = c.img[c.layout.pieces.fg.file], t = now()
  ctx.save(); ctx.imageSmoothingEnabled = false
  if (ready(fg)) ctx.drawImage(fg, Math.floor(isl.x), Math.floor(isl.y), Math.ceil(isl.w), Math.ceil(isl.h))
  for (let i = 0; i < 18; i++) {                                    // leaves drifting down across the village
    const ph = ((t * (0.06 + 0.04 * _h(i + 1)) + _h(i)) % 1), x = isl.x + isl.w * _h(i + 30) + Math.sin(t * 1.3 + i) * 40 - ph * 120
    const y = isl.y + ph * isl.h * 0.75, a = t * 2 + i
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = i % 3 ? "#5fae3c" : "#8bd05a"
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}

// ───────────────────────────── INFINITY CASTLE (render-only, wall clock) ─────────────────────────────
function drawCastleBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, im = c.img[P.castle.file], cw = P.castle.w, ch = P.castle.h
  const range = Math.abs(shift(p, W)) * 2 + 400
  const sc = Math.max((dockTop + 20 - coverTop) / ch, (padR - padL + range) / cw)
  const w = cw * sc, h = ch * sc, drift = Math.sin(t * 0.07) * 18                  // the castle slowly shifting
  const x = W / 2 - w / 2 + shift(p, W), y = dockTop + 20 - h + drift
  if (ready(im)) ctx.drawImage(im, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h + 24))
  // warm light breathing in the depths
  const gx = x + w * 0.52, gy = y + h * 0.42, gr = h * 0.45, a = 0.12 + 0.08 * Math.sin(t * 0.9)
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, "rgba(255,170,70,0)")
  ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2)
  // floating rooms: small platforms rising and sinking at different depths (nearer = larger, faster parallax)
  const fp = c.img[P.float.file]
  if (ready(fp)) for (let i = 0; i < 9; i++) {
    const depth = 0.35 + 0.6 * _h(i + 3), fs = 0.6 + 1.4 * depth, per = 26 + 18 * _h(i + 8)
    const ph = ((t / per + _h(i)) % 1), fx = W * (0.05 + 0.9 * _h(i + 20)) + shift(p + 0.4 * depth, W)
    const fy = dockTop + 60 - ph * (dockTop + 60 - coverTop + 120) + Math.sin(t * 0.6 + i) * 6
    if (fx < padL - 300 || fx > padR + 300) continue
    ctx.globalAlpha = 0.45 + 0.5 * depth
    ctx.drawImage(fp, Math.floor(fx), Math.floor(fy), Math.ceil(P.float.w * fs), Math.ceil(P.float.h * fs))
  }
  ctx.globalAlpha = 1
  const vg = ctx.createLinearGradient(0, coverTop, 0, dockTop + 20)                    // dark at the top, deep shadow
  vg.addColorStop(0, "rgba(0,0,0,0.55)"); vg.addColorStop(0.6, "rgba(0,0,0,0.1)"); vg.addColorStop(1, "rgba(10,4,2,0.35)")
  ctx.fillStyle = vg; ctx.fillRect(padL, coverTop, padR - padL, dockTop + 20 - coverTop)
}

function infinityFx(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now()
  // lantern flames flicker: a warm glow over each lantern head
  const lw = P.lantern.w * S, lh = P.lantern.h * S
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (const pr of def.props) {
    const x = pr.x * W + shift(rowFactor(def, pr.bottomRow), W), y = dockTop + pr.bottomRow * S - lh + 8
    const f = 0.55 + 0.25 * Math.sin(t * 9 + pr.x * 40) + 0.2 * Math.sin(t * 23 + pr.x * 90)
    const g = ctx.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, `rgba(255,200,90,${0.55 * f})`); g.addColorStop(1, "rgba(255,140,40,0)")
    ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92)
  }
  ctx.restore()
  // the platform's front wall below the planks (mirror-tiled, scrolling with the floor's front edge)
  const top = dockTop + P.deck.h * S
  if (coverBottom <= top) return
  const fc = c.img[P.face.file], fw = P.face.w * S, fh = P.face.h * S, off = W / 2 - fw / 2 + shift(def.floor.rimFactor, W)
  if (ready(fc)) for (let k = Math.floor((padL - off) / fw); off + k * fw < padR; k++) {
    const x = off + k * fw
    if (Math.abs(k) % 2 === 0) ctx.drawImage(fc, Math.floor(x), top, Math.ceil(fw) + 1, fh)
    else { ctx.save(); ctx.translate(Math.floor(x) + fw, top); ctx.scale(-1, 1); ctx.drawImage(fc, 0, 0, Math.ceil(fw) + 1, fh); ctx.restore() }
  }
  if (coverBottom > top + fh) {
    const g = ctx.createLinearGradient(0, top + fh, 0, coverBottom); g.addColorStop(0, "#1a0e06"); g.addColorStop(1, "#050302")
    ctx.fillStyle = g; ctx.fillRect(padL, top + fh, padR - padL, coverBottom - top - fh)
  }
}

// ───────────────────────────── THE NULL VOID (render-only, wall clock) ─────────────────────────────
// a jagged floating rock: flat-ish lit top, ragged underside tapering to a point; deterministic from its seed
function nvRock(ctx, x, y, w, seed, lit = "#6a5590", body = "#2a1d3e", glow = null) {
  const n = 9, h = w * (0.55 + 0.3 * _h(seed + 1))
  ctx.beginPath(); ctx.moveTo(x - w / 2, y)
  for (let i = 1; i < n; i++) ctx.lineTo(x - w / 2 + (w * i) / n, y - 3 - 6 * _h(seed + i * 3))          // bumpy top
  ctx.lineTo(x + w / 2, y)
  for (let i = n - 1; i > 0; i--) {                                                                   // ragged underside
    const u = i / n, depth = h * Math.sin(u * Math.PI) ** 0.8 * (0.6 + 0.5 * _h(seed + i * 7))
    ctx.lineTo(x - w / 2 + w * u, y + depth)
  }
  ctx.closePath()
  const g = ctx.createLinearGradient(0, y - 8, 0, y + h); g.addColorStop(0, lit); g.addColorStop(0.15, body); g.addColorStop(1, "#0b0614")
  ctx.fillStyle = g; ctx.fill()
  if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - w * 0.2, y + h * 0.15); ctx.lineTo(x - w * 0.05, y + h * 0.45); ctx.lineTo(x + w * 0.1, y + h * 0.3); ctx.stroke() }
  return h
}

function drawNullVoidBack(ctx, def, c, { W, dockTop, padL, padR, coverTop, p }) {
  const t = now(), P = c.layout.pieces, bot = dockTop + 4 * def.S, sh = shift(p, W)
  const vt = Math.max(coverTop, bot - 440)                           // the part of the void actually on screen
  // 1. the void: near-black violet, Unlimited-Void-style stars + nebulae + a faint grid
  const g = ctx.createLinearGradient(0, coverTop, 0, bot); g.addColorStop(0, "#05020b"); g.addColorStop(0.6, "#160828"); g.addColorStop(1, "#2a0c30")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, bot - coverTop)
  for (const [nx, ny, r, col] of [[0.2, 0.35, 420, "150,30,140"], [0.75, 0.5, 520, "70,20,150"], [0.5, 0.2, 360, "200,40,80"], [0.95, 0.15, 300, "30,120,150"]]) {
    const cx = W * nx + sh * 1.4, cy = coverTop + (bot - coverTop) * ny, ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    ng.addColorStop(0, `rgba(${col},0.28)`); ng.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = ng; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  for (let i = 0; i < 260; i++) {
    const x = _h(i) * (W + 1400) - 700 + sh + (t * 3 * (i % 4)) % 40, y = coverTop + _h(i + 777) * (bot - coverTop)
    if (x < padL || x > padR) continue
    ctx.fillStyle = `rgba(235,225,255,${0.3 + 0.7 * Math.abs(Math.sin(t * (0.4 + _h(i + 3)) + i))})`; ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1)
  }
  ctx.strokeStyle = "rgba(200,170,255,0.045)"; ctx.lineWidth = 1                       // the faint endless grid
  const gs = 64, gx0 = ((sh * 1.5 - padL) % gs + gs) % gs + padL - gs
  for (let x = gx0; x < padR; x += gs) { ctx.beginPath(); ctx.moveTo(x, coverTop); ctx.lineTo(x, bot); ctx.stroke() }
  for (let y = bot - ((t * 6) % gs); y > coverTop; y -= gs) { ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padR, y); ctx.stroke() }
  // 2. the rift: a swirling vortex high up where things are dragged in from outside
  const rx = W * 0.56 + sh * 1.2, ry = vt + (bot - vt) * 0.42, rr = 95
  const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * 2.2); rg.addColorStop(0, "rgba(255,120,200,0.55)"); rg.addColorStop(0.35, "rgba(150,40,170,0.3)"); rg.addColorStop(1, "rgba(80,10,120,0)")
  ctx.fillStyle = rg; ctx.fillRect(rx - rr * 2.2, ry - rr * 2.2, rr * 4.4, rr * 4.4)
  ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.55)
  for (let arm = 0; arm < 6; arm++) {
    ctx.strokeStyle = arm % 2 ? "rgba(255,140,220,0.55)" : "rgba(120,40,200,0.65)"; ctx.lineWidth = 6 - arm * 0.6
    ctx.beginPath()
    for (let i = 0; i <= 40; i++) { const u = i / 40, a = -t * 0.9 + arm * Math.PI / 3 + u * 5.2, r = rr * (1 - u * 0.92); i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) }
    ctx.stroke()
  }
  ctx.fillStyle = "#fff0fa"; ctx.beginPath(); ctx.arc(0, 0, 10 + 3 * Math.sin(t * 3), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  for (let i = 0; i < 10; i++) {                                     // debris spiralling into the rift
    const ph = (t * (0.05 + 0.03 * _h(i)) + _h(i + 40)) % 1, a = _h(i + 60) * 6.28 + ph * 9, r = rr * 3.2 * (1 - ph)
    const dx = rx + Math.cos(a) * r, dy = ry + Math.sin(a) * r * 0.55, sz = 2 + 6 * (1 - ph)
    ctx.fillStyle = `rgba(120,100,150,${0.9 * (1 - ph)})`; ctx.save(); ctx.translate(dx, dy); ctx.rotate(a * 2); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.7); ctx.restore()
  }
  // 3. glowing mist (the repainted clouds), drifting
  const mi = c.img[P.mist.file]
  if (ready(mi)) {
    const mw = P.mist.w * 1.5, mh = P.mist.h * 1.5, my = bot - mh - 10, mx0 = ((sh * 2 + t * 6 - padL) % mw + mw) % mw - mw + padL
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.38
    for (let x = mx0, k = 0; x < padR; x += mw, k++) {
      if (k % 2 === 0) ctx.drawImage(mi, Math.floor(x), my, Math.ceil(mw) + 1, mh)
      else { ctx.save(); ctx.translate(Math.floor(x) + mw, my); ctx.scale(-1, 1); ctx.drawImage(mi, 0, 0, Math.ceil(mw) + 1, mh); ctx.restore() }
    }
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false
  }
  // 4. floating rock islands at several depths, bobbing; two carry the petrified tree and the wrecked shack
  const ISL = [[0.08, 0.3, 150, 0.25], [0.3, 0.55, 230, 0.4, "tree"], [0.47, 0.2, 90, 0.2], [0.68, 0.62, 260, 0.45, "shack"], [0.9, 0.4, 170, 0.32], [0.18, 0.72, 120, 0.55], [0.82, 0.78, 140, 0.6]]
  ISL.forEach(([fx, fy, w, depth, carry], i) => {
    const x = W * fx + shift(depth, W), y = vt + (bot - vt) * fy * 0.85 + Math.sin(t * (0.3 + 0.2 * _h(i)) + i * 2) * 10
    if (x + w < padL - 200 || x - w > padR + 200) return
    if (carry) {
      const pc = P[carry], im = c.img[pc.file], s = carry === "tree" ? 1.1 : 0.85, iw = pc.w * s, ih = pc.h * s
      if (ready(im)) ctx.drawImage(im, Math.floor(x - iw / 2 + (carry === "shack" ? 10 : 0)), Math.floor(y - ih + 6), Math.ceil(iw), Math.ceil(ih))
    }
    nvRock(ctx, x, y, w, i * 31 + 5, depth > 0.4 ? "#7a63a2" : "#4e3e6c", depth > 0.4 ? "#2e2044" : "#1e1530", i % 2 ? "rgba(230,80,200,0.6)" : null)
  })
  for (let i = 0; i < 16; i++) {                                     // small debris drifting past
    const x = padL + ((t * (6 + 10 * _h(i)) + _h(i + 90) * 4000) % (padR - padL + 200)) - 100, y = vt + _h(i + 120) * (bot - vt) * 0.85
    nvRock(ctx, x, y + Math.sin(t + i) * 4, 10 + 16 * _h(i + 140), i * 13 + 400, "#4e3e6c", "#1e1530")
  }
}

// below the fighters' rock: the island's jagged underside, cracks glowing, crumbs falling away into the void
function nullVoidUnder(ctx, def, c, { W, dockTop, padL, padR, coverBottom }) {
  const P = c.layout.pieces, S = def.S, t = now(), top = dockTop + P.floor.h * S
  if (coverBottom <= top) return
  ctx.fillStyle = "#05020b"; ctx.fillRect(padL, top, padR - padL, coverBottom - top)
  const off = shift(def.floor.rimFactor, W)
  // irregular hanging rock: each world column k gets its own width and depth (big crags + small teeth between)
  const cols = [], X0 = padL - 200
  let k = Math.floor((X0 - off) / 50)
  for (let x = off + k * 50; x < padR + 200; k++) { const w = 26 + 70 * _h(k * 11 + 1); cols.push([x, w, k]); x += w }
  for (const layer of [0, 1]) {
    ctx.beginPath(); ctx.moveTo(cols[0][0], top)
    for (const [x, w, kk] of cols) {
      const big = _h(kk * 5 + layer) > 0.7, d = (big ? 150 + 120 * _h(kk * 3 + 9) : 30 + 70 * _h(kk * 3 + 4)) * (layer ? 0.6 : 1)
      ctx.lineTo(x + w * (0.3 + 0.4 * _h(kk + 77)), top + d); ctx.lineTo(x + w, top + 10 + 30 * _h(kk * 9 + layer))
    }
    ctx.lineTo(padR + 200, top); ctx.closePath()
    const g = ctx.createLinearGradient(0, top, 0, top + 270)
    if (layer) { g.addColorStop(0, "#4a3670"); g.addColorStop(1, "#1a1030") } else { g.addColorStop(0, "#2a1c42"); g.addColorStop(0.5, "#140b22"); g.addColorStop(1, "#06030c") }
    ctx.fillStyle = g; ctx.fill()
  }
  ctx.strokeStyle = `rgba(230,80,200,${0.45 + 0.3 * Math.sin(t * 2)})`; ctx.lineWidth = 1.2
  for (const [x, w, kk] of cols) {                                   // a few thin glowing veins
    if (_h(kk * 13 + 2) < 0.75) continue
    let vx = x + w * 0.5, vy = top + 8; ctx.beginPath(); ctx.moveTo(vx, vy)
    for (let j = 0; j < 4; j++) { vx += (_h(kk + j * 5) - 0.5) * 18; vy += 12 + 10 * _h(kk * 2 + j); ctx.lineTo(vx, vy) }
    ctx.stroke()
  }
  ctx.fillStyle = "#e8e0f8"; ctx.fillRect(padL, top, padR - padL, 2)
  for (let i = 0; i < 14; i++) {                                     // crumbs falling off
    const ph = (t * (0.25 + 0.2 * _h(i)) + _h(i + 30)) % 1, x = padL + _h(i + 50) * (padR - padL), y = top + 40 + ph * (coverBottom - top)
    ctx.fillStyle = `rgba(120,96,150,${1 - ph})`; ctx.fillRect(x, y, 3 + 3 * _h(i), 3)
  }
}

// ───────────────────────────── SHIBUYA INCIDENT (render-only, wall clock) ─────────────────────────────
// Chun-Li's street at night under the dome. A crowd of bystanders walks the kerb, panics when the fight comes near,
// and dies to whatever reaches them: slashes cut them in half (Dismantle / Cleave dice them), blasts blow them apart,
// strikes launch them. Every landed hit also damages the city behind: holes punched in the towers, fires, smoke,
// screens dying, towers collapsing, shop glass breaking, craters in the street. Nothing here touches the fight:
// the state is read from the fighters / attack boxes / projectiles the frame hands over, never written back.
const SB = { p1: null, peds: [], pieces: [], rest: [], blood: [], pools: [], wall: [], glass: [], craters: [], debris: [], towers: null,
  hp: new WeakMap(), last: 0, spawnT: 0, total: 0, ambientT: 0, seq: 0, yG: 0, W: 2400, cracks: [] }
const SB_TOWER_P = 0.35, SB_SHOP_P = 0.92, SB_SHOP_SC = 1.05
let _sbSeed = 0x9e3779b9   // render-only PRNG (the sim never sees it)
const sbRnd = () => { _sbSeed ^= _sbSeed << 13; _sbSeed ^= _sbSeed >>> 17; _sbSeed ^= _sbSeed << 5; return (_sbSeed >>> 0) / 4294967296 }
const SLASHERS = /sukuna|zoro|toji|tanjiro|zenitsu|inosuke|rengoku|ichigo|kenpachi|zaraki|yamamoto|killua|maki|miwa|kakashi|sasuke|itachi|madara|minato|hashirama|tobirama|hisoka/
const isSlash = n => /slash|cleave|dismantle|sword|blade|cut|katana|slice|claw|scythe|sever|edge|fang|kunai|iai|tachi|zan|chidori|wind|whip/i.test(n)
const isBlast = n => /ki\b|beam|blast|bomb|fire|flame|explo|kame|cannon|laser|rasen|purple|ball|wave|nuke|burst|meteor|arrow|shot|orb|ray|bullet|gun|missile|domain|ult/i.test(n)

function sbTowers(W) {
  const T = []; let x = -900, i = 0
  while (x < W + 900) {
    const w = 150 + 170 * _h(i * 17 + 3), h = 380 + 520 * _h(i * 29 + 7)
    T.push({ x, w, h, i, holes: [], dmg: 0, fall: null, cut: 1, screen: _h(i * 41 + 1) > 0.62, neon: _h(i * 5 + 9) > 0.4 })
    x += w + 14 + 40 * _h(i * 7 + 2); i++
  }
  return T
}
function sbReset(p1, W) {
  Object.assign(SB, { p1, peds: [], pieces: [], rest: [], blood: [], pools: [], wall: [], glass: [], craters: [], debris: [], towers: sbTowers(W),
    hp: new WeakMap(), spawnT: 0, total: 0, ambientT: 0, seq: 0, W, cracks: [] })
}

// a bystander drawn in chunky pixels (adults only): walk 0/1, panic 0/1
const _pedCache = new Map()
function pedFrames(seed) {
  if (_pedCache.has(seed)) return _pedCache.get(seed)
  const pick = (a, k) => a[Math.floor(_h(seed * 13 + k) * a.length)]
  const skin = pick(["#f1c9a5", "#e0b08a", "#c58c64", "#8d5b3e", "#5e3c28"], 1), coat = pick(["#2b2f3a", "#5a2a2a", "#2f4a3a", "#bdb4a2", "#3a3f6a", "#7a5a30", "#141418", "#6a6f78", "#8a2f4a"], 2)
  const pants = pick(["#1d1f26", "#33363f", "#2a3550", "#4a3a2a", "#111"], 3), hair = pick(["#141414", "#3a2618", "#6b4a2a", "#c9b07a", "#8a8a8a", "#1a1a2a"], 4)
  const long = _h(seed * 13 + 5) > 0.6, bag = _h(seed * 13 + 6) > 0.6, px = 3, GW = 16, GH = 36
  const fr = []
  for (let f = 0; f < 4; f++) {
    const cv = document.createElement("canvas"); cv.width = GW * px; cv.height = GH * px
    const g = cv.getContext("2d"), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * px, y * px, w * px, h * px) }
    const panic = f >= 2, step = f % 2
    R(6, 2, 4, 5, skin); R(6, 1, 4, 2, hair); if (long) { R(5, 2, 1, 6, hair); R(10, 2, 1, 6, hair) } else R(5, 2, 1, 2, hair)
    R(7, 7, 2, 1, skin); R(5, 8, 6, 11, coat); R(5, 8, 6, 1, "rgba(255,255,255,0.15)")
    if (panic) { R(3, 2 + step, 2, 7, coat); R(11, 2 + (1 - step), 2, 7, coat); R(3, 1 + step, 2, 1, skin); R(11, 1 + (1 - step), 2, 1, skin) }
    else { R(4, 9 + step, 1, 9, coat); R(11, 10 - step, 1, 9, coat); R(4, 18 + step, 1, 1, skin); R(11, 19 - step, 1, 1, skin) }
    if (bag && !panic) R(11, 15 - step, 2, 4, "#3a2a1a")
    const s = panic ? 2 : 1
    R(6 - step * s, 19, 2, 15, pants); R(8 + step * s, 19, 2, 15, pants)
    R(5 - step * s, 34, 3, 1, "#0c0c0c"); R(8 + step * s, 34, 3, 1, "#0c0c0c")
    fr.push(cv)
  }
  _pedCache.set(seed, fr); return fr
}
function sbSpawn(c, viewL, viewR) {
  const seq = SB.seq++, side = _h(seq * 3 + 1) < 0.5 ? -1 : 1, P = c.layout.peds
  const kind = _h(seq * 7 + 2) < 0.12 ? "biker" : _h(seq * 7 + 3) < 0.1 ? "hatman" : "ped"
  const x = side < 0 ? Math.max(20, viewL - 80) : Math.min(SB.W - 20, viewR + 80)
  SB.peds.push({ kind, seed: seq * 977 + 13, x, dir: -side, speed: kind === "biker" ? 170 : 38 + 30 * _h(seq * 11), t: _h(seq) * 3,
    freeze: kind === "ped" && _h(seq * 5 + 4) < 0.3, panic: 0, frames: kind === "ped" ? pedFrames(seq * 977 + 13) : P[kind].map(f => c.img[f.file]),
    sc: kind === "ped" ? 1 : kind === "biker" ? 1.05 : 1.5 })
}
function pedSprite(pd) {
  const k = pd.kind === "ped" ? (pd.panic > 0 ? 2 : 0) + (Math.floor(pd.t / (pd.panic > 0 ? 0.09 : 0.2)) % 2)
    : Math.floor(pd.t / (pd.kind === "biker" ? 0.08 : 0.3)) % pd.frames.length
  const im = pd.frames[k]; return { im, w: (im.width || 48) * pd.sc, h: (im.height || 108) * pd.sc }
}

// ── gore ──
function sbBleed(x, y, n, vx0, spread, wallFrac = 0.3) {
  for (let i = 0; i < n; i++) {
    if (SB.blood.length > 900) SB.blood.shift()
    const a = -Math.PI / 2 + (sbRnd() - 0.5) * spread, sp = 120 + sbRnd() * 520
    SB.blood.push({ x, y, vx: vx0 + Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 2 + sbRnd() * 4, wall: sbRnd() < wallFrac, life: 0.25 + sbRnd() * 0.5 })
  }
}
function sbKill(pd, cause, fromX, rosterKey = "") {
  const { im, w, h } = pedSprite(pd), away = Math.sign(pd.x - fromX) || 1, flip = pd.dir < 0 ? -1 : 1
  const name = String(cause || "").toLowerCase()
  const type = /dismantle|cleave/.test(name) ? "dice" : isSlash(name) || (SLASHERS.test(rosterKey) && !isBlast(name)) ? "cut" : isBlast(name) ? "gib" : "launch"
  const base = { im, w, h, flip, landed: false }
  const add = (poly, vx, vy, va, delay = 0, bleed = 0, cuts = []) => {
    let cx = 0, cy = 0; for (const [a, b] of poly) { cx += a; cy += b } cx /= poly.length; cy /= poly.length
    let r = 0; for (const [a, b] of poly) r = Math.max(r, Math.hypot(a - cx, b - cy))
    SB.pieces.push({ ...base, poly, cx, cy, r, x: pd.x + cx, y: SB.yG + cy, vx, vy, a: 0, va, delay, bleed, cuts })
  }
  const L = -w / 2, R = w / 2
  if (type === "cut") {
    const y0 = -h * (0.45 + 0.2 * sbRnd()), tilt = (sbRnd() - 0.5) * 0.7 * w
    const cut = [[L, y0 - tilt / 2], [R, y0 + tilt / 2]]
    add([[L, -h], [R, -h], cut[1], cut[0]], away * (180 + sbRnd() * 200), -300 - sbRnd() * 200, away * (4 + sbRnd() * 5), 0, 0.6, [cut])
    add([cut[0], cut[1], [R, 0], [L, 0]], away * 30, -40, away * 1.6, 0.45, 2.2, [cut])
    sbBleed(pd.x, SB.yG + y0, 110, away * 120, 1.6)
  } else if (type === "dice") {
    const ys = [-h, -h * (0.72 + 0.06 * sbRnd()), -h * (0.5 + 0.06 * sbRnd()), -h * (0.27 + 0.06 * sbRnd()), 0]
    for (let k = 0; k < 4; k++) for (const [x0, x1] of (k === 1 || k === 2 ? [[L, 0], [0, R]] : [[L, R]])) {
      const sl = (sbRnd() - 0.5) * 10
      add([[x0, ys[k] + sl], [x1, ys[k] - sl], [x1, ys[k + 1]], [x0, ys[k + 1]]], (x0 < 0 && x1 <= 0 ? -1 : x0 >= 0 ? 1 : away) * (40 + 120 * sbRnd()) + away * 60,
        -120 - 160 * sbRnd() + k * 40, (sbRnd() - 0.5) * 10, 0.18 + 0.1 * k * sbRnd(), 0.8, [[[x0, ys[k]], [x1, ys[k]]], [[x0, ys[k + 1]], [x1, ys[k + 1]]]])
    }
    sbBleed(pd.x, SB.yG - h * 0.5, 220, away * 60, 2.8, 0.45)
  } else if (type === "gib") {
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 3; gx++) {
      const x0 = L + (w * gx) / 3, x1 = L + (w * (gx + 1)) / 3, y0 = -h + (h * gy) / 4, y1 = -h + (h * (gy + 1)) / 4
      const j = () => (sbRnd() - 0.5) * 6
      const poly = [[x0 + j(), y0 + j()], [x1 + j(), y0 + j()], [x1 + j(), y1 + j()], [x0 + j(), y1 + j()]]
      const ang = Math.atan2(((y0 + y1) / 2 + h / 2), ((x0 + x1) / 2) || 0.01), sp = 380 + 520 * sbRnd()
      add(poly, Math.cos(ang) * sp + away * 260, Math.sin(ang) * sp - 420, (sbRnd() - 0.5) * 22, 0, 0.5, [[poly[0], poly[1]], [poly[2], poly[3]]])
    }
    sbBleed(pd.x, SB.yG - h * 0.5, 260, away * 160, 6.2, 0.5)
    SB.craters.push({ x: pd.x, r: 38, scorch: true })
  } else {
    add([[L, -h], [R, -h], [R, 0], [L, 0]], away * (620 + 300 * sbRnd()), -420 - 200 * sbRnd(), away * (7 + 6 * sbRnd()), 0, 0.9, [])
    sbBleed(pd.x, SB.yG - h * 0.7, 70, away * 300, 1.2)
    SB.pieces[SB.pieces.length - 1].splat = true
  }
  pd.dead = true
}

// ── city damage ──
function sbHitCity(x, d, t, W) {
  const tx = x - shift(SB_TOWER_P, W), T = SB.towers
  let best = T[0], bd = 1e9
  for (const tw of T) { const dd = Math.abs(tw.x + tw.w / 2 - tx); if (dd < bd && !tw.fall) { bd = dd; best = tw } }
  const n = d >= 110 ? 2 : 1
  for (let k = 0; k < n; k++) {
    if (best.holes.length > 14) break
    const s = SB.seq++
    best.holes.push({ u: 0.12 + 0.76 * _h(s * 3 + 1), v: 0.05 + 0.9 * _h(s * 3 + 2), r: 14 + Math.min(46, d * 0.22) * (0.6 + 0.6 * _h(s * 3 + 5)), t0: t, seed: s })
    for (let i = 0; i < 10; i++) SB.debris.push({ x: best.x + best.w * best.holes[best.holes.length - 1].u, y: null, hv: best.holes[best.holes.length - 1].v, tw: best,
      vx: (sbRnd() - 0.5) * 160, vy: -60 - sbRnd() * 120, s: 3 + sbRnd() * 6, life: 2.5 })
  }
  best.dmg += d / 260
  if (best.dmg > 1.25 && !best.fall && best.h > 300) best.fall = { t0: t, cut: 0.45 + 0.2 * _h(best.i * 3) }
  // the shop front behind the impact: broken glass
  const sx = x - shift(SB_SHOP_P, W)
  SB.cracks.push({ x: sx, y: 0.35 + 0.35 * sbRnd(), r: 20 + Math.min(40, d * 0.3), seed: SB.seq++ })
  if (SB.cracks.length > 40) SB.cracks.shift()
  for (let i = 0; i < 14; i++) SB.glass.push({ x, y: SB.yG - 60 - sbRnd() * 90, vx: (sbRnd() - 0.5) * 300, vy: -100 - sbRnd() * 200, s: 2 + sbRnd() * 3, life: 1.2 })
  if (d >= 80) SB.craters.push({ x, r: 26 + Math.min(50, d * 0.25) })
  if (SB.craters.length > 30) SB.craters.shift()
}

// per-frame update, from the front pass (it alone sees the fighters); the back pass draws the result next frame
function sbUpdate(c, W, groundY, world) {
  const t = now(), dt = Math.min(0.05, Math.max(0, t - (SB.last || t))); SB.last = t
  const F = (world.fighters || []).filter(Boolean)
  if (F[0] !== SB.p1 || !SB.towers || SB.W !== W) sbReset(F[0], W)
  SB.yG = groundY - 24
  const v = view(1280, W)
  // hits landed this frame (a fighter's health dropped) → the city takes it; big ones blow away nearby bystanders
  for (const f of F) {
    const hp = f.health ?? 0, was = SB.hp.get(f)
    SB.hp.set(f, hp)
    if (was == null || hp >= was) continue
    const d = was - hp, x = f.x + (f.w || 50) / 2, att = F.find(o => o !== f)
    SB.total += d
    sbHitCity(x, d, t, W)
    if (d >= 110) for (const pd of SB.peds) if (!pd.dead && Math.abs(pd.x - x) < 170) sbKill(pd, att?.currentAttack?.name || "blast", x, att?.rosterKey)
  }
  // the fight elsewhere in Shibuya: as the match wears on, explosions go off in the towers on their own
  SB.ambientT -= dt
  if (SB.total > 250 && SB.ambientT <= 0) {
    SB.ambientT = Math.max(2.5, 9 - SB.total / 250)
    const T = SB.towers, tw = T[Math.floor(sbRnd() * T.length)]
    sbHitCity(tw.x + tw.w / 2 + shift(SB_TOWER_P, W), 40 + sbRnd() * 80, t, W)
  }
  // crowd: keep the kerb busy
  SB.spawnT -= dt
  if (SB.spawnT <= 0 && SB.peds.filter(p => !p.dead).length < 8) { sbSpawn(c, v.left, v.right); SB.spawnT = 0.9 + sbRnd() * 1.2 }
  const boxes = F.map(f => [f, world.attackBox?.(f)]).filter(([, b]) => b)
  for (const pd of SB.peds) {
    if (pd.dead) continue
    pd.t += dt
    let near = null, nd = 1e9
    for (const f of F) { const d = Math.abs(f.x + (f.w || 50) / 2 - pd.x); if (d < nd) { nd = d; near = f } }
    if (near && nd < 280 && pd.kind !== "biker" && !pd.held) { pd.panic = 1.5; pd.dir = Math.sign(pd.x - (near.x + (near.w || 50) / 2)) || pd.dir }
    pd.panic = Math.max(0, pd.panic - dt)
    const sp = pd.freeze && pd.panic > 0 ? 0 : pd.speed * (pd.panic > 0 ? 3 : 1)
    pd.x += pd.dir * sp * dt
    if (pd.x < 10 || pd.x > W - 10) pd.dir *= -1                      // the dome: nobody gets out
    const { w, h } = pedSprite(pd), L = pd.x - w * 0.3, R = pd.x + w * 0.3, T = SB.yG - h, B = SB.yG
    for (const [f, b] of boxes) if (b.x < R && b.x + b.w > L && b.y < B + 30 && b.y + b.h > T - 20) { sbKill(pd, f.currentAttack?.name, f.x + (f.w || 50) / 2, f.rosterKey); break }
    if (pd.dead) continue
    for (const p of world.projectiles || []) {
      const r = p.radius || (p.w || 20) / 2
      if (p.x + r > L && p.x - r < R && p.y + r > T - 10 && p.y - r < B + 20) { const o = p.owner; sbKill(pd, p.name || p.type || "blast", p.x - (p.vx || 0), o?.rosterKey || ""); break }
    }
  }
  SB.peds = SB.peds.filter(p => !p.dead && p.x > v.left - 1400 && p.x < v.right + 1400)
  // pieces in flight
  for (const pc of SB.pieces) {
    if (pc.delay > 0) { pc.delay -= dt; if (pc.bleed > 0 && sbRnd() < 0.6) sbBleed(pc.x, pc.y - pc.r * 0.5, 2, 0, 0.6, 0.1); continue }
    pc.vy += 1500 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.a += pc.va * dt
    if (pc.bleed > 0) { pc.bleed -= dt; if (sbRnd() < 0.8) sbBleed(pc.x, pc.y, 2, pc.vx * 0.2, 1, 0.05) }
    const floorY = SB.yG - Math.min(pc.r * 0.45, 16)
    if (pc.y >= floorY) {
      pc.y = floorY
      if (pc.splat && Math.abs(pc.vy) > 200) sbBleed(pc.x, pc.y, 40, pc.vx * 0.3, 2.4, 0)
      if (Math.abs(pc.vy) > 260) { pc.vy *= -0.25; pc.vx *= 0.5; pc.va *= 0.5 }
      else { pc.landed = true; pc.a = Math.round(pc.a / (Math.PI / 2)) * (Math.PI / 2) + (pc.cuts.length ? 0.2 : 0); SB.pools.push({ x: pc.x, r: 6, R: 24 + pc.r * 0.5 }) }
    }
  }
  for (const pc of SB.pieces) if (pc.landed) SB.rest.push(pc)
  SB.pieces = SB.pieces.filter(p => !p.landed)
  if (SB.rest.length > 90) SB.rest.splice(0, SB.rest.length - 90)
  // blood
  for (const b of SB.blood) {
    b.life -= dt; b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt
    if (b.wall && b.life <= 0) { SB.wall.push({ x: b.x - shift(SB_SHOP_P, W), y: b.y, s: b.s * (1.2 + sbRnd()) }); b.dead = true }
    else if (b.y >= SB.yG + 8 && b.vy > 0) {
      b.dead = true
      const pool = SB.pools.find(p => Math.abs(p.x - b.x) < p.R * 0.8)
      if (pool) pool.R = Math.min(90, pool.R + 0.25); else SB.pools.push({ x: b.x, r: 2, R: 6 + sbRnd() * 8 })
    }
  }
  SB.blood = SB.blood.filter(b => !b.dead)
  if (SB.wall.length > 500) SB.wall.splice(0, SB.wall.length - 500)
  if (SB.pools.length > 160) SB.pools.splice(0, SB.pools.length - 160)
  for (const p of SB.pools) p.r = Math.min(p.R, p.r + 30 * dt)
  for (const g of SB.glass) { g.life -= dt; g.vy += 1200 * dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.y > SB.yG + 6) { g.y = SB.yG + 6; g.vx *= 0.8; g.vy = 0 } }
  SB.glass = SB.glass.filter(g => g.life > 0)
  for (const d of SB.debris) { d.life -= dt; d.vy += 600 * dt; d.x += d.vx * dt; if (d.y == null) d.y = 0; d.y += d.vy * dt }
  SB.debris = SB.debris.filter(d => d.life > 0)
}

function drawPiece(ctx, pc) {
  ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(pc.a); ctx.translate(-pc.cx, -pc.cy)
  ctx.beginPath(); ctx.moveTo(pc.poly[0][0], pc.poly[0][1]); for (const [a, b] of pc.poly.slice(1)) ctx.lineTo(a, b); ctx.closePath()
  ctx.save(); ctx.clip()
  if (pc.flip < 0) { ctx.scale(-1, 1) }
  if (ready(pc.im) || pc.im.getContext) ctx.drawImage(pc.im, -pc.w / 2, -pc.h, pc.w, pc.h)
  ctx.restore()
  for (const [a, b] of pc.cuts) {                                     // the wound along each cut
    ctx.strokeStyle = "#7a0008"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    ctx.strokeStyle = "#d0202a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
  }
  ctx.restore()
}

// BACK: the night sky, the dome, the towers (and their damage), the shop row
function drawShibuyaBack(ctx, def, c, { W, dockTop, padL, padR, coverTop }) {
  const t = now(), P = c.layout.pieces
  if (!SB.towers || SB.W !== W) sbReset(SB.p1, W)
  const shopTop = dockTop + 4 - P.shops.h * SB_SHOP_SC
  const g = ctx.createLinearGradient(0, coverTop, 0, dockTop); g.addColorStop(0, "#020205"); g.addColorStop(0.55, "#0a0712"); g.addColorStop(1, "#2a0f1c")
  ctx.fillStyle = g; ctx.fillRect(padL, coverTop, padR - padL, dockTop - coverTop)
  // the dome: a black curtain closed over the district, its rim faintly shimmering
  const cx = W / 2 + shift(0.05, W), cy = dockTop + 2600, R = 3150
  ctx.save(); ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, dockTop - coverTop); ctx.clip()
  ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.beginPath(); ctx.rect(padL, coverTop, padR - padL, dockTop - coverTop); ctx.arc(cx, cy, R, 0, Math.PI * 2, true); ctx.fill()
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = `rgba(${k ? "90,40,110" : "160,60,90"},${0.25 + 0.15 * Math.sin(t * 1.3 + k)})`; ctx.lineWidth = 2 + k * 3
    ctx.beginPath(); ctx.arc(cx, cy, R - k * 6 + Math.sin(t * 0.7 + k) * 3, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke()
  }
  ctx.restore()
  // towers
  const st = shift(SB_TOWER_P, W), base = shopTop + 120
  for (const tw of SB.towers) {
    const x = tw.x + st
    if (x + tw.w < padL - 40 || x > padR + 40) continue
    let h = tw.h, top = base - h
    if (tw.fall) {
      const k = Math.min(1, (t - tw.fall.t0) / 2.6), cutY = base - h * tw.fall.cut
      if (k < 1) {                                                    // the top section shears off and drops
        ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.translate(x + tw.w / 2, cutY + 900 * k * k); ctx.rotate((tw.i % 2 ? 1 : -1) * 0.6 * k)
        sbTowerBody(ctx, tw, -tw.w / 2, -(h * (1 - tw.fall.cut)), tw.w, h * (1 - tw.fall.cut), t, true); ctx.restore()
        for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(120,110,110,${0.35 * (1 - k)})`; const a = _h(i + tw.i) * 6.28; ctx.beginPath(); ctx.arc(x + tw.w / 2 + Math.cos(a) * 160 * k, cutY + Math.sin(a) * 60 * k, 30 + 60 * k, 0, 7); ctx.fill() }
      }
      h = h * tw.fall.cut; top = base - h
    }
    sbTowerBody(ctx, tw, x, top, tw.w, h, t, false)
    if (tw.fall) {                                                    // jagged broken top, burning
      ctx.fillStyle = "#020205"; ctx.beginPath(); ctx.moveTo(x - 1, top - 2)
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + (tw.w * i) / 8, top + 4 + 26 * _h(tw.i * 9 + i)); ctx.lineTo(x + tw.w + 1, top - 2); ctx.closePath(); ctx.fill()
      for (let i = 0; i < 5; i++) sbFire(ctx, x + tw.w * (0.1 + 0.2 * i), top + 20, 16, t + i)
    }
    for (const ho of tw.holes) {
      // holes land in the part of the tower the camera sees (between the shop roofs and the top of the screen)
      const hx = x + tw.w * ho.u, hy = shopTop - 30 - ho.v * 300
      if (hy < top + 10) continue
      const fresh = Math.max(0, 1 - (t - ho.t0) / 0.5)
      ctx.fillStyle = "#050307"; ctx.beginPath()
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28, rr = ho.r * (0.65 + 0.5 * _h(ho.seed * 11 + i)); i ? ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : ctx.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255,120,40,0.55)"; ctx.lineWidth = 2; ctx.stroke()
      ctx.strokeStyle = "rgba(10,10,14,0.9)"; ctx.lineWidth = 1.2; ctx.beginPath()          // cracks running out of it
      for (let i = 0; i < 5; i++) { const a = _h(ho.seed * 3 + i) * 6.28, l = ho.r * (1.4 + _h(ho.seed + i)); ctx.moveTo(hx + Math.cos(a) * ho.r * 0.8, hy + Math.sin(a) * ho.r * 0.8); ctx.lineTo(hx + Math.cos(a + 0.3) * l, hy + Math.sin(a + 0.3) * l); ctx.lineTo(hx + Math.cos(a) * l * 1.5, hy + Math.sin(a) * l * 1.5) }
      ctx.stroke()
      sbFire(ctx, hx, hy + ho.r * 0.45, ho.r * 0.45, t + ho.seed)
      for (let i = 0; i < 4; i++) {                                   // smoke rising from it
        const ph = (t * 0.18 + i / 4 + _h(ho.seed)) % 1
        ctx.fillStyle = `rgba(40,36,40,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(hx + Math.sin(ph * 4 + i) * 14 + ph * 30, hy - ph * 260, ho.r * (0.5 + ph * 1.4), 0, 7); ctx.fill()
      }
      if (fresh > 0) { ctx.fillStyle = `rgba(255,220,140,${fresh})`; ctx.beginPath(); ctx.arc(hx, hy, ho.r * (1.6 - fresh * 0.6), 0, 7); ctx.fill() }
    }
  }
  for (const d of SB.debris) {                                         // chunks falling off the towers
    ctx.fillStyle = "#4a4650"; ctx.fillRect(d.x + st - d.s / 2, shopTop - 30 - d.hv * 300 + d.y, d.s, d.s * 0.8)
  }
  // the shop row (the sheet's market street, at night), tiled + mirrored; broken glass + blood on it
  const sp = shift(SB_SHOP_P, W), sw = P.shops.w * SB_SHOP_SC, sh = P.shops.h * SB_SHOP_SC, im = c.img[P.shops.file]
  if (ready(im)) {
    const k0 = Math.floor((padL - sp) / sw) - 1, k1 = Math.ceil((padR - sp) / sw)
    for (let k = k0; k <= k1; k++) {
      const x = Math.floor(sp + k * sw)
      if (k % 2) { ctx.save(); ctx.translate(x + sw, shopTop); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, Math.ceil(sw) + 1, sh); ctx.restore() }
      else ctx.drawImage(im, x, shopTop, Math.ceil(sw) + 1, sh)
    }
    const dark = 0.3 + Math.min(0.45, SB.total / 4000)              // night; the street dims further as the power goes
    { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(padL, shopTop, padR - padL, sh) }
  }
  ctx.strokeStyle = "rgba(220,235,255,0.75)"; ctx.lineWidth = 1.2
  for (const k of SB.cracks) {
    const x = k.x + sp, y = shopTop + sh * k.y
    if (x < padL - 80 || x > padR + 80) continue
    ctx.fillStyle = "rgba(10,10,20,0.55)"; ctx.beginPath(); ctx.arc(x, y, k.r * 0.35, 0, 7); ctx.fill()
    ctx.beginPath()
    for (let i = 0; i < 9; i++) { const a = _h(k.seed * 7 + i) * 6.28; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * k.r * 0.6, y + Math.sin(a) * k.r * 0.6); ctx.lineTo(x + Math.cos(a + 0.2) * k.r, y + Math.sin(a + 0.2) * k.r) }
    ctx.stroke()
  }
  for (const b of SB.wall) { const x = b.x + sp; if (x < padL || x > padR) continue; ctx.fillStyle = "rgba(120,0,10,0.85)"; ctx.beginPath(); ctx.ellipse(x, b.y, b.s, b.s * 0.8, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 0.7, b.y, 1.4, b.s * 3) }
}
function sbTowerBody(ctx, tw, x, top, w, h, t, falling) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#14141e"); g.addColorStop(0.7, "#1c1b28"); g.addColorStop(1, "#0b0b12")
  ctx.fillStyle = g; ctx.fillRect(x, top, w, h)
  const lightsOut = Math.min(0.9, tw.dmg * 0.6 + SB.total / 5000)
  for (let yy = 14; yy < h - 10; yy += 16) for (let xx = 8; xx < w - 10; xx += 13) {
    const k = _h(tw.i * 7919 + Math.floor(yy) * 31 + xx)
    if (k < 0.45 + lightsOut * 0.5) continue
    ctx.fillStyle = k > 0.93 ? "#ffe6a8" : k > 0.8 ? "#d9b878" : "#6a6a88"; ctx.fillRect(x + xx, top + yy, 6, 8)
  }
  if (tw.neon && !falling) {                                          // a vertical neon sign down the side
    const on = tw.dmg < 0.6 || Math.sin(t * 23 + tw.i) > 0.3, col = ["#ff3aa0", "#38e8ff", "#ffd23a", "#9a5bff"][tw.i % 4]
    ctx.fillStyle = on ? col : "#2a2a33"; ctx.globalAlpha = on ? 0.9 : 1; ctx.fillRect(x + w - 20, top + 40, 12, Math.min(220, h * 0.4)); ctx.globalAlpha = 1
    ctx.fillStyle = "#0b0b12"; for (let i = 0; i < 6; i++) ctx.fillRect(x + w - 18, top + 50 + i * 34, 8, 3)
  }
  if (tw.screen && !falling && h > 200) {                             // the big video screen
    const sx = x + w * 0.12, sy = top + 60, sw = w * 0.7, sh = Math.min(90, sw * 0.55)
    if (tw.dmg < 0.5) {
      const hue = (t * 40 + tw.i * 90) % 360
      const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh); sg.addColorStop(0, `hsl(${hue},80%,55%)`); sg.addColorStop(1, `hsl(${(hue + 120) % 360},80%,35%)`)
      ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh)
      ctx.fillStyle = "rgba(0,0,0,0.25)"; for (let y = sy; y < sy + sh; y += 3) ctx.fillRect(sx, y, sw, 1)
    } else if (tw.dmg < 0.9) {
      for (let i = 0; i < 40; i++) { const v = Math.floor(_h(i + Math.floor(t * 20) * 97) * 200); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(sx + _h(i * 3 + Math.floor(t * 20)) * sw, sy + _h(i * 5) * sh, sw / 8, 3) }
    } else { ctx.fillStyle = "#050508"; ctx.fillRect(sx, sy, sw, sh); ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(sx + sw * 0.3, sy); ctx.lineTo(sx + sw * 0.5, sy + sh * 0.6); ctx.lineTo(sx + sw * 0.8, sy + sh); ctx.stroke() }
  }
  ctx.fillStyle = "#08080c"; ctx.fillRect(x, top, w, 4)
}
function sbFire(ctx, x, y, r, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * r * 0.45, fh = r * (1.4 + 0.9 * Math.abs(Math.sin(t * (6 + i) + i * 1.7))), fw = r * 0.5
    const g = ctx.createLinearGradient(0, y, 0, y - fh); g.addColorStop(0, "rgba(255,230,150,0.75)"); g.addColorStop(0.45, "rgba(255,120,30,0.55)"); g.addColorStop(1, "rgba(200,30,10,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + ox - fw, y); ctx.quadraticCurveTo(x + ox - fw * 0.6 + Math.sin(t * 8 + i) * fw * 0.5, y - fh * 0.6, x + ox + Math.sin(t * 5 + i) * fw * 0.6, y - fh)
    ctx.quadraticCurveTo(x + ox + fw * 0.6, y - fh * 0.5, x + ox + fw, y); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

// FX (after the street): craters, blood pools, the dead, and the living crowd — all behind the fighters
function shibuyaFx(ctx, def, c, { dockTop, padL, padR, coverBottom }) {
  const bot = dockTop + c.layout.pieces.street.h * def.S              // the road carries on toward the viewer
  if (coverBottom > bot) { const g = ctx.createLinearGradient(0, bot, 0, coverBottom); g.addColorStop(0, "#1c1c24"); g.addColorStop(1, "#07070a"); ctx.fillStyle = g; ctx.fillRect(padL, bot, padR - padL, coverBottom - bot); ctx.fillStyle = "#3a3a46"; ctx.fillRect(padL, bot, padR - padL, 3) }
  const yG = SB.yG || 0; if (!yG) return
  for (const k of SB.craters) {
    if (k.x < padL - 100 || k.x > padR + 100) continue
    ctx.fillStyle = k.scorch ? "rgba(10,6,6,0.75)" : "rgba(6,6,10,0.85)"; ctx.beginPath(); ctx.ellipse(k.x, yG + 14, k.r * 1.5, k.r * 0.35, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = "rgba(90,90,110,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath()
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; ctx.moveTo(k.x + Math.cos(a) * k.r * 1.2, yG + 14 + Math.sin(a) * k.r * 0.3); ctx.lineTo(k.x + Math.cos(a) * k.r * 2.3, yG + 14 + Math.sin(a) * k.r * 0.55) }
    ctx.stroke()
  }
  for (const p of SB.pools) {
    if (p.x < padL - 100 || p.x > padR + 100) continue
    ctx.fillStyle = "rgba(95,0,8,0.9)"; ctx.beginPath(); ctx.ellipse(p.x, yG + 10, p.r, p.r * 0.28, 0, 0, 7); ctx.fill()
    ctx.fillStyle = "rgba(200,40,50,0.35)"; ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.25, yG + 9, p.r * 0.4, p.r * 0.08, 0, 0, 7); ctx.fill()
  }
  for (const pc of SB.rest) if (pc.x > padL - 120 && pc.x < padR + 120) drawPiece(ctx, pc)
  for (const pd of SB.peds) {
    const { im, w, h } = pedSprite(pd)
    if (pd.x + w < padL || pd.x - w > padR || !(ready(im) || im.getContext)) continue
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(pd.x, yG, w * 0.35, 4, 0, 0, 7); ctx.fill()
    ctx.save(); ctx.translate(pd.x, yG); if (pd.dir < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore()
  }
}

// FRONT: update, then the flying pieces / blood / glass over the fighters
function shibuyaFront(ctx, def, c, W, groundY, world) {
  sbUpdate(c, W, groundY, world)
  for (const pc of SB.pieces) drawPiece(ctx, pc)
  ctx.fillStyle = "#a00010"
  for (const b of SB.blood) ctx.fillRect(b.x - b.s / 2, b.y - b.s / 2, b.s, b.s)
  ctx.fillStyle = "rgba(200,230,255,0.85)"
  for (const g of SB.glass) ctx.fillRect(g.x, g.y, g.s, g.s * 0.6)
}
// harness / debugging: what the street has seen so far
export function shibuyaStats() { return { peds: SB.peds.length, pieces: SB.pieces.length, dead: SB.rest.length, blood: SB.blood.length, pools: SB.pools.length, holes: (SB.towers || []).reduce((n, t) => n + t.holes.length, 0), fallen: (SB.towers || []).filter(t => t.fall).length, total: SB.total } }

// harness hook: put a bystander standing still at world x; kill one with a named cause; read the counters
export const shibuyaDebug = {
  stats: shibuyaStats,
  ped(x) { const seq = SB.seq++; SB.peds.push({ kind: "ped", seed: seq * 977 + 13, x, dir: 1, speed: 0, t: 0, freeze: true, panic: 0, held: true, frames: pedFrames(seq * 977 + 13), sc: 1 }); return SB.peds.length },
  kill(cause, rosterKey = "") { const pd = SB.peds.find(p => !p.dead); if (!pd) return null; const n = SB.pieces.length; sbKill(pd, cause, pd.x - 50, rosterKey); return SB.pieces.length - n },
}
