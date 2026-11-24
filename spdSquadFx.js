// spdSquadFx.js — S.P.D. Rangers render layer (render-only; reads f._squad, never writes sim state).
//   • TAG-IN: the incoming Ranger arrives in a S.P.D. teleport flash — a column of their colour, a ring on the floor and
//     a fading ghost streak in the outgoing Ranger's colour.
//   • DIAL: six pips over the fighter's head — the active Ranger lit, the rest dim, a sweep while the swap cools down,
//     and the J/K/L/O/P letters while the ↓↓ menu is armed.
import { SQUAD_FORMS, SQUAD_COLORS, SQUAD, SQUAD_SHORT } from './spdSquad.js'
import './spdSquadSkins.js'   // registers SKINS.spd_rangers (start-as + squad themes)
const KEYS = ['J', 'K', 'L', 'O', 'P', 'U']
export function drawSpdSquadFx(c, f) {
  const q = f?._squad; if (!q) return
  const cx = f.x + (f.w || 60) / 2, top = f.y - 18, feet = f.y + (f.h || 100)
  c.save()
  if (q.flash > 0) {
    const k = q.flash / SQUAD.flash, col = SQUAD_COLORS[q.form] || '#fff'
    c.globalAlpha = 0.3 * k; c.fillStyle = col; const w = (f.w || 60) * (0.45 + 0.6 * (1 - k)); c.fillRect(cx - w / 2, f.y - 260, w, feet - f.y + 260)
    c.globalAlpha = 0.45 * k; c.fillStyle = '#ffffff'; c.fillRect(cx - w / 8, f.y - 260, w / 4, feet - f.y + 260)
    c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.ellipse(cx, feet, 30 + 60 * (1 - k), 8 + 14 * (1 - k), 0, 0, Math.PI * 2); c.stroke()
    if (q.from) { c.globalAlpha = 0.5 * k; c.fillStyle = SQUAD_COLORS[q.from] || '#888'; c.fillRect(cx - (f.facing || 1) * 70 - 14, f.y + 10, 28, (f.h || 100) - 10) }
  }
  // the dial
  const r = 5, gap = 15, N = SQUAD_FORMS.length, x0 = cx - gap * (N - 1) / 2
  for (let i = 0; i < N; i++) {
    const form = SQUAD_FORMS[i], on = form === q.form, x = x0 + i * gap
    c.globalAlpha = on ? 1 : 0.45; c.fillStyle = SQUAD_COLORS[form]; c.beginPath(); c.arc(x, top, on ? r + 2 : r, 0, Math.PI * 2); c.fill()
    if (form === 'omega_ranger') { c.globalAlpha = on ? 1 : 0.6; c.strokeStyle = '#1a1a2a'; c.lineWidth = 1; c.stroke() }
    if (on) { c.globalAlpha = 1; c.strokeStyle = form === 'omega_ranger' ? '#e0201c' : '#ffffff'; c.lineWidth = 2; c.stroke() }
    if (q.armT > 0) { c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(KEYS[i], x, top - 10) }
  }
  if (q.cd > 0) { c.globalAlpha = 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - r, top + 10); c.lineTo(x0 - r + (gap * (N - 1) + 2 * r) * (q.cd / SQUAD.cooldown), top + 10); c.stroke() }
  if (q.flash > SQUAD.flash - 10) { c.globalAlpha = Math.min(1, (q.flash - (SQUAD.flash - 10)) / 4); c.fillStyle = SQUAD_COLORS[q.form]; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText(SQUAD_SHORT[q.form] + '!', cx, top - 14) }
  c.restore()
}
