// introCam.js — PRE-MATCH INTRO CAMERA (owner 2026-11-24: "fix the intros so that they actually work properly so they zoom in
// on one character coming in and then they zoom in on another character coming in").
//
// Before: startMatch sets camera.maxZoom = 1.0, so the intro's "zoom" (namecall 1.1) was clamped to nothing, and P2 never got
// a focus at all (the camera pulled OUT to the two-shot while P2 entered). Now, only while gameState is INTRO:
//   • the zoom ceiling is lifted (saved + restored — the same pattern the ult cinematics use),
//   • stage "p1": a slow push-in that TRACKS P1 through their whole entrance (flyers, dashes, teleports …),
//   • stage "p2": a whip-pan across to P2 and the same push-in on them,
//   • stage "done": pull back to the two-shot for the VS splash,
//   • cinematic letterbox bars + a name card (name, universe, its emblem) for the fighter on camera.
// PRESENTATION ONLY: camera + overlay. Fighter state is never written. No Math.random.
import { drawUniverseIcon } from './universeIcons.js'
import { universeDisplayName, hudUniverseStyle } from './hudFrames.js'

const ZOOM_IN = 1.45, ZOOM_PUSH = 1.78, PUSH_FRAMES = 110, TWO_SHOT = 0.85
const st = { saved: null, side: null, t: 0, bars: 0, card: 0 }
const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k))

export function introCamTick(cam, stage, p1, p2) {
  if (!cam) return
  if (!st.saved) {
    st.saved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep, moveSmooth: cam.moveSmooth }
    cam.maxZoom = 1.85; cam.maxZoomStep = 0.03; cam.maxPanStep = 70; cam.moveSmooth = 0.14
  }
  const f = stage === 'p1' ? p1 : stage === 'p2' ? p2 : null
  if (stage !== st.side) { st.side = stage; st.t = 0 }
  st.t++
  if (f) {
    cam.focusOnFighter(f, ZOOM_IN + (ZOOM_PUSH - ZOOM_IN) * ease(st.t / PUSH_FRAMES))
    cam.targetY -= 18   // frame the upper body / face, not the belt
    st.bars = Math.min(1, st.bars + 0.06); st.card = Math.min(1, st.card + 0.08)
  } else {
    if (p1 && p2) cam.focusBetween(p1, p2, TWO_SHOT)
    st.bars = Math.max(0, st.bars - 0.05); st.card = Math.max(0, st.card - 0.12)
  }
}

// Called every frame outside INTRO: restores the camera exactly once.
export function introCamRelease(cam) {
  if (!st.saved) return
  if (cam) Object.assign(cam, st.saved)
  st.saved = null; st.side = null; st.t = 0; st.bars = 0; st.card = 0
}
export function introCamState() { return { active: !!st.saved, side: st.side, t: st.t, bars: st.bars } }

// Overlay: letterbox + the on-camera fighter's name card. `own` = that side already draws its own intro card (skip ours).
export function drawIntroCamOverlay(ctx, w, h, info = {}) {
  if (!st.saved && st.bars <= 0) return
  const b = ease(st.bars) * h * 0.085
  if (b > 0.5) { ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, b); ctx.fillRect(0, h - b, w, b); ctx.restore() }
  const side = st.side === 'p1' || st.side === 'p2' ? st.side : null
  const who = side && info[side]
  if (!who || who.ownCard || st.card <= 0.01) return
  const a = ease(st.card), left = side === 'p1', acc = who.accent || hudUniverseStyle({ universe: who.universe }).trim
  const cw = Math.min(460, w * 0.42), chh = 74, y = h - b - chh - 18, slide = (1 - a) * (cw + 40)
  const x = left ? 28 - slide : w - 28 - cw + slide
  ctx.save(); ctx.globalAlpha = a
  // slanted plate
  ctx.beginPath()
  if (left) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y); ctx.lineTo(x + cw - 26, y + chh); ctx.lineTo(x, y + chh) }
  else { ctx.moveTo(x + 26, y); ctx.lineTo(x + cw, y); ctx.lineTo(x + cw, y + chh); ctx.lineTo(x, y + chh) }
  ctx.closePath()
  const g = ctx.createLinearGradient(x, 0, x + cw, 0)
  g.addColorStop(left ? 0 : 1, 'rgba(6,8,16,0.92)'); g.addColorStop(left ? 1 : 0, 'rgba(6,8,16,0.35)')
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke()
  ctx.fillStyle = acc; ctx.fillRect(left ? x : x + cw - 6, y, 6, chh)
  // emblem + text
  const ix = left ? x + 48 : x + cw - 48
  drawUniverseIcon(ctx, who.universe, ix, y + chh / 2, chh * 0.7, { hover: true, t: st.t })
  ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'alphabetic'
  const tx = left ? x + 92 : x + cw - 92, maxW = cw - 130
  let fs = 30; ctx.font = `900 italic ${fs}px Arial`; while (ctx.measureText(who.name).width > maxW && fs > 14) { fs--; ctx.font = `900 italic ${fs}px Arial` }
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.fillStyle = '#ffffff'; ctx.fillText(who.name, tx, y + chh * 0.55)
  ctx.font = '800 13px Arial'; ctx.fillStyle = acc; ctx.fillText(universeDisplayName(who.universe, '').toUpperCase(), tx, y + chh * 0.83)
  ctx.restore()
}
