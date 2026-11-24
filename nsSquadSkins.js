// nsSquadSkins.js — Ninja Storm Squad skins (cosmetic only; registers into skins.js SKINS.ns_squad at load).
//   • START AS — which ninja opens every round (default = Shane). The dial still reaches all five.
//   • SQUAD THEMES — one look for the whole squad, following every ↓↓ swap (squadCore applyForm → the hook below). Each
//     ninja wears their OWN pack's recolour: Shane / Dustin the MS_V1 pack (windrangersSkins.js, wr_*), Tori / Blake / Cam the
//     Trio pack (nsTrioSkins.js, tr_*) — paired by look. The pack's form application also sets the ninja FX folder / colours.
import { SKINS } from './skins.js'
import { NS_SQUAD } from './nsSquad.js'
import { wrApplyForm } from './windrangersSkins.js'
import { trioApplyForm } from './nsTrioSkins.js'

const PORTRAIT = './assets/ns_squad/portrait.png'
const base = { unlockLevel: 0, spriteScale: null, animationData: null }
const list = SKINS.ns_squad || (SKINS.ns_squad = [])
const add = e => { if (!list.some(s => s.id === e.id)) list.push(e) }
const START = [['red', 'Red (Shane)'], ['yellow', 'Yellow (Dustin)'], ['blue', 'Blue (Tori)'], ['navy', 'Navy (Blake)'], ['green', 'Green (Cam)']]
for (const [c, who] of START) add({ ...base, id: c === 'red' ? 'default' : `ns_squad_start_${c}`, name: `Start as: ${who}`, portrait: PORTRAIT })

// theme → [skin id, name, MS_V1 pack tag (Shane / Dustin), Trio pack tag (Tori / Blake / Cam)]
export const NS_SQUAD_THEMES = {
  alienx: ['ns_squad_squad_alienx', 'Squad: Alien X', 'alienx', 'alienx'],
  gold: ['ns_squad_squad_gold', 'Squad: Gold', 'kintsugi', 'amulet'],
  shadow: ['ns_squad_squad_shadow', 'Squad: Shadow', 'ghostfreak', 'abyss'],
  neon: ['ns_squad_squad_neon', 'Squad: Neon', 'feedback', 'cyber'],
  glitter: ['ns_squad_squad_glitter', 'Squad: Glitter', 'disco', 'crystal'],
}
const THEME_OF = Object.fromEntries(Object.entries(NS_SQUAD_THEMES).map(([t, [id]]) => [id, t]))
for (const [t, [id, name]] of Object.entries(NS_SQUAD_THEMES)) add({ ...base, id, name, portrait: `./assets/ns_squad/portrait__${t}.png`, squadTheme: t })

const DUO_FORMS = new Set(['ns_red', 'ns_yellow'])
const FIELDS = ['_skinAnim', '_baseSkinAnim', '_nsAssetDir', '_nsColor', '_nsSmoke', '_wrSkin', '_wrSmoke', '_trSkin']
NS_SQUAD.setSkinHook((f, form) => {
  if (!f) return
  f._nsAssetDir = null; f._nsColor = null; f._nsSmoke = null; f._wrSkin = null; f._wrSmoke = false; f._trSkin = null
  const t = THEME_OF[f.skinId]; if (!t) return
  const [, , wr, tr] = NS_SQUAD_THEMES[t], duo = DUO_FORMS.has(form)
  const proxy = { skinId: duo ? `wr_${wr}` : `tr_${tr}`, rosterKey: form }
  ;(duo ? wrApplyForm : trioApplyForm)(proxy, form)
  for (const k of FIELDS) if (proxy[k] !== undefined) f[k] = proxy[k]
})
