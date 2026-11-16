// controls_lab/combos.js — the COMBO LIBRARY: data format, script building, and VERIFICATION in the real engine.
//
// combos.json entry:
//   { id, char, name, steps:["Light","Down + Heavy","↓↘→ + Special",…], gaps:[0, 14, 18, …],   // frames between presses
//     hits, hitsAt:[combo counter after each step], damage, difficulty (1-5), note, verified:"YYYY-MM-DD",
//     status:"verified", source }
// A step is one chord in the kits' own notation (parsed by notation.js); "Jump" is a jump (for air follow-ups).
// VERIFIED means: run with scripted input from a reset, every step's press is followed by at least one new hit,
// the game's combo counter ends at `hits`, and between the first and the last hit the dummy never had a free frame
// (always in hitstun / stun / knockdown / launched / hit-stop / airborne) — i.e. a true combo, not two hits.
import { parseNotation, dirRaw } from "./notation.js"

export function stepOf(notation) {
  const t = String(notation).trim()
  if (/^(jump|up \(jump\)|↑ \(jump\))$/i.test(t)) return { kind: "jump", dirs: [], buttons: ["jump"] }
  const p = parseNotation(t.replace(/^air\s+/i, ""), "special")
  const st = p.steps[0] || { kind: "press", dirs: [], buttons: [] }
  return { ...st }
}
export function comboSteps(c) { return (c.steps || []).map(stepOf) }

// Build the frame script. Each step's BUTTON goes down exactly at its press frame; motion/direction lead-ins are
// placed in the frames before it (compressed when the gap is short) — like a player rolling into the button.
export function comboScript(c) {
  const steps = comboSteps(c), gaps = c.gaps || []
  const at = []; let t = 12
  steps.forEach((s, i) => { if (i) t += Math.max(1, gaps[i] || 14); at.push(t) })
  const len = at[at.length - 1] + (c.tail || 70)
  const frames = Array.from({ length: len }, () => ({}))
  const set = (f, o) => { if (f >= 0 && f < len) Object.assign(frames[f], o) }
  steps.forEach((s, i) => {
    const p = at[i], prevEnd = i ? at[i - 1] + holdOf(steps[i - 1]) : 0
    const room = Math.max(1, p - prevEnd)
    if (s.kind === "jump") { for (let k = 0; k < 3; k++) set(p + k, { jump: true, up: true }); return }
    const dirs = s.dirs || []
    if (s.kind === "motion" && dirs.length) {
      // lead-in directions occupy the frames before the press; a repeated direction gets a neutral frame between
      const seq = []; dirs.forEach((d, j) => { if (j && dirs[j - 1] === d) seq.push(5); seq.push(d) })
      const lead = seq.slice(0, -1), per2 = Math.max(1, Math.min(3, Math.floor(room / Math.max(1, lead.length))))
      lead.forEach((d, j) => { for (let k = 0; k < per2; k++) set(p - (lead.length - j) * per2 + k, d === 5 ? {} : dirRaw(d)) })
    } else if (dirs.length) for (let k = Math.min(3, room); k > 0; k--) set(p - k, dirRaw(dirs[0]))
    const btn = Object.fromEntries((s.buttons || []).map(b => [b, true]))
    const d = dirs.length ? dirRaw(dirs[dirs.length - 1]) : {}
    for (let k = 0; k < holdOf(s); k++) set(p + k, { ...d, ...btn })
  })
  return { script: frames, at }
}
function holdOf(s) { return s.kind === "jump" ? 3 : Math.max(4, s.hold || 0) }

// Run a combo in the engine and measure it. Returns { ok, hits, hitsAt, damage, reason }.
export async function verifyCombo(eng, c, { expect = true } = {}) {
  await eng.reset()
  const { script, at } = comboScript(c)
  const frames = eng.facing() >= 0 ? script : script.map(r => ({ ...r, left: !!r.right, right: !!r.left }))
  const hp0 = eng.p2().health
  let lastHp = hp0, hitEvents = 0, firstHit = null, lastHit = null, freeAfterFirst = 0, maxCombo = 0
  const hitFrames = [], perFrame = []
  const listener = ev => {
    const p2 = ev.p2; if (!p2) return
    const combo = eng.combo(); maxCombo = Math.max(maxCombo, combo)
    const i = scriptIdx
    if (p2.health < lastHp - 0.01) { hitEvents++; hitFrames.push(i); if (firstHit == null) firstHit = i; lastHit = i }
    lastHp = p2.health
    const locked = (p2.hitstun > 0) || (p2.stun > 0) || !!p2.knockdownState || !!p2.isLaunched || (p2.hitstop > 0) || !p2.grounded || (p2.blockstun > 0 && false)
    perFrame.push({ i, locked, combo })
  }
  let scriptIdx = 0
  eng.listeners.add(listener)
  await eng.play(frames, { onStep: i => { scriptIdx = i } })
  await eng.frames(10)
  eng.listeners.delete(listener)
  // free frames between the first and the last hit
  if (firstHit != null) for (const f of perFrame) if (f.i > firstHit && f.i < lastHit && !f.locked) freeAfterFirst++
  // every attacking step must land its OWN hit, in order: greedily match each step to the first unclaimed hit at or
  // after its press (a slow move's hit may land after the next press — that still counts for that step)
  const steps = comboSteps(c), firstOf = []
  let ptr = 0, stepMiss = -1
  steps.forEach((st, s) => {
    if (st.kind === "jump") { firstOf.push(null); return }
    let j = ptr; while (j < hitFrames.length && hitFrames[j] < at[s]) j++
    if (j >= hitFrames.length) { if (stepMiss < 0) stepMiss = s; firstOf.push(null); return }
    firstOf.push(j); ptr = j + 1
  })
  const hitsAt = steps.map((st, s) => { let nxt = hitFrames.length; for (let k = s + 1; k < steps.length; k++) if (firstOf[k] != null) { nxt = firstOf[k]; break } return nxt })
  const damage = Math.max(0, Math.round(hp0 - eng.p2().health))
  let reason = null
  if (!hitEvents) reason = "no hit landed"
  else if (stepMiss >= 0) reason = `step ${stepMiss + 1} (${c.steps[stepMiss]}) did not connect`
  else if (freeAfterFirst > 0) reason = `dummy had ${freeAfterFirst} free frame(s) between hits (not a true combo)`
  else if (expect && c.hits != null && maxCombo !== c.hits) reason = `combo counter ${maxCombo}, expected ${c.hits}`
  return { ok: !reason, hits: Math.max(maxCombo, hitEvents), comboCounter: maxCombo, hitEvents, hitsAt, damage, reason }
}
