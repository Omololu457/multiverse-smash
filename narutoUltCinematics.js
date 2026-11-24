// narutoUltCinematics.js — cinematic PRE-ROLLS for the Naruto ultimates that were live moves with only a camera shake
// (Sakura, Hinata, Sasuke Sensei's Kirin, Six Paths of Pain, Adult Sasuke's Rinnegan ults, Naruto Hokage's and Naruto
// Seventh's Tailed Beast Bombs). Same engine and contract as the Zenitsu / Nezuko pre-rolls (demonSlayerCinematics.js):
// abilities.triggerUltimate starts one right after the real ult is set up (one hook per case, tools/ds/hooks.py); combat
// freezes for the pre-roll (every timer of the real ult pauses with it), then the ult plays exactly as before.
//
// Shot list (150 f):  FOCUS [0,45) tight on the caster, chakra aura rising, particles gathering
//                     EYE   [45,80) the dojutsu cut-in (Byakugan / Sharingan / Rinnegan) — or a chakra burst — + the first word
//                     CALL  [80,120) the jutsu's name slams in; the aura peaks
//                     WHIP  [120,150) a fast pan to the opponent, speed lines; then the live ult.
// Render-only + camera; deterministic (frame-indexed). Imports dsCineKit.js + demonSlayerCinematics.js (no cycle).

import { ease, cx, hsh, toScreen, flameTongue, bolt } from "./dsCineKit.js"
import { registerUltPreroll } from "./demonSlayerCinematics.js"

const T = 150, T_EYE = 45, T_CALL = 80, T_WHIP = 120

const castOf = f => f?._spriteCastMove || f?.currentAttack?.name || f?.currentMove || ""

const DEFS = {
  sakura: { aura: ["#ff7eb6", "#ffd0e4"], particle: "petals", eye: null, seal: true, accent: "#ff5aa0", ink: "#ffe8f2", tint: "40,6,24",
    words: [[50, "百豪の術", "STRENGTH OF A HUNDRED SEAL"], [92, "大地の叫び", "DAICHI NO SAKEBI"]] },
  hinata: { aura: ["#9a8cff", "#e6e0ff"], particle: "lion", eye: "byakugan", accent: "#b6a8ff", ink: "#f0ecff", tint: "14,10,36",
    words: [[50, "白眼", "BYAKUGAN"], [86, "柔拳", "GENTLE FIST"], [104, "双獅拳", "TWIN LION FISTS"]] },
  sasuke_sensei: { aura: ["#4aa8ff", "#e6f4ff"], particle: "lightning", eye: "sharingan", accent: "#6ac0ff", ink: "#eef6ff", tint: "6,10,30",
    pick: f => f._spriteCastMove === "ssKirinCast",   // only Kirin (the _ssKirinUlt flag is never cleared, so it can't gate)
    words: [[50, "写輪眼", "SHARINGAN"], [86, "雷遁", "LIGHTNING STYLE"], [104, "麒麟", "KIRIN"]] },
  six_paths_pain: { aura: ["#b07cff", "#f0e6ff"], particle: "ripple", eye: "rinnegan", accent: "#c08aff", ink: "#f4eeff", tint: "16,6,30",
    words: [[50, "輪廻眼", "RINNEGAN"], [86, "ペイン六道", "SIX PATHS OF PAIN"]] },
  sasuke_adult: { aura: ["#8a5cff", "#efe6ff"], particle: "ripple", eye: "rinnegan", accent: "#a67cff", ink: "#f4eeff", tint: "12,6,30",
    pick: f => ({ chibakuTensei: [[50, "輪廻眼", "RINNEGAN"], [92, "地爆天星", "CHIBAKU TENSEI"]],
                  shinraTensei:  [[50, "輪廻眼", "RINNEGAN"], [92, "神羅天征", "SHINRA TENSEI"]],
                  banshouTenin:  [[50, "輪廻眼", "RINNEGAN"], [92, "万象天引", "BANSHŌ TEN'IN"]] })[castOf(f)] || null },
  naruto_hokage: { aura: ["#ff8a1a", "#ffe0a0"], particle: "chakra", eye: "kurama", accent: "#ff8a1a", ink: "#fff1dc", tint: "30,10,0",
    words: [[50, "九喇嘛", "KURAMA"], [92, "尾獣玉", "TAILED BEAST BOMB"]] },
  naruto_seventh: { aura: ["#ff8a1a", "#ffe0a0"], particle: "chakra", eye: "kurama", accent: "#ff8a1a", ink: "#fff1dc", tint: "30,10,0",
    pick: f => /bijuu/i.test(castOf(f)),
    words: [[50, "九喇嘛", "KURAMA"], [92, "超大玉尾獣玉", "GIANT TAILED BEAST BOMB"]] },
}

// ── the dojutsu cut-in: a letterboxed band across the middle with one huge eye opening, its pattern turning ──
function drawEye(ctx, cw, ch, kind, k, f) {
  const bandH = ch * 0.26 * ease(Math.min(1, k * 3)), y0 = ch * 0.37
  ctx.globalAlpha = 1; ctx.fillStyle = "#07040c"; ctx.fillRect(0, y0 + ch * 0.13 - bandH / 2, cw, bandH)
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0 + ch * 0.13 - bandH / 2, cw, bandH); ctx.clip()
  const ex = cw / 2, ey = y0 + ch * 0.13, ew = cw * 0.3, open = ease(Math.min(1, Math.max(0, (k - 0.15) * 2.2))), eh = ch * 0.1 * open
  ctx.fillStyle = kind === "byakugan" ? "#eae6f4" : "#f4efe8"
  ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey - eh * 2, ex + ew, ey); ctx.quadraticCurveTo(ex, ey + eh * 2, ex - ew, ey); ctx.fill()
  ctx.save(); ctx.clip()
  const r = ch * 0.085, spin = f * 0.08
  if (kind === "byakugan") {   // pale iris, veins bulging out to the sides
    ctx.fillStyle = "#d8d4ea"; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#9a90c0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, r * 0.4, 0, Math.PI * 2); ctx.stroke()
  } else if (kind === "sharingan") {
    ctx.fillStyle = "#c0101a"; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#300004"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, r * 0.62, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = "#120002"; ctx.beginPath(); ctx.arc(ex, ey, r * 0.2, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 3; i++) { const a = spin + i * Math.PI * 2 / 3, tx = ex + Math.cos(a) * r * 0.62, ty = ey + Math.sin(a) * r * 0.62
      ctx.beginPath(); ctx.arc(tx, ty, r * 0.13, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(tx, ty - r * 0.13); ctx.quadraticCurveTo(tx + Math.cos(a + 1.6) * r * 0.35, ty + Math.sin(a + 1.6) * r * 0.35, tx + Math.cos(a + 0.9) * r * 0.08, ty + Math.sin(a + 0.9) * r * 0.08); ctx.fill() }
  } else if (kind === "rinnegan") {
    ctx.fillStyle = "#a88ad8"; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#2a1640"; ctx.lineWidth = 2.5
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(ex, ey, r * (0.2 + i * 0.19), 0, Math.PI * 2); ctx.stroke() }
    ctx.fillStyle = "#2a1640"; ctx.beginPath(); ctx.arc(ex, ey, r * 0.12, 0, Math.PI * 2); ctx.fill()
  } else {   // kurama: an orange slit-pupil fox eye
    ctx.fillStyle = "#ff8a1a"; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#1a0800"; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.16, r * 0.8, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  if (kind === "byakugan") { ctx.strokeStyle = "rgba(150,140,200,0.9)"; ctx.lineWidth = 3
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(ex + s * ew * 1.02, ey + (i - 1.5) * 8); for (let j = 1; j < 6; j++) ctx.lineTo(ex + s * (ew * 1.02 + j * 22), ey + (i - 1.5) * 8 + (hsh(i, j) - 0.5) * 20); ctx.stroke() } }
  ctx.restore()
}

function makeScript(key, D) {
  return {
    total: T, accent: D.accent, ink: D.ink, tint: D.tint, words: D.words, restoreCast: true,
    pick: c => { if (!D.pick) return { words: D.words }; const v = D.pick(c); return v ? { words: Array.isArray(v) ? v : D.words } : null },
    camera(cam, c, opp, f) {
      if (f < T_EYE) { cam.focusOnFighter(c, 1.8 + 0.9 * ease(f / 40)); cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
      else if (f < T_WHIP) cam.focusOnFighter(c, 2.3)
      else { if (opp) { cam.focusOnFighter(opp, 1.5); cam.maxPanStep = 200 } else cam.focusOnFighter(c, 1.3) }
      if (cam.shake && f === T_CALL) cam.shake(10, 10)
      if (cam.shake && f >= T_CALL && f < T_WHIP && f % 12 === 0) cam.shake(3, 5)
    },
    draw(ctx, cw, ch, f, c, cam) {
      const body = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.5), feet = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100)), z = body.z
      const head = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.16)
      const pow = f < T_CALL ? ease(f / T_CALL) : 1
      // chakra aura: flame tongues rising from the feet around the body
      ctx.globalCompositeOperation = "lighter"
      for (let L = 0; L < 2; L++) for (let i = 0; i < 9; i++) {
        const x = feet.x + (i - 4) * 9 * z, fl = 0.7 + 0.3 * Math.sin(f * 0.35 + i * 1.3 + L)
        ctx.globalAlpha = (L ? 0.28 : 0.2) * pow; flameTongue(ctx, x, feet.y, (60 + 40 * hsh(i, L)) * z * fl * (0.6 + 0.4 * pow), (10 - L * 3) * z, Math.sin((f + i * 9) / 8) * 6 * z, f / 5 + i, D.aura[L])
      }
      ctx.globalCompositeOperation = "source-over"
      if (D.seal && f > 20) {   // the Strength of a Hundred seal opens on her forehead, the markings spread
        const a = Math.min(1, (f - 20) / 20); ctx.globalAlpha = a; ctx.fillStyle = "#8a3cff"
        ctx.beginPath(); ctx.moveTo(head.x, head.y - 9 * z * 0.5); ctx.lineTo(head.x + 4 * z * 0.5, head.y - 5 * z * 0.5); ctx.lineTo(head.x, head.y - 1 * z * 0.5); ctx.lineTo(head.x - 4 * z * 0.5, head.y - 5 * z * 0.5); ctx.fill()
        ctx.strokeStyle = "#6a1cff"; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, l = 30 * z * 0.5 * ease(a); ctx.beginPath(); ctx.moveTo(head.x, head.y - 5 * z * 0.5); ctx.lineTo(head.x + Math.cos(an) * l, head.y - 5 * z * 0.5 + Math.sin(an) * l * 1.6); ctx.stroke() }
      }
      // particles
      for (let i = 0; i < 26; i++) {
        const a0 = hsh(i, 3) * Math.PI * 2 + f * (0.02 + hsh(i, 4) * 0.03), r = (220 - 150 * pow) * z * 0.5 + 18 * z * 0.5
        const x = body.x + Math.cos(a0) * r, y = body.y + Math.sin(a0) * r * 0.7
        ctx.globalAlpha = 0.85 * Math.min(1, f / 15)
        if (D.particle === "petals") { ctx.fillStyle = i % 2 ? "#ffb8d6" : "#ff7eb6"; ctx.beginPath(); ctx.ellipse(x, y, 6 * Math.max(1, z * 0.5), 3 * Math.max(1, z * 0.5), a0 + f * 0.1, 0, Math.PI * 2); ctx.fill() }
        else if (D.particle === "lightning") { if (i % 3 === 0) { ctx.globalCompositeOperation = "lighter"; bolt(ctx, body.x, body.y, x, y, i * 7 + (f >> 2), 2, i % 2 ? "#e6f4ff" : "#4aa8ff", 6, 16); ctx.globalCompositeOperation = "source-over" } }
        else if (D.particle === "lion") { ctx.fillStyle = i % 2 ? "#c8beff" : "#7c6cff"; ctx.fillRect(x, y, 4, 4) }
        else if (D.particle === "chakra") { ctx.fillStyle = i % 2 ? "#ffd27a" : "#ff6a00"; ctx.beginPath(); ctx.arc(x, y, 3 * Math.max(1, z * 0.5), 0, Math.PI * 2); ctx.fill() }
      }
      if (D.particle === "ripple" || D.particle === "lion") {   // Rinnegan ripples / Gentle-Fist chakra rings around the body
        for (let i = 0; i < 3; i++) { const t = ((f + i * 20) % 60) / 60; ctx.globalAlpha = (1 - t) * 0.6 * pow; ctx.strokeStyle = D.aura[0]; ctx.lineWidth = 3
          ctx.beginPath(); ctx.ellipse(body.x, body.y, (30 + t * 160) * z * 0.6, (12 + t * 60) * z * 0.6, 0, 0, Math.PI * 2); ctx.stroke() }
      }
      if (D.particle === "lion" && f >= T_CALL) {   // the two lion heads of chakra form on her fists
        for (const s of [-1, 1]) { const lx = body.x + s * 34 * z * 0.6 + (c.facing || 1) * 20 * z * 0.6, ly = body.y - 6 * z * 0.6, lr = 26 * z * 0.6 * ease(Math.min(1, (f - T_CALL) / 14))
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 1.6 + 1); g.addColorStop(0, "rgba(230,224,255,0.9)"); g.addColorStop(1, "rgba(120,100,255,0)"); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, lr * 1.6 + 1, 0, Math.PI * 2); ctx.fill() }
      }
      // the eye cut-in (or a chakra burst)
      if (f >= T_EYE && f < T_CALL) {
        const k = (f - T_EYE) / (T_CALL - T_EYE)
        if (D.eye) { const out = k > 0.85 ? (1 - k) / 0.15 : 1; ctx.save(); ctx.globalAlpha = out; drawEye(ctx, cw, ch, D.eye, k, f); ctx.restore() }
      }
      if (f === T_CALL || f === T_CALL + 1) { ctx.globalAlpha = 0.6; ctx.fillStyle = D.aura[1]; ctx.fillRect(0, 0, cw, ch) }
      if (f >= T_WHIP && f < T_WHIP + 14) { ctx.globalAlpha = 0.5 * (1 - (f - T_WHIP) / 14); ctx.fillStyle = "#ffffff"; for (let i = 0; i < 24; i++) ctx.fillRect(0, hsh(i, f >> 1) * ch, cw, 1 + (i % 3)) }
    },
  }
}

for (const [k, D] of Object.entries(DEFS)) registerUltPreroll(k, makeScript(k, D))
export const NARUTO_ULT_PREROLLS = Object.keys(DEFS)
