// riftTransition.js
// ─────────────────────────────────────────────────────────────────────────────
// DIMENSIONAL-RIFT screen transition (UI-polish Stage 11). A brief glitch/tear wipe that plays over the
// DESTINATION screen and recedes to reveal it — a jagged directional split, accent-tinted (the selected
// universe's color where relevant, else a neutral rift cyan/violet). Fast punchy sting, not a loading
// delay — same idiom + timing as matchEntryTransition.js. Pure render overlay: the gameState switch is
// instant (as before); this just draws for ~0.4s on top of the new screen. Deterministic (frame clock,
// no Math.random/Date.now) → replay/test-safe.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 24     // frames (~0.4s @ 60fps)
const RIFT_NEUTRAL = "#4ad5ff"  // neutral rift-cyan when no context accent is supplied

const _state = { active: false, t: 0, dur: DEFAULT_DURATION, accent: RIFT_NEUTRAL, plays: 0 }

export function startRiftTransition(accent, dur = DEFAULT_DURATION) {
  _state.active = true
  _state.t = 0
  _state.dur = Math.max(1, dur | 0)
  _state.accent = accent || RIFT_NEUTRAL
  _state.plays++
}
export function updateRiftTransition() {
  if (!_state.active) return
  _state.t++
  if (_state.t >= _state.dur) _state.active = false
}
export function isRiftTransitionActive() { return _state.active }
export function riftTransitionStatus() {
  return { active: _state.active, t: _state.t, dur: _state.dur, accent: _state.accent, plays: _state.plays,
           progress: _state.dur ? Math.min(1, _state.t / _state.dur) : 1 }
}

function _easeOutCubic(x) { return 1 - Math.pow(1 - x, 3) }
// Deterministic jagged offset for the tear edge at band `i`, animated by frame `t`.
function _jag(i, t, amp) {
  const a = Math.sin(i * 1.7 + t * 0.6) * 0.5 + Math.sin(i * 4.3 - t * 0.9) * 0.3
  const glitch = ((i * 13 + (t * 3 | 0)) % 7) < 2 ? 0.9 : 0   // occasional bands jut further (glitch)
  return (a + glitch) * amp
}

export function drawRiftTransition(ctx, canvas) {
  if (!_state.active || !ctx || !canvas) return
  const cw = canvas.width, ch = canvas.height
  const p = Math.min(1, _state.t / _state.dur)
  if (p >= 1) return
  const accent = _state.accent
  ctx.save()

  // 1) Accent rift-flash on the first third (the "tear opens" pop).
  if (p < 0.34) {
    ctx.globalCompositeOperation = "lighter"
    ctx.globalAlpha = (1 - p / 0.34) * 0.5
    ctx.fillStyle = accent
    ctx.fillRect(0, 0, cw, ch)
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
  }

  // 2) JAGGED TEAR: two dark covers meeting at a glitchy centerline at t=0, splitting apart (recede) to
  //    reveal the destination screen in the widening jagged gap.
  const open = _easeOutCubic(p)
  const half = open * (cw / 2 + cw * 0.12)   // each cover recedes this far from center
  const bandH = 16
  const amp = cw * 0.022
  const bands = Math.ceil(ch / bandH) + 1

  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, "#0a0f1c"); g.addColorStop(0.5, "#05070e"); g.addColorStop(1, "#0a0f1c")

  // LEFT cover (jagged right edge)
  ctx.beginPath(); ctx.moveTo(0, 0)
  for (let i = 0; i <= bands; i++) { const y = i * bandH; ctx.lineTo(cw / 2 - half + _jag(i, _state.t, amp), y) }
  ctx.lineTo(0, ch); ctx.closePath(); ctx.fillStyle = g; ctx.fill()
  // RIGHT cover (jagged left edge)
  ctx.beginPath(); ctx.moveTo(cw, 0)
  for (let i = 0; i <= bands; i++) { const y = i * bandH; ctx.lineTo(cw / 2 + half + _jag(i + 3, _state.t, amp), y) }
  ctx.lineTo(cw, ch); ctx.closePath(); ctx.fillStyle = g; ctx.fill()

  // 3) Bright accent-tinted tear edges (glow) + RGB-split glitch slivers along the rift.
  ctx.save()
  ctx.shadowBlur = 18; ctx.shadowColor = accent
  ctx.strokeStyle = accent; ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= bands; i++) { const y = i * bandH; const x = cw / 2 - half + _jag(i, _state.t, amp); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
  ctx.stroke()
  ctx.beginPath()
  for (let i = 0; i <= bands; i++) { const y = i * bandH; const x = cw / 2 + half + _jag(i + 3, _state.t, amp); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
  ctx.stroke()
  ctx.restore()

  // Glitch slivers: a few horizontal accent bands near the tear that flicker/shift (chromatic feel).
  ctx.globalAlpha = 0.5 * (1 - p)
  for (let k = 0; k < 6; k++) {
    const bi = (k * 5 + (_state.t * 2 | 0)) % bands
    const y = bi * bandH
    const xl = cw / 2 - half + _jag(bi, _state.t, amp)
    const xr = cw / 2 + half + _jag(bi + 3, _state.t, amp)
    ctx.fillStyle = accent
    ctx.fillRect(xl - 26, y, 26, 3)
    ctx.fillRect(xr, y + 2, 26, 3)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}
