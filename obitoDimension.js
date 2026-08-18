// obitoDimension.js
// ─────────────────────────────────────────────────────────────────────────────
// "Obito_dimension" — KAMUI POCKET-DIMENSION BANISHMENT engine.
//
// A high-cost SPECIAL (NOT an ultimate) shared by Obito AND Tobi: it sends the OPPONENT into the Kamui
// pocket dimension for a short, hard-capped window — a real removal-from-play/disable, not cosmetic. While
// banished the foe is FROZEN (can't move/act), UNTOUCHABLE (can't be hit — they're not on the field), and
// fades into a dark void rift; on expiry they RE-MATERIALIZE with a few return i-frames and play resumes.
//
// This module is a CHARACTER-AGNOSTIC PRIMITIVE (the architectural sibling of cubeTrap.js / domains.js): it
// takes any (caster, target) and touches NO Obito- or Tobi-specific fields. So Obito's and Tobi's specials
// stay independently built — each owns its own input / cost / cooldown / per-match cap / voice and merely
// calls this shared, neutral engine (exactly as Isshiki's cube special calls spawnCubeTrap). It imports
// NOTHING from abilities.js (no import cycle) and deals ZERO damage — the balance guardrail (see Obito/Tobi
// fire* functions) is the cost + cooldown + per-match cap + the 2-second cap, not damage.
//
// VISUAL (per the canonical Kamui-dimension reference): a dark void rift with SILHOUETTED geometric
// block/monolith shapes at varying heights + a swirling violet Kamui rim, spiraling open on banish and
// closing as the foe returns.
// ─────────────────────────────────────────────────────────────────────────────

export const activeBanishments = []

// ── tuning (Stage-3 balance knobs; justified against BALANCE_AUDIT top-end specials in the audit note) ──
const BANISH_DURATION = 120   // frames the foe is held in the void (~2.0s) — the HARD cap (anti-stall)
const OPEN_FRAMES     = 14     // rift spiral-open
const CLOSE_FRAMES    = 14     // rift close as the foe re-materializes (visual only; foe already released)
const RETURN_IFRAMES  = 22     // brief invuln on return so the banish can't set up a guaranteed meaty

// Deterministic monolith skyline INSIDE the void (varying heights; nx across the rift, hFrac of rift height,
// wFrac of rift width). No Math.random in the draw loop — fixed layout so every banish reads identically.
const MONOLITHS = [
  { nx: 0.12, wFrac: 0.14, hFrac: 0.52 },
  { nx: 0.30, wFrac: 0.17, hFrac: 0.86 },
  { nx: 0.46, wFrac: 0.12, hFrac: 0.40 },
  { nx: 0.60, wFrac: 0.18, hFrac: 0.98 },
  { nx: 0.78, wFrac: 0.15, hFrac: 0.64 },
  { nx: 0.90, wFrac: 0.11, hFrac: 0.34 },
]

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN — banish `target` into the pocket dimension. One banishment per target.
// ─────────────────────────────────────────────────────────────────────────────
export function spawnObitoDimension(caster, target, context = {}, opts = {}) {
  if (!caster || !target) return null
  for (let i = activeBanishments.length - 1; i >= 0; i--) {
    if (activeBanishments[i].target === target) { release(activeBanishments[i]); activeBanishments.splice(i, 1) }
  }
  const groundY = (target.groundY != null) ? target.groundY : (target.y || 0) + (target.h || 100)
  const b = {
    caster, target, context,
    phase: "open",
    cx: (target.x || 0) + (target.w || 60) / 2,
    cy: (target.y || 0) + (target.h || 100) * 0.5,
    groundY,
    fh: target.h || 100, fw: target.w || 60,
    openTimer: OPEN_FRAMES, closeTimer: CLOSE_FRAMES,
    timer: opts.duration || BANISH_DURATION,
    life: 900,           // absolute safety cap
    clock: 0,
    grow: 0,             // 0 → 1 rift openness
  }
  applyBanishHold(b)     // banish IMMEDIATELY (the foe is gone the frame it's cast)
  activeBanishments.push(b)
  return b
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — spiral-open → held (frozen + untouchable) → release + visual close.
// ─────────────────────────────────────────────────────────────────────────────
export function updateObitoDimensions(fighters = [], hitEffects = [], context = {}) {
  for (let i = activeBanishments.length - 1; i >= 0; i--) {
    const b = activeBanishments[i]
    if (!b || !b.target || b.target.eliminated) { if (b) release(b); activeBanishments.splice(i, 1); continue }
    if (--b.life <= 0) { release(b); activeBanishments.splice(i, 1); continue }
    b.clock++

    if (b.phase === "open") {
      b.openTimer--
      b.grow = 1 - Math.max(0, b.openTimer) / OPEN_FRAMES
      applyBanishHold(b)
      if (b.openTimer <= 0) { b.grow = 1; b.phase = "banished" }
    } else if (b.phase === "banished") {
      applyBanishHold(b)
      b.timer--
      if (b.timer <= 0) { release(b); b.phase = "close"; b.closeTimer = CLOSE_FRAMES }   // return to play NOW; rift closes visually
    } else if (b.phase === "close") {
      b.closeTimer--
      b.grow = Math.max(0, b.closeTimer) / CLOSE_FRAMES
      if (b.closeTimer <= 0) { activeBanishments.splice(i, 1); continue }
    }
  }
}

// Freeze the foe in the void: no movement/action, untouchable, interrupt anything in progress.
function applyBanishHold(b) {
  const f = b.target
  if (!f) return
  f._banished     = true
  f.hitstun       = Math.max(f.hitstun || 0, 4)   // continuously re-applied → can't move or act (physics gates on hitstun)
  f.vx = 0; f.vy = 0
  f.attacking = false; f.currentMove = null; f.currentAttack = null   // drop any swing that was mid-startup
  f.isBlocking = false; f.isCharging = false
  f.invulnTimer   = Math.max(f.invulnTimer || 0, 4)   // belt-and-suspenders vs stray projectiles already in flight
}

// Return the foe to play with a few i-frames (anti-meaty). Idempotent.
function release(b) {
  const f = b?.target
  if (!f) return
  if (f._banished) f.invulnTimer = Math.max(f.invulnTimer || 0, RETURN_IFRAMES)
  f._banished = false
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — the dark void rift + monolith silhouettes + violet Kamui rim, in WORLD space, OVER the (faded)
// foe. Called after the fighters so it overlays them (game.js drawBattleScene).
// ─────────────────────────────────────────────────────────────────────────────
export function drawObitoDimensions(ctx) {
  if (!activeBanishments.length || !ctx) return
  for (const b of activeBanishments) {
    const g = b.grow
    if (g <= 0.001) continue
    const RW = b.fw * 2.3 * g, RH = b.fh * 2.5 * g       // rift opening size (scales with grow)
    const cx = b.cx, bottomY = b.groundY, topY = bottomY - RH
    const cy = (topY + bottomY) / 2
    ctx.save()

    // (1) the void OPENING — a dark rounded portal. Clip to it, so the interior fill + monoliths sit "inside".
    ctx.beginPath()
    ctx.ellipse(cx, cy, RW / 2, RH / 2, 0, 0, Math.PI * 2)
    ctx.save()
    ctx.clip()
    // near-black interior with a faint indigo top→bottom gradient (deep-space void)
    const grad = ctx.createLinearGradient(0, topY, 0, bottomY)
    grad.addColorStop(0, "#05040a"); grad.addColorStop(0.6, "#0b0a1c"); grad.addColorStop(1, "#02020a")
    ctx.globalAlpha = 0.94
    ctx.fillStyle = grad
    ctx.fillRect(cx - RW / 2, topY, RW, RH)
    // (2) MONOLITH silhouettes standing on the rift floor — varying heights, pure black blocks
    ctx.globalAlpha = 0.96
    ctx.fillStyle = "#000006"
    for (const m of MONOLITHS) {
      const mw = RW * m.wFrac, mh = RH * m.hFrac
      const mx = cx - RW / 2 + m.nx * RW - mw / 2
      ctx.fillRect(mx, bottomY - mh, mw, mh)
      // a thin violet edge-light on one side so the blocks read as 3D monoliths, not flat gaps
      ctx.fillStyle = "rgba(124,92,214,0.16)"; ctx.fillRect(mx, bottomY - mh, Math.max(1, mw * 0.12), mh)
      ctx.fillStyle = "#000006"
    }
    // (3) a few faint void motes drifting (deterministic off the clock)
    ctx.fillStyle = "rgba(160,140,230,0.5)"
    for (let i = 0; i < 5; i++) {
      const p = (b.clock * 0.01 + i * 0.19) % 1
      const px = cx - RW / 2 + ((i * 0.37 + 0.1) % 1) * RW
      const py = bottomY - p * RH
      ctx.globalAlpha = 0.5 * (1 - p)
      ctx.fillRect(px, py, 2, 2)
    }
    ctx.restore()   // drop the clip

    // (4) swirling violet KAMUI RIM around the opening — a couple rotating concentric ellipses (the portal edge)
    ctx.globalAlpha = 0.85 * Math.min(1, g * 1.4)
    ctx.lineCap = "round"
    for (let k = 0; k < 3; k++) {
      const rot = b.clock * 0.08 + k * 1.9
      const rw = RW / 2 * (1 - k * 0.12), rh = RH / 2 * (1 - k * 0.12)
      ctx.strokeStyle = k % 2 ? "#8b5cf6" : "#c4b5fd"
      ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 10; ctx.lineWidth = 2.4
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, rot, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}

export function clearObitoDimensions() {
  for (const b of activeBanishments) release(b)
  activeBanishments.length = 0
}

// Harness/debug read-out (first active banishment).
export function obitoDimensionState() {
  const b = activeBanishments[0]
  if (!b) return null
  return {
    phase: b.phase, timer: b.timer, grow: +(b.grow).toFixed(2),
    cx: Math.round(b.cx), targetBanished: !!b.target?._banished,
    targetInvuln: b.target?.invulnTimer || 0,
  }
}
