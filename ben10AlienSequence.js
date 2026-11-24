// ben10AlienSequence.js — BEN 10 / ALBEDO HUMAN-FORM ULTIMATE: "OMNITRIX · ALIEN SEQUENCE".
// Ben slams the Omnitrix, the dial spins through every alien, and then he transforms into EACH of his aliens in turn —
// a green flash, the alien's own art, its signature attack on the foe — ending back as Ben with an Omnitrix blast.
// Albedo runs the same sequence with his recoloured (red/white) alien art.
//
// How it plugs in: abilities.executeBen10Ultimate()'s human branch (Omnitrix Overload) starts this script through the
// cinematic pre-roll engine (demonSlayerCinematics.js; one hook line, tools/ds/hooks.py) instead of its three radial hits.
// Same cost (full Power), same total damage (250 unscaled: 24 × 6 per alien + 106 for the finale), same 90f recovery and
// forced Omnitrix timeout afterwards. Combat is frozen for the sequence; the alien art is a temporary _skinAnim swap (the
// same frame-set applyAlien uses, re-tagged for Albedo) restored at the end — Ben's form/state never changes.
// Deterministic (frame-indexed). Imports aliens.js / swampfire.js / fighters.js (leaf modules) + the engine (no cycle).

import { BEN10_ALIEN_REGISTRY } from "./aliens.js"
import { SWAMPFIRE_ANIM } from "./swampfire.js"
import { retagBenReadyArt } from "./fighters.js"
import { getAlienPortrait } from "./alienPortraits.js"
import { registerUltPreroll } from "./demonSlayerCinematics.js"
import { ease, cx, hsh, toScreen, pose, bolt, flameTongue } from "./dsCineKit.js"
import { SFX } from "./sound.js"
import { preloadSheets } from "./sprite.js"

// alien → [attack strip (first one that exists), signature element]
const SIG = {
  swampfire: [["sfBlaze", "heavy"], "fire"], heatblast: [["hbUltSun", "heavy"], "fire"], megawhatt: [["mwUlt", "heavy"], "electric"],
  goop: [["gpUltSpikes", "heavy"], "goo"], xlr8: [["xlUltCircle", "heavy"], "speed"], eyeguy: [["egUltFlare", "heavy"], "beam"],
  ghostfreak: [["gfUltScream", "heavy"], "ghost"], alienx: [["heavy"], "cosmic"], brainstorm: [["heavy"], "electric"],
  terraspin: [["heavy"], "wind"], wildvine: [["heavy"], "plant"], jetray: [["heavy"], "beam"], diamondhead_ov: [["heavy"], "crystal"],
  upgrade_ov: [["heavy"], "tech"], humongousaur: [["hmUltStomp", "heavy"], "quake"], feedback_ov: [["heavy"], "electric"],
  arcticguana: [["agBeamFire", "heavy"], "ice"], benwolf: [["heavy"], "sonic"], bigchill: [["heavy"], "ice"], ripjaws: [["heavy"], "water"],
  rath: [["rtUltPunch", "heavy"], "punch"], waterhazard: [["whUltOrb", "heavy"], "water"], highbreed: [["heavy"], "punch"], wildmutt_ov: [["wmUltFinal", "heavy"], "claw"],
}
const COL = { fire: ["#ff5a12", "#ffd060"], electric: ["#7ae8ff", "#ffffff"], goo: ["#7cff3a", "#d8ff9a"], speed: ["#3aa0ff", "#e0f4ff"],
  beam: ["#7cff3a", "#f0ffd8"], ghost: ["#8a4dff", "#1a0a2a"], cosmic: ["#ffffff", "#5a8aff"], wind: ["#d8f0ff", "#8ab0c8"], plant: ["#3ac03a", "#a8ff6a"],
  crystal: ["#5affd8", "#e0fff8"], tech: ["#3aff6a", "#0a2a10"], quake: ["#c89a5a", "#fff0d0"], ice: ["#9ae0ff", "#ffffff"], water: ["#2a8aff", "#c8ecff"],
  sonic: ["#c0a8ff", "#ffffff"], punch: ["#ffd040", "#ffffff"], claw: ["#ff8a2a", "#ffffff"] }

const INTRO = 60, BEAT = 12, FINALE = 62
const DMG_BEAT = 6, DMG_TOTAL = 250

function roster() {
  const out = []
  for (const a of BEN10_ALIEN_REGISTRY) {
    if (a.status !== "ready") continue
    const anim = a.poolKey === "swampfire" ? SWAMPFIRE_ANIM : a.anim
    if (!anim) continue
    const sig = SIG[a.poolKey] || [["heavy"], "punch"]
    const act = sig[0].find(k => anim[k]) || (anim.heavy ? "heavy" : "idle")
    out.push({ key: a.poolKey, name: (a.displayName || a.poolKey).toUpperCase(), anim, act, el: sig[1] })
  }
  return out
}
let ROSTER = null
const list = () => (ROSTER ||= roster())
const totalFrames = () => INTRO + list().length * BEAT + FINALE

function beatOf(f) { const i = Math.floor((f - INTRO) / BEAT); return f >= INTRO && i < list().length ? { i, k: (f - INTRO) % BEAT, A: list()[i] } : null }

// where the alien stands for beat i: alternating sides of the foe, inside the world
function standX(cine, i) {
  const c = cine.caster, o = cine.mem.opp0, w = c.w || 60, ww = cine._cam?.worldWidth || 3200
  if (!o) return cine.mem.x0
  const side = (i % 2 === 0 ? -1 : 1) * cine.mem.dir
  return Math.max(20, Math.min(ww - 20 - w, o.x + side * (o.w / 2 + w / 2 + 70) - w / 2))
}

const SCRIPT = {
  get total() { return totalFrames() }, accent: "#7cff3a", ink: "#eaffd8", tint: "0,20,6", words: [],
  onStart(c, cine) {
    const o = cine.opponent
    cine.S = { ...SCRIPT, total: totalFrames() }   // freeze the length for this run
    Object.assign(cine.mem, { x0: c.x || 0, dir: (c.facing ?? 1) >= 0 ? 1 : -1, skin: c._skinAnim || null, facing: c.facing,
      opp0: o ? { x: cx(o), y: o.y || 0, w: o.w || 60, h: o.h || 100 } : null, cur: null })
    c._benOverloadFx = null   // the old radial burst never plays
    // decode every alien's attack sheet now (Albedo's recoloured ones via the same re-tag) — the 1s dial intro covers it
    const sheets = []
    for (const A of list()) { c._skinAnim = { [A.act]: A.anim[A.act] }; retagBenReadyArt(c); sheets.push(c._skinAnim?.[A.act]?.sheet) }
    c._skinAnim = cine.mem.skin
    try { preloadSheets(sheets) } catch (_) {}
  },
  pose(c, f, cine) {
    const b = beatOf(f), m = cine.mem
    if (b) {
      if (m.cur !== b.A.key) {   // transform: swap in this alien's frame-set (Albedo's re-tag), stand beside the foe
        m.cur = b.A.key
        c._skinAnim = b.A.anim; retagBenReadyArt(c)
        c.x = standX(cine, b.i)
        if (m.opp0) c.facing = m.opp0.x >= cx(c) ? 1 : -1
      }
      const total = (b.A.anim[b.A.act]?.frames) || 1
      pose(c, b.A.act, Math.min(total - 1, Math.floor((b.k / BEAT) * total)))
    } else {
      if (m.cur) { m.cur = null; c._skinAnim = m.skin; c.x = m.x0; c.facing = m.facing }
      pose(c, f < INTRO ? "transform" : "transform", f < INTRO ? Math.min(3, Math.floor(f / 14)) : 2)
    }
  },
  camera(cam, c, opp, f) {
    const T = totalFrames()
    if (f < INTRO) { cam.focusOnFighter(c, 1.9 + 0.7 * ease(f / 40)); cam.targetY = (c.y || 0) + (c.h || 100) * 0.35 }
    else if (f < T - FINALE) { if (opp) cam.focusBetween(c, opp, 1.6); cam.maxPanStep = 140 }
    else { const k = ease((f - (T - FINALE)) / FINALE); if (opp) cam.focusBetween(c, opp, 1.6 - 0.6 * k); else cam.focusOnFighter(c, 1.0) }
    const b = beatOf(f)
    if (cam.shake && b && b.k === 3) cam.shake(6, 5)
    if (cam.shake && f === T - FINALE + 20) cam.shake(26, 24)
  },
  update(f, { snd, opp }, cine) {
    const T = totalFrames(), b = beatOf(f), hit = cine.payload?.hit
    if (b && b.k === 0 && b.i % 3 === 0) { try { snd?.play?.(SFX.TRANSFORMATION) } catch (_) {} }
    if (b && b.k === 3) { try { snd?.play?.(b.i % 2 ? SFX.HIT_HEAVY : SFX.HIT_SPECIAL) } catch (_) {} ; try { hit?.(DMG_BEAT, false) } catch (_) {} }
    if (f === T - FINALE + 20) { try { snd?.play?.(SFX.HIT_ULTIMATE) } catch (_) {} ; try { hit?.(DMG_TOTAL - DMG_BEAT * list().length, true) } catch (_) {} }
    if (f === 0) { try { snd?.play?.(SFX.TRANSFORMATION) } catch (_) {} }
  },
  onEnd(c, cine) {
    const m = cine.mem
    if (m.cur) { c._skinAnim = m.skin; c.x = m.x0; c.facing = m.facing; m.cur = null }
    if (!m.finaleHit && cine.payload?.hit && cine.frame < totalFrames() - FINALE + 20) { /* aborted early: no payoff owed beyond what landed */ }
    c._spriteCastMove = "transform"; c._spriteCastTimer = 18
  },
  draw(ctx, cw, ch, f, c, cam, cine) {
    const T = totalFrames(), b = beatOf(f), o = cine.mem.opp0
    const me = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.45), z = me.z
    const foe = o ? toScreen(cam, cw, ch, o.x, o.y + o.h * 0.45) : null
    if (f < INTRO) {   // the Omnitrix dial: every alien's face spinning around him, slowing, then the slam
      const spin = (1 - ease(f / INTRO)) * 0.35 + 0.02, rot = f * spin * 1.4, n = list().length, R = Math.min(cw, ch) * 0.3
      const g = ctx.createRadialGradient(me.x, me.y, 0, me.x, me.y, R * 1.3); g.addColorStop(0, `rgba(120,255,60,${0.45 * Math.min(1, f / 20)})`); g.addColorStop(1, "rgba(0,60,0,0)")
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch)
      ctx.strokeStyle = "#7cff3a"; ctx.lineWidth = 6; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(me.x, me.y, R, 0, Math.PI * 2); ctx.stroke()
      list().forEach((A, i) => {
        const a = rot + (i / n) * Math.PI * 2, x = me.x + Math.cos(a) * R, y = me.y + Math.sin(a) * R, s = Math.max(26, R * 0.2)
        ctx.globalAlpha = Math.min(1, f / 15); ctx.fillStyle = "#0a1a08"; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, Math.PI * 2); ctx.fill()
        const im = getAlienPortrait(A.key)
        if (im) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, s * 0.58, 0, Math.PI * 2); ctx.clip(); const sc = s * 1.2 / Math.max(im.naturalWidth, im.naturalHeight); ctx.drawImage(im, x - im.naturalWidth * sc / 2, y - im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc); ctx.restore() }
        ctx.strokeStyle = "#7cff3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, Math.PI * 2); ctx.stroke()
      })
      if (f >= INTRO - 8) { ctx.globalAlpha = (f - (INTRO - 8)) / 8; ctx.fillStyle = "#c8ff9a"; ctx.fillRect(0, 0, cw, ch) }
      caption(ctx, cw, ch, "IT'S HERO TIME", `OMNITRIX · ALL ${list().length} ALIENS`, Math.min(1, f / 12))
    }
    if (b) {
      if (b.k < 3) { const fg = ctx.createRadialGradient(me.x, me.y, 0, me.x, me.y, 110 * z); fg.addColorStop(0, `rgba(200,255,150,${0.8 * (1 - b.k / 3)})`); fg.addColorStop(1, "rgba(60,255,20,0)")   // the transformation flash, on him
        ctx.globalAlpha = 1; ctx.fillStyle = fg; ctx.fillRect(me.x - 110 * z, me.y - 110 * z, 220 * z, 220 * z)
        ctx.globalAlpha = 1 - b.k / 3; ctx.strokeStyle = "#e8ffd0"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(me.x, me.y, (20 + b.k * 30) * z, 0, Math.PI * 2); ctx.stroke() }
      if (foe && b.k >= 2) sigFx(ctx, b.A.el, me, foe, b.k - 2, f, z)
      caption(ctx, cw, ch, b.A.name, `${b.i + 1} / ${list().length}`, Math.min(1, b.k / 2 + 0.5))
    }
    if (f >= T - FINALE && foe) {   // finale: Ben, the Omnitrix blast
      const k = f - (T - FINALE)
      if (k < 20) { const t = k / 20; ctx.globalAlpha = 0.9; ctx.strokeStyle = "#7cff3a"; ctx.lineWidth = 14 * z * (1 - t) + 4
        ctx.beginPath(); ctx.moveTo(me.x, me.y); ctx.lineTo(me.x + (foe.x - me.x) * ease(t), me.y + (foe.y - me.y) * ease(t)); ctx.stroke() }
      else { const t = (k - 20) / (FINALE - 20)
        if (t < 0.12) { ctx.globalAlpha = 0.85 * (1 - t / 0.12); ctx.fillStyle = "#e8ffd0"; ctx.fillRect(0, 0, cw, ch) }
        for (let i = 0; i < 3; i++) { const r = Math.max(0, t * 1.4 - i * 0.15); if (r <= 0 || r >= 1) continue; ctx.globalAlpha = 1 - r; ctx.strokeStyle = ["#e8ffd0", "#7cff3a", "#1a8a10"][i]; ctx.lineWidth = 10 * (1 - r) + 2
          ctx.beginPath(); ctx.ellipse(foe.x, foe.y, r * cw * 0.4, r * cw * 0.16, 0, 0, Math.PI * 2); ctx.stroke() }
        const g = ctx.createRadialGradient(foe.x, foe.y, 0, foe.x, foe.y, 140 * z * (1 - t * 0.6)); g.addColorStop(0, `rgba(230,255,200,${1 - t})`); g.addColorStop(1, "rgba(60,255,30,0)"); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch) }
      caption(ctx, cw, ch, "OMNITRIX OVERLOAD", "", Math.min(1, k / 8) * Math.max(0, 1 - Math.max(0, k - 40) / 20))
    }
  },
}

function caption(ctx, cw, ch, big, small, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cw * 0.06, ch * 0.8); ctx.transform(1, 0, -0.18, 1, 0, 0)
  ctx.fillStyle = "#0a1a08"; ctx.fillRect(-12, -ch * 0.06, Math.min(cw * 0.6, big.length * ch * 0.04 + 40), ch * 0.1)
  ctx.fillStyle = "#7cff3a"; ctx.fillRect(-12, ch * 0.04, Math.min(cw * 0.6, big.length * ch * 0.04 + 40), 5)
  ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = `900 ${Math.round(ch * 0.065)}px Impact, "Arial Black", sans-serif`
  ctx.lineWidth = 6; ctx.strokeStyle = "#041004"; ctx.strokeText(big, 0, -ch * 0.01); ctx.fillStyle = "#eaffd8"; ctx.fillText(big, 0, -ch * 0.01)
  if (small) { ctx.font = `800 ${Math.round(ch * 0.026)}px Georgia, serif`; ctx.fillStyle = "#9aff5a"; ctx.fillText(small, 4, -ch * 0.075) }
  ctx.restore()
}

// each alien's signature attack, drawn from the alien (a) to the foe (b); k = frames into the attack (0..9)
function sigFx(ctx, el, a, b, k, f, z) {
  const [c1, c2] = COL[el] || COL.punch, t = k / 9, fade = Math.max(0, 1 - t), s = Math.max(1, z * 0.7), dx = b.x - a.x, dy = b.y - a.y
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  const impact = (r, col) => { const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = fade; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill() }
  switch (el) {
    case "fire": for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.6 * fade; flameTongue(ctx, b.x + (i - 3.5) * 9 * s, b.y + 30 * s, (40 + 40 * hsh(i, f >> 2)) * s * (0.6 + t), 9 * s, 0, f / 3 + i, i % 2 ? c1 : c2) } impact(70 * s, "rgba(255,160,40,0.9)"); break
    case "electric": for (let i = 0; i < 4; i++) { ctx.globalAlpha = fade; bolt(ctx, a.x, a.y, b.x + (hsh(i, 1) - 0.5) * 30 * s, b.y + (hsh(i, 2) - 0.5) * 40 * s, i * 13 + (f >> 1), i ? 2 : 5, i % 2 ? c1 : c2, 10, 30 * s) } impact(50 * s, "rgba(160,240,255,0.9)"); break
    case "goo": for (let i = 0; i < 10; i++) { const an = hsh(i, 3) * Math.PI * 2, d = (10 + 50 * t) * s * (0.5 + hsh(i, 4)); ctx.globalAlpha = fade; ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.arc(b.x + Math.cos(an) * d, b.y + Math.sin(an) * d, (8 + 6 * hsh(i, 5)) * s * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill() } break
    case "speed": for (let i = 0; i < 10; i++) { const y = b.y + (i - 5) * 7 * s; ctx.globalAlpha = fade * 0.8; ctx.fillStyle = i % 2 ? c1 : c2; ctx.fillRect(Math.min(a.x, b.x) - 60 * s, y, Math.abs(dx) + 120 * s, 2 + (i % 3)) } impact(45 * s, "rgba(120,190,255,0.9)"); break
    case "beam": ctx.globalAlpha = fade; ctx.strokeStyle = c1; ctx.lineWidth = 16 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y - 20 * s); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = c2; ctx.lineWidth = 5 * s; ctx.stroke(); impact(55 * s, "rgba(180,255,120,0.9)"); break
    case "ghost": ctx.globalCompositeOperation = "source-over"; for (let i = 0; i < 3; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = i ? c1 : "#e8d8ff"; ctx.lineWidth = (6 - i) * s; ctx.beginPath(); ctx.moveTo(b.x - 50 * s, b.y - 40 * s + i * 22 * s); ctx.quadraticCurveTo(b.x, b.y - 10 * s + i * 22 * s, b.x + 50 * s, b.y + 10 * s + i * 22 * s); ctx.stroke() } break
    case "cosmic": for (let i = 0; i < 24; i++) { const an = hsh(i, 6) * Math.PI * 2, d = 90 * s * t * hsh(i, 7) + 10; ctx.globalAlpha = fade; ctx.fillStyle = i % 3 ? c1 : c2; ctx.fillRect(b.x + Math.cos(an) * d, b.y + Math.sin(an) * d, 3, 3) } impact(90 * s, "rgba(220,230,255,0.9)"); break
    case "wind": for (let i = 0; i < 4; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.x, b.y, (20 + i * 14) * s, (40 + i * 10) * s, f * 0.3 + i, 0.3, 5.2); ctx.stroke() } break
    case "plant": ctx.globalCompositeOperation = "source-over"; for (let i = 0; i < 5; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = i % 2 ? c1 : "#1a6a1a"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(b.x + (i - 2) * 14 * s, b.y + 60 * s); for (let j = 1; j <= 6; j++) ctx.lineTo(b.x + (i - 2) * 14 * s + Math.sin(j + i + f * 0.2) * 16 * s, b.y + 60 * s - j * 18 * s * Math.min(1, t * 2)); ctx.stroke() } break
    case "crystal": for (let i = 0; i < 9; i++) { const an = (i / 9) * Math.PI * 2, d = 20 * s + 60 * s * t, x = b.x + Math.cos(an) * d, y = b.y + Math.sin(an) * d; ctx.globalAlpha = fade; ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * 18 * s, y + Math.sin(an) * 18 * s); ctx.lineTo(x + Math.cos(an + 1.6) * 6 * s, y + Math.sin(an + 1.6) * 6 * s); ctx.lineTo(x - Math.cos(an + 1.6) * 6 * s, y - Math.sin(an + 1.6) * 6 * s); ctx.fill() } break
    case "tech": for (let i = 0; i < 8; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = c1; ctx.lineWidth = 2; const y = b.y - 50 * s + i * 13 * s; ctx.beginPath(); ctx.moveTo(b.x - 50 * s, y); ctx.lineTo(b.x - 10 * s + hsh(i, 8) * 30 * s, y); ctx.lineTo(b.x + hsh(i, 8) * 30 * s, y + 8 * s); ctx.lineTo(b.x + 50 * s, y + 8 * s); ctx.stroke() } impact(40 * s, "rgba(90,255,120,0.8)"); break
    case "quake": ctx.globalCompositeOperation = "source-over"; for (let i = 0; i < 7; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 3; ctx.beginPath(); let x = b.x, y = b.y + 50 * s; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (i - 3) * 12 * s + (hsh(i, j) - 0.5) * 10; y += (hsh(i, j + 9) - 0.5) * 10; ctx.lineTo(x, y) } ctx.stroke() } ctx.globalCompositeOperation = "lighter"; impact(80 * s, "rgba(255,220,160,0.7)"); break
    case "ice": for (let i = 0; i < 12; i++) { const an = hsh(i, 10) * Math.PI * 2, d = 50 * s * t + 8; ctx.globalAlpha = fade; ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(an) * d * 1.4, b.y + Math.sin(an) * d * 1.4); ctx.stroke() } ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = c1; ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); impact(55 * s, "rgba(200,240,255,0.9)"); break
    case "water": ctx.globalAlpha = fade; ctx.strokeStyle = c1; ctx.lineWidth = 14 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2, a.y - 40 * s, b.x, b.y); ctx.stroke(); for (let i = 0; i < 10; i++) { const an = hsh(i, 11) * Math.PI * 2, d = 60 * s * t; ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(b.x + Math.cos(an) * d, b.y + Math.sin(an) * d, 4 * s, 0, Math.PI * 2); ctx.fill() } break
    case "sonic": for (let i = 0; i < 4; i++) { const r = ((t + i * 0.25) % 1); ctx.globalAlpha = (1 - r) * fade; ctx.strokeStyle = c1; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x + dx * r, a.y + dy * r, (14 + 30 * r) * s, -1, 1); ctx.stroke() } impact(40 * s, "rgba(200,180,255,0.8)"); break
    case "claw": ctx.globalCompositeOperation = "source-over"; for (let i = 0; i < 3; i++) { ctx.globalAlpha = fade; ctx.strokeStyle = i === 1 ? c2 : c1; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(b.x - 40 * s + i * 16 * s, b.y - 50 * s); ctx.lineTo(b.x - 10 * s + i * 16 * s, b.y + 40 * s); ctx.stroke() } break
    default: impact(70 * s, "rgba(255,230,120,0.95)"); for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; ctx.globalAlpha = fade; ctx.strokeStyle = c2; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(an) * 14 * s, b.y + Math.sin(an) * 14 * s); ctx.lineTo(b.x + Math.cos(an) * (30 + 40 * t) * s, b.y + Math.sin(an) * (30 + 40 * t) * s); ctx.stroke() }
  }
  ctx.restore()
}

registerUltPreroll("benAlienSequence", SCRIPT)
export const BEN_ALIEN_SEQUENCE_INFO = () => ({ aliens: list().map(a => a.key), total: totalFrames(), dmgBeat: DMG_BEAT, dmgTotal: DMG_TOTAL })
