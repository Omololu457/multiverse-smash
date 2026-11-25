// dbStoryboard.js — STORYBOARD ult openers for the Dragon Ball roster (Goku ×7 forms, Vegeta, Dark Vegeta, Goku Black, Beerus).
// Same contract as narutoStoryboard.js (whose toolkit this reuses): a frozen multi-shot cut-in sequence, then the ultimate
// exactly as before.
//   Goku     base: "everyone, lend me your energy" — light rises from the earth into the Spirit Bomb over his hands
//            SSJ / God / Blue: the chant — KA · ME · HA · ME · HA — the ball swelling in his cupped hands (Blue: Kaiōken ×10)
//            SSJ2: Meteor Smash rush · SSJ3: the golden Dragon Fist · UI: the silver eye, the calm before Autonomous Assault
//   Vegeta   arms thrown wide, a ki ball in each palm, the charge crackles → "FINAL FLASH"  → (vegetaFinalFlashCinematic)
//   Dark Vegeta  the dark aura swallows the panel → Villainous Onslaught
//   Goku Black   the Rosé aura, the energy scythe drawn → "Zero Mortals Plan"  → (gokuBlackSwordCinematic)
//   Beerus   one raised finger, a tiny sun swelling over it → "HAKAI"  → (beerusKiBallCinematic)
// Vegeta / Goku Black / Beerus already have their own freeze cinematics → deferred behind the storyboard (deferNarutoUlt);
// Goku / Dark Vegeta start the storyboard right after the cast (triggerUltimate hooks). Render-only + camera.

import { SB_KIT, deferNarutoUlt } from "./narutoStoryboard.js"
const { TAU, clamp01, castOf, art, panel, glowBall, lightningBall, flash, rings, focusShot, whipShot, artPanel, eyeBand, CAM_CASTER, registerBoard } = SB_KIT
const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k)
const hsh = (a, b) => { let v = (a * 374761393 + b * 668265263) >>> 0; v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967296 }

const GOKU_FORM_KEYS = ["base", "ssj", "ssj2", "ssj3", "god", "blue", "ui"]
const gokuForm = c => GOKU_FORM_KEYS[c?.transformIndex || 0] || "base"
const KI = { base: ["#8ad0ff", "#e8f8ff"], ssj: ["#ffd23a", "#fff6c0"], god: ["#ff5a3a", "#ffd0b0"], blue: ["#3ac8ff", "#d8f6ff"], ssj2: ["#ffd23a", "#fff6c0"], ssj3: ["#ffc02a", "#fff0a0"], ui: ["#c8d0ff", "#ffffff"] }

// a ki aura panel background: flames of ki rising from the bottom edge
function kiFlames(ctx, cw, ch, k, f, cols, n = 14) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < n; i++) { const x = cw * (0.05 + i * 0.9 / (n - 1)), h = ch * (0.35 + 0.5 * hsh(i, f >> 3)) * ease(k)
    ctx.globalAlpha = 0.35; ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(x - 30, ch); ctx.quadraticCurveTo(x - 10, ch - h * 0.6, x + Math.sin(f * 0.2 + i) * 12, ch - h); ctx.quadraticCurveTo(x + 10, ch - h * 0.6, x + 30, ch); ctx.fill() }
  ctx.restore()
}
// the Kamehameha chant: the art cycles its 4 frames as the ball swells; each syllable is a calligraphy word (see words)
function kameShot(form, d = 100) {
  const cols = KI[form] || KI.ssj
  return { d, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#02040c", form === "god" ? "#2a0806" : form === "blue" ? "#04182a" : "#2a2006", "#02040c"], () => {
    kiFlames(ctx, E.cw, E.ch, E.k, E.F, cols)
    const fr = E.k < 0.8 ? Math.min(2, Math.floor(E.k * 3.75)) : 3, flip = (E.c.facing || 1) < 0
    art(ctx, `goku_${form}_kameha_uniform.png`, 4, fr, E.cw * 0.42, E.ch * 0.55, E.ch * 0.8, { flip })
    const bx = E.cw * (0.42 + (flip ? -0.12 : 0.12)), by = E.ch * 0.58, r = E.ch * (0.02 + 0.07 * ease(E.k))
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowBall(ctx, bx, by, r, cols[0]); ctx.restore()
    if (form === "blue") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 * Math.min(1, E.k * 2); ctx.fillStyle = "#ff2a2a"; ctx.fillRect(0, 0, E.cw, E.ch); ctx.restore() }   // Kaiōken
  }, { lines: "rgba(255,255,255,0.12)" }) }
}
const kameWords = (pre, t0 = 30, step = 18) => [...pre, [t0, "か", "KA"], [t0 + step, "め", "ME"], [t0 + step * 2, "は", "HA"], [t0 + step * 3, "め", "ME"], [t0 + step * 4, "波", "HAAA!"]]

const vegetaBoard = form => {
  const [, , cols] = form === "blue" ? ["vegeta_blue_charge_up_uniform.png", 9, ["#3ac8ff", "#d8f6ff"]] : form === "ssj" ? ["vegeta_ssj_charge_uniform.png", 10, ["#ffd23a", "#fff6c0"]] : ["vegeta_base_charge_uniform.png", 10, ["#ffe25a", "#fff8d0"]]
  return { shots: [
    focusShot(24, cols),
    { d: 40, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#000", "#1a1a08", "#000"], () => {   // the palms come together; one blinding point
      const sep = E.cw * 0.3 * (1 - ease(clamp01(E.k * 1.6))), r = E.ch * (0.04 + 0.08 * ease(E.k))
      ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const s of [-1, 1]) glowBall(ctx, E.cw / 2 + s * sep, E.ch / 2, r, cols[0]); ctx.restore()
      if (E.k > 0.7) flash(ctx, E.cw, E.ch, (E.k - 0.7) / 0.3, "#fffbe0")
    }, { lines: "rgba(255,240,180,0.2)" }) },
    whipShot(14) ],
    words: [[8, "サイヤ人の王子", "PRINCE OF ALL SAIYANS"], [36, "ファイナルフラッシュ", "FINAL FLASH"]] }
}

const BOARDS = {
  goku: { accent: "#ffd23a", ink: "#fff8e0", tint: "20,14,4",
    pick: c => gokuForm(c),
    variants: {
      base: { shots: [
        focusShot(22, KI.base),
        { d: 96, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#02061a", "#0a1a40", "#1a3020"], () => {   // light rises from the whole world into the bomb
          const bx = E.cw / 2, by = -E.ch * 0.1
          ctx.save(); ctx.globalCompositeOperation = "lighter"
          for (let i = 0; i < 60; i++) { const t = ((E.F * 0.012 + hsh(i, 1)) % 1), sx = E.cw * hsh(i, 2), sy = E.ch * 1.02, x = sx + (bx - sx) * ease(t), y = sy + (by - sy) * ease(t)
            ctx.globalAlpha = 0.8 * (1 - t * 0.5) * Math.min(1, E.k * 3); glowBall(ctx, x, y, 3 + 3 * hsh(i, 3), "#9ad8ff") }
          ctx.restore()
        }, { lines: null }) },
        whipShot(14) ],
        words: [[8, "みんな", "EVERYONE…"], [40, "オラに元気を", "LEND ME YOUR ENERGY"]] },
      ssj: { shots: [focusShot(22, KI.ssj), kameShot("ssj"), whipShot(14)], words: kameWords([[4, "超サイヤ人", "SUPER SAIYAN"]]) },
      god: { shots: [focusShot(22, KI.god), kameShot("god"), whipShot(14)], words: kameWords([[4, "超サイヤ人ゴッド", "SUPER SAIYAN GOD"]]) },
      blue: { shots: [focusShot(22, KI.blue), kameShot("blue"), whipShot(14)], words: kameWords([[4, "界王拳", "KAIŌKEN ×10"]]) },
      ssj2: { shots: [
        focusShot(22, KI.ssj2, (ctx, E) => { ctx.save(); ctx.globalCompositeOperation = "lighter"; lightningBall(ctx, E.body.x, E.body.y, 10 * E.z * 0.6, E.F, ["#7ad0ff", "#fff"]); ctx.restore() }),
        { d: 50, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#100a00", "#3a2800", "#100a00"], () => {   // the SSJ2 aura: gold flames, blue lightning
          kiFlames(ctx, E.cw, E.ch, E.k, E.F, KI.ssj2)
          for (let i = 0; i < 5; i++) lightningBall(ctx, E.cw * (0.15 + 0.175 * i), E.ch * (0.3 + 0.4 * hsh(i, E.t >> 2)), E.ch * 0.04, E.F + i * 5, ["#7ad0ff", "#ffffff"])
        }, { lines: "rgba(255,240,160,0.3)" }) },
        whipShot(14) ],
        words: [[8, "超サイヤ人2", "SUPER SAIYAN 2"], [40, "メテオスマッシュ", "METEOR SMASH"]] },
      ssj3: { shots: [
        focusShot(22, KI.ssj3),
        { d: 70, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#100800", "#3a2400", "#100800"], () => {   // the golden dragon coils out of his fist
          ctx.save(); ctx.globalCompositeOperation = "lighter"; const n = 40, L = ease(E.k)
          for (let i = n - 1; i >= 0; i--) { const t = i / n; if (t > L) continue; const x = E.cw * (0.15 + 0.7 * t), y = E.ch * (0.6 - 0.25 * Math.sin(t * 7 - E.F * 0.1)), r = E.ch * (0.07 * (1 - t * 0.6))
            ctx.globalAlpha = 0.9; glowBall(ctx, x, y, r, i % 3 ? "#ffc02a" : "#ffe890") }
          const hx = E.cw * (0.15 + 0.7 * L), hy = E.ch * (0.6 - 0.25 * Math.sin(L * 7 - E.F * 0.1)); ctx.globalAlpha = 1; glowBall(ctx, hx, hy, E.ch * 0.1, "#fff0a0"); ctx.restore()
        }, { lines: "rgba(255,220,120,0.2)" }) },
        whipShot(14) ],
        words: [[8, "超サイヤ人3", "SUPER SAIYAN 3"], [44, "龍拳", "DRAGON FIST"]] },
      ui: { shots: [
        focusShot(22, KI.ui),
        { d: 50, cam: CAM_CASTER(2.8), draw: (ctx, E) => eyeBand(ctx, E.cw, E.ch, E.k, (x, y, h) => {   // the silver eye opens, calm
          const r = h * 0.28 * ease(clamp01(E.k * 3)); ctx.save(); ctx.fillStyle = "#f4f4fa"; ctx.beginPath(); ctx.ellipse(x, y, r * 3.2, r * 1.15, 0, 0, TAU); ctx.fill(); ctx.clip()
          const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#b8c0d8"); g.addColorStop(1, "#5a6080"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
          ctx.fillStyle = "#1a1c2a"; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fill(); ctx.restore() }) },
        whipShot(14) ],
        words: [[8, "身勝手の極意", "ULTRA INSTINCT"], [48, "自在", "AUTONOMOUS"]] },
    } },
  vegeta: { accent: "#ffe25a", ink: "#fff8e0", tint: "16,14,4",
    pick: c => c._ssjBlueActive ? "blue" : c._ssjActive ? "ssj" : "base",
    variants: { base: vegetaBoard("base"), ssj: vegetaBoard("ssj"), blue: vegetaBoard("blue") } },
  vegeta_dark: { accent: "#b06aff", ink: "#f4eeff", tint: "12,2,24",
    shots: [
      focusShot(24, ["#8a3aff", "#e0c8ff"]),
      { d: 40, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#000", "#12001e", "#000"], () => { ctx.save(); ctx.globalCompositeOperation = "lighter"; glowBall(ctx, E.cw / 2, E.ch / 2, E.ch * (0.05 + 0.15 * ease(E.k)), "#a05aff"); ctx.restore(); rings(ctx, E.cw / 2, E.ch / 2, E.k, E.cw * 0.5, "#c08aff") }, { lines: "rgba(180,120,255,0.2)" }) },
      whipShot(14) ],
    words: [[8, "闇の王子", "THE DARK PRINCE"], [36, "猛攻", "VILLAINOUS ONSLAUGHT"]] },
  goku_black: { accent: "#ff5aa8", ink: "#ffeef6", tint: "26,2,16",
    shots: [
      focusShot(24, ["#ff4aa0", "#ffd0e8"]),
      artPanel(60, ["#14000a", "#3a0424", "#14000a"], "goku_black_ssj_rose_charge_uniform.png", { n: 9, frame: E => Math.min(8, Math.floor(E.k * 9)), s0: 0.65, s1: 0.95, fy: 0.55,
        behind: (ctx, E) => kiFlames(ctx, E.cw, E.ch, E.k, E.F, ["#ff3a9a", "#ffc0e0"]), lines: "rgba(255,140,200,0.16)" }),
      whipShot(14) ],
    words: [[8, "超サイヤ人ロゼ", "SUPER SAIYAN ROSÉ"], [50, "人間0計画", "ZERO MORTALS PLAN"]] },
  beerus: { accent: "#c08aff", ink: "#f8f0ff", tint: "14,6,22",
    shots: [
      focusShot(24, ["#8a5aff", "#f0e0ff"]),
      { d: 56, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#06020c", "#1a0c28", "#06020c"], () => {   // destruction: the world flakes away into purple motes
        ctx.save(); ctx.globalCompositeOperation = "lighter"
        for (let i = 0; i < 70; i++) { const t = ((E.F * 0.008 + hsh(i, 1)) % 1); ctx.globalAlpha = Math.min(1, E.k * 2) * (1 - t); ctx.fillStyle = i % 3 ? "#a05aff" : "#f0e0ff"; const s = 3 + 5 * hsh(i, 2); ctx.fillRect(E.cw * hsh(i, 3) + Math.sin(t * 6 + i) * 20, E.ch * (1 - t * 1.2), s, s) }
        ctx.restore(); rings(ctx, E.cw / 2, E.ch / 2, E.k, E.cw * 0.45, "#c08aff")
      }, { lines: "rgba(200,160,255,0.12)" }) },
      whipShot(14) ],
    words: [[8, "破壊神", "GOD OF DESTRUCTION"], [50, "破壊", "HAKAI"]] },
}
for (const [k, B] of Object.entries(BOARDS)) registerBoard(k, B)
export const DB_STORYBOARDS = Object.keys(BOARDS)
