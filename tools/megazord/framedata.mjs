// framedata.mjs — MSV1-MEGAZORD frame-data dump: every character's (and every squad form's) move numbers, for a before/after
// diff (the brief: "frame-data diff ZERO for every character, including every MMPR Ranger form").
//   node tools/megazord/framedata.mjs <repo root> > out.json
import { pathToFileURL } from 'node:url'
const root = process.argv[2]
globalThis.Image ||= class { set src(_) {} }
const { characters } = await import(pathToFileURL(root + '/characters.js'))
const { SQUADS } = await import(pathToFileURL(root + '/squadCore.js'))
const KEYS = new Set(['startup', 'active', 'recovery', 'damage', 'hitstun', 'blockstun', 'knockbackX', 'knockbackY', 'rangeX', 'rangeY', 'cost', 'cooldown', 'frames', 'speed', 'jumpPower', 'maxJumps', 'dashSpeed', 'dashDuration', 'weight', 'maxHealth', 'health', 'np', 'meter', 'launchVy', 'selfVy'])
function walk(o, path, out, depth, seen) {
  if (!o || typeof o !== 'object' || depth > 6 || seen.has(o)) return; seen.add(o)
  for (const [k, v] of Object.entries(o)) {
    if (k === 'animationData' || k === 'skins' || k === 'introSequencePool') continue
    if (typeof v === 'number' && KEYS.has(k)) out[path + '.' + k] = v
    else if (v && typeof v === 'object') walk(v, path + '.' + k, out, depth + 1, seen)
  }
}
const out = {}
for (const [k, c] of Object.entries(characters)) walk(c, k, out, 0, new Set())
for (const [id, s] of Object.entries(SQUADS)) for (const form of s.forms) walk(s.formChar(form), `squad:${id}:${form}`, out, 0, new Set())
console.log(JSON.stringify(out, Object.keys(out).sort(), 0))
