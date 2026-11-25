// hxhStoryboard.js — STORYBOARD ult openers for the Hunter × Hunter roster (Netero, Killua, Hisoka, Chrollo). Same contract as
// narutoStoryboard.js (whose toolkit this reuses): a frozen multi-shot cut-in sequence, then the ultimate exactly as before.
//   Netero   the prayer of gratitude → a thousand golden hands → the Hundred-Type Guanyin Bodhisattva rises behind him
//            (2nd press, Zero: the statue's palms close, the light of the Zero Hand)
//   Killua   blue lightning crawls over him → "Godspeed" → Whirlwind / Lightning Palm  → (killuaGodspeedCinematic, unchanged)
//   Hisoka   a fan of cards turns over → Bungee Gum stretches across the panel → "the magician"  → (hisokaOverdriveCinematic)
//   Chrollo  the Bandit's Secret opens, pages flip, the cross mark burns  → (chrolloSkillHunterCinematic)
// Killua / Hisoka / Chrollo already have their own freeze cinematics → deferred behind the storyboard (deferNarutoUlt);
// Netero's ult has none → the storyboard starts right after the cast (triggerUltimate hook). Render-only + camera.

import { SB_KIT, deferNarutoUlt } from "./narutoStoryboard.js"
const { TAU, clamp01, castOf, art, panel, glowBall, lightningBall, flash, rings, focusShot, whipShot, artPanel, CAM_CASTER, registerBoard } = SB_KIT
const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k)
const hsh = (a, b) => { let v = (a * 374761393 + b * 668265263) >>> 0; v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967296 }

// a ring of golden arms fanning out behind a point (the thousand hands of Guanyin)
function thousandHands(ctx, x, y, R, k, f) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"
  const n = 36
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + (i / (n - 1)) * Math.PI, t = clamp01(k * 1.6 - i / n * 0.6), r = R * (0.45 + 0.55 * ease(t))
    if (t <= 0) continue
    const ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r * 0.9
    ctx.globalAlpha = 0.65 * t; ctx.strokeStyle = i % 2 ? "#ffd86a" : "#fff0b0"; ctx.lineWidth = 7; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.27); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.fillStyle = "#fff4c8"; ctx.beginPath(); ctx.ellipse(ex, ey, 12, 18, a + Math.PI / 2, 0, TAU); ctx.fill()   // the palm
  }
  ctx.globalAlpha = 0.7 * k; glowBall(ctx, x, y, R * 0.25, "#ffd86a")
  ctx.restore()
}
function playingCard(ctx, x, y, w, rot, flip, suit) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.max(0.02, Math.abs(Math.cos(flip))), 1)
  const face = Math.cos(flip) < 0, h = w * 1.4
  ctx.fillStyle = face ? "#fffaf0" : "#8a1a3a"; ctx.strokeStyle = "#1a0a10"; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 6) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke()
  if (face) { ctx.fillStyle = suit === "♥" || suit === "♦" ? "#d0102a" : "#101018"; ctx.font = `900 ${Math.round(w * 0.6)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(suit, 0, 0) }
  else { ctx.strokeStyle = "#ffd0e0"; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12) }
  ctx.restore()
}
function book(ctx, x, y, w, k, f) {   // the Bandit's Secret: an open book, pages flipping, a cross burning on the cover
  const h = w * 0.62
  ctx.save(); ctx.translate(x, y)
  ctx.fillStyle = "#2a1a10"; ctx.fillRect(-w / 2 - 8, -h / 2 - 6, w + 16, h + 12)
  ctx.fillStyle = "#f4ecd8"; ctx.fillRect(-w / 2, -h / 2, w / 2 - 3, h); ctx.fillRect(3, -h / 2, w / 2 - 3, h)
  ctx.fillStyle = "#3a2a20"; for (let i = 0; i < 9; i++) { ctx.fillRect(-w / 2 + 14, -h / 2 + 18 + i * h / 11, w / 2 - 40, 3); ctx.fillRect(18, -h / 2 + 18 + i * h / 11, w / 2 - 40, 3) }
  for (let p = 0; p < 4; p++) {   // pages flipping right → left
    const t = ((k * 3 + p / 4) % 1), sx = Math.cos(t * Math.PI)
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#a89a80"; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(sx * w / 2, -h / 2 - Math.sin(t * Math.PI) * 20); ctx.lineTo(sx * w / 2, h / 2 - Math.sin(t * Math.PI) * 20); ctx.lineTo(0, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
  }
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(f * 0.3); glowBall(ctx, 0, 0, w * 0.12, "#c08aff")
  ctx.restore()
}

const BOARDS = {
  netero: { accent: "#ffd86a", ink: "#fff8e0", tint: "24,18,4",
    pick: c => castOf(c) === "guanyinCast" ? "guanyin" : castOf(c) === "guanyinZero" || c.currentMove === "guanyinZero" ? "zero" : null,
    variants: {
      guanyin: { shots: [
        focusShot(26, ["#ffd86a", "#fff4c8"]),
        { d: 60, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#120a00", "#2a1c04", "#120a00"], () => thousandHands(ctx, E.cw / 2, E.ch * 0.62, E.ch * 0.62, E.k, E.F), { lines: "rgba(255,220,120,0.14)" }) },
        whipShot(14) ],
        words: [[8, "感謝の正拳突き", "THE PRAYER OF GRATITUDE"], [34, "千手", "A THOUSAND HANDS"], [66, "百式観音", "HUNDRED-TYPE GUANYIN BODHISATTVA"]] },
      zero: { shots: [
        { d: 40, cam: CAM_CASTER(2.0), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#fffaf0", "#fff0c8", "#fffaf0"], () => {   // the Zero Hand: everything goes white
          ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; const r = E.ch * (0.1 + 1.2 * ease(E.k)); const g = ctx.createRadialGradient(E.cw / 2, E.ch / 2, 0, E.cw / 2, E.ch / 2, r); g.addColorStop(0, "#ffffff"); g.addColorStop(0.6, "#ffe8a0"); g.addColorStop(1, "rgba(255,200,80,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, E.cw, E.ch); ctx.restore()
          rings(ctx, E.cw / 2, E.ch / 2, E.k, E.cw * 0.6, "#ffb030")
        }, { lines: "rgba(200,140,40,0.2)" }) },
        whipShot(12) ],
        words: [[8, "零の掌", "ZERO HAND"]] },
    } },
  killua: { accent: "#7ad0ff", ink: "#eef8ff", tint: "2,10,24",
    shots: [
      artPanel(56, ["#00040e", "#06142a", "#00040e"], "killua_godspeed_activate_uniform.png", { n: 12, frame: E => Math.min(11, Math.floor(E.k * 12)), s0: 0.7, s1: 0.95, fy: 0.55,
        extra: (ctx, E) => { for (let i = 0; i < 4; i++) lightningBall(ctx, E.cw * (0.2 + 0.2 * i), E.ch * (0.3 + 0.4 * hsh(i, E.t >> 2)), E.ch * 0.03, E.F + i * 7) }, lines: "rgba(140,210,255,0.2)" }),
      { d: 44, cam: CAM_CASTER(2.2), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#000208", "#04122a", "#000208"], () => {   // Whirlwind: a blur ring around the stage
        lightningBall(ctx, E.cw / 2, E.ch / 2, E.ch * (0.05 + 0.15 * ease(E.k)), E.F)
        ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 10; i++) { const a = E.F * 0.4 + i / 10 * TAU; ctx.globalAlpha = 0.5; ctx.strokeStyle = "#a8e0ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(E.cw / 2, E.ch / 2, E.ch * 0.35, a, a + 0.35); ctx.stroke() } ctx.restore()
      }, { lines: "rgba(140,210,255,0.25)" }) },
      whipShot(14) ],
    words: [[4, "神速", "GODSPEED"], [58, "疾風迅雷", "WHIRLWIND"], [84, "電光石火", "LIGHTNING PALM"]] },
  hisoka: { accent: "#ff5aa0", ink: "#ffeef6", tint: "30,4,16",
    shots: [
      { d: 54, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#1a0010", "#3a0828", "#1a0010"], () => {   // the fan of cards turns over
        const suits = ["♠", "♥", "♦", "♣", "♠", "♥", "♦"]
        suits.forEach((s, i) => { const t = clamp01(E.k * 1.6 - i * 0.08), a = (i - 3) * 0.18 * ease(t); playingCard(ctx, E.cw / 2 + Math.sin(a) * E.ch * 0.3, E.ch * 0.72 - Math.cos(a) * E.ch * 0.3, E.ch * 0.14, a, Math.PI * ease(clamp01(t * 1.5 - 0.3)), s) })
      }, { lines: "rgba(255,150,200,0.14)" }) },
      { d: 50, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#12000a", "#2a0018", "#12000a"], () => {   // Bungee Gum stretches across the panel
        ctx.save(); ctx.strokeStyle = "#ff7ab8"; ctx.lineCap = "round"
        for (let i = 0; i < 5; i++) { const y0 = E.ch * (0.25 + i * 0.12), st = ease(clamp01(E.k * 1.4 - i * 0.08)); ctx.globalAlpha = 0.85; ctx.lineWidth = 10 - i
          ctx.beginPath(); ctx.moveTo(E.cw * 0.15, y0); ctx.bezierCurveTo(E.cw * 0.4, y0 + 60 * Math.sin(E.F * 0.1 + i), E.cw * 0.6, y0 - 60 * Math.sin(E.F * 0.1 + i), E.cw * (0.15 + 0.7 * st), y0); ctx.stroke() }
        ctx.restore()
      }, { lines: "rgba(255,150,200,0.14)" }) },
      whipShot(14) ],
    words: [[4, "奇術師", "THE MAGICIAN"], [56, "伸縮自在の愛", "BUNGEE GUM"], [90, "♠", "BLOODLUST"]] },
  chrollo: { accent: "#c08aff", ink: "#f4eeff", tint: "10,4,20",
    shots: [
      { d: 60, cam: CAM_CASTER(2.4), draw: (ctx, E) => panel(ctx, E.cw, E.ch, E.t, E.d, ["#06020c", "#1a0c28", "#06020c"], () => {
        book(ctx, E.cw / 2, E.ch / 2, E.ch * (0.6 + 0.2 * ease(E.k)), E.k, E.F)
        ctx.save(); ctx.globalAlpha = clamp01(E.k * 2 - 0.6); ctx.fillStyle = "#e0d0ff"; ctx.fillRect(E.cw / 2 - 6, E.ch * 0.12, 12, E.ch * 0.2); ctx.fillRect(E.cw / 2 - 40, E.ch * 0.17, 80, 12); ctx.restore()   // the cross
      }, { lines: "rgba(190,150,255,0.14)" }) },
      whipShot(14) ],
    words: [[4, "幻影旅団", "THE PHANTOM TROUPE"], [40, "盗賊の極意", "SKILL HUNTER"]] },
}
for (const [k, B] of Object.entries(BOARDS)) registerBoard(k, B)
export { deferNarutoUlt as deferHxhUlt }
export const HXH_STORYBOARDS = Object.keys(BOARDS)
