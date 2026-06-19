// domains.js
// Domain Expansion system — activation, update, rendering, conflict resolution, HUD, and background effects.

import { sound, SFX, MUSIC } from "./sound.js"

export const activeDomains = []

const DOMAIN_DEFAULTS = {
  range: 320,
  duration: 8, // seconds
  cost: 100,
  priority: 1,
  damageBoost: 1.35,
  speedPenalty: 0.75,
  background: null
}

let _domainFadeIn = 0
let _domainFadeOut = 0
let _lastDomainBg = null

// Gojo "Unlimited Void" — optional VIDEO-backed background (visual only: muted,
// kept OUT of any audio graph). Lazily created on first use; if the file is
// missing/unready/decode-fails it falls back to the procedural _drawUnlimitedVoid().
let _gojoVideo       = null
let _gojoVideoFailed = false
let _gojoActiveOwner = null   // tracks the live Gojo domain so a new one replays from 0
let _gojoEndImg      = null
let _gojoEndImgReady = false

// ─────────────────────────────────────────────────────────────────
// ACTIVATION
// ─────────────────────────────────────────────────────────────────
export function activateDomain(fighter, options = {}, context = {}) {
  if (!fighter) return false

  const cost = options.cost ?? DOMAIN_DEFAULTS.cost
  if ((fighter.energy || 0) < cost && cost > 0) return false

  fighter.energy = Math.max(0, (fighter.energy || 0) - cost)

  const existing = activeDomains.findIndex(d => d.owner === fighter)
  if (existing >= 0) {
    collapseDomain(activeDomains[existing])
    activeDomains.splice(existing, 1)
  }

  const durationFrames = Math.floor((options.duration ?? fighter.domain?.duration ?? DOMAIN_DEFAULTS.duration) * 60)

  const domain = {
    owner: fighter,
    name: options.name || fighter.domain?.name || "Domain Expansion",
    priority: options.priority ?? fighter.domain?.priority ?? DOMAIN_DEFAULTS.priority,
    range: options.range ?? fighter.domain?.range ?? DOMAIN_DEFAULTS.range,
    timer: durationFrames,
    timerMax: durationFrames,
    background: options.background || fighter.domain?.background || DOMAIN_DEFAULTS.background,
    damageBoost: options.damageBoost ?? fighter.domain?.damageBoost ?? DOMAIN_DEFAULTS.damageBoost,
    speedPenalty: options.speedPenalty ?? fighter.domain?.speedPenalty ?? DOMAIN_DEFAULTS.speedPenalty,
    effect: options.effect || fighter.domain?.effect || null,
    active: true,
    rosterKey: (fighter.rosterKey || fighter.id || "").toLowerCase()
  }

  activeDomains.push(domain)

  fighter.domainBuff = true
  fighter.activeDomainTimer = durationFrames
  fighter.attackMultiplier = (fighter.attackMultiplier || 1) * domain.damageBoost

  _domainFadeIn = 6
  _domainFadeOut = 0
  _lastDomainBg = domain.rosterKey

  // Gojo's video-backed background restarts from frame 0 on (re)activation so a
  // rematch replays cleanly. Visual only — Gojo's AUDIO path below is unchanged.
  if (domain.rosterKey === "gojo") _restartGojoVideo()

  // Sukuna gets bespoke domain audio (voice line + Malevolent Shrine theme),
  // fired on the SAME frame the white-flash fade-in begins. Every other domain
  // keeps the generic activate SFX + procedural domain loop unchanged.
  if (domain.rosterKey === "sukuna") {
    // EXACT on-disk filenames (case-sensitive): voice line is "Sukuna_saying_Domain.mp3".
    sound?.playDomainAudio?.("Sukuna_saying_Domain.mp3", "Sukuna_Theme.mp3")
  } else if (domain.rosterKey === "gojo") {
    // Unlimited Void theme (looping), replacing the stage track. playDomainAudio
    // gesture-gates and falls back to the procedural DOMAIN_LOOP if the file 404s.
    // No voice line for Gojo (null). EXACT case-sensitive filename below.
    sound?.playDomainAudio?.(null, "Gojo_domain_theme.mp3")
  } else {
    sound?.play?.(SFX.DOMAIN_ACTIVATE)
    sound?.playMusic?.(MUSIC.DOMAIN_LOOP, true)
  }

  if (context?.camera?.shake) context.camera.shake(18, 20)

  return domain
}

// ─────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION
// ─────────────────────────────────────────────────────────────────
function resolveConflicts() {
  if (activeDomains.length <= 1) return

  activeDomains.sort((a, b) => b.priority - a.priority)

  for (let i = activeDomains.length - 1; i >= 1; i--) {
    collapseDomain(activeDomains[i])
    activeDomains.splice(i, 1)
  }
}

function collapseDomain(domain) {
  if (!domain?.owner) return

  const owner = domain.owner

  if (domain.damageBoost && domain.damageBoost !== 1) {
    owner.attackMultiplier = Math.max(1, (owner.attackMultiplier || 1) / domain.damageBoost)
  }

  owner.domainBuff = false
  owner.activeDomainTimer = 0

  // Sukuna's domain hijacked the music with its own looping theme — on collapse
  // (timer expiry, conflict, or clearDomains) stop it and restore the map's own
  // track. Other domains are untouched (their loop behavior is unchanged).
  if (domain.rosterKey === "sukuna") {
    sound?.stopMusicFile?.()
    sound?.restoreStageMusic?.()
  }

  // Gojo's background video: pause on collapse (no reverse — HTML5 reverse is
  // unreliable); the existing _domainFadeOut alpha handles the fade. Owner-keyed
  // because abilities.js domains carry no rosterKey. Reset so the next activation
  // replays from the start.
  if ((domain.owner?.rosterKey || domain.rosterKey) === "gojo") {
    _gojoActiveOwner = null
    if (_gojoVideo && !_gojoVideoFailed) { try { _gojoVideo.pause() } catch (_) {} }
    // Gojo's domain replaced the stage track with its theme — restore the map's
    // own music on collapse (mirrors Sukuna). stopMusicFile() clears the theme.
    sound?.stopMusicFile?.()
    sound?.restoreStageMusic?.()
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────
export function updateDomains(fighters = []) {
  resolveConflicts()

  if (_domainFadeIn > 0) _domainFadeIn--
  if (_domainFadeOut > 0) _domainFadeOut--

  for (let i = activeDomains.length - 1; i >= 0; i--) {
    const domain = activeDomains[i]
    if (!domain) {
      activeDomains.splice(i, 1)
      continue
    }

    domain.timer--
    if (domain.owner) {
      domain.owner.activeDomainTimer = Math.max(0, domain.timer)
    }

    for (const fighter of fighters) {
      if (!fighter || fighter === domain.owner) continue

      const ownerCX = (domain.owner.x || 0) + (domain.owner.w || 0) / 2
      const ownerCY = (domain.owner.y || 0) + (domain.owner.h || 0) / 2
      const fighterCX = (fighter.x || 0) + (fighter.w || 0) / 2
      const fighterCY = (fighter.y || 0) + (fighter.h || 0) / 2

      const dx = fighterCX - ownerCX
      const dy = fighterCY - ownerCY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > domain.range) continue

      if (domain.rosterKey === "gojo" || domain.rosterKey === "sukuna") {
        // BUG_4: inside Gojo's Void / Sukuna's Shrine the trapped opponent can't
        // move — refresh hitstun every frame (physics.moveFighter blocks input
        // while hitstun>0) and kill momentum. The caster (owner) is excluded above.
        fighter.hitstun = Math.max(fighter.hitstun || 0, 4)
        fighter.vx = 0
        fighter.vy = (fighter.vy || 0) * 0.2
        // TASK 6: BOTH domains apply continuous CE damage to the trapped fighter
        // (was Sukuna-only). Sukuna's Malevolent Shrine hits harder than Gojo's
        // Unlimited Void. (Owner's +attack buff is applied in activateDomain.)
        if (Math.random() < 0.06) {
          const chip = domain.rosterKey === "sukuna" ? 12 : 8
          fighter.health = Math.max(0, (fighter.health || 0) - chip)
          fighter.colorFlash = 4
          if (fighter.health <= 0) sound?.play?.(SFX.KO)
        }
      } else if (domain.rosterKey === "megumi") {
        fighter.vx = (fighter.vx || 0) * domain.speedPenalty
        fighter.vy = (fighter.vy || 0) * Math.max(0.85, domain.speedPenalty)
      } else {
        fighter.vx = (fighter.vx || 0) * domain.speedPenalty
        fighter.vy = (fighter.vy || 0) * Math.max(0.85, domain.speedPenalty)
      }

      if (typeof domain.effect === "function") {
        domain.effect(fighter, domain.owner, dist, domain.range)
      }
    }

    if (domain.timer <= 0) {
      collapseDomain(domain)
      activeDomains.splice(i, 1)
      _domainFadeOut = 20
      // Last domain expired mid-round — RESUME the map's stage track (don't go
      // silent). collapseDomain already stopped the domain theme/loop above.
      if (activeDomains.length === 0) sound?.restoreStageMusic?.()
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// BACKGROUND DRAWING
// ─────────────────────────────────────────────────────────────────
export function drawDomainBackground(ctx, canvas, groundY, floorHeight) {
  if (activeDomains.length === 0 && _domainFadeOut <= 0) return
  if (!ctx) return

  const cw = canvas?.width || window.innerWidth
  const ch = canvas?.height || window.innerHeight
  const domain = activeDomains[0]
  // Resolve which background to draw. Domains pushed from abilities.js carry no
  // `rosterKey`, so recognize Gojo via the owner (GOJO-ONLY — every other domain
  // resolves to null exactly as before, so their rendering is untouched).
  // Remember it so the fade-OUT frames after the domain object is gone keep
  // showing the right background.
  let bgType
  if (domain) {
    bgType = domain.rosterKey || (domain.owner?.rosterKey === "gojo" ? "gojo" : null)
    _lastDomainBg = bgType
  } else {
    bgType = _lastDomainBg
  }
  const fadeAlpha = domain ? 1 : Math.max(0, _domainFadeOut / 20)

  if (fadeAlpha <= 0) return

  ctx.save()
  ctx.globalAlpha = fadeAlpha

  switch (bgType) {
    case "gojo":
      _drawGojoDomain(ctx, cw, ch)   // video-backed; _drawUnlimitedVoid is the fallback
      break
    case "sukuna":
      _drawMalevolentShrine(ctx, cw, ch)
      break
    case "megumi":
      _drawChimeraShadowGarden(ctx, cw, ch)
      break
    default:
      _drawGenericDomain(ctx, cw, ch, domain)
      break
  }

  ctx.restore()

  if (_domainFadeIn > 0) {
    ctx.save()
    ctx.fillStyle = "#ffffff"
    ctx.globalAlpha = (_domainFadeIn / 6) * 0.85
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
  }
}

// ── GOJO VIDEO-BACKED BACKGROUND ─────────────────────────────────
// Lazily create the hidden, muted <video> (and an optional end-frame still).
function _ensureGojoVideo() {
  if (_gojoVideo || _gojoVideoFailed) return
  if (typeof document === "undefined") { _gojoVideoFailed = true; return }
  try {
    const v = document.createElement("video")
    v.muted        = true     // muted → exempt from the autoplay-without-gesture block
    v.defaultMuted = true
    v.playsInline  = true
    v.setAttribute("muted", "")
    v.setAttribute("playsinline", "")
    v.loop      = false
    v.preload   = "auto"
    v.autoplay  = true
    v.onerror   = () => { _gojoVideoFailed = true }   // 404/decode → clean fallback, never black
    v.src       = "./gojo_domain.mp4"
    // Attach OFF-SCREEN (not display:none, which can stop frame decoding) so the
    // browser reliably loads & decodes frames for canvas drawImage. A detached
    // <video> often never advances past readyState 0/1 → only the void showed.
    v.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;"
    document.body.appendChild(v)
    v.load()
    _gojoVideo  = v

    // Optional end-frame still. Absent → we simply freeze on the video's last frame.
    const img = new Image()
    img.onload  = () => { _gojoEndImgReady = true }
    img.onerror = () => { _gojoEndImgReady = false }
    img.src = "./gojo_domain_end.jpg"
    _gojoEndImg = img
  } catch (_) { _gojoVideoFailed = true }
}

// Restart from frame 0 and play. The seek is in its OWN try so a seek error on a
// not-yet-loaded video can NEVER skip the .play() call (the bug that left the
// video stuck on the void fallback the first time the domain opened).
function _restartGojoVideo() {
  const v = _gojoVideo
  if (!v || _gojoVideoFailed) return
  try { v.currentTime = 0 } catch (_) {}
  try {
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  } catch (_) {}
}

// cover-fit: scale to fill, center-crop, preserve aspect.
function _coverDraw(ctx, src, sw, sh, cw, ch) {
  if (!sw || !sh) return
  const scale = Math.max(cw / sw, ch / sh)
  const dw = sw * scale, dh = sh * scale
  ctx.drawImage(src, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
}

function _drawGojoDomain(ctx, cw, ch) {
  _ensureGojoVideo()

  // Live (re)activation trigger: a NEW Gojo domain owner → replay from the top
  // (so a rematch starts clean). In this build domains are created in
  // abilities.js, so this render-path detection is what actually fires;
  // activateDomain() also calls _restartGojoVideo() to honor that contract.
  const gojoDomain = activeDomains.find(d => d?.owner?.rosterKey === "gojo")
  if (gojoDomain && gojoDomain.owner !== _gojoActiveOwner) {
    _gojoActiveOwner = gojoDomain.owner
    _restartGojoVideo()
  }

  const v = _gojoVideo
  if (_gojoVideoFailed || !v) { _drawUnlimitedVoid(ctx, cw, ch); return }

  // Ended → a paused/ended <video> holds its final frame, so drawing it stays
  // seamless; if an end-frame still was supplied + loaded, draw that instead.
  if (v.ended && _gojoEndImgReady && _gojoEndImg) {
    _coverDraw(ctx, _gojoEndImg, _gojoEndImg.naturalWidth, _gojoEndImg.naturalHeight, cw, ch)
    return
  }

  // readyState >= 2 (HAVE_CURRENT_DATA) with real dimensions → draw the frame;
  // otherwise the procedural void still renders so the domain is never blank.
  if (v.readyState >= 2 && v.videoWidth > 0) {
    _coverDraw(ctx, v, v.videoWidth, v.videoHeight, cw, ch)
  } else {
    _drawUnlimitedVoid(ctx, cw, ch)
  }
}

function _drawUnlimitedVoid(ctx, cw, ch) {
  ctx.fillStyle = "#000008"
  ctx.fillRect(0, 0, cw, ch)

  const t = performance.now() * 0.0003
  ctx.fillStyle = "rgba(220,230,255,0.85)"

  for (let i = 0; i < 280; i++) {
    const sx = ((Math.sin(i * 127.1 + 1) * 0.5 + 0.5) * cw + t * 8 * (i % 5)) % cw
    const sy = (Math.cos(i * 311.7 + 2) * 0.5 + 0.5) * ch
    ctx.beginPath()
    ctx.arc(sx, sy, 0.5 + (i % 3) * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const nebulae = [
    { x: cw * 0.25, y: ch * 0.3, r: cw * 0.28, c: "rgba(30,40,140,0.18)" },
    { x: cw * 0.7, y: ch * 0.6, r: cw * 0.22, c: "rgba(80,20,120,0.15)" },
    { x: cw * 0.5, y: ch * 0.15, r: cw * 0.18, c: "rgba(20,60,180,0.12)" }
  ]

  nebulae.forEach(n => {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
    g.addColorStop(0, n.c)
    g.addColorStop(1, "transparent")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cw, ch)
  })

  ctx.strokeStyle = "rgba(180,200,255,0.05)"
  ctx.lineWidth = 1

  for (let gx = 0; gx < cw; gx += 60) {
    ctx.beginPath()
    ctx.moveTo(gx, 0)
    ctx.lineTo(gx, ch)
    ctx.stroke()
  }

  for (let gy = 0; gy < ch; gy += 60) {
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(cw, gy)
    ctx.stroke()
  }

  _drawDomainLabel(ctx, cw, ch, "Unlimited Void", "#60a5fa")
}

function _drawMalevolentShrine(ctx, cw, ch) {
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, "#1a0000")
  g.addColorStop(0.5, "#3b0000")
  g.addColorStop(1, "#0f0000")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  ctx.strokeStyle = "rgba(200,50,30,0.3)"
  ctx.lineWidth = 2

  ;[
    [cw * 0.1, ch * 0.85, cw * 0.2, ch * 0.75],
    [cw * 0.6, ch * 0.9, cw * 0.7, ch * 0.78],
    [cw * 0.4, ch * 0.95, cw * 0.55, ch * 0.75]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  })

  const t = Math.floor(performance.now() / 180)
  for (let i = 0; i < 6; i++) {
    const seed = (t + i * 17) % 100
    const alpha = ((t * 7 + i * 13) % 60) / 60
    if (alpha < 0.2) continue

    const x1 = (seed * 137 + i * 89) % cw
    const y1 = (seed * 231 + i * 47) % (ch * 0.8)

    ctx.save()
    ctx.globalAlpha *= alpha * 0.6
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + 80 + (seed % 60), y1 + 40 + (seed % 40))
    ctx.stroke()
    ctx.restore()
  }

  ctx.fillStyle = "rgba(80,0,0,0.55)"
  for (let i = 0; i < 12; i++) {
    const t2 = performance.now() * 0.0008 + i
    const bx = (Math.sin(i * 83.4 + t2) * 0.5 + 0.5) * cw
    const by = (Math.cos(i * 177.1 + t2 * 0.5) * 0.5 + 0.5) * ch * 0.7
    ctx.fillRect(bx - 6, by - 3, 12, 6)
  }

  _drawDomainLabel(ctx, cw, ch, "Malevolent Shrine", "#ef4444")
}

function _drawChimeraShadowGarden(ctx, cw, ch) {
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, cw, ch)

  const pg = ctx.createRadialGradient(cw / 2, ch * 0.85, 20, cw / 2, ch * 0.85, cw * 0.55)
  pg.addColorStop(0, "rgba(80,0,120,0.6)")
  pg.addColorStop(1, "transparent")
  ctx.fillStyle = pg
  ctx.fillRect(0, 0, cw, ch)

  const t = performance.now() * 0.0006
  ctx.strokeStyle = "rgba(120,40,180,0.12)"
  ctx.lineWidth = 1

  for (let i = 1; i < 5; i++) {
    const rad = 80 + i * 60 + Math.sin(t + i) * 15
    ctx.beginPath()
    ctx.arc(cw / 2, ch * 0.85, rad, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = "rgba(60,0,90,0.5)"
  ;[
    { x: cw * 0.12, y: ch * 0.55, rx: 30, ry: 18 },
    { x: cw * 0.78, y: ch * 0.35, rx: 40, ry: 24 },
    { x: cw * 0.62, y: ch * 0.58, rx: 33, ry: 25 },
    { x: cw * 0.3, y: ch * 0.4, rx: 50, ry: 36 }
  ].forEach(s => {
    ctx.beginPath()
    ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })

  _drawDomainLabel(ctx, cw, ch, "Chimera Shadow Garden", "#a78bfa")
}

function _drawGenericDomain(ctx, cw, ch, domain) {
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, "#0a000a")
  g.addColorStop(1, "#1a001a")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  _drawDomainLabel(ctx, cw, ch, domain?.name || "Domain Expansion", "#d8b4fe")
}

function _drawDomainLabel(ctx, cw, ch, name, color) {
  ctx.save()
  ctx.font = "900 28px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = color
  ctx.shadowBlur = 24
  ctx.shadowColor = color
  ctx.globalAlpha = 0.65
  ctx.fillText(name, cw / 2, ch * 0.12)
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// WORLD DRAWING
// ─────────────────────────────────────────────────────────────────
export function drawDomains(ctx) {
  if (!ctx) return

  for (const domain of activeDomains) {
    if (!domain?.owner) continue

    // Gojo/Sukuna domains span the whole map (range ~1e5); a world-space ring/fill
    // of that radius would be absurd. Their fullscreen drawDomainBackground +
    // the screen-space HUD bar convey the domain, so skip the world ring here.
    // Other domains keep their normal circular ring.
    if (domain.rosterKey === "gojo" || domain.rosterKey === "sukuna") continue

    const owner = domain.owner
    const cx = (owner.x || 0) + (owner.w || 0) / 2
    const cy = (owner.y || 0) + (owner.h || 0) / 2
    const radius = domain.range
    const alpha = Math.min(0.22, (domain.timer / 60) * 0.04 + 0.08)

    ctx.save()

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = owner.color || "rgba(180,100,255,0.9)"
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.55
    ctx.stroke()

    ctx.globalAlpha = alpha
    ctx.fillStyle = owner.color || "rgba(130,60,200,0.4)"
    ctx.fill()

    ctx.globalAlpha = 1

    if (domain.name) {
      ctx.font = "700 14px Arial"
      ctx.fillStyle = owner.color || "#d0a0ff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(domain.name, cx, cy - radius + 22)
    }

    const timerRatio = Math.max(0, domain.timer / ((domain.timerMax || domain.timer) || 1))
    const barW = radius * 1.4

    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW, 8)

    ctx.fillStyle = owner.color || "#a855f7"
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW * timerRatio, 8)

    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
export function getDomainHUDData() {
  if (!activeDomains.length) return null

  const d = activeDomains[0]
  return {
    name: d.name,
    owner: d.owner?.name || "?",
    ratio: Math.max(0, d.timer / (d.timerMax || 1)),
    color: d.owner?.color || "#a78bfa",
    rosterKey: d.rosterKey
  }
}

export function isInsideDomain(fighter) {
  for (const domain of activeDomains) {
    if (!domain?.owner || domain.owner === fighter) continue

    const cx = (domain.owner.x || 0) + (domain.owner.w || 0) / 2
    const cy = (domain.owner.y || 0) + (domain.owner.h || 0) / 2
    const fx = (fighter.x || 0) + (fighter.w || 0) / 2
    const fy = (fighter.y || 0) + (fighter.h || 0) / 2
    const dx = fx - cx
    const dy = fy - cy

    if (Math.sqrt(dx * dx + dy * dy) <= domain.range) return domain
  }

  return null
}

export function clearDomains() {
  const hadDomain = activeDomains.length > 0
  for (const d of activeDomains) collapseDomain(d)
  activeDomains.length = 0
  _domainFadeIn = 0
  _domainFadeOut = 0
  _lastDomainBg = null
  // clearDomains() runs on EVERY round reset (game.js resetRound) — it must NOT
  // stop the stage music, or the track dies at round end and never comes back.
  // Only touch audio if a domain was actually hijacking the channel, and then
  // RESTORE the map track. Match-end / menu / stage-change handle their own music
  // explicitly in the callers (resetToStart, _doRematch, startMatch).
  if (hadDomain) sound?.restoreStageMusic?.()
}

