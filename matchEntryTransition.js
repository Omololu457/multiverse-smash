// matchEntryTransition.js
// ─────────────────────────────────────────────────────────────────────────────
// MK1 / Tekken-8 MATCH-ENTRY STING (HUD redesign Stage 3). A short, punchy screen-
// space transition that plays once when a match actually starts (post character-
// select, at the ROUND-1 countdown) and REVEALS the stage/fighters, landing on the
// existing "ROUND 1" callout. Purely a render overlay — it holds NO combat state and
// changes nothing about the match; it just draws for ~0.5s over the first slice of the
// countdown window (which already runs ROUND_START_COUNTDOWN frames), so it adds no time.
//
// Same self-contained idiom as the other *Cinematic.js overlays: start / update / draw /
// isActive / status. Driven by a frame counter (no Date.now / Math.random → deterministic,
// replay- and test-safe).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 30   // frames (~0.5s @ 60fps) — a sting, not a loading screen

const _state = { active: false, t: 0, dur: DEFAULT_DURATION, plays: 0 }
let _forcedDur = null   // capture-only override (harness): stretch the sting so a filmstrip can sample it densely; ships at DEFAULT_DURATION

// Test/capture hook: force the next sting's duration (frames). Pass null to clear → back to 30f.
export function setMatchEntryTransitionDuration(n) { _forcedDur = (n == null) ? null : Math.max(1, n | 0) }

export function startMatchEntryTransition(dur = DEFAULT_DURATION) {
  _state.active = true
  _state.t = 0
  _state.dur = Math.max(1, (_forcedDur != null ? _forcedDur : dur) | 0)
  _state.plays++
}

export function updateMatchEntryTransition() {
  if (!_state.active) return
  _state.t++
  if (_state.t >= _state.dur) _state.active = false
}

export function isMatchEntryTransitionActive() {
  return _state.active
}

// Harness/status window (mirrors get*CinematicStatus): lets a test prove the sting armed,
// its progress, and that it auto-clears — without reaching into module internals.
export function matchEntryTransitionStatus() {
  return { active: _state.active, t: _state.t, dur: _state.dur, plays: _state.plays,
           progress: _state.dur ? Math.min(1, _state.t / _state.dur) : 1 }
}

function _easeOutCubic(x) { return 1 - Math.pow(1 - x, 3) }
function _easeInCubic(x)  { return x * x * x }

export function drawMatchEntryTransition(ctx, canvas) {
  if (!_state.active || !ctx || !canvas) return
  const cw = canvas.width, ch = canvas.height
  const p  = Math.min(1, _state.t / _state.dur)   // 0..1 across the sting
  if (p >= 1) return

  ctx.save()

  // 1) IMPACT FLASH — a hot white pop on the first quarter that decays fast (the "punch").
  if (p < 0.28) {
    const a = (1 - p / 0.28) * 0.85
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(0, 0, cw, ch)
  }

  // 2) DIRECTIONAL SLANTED WIPE — a dark metallic cover panel over the STILL-hidden right
  //    portion of the screen, sweeping off to the right (easeOut) to reveal the stage/fighters.
  //    Slanted leading edge = the fast diagonal MK/Tekken swipe. Reveal completes by ~82%.
  const rev   = _easeOutCubic(Math.min(1, p / 0.82))
  const slant = ch * 0.55
  const edgeX = rev * (cw + slant)              // trailing edge base: 0 (full cover) → cw+slant (clear)

  if (edgeX < cw + slant) {
    // Covered polygon (to the RIGHT of the slanted edge): top edge leads, bottom edge trails.
    ctx.beginPath()
    ctx.moveTo(edgeX, 0)
    ctx.lineTo(cw + slant, 0)
    ctx.lineTo(cw + slant, ch)
    ctx.lineTo(edgeX - slant, ch)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, ch)
    g.addColorStop(0, "#12161f")
    g.addColorStop(0.5, "#080a10")
    g.addColorStop(1, "#04050a")
    ctx.fillStyle = g
    ctx.fill()

    // Brushed-metal diagonal striations on the cover (subtle, angular).
    ctx.save()
    ctx.clip()
    ctx.globalAlpha = 0.08
    ctx.strokeStyle = "#8fb6d8"; ctx.lineWidth = 2
    for (let sx = edgeX - slant; sx < cw + slant + 40; sx += 34) {
      ctx.beginPath(); ctx.moveTo(sx + slant, 0); ctx.lineTo(sx, ch); ctx.stroke()
    }
    ctx.restore()

    // 3) BRIGHT LEADING ACCENT EDGE — white core + cyan glow riding the wipe front.
    ctx.save()
    ctx.shadowBlur = 26; ctx.shadowColor = "rgba(90,190,255,0.95)"
    ctx.strokeStyle = "#dff3ff"; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(edgeX, 0); ctx.lineTo(edgeX - slant, ch); ctx.stroke()
    ctx.strokeStyle = "rgba(120,205,255,0.75)"; ctx.lineWidth = 14; ctx.shadowBlur = 0
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(edgeX, 0); ctx.lineTo(edgeX - slant, ch); ctx.stroke()
    ctx.restore()

    // 4) SPEED STREAKS — a few horizontal motion lines trailing the accent edge (energy).
    ctx.globalAlpha = 0.35 * (1 - rev)
    ctx.strokeStyle = "#bfe6ff"; ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const sy = ch * (0.18 + i * 0.16)
      const lx = edgeX - slant * (sy / ch)      // follow the slant at this height
      ctx.beginPath(); ctx.moveTo(lx - 160, sy); ctx.lineTo(lx - 20, sy); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // 5) LAND ON "ROUND 1" — as the wipe clears (tail), snap two accent bars horizontally through
  //    the center where the ROUND banner sits, punctuating the reveal.
  if (p > 0.62) {
    const q = _easeInCubic(Math.min(1, (p - 0.62) / 0.38))
    const cy = ch / 2
    const half = (cw * 0.5) * q
    ctx.globalAlpha = 0.9 * (1 - q * 0.4)
    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(90,190,255,0.8)"
    const bg = ctx.createLinearGradient(cw / 2 - half, 0, cw / 2 + half, 0)
    bg.addColorStop(0, "rgba(90,190,255,0)")
    bg.addColorStop(0.5, "rgba(220,243,255,0.95)")
    bg.addColorStop(1, "rgba(90,190,255,0)")
    ctx.fillStyle = bg
    ctx.fillRect(cw / 2 - half, cy - 46, half * 2, 2)
    ctx.fillRect(cw / 2 - half, cy + 44, half * 2, 2)
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
  }

  ctx.restore()
}
