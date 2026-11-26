// hwperf.js — HARDWARE SCAN · AUTO QUALITY · SAFETY GOVERNOR · PERFORMANCE PANEL
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Loaded LAZILY by game.js (dynamic import + one per-frame hook), so any failure in here can never
// stop the game from booting. Everything in this file is RENDER-SIDE ONLY:
//   • It never touches the simulation, its tick rate, RNG, frame data, or GAME_STATE.
//   • The LOGICAL canvas size (canvas.width / canvas.height — what physics, camera, groundY and input
//     mapping all read) is NEVER changed. "Render resolution" only enlarges the hidden BACKING STORE
//     and applies a matching base transform, so the game keeps drawing in the same logical pixels and
//     the browser simply gets more real pixels to show (sharp on 4K / Retina screens).
//   • Effect knobs are the game's existing presentation settings in juiceSettings.js (particles,
//     atmosphere, hit effects, anime FX, battle marks, weather intensity). Slow-mo and hitstop style
//     (the two sim-visible juice values) are deliberately NOT touched.
//   • Mode "off" (the default when nothing asked for it) installs no hooks and changes nothing.
//
// Why 60 fps stays 60 fps on a 144 Hz screen: the game's fixed-step loop advances logic AND sprite
// animation once per pass (animation advances inside the draw), and online lockstep/replays depend on
// that. Drawing extra in-between frames would either speed the animation up or need interpolation
// the engine can't do safely. So the loop stays 60 Hz and the display just shows each frame as soon
// as it is ready (lowest latency) — see the panel's "Refresh" note.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const LS_KEY = "ms_hwperf_v1"
const LS_BACKUP = "ms_hwperf_juice_backup"
export const TIERS = ["low", "medium", "high", "ultra", "max"]
const TIER_LABEL = { low: "Low", medium: "Medium", high: "High", ultra: "Ultra", max: "MAX", custom: "Custom", off: "Off (game default)", auto: "Auto" }

// Effect knobs per tier — ONLY presentation settings that already exist in juiceSettings.
const TIER_FX = {
  low:    { particles: "low",  atmosphere: false, hitEffects: "low",  animeFx: "low",  battleDamage: "off",   weatherIntensity: "low",  smoothing: "low" },
  medium: { particles: "full", atmosphere: false, hitEffects: "full", animeFx: "low",  battleDamage: "marks", weatherIntensity: "low",  smoothing: "medium" },
  high:   { particles: "full", atmosphere: true,  hitEffects: "full", animeFx: "full", battleDamage: "marks", weatherIntensity: "full", smoothing: "high" },
  ultra:  { particles: "full", atmosphere: true,  hitEffects: "full", animeFx: "full", battleDamage: "marks", weatherIntensity: "full", smoothing: "high" },
  max:    { particles: "full", atmosphere: true,  hitEffects: "full", animeFx: "full", battleDamage: "marks", weatherIntensity: "full", smoothing: "high" },
}
const FX_KEYS = ["particles", "atmosphere", "hitEffects", "animeFx", "battleDamage", "weatherIntensity"]
const FX_SETTER = { particles: "setParticles", atmosphere: "setAtmosphere", hitEffects: "setHitEffects", animeFx: "setAnimeFx", battleDamage: "setBattleDamage", weatherIntensity: "setWeatherIntensity" }
const FX_CHOICES = {
  particles: ["low", "full"], atmosphere: [false, true], hitEffects: ["off", "low", "full"], animeFx: ["off", "low", "full"],
  battleDamage: ["off", "marks", "full"], weatherIntensity: ["low", "full"], smoothing: ["low", "medium", "high"],
}
const FX_LABEL = { particles: "Particles", atmosphere: "Atmosphere (fog / grade)", hitEffects: "Hit effects", animeFx: "Anime FX", battleDamage: "Battle marks", weatherIntensity: "Weather intensity", smoothing: "Image smoothing quality" }

// Pixel budgets for the backing store (real pixels drawn per frame).
const PX_4K = 3840 * 2160
const BUDGET = { low: PX_4K, medium: PX_4K, high: PX_4K, ultra: PX_4K * 1.05, max: PX_4K * 2, custom: PX_4K * 2 }
const MAX_DIM = 8192

// ── tiny utils ──
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
const dprNow = () => clamp(Number(window.devicePixelRatio) || 1, 0.5, 4)
function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch (_) { return null } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (_) {} }
function lsDel(k) { try { localStorage.removeItem(k) } catch (_) {} }
function pct(arr, p) { if (!arr.length) return 0; const s = Array.from(arr).sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const r2 = v => Math.round(v * 100) / 100

// The scale each tier asks for (before the pixel budget clamps it).
export function tierScale(tier, dpr = dprNow()) {
  switch (tier) {
    case "low": case "medium": return 1
    case "high": return clamp(Math.min(dpr, 1.5), 1, 1.5)
    case "ultra": return clamp(dpr, 1, 3)
    case "max": return clamp(dpr * (dpr < 1.5 ? 1.5 : 1.25), 1.25, 3)   // native + supersampling
    default: return 1
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────────────────────
const S = {
  canvas: null, ctx: null, juice: null, getState: () => "",
  cfg: { mode: "off", custom: null, governor: true, hud: false, bench: null, node: null },
  scan: null,           // browser scan (fresh each load)
  benchRunning: false, benchProgress: 0,
  // live metrics
  lastPass: 0, costs: new Float32Array(180), ints: new Float32Array(180), ringI: 0, ringN: 0,
  win: { start: 0, passes: 0, costs: [], ints: [] },
  fps: 0, p90: 0, avgCost: 0,
  // governor
  gov: { drop: 0, badSecs: 0, goodSecs: 0, lastChange: 0, lastUp: -1e9, backoff: 20000, log: [] },
  govReadyAt: 0,        // boot grace: asset loading at startup isn't the machine being slow
  capBattery: false, pressure: "nominal", pressureSince: 0, pressureEff: "nominal", hidden: false, benchPromise: null,
  applied: null,        // the settings object last applied
  slowMs: 0,            // TEST HOOK: artificial per-pass cost (harness only)
  pendingCapture: null, toast: null, toastT: 0,
  ui: {},
}

function saveCfg() { lsSet(LS_KEY, S.cfg) }

// ─────────────────────────────────────────────────────────────────────────────────────────────
// RENDER-RESOLUTION HOOKS (installed lazily, only once a scale ≠ 1 is ever requested)
// ─────────────────────────────────────────────────────────────────────────────────────────────
const H = { installed: false, req: 1, budget: PX_4K, lw: 0, lh: 0, bw: 0, bh: 0, sx: 1, sy: 1, scaled: false, smoothing: "low",
  wd: null, hd: null, pSet: null, pGet: null, pDraw: null }

function effScale(lw, lh) {
  let s = clamp(H.req, 0.5, 4)
  const area = Math.max(1, lw * lh)
  if (area * s * s > H.budget) s = Math.sqrt(H.budget / area)
  if (lw * s > MAX_DIM) s = MAX_DIM / lw
  if (lh * s > MAX_DIM) s = MAX_DIM / lh
  return Math.max(Math.min(H.req, 1), s)
}
function applyBase() {
  const c = S.ctx
  H.pSet.call(c, H.sx, 0, 0, H.sy, 0, 0)
  try { c.imageSmoothingQuality = H.smoothing } catch (_) {}
}
function resizeBacking(resetBoth) {
  const s = effScale(H.lw, H.lh)
  const bw = Math.max(1, Math.round(H.lw * s)), bh = Math.max(1, Math.round(H.lh * s))
  if (resetBoth === "w" || H.wd.get.call(S.canvas) !== bw) H.wd.set.call(S.canvas, bw)
  if (resetBoth === "h" || H.hd.get.call(S.canvas) !== bh) H.hd.set.call(S.canvas, bh)
  H.bw = bw; H.bh = bh
  H.sx = H.lw ? bw / H.lw : 1; H.sy = H.lh ? bh / H.lh : 1
  H.scaled = Math.abs(H.sx - 1) > 1e-6 || Math.abs(H.sy - 1) > 1e-6
  applyBase()
  // Supersampling (more real pixels than the screen has): let the browser filter the downscale,
  // otherwise the page's `image-rendering: pixelated` would throw away the extra detail.
  try { S.canvas.style.imageRendering = (H.sx > dprNow() + 0.01) ? "auto" : "" } catch (_) {}
}

function installHooks() {
  if (H.installed) return true
  const canvas = S.canvas, ctx = S.ctx
  const CP = HTMLCanvasElement.prototype, XP = CanvasRenderingContext2D.prototype
  const wd = Object.getOwnPropertyDescriptor(CP, "width"), hd = Object.getOwnPropertyDescriptor(CP, "height")
  if (!wd || !hd || !wd.set || !XP.setTransform || !XP.getTransform) return false
  H.wd = wd; H.hd = hd; H.pSet = XP.setTransform; H.pGet = XP.getTransform; H.pDraw = XP.drawImage
  H.lw = wd.get.call(canvas); H.lh = hd.get.call(canvas); H.bw = H.lw; H.bh = H.lh
  const toDim = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0 }
  // canvas.width / .height keep reporting (and accepting) LOGICAL pixels — the game never sees the change.
  Object.defineProperty(canvas, "width", { configurable: true, enumerable: true, get() { return H.lw }, set(v) { H.lw = toDim(v); resizeBacking("w") } })
  Object.defineProperty(canvas, "height", { configurable: true, enumerable: true, get() { return H.lh }, set(v) { H.lh = toDim(v); resizeBacking("h") } })
  // Transforms are composed with the base scale so `setTransform(1,0,0,1,0,0)` still means "logical identity".
  ctx.setTransform = function (a, b, c, d, e, f) {
    if (arguments.length === 1 && a && typeof a === "object") {
      const m = a; a = m.a ?? m.m11 ?? 1; b = m.b ?? m.m12 ?? 0; c = m.c ?? m.m21 ?? 0; d = m.d ?? m.m22 ?? 1; e = m.e ?? m.m41 ?? 0; f = m.f ?? m.m42 ?? 0
    } else if (arguments.length === 0) { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0 }
    return H.pSet.call(this, a * H.sx, b * H.sy, c * H.sx, d * H.sy, e * H.sx, f * H.sy)
  }
  ctx.resetTransform = function () { return H.pSet.call(this, H.sx, 0, 0, H.sy, 0, 0) }
  ctx.getTransform = function () {
    const m = H.pGet.call(this)
    try { return new DOMMatrix([m.a / H.sx, m.b / H.sy, m.c / H.sx, m.d / H.sy, m.e / H.sx, m.f / H.sy]) } catch (_) { return m }
  }
  // Copying the MAIN canvas somewhere (many ult FX snapshot the screen): map logical source coords to
  // backing pixels so the copy is identical to before, just sharper.
  const mapDraw = (od) => function (img, a, b, c, d, e, f, g, h) {
    if (img !== canvas || !H.scaled) return od.apply(this, arguments)
    const n = arguments.length
    if (n === 3) return od.call(this, img, 0, 0, H.bw, H.bh, a, b, H.lw, H.lh)
    if (n === 5) return od.call(this, img, 0, 0, H.bw, H.bh, a, b, c, d)
    return od.call(this, img, a * H.sx, b * H.sy, c * H.sx, d * H.sy, e, f, g, h)
  }
  XP.drawImage = mapDraw(XP.drawImage)
  try { if (typeof OffscreenCanvasRenderingContext2D !== "undefined") { const OP = OffscreenCanvasRenderingContext2D.prototype; OP.drawImage = mapDraw(OP.drawImage) } } catch (_) {}
  if (Object.prototype.hasOwnProperty.call(ctx, "drawImage")) ctx.drawImage = mapDraw(ctx.drawImage)   // the F8 overlay's counting wrapper
  H.installed = true
  return true
}

// Change the render scale between frames, keeping the frame on screen (no blank flash).
function setRenderScale(req, budget) {
  budget = budget || H.budget
  if (!H.installed) { if (Math.abs(req - 1) < 1e-6) return; if (!installHooks()) return }
  const prevBw = H.bw, prevBh = H.bh
  H.req = req; H.budget = budget
  const s = effScale(H.lw, H.lh)
  const bw = Math.max(1, Math.round(H.lw * s)), bh = Math.max(1, Math.round(H.lh * s))
  if (bw === prevBw && bh === prevBh) return
  let tmp = null
  try {
    tmp = document.createElement("canvas"); tmp.width = prevBw; tmp.height = prevBh
    H.pDraw.call(tmp.getContext("2d"), S.canvas, 0, 0)
  } catch (_) { tmp = null }
  resizeBacking("w")
  if (tmp) { try { H.pDraw.call(S.ctx, tmp, 0, 0, prevBw, prevBh, 0, 0, H.lw, H.lh) } catch (_) {} }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// SCAN (browser side)
// ─────────────────────────────────────────────────────────────────────────────────────────────
function gpuInfo() {
  let renderer = "", vendor = "", webgl2 = false, maxTex = 0
  try {
    const c = document.createElement("canvas")
    let gl = c.getContext("webgl2"); webgl2 = !!gl
    if (!gl) gl = c.getContext("webgl") || c.getContext("experimental-webgl")
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info")
      renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "")
      vendor = String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) || "")
      maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) | 0
      try { gl.getExtension("WEBGL_lose_context")?.loseContext() } catch (_) {}
    }
  } catch (_) {}
  return { renderer, vendor, webgl2, maxTex }
}
export function classifyGpu(name) {
  const n = String(name || "").toLowerCase()
  if (!n) return "unknown"
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(n)) return "software"
  if (/rtx|gtx|quadro|radeon rx|radeon pro|rx \d{3,4}|arc a\d|arc b\d|titan|geforce|apple m\d (pro|max|ultra)|tesla|instinct/.test(n)) return "discrete"
  if (/apple m\d|apple gpu|apple/.test(n)) return "apple"
  if (/intel|uhd|iris|hd graphics|mali|adreno|powervr|vega \d|radeon\(tm\) graphics|radeon graphics/.test(n)) return "integrated"
  return "unknown"
}
function scanBrowser() {
  const nav = navigator || {}
  const g = gpuInfo()
  const dpr = dprNow()
  const sw = (screen && screen.width) || innerWidth, sh = (screen && screen.height) || innerHeight
  let heapMB = 0; try { heapMB = Math.round((performance.memory?.jsHeapSizeLimit || 0) / 1048576) } catch (_) {}
  let ua = ""; try { ua = nav.userAgent || "" } catch (_) {}
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "?"
  return {
    threads: nav.hardwareConcurrency || 0, deviceMemoryGB: nav.deviceMemory || 0, heapMB,
    gpu: g.renderer, gpuVendor: g.vendor, gpuClass: classifyGpu(g.renderer), webgl2: g.webgl2, maxTex: g.maxTex,
    screenW: sw, screenH: sh, dpr, nativeW: Math.round(sw * dpr), nativeH: Math.round(sh * dpr),
    refreshHz: S.scan?.refreshHz || 0, browser, os, electron: /Electron\//.test(ua),
  }
}
function nextFrame() { return new Promise(r => requestAnimationFrame(r)) }
const COMMON_HZ = [30, 48, 50, 60, 72, 75, 85, 90, 100, 120, 144, 160, 165, 170, 175, 180, 200, 240, 280, 300, 360, 480, 500]
async function measureRefresh(frames = 45) {
  const ts = []
  const t0 = nowMs()
  for (let i = 0; i < frames && nowMs() - t0 < 1500; i++) { ts.push(await nextFrame()); if (document.hidden) return 0 }
  const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1])
  const med = pct(d, 0.5); if (!med) return 0
  const hz = 1000 / med
  let best = Math.round(hz), err = 1e9
  for (const c of COMMON_HZ) { const e = Math.abs(c - hz); if (e < err) { err = e; best = c } }
  if (hz < 45) return 0   // a busy/slow page can't measure the display reliably → "unknown" (governor then assumes 60)
  return err / best < 0.06 ? best : Math.round(hz)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// BENCHMARK (~2–3 s): renders a heavy fight-like scene at NATIVE resolution off screen + a JS CPU probe.
// ─────────────────────────────────────────────────────────────────────────────────────────────
function makeSprite() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 160
  const g = c.getContext("2d")
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "#ffd24a"); gr.addColorStop(1, "#c2410c")
  g.fillStyle = gr; g.beginPath(); g.ellipse(64, 95, 38, 60, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = "#1e293b"; g.beginPath(); g.arc(64, 34, 26, 0, Math.PI * 2); g.fill()
  g.fillStyle = "#e2e8f0"; g.fillRect(52, 28, 8, 5); g.fillRect(70, 28, 8, 5)
  return c
}
function cpuProbe() {
  // Fixed JS workload shaped like the sim/render bookkeeping (math, typed arrays, small objects, sorting).
  const t0 = nowMs()
  const a = new Float64Array(4096); let x = 0.5
  for (let k = 0; k < 160; k++) for (let i = 0; i < 4096; i++) { a[i] = Math.sin(a[i] + i * 0.001 + x) * 0.5; x = (x + a[i] * 0.37) % 7 }
  const objs = []; for (let i = 0; i < 30000; i++) objs.push({ x: (i * 7919) % 1000, y: i & 255, k: "e" + (i & 63) })
  objs.sort((p, q) => p.x - q.x || p.y - q.y)
  let h = 0; for (const o of objs) h = (h * 31 + o.x + o.k.length) | 0
  return { ms: nowMs() - t0, h: h + x }
}
export function runBenchmark(opts = {}) {
  if (S.benchRunning && S.benchPromise) return S.benchPromise   // already running → share the result
  S.benchPromise = _runBenchmark(opts)
  return S.benchPromise
}
async function _runBenchmark(opts) {
  S.benchRunning = true; S.benchProgress = 0; refreshPanel()
  const seconds = clamp(opts.seconds || 2.2, 0.5, 5)
  try {
    if (!S.scan) S.scan = scanBrowser()
    S.scan.refreshHz = await measureRefresh(40)
    const dpr = dprNow()
    const W = clamp(Math.round(innerWidth * dpr), 640, 3840), H2 = clamp(Math.round(innerHeight * dpr), 360, 2160)
    let cv
    if (typeof OffscreenCanvas !== "undefined") cv = new OffscreenCanvas(W, H2)
    else { cv = document.createElement("canvas"); cv.width = W; cv.height = H2 }
    const g = cv.getContext("2d")
    const spr = makeSprite(), k = W / 1920
    const parts = []; for (let i = 0; i < 700; i++) parts.push({ x: (i * 977) % W, y: (i * 613) % H2, r: (2 + (i % 7)) * k, h: (i * 37) % 360 })
    const times = []
    const t0 = nowMs(); let f = 0
    while (nowMs() - t0 < seconds * 1000 && f < 160) {
      await nextFrame()
      if (document.hidden) { S.benchRunning = false; refreshPanel(); return null }
      const a = nowMs()
      const bg = g.createLinearGradient(0, 0, 0, H2); bg.addColorStop(0, "#0b1a33"); bg.addColorStop(1, "#3b1d4a")
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H2)
      for (let L = 0; L < 3; L++) { g.globalAlpha = 0.35 + L * 0.2; g.fillStyle = ["#1d4ed8", "#7c3aed", "#0f766e"][L]
        for (let i = 0; i < 40; i++) { const x = ((i * 211 + f * (L + 1) * 3) % (W + 300)) - 150; g.fillRect(x, H2 * (0.3 + L * 0.18), 120 * k, H2 * 0.5) } }
      g.globalAlpha = 1; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"
      for (let i = 0; i < 28; i++) { g.save(); g.translate(((i * 331 + f * 4) % W), H2 * 0.62); g.rotate(Math.sin(f * 0.05 + i) * 0.3); g.drawImage(spr, -96 * k, -120 * k, 192 * k, 240 * k); g.restore() }
      g.globalCompositeOperation = "lighter"
      for (const p of parts) { g.fillStyle = `hsla(${(p.h + f * 3) % 360},90%,60%,0.55)`; g.beginPath(); g.arc((p.x + f * 5) % W, (p.y + f * 2) % H2, p.r, 0, 6.283); g.fill() }
      g.globalCompositeOperation = "source-over"
      g.shadowColor = "#38bdf8"; g.shadowBlur = 24 * k
      for (let i = 0; i < 10; i++) { g.fillStyle = "#e0f2fe"; g.fillRect((i * 173 + f * 6) % W, H2 * 0.2 + i * 12 * k, 140 * k, 14 * k) }
      g.shadowBlur = 0
      const vg = g.createRadialGradient(W / 2, H2 / 2, H2 * 0.2, W / 2, H2 / 2, W * 0.7); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)")
      g.fillStyle = vg; g.fillRect(0, 0, W, H2)
      g.fillStyle = "#fff"; g.font = `700 ${Math.round(28 * k)}px Arial`
      for (let i = 0; i < 12; i++) g.fillText("MULTIVERSE SMASH 999 HIT COMBO", 40 * k, 60 * k + i * 36 * k)
      try { g.getImageData(0, 0, 1, 1) } catch (_) {}   // sync point: makes GPU work count
      times.push(nowMs() - a); f++
      S.benchProgress = Math.min(0.9, (nowMs() - t0) / (seconds * 1000)); if (f % 10 === 0) refreshPanel()
    }
    const cpu = [cpuProbe().ms, cpuProbe().ms, cpuProbe().ms]
    // Contention-robust: split the run into 4 chunks and keep the FASTEST chunk's median (a background task or
    // an asset load landing mid-run only spoils one chunk). Same idea for the CPU probe (best of 3).
    const tt = times.slice(3), q = Math.max(1, Math.floor(tt.length / 4)), meds = []
    for (let i = 0; i + q <= tt.length; i += q) meds.push(pct(tt.slice(i, i + q), 0.5))
    const gpuMs = r2(meds.length ? Math.min(...meds) : pct(tt, 0.5)), gpuP90 = r2(pct(tt, 0.9)), cpuMs = r2(Math.min(...cpu))
    const rec = recommendTier({ gpuMs, cpuMs, scan: S.scan, node: S.cfg.node })
    const bench = { when: new Date().toISOString(), fp: fingerprint(), w: W, h: H2, frames: f, gpuMs, gpuP90, cpuMs, tier: rec.tier, why: rec.why }
    S.cfg.bench = bench; S.gov.drop = 0; S.gov.badSecs = 0; S.gov.lastChange = nowMs(); saveCfg()   // fresh tier → start the ladder from the top
    S.benchRunning = false; S.benchProgress = 1
    reapply(); refreshPanel()
    return bench
  } catch (e) {
    S.benchRunning = false; refreshPanel()
    console.warn("[hwperf] benchmark failed", e)
    return null
  }
}
// Wait until the game has finished booting / loading (smooth passes for ~1 s) so the benchmark measures the
// machine, not the asset loader. Gives up waiting after maxMs and runs anyway.
function waitIdle(maxMs) {
  const t0 = nowMs()
  return new Promise(res => {
    const tick = () => {
      if (nowMs() - t0 > maxMs) return res(false)
      if (!document.hidden && S.ringN >= 60) {
        const iv = [], cs = []
        for (let i = 1; i <= 60; i++) { const k = (S.ringI - i + S.ints.length) % S.ints.length; iv.push(S.ints[k]); cs.push(S.costs[k]) }
        if (pct(iv, 0.9) < 25 && pct(cs, 0.9) < 12 && nowMs() - t0 > 1500) return res(true)
      }
      setTimeout(tick, 250)
    }
    tick()
  })
}
function fingerprint() {
  const s = S.scan || scanBrowser()
  return [s.gpu, s.threads, s.nativeW, s.nativeH, s.browser].join("|")
}
// Calibration (2026-11-25, Apple M5 MacBook, Chrome, 2940×1840 native, machine under heavy load): the scene costs
// ≈15 ms at native res, and the REAL game measured 4.1 ms/pass at 1× vs 17.4 ms at 2× (native). So
//   predicted pass cost at scale s  ≈  logic + sceneMs × (s / dpr)²       (logic ≈ 4 ms × cpuMs/40)
// and a tier is allowed when that prediction stays ≤ 12 ms — leaving ~4.7 ms headroom inside the 16.7 ms frame
// for the heaviest ultimate cinematics. The governor still corrects any misprediction live.
export function recommendTier({ gpuMs, cpuMs, scan, node }) {
  const why = []
  const dpr = scan?.dpr || dprNow()
  const logic = clamp(4 * (cpuMs || 40) / 40, 2, 14)
  const predict = t => logic + gpuMs * Math.pow(tierScale(t, dpr) / dpr, 2)
  let t = 0
  for (let i = TIERS.length - 1; i >= 1; i--) if (predict(TIERS[i]) <= 12) { t = i; break }
  if (t === 0 && predict("medium") <= 14) t = 1
  why.push(`scene ${gpuMs} ms @ native, CPU probe ${cpuMs} ms → predicted ${TIERS.map(x => `${x} ${predict(x).toFixed(1)}`).join(" / ")} ms`)
  if (cpuMs > 150) { t = 0; why.push("very slow CPU → Low") } else if (cpuMs > 90) { t = Math.min(t, 1); why.push("slow CPU → cap Medium") }
  const threads = Math.max(scan?.threads || 0, node?.cpu?.threads || 0)
  if (threads && threads <= 2) { t = Math.min(t, 1); why.push("≤2 CPU threads → cap Medium") }
  const ramGB = node?.ramGB || scan?.deviceMemoryGB || 0
  if (ramGB && ramGB < 4) { t = Math.min(t, 1); why.push("<4 GB RAM → cap Medium") }
  if (scan?.gpuClass === "software") { t = 0; why.push("software GPU (no acceleration) → Low") }
  return { tier: TIERS[t], why }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// SETTINGS RESOLUTION + GOVERNOR
// ─────────────────────────────────────────────────────────────────────────────────────────────
function ceilingTier() {
  const m = S.cfg.mode
  if (m === "auto") return S.cfg.bench?.tier || (S.cfg.node?.hintTier) || "medium"
  if (TIERS.includes(m)) return m
  return null
}
function tierSettings(t) { return { tier: t, scale: tierScale(t), budget: BUDGET[t], ...TIER_FX[t] } }
// The quality ladder the governor walks down (index 0 = what the player chose / auto picked).
function ladder() {
  if (S.cfg.mode === "custom" && S.cfg.custom) {
    const c = S.cfg.custom, out = []
    for (let s = c.scale; s > 1.001; s = r2(s - 0.25)) out.push({ ...c, tier: "custom", scale: s })
    out.push({ ...c, tier: "custom", scale: Math.min(1, c.scale) })
    out.push({ ...tierSettings("low"), scale: Math.min(1, c.scale) })
    return out
  }
  const top = ceilingTier(); if (!top) return []
  const out = []; for (let i = TIERS.indexOf(top); i >= 0; i--) out.push(tierSettings(TIERS[i]))
  return out
}
function capIndex(L) {
  let cap = 0
  if (S.capBattery) { const i = L.findIndex(x => x.tier !== "custom" && TIERS.indexOf(x.tier) <= 1); cap = Math.max(cap, i < 0 ? L.length - 1 : i) }
  if (S.pressureEff === "serious") cap = Math.max(cap, 1)
  if (S.pressureEff === "critical") cap = Math.max(cap, 2)
  return Math.min(cap, L.length - 1)
}
export function effectiveSettings() {
  const L = ladder(); if (!L.length) return null
  // Governor OFF = the player asked for exactly this: no automatic drops (frame misses, battery, system load).
  const gd = S.cfg.governor ? S.gov.drop : 0, cap = S.cfg.governor ? capIndex(L) : 0
  return { ...L[Math.min(L.length - 1, Math.max(gd, cap))], index: Math.max(gd, cap), ladderLen: L.length }
}
function backupJuice() {
  if (lsGet(LS_BACKUP) || !S.juice) return
  const b = {}; for (const k of FX_KEYS) b[k] = S.juice[k]
  lsSet(LS_BACKUP, b)
}
function restoreJuice() {
  const b = lsGet(LS_BACKUP); if (!b || !S.juice) return
  for (const k of FX_KEYS) if (b[k] !== undefined && S.juice[k] !== b[k]) { try { S.juice[FX_SETTER[k]](b[k]) } catch (_) {} }
  lsDel(LS_BACKUP)
}
function applySettings(st) {
  if (!st) return
  if (S.juice) for (const k of FX_KEYS) if (st[k] !== undefined && S.juice[k] !== st[k]) { try { S.juice[FX_SETTER[k]](st[k]) } catch (_) {} }
  H.smoothing = st.smoothing || "low"
  setRenderScale(st.scale || 1, st.budget || BUDGET.custom)
  if (H.installed) { try { S.ctx.imageSmoothingQuality = H.smoothing } catch (_) {} }
  S.applied = st
}
export function reapply() {
  if (!S.canvas) return
  if (S.cfg.mode === "off") {
    if (S.applied) { restoreJuice(); H.smoothing = "low"; setRenderScale(1); S.applied = null }
    S.gov.drop = 0
    return
  }
  backupJuice()
  const L = ladder(); S.gov.drop = clamp(S.gov.drop, 0, Math.max(0, L.length - 1))
  applySettings(effectiveSettings())
}
function govLog(msg) {
  const t = new Date(); const ts = t.toTimeString().slice(0, 8)
  S.gov.log.unshift(`${ts}  ${msg}`); if (S.gov.log.length > 8) S.gov.log.length = 8
  try { console.info("[hwperf] " + msg) } catch (_) {}
}
function resetWindow(t) { S.win.start = t; S.win.passes = 0; S.win.costs.length = 0; S.win.ints.length = 0 }
function governorTick(t) {
  const w = S.win, dt = t - w.start
  if (dt < 1000) return
  // System load (Compute Pressure API: CPU utilisation + thermal state, where the browser exposes it).
  // Only a state that LASTS 5 s counts: serious → one step down, critical → two.
  if (S.pressure !== S.pressureEff && t - S.pressureSince > 5000) {
    const was = S.pressureEff; S.pressureEff = S.pressure
    const heavy = v => v === "serious" || v === "critical"
    if (S.cfg.mode !== "off" && (heavy(was) || heavy(S.pressureEff))) { govLog(`system load ${S.pressureEff}${heavy(S.pressureEff) ? " → stepping down to stay cool" : " → cap lifted"}`); applySettings(effectiveSettings()); refreshPanel() }
  }
  const fps = w.passes * 1000 / dt
  const p90 = pct(w.costs, 0.9)
  S.fps = fps; S.p90 = p90
  // A one-off hitch (asset loading, a GC, a window drag) while frames are otherwise smooth is ignored;
  // a genuinely slow machine (slow median) is not.
  const stall = pct(w.ints, 1) > 250 && pct(w.ints, 0.5) < 40
  resetWindow(t)
  if (!S.cfg.governor || S.cfg.mode === "off" || S.benchRunning || S.pendingCapture || stall || t < S.govReadyAt) { S.gov.badSecs = 0; S.gov.goodSecs = 0; return }
  const hz = S.scan?.refreshHz || 0
  const target = hz >= 45 ? Math.min(60, hz) : 60
  const bad = fps < target * 0.92 || p90 > 15.5
  const good = fps >= target * 0.97 && p90 < 8.5
  const g = S.gov, L = ladder()
  g.badSecs = bad ? g.badSecs + 1 : Math.max(0, g.badSecs - 1)
  g.goodSecs = good ? g.goodSecs + 1 : 0
  if (g.badSecs >= 3 && t - g.lastChange > 3500 && g.drop < L.length - 1) {
    if (t - g.lastUp < 30000) g.backoff = Math.min(g.backoff * 2, 160000)   // we just climbed and it hurt → wait longer next time
    g.drop++; g.lastChange = t; g.badSecs = 0; g.goodSecs = 0
    const st = L[Math.max(g.drop, capIndex(L))]
    govLog(`frames missed (${fps.toFixed(0)} fps, ${p90.toFixed(1)} ms) → stepped DOWN to ${TIER_LABEL[st.tier] || st.tier} ${st.scale}×`)
    applySettings(effectiveSettings()); refreshPanel()
  } else if (g.drop > 0 && g.goodSecs * 1000 >= g.backoff && t - g.lastChange > 10000) {
    g.drop--; g.lastChange = t; g.lastUp = t; g.goodSecs = 0
    const st = L[Math.max(g.drop, capIndex(L))]
    govLog(`steady for ${(g.backoff / 1000) | 0}s → stepped UP to ${TIER_LABEL[st.tier] || st.tier} ${st.scale}×`)
    applySettings(effectiveSettings()); refreshPanel()
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// PER-PASS HOOK (called by game.js at the end of every 60 Hz update+render pass)
// ─────────────────────────────────────────────────────────────────────────────────────────────
function afterPass(now, state) {
  const t = nowMs()
  if (S.slowMs > 0) { const until = t + S.slowMs; while (nowMs() < until) { /* TEST HOOK ONLY (harness) */ } }
  const cost = nowMs() - (typeof now === "number" ? now : t)
  const interval = S.lastPass ? t - S.lastPass : 16.7
  S.lastPass = t
  S.costs[S.ringI] = cost; S.ints[S.ringI] = interval; S.ringI = (S.ringI + 1) % S.costs.length; if (S.ringN < S.costs.length) S.ringN++
  if ((S.ringI & 15) === 0) { let sum = 0; for (let i = 0; i < S.ringN; i++) sum += S.costs[i]; S.avgCost = S.ringN ? sum / S.ringN : 0 }
  if (!S.win.start) resetWindow(t)
  S.win.passes++; S.win.costs.push(cost); S.win.ints.push(interval)
  if (state !== S.lastState) S.govReadyAt = Math.max(S.govReadyAt, t + 4000)   // screen change = asset loading; don't judge it
  governorTick(t)
  if (S.pendingCapture) capturePass()
  if (S.cfg.mode !== "off" && H.installed) { try { S.ctx.imageSmoothingQuality = H.smoothing } catch (_) {} }
  if (S.cfg.hud) drawHud()
  // Settings / main-menu shortcut button.
  const showBtn = state === "settings" || state === "mainMenu"
  if (S.ui.btn && S.ui.btnShown !== showBtn) { S.ui.btn.style.display = showBtn ? "block" : "none"; S.ui.btnShown = showBtn }
  if (S.ui.panelOpen && (t - (S.ui.lastLive || 0)) > 500) { S.ui.lastLive = t; refreshLive() }
  S.lastState = state
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// SCREENSHOTS / PHOTO MODE
// ─────────────────────────────────────────────────────────────────────────────────────────────
export function screenshot(want4k = false) {
  if (S.pendingCapture) return
  if (want4k) {
    if (!installHooks()) want4k = false
  }
  if (want4k) {
    const prev = { req: H.req, budget: H.budget }
    const s = clamp(3840 / Math.max(1, H.lw), 1, 4)
    S.pendingCapture = { phase: 1, prev }   // resized between passes → the very next pass renders at photo resolution
    setRenderScale(s, Math.max(PX_4K * 1.2, H.lw * H.lh * s * s + 1))
  } else S.pendingCapture = { phase: 1, prev: null }
}
function capturePass() {
  const pc = S.pendingCapture
  if (pc.phase === 0) { pc.phase = 1; return }          // the next pass renders at the photo resolution
  S.pendingCapture = null
  const w = H.installed ? H.bw : S.canvas.width, h = H.installed ? H.bh : S.canvas.height
  const name = `multiverse-smash-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${w}x${h}.png`
  try {
    S.canvas.toBlob(b => {
      if (!b) return
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      toast(`Saved ${name} (${w}×${h}) to your Downloads`)
    }, "image/png")
  } catch (e) { toast("Screenshot failed: " + e.message) }
  if (pc.prev) setRenderScale(pc.prev.req, pc.prev.budget)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// UI — FPS HUD, toast, settings button, Performance panel (plain DOM, above the canvas)
// ─────────────────────────────────────────────────────────────────────────────────────────────
const CSS = `
#hwp-btn{position:fixed;top:14px;left:62px;z-index:10000;height:36px;padding:0 16px;display:none;font:700 14px "Rajdhani",Arial,sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.85);background:rgba(12,10,22,.5);border:1px solid rgba(255,255,255,.14);border-radius:18px;cursor:pointer;backdrop-filter:blur(8px)}
#hwp-btn:hover{background:rgba(40,32,70,.75);color:#fff}
#hwp-hud{position:fixed;top:72px;right:12px;z-index:10001;width:280px;height:104px;pointer-events:none;display:none}
#hwp-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10003;max-width:min(92vw,560px);padding:10px 16px;font:600 14px Arial,sans-serif;color:#ecfeff;background:rgba(8,17,31,.92);border:1px solid #38bdf8;border-radius:8px;display:none;pointer-events:none;text-align:center}
#hwp-panel{position:fixed;inset:0;z-index:10002;display:none;background:rgba(2,6,16,.72);font:14px/1.4 Arial,sans-serif;color:#dbe7f7;overflow:auto;-webkit-overflow-scrolling:touch}
#hwp-panel .box{max-width:880px;margin:24px auto;padding:20px 22px;background:#0b1528;border:1px solid rgba(74,168,224,.5);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
#hwp-panel h2{margin:0 0 4px;font:800 24px Arial,sans-serif;color:#f3f7ff;letter-spacing:.03em}
#hwp-panel h3{margin:18px 0 8px;font:700 13px Arial,sans-serif;color:#7cc4ff;letter-spacing:.12em;text-transform:uppercase}
#hwp-panel .safe{margin:10px 0 0;padding:10px 12px;background:rgba(34,197,94,.08);border:1px solid rgba(74,222,128,.35);border-radius:8px;color:#c7f9d7;font-size:13px}
#hwp-panel .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px 18px}
#hwp-panel .kv{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid rgba(148,163,184,.12)}
#hwp-panel .kv b{color:#94a3b8;font-weight:600;white-space:nowrap}#hwp-panel .kv span{text-align:right;color:#f1f5f9;word-break:break-word}
#hwp-panel .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#hwp-panel button{font:700 13px Arial,sans-serif;color:#e6edf7;background:#16233a;border:1px solid rgba(74,168,224,.45);border-radius:7px;padding:8px 12px;cursor:pointer}
#hwp-panel button:hover{background:#1f3456}
#hwp-panel button.on{background:#1d4ed8;border-color:#93c5fd;color:#fff}
#hwp-panel button.max{background:linear-gradient(90deg,#b91c1c,#ea580c,#ca8a04);border-color:#fde68a;color:#fff;font-size:15px;padding:10px 18px}
#hwp-panel select{font:13px Arial,sans-serif;background:#0f1b30;color:#e6edf7;border:1px solid rgba(74,168,224,.45);border-radius:6px;padding:5px 6px}
#hwp-panel .knobs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px 18px}
#hwp-panel .knob{display:flex;justify-content:space-between;align-items:center;gap:8px}
#hwp-panel .muted{color:#8aa0bb;font-size:12px}
#hwp-panel .live{font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#a7f3d0;background:#050c18;border-radius:8px;padding:10px 12px;white-space:pre-wrap}
#hwp-panel .bar{height:6px;background:#1e293b;border-radius:3px;overflow:hidden;margin-top:6px}#hwp-panel .bar i{display:block;height:100%;background:#38bdf8;width:0}
#hwp-panel .close{float:right}
@media (max-width:520px){#hwp-panel .box{margin:0;border-radius:0;padding:16px}#hwp-btn{left:62px;padding:0 10px;font-size:12px}}
`
function el(tag, attrs = {}, html = "") { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e }
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]) }

function buildUi() {
  const st = el("style", { id: "hwp-style" }); st.textContent = CSS; document.head.appendChild(st)
  const btn = el("button", { id: "hwp-btn", title: "Performance & hardware (Shift+F7)" }, "⚡ PERFORMANCE")
  btn.addEventListener("click", e => { e.stopPropagation(); openPanel(); btn.blur() })
  document.body.appendChild(btn); S.ui.btn = btn
  const hud = el("canvas", { id: "hwp-hud", width: 560, height: 208 }); document.body.appendChild(hud); S.ui.hud = hud
  const tst = el("div", { id: "hwp-toast" }); document.body.appendChild(tst); S.ui.toast = tst
  const panel = el("div", { id: "hwp-panel", role: "dialog", "aria-label": "Performance and hardware" })
  panel.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); e.stopPropagation() })
  panel.addEventListener("mousedown", e => e.stopPropagation())
  panel.addEventListener("click", e => { e.stopPropagation(); if (e.target === panel) closePanel() })
  panel.addEventListener("wheel", e => e.stopPropagation(), { passive: true })
  panel.addEventListener("pointerdown", e => e.stopPropagation())
  document.body.appendChild(panel); S.ui.panel = panel
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && S.ui.panelOpen) { e.preventDefault(); e.stopPropagation(); closePanel(); return }
    if (e.key !== "F7") return
    const st2 = String(S.lastState || "")
    if (/training/i.test(st2) && !e.shiftKey) return     // Training mode owns plain F7
    e.preventDefault()
    if (e.shiftKey) { S.ui.panelOpen ? closePanel() : openPanel() }
    else setHud(!S.cfg.hud)
  }, true)
}
export function setHud(on) { S.cfg.hud = !!on; saveCfg(); if (S.ui.hud) S.ui.hud.style.display = on ? "block" : "none"; refreshPanel() }
function toast(msg, ms = 3500) {
  if (!S.ui.toast) return
  S.ui.toast.textContent = msg; S.ui.toast.style.display = "block"
  clearTimeout(S.toastT); S.toastT = setTimeout(() => { if (S.ui.toast) S.ui.toast.style.display = "none" }, ms)
}
function drawHud() {
  const c = S.ui.hud; if (!c) return
  const g = c.getContext("2d"), W = c.width, Hh = c.height
  g.clearRect(0, 0, W, Hh)
  g.fillStyle = "rgba(4,10,22,0.78)"; g.fillRect(0, 0, W, Hh)
  // frame-cost graph (bars) with the 16.7 ms budget line
  const n = S.ringN, gx = 8, gy = 92, gw = W - 16, gh = Hh - gy - 8, scale = gh / 33.3
  g.strokeStyle = "rgba(250,204,21,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy + gh - 16.7 * scale); g.lineTo(gx + gw, gy + gh - 16.7 * scale); g.stroke()
  const bw = gw / S.costs.length
  for (let i = 0; i < n; i++) {
    const idx = (S.ringI - n + i + S.costs.length) % S.costs.length
    const v = S.costs[idx], iv = S.ints[idx]
    g.fillStyle = v > 15 ? "#f87171" : v > 10 ? "#fbbf24" : "#4ade80"
    const h = Math.min(gh, v * scale); g.fillRect(gx + i * bw, gy + gh - h, Math.max(1, bw - 0.5), h)
    if (iv > 34) { g.fillStyle = "#f472b6"; g.fillRect(gx + i * bw, gy, Math.max(1, bw - 0.5), 4) }   // missed vsync marker
  }
  const e = S.applied
  const fpsShown = S.fps || 0
  g.font = "700 26px Arial"; g.fillStyle = fpsShown >= 57 ? "#86efac" : fpsShown >= 45 ? "#fde68a" : "#fca5a5"
  g.fillText(`${fpsShown.toFixed(0)} FPS`, 12, 32)
  g.font = "600 19px Arial"; g.fillStyle = "#e2e8f0"
  g.fillText(`${S.avgCost.toFixed(1)} ms avg · p90 ${S.p90.toFixed(1)} ms`, 150, 30)
  const res = H.installed ? `${H.bw}×${H.bh}` : `${S.canvas.width}×${S.canvas.height}`
  const tl = S.cfg.mode === "off" ? "game default" : `${TIER_LABEL[e?.tier] || "?"} ${r2(H.installed ? H.sx : 1)}×`
  g.fillText(`${tl} · ${res}`, 12, 58)
  g.fillStyle = S.gov.drop > 0 || S.capBattery || S.pressureEff !== "nominal" ? "#fbbf24" : "#7dd3fc"
  const gv = !S.cfg.governor ? "governor OFF" : S.gov.drop > 0 ? `governor −${S.gov.drop}` : "governor ok"
  g.fillText(`${gv}${S.capBattery ? " · battery" : ""}${S.pressureEff !== "nominal" ? " · load " + S.pressureEff : ""} · ${S.scan?.refreshHz || "?"}Hz`, 12, 82)
}

function hwRows() {
  const s = S.scan || {}, n = S.cfg.node || {}, b = S.cfg.bench
  const cpu = n.cpu ? `${n.cpu.model || "?"} · ${n.cpu.cores || "?"} cores / ${n.cpu.threads || s.threads} threads${n.cpu.ghz ? ` · ${n.cpu.ghz} GHz` : ""}` : `${s.threads || "?"} threads (run PLAY_MAX for the full CPU name)`
  const gpuNode = (n.gpus || []).map(g => g.name + (g.vramGB ? ` (${g.vramGB} GB)` : "")).join(" + ")
  const ram = n.ramGB ? `${n.ramGB} GB` : s.deviceMemoryGB ? `≥ ${s.deviceMemoryGB} GB (browser estimate)` : "?"
  const disp = `${s.screenW}×${s.screenH} @ ${s.dpr}× = ${s.nativeW}×${s.nativeH} native · ${s.refreshHz ? s.refreshHz + " Hz" : "Hz: run benchmark"}`
  const nd = (n.displays || []).map(d => `${d.w}×${d.h}${d.hz ? " @" + d.hz + "Hz" : ""}`).join(", ")
  return [
    ["GPU", esc(s.gpu || "unknown") + (gpuNode && !String(s.gpu).includes(gpuNode) ? `<br><span class="muted">${esc(gpuNode)}</span>` : "") + ` <span class="muted">[${esc(s.gpuClass)}]</span>`],
    ["CPU", esc(cpu)], ["Memory", esc(ram)],
    ["Display", esc(disp) + (nd ? `<br><span class="muted">${esc(nd)}</span>` : "")],
    ["System", esc(`${n.os?.name || s.os} · ${s.browser}${s.electron ? " (desktop app)" : ""}`)],
    ["Power", esc(S.battery ? (S.battery.charging ? `plugged in (${Math.round(S.battery.level * 100)}%)` : `ON BATTERY ${Math.round(S.battery.level * 100)}% → capped at Medium`) : "mains / unknown")],
    ["Benchmark", b ? esc(`${b.gpuMs} ms scene @ ${b.w}×${b.h} · CPU ${b.cpuMs} ms → ${TIER_LABEL[b.tier]}`) : "not run yet"],
  ]
}
function knobHtml(cur) {
  const scaleOpts = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].filter(v => v <= Math.max(3, tierScale("max")))
  const opt = (k, v) => `<option value="${String(v)}" ${String(cur[k]) === String(v) ? "selected" : ""}>${v === true ? "On" : v === false ? "Off" : v}</option>`
  let h = `<div class="knob"><span>Render resolution</span><select data-k="scale">${scaleOpts.map(v => `<option value="${v}" ${Math.abs((cur.scale || 1) - v) < 0.01 ? "selected" : ""}>${v}× ${v === 1 ? "(game default)" : ""}</option>`).join("")}${scaleOpts.some(v => Math.abs((cur.scale || 1) - v) < 0.01) ? "" : `<option selected value="${cur.scale}">${r2(cur.scale)}×</option>`}</select></div>`
  for (const k of [...FX_KEYS, "smoothing"]) h += `<div class="knob"><span>${FX_LABEL[k]}</span><select data-k="${k}">${FX_CHOICES[k].map(v => opt(k, v)).join("")}</select></div>`
  return h
}
function currentKnobs() {
  const e = S.applied || {}
  const j = S.juice || {}
  const out = { scale: e.scale || 1, smoothing: e.smoothing || "low" }
  for (const k of FX_KEYS) out[k] = j[k]
  return out
}
function refreshPanel() {
  const p = S.ui.panel; if (!p || !S.ui.panelOpen) return
  const m = S.cfg.mode, e = S.applied
  const modeBtn = (id, label) => `<button data-mode="${id}" class="${m === id ? "on" : ""}">${label}</button>`
  const rec = S.cfg.bench ? TIER_LABEL[S.cfg.bench.tier] : (S.cfg.node?.hintTier ? TIER_LABEL[S.cfg.node.hintTier] + " (scan hint)" : "run benchmark")
  p.innerHTML = `<div class="box">
    <button class="close" data-act="close">Close ✕</button>
    <h2>⚡ PERFORMANCE &amp; HARDWARE</h2>
    <div class="muted">Shift+F7 opens this anywhere · F7 toggles the FPS graph · F = fullscreen</div>
    <div class="safe"><b>Safe by design.</b> A game can't damage a computer — CPUs and GPUs have their own built-in temperature and power protection.
      On top of that this game never runs faster than your screen's refresh, sleeps when the window is hidden, never busy-waits, and the <b>governor</b>
      steps quality <b>down</b> the moment frames are missed (or the system reports heavy load, or a laptop is on battery) and only climbs back slowly.</div>
    <h3>Detected hardware</h3>
    <div class="grid">${hwRows().map(([k, v]) => `<div class="kv"><b>${k}</b><span>${v}</span></div>`).join("")}</div>
    <div class="row" style="margin-top:10px"><button data-act="bench">${S.benchRunning ? "Benchmarking…" : "↻ Re-run benchmark (≈3 s)"}</button>
      <span class="muted">Recommended: <b style="color:#fde68a">${esc(rec)}</b>${S.cfg.bench?.why ? " — " + esc(S.cfg.bench.why.join("; ")) : ""}</span></div>
    ${S.benchRunning ? `<div class="bar"><i style="width:${Math.round(S.benchProgress * 100)}%"></i></div>` : ""}
    <h3>Quality</h3>
    <div class="row">${modeBtn("off", "Off")}${modeBtn("auto", "Auto")}${TIERS.map(t => modeBtn(t, TIER_LABEL[t])).join("")}${m === "custom" ? modeBtn("custom", "Custom") : ""}
      <button class="max" data-act="max">🔥 MAX EVERYTHING</button></div>
    <div class="muted" style="margin-top:6px">${m === "off" ? "Off = the game's normal look; nothing here is changing it." : `Running: <b>${esc(TIER_LABEL[e?.tier] || "?")}</b> at ${r2(H.installed ? H.sx : 1)}× (${H.installed ? H.bw + "×" + H.bh : S.canvas.width + "×" + S.canvas.height} real pixels)${S.gov.drop > 0 ? ` — governor stepped down ${S.gov.drop}` : ""}`}</div>
    <h3>Fine-tune (switches to Custom)</h3>
    <div class="knobs">${knobHtml(currentKnobs())}</div>
    <div class="row" style="margin-top:10px">
      <button data-act="gov" class="${S.cfg.governor ? "on" : ""}">Safety governor: ${S.cfg.governor ? "ON" : "OFF"}</button>
      <button data-act="hud" class="${S.cfg.hud ? "on" : ""}">FPS graph: ${S.cfg.hud ? "ON" : "OFF"}</button>
      <button data-act="shot">📷 Screenshot</button><button data-act="shot4k">📸 4K photo</button>
      <button data-act="fs">⛶ Fullscreen</button></div>
    ${!S.cfg.governor ? `<div class="muted" style="color:#fbbf24;margin-top:6px">Governor off: quality will not drop automatically if frames are missed. Still safe — just possibly choppy.</div>` : ""}
    <h3>Live</h3><div class="live" id="hwp-live"></div>
    <div class="muted" style="margin-top:10px"><b>Refresh rate:</b> the fight runs at a locked 60 frames per second on every screen — the engine advances logic and animation together once per frame,
      and online play and replays depend on that, so 120/144/240 Hz monitors show every frame the moment it's ready (lowest input lag) rather than inventing in-between frames.
      What a stronger PC gets instead: native-resolution (up to 4K+) rendering, supersampling, all effects on, and rock-solid 60.</div>
  </div>`
  refreshLive()
}
function refreshLive() {
  const lv = S.ui.panel && S.ui.panel.querySelector("#hwp-live"); if (!lv) return
  const e = S.applied
  lv.textContent = [
    `fps ${S.fps.toFixed(1)}   pass cost avg ${S.avgCost.toFixed(2)} ms   p90 ${S.p90.toFixed(2)} ms   (budget 16.7 ms)`,
    `render ${H.installed ? H.bw + "×" + H.bh : S.canvas.width + "×" + S.canvas.height} real px for ${S.canvas.width}×${S.canvas.height} logical   scale ${r2(H.installed ? H.sx : 1)}×`,
    `mode ${S.cfg.mode}   level ${e ? (TIER_LABEL[e.tier] || e.tier) : "-"}   governor ${S.cfg.governor ? "on" : "off"} (drop ${S.gov.drop})   battery cap ${S.capBattery ? "YES" : "no"}   system load ${S.pressureEff}`,
    ...(S.gov.log.length ? ["", ...S.gov.log] : ["", "governor: no adjustments yet"]),
  ].join("\n")
}
export function openPanel() {
  if (!S.ui.panel) return
  if (!S.scan) { S.scan = scanBrowser(); measureRefresh(45).then(hz => { if (hz && S.scan) { S.scan.refreshHz = hz; refreshPanel() } }).catch(() => {}) }
  S.ui.panelOpen = true; S.ui.panel.style.display = "block"; refreshPanel()
  const p = S.ui.panel
  p.onclick = ev => {
    const b = ev.target.closest("button"); if (!b) { if (ev.target === p) closePanel(); return }
    if (b.dataset.mode) { setMode(b.dataset.mode); return }
    switch (b.dataset.act) {
      case "close": closePanel(); break
      case "bench": runBenchmark(); break
      case "max": maxEverything(); break
      case "gov": S.cfg.governor = !S.cfg.governor; S.gov.drop = 0; saveCfg(); reapply(); refreshPanel(); break
      case "hud": setHud(!S.cfg.hud); break
      case "shot": closePanel(); setTimeout(() => screenshot(false), 50); break
      case "shot4k": closePanel(); setTimeout(() => screenshot(true), 50); break
      case "fs": try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() } catch (_) {} break
    }
  }
  p.onchange = ev => {
    const k = ev.target.dataset?.k; if (!k) return
    const cur = currentKnobs()
    let v = ev.target.value
    if (k === "scale") v = parseFloat(v); else if (k === "atmosphere") v = v === "true"
    cur[k] = v
    S.cfg.custom = { ...cur, budget: BUDGET.custom }
    S.cfg.mode = "custom"; S.gov.drop = 0; saveCfg(); reapply(); refreshPanel()
  }
}
export function closePanel() { S.ui.panelOpen = false; if (S.ui.panel) S.ui.panel.style.display = "none" }
export function setMode(mode) {
  if (!(mode === "off" || mode === "auto" || mode === "custom" || TIERS.includes(mode))) return
  if (mode === "custom" && !S.cfg.custom) return
  S.cfg.mode = mode; S.gov.drop = 0; S.gov.backoff = 20000; S.gov.badSecs = 0; S.gov.goodSecs = 0; saveCfg()
  reapply(); refreshPanel()
  if (mode === "auto" && !S.cfg.bench) runBenchmark()
}
export function maxEverything() { S.cfg.governor = true; setMode("max"); toast("MAX: native+supersampled resolution, every effect on. The governor still steps down if frames are missed.", 4500) }

// ─────────────────────────────────────────────────────────────────────────────────────────────
// SYSTEM SIGNALS — tab visibility, battery, compute pressure (thermal/CPU load where the browser exposes it)
// ─────────────────────────────────────────────────────────────────────────────────────────────
function watchSystem() {
  document.addEventListener("visibilitychange", () => { S.hidden = document.hidden; resetWindow(nowMs()); S.lastPass = 0 })
  try {
    navigator.getBattery?.().then(b => {
      const upd = () => {
        S.battery = { charging: !!b.charging, level: b.level }
        const was = S.capBattery
        S.capBattery = !b.charging && b.level < 1 && !(b.chargingTime === 0 && b.dischargingTime === Infinity)
        if (was !== S.capBattery) { if (S.cfg.mode !== "off") { govLog(S.capBattery ? "on battery → capped at Medium" : "plugged in → cap lifted"); reapply() } refreshPanel() }
      }
      upd(); b.addEventListener("chargingchange", upd); b.addEventListener("levelchange", upd)
    }).catch(() => {})
  } catch (_) {}
  try {
    if (typeof PressureObserver !== "undefined") {
      const po = new PressureObserver(recs => {
        const st = recs[recs.length - 1]?.state || "nominal"
        if (st === S.pressure) return
        S.pressure = st; S.pressureSince = nowMs()   // acted on by the governor only once it has lasted 5 s
      })
      po.observe("cpu", { sampleInterval: 2000 }).catch(() => {})
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// INSTALL (called once by game.js)
// ─────────────────────────────────────────────────────────────────────────────────────────────
function readUrl() {
  let q; try { q = new URLSearchParams(location.search) } catch (_) { return {} }
  const out = {}
  const m = (q.get("hwperf") || q.get("tier") || "").toLowerCase()
  if (m) out.mode = m
  if (q.has("hwbench")) out.bench = true
  if (q.has("hwhud")) out.hud = true
  const hwp = q.get("hwp")
  if (hwp) { try { out.node = JSON.parse(hwp) } catch (_) {} }
  return out
}
export function install({ canvas, ctx, juiceSettings, getState } = {}) {
  if (S.canvas || !canvas || !ctx) return afterPass
  S.canvas = canvas; S.ctx = ctx; S.juice = juiceSettings || null; if (getState) S.getState = getState
  S.govReadyAt = nowMs() + 12000
  const saved = lsGet(LS_KEY); if (saved && typeof saved === "object") S.cfg = { ...S.cfg, ...saved }
  const u = readUrl()
  if (u.node) S.cfg.node = u.node
  if (u.mode && (u.mode === "off" || u.mode === "auto" || TIERS.includes(u.mode))) S.cfg.mode = u.mode
  if (u.hud) S.cfg.hud = true
  saveCfg()
  try { buildUi() } catch (e) { console.warn("[hwperf] ui", e) }
  if (S.cfg.hud && S.ui.hud) S.ui.hud.style.display = "block"
  watchSystem()
  if (S.cfg.mode !== "off") {
    S.scan = scanBrowser()
    measureRefresh(45).then(hz => { if (hz && S.scan) S.scan.refreshHz = hz }).catch(() => {})
    reapply()
    const stale = !S.cfg.bench || S.cfg.bench.fp !== fingerprint()
    if (S.cfg.mode === "auto" && (stale || u.bench)) {
      waitIdle(20000).then(() => { toast("Scanning hardware & benchmarking (≈3 s)…", 3200); return runBenchmark() }).then(b => { if (b) toast(`Hardware tier: ${TIER_LABEL[b.tier]} — ${H.installed ? H.bw + "×" + H.bh : ""} (Shift+F7 for details)`, 5000) })
    } else if (u.bench) setTimeout(() => runBenchmark(), 1200)
  } else if (u.bench) setTimeout(() => runBenchmark(), 1200)
  // test / power-user surface
  window.__hwperf = {
    status: () => ({ mode: S.cfg.mode, cfg: JSON.parse(JSON.stringify(S.cfg)), applied: S.applied, fps: S.fps, p90: S.p90, gov: { drop: S.gov.drop, log: S.gov.log.slice() },
      hooks: H.installed, logical: [S.canvas.width, S.canvas.height], backing: H.installed ? [H.bw, H.bh] : [S.canvas.width, S.canvas.height], scale: H.installed ? H.sx : 1,
      scan: S.scan, battery: S.capBattery, pressure: S.pressureEff, benchRunning: S.benchRunning }),
    setMode, runBenchmark, openPanel, closePanel, setHud, screenshot, maxEverything, recommendTier, tierScale,
    setGovernor: on => { S.cfg.governor = !!on; saveCfg(); reapply() },
    _debugSlow: ms => { S.slowMs = clamp(+ms || 0, 0, 200) },   // harness: simulate a too-slow machine
  }
  return afterPass
}
