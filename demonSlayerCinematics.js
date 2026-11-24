// demonSlayerCinematics.js — cinematic PRE-ROLLS for the Demon Slayer ultimates whose gameplay is a live move
// (Zenitsu's Godspeed dash-through, Nezuko's Kekijutsu Baketsu barrage and her Demon Transformation).
//
// How it plugs in (no gameplay change): abilities.js calls startDemonSlayerPreroll(kind, caster, opponent) right after the
// real move is set up (one hook line each, tools/ds/hooks.py). Combat then FREEZES for the pre-roll — the freeze rides on
// the Rengoku cinematic's gate (rengokuFlameExplosionCinematic.js delegates isActive/update/draw/clear here), so game.js
// needs no new wiring. While frozen, every timer of the real move is paused too (startup, pending blink, i-frames). When
// the pre-roll ends the move resumes exactly where it was, and a render-only AFTERGLOW sells the hit (the lightning path,
// the exploding-blood fire).
//
//   zenitsu      SLEEP → 雷の呼吸 · 壱ノ型 · 霹靂一閃 · 神速 → blackout; then live: the blink + a bolt along his path.
//   nezuko       heartbeat, demon markings, glowing eyes → 血鬼術 · 爆血 (white flash, pink blood-fire); then live: pink fire on every punch.
//   nezukoDemon  鬼化 "DEMON FORM": markings crawl, the transformation flash.
// Deterministic (frame-indexed). Imports sound.js + dsCineKit.js only (no cycle).

import { sound as globalSound, SFX } from "./sound.js"
import { ease, cx, hsh, toScreen, camOpen, camRestore, pose, drawCalligraphy, drawLetterbox, drawVignette, bolt, flameTongue } from "./dsCineKit.js"

const SCRIPTS = {
  zenitsu: { total: 200, words: [[70, "雷の呼吸", "THUNDER BREATHING"], [104, "壱ノ型", "FIRST FORM"], [134, "霹靂一閃", "THUNDERCLAP AND FLASH"], [164, "神速", "GODSPEED"]],
    accent: "#ffd21a", ink: "#fff6d0", tint: "10,8,24" },
  nezuko: { total: 160, words: [[64, "血鬼術", "BLOOD DEMON ART"], [100, "爆血", "EXPLODING BLOOD"]], accent: "#ff3a8a", ink: "#ffe4ef", tint: "36,0,14" },
  nezukoDemon: { total: 120, words: [[50, "鬼化", "DEMON FORM"]], accent: "#ff3a8a", ink: "#ffe4ef", tint: "36,0,14" },
}

// other modules (narutoUltCinematics.js) register their own scripts: { total, words, accent, ink, tint, pick(c)→{words}|null,
//   camera(cam,c,opp,f), draw(ctx,cw,ch,f,c,cam), restoreCast }
const EXT = {}
export function registerUltPreroll(kind, script) { EXT[kind] = script }

const cine = { active: false, kind: null, S: null, words: null, frame: 0, caster: null, opponent: null, _cam: null, saved: null, x0: 0 }
let camRef = null
const glow = { kind: null, caster: null, opponent: null, t: 0, x0: 0, lastX: 0, blinkAt: -1, burns: [] }   // render-only afterglow

export function startDemonSlayerPreroll(kind, caster, opponent, payload = null) {
  const S = SCRIPTS[kind] || EXT[kind]
  if (!S || !caster || cine.active) return false
  const v = S.pick ? S.pick(caster) : null
  if (S.pick && !v) return false
  Object.assign(cine, { active: true, kind, S, words: v?.words || S.words, frame: 0, caster, opponent: opponent || null, _cam: null, saved: null, x0: caster.x || 0 })
  cine.saved0 = { cast: caster._spriteCastMove || null, castT: caster._spriteCastTimer || 0 }
  cine.payload = payload; cine.mem = {}
  try { S.onStart?.(caster, cine) } catch (_) {}
  return true
}
export function isDemonSlayerPrerollActive() { return cine.active }
export function getDemonSlayerPrerollStatus() {
  return { active: cine.active, kind: cine.kind, frame: cine.frame, total: cine.S?.total ?? 0, casterKey: cine.caster?.rosterKey ?? null, glow: glow.kind, glowT: glow.t }
}

function poseFor(f) {
  const c = cine.caster
  if (cine.S.pose) { cine.S.pose(c, f, cine); return }
  if (cine.S.camera) { pose(c, cine.saved0.cast || "idle", 0); return }   // registered scripts hold the ult's own cast pose
  if (cine.kind === "zenitsu") pose(c, "zenUltimate", 0)
  else if (cine.kind === "nezuko") pose(c, "nezukoTransform", f < 100 ? Math.min(2, Math.floor(f / 30)) : f < 140 ? 3 + Math.floor((f - 100) / 8) : 8)
  else pose(c, "nezukoTransform", f < 50 ? Math.min(2, Math.floor(f / 18)) : f < 90 ? 3 + Math.floor((f - 50) / 8) : 8 + ((f >> 3) & 1))
}

export function updateDemonSlayerPreroll(ctx = {}) {
  if (!cine.active) return
  const cam = ctx.camera || null, snd = ctx.sound || globalSound
  const f = cine.frame, c = cine.caster, opp = cine.opponent, T = cine.S.total
  if (f === 0 && cam) { cine._cam = cam; camRef = cam; cine.saved = camOpen(cam, 3.0) }
  poseFor(f)
  if (cam && c) {
    const head = () => { cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
    if (cine.S.camera) cine.S.camera(cam, c, opp, f)
    else if (cine.kind === "zenitsu") {
      if (f < 134) { cam.focusOnFighter(c, 2.0 + 0.9 * ease(f / 90)); head() }
      else if (opp) cam.focusBetween(c, opp, 1.25)
      if (cam.shake && f >= 70 && f % 10 === 0) cam.shake(2 + f / 40, 5)
    } else {
      if (f < T - 30) { cam.focusOnFighter(c, 2.0 + 0.8 * ease(f / 60)); head() }
      else if (opp) cam.focusBetween(c, opp, 1.2); else cam.focusOnFighter(c, 1.2)
      if (cam.shake && f % 30 === 0 && f < 100) cam.shake(4, 6)                      // heartbeat
      if (cam.shake && f === (cine.kind === "nezuko" ? 100 : 50)) cam.shake(18, 16)  // the ignition
    }
  }
  if (cine.S.update) { try { cine.S.update(f, { cam, snd, opp, c }, cine) } catch (_) {} }
  if (cine.kind === "zenitsu" && f === 70) { try { snd?.play?.(SFX.HIT_SPECIAL) } catch (_) {} }
  if (cine.kind !== "zenitsu" && f === (cine.kind === "nezuko" ? 100 : 50)) { try { snd?.play?.(SFX.TRANSFORMATION) } catch (_) {} }
  cine.frame++
  if (cine.frame >= T) endPreroll(true)
}

function endPreroll(toGlow) {
  const c = cine.caster
  camRestore(cine._cam, cine.saved)
  if (c) {
    pose(c, null)
    try { cine.S?.onEnd?.(c, cine) } catch (_) {}
    if (cine.S?.restoreCast && cine.saved0?.cast) { c._spriteCastMove = cine.saved0.cast; c._spriteCastTimer = cine.saved0.castT }   // the live ult resumes in its own pose
    if (cine.kind === "nezukoDemon") { c._spriteCastMove = "nezukoTransform"; c._spriteCastTimer = 6 }
  }
  if (toGlow && c && !cine.S?.camera) Object.assign(glow, { kind: cine.kind, caster: c, opponent: cine.opponent, t: 0, x0: cine.x0, lastX: c.x || 0, blinkAt: -1, burns: [] })
  Object.assign(cine, { active: false, kind: null, S: null, words: null, frame: 0, caster: null, opponent: null, _cam: null, saved: null })
}
export function clearDemonSlayerPreroll() {
  if (cine.active) endPreroll(false)
  Object.assign(glow, { kind: null, caster: null, opponent: null, t: 0, burns: [] })
}

// ─────────────────────────────────────────────────────────────────
// DRAW — the pre-roll overlay while frozen; the afterglow once combat resumes (render-only)
// ─────────────────────────────────────────────────────────────────
export function drawDemonSlayerCinematics(ctx, canvas) {
  if (!ctx || (!cine.active && !glow.kind)) return
  const cam = camRef
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  try {
    if (cine.active) drawPreroll(ctx, cw, ch, cine._cam || cam)
    else if (glow.kind) drawGlow(ctx, cw, ch, cam)
  } finally { ctx.restore() }
}

function drawPreroll(ctx, cw, ch, cam) {
  const f = cine.frame, c = cine.caster, S = cine.S, T = S.total
  const head = toScreen(cam, cw, ch, cx(c) + (c.facing || 1) * 6, (c.y || 0) + (c.h || 100) * 0.18), z = head.z
  const feet = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100))
  if (S.draw) {
    drawVignette(ctx, cw, ch, head.x, head.y, Math.min(0.75, 0.35 + f / 160), S.tint)
    S.draw(ctx, cw, ch, f, c, cam, cine)
  } else if (cine.kind === "zenitsu") {
    drawVignette(ctx, cw, ch, head.x, head.y, Math.min(0.85, 0.5 + f / 200), S.tint)
    if (f < 70) {   // asleep: z's drift up
      ctx.textAlign = "center"; ctx.font = `900 ${Math.round(26 * z * 0.6 + 8)}px Georgia, serif`; ctx.lineWidth = 4; ctx.strokeStyle = "#0c0410"
      for (let i = 0; i < 3; i++) { const k = ((f + i * 22) % 66) / 66; ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = "#fff6d0"; const zx = head.x + (14 + k * 40) * z * 0.6, zy = head.y - (14 + k * 70) * z * 0.6; ctx.strokeText(i ? "z" : "Z", zx, zy); ctx.fillText(i ? "z" : "Z", zx, zy) }
    } else {
      if (f < 76) { ctx.globalAlpha = 1 - (f - 70) / 6; ctx.fillStyle = "#fff8c0"; ctx.fillRect(0, 0, cw, ch) }   // the eyes open
      ctx.globalCompositeOperation = "lighter"
      const au = Math.min(1, (f - 70) / 40), ag = ctx.createRadialGradient(head.x, head.y + 30 * z * 0.6, 0, head.x, head.y + 30 * z * 0.6, 90 * z * 0.6)
      ag.addColorStop(0, `rgba(255,220,60,${0.45 * au})`); ag.addColorStop(1, "rgba(255,180,0,0)"); ctx.globalAlpha = 1; ctx.fillStyle = ag; ctx.fillRect(0, 0, cw, ch)
      const n = Math.min(14, 4 + Math.floor((f - 70) / 8))
      for (let i = 0; i < n; i++) {   // arcs crawl over his body and along the ground
        const s = i * 31 + (f >> 2), a = hsh(s, 1) * Math.PI * 2, r = (30 + 40 * hsh(s, 2)) * z * 0.6
        const x1 = head.x + Math.cos(a) * r * 0.3, y1 = head.y + 30 * z * 0.6, x2 = head.x + Math.cos(a) * r * 1.6, y2 = head.y + Math.sin(a) * r * 1.2 + 30 * z * 0.6
        ctx.globalAlpha = 0.5; bolt(ctx, x1, y1, x2, y2, s, 7, "#ffb000", 7, 22 * z * 0.5); ctx.globalAlpha = 1; bolt(ctx, x1, y1, x2, y2, s, 2.5, i % 2 ? "#ffffff" : "#fff28a", 7, 22 * z * 0.5)
      }
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(f * 0.5); ctx.fillStyle = "#ffe24a"; ctx.fillRect(feet.x - 60 * z, feet.y - 2, 120 * z, 3)
      if (f >= 134 && cine.opponent) {   // the path he will take, pre-lit faintly along the ground
        const o = toScreen(cam, cw, ch, cx(cine.opponent) + (c.facing || 1) * 90, (c.y || 0) + (c.h || 100) * 0.6)
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(f); bolt(ctx, feet.x, feet.y - 30 * z, o.x, o.y, f >> 2, 2, "#fff6a0", 18, 20)
      }
      ctx.globalCompositeOperation = "source-over"
    }
    if (f >= T - 16) { ctx.globalAlpha = Math.min(1, (f - (T - 16)) / 8) * 0.92; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch) }   // blackout before the flash
  } else {
    const ign = cine.kind === "nezuko" ? 100 : 50
    const beat = f < ign ? Math.pow(Math.max(0, Math.sin((f % 30) / 30 * Math.PI)), 6) : 0
    drawVignette(ctx, cw, ch, head.x, head.y, Math.min(0.8, 0.45 + f / 200) + beat * 0.15, S.tint)
    // demon markings: pink vines creep in from the frame edges
    const grow = ease(Math.min(1, f / ign))
    ctx.strokeStyle = "#c0205a"; ctx.lineCap = "round"
    for (let i = 0; i < 14; i++) {
      const edge = i % 4, t0 = hsh(i, 1)
      let x = edge === 0 ? 0 : edge === 1 ? cw : t0 * cw, y = edge === 2 ? 0 : edge === 3 ? ch : t0 * ch
      ctx.globalAlpha = 0.55; ctx.lineWidth = 3 + 3 * hsh(i, 2); ctx.beginPath(); ctx.moveTo(x, y)
      const steps = Math.floor(12 * grow)
      for (let s = 0; s < steps; s++) { x += (head.x - x) * 0.09 + (hsh(i, s + 9) - 0.5) * 40; y += (head.y - y) * 0.09 + (hsh(i, s + 40) - 0.5) * 40; ctx.lineTo(x, y) }
      ctx.stroke()
    }
    if (f >= ign * 0.5) {   // the eyes
      const a = Math.min(1, (f - ign * 0.5) / 12)
      for (const dx of [-4, 4]) { const g = ctx.createRadialGradient(head.x + dx * z, head.y, 0, head.x + dx * z, head.y, 10 * z); g.addColorStop(0, `rgba(255,120,190,${a})`); g.addColorStop(1, "rgba(255,0,90,0)"); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(head.x + dx * z - 12 * z, head.y - 12 * z, 24 * z, 24 * z) }
    }
    if (f < ign && cine.kind === "nezuko") {   // blood drops gather around her
      for (let i = 0; i < 12; i++) { const a = hsh(i, 5) * Math.PI * 2 + f * 0.02, r = (120 - 70 * grow) * z * 0.6; ctx.globalAlpha = grow; ctx.fillStyle = "#d0103c"
        ctx.beginPath(); ctx.arc(head.x + Math.cos(a) * r, head.y + 30 * z * 0.6 + Math.sin(a) * r * 0.6, 3 * z * 0.6 + 1, 0, Math.PI * 2); ctx.fill() }
    }
    if (f >= ign) {   // EXPLODING BLOOD: white flash, then pink fire around her
      const k = f - ign
      if (k < 8) { ctx.globalAlpha = 0.85 * (1 - k / 8); ctx.fillStyle = "#fff0f6"; ctx.fillRect(0, 0, cw, ch) }
      // pink blood-fire: layered tongues (deep crimson → pink → pale core), flickering, behind-to-front
      const rise = Math.min(1, k / 10)
      for (let L = 0; L < 3; L++) for (let i = 0; i < 9; i++) {
        const x = feet.x + (i - 4) * (20 - L * 4) * z * 0.8, fl = 0.75 + 0.25 * Math.sin(f * 0.4 + i * 1.7 + L)
        const h = (110 - L * 24 + 60 * hsh(i, 6 + L)) * z * 0.8 * rise * fl, w = (18 - L * 4) * z * 0.8
        ctx.globalAlpha = [0.55, 0.5, 0.6][L]; flameTongue(ctx, x, feet.y, h, w, Math.sin((f + i * 7) / 6) * 8 * z * 0.6, f / 4 + i, ["#a0103e", "#ff3a8a", "#ffd0e4"][L])
      }
    }
  }
  drawCalligraphy(ctx, cw, ch, f, cine.words || S.words, head.x, { fade: f > T - 12 ? Math.max(0, (T - f) / 12) : 1, accent: S.accent, ink: S.ink })
  drawLetterbox(ctx, cw, ch, f, T)
}

function drawGlow(ctx, cw, ch, cam) {
  const c = glow.caster
  if (!c) { glow.kind = null; return }
  const t = glow.t++
  if (glow.kind === "zenitsu") {
    // detect the blink (render-side: his x jumps), then draw the bolt along the path for a moment
    if (glow.blinkAt < 0 && Math.abs((c.x || 0) - glow.lastX) > 60) glow.blinkAt = t
    glow.lastX = c.x || 0
    if (glow.blinkAt < 0) { if (t > 40) glow.kind = null; return }
    const k = t - glow.blinkAt
    if (k > 45) { glow.kind = null; return }
    const y = (c.y || 0) + (c.h || 100) * 0.55, w = (c.w || 60) / 2
    const a = toScreen(cam, cw, ch, glow.x0 + w, y), b = toScreen(cam, cw, ch, (c.x || 0) + w, y)
    if (k < 5) { ctx.globalAlpha = 0.9 * (1 - k / 5); ctx.fillStyle = "#fffbe0"; ctx.fillRect(0, 0, cw, ch) }
    ctx.globalCompositeOperation = "lighter"
    const fade = Math.max(0, 1 - k / 45)
    ctx.globalAlpha = fade * 0.6; bolt(ctx, a.x, a.y, b.x, b.y, 7, 22 * a.z, "#ffb000", 22, 34 * a.z)
    ctx.globalAlpha = fade; bolt(ctx, a.x, a.y, b.x, b.y, 7, 8 * a.z, "#fff28a", 22, 34 * a.z)
    ctx.globalAlpha = fade; bolt(ctx, a.x, a.y, b.x, b.y, 7, 3 * a.z, "#ffffff", 22, 34 * a.z)
    for (let i = 0; i < 6; i++) { const s = i * 13 + (k >> 1), p = hsh(s, 3); ctx.globalAlpha = fade * 0.8
      bolt(ctx, a.x + (b.x - a.x) * p, a.y, a.x + (b.x - a.x) * p + (hsh(s, 4) - 0.5) * 80 * a.z, a.y - 60 * a.z * hsh(s, 5), s, 2, "#fff6a0", 5, 14) }
    ctx.globalCompositeOperation = "source-over"
  } else if (glow.kind === "nezuko") {
    // pink blood-fire on her fists through the barrage + finisher, and on the foe after every connect
    const atk = c.currentAttack?.name || c.currentMove || ""
    const live = /^nezukoUlt1[ab]$/.test(atk)
    const o = glow.opponent
    if (live && o && (o.hitstun || 0) > 0 && t % 4 === 0) glow.burns.push({ t, x: cx(o) + (hsh(t, 1) - 0.5) * (o.w || 60), y: (o.y || 0) + (o.h || 100) * (0.25 + hsh(t, 2) * 0.5) })
    if (!live && t > 20 && !glow.burns.some(b => t - b.t < 50)) { glow.kind = null; return }
    if (t > 400) { glow.kind = null; return }
    ctx.globalCompositeOperation = "lighter"
    if (live) { const fist = toScreen(cam, cw, ch, cx(c) + (c.facing || 1) * (c.w || 60) * 0.7, (c.y || 0) + (c.h || 100) * 0.4)
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.5; flameTongue(ctx, fist.x + (i - 2) * 6 * fist.z, fist.y + 10 * fist.z, (24 + 14 * hsh(t + i, 3)) * fist.z, 6 * fist.z, 0, t / 3 + i, i % 2 ? "#ff2a7a" : "#ffb0d4") } }
    for (const b of glow.burns) { const k = t - b.t; if (k > 50) continue; const p = toScreen(cam, cw, ch, b.x, b.y)
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.55 * (1 - k / 50); flameTongue(ctx, p.x + (i - 1) * 8 * p.z, p.y + 10 * p.z, (30 + 20 * hsh(b.t + i, 4)) * p.z * (1 - k / 70), 8 * p.z, 0, (t + i * 5) / 3, i % 2 ? "#ff2a7a" : "#ff8ac0") } }
    ctx.globalCompositeOperation = "source-over"
  } else glow.kind = null
}
if (typeof window !== "undefined") window.__dsPrerollStatus = getDemonSlayerPrerollStatus   // harness probe (read-only)
