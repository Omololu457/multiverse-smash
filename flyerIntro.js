// flyerIntro.js — FLIGHT ENTRANCES for the fighters who fly (match-start intro, presentation only).
//   OMNI-MAN     drops out of the sky like a meteor and craters the floor, then rises out of the crouch.
//   INVINCIBLE   screams in low and fast from off-screen (sonic boom, ground dust), overshoots, turns, hovers back, lands.
//   HOMELANDER   hovers down slowly from above, eyes heat up, and carves a burning line in the FLOOR in front of him
//                (never the opponent), then sets down.
//   SUPERMAN     blurs across the sky (sonic boom), then descends from above into the sunlight and lands softly.
//   STARFIRE / RAVEN   descend from above in their hover pose inside their aura, land, then their own intro strip.
// Combat / physics are frozen during INTRO, so x / y are set directly; finalizeFlyerIntro() snaps the fighter home
// (intro end OR skip). Deterministic (no RNG: hash of the frame). The camera holds during INTRO (camera.advance only),
// so a fighter off the top / side of the view stays off-screen.
import { camera } from "./camera.js"
import sound from "./sound.js"
import { getHomelanderEyeWorld } from "./homelanderEyeAnchors.js"
import { getSupermanEyeWorld } from "./supermanEyeAnchors.js"

const H = (a, b) => { let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }
const clamp01 = v => Math.max(0, Math.min(1, v))
const lerp = (a, b, k) => a + (b - a) * k
const easeOut = k => 1 - (1 - k) * (1 - k)
const easeInOut = k => k * k * (3 - 2 * k)
const keyOf = f => String(f?.rosterKey || f?.key || "").toLowerCase()

// total frames per entrance (INTRO stage timer for that side)
const KINDS = {
  omniman_viltrum: { kind: "meteor", total: 136 }, omniman: { kind: "meteor", total: 136 },
  invincible: { kind: "flyby", total: 140 },
  homelander: { kind: "heat", total: 176 },
  superman: { kind: "sky", total: 164 },
  starfire: { kind: "descend", total: 70, hover: "ultHover", aura: "#5cff7a", after: "intro" },
  raven: { kind: "descend", total: 70, hover: "ultHover", aura: "#8a4dff", after: "intro" },
}
const has = (f, a) => !!(f?._skinAnim?.[a] || f?.animationData?.[a])
const stepFrames = (f, a) => { const d = f?._skinAnim?.[a] || f?.animationData?.[a]; return d ? Math.max(1, (d.frames || 1) * (d.speed || 5)) : 0 }

let FX = { decals: [], parts: [], rings: [], beams: [], glints: [], flash: 0 }
export function flyerIntroReset() { FX = { decals: [], parts: [], rings: [], beams: [], glints: [], flash: 0 } }

export function flyerIntroKind(f) { const k = KINDS[keyOf(f)]; return k && (k.kind !== "descend" || has(f, k.hover)) ? k : null }

// initIntroVariant hook: stash home, place the fighter at the start of their entrance. false → not a flyer (no-op).
export function flyerIntroStart(f) {
  const K = flyerIntroKind(f); if (!K) return false
  f._flyIn = { kind: K.kind, home: { x: f.x, y: f.y }, facing: f.facing || 1, total: K.total + (K.after ? stepFrames(f, K.after) : 0), cfg: K, fired: {} }
  f._introHomeX = null; f._introSeq = null
  place(f, 0)
  return true
}
export function flyerIntroFrames(f) { return f?._flyIn ? f._flyIn.total : 0 }

function once(S, k) { if (S.fired[k]) return false; S.fired[k] = true; return true }
function play(id, gain = 0.8, o = {}) { try { sound.playJuiceSfx?.(id, { gain, ...o }) } catch (_) {} }
function variant(f, a, fallback) { f._introVariant = has(f, a) ? a : (fallback && has(f, fallback) ? fallback : f._introVariant) }

// position + strip for intro frame t
function place(f, t, foe) {
  const S = f._flyIn, { x: hx, y: hy } = S.home, d = S.facing, w = f.w || 60, h = f.h || 100
  const feet = hy + h, cx = () => f.x + w / 2
  switch (S.kind) {
    case "meteor": {   // ── OMNI-MAN: sky dive → crater → rise ──
      const D0 = 4, D1 = 44
      if (t < D0) { f.x = hx - d * 260; f.y = hy - 900; variant(f, "flyDive", "flyCruise") }
      else if (t < D1) { const k = Math.pow((t - D0) / (D1 - D0), 1.35); f.x = lerp(hx - d * 260, hx, easeOut((t - D0) / (D1 - D0))); f.y = lerp(hy - 820, hy, k); variant(f, "flyDive", "flyCruise")
        S.streak = { x: f.x + w / 2, y: f.y + h * 0.5, dx: -d * 260 / (D1 - D0) * 6 }
        if (t % 2 === 0) for (let i = 0; i < 3; i++) FX.parts.push({ x: cx() + (H(t, i) - 0.5) * w * 0.5, y: f.y + h * (0.2 + H(t, i + 9) * 0.5), vx: (H(t, i + 3) - 0.5) * 2, vy: -6 - H(t, i + 5) * 5, life: 18, max: 18, r: 5 + H(t, i + 7) * 6, col: i ? "#ffb347" : "#fff2c0", kind: "ember" })
        if (once(S, "whistle")) play("boom_anticipation_suck", 0.9) }
      else {
        f.x = hx; f.y = hy; S.streak = null
        if (once(S, "impact")) {   // CRATER
          play("impact_frame_boom_long", 1, { ultBoom: true }); camera.shake?.(22, 26); FX.flash = 7
          FX.decals.push({ type: "crater", x: hx + w / 2, y: feet, r: 0, rMax: 150, life: 9999 })
          FX.rings.push({ x: hx + w / 2, y: feet, r: 10, vr: 22, life: 26, max: 26, col: "#fff3d0", lw: 10, flat: 0.28 })
          FX.rings.push({ x: hx + w / 2, y: feet - h * 0.4, r: 10, vr: 30, life: 18, max: 18, col: "#ffffff", lw: 6, flat: 1 })
          for (let i = 0; i < 46; i++) { const a = -Math.PI * (0.05 + 0.9 * H(i, 31)), s = 6 + 14 * H(i, 37)
            FX.parts.push({ x: hx + w / 2 + (H(i, 41) - 0.5) * 60, y: feet - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.6, life: 70, max: 70, r: 3 + 7 * H(i, 43), col: i % 3 ? "#5a4a3a" : "#8b7660", kind: "rock", rot: H(i, 47) * 6, vr: (H(i, 53) - 0.5) * 0.4, floor: feet }) }
          for (let i = 0; i < 26; i++) { const s = 2 + 8 * H(i, 59), dir = H(i, 61) < 0.5 ? -1 : 1
            FX.parts.push({ x: hx + w / 2 + dir * 20, y: feet - 10, vx: dir * s, vy: -1 - 2 * H(i, 67), g: -0.02, life: 90, max: 90, r: 20 + 30 * H(i, 71), col: "rgba(170,150,120,0.5)", kind: "dust" }) }
        }
        if (t < 84) variant(f, "omvLandHard", has(f, "omvMeteorLand") ? "omvMeteorLand" : "land")
        else variant(f, "intro", "taunt")
      }
      break
    }
    case "flyby": {   // ── INVINCIBLE: low fast fly-in → overshoot → turn → hover back → land ──
      const A = 26, B = 44, C = 96, Dl = 108, low = hy - 80
      if (t < A) { const k = easeOut(t / A); f.x = lerp(hx - d * 1100, hx + d * 170, k); f.y = low; f.facing = d; variant(f, "flyDash", "flyCruise")
        if (t % 1 === 0) { FX.parts.push({ x: f.x + w / 2 - d * w * 0.4, y: f.y + h * 0.45, vx: -d * 2, vy: 0, life: 16, max: 16, r: 10, col: "#4aa8ff", kind: "trail" }); FX.parts.push({ x: f.x + w / 2 - d * w * 0.4, y: f.y + h * 0.35, vx: -d * 2, vy: 0, life: 12, max: 12, r: 6, col: "#ffe14a", kind: "trail" }) }
        if (t % 2 === 0) FX.parts.push({ x: f.x + w / 2, y: feet - 4, vx: -d * (3 + 3 * H(t, 3)), vy: -1 - 2 * H(t, 5), g: -0.02, life: 50, max: 50, r: 14 + 14 * H(t, 7), col: "rgba(190,170,140,0.45)", kind: "dust" })
        if (t === 10 && once(S, "boom")) { play("crack_sizzle_bright", 0.9); FX.rings.push({ x: f.x + w / 2, y: f.y + h * 0.45, r: 14, vr: 12, life: 22, max: 22, col: "#dff1ff", lw: 6, flat: 1, cone: d }); camera.shake?.(6, 10) } }
      else if (t < B) { const k = easeOut((t - A) / (B - A)); f.x = lerp(hx + d * 170, hx + d * 120, k); f.y = low - 18 * Math.sin(k * Math.PI); f.facing = -d; variant(f, "flyTurn", "flyHover") }
      else if (t < C) { const k = easeInOut((t - B) / (C - B)); f.facing = d; f.x = lerp(hx + d * 120, hx, k); f.y = lerp(low, hy - 26, k) + Math.sin(t * 0.18) * 5; variant(f, "flyHover", "idle") }
      else if (t < Dl) { const k = clamp01((t - C) / (Dl - C)); f.x = hx; f.y = lerp(hy - 26, hy, k * k); variant(f, "land", "flyHover") }
      else { f.x = hx; f.y = hy; f.facing = d; if (once(S, "landed")) FX.parts.push(...dustPuff(hx + w / 2, feet, 10)); variant(f, "intro", "taunt") }
      break
    }
    case "heat": {   // ── HOMELANDER: hover down → heat up → laser the FLOOR (not the foe) → set down ──
      const A = 64, B = 84, C = 136, Dl = 158, top = hy - 110
      if (t < A) { const k = easeOut(t / A); f.x = hx; f.y = lerp(hy - 620, top, k) + Math.sin(t * 0.12) * 4; variant(f, "flyHover", "idle") }
      else if (t < B) { f.x = hx; f.y = top + Math.sin(t * 0.12) * 3; variant(f, "heatCharge", "flyHover"); if (once(S, "charge")) play("charge_hum_rise", 0.7) }
      else if (t < C) {
        f.x = hx; f.y = top + Math.sin(t * 0.12) * 2; variant(f, "heatCharge", "flyHover")
        if (once(S, "fire")) { play("crack_sizzle_bright", 0.9); play("energy_hum_low", 0.6) }
        const k = easeInOut((t - B) / (C - B)), fx = foe ? foe.x + (foe.w || 60) / 2 : hx + w / 2 + d * 600
        const near = hx + w / 2 + d * 50, far = d > 0 ? Math.min(hx + w / 2 + d * 330, fx - 110) : Math.max(hx + w / 2 + d * 330, fx + 110)   // stops short of the opponent
        const px = lerp(near, d * (far - near) > 0 ? far : near + d * 60, k)
        S.beam = { x: px, y: feet }
        const last = FX.decals.find(q => q.type === "scorch" && q.id === "hl")
        if (last) { last.x1 = px } else FX.decals.push({ type: "scorch", id: "hl", x0: px, x1: px, y: feet, life: 9999 })
        for (let i = 0; i < 3; i++) FX.parts.push({ x: px, y: feet - 2, vx: (H(t, i) - 0.5) * 7 - d * 2, vy: -3 - 6 * H(t, i + 4), g: 0.35, life: 22, max: 22, r: 2 + 2 * H(t, i + 8), col: i ? "#ffd24a" : "#ff5a2a", kind: "spark" })
        if (t % 3 === 0) FX.parts.push({ x: px, y: feet - 6, vx: (H(t, 13) - 0.5) * 1.5, vy: -1.2 - H(t, 17), g: -0.01, life: 70, max: 70, r: 10 + 12 * H(t, 19), col: "rgba(60,55,55,0.45)", kind: "dust" })
        if (t % 6 === 0) camera.shake?.(2, 4)
      } else if (t < Dl) { S.beam = null; const k = easeInOut((t - C) / (Dl - C)); f.x = hx; f.y = lerp(top, hy, k); variant(f, "flyHover", "idle") }
      else { S.beam = null; f.x = hx; f.y = hy; if (once(S, "landed")) FX.parts.push(...dustPuff(hx + w / 2, feet, 6)); variant(f, "land", "idle") }
      break
    }
    case "sky": {   // ── SUPERMAN: sonic-boom fly-by across the sky → descends into the light → soft landing ──
      const A = 34, B = 52, C = 116, Dl = 128, sky = hy - 230
      if (t < A) { const k = t / A; f.x = lerp(hx - d * 1100, hx + d * 1100, k); f.y = sky + Math.sin(k * Math.PI) * -30; f.facing = d; variant(f, "flyCruise", "flyDash")
        FX.parts.push({ x: f.x + w / 2 - d * w * 0.3, y: f.y + h * 0.4, vx: 0, vy: 0, life: 18, max: 18, r: 9, col: "#3d7dff", kind: "trail" }, { x: f.x + w / 2 - d * w * 0.3, y: f.y + h * 0.5, vx: 0, vy: 0, life: 14, max: 14, r: 6, col: "#ff3030", kind: "trail" })
        if (t === 16 && once(S, "boom")) { play("crack_sizzle_bright", 0.8); FX.rings.push({ x: f.x + w / 2, y: f.y + h * 0.45, r: 16, vr: 14, life: 26, max: 26, col: "#eaf3ff", lw: 7, flat: 1, cone: d }); camera.shake?.(5, 10) } }
      else if (t < B) { f.x = hx; f.y = hy - 900; S.light = clamp01((t - A) / (B - A)) }
      else if (t < C) { const k = easeOut((t - B) / (C - B)); f.x = hx; f.facing = d; f.y = lerp(hy - 760, hy - 8, k); S.light = 1; variant(f, "flyHover", "idle"); if (once(S, "hum")) play("energy_tone_hold", 0.35) }
      else if (t < Dl) { f.x = hx; f.y = lerp(hy - 8, hy, (t - C) / (Dl - C)); variant(f, "land", "flyHover"); S.light = 1 - (t - C) / 40 }
      else { f.x = hx; f.y = hy; S.light = Math.max(0, 1 - (t - C) / 40); if (once(S, "landed")) { FX.parts.push(...dustPuff(hx + w / 2, feet, 14)); FX.rings.push({ x: hx + w / 2, y: feet, r: 8, vr: 9, life: 22, max: 22, col: "#ffffff", lw: 4, flat: 0.25 }) } variant(f, "land", "flyHover") }
      break
    }
    case "descend": {   // ── STARFIRE / RAVEN: hover down inside their aura → land → their own intro ──
      const A = 52, Dl = 64
      if (t < A) { const k = easeOut(t / A); f.x = hx; f.y = lerp(hy - 560, hy - 20, k) + Math.sin(t * 0.14) * 4; variant(f, S.cfg.hover, "idle") }
      else if (t < Dl) { f.x = hx; f.y = lerp(hy - 20, hy, (t - A) / (Dl - A)); variant(f, has(f, "land") ? "land" : S.cfg.hover) }
      else { f.x = hx; f.y = hy; if (once(S, "landed")) { FX.parts.push(...dustPuff(hx + w / 2, feet, 6)); FX.rings.push({ x: hx + w / 2, y: feet, r: 8, vr: 7, life: 20, max: 20, col: S.cfg.aura, lw: 4, flat: 0.25 }) } variant(f, S.cfg.after, S.cfg.hover) }
      break
    }
  }
}
function dustPuff(x, y, n) { const o = []; for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1; o.push({ x: x + dir * 10, y: y - 6, vx: dir * (1.5 + 3 * H(i, 91)), vy: -0.6 - H(i, 93), g: -0.01, life: 50, max: 50, r: 10 + 12 * H(i, 97), col: "rgba(180,165,140,0.45)", kind: "dust" }) } return o }

// per intro frame (INTRO stage machine, after the other per-character updaters)
export function updateFlyerIntro(f, foe) {
  if (!f?._flyIn || !f._introPlaying) return
  place(f, f._introRevealFrame || 0, foe)
}
// intro end / skip → home, upright
export function finalizeFlyerIntro(f) {
  if (!f?._flyIn) return
  f.x = f._flyIn.home.x; f.y = f._flyIn.home.y; f.facing = f._flyIn.facing; f.vx = 0; f.vy = 0
  f._flyIn = null
  for (const q of FX.decals) if (q.life >= 9999) q.life = 300   // the crater / scorch fades over the first 5 s of the fight
}
export const flyerIntroState = f => f?._flyIn ? { kind: f._flyIn.kind, total: f._flyIn.total, x: f.x, y: f.y, home: f._flyIn.home, variant: f._introVariant, fired: Object.keys(f._flyIn.fired) } : null

// ── DRAW (world space). UNDER the fighters: crater / scorch, Superman's light. OVER: trails, rings, beams, debris. ──
let _tick = 0
export function drawFlyerIntroUnder(c, fighters) {
  _tick++
  for (const p of FX.parts) { p.life--; p.vy += p.g ?? 0; p.x += p.vx; p.y += p.vy; if (p.kind === "rock" && p.y > p.floor - 2) { p.y = p.floor - 2; p.vy *= -0.3; p.vx *= 0.6 } if (p.rot != null) p.rot += p.vr }
  FX.parts = FX.parts.filter(p => p.life > 0).slice(-420)
  for (const r of FX.rings) { r.life--; r.r += r.vr; r.vr *= 0.9 }
  FX.rings = FX.rings.filter(r => r.life > 0)
  if (FX.flash > 0) FX.flash--
  if (!FX.decals.length && !fighters.some(f => f?._flyIn?.light)) return
  c.save()
  FX.decals = FX.decals.filter(q => q.life > 0)
  for (const q of FX.decals) {
    if (q.life < 9999) q.life--
    c.globalAlpha = q.life < 9999 ? clamp01(q.life / 120) : 1
    if (q.type === "crater") { q.r = Math.min(q.rMax, q.r + 30)
      const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); g.addColorStop(0, "rgba(20,14,10,0.9)"); g.addColorStop(0.55, "rgba(45,32,22,0.75)"); g.addColorStop(0.85, "rgba(90,70,50,0.35)"); g.addColorStop(1, "rgba(90,70,50,0)")
      c.fillStyle = g; c.beginPath(); c.ellipse(q.x, q.y, q.r, q.r * 0.2, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = "rgba(25,18,12,0.85)"; c.lineWidth = 2
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, l = q.r * (0.9 + 0.7 * H(i, 5)); c.beginPath(); c.moveTo(q.x + Math.cos(a) * q.r * 0.35, q.y + Math.sin(a) * q.r * 0.07); c.lineTo(q.x + Math.cos(a) * l, q.y + Math.sin(a) * l * 0.2); c.stroke() } }
    if (q.type === "scorch") { const x0 = Math.min(q.x0, q.x1), x1 = Math.max(q.x0, q.x1)
      c.fillStyle = "rgba(20,12,8,0.8)"; c.beginPath(); c.ellipse((x0 + x1) / 2, q.y - 1, (x1 - x0) / 2 + 10, 7, 0, 0, Math.PI * 2); c.fill()
      const hot = c.createLinearGradient(q.x0, 0, q.x1, 0); hot.addColorStop(0, "rgba(255,90,20,0.15)"); hot.addColorStop(1, "rgba(255,200,80,0.95)")
      c.strokeStyle = hot; c.lineWidth = 3.5; c.lineCap = "round"; c.beginPath(); c.moveTo(q.x0, q.y - 1); c.lineTo(q.x1, q.y - 1); c.stroke() }
  }
  c.globalAlpha = 1
  for (const f of fighters) { const L = f?._flyIn?.light; if (!L) continue   // Superman: sunlight from above
    const x = f.x + (f.w || 60) / 2, g = c.createLinearGradient(x, f.y - 700, x, f.y + (f.h || 100))
    g.addColorStop(0, `rgba(255,244,200,${0.55 * L})`); g.addColorStop(1, "rgba(255,244,200,0)")
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 50, f.y - 700); c.lineTo(x + 50, f.y - 700); c.lineTo(x + 140, f.y + (f.h || 100)); c.lineTo(x - 140, f.y + (f.h || 100)); c.fill()
    const r = c.createRadialGradient(x, f.y + (f.h || 100) * 0.4, 4, x, f.y + (f.h || 100) * 0.4, 130); r.addColorStop(0, `rgba(255,250,220,${0.45 * L})`); r.addColorStop(1, "rgba(255,250,220,0)"); c.fillStyle = r; c.fillRect(x - 140, f.y - 90, 280, (f.h || 100) + 180) }
  c.restore()
}
export function drawFlyerIntroOver(c, fighters) {
  const beamers = fighters.filter(f => f?._flyIn?.beam)
  const auras = fighters.filter(f => f?._flyIn?.kind === "descend" && f._introPlaying && (f._introRevealFrame || 0) < 70)
  if (!FX.parts.length && !FX.rings.length && !beamers.length && !auras.length && !FX.flash && !fighters.some(f => f?._flyIn?.streak)) return
  c.save()
  for (const f of auras) { const x = f.x + (f.w || 60) / 2, y = f.y + (f.h || 100) * 0.5, a = 0.35 + 0.15 * Math.sin(_tick * 0.2), col = f._flyIn.cfg.aura
    const g = c.createRadialGradient(x, y, 10, x, y, (f.h || 100) * 0.9); g.addColorStop(0, col + "00"); g.addColorStop(0.6, col + "55"); g.addColorStop(1, col + "00")
    c.globalAlpha = a * 2; c.fillStyle = g; c.beginPath(); c.ellipse(x, y, (f.w || 60) * 1.4, (f.h || 100) * 0.85, 0, 0, Math.PI * 2); c.fill() }
  c.globalAlpha = 1
  for (const p of FX.parts) { const a = clamp01(p.life / p.max)
    if (p.kind === "dust") { c.globalAlpha = a * 0.9; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2); c.fill() }
    else if (p.kind === "rock") { c.globalAlpha = Math.min(1, a * 2); c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.8); c.restore() }
    else if (p.kind === "trail") { c.globalAlpha = a * 0.75; c.fillStyle = p.col; c.beginPath(); c.ellipse(p.x, p.y, p.r * 2.6 * a + 2, p.r * a + 1, 0, 0, Math.PI * 2); c.fill() }
    else { c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2); c.fill() } }
  for (const f of fighters) { const st = f?._flyIn?.streak; if (!st) continue   // OMNI-MAN: the re-entry streak behind him, all the way up off the screen
    const top = st.y - 1100, g = c.createLinearGradient(0, top, 0, st.y)
    g.addColorStop(0, "rgba(255,120,40,0)"); g.addColorStop(0.7, "rgba(255,150,60,0.55)"); g.addColorStop(1, "rgba(255,245,210,0.95)")
    c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.moveTo(st.x - st.dx * 4 - 6, top); c.lineTo(st.x - st.dx * 4 + 6, top); c.lineTo(st.x + 34, st.y); c.lineTo(st.x - 34, st.y); c.fill()
    const r = c.createRadialGradient(st.x, st.y + 20, 6, st.x, st.y + 20, 70); r.addColorStop(0, "rgba(255,250,230,0.95)"); r.addColorStop(0.5, "rgba(255,170,70,0.6)"); r.addColorStop(1, "rgba(255,100,30,0)")
    c.fillStyle = r; c.beginPath(); c.arc(st.x, st.y + 20, 70, 0, Math.PI * 2); c.fill() }
  for (const r of FX.rings) { const a = clamp01(r.life / r.max); c.globalAlpha = a; c.strokeStyle = r.col; c.lineWidth = r.lw * a + 1
    c.beginPath(); if (r.cone) c.ellipse(r.x, r.y, r.r * 0.45, r.r, 0, Math.PI * 0.5, Math.PI * 1.5, r.cone < 0); else c.ellipse(r.x, r.y, r.r, r.r * r.flat, 0, 0, Math.PI * 2); c.stroke() }
  for (const f of beamers) {   // HEAT VISION: two red beams from his eyes into the floor (eye-anchored)
    let e; try { e = keyOf(f) === "superman" ? getSupermanEyeWorld(f) : getHomelanderEyeWorld(f) } catch (_) { e = { x: f.x + (f.w || 60) * 0.6, y: f.y + (f.h || 100) * 0.2 } }
    const b = f._flyIn.beam, jit = (H(_tick, 3) - 0.5) * 3
    for (const [lw, col, al] of [[12, "#ff2a1a", 0.35], [6, "#ff4a2a", 0.85], [2.5, "#fff0e0", 1]]) { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw; c.lineCap = "round"
      for (const o of [-3, 3]) { c.beginPath(); c.moveTo(e.x + o * 0.6, e.y); c.lineTo(b.x + o + jit, b.y - 2); c.stroke() } }
    c.globalAlpha = 0.9; const g = c.createRadialGradient(b.x, b.y - 4, 2, b.x, b.y - 4, 34); g.addColorStop(0, "rgba(255,240,200,1)"); g.addColorStop(0.4, "rgba(255,110,40,0.8)"); g.addColorStop(1, "rgba(255,60,20,0)")
    c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y - 4, 34, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.8; c.fillStyle = "#ff3a1a"; for (const o of [-3, 3]) { c.beginPath(); c.arc(e.x + o * 0.6, e.y, 4, 0, Math.PI * 2); c.fill() } }
  c.restore()
}
// screen-space white flash on the crater hit
export function drawFlyerIntroScreen(c, W, H2) { if (FX.flash > 0) { c.save(); c.setTransform?.(1, 0, 0, 1, 0, 0); c.globalAlpha = FX.flash / 14; c.fillStyle = "#fff8e0"; c.fillRect(0, 0, W, H2); c.restore() } }
export const flyerIntroFxState = () => ({ parts: FX.parts.length, rings: FX.rings.length, decals: FX.decals.map(d => d.type) })
