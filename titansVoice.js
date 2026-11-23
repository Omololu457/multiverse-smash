// titansVoice.js — Teen Titans voice lines (AUDIO-ONLY, no gameplay effect) for Beast Boy, Robin, Raven, Starfire and
// Cyborg, from the supplied voice compilations (titansVoiceData.js, tools/titansvoice). One voice channel per fighter
// (sound.playSfxFile owner): a line only cuts a playing one of LOWER priority. Clip choice + "sometimes" rolls are a
// pure hash of the fighter's own event counter (no Math.random). Nothing here is read by the sim.
//   • titanVoTick(f)        — every sim frame from play<X>Cues: hurt / big hurt / KO from health; Ultimate / morph cues
//   • titanVoDraw(f, opp)   — every render frame from draw<X>Fx: the win line a beat after the opponent drops
//   • titanIntroLine(f,opp) — once, when his / her intro starts (titansIntro.js): a line against THAT Titan, the team
//                             line against any other Titan, else the round intro
import { sound } from './sound.js'
import { TITANS_VOICE } from './titansVoiceData.js'

export const TITAN_KEYS = ['beast_boy', 'robin', 'raven', 'starfire', 'cyborg']
export const isTitan = f => !!f && TITAN_KEYS.includes(f.rosterKey)
const PRIO = { morph: 1, hurt: 2, shout: 2, taunt: 3, hurtBig: 3, ult: 5, intro: 5, titans: 5, win: 6, ko: 6 }
const VO = new WeakMap()
const voOf = f => { let m = VO.get(f); if (!m) { m = { t: 0, n: 0, at: {}, until: -1, prio: 0, hp: null, ko: false, opp: null, won: false, koT: 0, intro: false }; VO.set(f, m) } return m }
const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
export const titanPool = (f, pool) => TITANS_VOICE[f?.rosterKey]?.[pool] || null

export function titanVo(f, pool, o = {}) {
  const L = titanPool(f, pool); if (!L?.length) return false
  const m = voOf(f), t = m.t, pr = PRIO[pool.startsWith('vs:') ? 'titans' : pool] || 1
  if (o.cd && t - (m.at[pool] ?? -1e9) < o.cd) return false
  if (o.chance != null && hash(t + m.n * 31, pool.length) > o.chance) return false
  if (t < m.until && pr < m.prio) return false                         // something more important is still talking
  m.at[pool] = t; m.n++
  const [file, , dur] = o.pick != null ? L[o.pick % L.length] : L[Math.floor(hash(m.n * 7 + t, 3) * L.length) % L.length]
  m.until = t + Math.ceil((dur || 1) * 60); m.prio = pr
  try { sound.playSfxFile?.(file, null, { owner: f, fadeMs: 40 }) } catch (_) {}
  return true
}

// per sim frame (play<X>Cues): health → hurt / KO; the cue names the sim queued this frame → Ultimate / morph lines
export function titanVoTick(f, cues) {
  if (!isTitan(f)) return
  const m = voOf(f); m.t++
  for (const v of cues || []) {
    const k = typeof v === 'string' ? v : v?.c
    if (k === 'ultStart') titanVo(f, 'ult')
    else if (k === 'morph') titanVo(f, 'morph', { cd: 50 })
  }
  const hp = f.health
  if (m.hp == null || hp > m.hp) { m.hp = hp; if (hp > 0) m.ko = false; return }
  const lost = m.hp - hp; m.hp = hp
  if (hp <= 0) { if (!m.ko) { m.ko = true; titanVo(f, 'ko') || titanVo(f, 'hurtBig') } return }
  if (lost <= 0) return
  if (lost >= 90 || f.knockdownState) titanVo(f, 'hurtBig', { cd: 120 }) || titanVo(f, 'hurt', { cd: 90 })
  else titanVo(f, 'hurt', { cd: 90, chance: 0.4 })
}

// per render frame (draw<X>Fx): the win line ~0.7 s after the opponent goes down (once per KO)
export function titanVoDraw(f, opp) {
  if (!isTitan(f)) return
  const m = voOf(f); if (opp) m.opp = opp
  const o = m.opp; if (!o) return
  if (!(o.health > 0) && f.health > 0) {
    if (!m.won && ++m.koT >= 42) { m.won = true; m.until = -1; titanVo(f, 'win') }
  } else { m.won = false; m.koT = 0 }
}

// the intro line (once per intro): "vs:<that Titan>" → the team line vs any Titan → the round intro
export function titanIntroLine(f, opp) {
  if (!isTitan(f)) return null
  const m = voOf(f); if (opp) m.opp = opp
  if (m.intro) return null
  m.intro = true; m.until = -1
  const pool = (opp && titanPool(f, 'vs:' + opp.rosterKey)) ? 'vs:' + opp.rosterKey : (isTitan(opp) && titanPool(f, 'titans')) ? 'titans' : 'intro'
  titanVo(f, pool)
  return pool
}
export const titanVoState = f => VO.get(f) || null   // test-only
