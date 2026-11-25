// dcHeroUlts.js — Superman "World of Cardboard", Homelander "Flight 37" and Omni-Man "Escape Velocity" framed in the house
// cinematic style (2026-11-25 polish pass: letterbox + title cut-in + push-ins + damage slam, like the Ranger / Bleach ults).
// All three are LIVE scripted state machines (abilities.applySupermanWoC / applyHomelanderFlight37 / omnimanViltrumMoves
// Escape Velocity) — freezing them would stall their own clocks — so they get the RENDER-ONLY kitUltFrame overlay, which
// never writes game state: damage, timing, inputs and behaviour are exactly as before. advanceTicks: Flight 37 and Escape
// Velocity hold the ground camera (camera.advance) while they run, so the frame's clock follows those frames too.
import { makeKitUltFrame } from './kitUltFrame.js'

const key = f => String(f?.rosterKey || '').toLowerCase()
export const DC_HERO_FRAMES = {
  superman: { test: f => !!f._supWoC,
    fc: { title: 'WORLD OF CARDBOARD', kanji: null, sub: 'SUPERMAN  ·  THE LAST SON OF KRYPTON', who: 'SUPERMAN', col: '#ffd21e', rgb: '255,210,30', motif: 'wind', open: '', close: '' } },
  homelander: { test: f => !!f._f37,
    fc: { title: 'FLIGHT 37', kanji: null, sub: 'HOMELANDER  ·  VOUGHT INTERNATIONAL', who: 'HOMELANDER', col: '#e0262e', rgb: '224,38,46', motif: 'saber', open: '“You’re gonna love this.”', close: '' } },
  omniman_viltrum: { test: f => !!f._omv?.ev,
    fc: { title: 'ESCAPE VELOCITY', kanji: null, sub: 'OMNI-MAN  ·  FOR THE VILTRUM EMPIRE', who: 'OMNI-MAN', col: '#ff3b2f', rgb: '255,59,47', motif: 'earth', open: '', close: '' } },
}
export const DC_HERO_FRAME = makeKitUltFrame({ id: 'dc_hero_ult_frame', grace: 6, advanceTicks: true,
  match: f => { const D = DC_HERO_FRAMES[key(f)]; return D && D.test(f) ? D.fc : null } })
