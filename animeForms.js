// animeForms.js — anime juice Phase 3: "LEVEL UP" = TRANSFORMATIONS (the owner's breakdown B), PRESENTATION ONLY.
// The game has no XP levels, so every FORM CHANGE gets the level-up treatment:
//   1 slow fill   — a form gauge by the player's bar races, then CRAWLS the last bit (with the rising whoosh)
//   2 flash       — a bright flash + a burst of light from him
//   3 pillar      — a light pillar + rings rippling across the floor (animeJuice's pillar fx, re-used)
//   4 sound       — the whoosh while filling, the warm chime on the flash
//   5 slam        — the FORM NAME slammed by the bar, then the REAL stat changes counted up tick by tick
//                   ("DMG ×1.00 → ×1.40", "SPD 92 → 110", "DEF ×1.00 → ×1.20", "HP 1000 → 1300")
// Detection is generic: a change of fighter.currentForm (transformations.js, the Goku ladder, Naruto KCM, Zoro's
// Santoryu, …) or one of the curated form flags below. The deltas are read off the fighter itself (multipliers, speed,
// max HP) before vs after, so they are always the real numbers. ben10 / albedo (Omnitrix) are skipped.
// Never writes fighters. Deterministic. Gated like the rest of animeJuice (Hit Effects off → nothing).
import { juiceSettings } from './juiceSettings.js'
import { sound } from './sound.js'
import { camera } from './camera.js'

const R = Math.round
const play = id => { try { sound.play(id) } catch (_) {} }
const isBen = f => { const k = String(f?.rosterKey || '').toLowerCase(); return k === 'ben10' || k === 'albedo' }

// curated boolean form flags (kits that don't use currentForm) → the slammed name
export const FORM_FLAGS = {
  _sharinganActive: 'SHARINGAN', _susanooActive: 'SUSANOO', _piccoloPotentialActive: 'POTENTIAL UNLEASHED',
  _goldenFriezaActive: 'GOLDEN FRIEZA', _genosOverdriveActive: 'OVERDRIVE', _frogMode: 'SAGE MODE',
  _bakiDemonActive: 'DEMON BACK', _dkRageActive: 'BERSERK', _shikaiActive: 'SHIKAI', _mahoragaActive: 'MAHORAGA',
  _todoArmorActive: 'BOOGIE WOOGIE ARMOR', _solarFlareActive: 'SOLAR FLARE', _shiFlickerActive: 'FLICKER',
}
const BASEISH = /^(base|normal|none|default)$/i
const flagKey = f => { let k = ''; for (const n in FORM_FLAGS) if (f[n]) k += n; return k }
const formKey = f => {
  const cf = f.currentForm && !BASEISH.test(f.currentForm) && !/^ben10_/.test(f.currentForm) ? String(f.currentForm) : ''
  return cf + '|' + flagKey(f)
}
const PRETTY = { ssj: 'SUPER SAIYAN', ssj1: 'SUPER SAIYAN', ssj2: 'SUPER SAIYAN 2', ssj3: 'SUPER SAIYAN 3', god: 'SUPER SAIYAN GOD', blue: 'SUPER SAIYAN BLUE',
  ssblue: 'SUPER SAIYAN BLUE', ssjblue: 'SUPER SAIYAN BLUE', ui: 'ULTRA INSTINCT', ultraego: 'ULTRA EGO', ssbevolution: 'BLUE EVOLUTION', sagemode: 'SAGE MODE',
  kcmmode: 'KURAMA MODE', baryonmode: 'BARYON MODE', perfectcell: 'PERFECT CELL', golden: 'GOLDEN FRIEZA', black: 'BLACK FRIEZA', potential: 'POTENTIAL UNLEASHED',
  orange: 'ORANGE PICCOLO', darkaura: 'DARK AURA', rose: 'ROSÉ', santoryu: 'SANTORYU', megamode: 'MEGA MODE', demonback: 'DEMON BACK', hermit: 'SAGE MODE' }
export function formName(f) {
  const cf = f.currentForm && !BASEISH.test(f.currentForm) ? String(f.currentForm) : ''
  if (cf) {
    const t = f.transformations?.[cf]?.name || f.currentFormData?.name
    if (t) return String(t).toUpperCase()
    const tail = cf.replace(/^(goku_|naruto_hokage_|n7_)/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    return PRETTY[tail] || cf.replace(/^(goku_|n7_)/, '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()
  }
  for (const n in FORM_FLAGS) if (f[n]) return FORM_FLAGS[n]
  return 'POWER UP'
}
const stats = f => ({ dmg: +(f.damageMultiplier ?? f.attackMultiplier ?? 1), spd: +(f.speed ?? 0) * +(f.speedMultiplier ?? 1), spdM: +(f.speedMultiplier ?? 1), def: +(f.defenseMultiplier ?? 1), hp: +(f.maxHealth ?? 0) })
function deltas(a, b) {
  const out = [], near = (x, y) => Math.abs(x - y) < 0.004
  if (!near(a.dmg, b.dmg)) out.push({ k: 'DMG', a: a.dmg, b: b.dmg, mult: true })
  if (b.spd > 0 && Math.abs(a.spd - b.spd) >= 0.5) out.push({ k: 'SPD', a: a.spd, b: b.spd })
  else if (!near(a.spdM, b.spdM)) out.push({ k: 'SPD', a: a.spdM, b: b.spdM, mult: true })
  if (!near(a.def, b.def)) out.push({ k: 'DEF', a: a.def, b: b.def, mult: true })
  if (Math.abs(a.hp - b.hp) >= 1) out.push({ k: 'HP', a: a.hp, b: b.hp })
  return out
}

const S = { prev: [null, null], ev: [] }
export function formsReset() { S.prev = [null, null]; S.ev.length = 0 }
export function formsStatus() { return S.ev.map(e => ({ side: e.side, name: e.name, t: e.t, deltas: e.deltas })) }

// per sim frame, from animeJuiceTick (after the fighters updated). onCeremony(f, side) = animeJuice's pillar + flash.
export function formsTick(fs, on, onCeremony) {
  for (let i = 0; i < 2; i++) {
    const f = fs[i]; if (!f || isBen(f)) { S.prev[i] = null; continue }
    const key = formKey(f), st = stats(f), p = S.prev[i]
    if (p && key !== p.key && key.replace('|', '') !== '' && on) {   // a NEW form (not a revert to base)
      S.ev = S.ev.filter(e => e.side !== i)
      S.ev.push({ side: i, name: formName(f), t: 0, life: 150, before: p.st, deltas: [], filled: false })
      play('aj_whoosh')
    }
    S.prev[i] = { key, st }
  }
  for (let k = S.ev.length - 1; k >= 0; k--) {
    const e = S.ev[k], f = fs[e.side]
    if (e.t === 3 && f) e.deltas = deltas(e.before, stats(f))   // stats can land a frame or two after the form key
    if (e.t === FILL && f) { play('aj_chime'); try { camera.shake(5, 8) } catch (_) {} ; onCeremony?.(f, e.side) }
    if (++e.t > e.life) S.ev.splice(k, 1)
  }
}
const FILL = 24   // the gauge races then crawls over these frames, then the flash + pillar + slam

const fmt = (d, v) => d.mult ? '×' + v.toFixed(2) : String(R(v))
export function drawFormsHud(c, cv) {
  if (!S.ev.length) return
  for (const e of S.ev) {   // a backed panel right under that player's health bar (clear of the meter / Controls box)
    const right = e.side === 1, bx = right ? cv.width - 240 : 240, y0 = 82, n = e.deltas.length
    const fadeA = e.t < e.life - 20 ? 1 : Math.max(0, (e.life - e.t) / 20)
    c.save(); c.globalAlpha = 0.6 * fadeA; c.fillStyle = 'rgba(8,8,16,1)'
    c.fillRect(R(bx - 130), y0 - 8, 260, e.t >= FILL ? 52 + n * 20 : 24)
    c.globalAlpha = fadeA
    // 1. the slow fill: races, then crawls the last 15 %
    const u = Math.min(1, e.t / FILL), fill = u < 0.6 ? u / 0.6 * 0.85 : 0.85 + (u - 0.6) / 0.4 * 0.15, w = 220, x0 = bx - w / 2
    c.fillStyle = 'rgba(40,40,60,1)'; c.fillRect(R(x0), y0, w, 6)
    const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#ffb347'); g.addColorStop(1, '#fff3b0')
    c.fillStyle = g; c.fillRect(R(x0), y0, R(w * fill), 6)
    if (e.t >= FILL && e.t < FILL + 6 && !juiceSettings.reduceFlashing) { c.globalAlpha = 1 - (e.t - FILL) / 6; c.fillStyle = '#ffffff'; c.fillRect(R(x0 - 4), y0 - 4, w + 8, 14); c.globalAlpha = fadeA }
    if (e.t >= FILL) {   // 5. slam the FORM NAME, then count the stats up tick by tick
      const k = e.t - FILL, sc = k < 5 ? 2.3 - k * 0.26 : 1
      c.save(); c.translate(R(bx), y0 + 26); c.scale(sc, sc)
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 24px Impact, "Arial Black", sans-serif'
      c.lineWidth = 5; c.strokeStyle = 'rgba(40,20,0,0.9)'; c.strokeText(e.name, 0, 0)
      c.fillStyle = (k >> 2) % 2 && k < 24 ? '#ffffff' : '#ffd36b'; c.fillText(e.name, 0, 0); c.restore()
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 15px "Arial Black", Arial, sans-serif'; c.lineWidth = 4
      e.deltas.forEach((d, j) => {
        const start = 8 + j * 6; if (k < start) return
        const p = Math.min(1, (k - start) / 18), steps = Math.min(30, d.mult ? Math.max(1, R(Math.abs(d.b - d.a) / 0.01)) : Math.max(1, R(Math.abs(d.b - d.a))))
        const cur = d.a + (d.b - d.a) * Math.floor(p * steps) / steps   // tick by tick
        const txt = `${d.k}  ${fmt(d, d.a)}  →  ${fmt(d, cur)}`, y = y0 + 52 + j * 20
        c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(txt, R(bx), y); c.fillStyle = p >= 1 ? (d.b >= d.a ? '#7dffa0' : '#ff8a80') : '#ffffff'; c.fillText(txt, R(bx), y)
      })
    }
    c.restore()
  }
}
export const __animeFormsTest = { S, formKey, formName, stats, deltas }
