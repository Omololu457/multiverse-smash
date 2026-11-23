// titansIntro.js — the Teen Titans' SPECIAL INTROS (presentation only; reads fighter state, writes nothing the sim reads).
// While a Titan's own pre-match intro plays (the engine's `_introPlaying` beat, sequential P1 → P2):
//   • a name card in the lower third (portrait, "<NAME> — <TITLE>", his / her colours; Robin's "THE BOY WONDER" card
//     is the template) with a sub-line: the tagline — or "TITANS, GO!" when two Titans meet
//   • a signature world effect behind the fighter: Raven's soul-self raven spreading its wings, Starfire's starbolt
//     burst, Cyborg's systems scan, Beast Boy's green morph puff, Robin's smoke pellet
//   • the intro voice line (titansVoice.titanIntroLine: a line against that Titan → the team line → the round intro)
// drawTitanIntroCards runs from the intro-card hook (robinFx.drawRobinIntroCard), drawTitanIntroFx from each draw<X>Fx.
import { isTitan, titanIntroLine } from './titansVoice.js'

export const TITAN_INTRO = {
  beast_boy: { title: 'BEAST BOY — THE CHANGELING', tag: 'Different animal. Same attitude.', c: ['#3fbf3f', '#a060d0'], fx: '#5aff6a' },
  robin: { title: 'ROBIN — THE BOY WONDER', tag: 'The Boy Wonder.', c: ['#e8203a', '#ffd800'], fx: '#c8ccd4' },
  raven: { title: 'RAVEN — DAUGHTER OF TRIGON', tag: 'Azarath. Metrion. Zinthos.', c: ['#5a3aa8', '#8a6aff'], fx: '#2a1458' },
  starfire: { title: 'STARFIRE — PRINCESS OF TAMARAN', tag: 'On Tamaran, we fight with joy!', c: ['#7cff5a', '#ff7a2a'], fx: '#7cff5a' },
  cyborg: { title: 'CYBORG — HALF MAN, HALF MACHINE', tag: 'Bring the noise.', c: ['#c8d0dc', '#ff2a2a'], fx: '#ff2a2a' },
}
const IMG = {}
const image = src => { if (typeof Image === 'undefined') return null; if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i } return IMG[src] }
const ready = im => im && im.complete && im.naturalWidth > 0
const k01 = (k, a, b) => Math.min(1, Math.max(0, (k - a) / (b - a)))

// screen space, from the intro-card hook (every frame of the intro phase)
export function drawTitanIntroCards(c, cv, p1, p2) {
  for (const [f, opp] of [[p1, p2], [p2, p1]]) {
    if (!isTitan(f) || !f._introPlaying) continue
    const k = f._introRevealFrame || 0
    if (k >= 4) titanIntroLine(f, opp)                                 // once per intro
    const D = TITAN_INTRO[f.rosterKey], al = k01(k, 24, 34); if (al <= 0) continue
    const cw = cv?.width || 1280, ch = cv?.height || 720, team = isTitan(opp)
    c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 34px Arial'
    const bw = Math.max(c.measureText(D.title).width + 150, 420), bx = cw / 2 - bw / 2, by = ch * 0.7, bh = 78
    c.fillStyle = 'rgba(8,12,24,0.84)'; c.fillRect(bx, by, bw, bh)
    c.strokeStyle = D.c[0]; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
    c.fillStyle = D.c[1]; c.fillRect(bx, by + bh - 5, bw * k01(k, 24, 60), 5)            // the colour bar sweeps in
    const por = image(`./assets/${f.rosterKey}/portrait.png`)
    if (ready(por)) { c.imageSmoothingEnabled = false; c.save(); c.beginPath(); c.rect(bx + 4, by + 4, 62, bh - 12); c.clip(); c.drawImage(por, bx + 4, by - 10, 62, 78); c.restore() }
    c.fillStyle = '#f1f5f9'; c.shadowBlur = 18; c.shadowColor = D.c[0]
    c.fillText(D.title, cw / 2 + 30, by + 30)
    c.shadowBlur = 0; c.font = 'italic 700 17px Arial'; c.fillStyle = team ? '#ffd800' : '#cbd5e1'
    c.fillText(team ? 'TITANS, GO!' : D.tag, cw / 2 + 30, by + 58)
    c.restore()
  }
}

// world space, from draw<X>Fx: the signature effect behind the fighter while his / her intro plays
export function drawTitanIntroFx(c, f) {
  if (!isTitan(f) || !f._introPlaying) return
  const k = f._introRevealFrame || 0, D = TITAN_INTRO[f.rosterKey]
  const cx = (f.x || 0) + (f.w || 60) / 2, top = f.y || 0, h = f.h || 100, feet = top + h, cy = top + h * 0.45
  c.save()
  switch (f.rosterKey) {
    case 'raven': {        // the soul-self: a giant dark raven rises behind her and spreads its wings, then fades
      const u = k01(k, 0, 40), fade = 1 - k01(k, 70, 110); if (fade <= 0) break
      const s = h * (0.6 + 1.1 * u), wy = cy - h * 0.25
      c.globalAlpha = 0.5 * fade; c.fillStyle = D.fx; c.shadowBlur = 30; c.shadowColor = '#8a6aff'
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(cx, wy)
        c.quadraticCurveTo(cx + d * s * 0.55, wy - s * 0.55, cx + d * s * 1.15, wy - s * 0.25)
        c.lineTo(cx + d * s * 0.9, wy - s * 0.05); c.lineTo(cx + d * s * 0.98, wy + s * 0.08)
        c.lineTo(cx + d * s * 0.62, wy + s * 0.04); c.lineTo(cx + d * s * 0.7, wy + s * 0.2)
        c.quadraticCurveTo(cx + d * s * 0.3, wy + s * 0.12, cx, wy + s * 0.3); c.fill()
      }
      c.beginPath(); c.ellipse(cx, wy - s * 0.12, s * 0.12, s * 0.2, 0, 0, Math.PI * 2); c.fill()                         // head
      c.fillStyle = '#ffffff'; c.shadowColor = '#ffffff'
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(cx + d * s * 0.05, wy - s * 0.17, s * 0.022, s * 0.012, 0, 0, Math.PI * 2); c.fill() }   // four white eyes, two shown
      break
    }
    case 'starfire': {     // starbolt burst: a green flare and eight rays from her hands
      const u = k01(k, 0, 30), fade = 1 - k01(k, 50, 90); if (fade <= 0) break
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, h * (0.4 + 0.9 * u))
      g.addColorStop(0, 'rgba(200,255,180,0.9)'); g.addColorStop(0.4, 'rgba(124,255,90,0.45)'); g.addColorStop(1, 'rgba(124,255,90,0)')
      c.globalAlpha = fade; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, h * (0.4 + 0.9 * u), 0, Math.PI * 2); c.fill()
      c.strokeStyle = D.fx; c.lineWidth = 4; c.shadowBlur = 16; c.shadowColor = D.fx
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2, r0 = h * 0.3 * u, r1 = h * (0.5 + 0.8 * u)
        c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke() }
      break
    }
    case 'cyborg': {       // systems scan: a red scan line sweeps head → feet twice over a faint HUD frame, then "ONLINE"
      const fade = 1 - k01(k, 70, 100); if (fade <= 0) break
      const p = (k % 30) / 30, y = top + h * p, w = (f.w || 60) * 1.8
      c.globalAlpha = 0.9 * fade; c.strokeStyle = D.fx; c.lineWidth = 4; c.shadowBlur = 14; c.shadowColor = D.fx
      if (k < 60) { c.beginPath(); c.moveTo(cx - w / 2, y); c.lineTo(cx + w / 2, y); c.stroke() }
      c.globalAlpha = 0.45 * fade; c.strokeStyle = '#c8d0dc'; c.lineWidth = 1.5
      const bx = cx - w / 2, L = 12
      for (const [x, y0, dx, dy] of [[bx, top, 1, 1], [bx + w, top, -1, 1], [bx, feet, 1, -1], [bx + w, feet, -1, -1]]) {
        c.beginPath(); c.moveTo(x + dx * L, y0); c.lineTo(x, y0); c.lineTo(x, y0 + dy * L); c.stroke() }
      if (k >= 60) { c.globalAlpha = fade; c.font = '900 14px Arial'; c.textAlign = 'center'; c.fillStyle = D.fx; c.fillText('SYSTEMS ONLINE', cx, top - 10) }
      break
    }
    case 'beast_boy': {    // the morph: a green puff of animal-shift energy bursts around him
      const u = k01(k, 0, 70), fade = 1 - u; if (fade <= 0) break
      c.globalAlpha = 0.7 * fade; c.fillStyle = D.fx; c.shadowBlur = 20; c.shadowColor = D.fx
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = h * (0.2 + 0.55 * u)
        c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 6 + 14 * (1 - u), 0, Math.PI * 2); c.fill() }
      break
    }
    case 'robin': {        // smoke pellet: a grey cloud at his feet that drifts and clears
      const u = k01(k, 0, 80), fade = 1 - u; if (fade <= 0) break
      c.globalAlpha = 0.6 * fade; c.fillStyle = D.fx
      for (let i = 0; i < 7; i++) { const a = i * 0.9, r = h * (0.15 + 0.4 * u)
        c.beginPath(); c.arc(cx + Math.cos(a) * r, feet - 10 - Math.abs(Math.sin(a)) * r * 0.6, 14 + 12 * u, 0, Math.PI * 2); c.fill() }
      break
    }
  }
  c.restore()
}
