// Satoru Gojo — Shinjuku Arc (gojo_shinjuku) — PRESENTATION ONLY: technique visuals, HUD (CE bar, cooldowns, burnout),
// chant captions, intro / win bubbles and sound cues. Reads f._gs (sim state); writes nothing the simulation reads.
// INFINITY IS INVISIBLE: nothing here draws or plays anything for it. The only tell is the CE bar draining. The single
// exception is the training-only debug ring (Training mode + the "Infinity debug radius" toggle, off by default).
import { sound } from './sound.js'
import { GOJO_SHINJUKU_FX, GOJO_SHINJUKU_CHANT } from './gojoShinjukuSprites.js'
import { GS_KEY, INFINITY, CHANT, DOMAIN, FBE, RCT, CE_UNIT } from './gojoShinjukuData.js'
import { chantLineAt } from './gojoShinjukuState.js'

const isGs = f => f?.rosterKey === GS_KEY
const IMG = {}
function img(src) {
  if (!src || typeof Image === 'undefined') return null
  let i = IMG[src]
  if (!i) { i = IMG[src] = new Image(); try { i.src = src } catch (_) {} }
  return i
}
const ready = i => !!(i && i.complete !== false && (i.naturalWidth || i.width))
const ctrX = f => f.x + f.w / 2, ctrY = f => f.y + f.h / 2

// ── training debug (off by default; Training mode only) ──
let _debugRadius = false
try { _debugRadius = globalThis.localStorage?.getItem?.('ms_gs_infinity_debug') === '1' } catch (_) {}
export function setGsInfinityDebug(on) { _debugRadius = !!on; try { globalThis.localStorage?.setItem?.('ms_gs_infinity_debug', on ? '1' : '0') } catch (_) {} }
export const gsInfinityDebug = () => _debugRadius

function sprite(c, key, x, y, scale = 1, alpha = 1) {
  const d = GOJO_SHINJUKU_FX?.[key]; if (!d) return false
  const i = img(d.sheet); if (!ready(i)) return false
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false
  const w = d.w * scale, h = d.h * scale
  c.drawImage(i, 0, 0, d.w, d.h, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h))
  c.restore(); return true
}
function ring(c, x, y, r, col, a = 1, lw = 2) { c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.stroke(); c.restore() }
function disc(c, x, y, r, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.fill(); c.restore() }

// ── world-space effects (drawn with the fighter) ──
export function drawGsFx(c, f, training = false) {
  if (!isGs(f) || !f._gs) return
  const s = f._gs, t = s.clock
  // Infinity: NOTHING, except the training debug radius
  if (training && _debugRadius && s.inf.lv > 0) {
    const L = INFINITY.levels[s.inf.lv]
    c.save(); c.setLineDash([4, 4])
    c.strokeStyle = 'rgba(160,220,255,0.8)'; c.strokeRect(f.x - L.boundary, f.y - L.boundary, f.w + 2 * L.boundary, f.h + 2 * L.boundary)
    c.strokeStyle = 'rgba(160,220,255,0.35)'; c.strokeRect(f.x - L.boundary - L.slow, f.y - L.boundary - L.slow, f.w + 2 * (L.boundary + L.slow), f.h + 2 * (L.boundary + L.slow))
    if (L.repel) { c.strokeStyle = 'rgba(255,170,120,0.6)'; c.strokeRect(f.x - L.repel, f.y, f.w + 2 * L.repel, f.h) }
    c.setLineDash([]); c.fillStyle = 'rgba(200,235,255,0.9)'; c.font = 'bold 10px monospace'; c.textAlign = 'center'
    c.fillText(`INFINITY L${s.inf.lv} (debug)`, ctrX(f), f.y - L.boundary - 6); c.restore()
  }
  // CHARGING (hold P): a cursed-energy aura — pale-blue flame tongues rising around him + Six Eyes glint (render-only;
  // phases come from the sim clock so a replay draws it identically). Infinity itself stays invisible.
  if (s.charging && f.isCharging) {
    const cx = ctrX(f), feet = f.y + f.h, pulse = 0.5 + 0.5 * Math.sin(t * 0.35)
    c.save()
    // body glow (screen-blend so it reads on light and dark stages)
    c.globalCompositeOperation = 'screen'
    const g = c.createRadialGradient(cx, feet - f.h * 0.5, 6, cx, feet - f.h * 0.5, f.h * 0.85)
    g.addColorStop(0, `rgba(120,200,255,${0.55 + 0.2 * pulse})`); g.addColorStop(0.6, 'rgba(70,140,255,0.25)'); g.addColorStop(1, 'rgba(40,90,255,0)')
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, feet - f.h * 0.5, f.w * 1.3, f.h * 0.8, 0, 0, Math.PI * 2); c.fill()
    // flame tongues: deep-blue core + white-blue edge, each rising and fading on its own phase
    c.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 10; i++) {
      const ph = ((t * 2 + i * 13) % 36) / 36
      const x = cx + ((i / 9) * 2 - 1) * f.w * 0.8 + Math.sin(i * 1.7 + t * 0.12) * 4, y = feet - 6 - ph * f.h * 1.1
      const w = 4 + (1 - ph) * 6, h = 10 + (1 - ph) * 16, a = (1 - ph) * 0.85
      c.fillStyle = `rgba(40,110,255,${a * 0.8})`; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = `rgba(200,240,255,${a})`; c.beginPath(); c.ellipse(x, y + h * 0.15, w * 0.45, h * 0.6, 0, 0, Math.PI * 2); c.fill()
    }
    // ground ring
    c.strokeStyle = `rgba(150,215,255,${0.5 + 0.3 * pulse})`; c.lineWidth = 2
    c.beginPath(); c.ellipse(cx, feet - 2, f.w * (1.1 + 0.15 * pulse), 7, 0, 0, Math.PI * 2); c.stroke()
    c.fillStyle = `rgba(220,245,255,${0.7 + 0.3 * pulse})`; c.fillRect(cx + (f.facing || 1) * 4 - 2, f.y + f.h * 0.11, 4, 2)   // Six Eyes glint
    c.restore()
  }
  // Blue fields: the sheet's orb, sized to the core; a faint swirl for the pull radius
  for (const F of s.fields) {
    if (F.kind === 'lapse' || F.kind === 'max') {
      const life = Math.min(1, F.t / 6, (F.life - F.t) / 8)
      const sc = F.kind === 'max' ? 2.2 : 1.1
      for (let k = 0; k < 3; k++) { const a = (t * 0.12 + k * 2.1) % (Math.PI * 2), rr = F.r * (0.35 + 0.15 * k); disc(c, F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr * 0.6, 2, '#9fe4ff', 0.5 * life) }
      if (!sprite(c, 'blueOrb', F.x, F.y, sc * (0.9 + 0.1 * Math.sin(t * 0.4)), life)) disc(c, F.x, F.y, F.core * 0.8, '#3fb2ff', 0.8 * life)
    } else if (F.kind === 'dred') {
      const p = 0.6 + 0.4 * Math.sin(F.t * 0.5)
      disc(c, F.x, F.y, 7 * p, '#ff2a2a', 0.9); disc(c, F.x, F.y, 3, '#fff', 0.9); ring(c, F.x, F.y, 12 + F.t % 12, '#ff5050', 0.5)
    }
  }
  // the imaginary mass
  for (const m of s.purples) {
    const r = m.r
    c.save(); const g = c.createRadialGradient?.(m.x, m.y, r * 0.2, m.x, m.y, r)
    if (g) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d9a8ff'); g.addColorStop(0.8, '#8a2cff'); g.addColorStop(1, 'rgba(90,0,160,0)'); c.fillStyle = g }
    else c.fillStyle = '#9b3cff'
    c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill(); c.restore()
    for (let k = 1; k <= 4; k++) disc(c, m.x - m.dir * k * m.speed * 2.2, m.y, r * (1 - k * 0.18), '#7a1fd6', 0.18)
  }
  // hints
  for (const h of s.fx) {
    const a = Math.max(0, 1 - h.t / 24)
    switch (h.kind) {
      case 'red': case 'redBurst': ring(c, h.x, h.y, (h.r || 30) * (0.3 + h.t / 14), '#ff2f2f', a, 3); disc(c, h.x, h.y, 6 * a, '#fff', a); break
      case 'blueHit': ring(c, h.x, h.y, 8 + h.t, '#6fd0ff', a); break
      case 'spark': disc(c, h.x, h.y, 5 * a, '#fff', a); break
      case 'block': ring(c, h.x, h.y, 10 + h.t, '#ffffff', a * 0.7); break
      case 'blueDot': disc(c, h.x, h.y, 4, '#7fd8ff', a); break
      case 'ghost': c.save(); c.globalAlpha = a * 0.35; c.fillStyle = '#7fd8ff'; c.fillRect(h.x + 8, h.y + 6, 32, 80); c.restore(); break
      case 'bounce': ring(c, h.x, h.y, 14 + h.t * 2, '#ffb0b0', a); break
      case 'blackFlash': {   // procedural: black lightning with a red rim, spatial distortion ring
        const A = Math.max(0, 1 - h.t / 20)
        c.save(); c.globalAlpha = A; c.lineWidth = 3
        for (let k = 0; k < 6; k++) {
          const ang = k * 1.047 + h.t * 0.05, len = 26 + (k % 3) * 10
          c.strokeStyle = k % 2 ? '#e0102a' : '#050008'
          c.beginPath(); c.moveTo(h.x, h.y)
          c.lineTo(h.x + Math.cos(ang) * len * 0.5 + (k % 2 ? 6 : -6), h.y + Math.sin(ang) * len * 0.5)
          c.lineTo(h.x + Math.cos(ang) * len, h.y + Math.sin(ang) * len); c.stroke()
        }
        c.restore(); ring(c, h.x, h.y, 18 + h.t * 3, '#000', A * 0.7, 4); break
      }
      case 'glint': disc(c, h.x, h.y, 3 * a, '#dff6ff', a); ring(c, h.x, h.y, 6 + h.t, '#bff0ff', a * 0.6, 1); break
      case 'fbe': ring(c, h.x, h.y, 30 + h.t * 2, '#d8f4ff', a, 3); break
      case 'rct': for (let k = 0; k < (h.big ? 8 : 3); k++) disc(c, h.x + Math.sin(k * 2.4) * 18, h.y - h.t - k * 6, 2, '#eaffea', a); break
      case 'purpleHit': ring(c, h.x, h.y, 20 + h.t * 3, '#c07bff', a, 3); break
      case 'dome': {
        const d = GOJO_SHINJUKU_FX?.dome, sc = h.big ? 1.6 : 1
        if (!sprite(c, 'dome', h.x, h.y - (d ? d.h * sc / 2 : 40), sc, Math.max(0, 1 - h.t / 40))) disc(c, h.x, h.y - 30, 40, '#b469ff', a)
        break
      }
    }
  }
  // 200 % chant captions (the sheet's own strips) above him while he incants
  const A = f.attacking && f.currentAttack?.gs?.key === 'gPurple200' ? f.currentAttack : null
  if (A && s.chant) {
    const i = chantLineAt(A.total - A.timer)
    const strip = i >= 0 ? GOJO_SHINJUKU_CHANT?.[Math.min(i, 3)] : null
    if (strip) {
      const im = img(strip.sheet)
      if (ready(im)) { c.save(); c.imageSmoothingEnabled = false; const sc = 2; c.drawImage(im, Math.round(ctrX(f) - strip.w * sc / 2), Math.round(f.y - 40 - strip.h * sc), strip.w * sc, strip.h * sc); c.restore() }
      const j = s.chant.judged[Math.min(i, 2)]
      if (i < 3 && j != null) { c.save(); c.font = 'bold 11px Arial'; c.textAlign = 'center'; c.fillStyle = j ? '#e6c8ff' : 'rgba(255,255,255,0.4)'; c.fillText(j ? '+33%' : '—', ctrX(f), f.y - 44); c.restore() }
    }
  }
  // burnout nosebleed (two red pixels under the nose, dripping)
  if (s.burnout > 0) {
    const nx = ctrX(f) + (f.facing || 1) * 6, ny = f.y + 18
    c.save(); c.fillStyle = '#c40018'; c.fillRect(Math.round(nx), Math.round(ny), 2, 4 + ((t >> 3) % 4)); c.restore()
  }
}

// ── HUD: CE bar under his health bar + cooldown / burnout indicators (the CE bar is Infinity's only tell) ──
export function gsHudLabel(f) {
  const s = f?._gs; if (!s) return null
  return { ce: s.ce / CE_UNIT, lock: s.ceLock, burnout: s.burnout, domainCd: s.cd.domain, fbeCd: s.cd.fbe, rctCd: s.cd.rct, zone: s.zone }
}
export function drawGsHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (!isGs(f) || !f._gs) return
    const L = gsHudLabel(f), w = Math.round(barW * 0.62), h = 7
    const x0 = flip ? cw - pad - 20 - w : pad + 78, y0 = 64
    c.save()
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x0 - 1, y0 - 1, w + 2, h + 2)
    const fill = Math.max(0, Math.min(1, L.ce / 100)) * w
    c.fillStyle = L.lock > 0 ? ((L.lock >> 3) % 2 ? '#ff3b3b' : '#5a1010') : '#7fd8ff'
    c.fillRect(flip ? x0 + w - fill : x0, y0, fill, h)
    c.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 1; k < 4; k++) c.fillRect(x0 + Math.round(w * k / 4), y0, 1, h)
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    c.fillStyle = '#dff4ff'; c.fillText(`CE ${Math.floor(L.ce)}${L.lock > 0 ? '  DEPLETED' : ''}`, flip ? x0 + w : x0, y0 + h + 2)
    const tags = []
    if (L.burnout > 0) tags.push(['BURNOUT ' + (L.burnout / 60).toFixed(1) + 's', '#ff6a6a'])
    tags.push(L.domainCd > 0 ? ['VOID ' + Math.ceil(L.domainCd / 60) + 's', 'rgba(255,255,255,0.5)'] : ['VOID READY', '#c9a7ff'])
    if (L.fbeCd > 0) tags.push(['FBE ' + Math.ceil(L.fbeCd / 60) + 's', 'rgba(255,255,255,0.45)'])
    if (L.rctCd > 0) tags.push(['RCT ' + Math.ceil(L.rctCd / 60) + 's', 'rgba(255,255,255,0.45)'])
    if (L.zone > 0) tags.push(['THE ZONE', '#ff4a6a'])
    let tx = flip ? x0 + w - 64 : x0 + 64
    for (const [txt, col] of tags) { c.fillStyle = col; c.fillText(txt, tx, y0 + h + 2); const tw = c.measureText ? c.measureText(txt).width : txt.length * 6; tx += (flip ? -1 : 1) * (tw + 10) }
    c.restore()
  }
  one(p1, false); one(p2, true)
}

// ── sounds (Infinity has none). Shared old-Gojo files for Red / Purple; synth names for the rest. ──
const SFX = {
  redCrack: () => sound.playSfxFile?.('gojo_red.mp3', null),
  purpleFire: () => sound.playSfxFile?.('gojo_hollow_purple.mp3', null),
  purple200Fire: () => sound.playSfxFile?.('gojo_hollow_purple.mp3', null),
}
const MUTE = new Set(['stop', 'pin', 'depleted'])          // Infinity events are SILENT
export function playGsCues(f) {
  const q = f?._gs?.cues; if (!q?.length) return
  for (const v of q) {
    const k = typeof v === 'string' ? v : v.c
    if (MUTE.has(k)) continue
    try { if (SFX[k]) SFX[k](); else sound.play?.('gs_' + k) } catch (_) {}
  }
  q.length = 0
}
