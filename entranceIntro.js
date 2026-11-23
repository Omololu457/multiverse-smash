// entranceIntro.js — an ENTRANCE for every fighter (2026-11-23, owner: "give everyone a super interesting intro … make
// sure it actually makes sense … like Batman, he smokes himself in and then he appears"). Runs BEFORE the fighter's own
// intro animation, inside that side's turn of the sequential INTRO stage machine (game.js): the fighter is placed for the
// entrance, the stage timer waits, then their normal intro plays from its first frame. Fighters with a bespoke tracked
// entrance (the flyers, Killua, Shinobu, Zoro, Sanji, Frozone, Enoch, Superman) never get one (initIntroVariant only
// asks for it last). A side whose turn hasn't come is not drawn at all (game.js `_introWaiting`), so P2 doesn't stand
// on the stage while P1 makes their entrance.
//   smoke — a smoke bomb bursts on the mark; they're revealed as it clears (Batman, Robin, ninjas, assassins)
//   flash — a pillar of their colour slams down, a flash ring, and they're standing in it (Rangers, sorcerers, gods)
//   zip   — streaks in from off-screen in a blink with afterimages and a skid (speedsters)
//   drop  — falls out of the sky into a superhero landing: cracked floor, debris, camera shake (heavies)
//   leap  — a big jump in from off-screen behind them, lands in a dust ring (everyone else)
// Presentation only: positions are restored to the mark when it ends / is skipped. Deterministic (hash, no RNG).
import { camera } from "./camera.js"
import sound from "./sound.js"

const H = (a, b) => { let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }
const ease = k => k * k * (3 - 2 * k), easeOut = k => 1 - (1 - k) * (1 - k), cl = v => Math.max(0, Math.min(1, v))
const key = f => String(f?.rosterKey || f?.key || "").toLowerCase()

const SMOKE = ["batman", "dark_knight", "robin", "deathstroke", "ghostface", "ghostface_billy", "ghostface_exe", "jason", "toji", "itachi",
  "shisui_itachi_kids", "shisui_trinity", "shisui_blade", "shisui_puppeteer", "shisui_fallen", "kakashi", "kakashi_anbu", "kakashi_war",
  "madara", "obito", "tobi", "tobirama", "hashirama", "minato", "jiraiya", "hiruzen", "orochimaru", "naruto", "naruto_hokage", "naruto_seventh",
  "sasuke", "sasuke_adult", "sasuke_sensei", "sakura", "hinata", "kiba", "boruto", "zoldyck", "chrollo", "hisoka", "handler", "l_ryuuzaki",
  "light", "kurapika", "shinobu", "zenitsu", "inosuke", "nezuko", "rengoku", "green_arrow", "syndrome", "miwa", "shizuku", "zoro", "buggy", "arlong", "krybot"]
const FLASH = ["omega_ranger", "samurai_red_ranger", "gold_samurai_ranger", "green_samurai_ranger", "red_ranger_mmpr", "spd_red", "ns_red", "ns_yellow",
  "ninja_storm_cgpt", "ns_trio", "ns_blue", "ns_navy", "ns_green", "windrangers", "ninja_storm_rangers", "spd_blue", "spd_green", "spd_pink",
  "mmpr_pink", "mmpr_black", "green_ranger", "mmpr_white", "spd_yellow", "gojo", "gojo_shinjuku", "sukuna", "sukuna_shinjuku", "alt_sukuna", "yuta",
  "megumi_fushiguro", "higuruma", "beerus", "jesus", "saiki", "pain", "six_paths_pain", "isshiki", "meruem", "rick", "morty", "evilMorty", "rickPrime",
  "ben10", "albedo", "vilgax", "kevin_levin", "brainiac", "green_lantern", "goku", "goku_black", "goku_rose", "gogeta", "vegito", "vegeta", "vegeta_dark",
  "gohan", "gotenks", "bardock", "frieza", "cell", "piccolo", "ichigo", "byakuya", "yamamoto", "netero", "gwen", "omololu", "maki", "naoya", "beast_boy",
  "iron_man", "iron_man_2", "iron_man_3", "violet", "elastigirl", "gaara", "light"]
const ZIP = ["flash", "dash_parr", "killua", "gon", "xlr8", "minato_zip"]
const DROP = ["saitama", "genos", "baki", "aoi_todo", "zaraki", "zaraki_shikai", "onoki", "mayuri", "cyborg", "mr_incredible", "soldier_boy", "luffy",
  "sanji", "ippo", "yuji", "spiderman", "spiderman_raimi", "spiderman_ssf2", "spiderman_mci", "miles"]
const BESPOKE = new Set(["frozone", "enoch", "killua", "shinobu", "zoro", "sanji", "superman", "dinothunder", "dt_red", "dt_blue", "dt_yellow", "dt_white"])   // their own tracked entrances
const TABLE = {}
for (const k of SMOKE) TABLE[k.toLowerCase()] = "smoke"
for (const k of FLASH) TABLE[k.toLowerCase()] = "flash"
for (const k of ZIP) TABLE[k.toLowerCase()] = "zip"
for (const k of DROP) TABLE[k.toLowerCase()] = "drop"
const LEN = { smoke: 46, flash: 36, zip: 30, drop: 44, leap: 44 }

export function entranceKind(f) { return TABLE[key(f)] || "leap" }

let FX = { parts: [], rings: [], cracks: [], pillars: [], flash: 0 }
export function entranceReset() { FX = { parts: [], rings: [], cracks: [], pillars: [], flash: 0 } }

// initIntroVariant hook (last in the chain): stash the mark, start the entrance. The fighter's own intro waits.
export function entranceBegin(f) {
  if (!f || BESPOKE.has(key(f))) return false
  const kind = entranceKind(f)
  f._entr = { kind, t: 0, total: LEN[kind], home: { x: f.x, y: f.y }, facing: f.facing || 1, alpha: 0, col: f.color || "#ffffff" }
  f._introPlaying = false; f._introWaiting = false
  place(f)
  return true
}
// per INTRO frame while it runs → true while running; false once done (the caller then starts their own intro)
export function entranceTick(f) {
  const E = f?._entr; if (!E) return false
  E.t++; place(f)
  if (E.t >= E.total) { finalizeEntrance(f); return false }
  return true
}
export function finalizeEntrance(f) {
  if (!f) return
  f._introWaiting = false
  const E = f._entr; if (!E) return
  f.x = E.home.x; f.y = E.home.y; f.facing = E.facing; f.vx = 0; f.vy = 0; f.onGround = f.grounded = true; f.dashTimer = 0
  f._entr = null
}
export const entranceState = f => f?._entr ? { kind: f._entr.kind, t: f._entr.t, total: f._entr.total, alpha: f._entr.alpha, x: f.x, y: f.y } : null

function place(f) {
  const E = f._entr, t = E.t, d = E.facing, { x: hx, y: hy } = E.home, w = f.w || 60, h = f.h || 100, cx = hx + w / 2, feet = hy + h
  f.facing = d; f.vx = 0
  switch (E.kind) {
    case "smoke": {
      if (t === 1) { sfx("whoosh_short", 0.6); for (let i = 0; i < 48; i++) { const a = H(i, 3) * Math.PI * 2, s = 1.5 + 4.5 * H(i, 5), L = 26 + 18 * H(i, 2)
        const g = 70 + Math.round(60 * H(i, 4))
        FX.parts.push({ x: cx + Math.cos(a) * 8, y: feet - h * (0.1 + 0.8 * H(i, 7)), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - 0.8, g: -0.02, life: L, max: L, r: 8 + 16 * H(i, 9), col: `rgba(${g},${g + 4},${g + 12},0.8)`, kind: "smoke" }) }
        FX.rings.push({ x: cx, y: feet - h * 0.5, r: 6, vr: 9, life: 14, max: 14, col: "#d8dce4", lw: 4, flat: 1 }) }
      E.alpha = cl((t - 12) / 10)
      f.x = hx; f.y = hy; f.onGround = f.grounded = true
      break
    }
    case "flash": {
      if (t === 1) { FX.pillars.push({ x: cx, top: feet - 900, y: feet, w: w * 1.6, life: 22, max: 22, col: E.col }); sfx("charge_hum_rise", 0.45) }
      if (t === 9) { FX.flash = 5; FX.rings.push({ x: cx, y: feet, r: 10, vr: 13, life: 20, max: 20, col: E.col, lw: 7, flat: 0.28 }, { x: cx, y: feet - h * 0.5, r: 8, vr: 16, life: 14, max: 14, col: "#ffffff", lw: 4, flat: 1 })
        for (let i = 0; i < 22; i++) { const a = -Math.PI * H(i, 11), s = 3 + 6 * H(i, 13); FX.parts.push({ x: cx, y: feet - h * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.18, life: 26, max: 26, r: 2 + 3 * H(i, 15), col: i % 2 ? E.col : "#ffffff", kind: "spark" }) }
        camera.shake?.(5, 8); sfx("crack_sizzle_bright", 0.6) }
      E.alpha = t < 9 ? 0 : 1
      f.x = hx; f.y = hy; f.onGround = f.grounded = true
      break
    }
    case "zip": {
      const Z = 9
      if (t <= Z) { const k = easeOut(t / Z), nx = hx - d * 1300 * (1 - k); f.vx = nx - f.x; f.x = nx; f.dashTimer = 2
        for (let i = 0; i < 2; i++) FX.parts.push({ x: f.x + w / 2 - d * (10 + 30 * i), y: hy + h * (0.3 + 0.3 * i), vx: 0, vy: 0, life: 12, max: 12, r: 8, col: E.col, kind: "trail" })
        if (t === 1) sfx("whoosh_short", 0.8) }
      else { f.x = hx; f.dashTimer = 0
        if (t === Z + 1) { camera.shake?.(4, 6); for (let i = 0; i < 14; i++) FX.parts.push({ x: cx - d * 10, y: feet - 4, vx: -d * (2 + 6 * H(i, 17)), vy: -1 - 3 * H(i, 19), g: 0.1, life: 30, max: 30, r: 8 + 12 * H(i, 21), col: "rgba(170,150,120,0.5)", kind: "dust" }) } }
      E.alpha = 1; f.y = hy; f.onGround = f.grounded = true
      break
    }
    case "drop": {
      const D = 22
      if (t <= D) { const k = t / D; f.x = hx; f.y = hy - 980 * (1 - k * k); f.vy = 30; f.onGround = f.grounded = false; if (t === 4) sfx("boom_anticipation_suck", 0.7) }
      else { f.x = hx; f.y = hy; f.vy = 0; f.onGround = f.grounded = true
        if (t === D + 1) { camera.shake?.(16, 18); FX.flash = 4; sfx("impact_frame_boom_long", 0.9)
          FX.cracks.push({ x: cx, y: feet, r: 0, rMax: 110, life: 240, max: 240, seed: (hx | 0) })
          FX.rings.push({ x: cx, y: feet, r: 12, vr: 18, life: 22, max: 22, col: "#fff0d0", lw: 8, flat: 0.28 })
          for (let i = 0; i < 30; i++) { const a = -Math.PI * (0.08 + 0.84 * H(i, 23)), s = 5 + 10 * H(i, 29)
            FX.parts.push({ x: cx + (H(i, 31) - 0.5) * 50, y: feet - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.55, life: 55, max: 55, r: 3 + 5 * H(i, 37), col: i % 3 ? "#5a4a3a" : "#8b7660", kind: "rock" }) }
          for (let i = 0; i < 16; i++) { const s2 = i % 2 ? 1 : -1; FX.parts.push({ x: cx + s2 * 16, y: feet - 8, vx: s2 * (2 + 6 * H(i, 41)), vy: -0.6 - H(i, 43), g: -0.01, life: 70, max: 70, r: 18 + 24 * H(i, 47), col: "rgba(170,150,120,0.5)", kind: "dust" }) } }
        f.attacking = false }
      E.alpha = 1
      break
    }
    default: {   // leap
      const L = 30
      if (t <= L) { const k = t / L, nx = hx - d * 560 * (1 - ease(k)), ny = hy - 300 * Math.sin(Math.PI * Math.min(1, k * 0.98 + 0.02)) * (1 - k * 0.15)
        f.vy = ny - f.y; f.x = nx; f.y = Math.min(hy, ny); f.onGround = f.grounded = false; if (t === 1) sfx("whoosh_short", 0.5) }
      else { f.x = hx; f.y = hy; f.vy = 0; f.onGround = f.grounded = true
        if (t === L + 1) { camera.shake?.(5, 6); FX.rings.push({ x: cx, y: feet, r: 8, vr: 10, life: 20, max: 20, col: "#fff6e0", lw: 5, flat: 0.25 })
          for (let i = 0; i < 12; i++) { const s2 = i % 2 ? 1 : -1; FX.parts.push({ x: cx + s2 * 12, y: feet - 6, vx: s2 * (1.5 + 4 * H(i, 51)), vy: -0.5 - H(i, 53), g: -0.01, life: 50, max: 50, r: 12 + 14 * H(i, 57), col: "rgba(170,150,120,0.5)", kind: "dust" }) } } }
      E.alpha = 1
    }
  }
}
function sfx(id, gain) { try { sound.playJuiceSfx?.(id, { gain }) } catch (_) {} }

// ── DRAW (world space) — under the fighters: floor cracks; over: smoke, pillars, rings, sparks, dust ──
export function drawEntranceUnder(c) {
  if (!FX.cracks.length) return
  c.save()
  for (const q of FX.cracks) { q.r = Math.min(q.rMax, q.r + 22); q.life--; const a = Math.min(1, q.life / 60)
    c.globalAlpha = 0.75 * a; c.strokeStyle = "#1c140e"; c.lineWidth = 3
    for (let i = 0; i < 9; i++) { const ang = Math.PI * (H(q.seed, i) * 0.9 + 0.05) * (i % 2 ? 1 : -1) * 0 + (i - 4) * 0.33, len = q.r * (0.5 + 0.5 * H(q.seed, i + 20))
      c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + Math.sin(ang) * len, q.y + Math.abs(Math.cos(ang)) * len * 0.12 + 2); c.stroke() }
    c.globalAlpha = 0.35 * a; c.fillStyle = "#2a1e14"; c.beginPath(); c.ellipse(q.x, q.y + 2, q.r * 0.55, q.r * 0.09, 0, 0, Math.PI * 2); c.fill() }
  FX.cracks = FX.cracks.filter(q => q.life > 0)
  c.restore()
}
export function drawEntranceOver(c) {
  if (!FX.parts.length && !FX.rings.length && !FX.pillars.length) return
  c.save()
  for (const p of FX.pillars) { p.life--; const a = p.life / p.max, k = 1 - a, w = p.w * (1 - k * 0.8)
    c.globalAlpha = a; c.fillStyle = p.col; c.fillRect(p.x - w / 2, p.top, w, p.y - p.top)
    c.fillStyle = "#ffffff"; c.fillRect(p.x - w / 6, p.top, w / 3, p.y - p.top) }
  FX.pillars = FX.pillars.filter(p => p.life > 0)
  for (const r of FX.rings) { r.life--; r.r += r.vr; r.vr *= 0.9; c.globalAlpha = r.life / r.max; c.strokeStyle = r.col; c.lineWidth = r.lw
    c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * r.flat, 0, 0, Math.PI * 2); c.stroke() }
  FX.rings = FX.rings.filter(r => r.life > 0)
  for (const p of FX.parts) { p.life--; p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; if (p.kind === "smoke" || p.kind === "dust") { p.vx *= 0.93; p.r *= p.kind === "smoke" ? 1.02 : 1.012 }
    const a = p.life / p.max; c.globalAlpha = p.kind === "smoke" ? Math.min(1, a * 1.3) * 0.85 : a
    c.fillStyle = p.col
    if (p.kind === "spark" || p.kind === "rock") c.fillRect(p.x, p.y, p.r, p.r)
    else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill() } }
  FX.parts = FX.parts.filter(p => p.life > 0)
  c.restore()
}
export function drawEntranceScreen(c, W, H2) { if (FX.flash > 0) { c.save(); c.setTransform?.(1, 0, 0, 1, 0, 0); c.globalAlpha = FX.flash / 8; c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H2); c.restore(); FX.flash-- } }
export const entranceFxState = () => ({ parts: FX.parts.length, rings: FX.rings.length, cracks: FX.cracks.length, pillars: FX.pillars.length })
