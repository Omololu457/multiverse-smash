// DSEYL (dseyl) — animation table. The SAME frames, sizes, anchors and timing as Syndrome's (syndromeSprites.js, read
// by reference) pointed at Dseyl's edited copies in assets/dseyl/ (tools/dseyl/build_sprites.py: recolour + trim of
// copies of Syndrome's strips). Flight poses reuse existing airborne strips — no new art.
import { SYNDROME_ANIM } from './syndromeSprites.js'

const retarget = d => d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/syndrome/', './assets/dseyl/') } : d
export const DSEYL_ANIM = Object.fromEntries(Object.entries(SYNDROME_ANIM).map(([k, d]) => [k, retarget(d)]))
