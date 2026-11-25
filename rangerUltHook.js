// rangerUltHook.js — a dependency-free slot so a Ranger's own kit file (spdBlue.js / spdGreen.js / spdPink.js) can hand its
// Ultimate press to rangerUlts.js without importing it (keeps the kit files out of the cinematic / combat import graph).
// rangerKitUlt(f, opp) → true when the cinematic ultimate started (meter spent there), false otherwise (no meter spent).
let H = null
export const setRangerKitUlt = fn => { H = typeof fn === 'function' ? fn : null }
export const rangerKitUlt = (f, opp) => { try { return H ? !!H(f, opp) : false } catch (_) { return false } }
