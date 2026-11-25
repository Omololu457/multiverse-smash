// universeIcons.js — a hand-drawn canvas EMBLEM per universe for the Universe Select tiles (owner 2026-11-24: "give symbols
// that actually represent the universe rather than just random symbols … a knife for horror … when I hover, blood drips down
// from the knife"). Each icon is pure vector canvas drawing (no images, no Math.random — animation = the menu frame clock),
// drawn centred at (cx, cy) inside a box of size s. `hover` turns on its signature animation:
//   horror → blood runs down the knife and drips off the tip · naruto → the leaf spins with chakra wisps · demon_slayer → the
//   blade catches fire · dragon_ball → the orb pulses + twinkles · ben_10 → the Omnitrix flashes green · rick_and_morty →
//   the portal spins · one_piece → the Jolly Roger's hat bobs · power_rangers → the visor scans · … every universe has one.
//   drawUniverseIcon(ctx, id, cx, cy, s, { hover, t, accent })

const TAU = Math.PI * 2
const lerp = (a, b, k) => a + (b - a) * k

function path(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath() }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU) }
function star(c, x, y, r, inner = 0.45, n = 5, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rr = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) } c.closePath() }
function outline(c, w = 2, col = 'rgba(0,0,0,0.85)') { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke() }

const ICONS = {
  // ── HORROR: a kitchen knife, point down; on hover blood runs down the blade and drips off the tip ──
  horror(c, s, { hover, t }) {
    c.save(); c.rotate(-0.18)
    const L = s * 1.08, bw = s * 0.17, hy = -L / 2, hl = L * 0.34, by = hy + hl   // handle top → blade start
    // handle
    const hg = c.createLinearGradient(-bw * 0.6, 0, bw * 0.6, 0); hg.addColorStop(0, '#2a1a12'); hg.addColorStop(0.5, '#5a3a26'); hg.addColorStop(1, '#1e120c')
    c.fillStyle = hg; c.beginPath(); c.roundRect(-bw * 0.55, hy, bw * 1.1, hl, bw * 0.4); c.fill(); outline(c, 1.5)
    c.fillStyle = '#c8c8d0'; for (const k of [0.25, 0.5, 0.75]) { circle(c, 0, hy + hl * k, bw * 0.12); c.fill() }
    c.fillStyle = '#8a8a94'; c.fillRect(-bw * 0.75, by - 2, bw * 1.5, 4)   // bolster
    // blade (spine on the left, curved edge to the point)
    const tipY = L / 2
    const bl = () => { c.beginPath(); c.moveTo(-bw * 0.55, by + 2); c.lineTo(bw * 0.6, by + 2); c.quadraticCurveTo(bw * 0.75, lerp(by, tipY, 0.6), -bw * 0.5, tipY); c.closePath() }
    const g = c.createLinearGradient(-bw, 0, bw, 0); g.addColorStop(0, '#e8ecf2'); g.addColorStop(0.55, '#a8b0bc'); g.addColorStop(1, '#f6f8fc')
    bl(); c.fillStyle = g; c.fill(); outline(c, 1.4)
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(bw * 0.45, by + 6); c.quadraticCurveTo(bw * 0.55, lerp(by, tipY, 0.55), -bw * 0.35, tipY - 6); c.stroke()
    // blood: a smear always; on hover it RUNS down and drips
    c.save(); bl(); c.clip()
    const run = hover ? Math.min(1, ((t % 150) / 70)) : 0.18
    const bloodBottom = lerp(by, tipY, run)
    const bg = c.createLinearGradient(0, by, 0, bloodBottom + 8); bg.addColorStop(0, '#5a0000'); bg.addColorStop(1, '#b00b0b')
    c.fillStyle = bg; c.beginPath(); c.moveTo(-bw, by)
    for (let x = -bw; x <= bw; x += bw / 4) { const wob = Math.sin(x * 0.9 + 1.3) * 5 + Math.sin(x * 2.1) * 3; c.lineTo(x, bloodBottom + wob) }
    c.lineTo(bw, by); c.closePath(); c.fill()
    c.restore()
    if (hover) {   // drops falling off the tip
      for (let k = 0; k < 3; k++) {
        const ph = ((t + k * 37) % 110) / 110; if ((t % 150) < 60 && k === 0) continue
        const dy = tipY + ph * ph * s * 0.55, dx = -bw * 0.5, r = 2.6 * (1 - ph * 0.3)
        c.globalAlpha = 1 - ph * 0.6; c.fillStyle = '#b00b0b'
        c.beginPath(); c.moveTo(dx, dy - r * 2.2); c.quadraticCurveTo(dx + r, dy - r * 0.2, dx, dy + r); c.quadraticCurveTo(dx - r, dy - r * 0.2, dx, dy - r * 2.2); c.fill()
      }
      c.globalAlpha = 1
    }
    c.restore()
    if (hover) { c.fillStyle = '#8a0000'; c.beginPath(); c.ellipse(-s * 0.02, s * 0.5, s * 0.16 * Math.min(1, ((t % 150) / 150) + 0.3), s * 0.035, 0, 0, TAU); c.fill() }   // pool
  },

  // ── NARUTO: the Hidden Leaf swirl; hover → it spins and chakra wisps rise ──
  naruto(c, s, { hover, t }) {
    const w = s * 0.86, h = s * 0.5
    // blue cloth band behind the plate (tails flutter on hover)
    c.fillStyle = '#1e3c8a'; c.fillRect(-s * 0.55, -h * 0.28, s * 1.1, h * 0.56)
    const fl = hover ? Math.sin(t * 0.2) * 4 : 0
    c.beginPath(); c.moveTo(s * 0.5, -h * 0.2); c.quadraticCurveTo(s * 0.62, h * 0.2 + fl, s * 0.58, h * 0.75 + fl); c.lineTo(s * 0.48, h * 0.7 + fl); c.quadraticCurveTo(s * 0.5, h * 0.2, s * 0.42, -h * 0.1); c.fill()
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#f2f4f8'); g.addColorStop(0.5, '#a8b0bc'); g.addColorStop(1, '#6a7280')
    c.fillStyle = g; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 6); c.fill(); outline(c, 1.6)
    c.fillStyle = '#5a6270'; for (const [x, y] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]]) { circle(c, x * w, y * h, 2); c.fill() }
    // engraved leaf (dark groove + light bevel)
    const leaf = (ox, oy) => {
      const r = h * 0.3; c.beginPath()
      for (let a = 0; a < TAU * 1.4; a += 0.12) { const rr = r * 0.15 + (a / (TAU * 1.4)) * r * 0.75, x = ox + Math.cos(a + 2.4) * rr, y = oy + Math.sin(a + 2.4) * rr; a ? c.lineTo(x, y) : c.moveTo(x, y) }
      c.moveTo(ox - r * 0.55, oy - r * 0.55); c.quadraticCurveTo(ox - r * 0.1, oy - r * 1.35, ox + r * 0.75, oy - r * 1.05)
      c.moveTo(ox - r * 0.75, oy + r * 0.45); c.lineTo(ox - r * 1.1, oy + r * 0.95); c.stroke()
    }
    c.lineCap = 'round'; c.lineWidth = s * 0.05
    c.strokeStyle = 'rgba(255,255,255,0.8)'; leaf(1, h * 0.12 + 1)
    c.strokeStyle = '#2a2e36'; leaf(0, h * 0.12)
    if (hover) { c.save(); c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 6); c.clip(); const sx = -w + ((t * 3) % (w * 2.4)); c.fillStyle = 'rgba(255,255,255,0.55)'; path(c, [[sx, -h], [sx + 10, -h], [sx - 14, h], [sx - 24, h]]); c.fill(); c.restore()
      for (let k = 0; k < 4; k++) { const ph = ((t * 0.9 + k * 23) % 90) / 90; c.globalAlpha = (1 - ph) * 0.7; c.fillStyle = '#ff9a2a'; circle(c, Math.sin(k * 2.1 + t * 0.04) * s * 0.4, -h * 0.5 - ph * s * 0.4, 2.5); c.fill() } c.globalAlpha = 1 }
  },

  // ── JUJUTSU KAISEN: a cursed eye seal (Sukuna's marked eye on an ofuda); hover → the eye opens + cursed energy ──
  jujutsu_kaisen(c, s, { hover, t }) {
    const w = s * 0.5, h = s * 0.9
    c.fillStyle = '#efe6d2'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.fill(); outline(c, 1.5)
    c.fillStyle = '#9a1020'; c.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, 3); c.fillRect(-w / 2 + 4, h / 2 - 7, w - 8, 3)
    const open = hover ? 0.5 + 0.5 * Math.min(1, (t % 120) / 25) : 0.35
    c.save(); c.beginPath(); c.ellipse(0, -h * 0.05, w * 0.36, w * 0.36 * open, 0, 0, TAU); c.fillStyle = '#1a0a0e'; c.fill()
    c.clip(); c.fillStyle = '#d01030'; circle(c, 0, -h * 0.05, w * 0.16); c.fill(); c.fillStyle = '#000'; c.fillRect(-1, -h * 0.05 - w * 0.12, 2, w * 0.24); c.restore()
    c.strokeStyle = '#9a1020'; c.lineWidth = 1.6
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * w * 0.38, -h * 0.05); c.lineTo(d * w * 0.48, -h * 0.05 - 5); c.stroke() }
    c.fillStyle = '#1a0a0e'; c.font = `900 ${Math.round(w * 0.45)}px "Hiragino Mincho ProN", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('呪', 0, h * 0.27)
    if (hover) for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + t * 0.03, rr = s * 0.38 + Math.sin(t * 0.1 + k) * 4; c.globalAlpha = 0.55; c.fillStyle = '#6a3aff'; circle(c, Math.cos(a) * rr, Math.sin(a) * rr * 1.1, 3); c.fill() }
    c.globalAlpha = 1
  },

  // ── DEMON SLAYER: a nichirin katana with a round tsuba; hover → Flame Breathing runs up the blade ──
  demon_slayer(c, s, { hover, t }) {
    c.save(); c.rotate(-0.75)
    const L = s * 1.05, bw = s * 0.07
    // handle with diamond wrap
    c.fillStyle = '#1a1a22'; c.fillRect(-L / 2, -bw * 0.75, L * 0.27, bw * 1.5)
    c.fillStyle = '#d8c060'; for (let x = -L / 2 + 4; x < -L / 2 + L * 0.27 - 2; x += 8) path(c, [[x, 0], [x + 4, -bw * 0.6], [x + 8, 0], [x + 4, bw * 0.6]]), c.fill()
    // tsuba
    const tx = -L / 2 + L * 0.28
    c.fillStyle = '#2a2a2e'; c.beginPath(); c.ellipse(tx, 0, bw * 0.7, bw * 2.4, 0, 0, TAU); c.fill(); c.strokeStyle = '#e8c060'; c.lineWidth = 1.5; c.stroke()
    // blade (slight curve)
    const g = c.createLinearGradient(0, -bw, 0, bw); g.addColorStop(0, '#f4f6fa'); g.addColorStop(0.5, '#b8c2d0'); g.addColorStop(1, '#5a6a80')
    c.beginPath(); c.moveTo(tx + 3, -bw * 0.55); c.quadraticCurveTo(L * 0.1, -bw * 1.3, L / 2, -bw * 1.6); c.quadraticCurveTo(L * 0.1, bw * 0.2, tx + 3, bw * 0.55); c.closePath()
    c.fillStyle = g; c.fill(); outline(c, 1.2)
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tx + 6, 0); c.quadraticCurveTo(L * 0.1, -bw * 0.6, L / 2 - 4, -bw * 1.4); c.stroke()
    c.restore()
    if (hover) {   // flames licking along the blade
      c.save(); c.rotate(-0.75)
      for (let k = 0; k < 9; k++) {
        const u = k / 8, x = lerp(-L / 2 + L * 0.32, L / 2 - 4, u), fl = (Math.sin(t * 0.25 + k * 1.7) * 0.5 + 0.5)
        const h = s * (0.1 + 0.12 * fl) * (1 - u * 0.4)
        c.fillStyle = k % 2 ? 'rgba(255,170,40,0.85)' : 'rgba(255,80,20,0.8)'
        c.beginPath(); c.moveTo(x - 5, -bw * 0.8); c.quadraticCurveTo(x - 2, -bw - h * 0.6, x + 2, -bw - h); c.quadraticCurveTo(x + 4, -bw - h * 0.4, x + 5, -bw * 0.8); c.fill()
      }
      c.restore()
    }
  },

  // ── DRAGON BALL: the Four-Star Ball; hover → pulses + glints ──
  dragon_ball(c, s, { hover, t }) {
    const r = s * 0.38 * (hover ? 1 + Math.sin(t * 0.15) * 0.04 : 1)
    if (hover) { c.shadowBlur = 24; c.shadowColor = '#ffb020' }
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.35, '#ffb52a'); g.addColorStop(1, '#c25a00')
    circle(c, 0, 0, r); c.fillStyle = g; c.fill(); c.shadowBlur = 0; outline(c, 1.5, 'rgba(90,30,0,0.7)')
    c.fillStyle = '#d81010'; for (const [x, y] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.3], [0.3, 0.3]]) { star(c, x * r, y * r, r * 0.2); c.fill() }
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-r * 0.42, -r * 0.5, r * 0.18, r * 0.09, -0.6, 0, TAU); c.fill()
    if (hover) { const a = (t % 60) / 60; c.globalAlpha = 1 - a; c.fillStyle = '#fff'; star(c, r * 0.7, -r * 0.75, 4 + a * 6, 0.2, 4, 0); c.fill(); c.globalAlpha = 1 }
  },

  // ── BLEACH: a Hollow mask (white, red war stripes); hover → black/red reiatsu flares ──
  bleach(c, s, { hover, t }) {
    const w = s * 0.62, h = s * 0.82
    if (hover) for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, fl = Math.sin(t * 0.2 + k * 1.3) * 0.5 + 0.5, rr = s * 0.42 + fl * s * 0.1; c.strokeStyle = k % 2 ? 'rgba(200,0,20,0.6)' : 'rgba(20,0,0,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.36); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 1.1); c.stroke() }
    c.beginPath(); c.moveTo(0, -h / 2); c.bezierCurveTo(w * 0.62, -h / 2, w * 0.58, h * 0.15, w * 0.3, h * 0.42); c.lineTo(0, h / 2); c.lineTo(-w * 0.3, h * 0.42); c.bezierCurveTo(-w * 0.58, h * 0.15, -w * 0.62, -h / 2, 0, -h / 2); c.closePath()
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd0d8'); c.fillStyle = g; c.fill(); outline(c, 1.6)
    c.fillStyle = '#c0101a'
    path(c, [[-w * 0.12, -h * 0.48], [-w * 0.05, -h * 0.48], [-w * 0.22, h * 0.05], [-w * 0.3, h * 0.05]]); c.fill()
    path(c, [[-w * 0.28, h * 0.12], [-w * 0.2, h * 0.12], [-w * 0.3, h * 0.38], [-w * 0.36, h * 0.34]]); c.fill()
    c.fillStyle = hover ? '#ffcc00' : '#111'
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * w * 0.2, -h * 0.08, w * 0.12, h * 0.07, d * 0.3, 0, TAU); c.fill() }
    c.fillStyle = '#111'; for (let k = -3; k <= 3; k++) c.fillRect(k * w * 0.05 - 1, h * 0.22, 2, h * 0.1)
    c.strokeStyle = '#111'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-w * 0.2, h * 0.22); c.lineTo(w * 0.2, h * 0.22); c.moveTo(-w * 0.2, h * 0.32); c.lineTo(w * 0.2, h * 0.32); c.stroke()
  },

  // ── POWER RANGERS: a Ranger helmet with the diamond visor; hover → a light sweeps across the visor ──
  power_rangers(c, s, { hover, t, accent }) {
    const w = s * 0.62, h = s * 0.78, col = '#d81e2a'
    c.beginPath(); c.moveTo(-w / 2, h * 0.1); c.bezierCurveTo(-w / 2, -h * 0.6, w / 2, -h * 0.6, w / 2, h * 0.1); c.lineTo(w * 0.42, h / 2); c.lineTo(-w * 0.42, h / 2); c.closePath()
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#7a0a10'); g.addColorStop(0.4, col); g.addColorStop(1, '#5a060c'); c.fillStyle = g; c.fill(); outline(c, 1.6)
    c.fillStyle = '#d8dde4'; c.beginPath(); c.roundRect(-w * 0.26, h * 0.22, w * 0.52, h * 0.24, 4); c.fill(); outline(c, 1)
    const visor = () => path(c, [[-w * 0.42, -h * 0.08], [w * 0.42, -h * 0.08], [w * 0.22, h * 0.16], [w * 0.08, h * 0.16], [0, h * 0.04], [-w * 0.08, h * 0.16], [-w * 0.22, h * 0.16]])
    visor(); c.fillStyle = '#0a0a0e'; c.fill(); outline(c, 1.2, '#e8e8ee')
    if (hover) { c.save(); visor(); c.clip(); const sx = -w / 2 + ((t * 2.4) % (w * 1.6)); const sg = c.createLinearGradient(sx - 10, 0, sx + 10, 0); sg.addColorStop(0, 'rgba(120,200,255,0)'); sg.addColorStop(0.5, 'rgba(160,220,255,0.9)'); sg.addColorStop(1, 'rgba(120,200,255,0)'); c.fillStyle = sg; c.fillRect(-w, -h, w * 2, h * 2); c.restore() }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-w * 0.2, -h * 0.3, w * 0.12, h * 0.05, -0.5, 0, TAU); c.fill()
  },

  // ── BEN 10: the Omnitrix dial; hover → green transformation flash ──
  ben_10(c, s, { hover, t }) {
    const r = s * 0.38, fl = hover ? (Math.sin(t * 0.2) * 0.5 + 0.5) : 0
    if (hover) { c.shadowBlur = 20 + fl * 20; c.shadowColor = '#5aff5a' }
    circle(c, 0, 0, r); c.fillStyle = '#c8ccd2'; c.fill(); c.shadowBlur = 0; outline(c, 1.5)
    circle(c, 0, 0, r * 0.82); c.fillStyle = '#1a1a1e'; c.fill()
    circle(c, 0, 0, r * 0.68); c.fillStyle = hover ? `rgb(${80 + fl * 120},255,${80 + fl * 120})` : '#3ce03c'; c.fill()
    c.fillStyle = '#111'; path(c, [[-r * 0.5, -r * 0.6], [r * 0.5, -r * 0.6], [r * 0.08, 0], [r * 0.5, r * 0.6], [-r * 0.5, r * 0.6], [-r * 0.08, 0]]); c.fill()
    c.fillStyle = '#c8ccd2'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; c.fillRect(Math.cos(a) * r * 0.9 - 2, Math.sin(a) * r * 0.9 - 2, 4, 4) }
    if (hover && fl > 0.8) { c.globalAlpha = (fl - 0.8) * 4; c.fillStyle = '#c8ffc8'; circle(c, 0, 0, s * 0.6); c.fill(); c.globalAlpha = 1 }
  },

  // ── HUNTER × HUNTER: a fan of Hisoka's playing cards; hover → they fan out wider ──
  hunter_x_hunter(c, s, { hover, t }) {
    const cw = s * 0.36, ch = s * 0.52, spread = hover ? 0.42 + Math.sin(t * 0.1) * 0.05 : 0.28
    const suits = [['♠', '#111'], ['♦', '#c8102e'], ['♣', '#111'], ['♥', '#c8102e']]
    for (let k = 0; k < 4; k++) {
      c.save(); c.translate(0, s * 0.18); c.rotate((k - 1.5) * spread); c.translate(0, -ch * 0.6)
      c.fillStyle = '#fbf8f0'; c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 4); c.fill(); outline(c, 1.2)
      c.fillStyle = suits[k][1]; c.font = `700 ${Math.round(cw * 0.6)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(suits[k][0], 0, 0)
      c.font = `700 ${Math.round(cw * 0.25)}px serif`; c.fillText(suits[k][0], -cw * 0.3, -ch * 0.36)
      c.restore()
    }
  },

  // ── ONE PIECE: the Straw Hat Jolly Roger; hover → the hat tips + bones rattle ──
  one_piece(c, s, { hover, t }) {
    const r = s * 0.24, wob = hover ? Math.sin(t * 0.2) * 0.08 : 0
    c.save(); c.rotate(wob * 0.5); c.strokeStyle = '#f2f2f2'; c.lineWidth = s * 0.08; c.lineCap = 'round'
    c.beginPath(); c.moveTo(-s * 0.38, -s * 0.05); c.lineTo(s * 0.38, s * 0.42); c.moveTo(s * 0.38, -s * 0.05); c.lineTo(-s * 0.38, s * 0.42); c.stroke(); c.restore()
    c.fillStyle = '#f4f4f4'; circle(c, 0, s * 0.05, r); c.fill(); outline(c, 1.4); c.fillRect(-r * 0.55, s * 0.05 + r * 0.6, r * 1.1, r * 0.5)
    c.fillStyle = '#111'; for (const d of [-1, 1]) { circle(c, d * r * 0.4, s * 0.06, r * 0.26); c.fill() }
    c.beginPath(); c.moveTo(0, s * 0.12); c.lineTo(-3, s * 0.18); c.lineTo(3, s * 0.18); c.fill()
    c.save(); c.translate(0, -s * 0.12); c.rotate(-0.1 + wob)
    c.fillStyle = '#e8c048'; c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.08, 0, 0, TAU); c.fill(); outline(c, 1.2)
    c.beginPath(); c.ellipse(0, -s * 0.07, s * 0.22, s * 0.13, 0, Math.PI, TAU); c.fill(); outline(c, 1.2)
    c.fillStyle = '#c8102e'; c.fillRect(-s * 0.22, -s * 0.08, s * 0.44, s * 0.05)
    c.restore()
  },

  // ── DC: a hero's crest shield with a star; hover → it gleams ──
  dc(c, s, { hover, t, accent }) {
    const w = s * 0.7, h = s * 0.66
    path(c, [[-w * 0.3, -h / 2], [w * 0.3, -h / 2], [w / 2, -h * 0.18], [0, h / 2], [-w / 2, -h * 0.18]])
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ffd23a'); g.addColorStop(1, '#d89a10'); c.fillStyle = g; c.fill(); outline(c, 2)
    c.save(); c.scale(0.78, 0.78); path(c, [[-w * 0.3, -h / 2], [w * 0.3, -h / 2], [w / 2, -h * 0.18], [0, h / 2], [-w / 2, -h * 0.18]]); c.fillStyle = '#1a3aa8'; c.fill(); c.restore()
    c.fillStyle = '#ffd23a'; star(c, 0, -h * 0.05, s * 0.17); c.fill()
    if (hover) { c.save(); path(c, [[-w * 0.3, -h / 2], [w * 0.3, -h / 2], [w / 2, -h * 0.18], [0, h / 2], [-w / 2, -h * 0.18]]); c.clip(); const sx = -w + ((t * 3) % (w * 2.4)); c.fillStyle = 'rgba(255,255,255,0.5)'; path(c, [[sx, -h], [sx + 12, -h], [sx - 18, h], [sx - 30, h]]); c.fill(); c.restore() }
  },

  // ── MARVEL: a glowing arc reactor; hover → it powers up and spins ──
  marvel(c, s, { hover, t }) {
    const r = s * 0.38
    if (hover) { c.shadowBlur = 26; c.shadowColor = '#6adcff' }
    circle(c, 0, 0, r); c.fillStyle = '#3a3e48'; c.fill(); c.shadowBlur = 0; outline(c, 1.5)
    circle(c, 0, 0, r * 0.82); c.fillStyle = '#12161c'; c.fill()
    c.save(); c.rotate(hover ? t * 0.04 : 0)
    for (let k = 0; k < 10; k++) { c.save(); c.rotate(k * TAU / 10); c.fillStyle = '#c8d8e8'; c.fillRect(-r * 0.07, -r * 0.78, r * 0.14, r * 0.26); c.restore() }
    c.restore()
    const g = c.createRadialGradient(0, 0, 1, 0, 0, r * 0.45); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9ae8ff'); g.addColorStop(1, 'rgba(60,180,255,0.3)')
    circle(c, 0, 0, r * 0.45 * (hover ? 1 + Math.sin(t * 0.3) * 0.06 : 1)); c.fillStyle = g; c.fill()
    c.strokeStyle = '#6adcff'; c.lineWidth = 1.5; path(c, [[0, -r * 0.3], [r * 0.27, r * 0.17], [-r * 0.27, r * 0.17]]); c.stroke()
  },

  // ── THE INCREDIBLES: the "i" logo; hover → it pops ──
  the_incredibles(c, s, { hover, t }) {
    const k = hover ? 1 + Math.max(0, Math.sin(t * 0.18)) * 0.06 : 1
    c.save(); c.scale(k, k)
    c.fillStyle = '#111'; c.beginPath(); c.ellipse(0, 0, s * 0.44, s * 0.33, 0, 0, TAU); c.fill()
    c.fillStyle = '#ff7a12'; c.beginPath(); c.ellipse(0, 0, s * 0.38, s * 0.27, 0, 0, TAU); c.fill()
    c.fillStyle = '#111'; c.font = `italic 900 ${Math.round(s * 0.55)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('i', 0, s * 0.03)
    c.restore()
  },

  // ── RICK AND MORTY: a green portal; hover → it swirls ──
  rick_and_morty(c, s, { hover, t }) {
    const R = s * 0.42, rot = t * (hover ? 0.09 : 0.015)
    c.save(); c.scale(1, 0.92)
    if (hover) { c.shadowBlur = 24; c.shadowColor = '#7aff3a' }
    const g = c.createRadialGradient(0, 0, 2, 0, 0, R); g.addColorStop(0, '#f0ffd8'); g.addColorStop(0.35, '#9cf04a'); g.addColorStop(0.8, '#2a9a14'); g.addColorStop(1, '#0c4a06')
    c.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.15) { const rr = R * (1 + Math.sin(a * 7 + t * 0.12) * 0.05); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) } c.closePath(); c.fillStyle = g; c.fill(); c.shadowBlur = 0
    c.lineCap = 'round'
    for (let arm = 0; arm < 4; arm++) {
      c.beginPath()
      for (let u = 0; u <= 1; u += 0.04) { const a = rot + arm * TAU / 4 + u * 4.2, rr = R * (0.1 + u * 0.82); u ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) }
      c.strokeStyle = arm % 2 ? 'rgba(10,70,8,0.75)' : 'rgba(230,255,200,0.85)'; c.lineWidth = s * 0.045; c.stroke()
    }
    c.restore()
  },

  // ── ONE PUNCH MAN: a clenched fist; hover → it punches forward with impact lines ──
  one_punch_man(c, s, { hover, t }) {
    const w = s * 0.62, h = s * 0.78, serious = hover && (t % 140) > 50
    c.fillStyle = '#ffd9b0'; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); c.fill(); outline(c, 1.6)
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * w * 0.5, h * 0.05, w * 0.08, h * 0.11, 0, 0, TAU); c.fill(); outline(c, 1.2) }
    c.fillStyle = '#ffd9b0'; c.beginPath(); c.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, TAU); c.fill()
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(-w * 0.18, -h * 0.3, w * 0.12, h * 0.05, -0.5, 0, TAU); c.fill()   // the shine
    if (hover) { const a = (t % 50) / 50; c.globalAlpha = 1 - a; c.fillStyle = '#fff'; star(c, -w * 0.28, -h * 0.36, 3 + a * 7, 0.2, 4, 0); c.fill(); c.globalAlpha = 1 }
    c.strokeStyle = '#2a1a10'; c.fillStyle = '#2a1a10'; c.lineCap = 'round'
    if (serious) {   // SERIOUS MODE: sharp brows, intense eyes, set jaw
      c.lineWidth = 2.6; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * w * 0.32, -h * 0.06); c.lineTo(d * w * 0.08, h * 0.02); c.stroke() }
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * w * 0.18, h * 0.09, w * 0.07, h * 0.035, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); outline(c, 1.4, '#2a1a10'); c.fillStyle = '#2a1a10'; circle(c, d * w * 0.17, h * 0.09, 1.8); c.fill() }
      c.lineWidth = 2; c.beginPath(); c.moveTo(-w * 0.12, h * 0.3); c.lineTo(w * 0.12, h * 0.3); c.stroke()
    } else {         // the classic blank "OK." face
      c.lineWidth = 1.6; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * w * 0.3, h * 0.02); c.lineTo(d * w * 0.08, h * 0.02); c.stroke(); c.beginPath(); c.arc(d * w * 0.18, h * 0.09, 2, 0, TAU); c.fill() }
      c.beginPath(); c.moveTo(-w * 0.07, h * 0.3); c.lineTo(w * 0.07, h * 0.3); c.stroke()
    }
  },
  // ── HAJIME NO IPPO: a red boxing glove; hover → jab ──
  hajime_no_ippo(c, s, { hover, t }) {
    const p = hover ? Math.max(0, Math.sin(t * 0.25)) * s * 0.1 : 0
    c.save(); c.translate(p, 0)
    c.fillStyle = '#f2f2f2'; c.beginPath(); c.roundRect(-s * 0.42, -s * 0.15, s * 0.2, s * 0.3, 4); c.fill(); outline(c, 1.4)
    const g = c.createRadialGradient(s * 0.02, -s * 0.12, 2, 0, 0, s * 0.38); g.addColorStop(0, '#ff6a5a'); g.addColorStop(1, '#a8101a')
    c.fillStyle = g; c.beginPath(); c.ellipse(s * 0.05, 0, s * 0.3, s * 0.27, 0, 0, TAU); c.fill(); outline(c, 1.6)
    c.beginPath(); c.ellipse(-s * 0.05, s * 0.12, s * 0.12, s * 0.09, 0.4, 0, TAU); c.fill(); outline(c, 1.2)
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(s * 0.1, -s * 0.14, s * 0.1, s * 0.04, -0.3, 0, TAU); c.fill()
    c.restore()
    if (hover && p > s * 0.06) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(s * 0.42 + p, k * s * 0.14); c.lineTo(s * 0.52 + p, k * s * 0.2); c.stroke() } }
  },
  // ── BAKI: an oni demon face (the "Demon Back"); hover → its eyes burn ──
  baki(c, s, { hover, t }) {
    const w = s * 0.62, h = s * 0.66
    c.fillStyle = '#8a1a14'; c.beginPath(); c.moveTo(-w / 2, -h * 0.2); c.quadraticCurveTo(-w / 2, h / 2, 0, h / 2); c.quadraticCurveTo(w / 2, h / 2, w / 2, -h * 0.2); c.quadraticCurveTo(0, -h * 0.55, -w / 2, -h * 0.2); c.fill(); outline(c, 1.6)
    c.fillStyle = '#efe0c0'; for (const d of [-1, 1]) { path(c, [[d * w * 0.3, -h * 0.28], [d * w * 0.48, -h * 0.68], [d * w * 0.14, -h * 0.36]]); c.fill(); outline(c, 1) }
    const ey = hover ? '#ffdc3a' : '#ffb000'; if (hover) { c.shadowBlur = 12; c.shadowColor = '#ff8a00' }
    c.fillStyle = ey; for (const d of [-1, 1]) { path(c, [[d * w * 0.06, -h * 0.05], [d * w * 0.32, -h * 0.14], [d * w * 0.3, h * 0.02]]); c.fill() }
    c.shadowBlur = 0
    c.fillStyle = '#1a0402'; c.beginPath(); c.moveTo(-w * 0.3, h * 0.2); c.quadraticCurveTo(0, h * 0.42, w * 0.3, h * 0.2); c.quadraticCurveTo(0, h * 0.3, -w * 0.3, h * 0.2); c.fill()
    c.fillStyle = '#efe0c0'; for (const d of [-1, 1]) { path(c, [[d * w * 0.22, h * 0.22], [d * w * 0.17, h * 0.36], [d * w * 0.13, h * 0.26]]); c.fill() }
  },
  // ── DEATH NOTE: the black notebook (+ Ryuk's apple); hover → names get written ──
  deathnote(c, s, { hover, t }) {
    const w = s * 0.52, h = s * 0.72
    c.save(); c.rotate(-0.08)
    c.fillStyle = '#0c0c0e'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.fill(); outline(c, 1.4, '#55555c')
    c.fillStyle = '#d8d8de'; c.font = `700 ${Math.round(w * 0.17)}px "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('DEATH', 0, -h * 0.12); c.fillText('NOTE', 0, h * 0.06)
    if (hover) { const n = Math.floor((t % 120) / 20); c.strokeStyle = '#d8d8de'; c.lineWidth = 1; for (let k = 0; k < n; k++) { c.beginPath(); c.moveTo(-w * 0.32, h * 0.22 + k * 4); c.lineTo(-w * 0.32 + w * 0.64 * Math.min(1, ((t % 20) / 20) + (k < n - 1 ? 1 : 0)), h * 0.22 + k * 4); c.stroke() } }
    c.restore()
    c.fillStyle = '#c8102e'; circle(c, w * 0.55, h * 0.32, s * 0.11); c.fill(); outline(c, 1.2)
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(w * 0.55, h * 0.32 - s * 0.1); c.lineTo(w * 0.58, h * 0.32 - s * 0.16); c.stroke()
  },
  // ── SAIKI K: the psychic limiter antennae + green glasses; hover → psychic rings ──
  saiki_k(c, s, { hover, t }) {
    if (hover) for (let k = 0; k < 3; k++) { const ph = ((t + k * 20) % 60) / 60; c.globalAlpha = 1 - ph; c.strokeStyle = '#ff6ad0'; c.lineWidth = 2; circle(c, 0, 0, s * (0.2 + ph * 0.35)); c.stroke() }
    c.globalAlpha = 1
    c.fillStyle = '#ffa8d8'; c.beginPath(); c.ellipse(0, s * 0.08, s * 0.3, s * 0.22, 0, Math.PI, TAU); c.fill(); outline(c, 1.4)
    c.strokeStyle = '#2a2a30'; c.lineWidth = 2.5
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * s * 0.18, -s * 0.08); c.lineTo(d * s * 0.26, -s * 0.36); c.stroke(); c.fillStyle = '#2ad0e0'; circle(c, d * s * 0.27, -s * 0.38, s * 0.05); c.fill(); outline(c, 1) }
    c.fillStyle = '#3ae07a'; for (const d of [-1, 1]) { c.beginPath(); c.roundRect(d * s * 0.14 - s * 0.1, s * 0.12, s * 0.2, s * 0.12, 3); c.fill(); outline(c, 1.2) }
    c.strokeStyle = '#111'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * 0.04, s * 0.17); c.lineTo(s * 0.04, s * 0.17); c.stroke()
  },
  // ── DIVINE: a radiant halo with rays; hover → the rays turn ──
  divine(c, s, { hover, t }) {
    c.save(); c.rotate(hover ? t * 0.01 : 0)
    for (let k = 0; k < 16; k++) { c.save(); c.rotate(k * TAU / 16); c.fillStyle = k % 2 ? 'rgba(255,240,170,0.45)' : 'rgba(255,220,120,0.7)'; path(c, [[-3, -s * 0.18], [3, -s * 0.18], [0, -s * (k % 2 ? 0.4 : 0.48)]]); c.fill(); c.restore() }
    c.restore()
    if (hover) { c.shadowBlur = 20; c.shadowColor = '#fff2b0' }
    c.strokeStyle = '#ffe9a0'; c.lineWidth = s * 0.06; c.beginPath(); c.ellipse(0, 0, s * 0.2, s * 0.2, 0, 0, TAU); c.stroke(); c.shadowBlur = 0
    c.fillStyle = '#fff8e0'; c.fillRect(-s * 0.025, -s * 0.14, s * 0.05, s * 0.28); c.fillRect(-s * 0.1, -s * 0.06, s * 0.2, s * 0.05)
  },
  // ── ORIGINALS: a multiverse rift (a crystal splitting space); hover → it cracks open ──
  original(c, s, { hover, t }) {
    const o = hover ? 4 + Math.sin(t * 0.15) * 2 : 0
    for (const d of [-1, 1]) {
      c.save(); c.translate(d * o, 0)
      path(c, d < 0 ? [[0, -s * 0.42], [-s * 0.3, 0], [0, s * 0.42], [-s * 0.05, 0]] : [[0, -s * 0.42], [s * 0.3, 0], [0, s * 0.42], [s * 0.05, 0]])
      const g = c.createLinearGradient(-s * 0.3, -s * 0.4, s * 0.3, s * 0.4); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#a86a10'); c.fillStyle = g; c.fill(); outline(c, 1.4)
      c.restore()
    }
    if (hover) { c.fillStyle = '#b48aff'; c.globalAlpha = 0.85; c.fillRect(-o + 1, -s * 0.3, o * 2 - 2, s * 0.6); c.globalAlpha = 1 }
  },
}
function fist(c, s, { hover, t }, skin, glow) {
  const p = hover ? Math.max(0, Math.sin(t * 0.22)) : 0
  c.save(); c.translate(p * s * 0.08, 0); c.scale(1 + p * 0.08, 1 + p * 0.08)
  c.fillStyle = '#ffe14a'; c.fillRect(-s * 0.45, -s * 0.12, s * 0.16, s * 0.26); outline(c, 1.2)   // yellow sleeve
  c.fillStyle = skin; c.beginPath(); c.roundRect(-s * 0.3, -s * 0.24, s * 0.56, s * 0.46, s * 0.12); c.fill(); outline(c, 1.6)
  c.strokeStyle = 'rgba(120,70,40,0.7)'; c.lineWidth = 1.4; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(s * 0.1, -s * 0.24 + k * s * 0.115); c.lineTo(s * 0.26, -s * 0.24 + k * s * 0.115); c.stroke() }
  c.fillStyle = skin; c.beginPath(); c.roundRect(-s * 0.18, s * 0.02, s * 0.3, s * 0.13, 5); c.fill(); outline(c, 1.2)   // thumb
  c.restore()
  if (p > 0.5) { c.strokeStyle = glow; c.lineWidth = 2.4; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(s * 0.36, k * s * 0.1); c.lineTo(s * 0.36 + s * 0.14 * p, k * s * 0.14); c.stroke() } }
}

export function hasUniverseIcon(id) { return !!ICONS[id] }
export function drawUniverseIcon(c, id, cx, cy, s, o = {}) {
  const fn = ICONS[id] || ICONS.original
  c.save(); c.translate(cx, cy)
  if (o.hover) c.translate(0, Math.sin((o.t || 0) * 0.08) * 1.5)   // tiny float on the hovered tile
  try { fn(c, s, { hover: !!o.hover, t: o.t || 0, accent: o.accent }) } catch (_) { /* never break the menu over an icon */ }
  c.restore()
}
