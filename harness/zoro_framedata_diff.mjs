// Frame-data ZERO-diff guard for the Zoro build.
// Serializes every character's full data object (moves, frame data, stats, animationData, functions as source)
// and compares per-character hashes to a baseline captured BEFORE any Zoro code landed.
//   node harness/zoro_framedata_diff.mjs --snapshot   (writes baseline — only run on the pre-Zoro tree)
//   node harness/zoro_framedata_diff.mjs              (diff; 'zoro' is the only key allowed to be new)
import fs from 'node:fs'
import crypto from 'node:crypto'
import { characters } from '../characters.js'
import { SKINS as CHARACTER_SKINS } from '../skins.js'
const BASE = new URL('./fixtures/zoro_framedata_baseline.json', import.meta.url)
const ser = v => JSON.stringify(v, (k, x) => typeof x === 'function' ? 'fn:' + x.toString() : x)
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
const now = {}
for (const k of Object.keys(characters).sort()) now[k] = hash(ser(characters[k]) + '|skins|' + ser(CHARACTER_SKINS?.[k] ?? null))
if (process.argv.includes('--snapshot')) { fs.writeFileSync(BASE, JSON.stringify(now, null, 1)); console.log('baseline written', Object.keys(now).length); process.exit(0) }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'))
let fail = 0, same = 0
for (const k of Object.keys(base)) { if (now[k] !== base[k]) { fail++; console.log('FAIL changed:', k) } else same++ }
for (const k of Object.keys(now)) if (!(k in base) && k !== 'zoro') { fail++; console.log('FAIL unexpected new key:', k) }
console.log(`frame-data diff: ${same} unchanged, ${fail} changed${'zoro' in now ? ' (+zoro new)' : ''}`)
process.exit(fail ? 1 : 0)
