// tools/edoskin/framedata.mjs — MSV1-EDO frame-data snapshot of EVERY character (characters.js objects: stats, moves,
// frame data, animation timing — functions dropped), plus every skin's animation TIMING (sheet paths stripped).
//   node tools/edoskin/framedata.mjs <repoRoot> <out.json>
import fs from 'node:fs'; import path from 'node:path'
globalThis.window ??= globalThis; globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {}, querySelector: () => null, getElementById: () => null, body: { appendChild() {} } }
globalThis.navigator ??= { getGamepads: () => [] }; globalThis.Image ??= class { set src(v) {} }; globalThis.addEventListener ??= () => {}; globalThis.requestAnimationFrame ??= () => 0
const root = path.resolve(process.argv[2] || '.'), out = process.argv[3] || 'framedata.json'
const { characters } = await import(path.join(root, 'characters.js'))
const { SKINS } = await import(path.join(root, 'skins.js'))
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'sheet' || k === 'portrait') ? undefined : v))
const snap = {}
for (const [k, c] of Object.entries(characters)) snap[k] = JSON.parse(JSON.stringify(c))
const skinTiming = {}
for (const [k, list] of Object.entries(SKINS)) for (const s of list || []) if (s.animationData) {
  // a skin's timing must equal its character's (recolours) — record it per skin id
  skinTiming[`${k}/${s.id}`] = strip(s.animationData)
}
fs.writeFileSync(out, JSON.stringify({ characters: snap }, null, 0))
fs.writeFileSync(out.replace(/\.json$/, '.skins.json'), JSON.stringify(skinTiming))
console.log('characters', Object.keys(snap).length, 'skins with anim', Object.keys(skinTiming).length)
