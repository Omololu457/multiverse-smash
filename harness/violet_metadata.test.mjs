// harness/violet_metadata.test.mjs — Violet Parr PHASE 9: roster metadata, Move List kit and the balance notes (node only).
import { readFileSync } from 'node:fs'
import { ck, summary } from './violet_lib.mjs'
const { characters } = await import('../characters.js'), { getKit } = await import('../kits.js')
const v = characters.violet, kit = getKit('violet', v)
ck('name "Violet Parr", displayName "Violet"', v.name === 'Violet Parr' && v.displayName === 'Violet', { name: v.name, dn: v.displayName })
ck('universe The Incredibles (with Elastigirl, Dash, Syndrome, Frozone, Mr. Incredible)', v.universe === 'the_incredibles', { u: v.universe })
ck('difficulty 3 (roster data and Move List)', v.difficulty === 3 && kit?.difficulty === '3', { d: v.difficulty, k: kit?.difficulty })
ck('archetype "Zoner / Trickster"', v.archetype === 'Zoner / Trickster' && kit?.type === 'Zoner / Trickster')
ck('tagline "Now you see me."', v.tagline === 'Now you see me.')
const sentences = (v.bio || '').split(/(?<=[.!?])\s+/).filter(Boolean)
ck('bio is exactly 2 sentences', sentences.length === 2, sentences)
ck('Move List lists 5 specials + FULL FORCE + Phase Step + 4 combos', kit.specials.length === 5 && /FULL FORCE/.test(kit.ultimate.name) && kit.basics.some(b => b.name === 'Phase Step') && kit.combos.length === 4)
const md = readFileSync(new URL('../docs/violet/BALANCE_NOTES.md', import.meta.url), 'utf8')
for (const h of ['vs Spider-Man', 'vs Homelander', 'vs Ghostface', 'Why she is not broken']) ck(`BALANCE_NOTES.md: "${h}" section`, new RegExp('^## ' + h, 'm').test(md))
process.exit(summary('violet metadata (phase 9)') ? 1 : 0)
