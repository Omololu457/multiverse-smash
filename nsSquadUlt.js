// nsSquadUlt.js — Ninja Storm Squad (ns_squad) NORMAL ULTIMATE per form, framed as a cinematic (2026-11-24, owner: "give every
// character an ultimate that actually looks like I put in time and effort into it — don't change what the ultimate does").
// In the squad, Ultimate (U) runs the active ninja's 1-bar super through ninja.js (sSuper — Shane STORM ASCENSION, Dustin
// EARTHQUAKE NINJA ART, Tori TSUNAMI, Blake THUNDER STORM, Cam SUPER SAMURAI); it never reaches abilities.triggerUltimate and is
// scripted on the kit's own clock, so nothing here touches it: kitUltFrame.js paints a render-only cinematic frame over the live
// move (letterbox, the ninja's own cut-in + kanji, push-ins and impact frames on the contacts, the element motif, the damage
// slam). Same input / cost / damage as before. Gated on f._squad.id === 'ns_squad' (the standalone MSV1 / trio fighters keep
// their own presentation). ↓↓ + U (Burrow / Super Samurai / Mirror) and the Megazord are untouched.
import { makeKitUltFrame } from './kitUltFrame.js'
const NS_SQUAD_ID = 'ns_squad'   // = nsSquad.js NS_SQUAD_ID (not imported: keeps this module out of the squad/kit import graph)

const FORMS = {
  ns_red:    { title: 'STORM ASCENSION', kanji: '嵐の昇天', sub: 'RED WIND RANGER  ·  NINJA STORM', who: 'SHANE', col: '#ff3b3b', rgb: '255,59,59', motif: 'wind',
    open: '“Ninja Storm — Ranger Form! Ha!”', close: '“Feel the power of air!”' },
  ns_yellow: { title: 'EARTHQUAKE NINJA ART', kanji: '大地震', sub: 'YELLOW WIND RANGER  ·  NINJA STORM', who: 'DUSTIN', col: '#ffd21e', rgb: '255,210,30', motif: 'earth',
    open: '“Power of earth — rock on!”', close: '“Now THAT’s how you shake things up!”' },
  ns_blue:   { title: 'TSUNAMI', kanji: '津波', sub: 'BLUE WIND RANGER  ·  NINJA STORM', who: 'TORI', col: '#3aa8ff', rgb: '58,168,255', motif: 'water',
    open: '“Power of water — let it flow!”', close: '“Surf’s up.”' },
  ns_navy:   { title: 'THUNDER STORM', kanji: '雷嵐', sub: 'NAVY THUNDER RANGER  ·  NINJA STORM', who: 'BLAKE', col: '#7a6bff', rgb: '122,107,255', motif: 'thunder',
    open: '“Thunder Staff — strike!”', close: '“Lightning never strikes twice. I do.”' },
  ns_green:  { title: 'SUPER SAMURAI', kanji: '超侍', sub: 'GREEN SAMURAI RANGER  ·  NINJA STORM', who: 'CAM', col: '#38e070', rgb: '56,224,112', motif: 'blade',
    open: '“Samurai Amulet — Super Samurai mode!”', close: '“Calculated.”' },
}
const isUlt = a => !!a && (a.isUltimate || a.category === 'ultimate')
export const NS_SQUAD_ULT_FRAME = makeKitUltFrame({
  id: 'ns_squad_ult_frame', grace: 16,
  match: f => (f?._squad?.id === NS_SQUAD_ID && f.attacking && isUlt(f.currentAttack) ? FORMS[f.rosterKey] || null : null),
})
