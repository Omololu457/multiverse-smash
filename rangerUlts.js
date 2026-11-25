// rangerUlts.js — every Power Ranger's ultimate gets a cinematic (2026-11-25, owner: "for the Power Rangers go to each one of the
// Power Rangers — even for the characters that have multiple Power Rangers — and give them all cinematics too").
// Table only; the plumbing is rangerUltKit.js. Per Ranger (rosterKey = the live form, so squad / duo / trio forms are covered by
// the same entry):
//   • MORPH CALL — a frozen 2 s pre-roll the frame their own ultimate move starts (morph helix → helmet / visor cut-in with the
//     emblem + name + power card → the Zord / weapon call → whip-pan), then their ultimate plays exactly as before (same input,
//     cost, damage — its clock is frozen with the world).
//   • LIVE FRAME — the kitUltFrame overlay over the live move (push-ins, impact frame, damage slam) for the solo fighters; the
//     S.P.D. / Ninja Storm squads keep their own frames (spdRangersUlt.js / nsSquadUlt.js).
//   • S.P.D. Blue / Green / Pink had NO ultimate ("shared Zord pending"): they now own a full frozen cinematic ultimate
//     (100 meter, close range, 240 raw — the kits' own documented "intended raw 240") via rangerUltHook.js.
// Left alone (already bespoke cinematics): Dino Thunder Z-Rex Blaster (sZrex), S.P.D. Yellow Duplicate Raid, the MMPR five
// (rangerUltCinematics.js pre-rolls + their own freeze ults), Samurai Rangers, Ninja Storm MSv2 / CGPT, the W+U team ults,
// Thunder / Ninja Megazord.
import { registerRangerCall, registerRangerFrames, makeRangerStrikeUlt } from './rangerUltKit.js'
import { setRangerKitUlt } from './rangerUltHook.js'

const SPD = { emblem: 'badge', rank: 'S.P.D. — SPACE PATROL DELTA', tint: '6,8,22' }
const NS = { emblem: 'ninja', rank: 'NINJA STORM — WIND NINJA ACADEMY', tint: '8,8,18' }
const DT = { emblem: 'dino', rank: 'DINO THUNDER — REEFSIDE', tint: '10,8,6' }

export const RANGERS = {
  spd_red: { ...SPD, num: '1', who: 'JACK', col: '#ff3030', rgb: '255,48,48', pale: '#ffd8d8', motif: 'siren', kanji: '緊急出動',
    call: 'S.P.D. EMERGENCY!', title: 'DELTA SQUAD FULL POWER', power: 'RED RANGER — PHASING', zord: 'DELTA RUNNER 1', zordSub: 'DELTA SQUAD MEGAZORD — ROLL OUT',
    open: '“S.P.D. Emergency! Full power!”', close: '“Case closed.”' },
  omega_ranger: { emblem: 'omega', rank: 'S.P.D. — FROM THE FUTURE', tint: '14,12,24', who: 'SAM', col: '#f4f0ff', rgb: '230,220,255', pale: '#ffffff', motif: 'saber', kanji: '終撃',
    call: 'S.P.D. OMEGA MORPHER!', title: 'OMEGA SABER: FINAL STRIKE', power: 'OMEGA RANGER — PURE ENERGY', zord: 'OMEGA MEGAZORD', zordSub: 'OMEGAMAX CYCLE — FULL CHARGE',
    open: '“Omega Ranger — final strike!”', close: '“The future is secured.”' },
  ns_red: { ...NS, who: 'SHANE', col: '#ff3b3b', rgb: '255,59,59', pale: '#ffe0e0', motif: 'wind', kanji: '嵐の昇天',
    call: 'NINJA STORM — RANGER FORM!', title: 'STORM ASCENSION', power: 'RED WIND RANGER — AIR', zord: 'HAWKZORD', zordSub: 'STORM MEGAZORD — POWER OF AIR',
    open: '“Ninja Storm — Ranger Form! Ha!”', close: '“Feel the power of air!”',
    moves: { sUlt: { title: 'HAWK MIRAGE', kanji: '鷹の幻', call: 'NINJA MIRROR — HAWK MIRAGE!' }, sTag: { title: 'STORM AND STONE', kanji: '嵐と石', call: 'WIND AND EARTH — TOGETHER!', zord: 'HAWKZORD + LIONZORD' },
      sTrio: { title: 'THUNDERSTORM TRINITY', kanji: '雷嵐三位', call: 'THUNDER — STORM — TRINITY!', zord: 'THUNDERSTORM MEGAZORD' } } },
  ns_yellow: { ...NS, who: 'DUSTIN', col: '#ffd21e', rgb: '255,210,30', pale: '#fff4c0', motif: 'earth', kanji: '大地震',
    call: 'NINJA STORM — RANGER FORM!', title: 'EARTHQUAKE NINJA ART', power: 'YELLOW WIND RANGER — EARTH', zord: 'LIONZORD', zordSub: 'STORM MEGAZORD — POWER OF EARTH',
    open: '“Power of earth — rock on!”', close: '“Now THAT’s how you shake things up!”',
    moves: { sUlt: { title: 'FAULT LINE', kanji: '断層', call: 'NINJA MIRROR — FAULT LINE!' }, sTag: { title: 'STORM AND STONE', kanji: '嵐と石', call: 'EARTH AND WIND — TOGETHER!', zord: 'LIONZORD + HAWKZORD' } } },
  ns_blue: { ...NS, who: 'TORI', col: '#3aa8ff', rgb: '58,168,255', pale: '#dff2ff', motif: 'water', kanji: '津波',
    call: 'NINJA STORM — RANGER FORM!', title: 'TSUNAMI', power: 'BLUE WIND RANGER — WATER', zord: 'DOLPHINZORD', zordSub: 'STORM MEGAZORD — POWER OF WATER',
    open: '“Power of water — let it flow!”', close: '“Surf’s up.”',
    moves: { sTrio: { title: 'THUNDERSTORM TRINITY', kanji: '雷嵐三位', call: 'THUNDER — STORM — TRINITY!', zord: 'THUNDERSTORM MEGAZORD' } } },
  ns_navy: { ...NS, emblem: 'thunder', rank: 'NINJA STORM — THUNDER NINJA ACADEMY', who: 'BLAKE', col: '#7a6bff', rgb: '122,107,255', pale: '#e4e0ff', motif: 'thunder', kanji: '雷嵐',
    call: 'THUNDER STORM — RANGER FORM!', title: 'THUNDER STORM', power: 'NAVY THUNDER RANGER — THUNDER', zord: 'NAVY BEETLEZORD', zordSub: 'THUNDERZORD — POWER OF THUNDER',
    open: '“Thunder Staff — strike!”', close: '“Lightning never strikes twice. I do.”',
    moves: { sTrio: { title: 'THUNDERSTORM TRINITY', kanji: '雷嵐三位', call: 'THUNDER — STORM — TRINITY!', zord: 'THUNDERSTORM MEGAZORD' } } },
  ns_green: { ...NS, emblem: 'samurai', rank: 'NINJA STORM — SAMURAI', who: 'CAM', col: '#38e070', rgb: '56,224,112', pale: '#dcffe8', motif: 'blade', kanji: '超侍',
    call: 'SAMURAI STORM — RANGER FORM!', title: 'SUPER SAMURAI', power: 'GREEN SAMURAI RANGER', zord: 'SAMURAI STAR MEGAZORD', zordSub: 'SAMURAI AMULET — SUPER SAMURAI MODE',
    open: '“Samurai Amulet — Super Samurai mode!”', close: '“Calculated.”',
    moves: { sTrio: { title: 'THUNDERSTORM TRINITY', kanji: '雷嵐三位', call: 'THUNDER — STORM — TRINITY!', zord: 'THUNDERSTORM MEGAZORD' } } },
  dt_red: { ...DT, who: 'CONNER', col: '#ff3428', rgb: '255,52,40', pale: '#ffe0d8', motif: 'claw', frameMotif: 'earth', kanji: '恐竜雷',
    call: 'DINO THUNDER — POWER UP!', title: 'RAPTOR RIDER STAMPEDE', power: 'RED DINO RANGER — SUPER SPEED', zord: 'TYRANNOZORD', zordSub: 'THUNDERSAURUS MEGAZORD — HA!',
    open: '“Dino Thunder — power up! Ha!”', close: '“Reefside’s finest.”', skip: ['sZrex'] },
  dt_blue: { ...DT, who: 'ETHAN', col: '#2f7cff', rgb: '47,124,255', pale: '#dbe8ff', motif: 'barrier', frameMotif: 'earth', kanji: '三角竜',
    call: 'DINO THUNDER — POWER UP!', title: 'TRICERA ZORD RAM', power: 'BLUE DINO RANGER — ARMOR SKIN', zord: 'TRICERAZORD', zordSub: 'THUNDERSAURUS MEGAZORD — HA!',
    open: '“Dino Zord — charge!”', close: '“Game over, man.”', skip: ['sZrex'] },
  dt_yellow: { ...DT, who: 'KIRA', col: '#ffd21e', rgb: '255,210,30', pale: '#fff4c0', motif: 'sonic', frameMotif: 'wind', kanji: '翼竜',
    call: 'DINO THUNDER — POWER UP!', title: 'PTERA ZORD STRIKE', power: 'YELLOW DINO RANGER — PTERA SCREAM', zord: 'PTERAZORD', zordSub: 'THUNDERSAURUS MEGAZORD — HA!',
    open: '“Ptera Scream!”', close: '“That’s a wrap.”', skip: ['sZrex'] },
  dt_white: { ...DT, who: 'TRENT', col: '#f2f2f8', rgb: '235,235,245', pale: '#ffffff', motif: 'blade', kanji: '竜剣嵐',
    call: 'WHITE RANGER — DINO POWER!', title: 'DRAGO SWORD STORM', power: 'WHITE DINO RANGER — CAMOUFLAGE', zord: 'DRAGOZORD', zordSub: 'DRAGO SWORD — DRAW!',
    open: '“Drago Sword!”', close: '“Didn’t see that coming, did you?”', skip: ['sZrex'] },
}
for (const [k, D] of Object.entries(RANGERS)) registerRangerCall(k, D)
// the solo fighters' live frame (the S.P.D. / Ninja Storm squads already wear spdRangersUlt.js / nsSquadUlt.js frames)
export const RANGER_FRAME = registerRangerFrames('ranger_solo_ult_frame', RANGERS, ['spd_rangers', 'ns_squad'])

// ── S.P.D. Blue / Green / Pink — brand-new frozen cinematic ultimates ──
// strike.hits = [[script frame, raw, pose]] (flurry) · strike.fin = [frame, raw, pose] (the Zord finisher). 240 raw total.
export const SPD_STRIKE = {
  spd_blue: { ...SPD, num: '2', who: 'SKY', col: '#2a6cf0', rgb: '42,108,240', pale: '#dce8ff', motif: 'barrier', kanji: '防壁',
    call: 'S.P.D. EMERGENCY!', title: 'FORCE FIELD BREAKER', power: 'BLUE RANGER — FORCE FIELD', zord: 'DELTA RUNNER 2', zordSub: 'DELTA SQUAD — BLUE CHARGE',
    open: '“By the book — force field, full power!”', close: '“That’s procedure.”',
    strike: { hits: [[56, 40, 'light'], [66, 35, 'bJ2'], [78, 35, 'bChain']], fin: [124, 130, 'ultimate'] } },
  spd_green: { ...SPD, num: '3', who: 'BRIDGE', col: '#2fbf3a', rgb: '47,191,58', pale: '#dcffe0', motif: 'aura', kanji: '霊視',
    call: 'S.P.D. EMERGENCY!', title: 'PSYCHOMETRY: AURA STRIKE', power: 'GREEN RANGER — AURA SIGHT', zord: 'DELTA RUNNER 3', zordSub: 'DELTA SQUAD — GREEN CHARGE',
    open: '“Glove’s off — I can see your next move.”', close: '“Totally saw that coming.”',
    strike: { hits: [[56, 40, 'gRush1'], [66, 35, 'gRush2'], [78, 35, 'gRush3']], fin: [124, 130, 'gArc'] } },
  spd_pink: { ...SPD, num: '5', who: 'SYD', col: '#ff6fb4', rgb: '255,111,180', pale: '#ffe0ef', motif: 'diamond', kanji: '金剛拳',
    call: 'S.P.D. EMERGENCY!', title: 'DIAMOND FIST', power: 'PINK RANGER — MATTER MIMICRY', zord: 'DELTA RUNNER 5', zordSub: 'DELTA SQUAD — PINK CHARGE',
    open: '“Diamond hand — let’s get sparkly.”', close: '“Don’t touch the hair.”',
    strike: { hits: [[56, 40, 'pBar1'], [66, 35, 'pBar2'], [78, 35, 'pBar3']], fin: [124, 130, 'pBreaker'] } },
}
export const SPD_STRIKE_ULT = makeRangerStrikeUlt({ id: 'spd_strike_ult', table: SPD_STRIKE, cost: 100, range: 210 })
// the kits (spdBlue.js / spdGreen.js / spdPink.js) hand their Ultimate press here
setRangerKitUlt((f, opp) => (SPD_STRIKE[f?.rosterKey] ? SPD_STRIKE_ULT.cast(f, { getOpponent: () => opp }) === true : false))
