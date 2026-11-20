// tools/edoskin/portraits.mjs — list each playable character's select-screen portrait (or idle sheet) for gen_portraits.py
import fs from 'node:fs'; import path from 'node:path'
globalThis.window ??= globalThis; globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {}, querySelector: () => null, getElementById: () => null, body: { appendChild() {} } }
globalThis.navigator ??= { getGamepads: () => [] }; globalThis.Image ??= class { set src(v) {} }; globalThis.addEventListener ??= () => {}; globalThis.requestAnimationFrame ??= () => 0
const { characters } = await import(path.join(process.cwd(), 'characters.js'))
const out = {}
for (const [k, c] of Object.entries(characters)) if (!c.hidden && c.isPlayable !== false && c.hasSprites) out[k] = (c.portrait || c.animationData?.idle?.sheet || '').replace(/^\.\//, '')
fs.writeFileSync('tools/edoskin/portraits.json', JSON.stringify(out, null, 1))
console.log(Object.keys(out).length)
