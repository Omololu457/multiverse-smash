// spdRangersUlt.js — S.P.D. Rangers (spd_rangers) NORMAL ULTIMATE per form, framed as a cinematic (2026-11-24, owner: "give every
// character an ultimate that actually looks like I put in time and effort into it — don't change what the ultimate does").
// The forms' Ultimate (U) inputs are untouched: Red's S.P.D. Emergency super (spdRed.js sSuper) and Omega's Final Strike
// (abilities.executeOmegaRangerUltimate) get the frame; Yellow's Duplicate Raid is already its own frozen cinematic (spdYellowState.js,
// game.js freeze contract) and is left as it is. Blue / Green / Pink have NO Ultimate on U
// by design (their kits consume it: "No Ranger fallback ultimate") — nothing is added for them. kitUltFrame.js paints a
// render-only cinematic frame over the live move (letterbox, the Ranger's cut-in + kanji, push-ins / impact frames on contacts,
// the S.P.D. motif, the damage slam) — same input / cost / damage. Gated on f._squad.id === 'spd_rangers'. The W + U team
// ultimate (squadUlt.js) and the ↓↓ dial are untouched.
import { makeKitUltFrame } from './kitUltFrame.js'
const SQUAD_ID = 'spd_rangers'   // = spdSquad.js SQUAD_ID (not imported: keeps this module out of the squad/kit import graph)

const FORMS = {
  spd_red:      { title: 'DELTA SQUAD FULL POWER', kanji: '緊急出動', sub: 'S.P.D. RED RANGER  ·  S.P.D. EMERGENCY', who: 'JACK', col: '#ff3030', rgb: '255,48,48', motif: 'siren',
    open: '“S.P.D. Emergency! Full power!”', close: '“Case closed.”' },
  omega_ranger: { title: 'OMEGA SABER: FINAL STRIKE', kanji: '終撃', sub: 'S.P.D. OMEGA RANGER  ·  FROM THE FUTURE', who: 'SAM', col: '#f4f0ff', rgb: '230,220,255', motif: 'saber',
    open: '“Omega Ranger — final strike!”', close: '“The future is secured.”' },
}
const isUlt = a => !!a && (a.isUltimate || a.category === 'ultimate' || a.name === 'ultimate')
export const SPD_RANGERS_ULT_FRAME = makeKitUltFrame({
  id: 'spd_rangers_ult_frame', grace: 24,
  match: f => (f?._squad?.id === SQUAD_ID && f.attacking && isUlt(f.currentAttack) ? FORMS[f.rosterKey] || null : null),
})
