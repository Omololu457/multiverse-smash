// tojiVoice.js
// ---------------------------------------------------------------------------
// Toji Fushiguro voice-line pools (audio-only; NO gameplay effect). Wired from the 390 toji_voice_*.mp3
// clips (MIXED EN/JA), transcribed + curated in TOJI_VOICE_LOG.md. Per the owner's decision BOTH languages
// are kept as SEPARATE pools:
//   TOJI_VOICE.ja  — Japanese dub  ← ACTIVE by default (Toji is a JJK character; subbed-anime convention
//                     shared with Maki/Sukuna/Yuji/Miwa, and the JA set is the larger one).
//   TOJI_VOICE.en  — English dub   ← wired-and-ready; swap live via setTojiVoiceLang("en"). No mixing.
// (The project has no per-character language-toggle UI, so ONE language plays at a time — same model as
//  Sukuna/Maki. "Keep both" = both pools shipped + selectable, nothing discarded by language.)
//
// pickTojiVoice(pool) returns ONE clip at random from the ACTIVE language set (genuine Math.random). Callers
// play via sound.playSfxFile(clip, null); the single-voice channel (no self-overlap) is sound._voiceOwner.
//
// ── TRIGGER MAP ──
//   intro           → game.js INTRO_VOICE (match start; Toji has no taunt action → intro-only, Maki precedent)
//   combatBark      → combat.js applyTojiOffenseVoice (heavy / long-string connect)
//   hitReact        → combat.js applyTojiHitVoice (defender got hit)
//   lowHealth       → combat.js applyTojiLowHealthVoice (once, crossing the low-HP line — generic hurt)
//   win             → game.js round-end WINNER block
//   castSplitSoul   → abilities.js fireTojiSplitSoul (Split Soul Katana cast)
//   castChain       → abilities.js fireTojiChain (Chain of a Thousand Miles / Inverted Spear cast)
//   castPlayfulCloud→ abilities.js fireTojiPlayfulCloud (Playful Cloud cast)
//   comebackSave1   → abilities.js applyTojiComeback, 1st save (defiant "not done yet" — the Step-4 flag)
//   comebackSave2   → abilities.js enterTojiReincarnatedForm (2nd save / Reincarnated Form transform beat)
//
// ── NOTES ──
//   • Toji has NO taunt action → openers fire on INTRO only (Maki/Rengoku/Shinobu precedent).
//   • castChain has NO JA line (the only JA "chain/thousand" gloss was a mistranslation → dropped); castChain
//     JA + castPlayfulCloud (both langs) are EMPTY → pickTojiVoice falls /^cast/ pools back to the same-language
//     combatBark, and /^comeback/ pools back to the same-language lowHealth (keeps the language consistent).
//   • comebackSave1/2 are SEPARATE from lowHealth (Step 4): save1 = the 1st-save survival shout, save2 = the
//     2nd-save Reincarnated-Form transform beat ("our fight is just getting started").
//   • Cast lines set _atkVoiceCd on fire so a cast doesn't ALSO trigger the offense combatBark on connect.
//   All filenames are exact on-disk names (verified against the 390-clip set). Playful Cloud has no dedicated
//   callout in the rip (documented gap).
// ---------------------------------------------------------------------------

export const TOJI_VOICE = {
  ja: {
    intro: [
      "toji_voice_291_t14m57_8s.mp3",   // The one who was targeted by me is the moon of fortune.
      "toji_voice_275_t14m26_9s.mp3",   // If you're going to die, it's your turn now.
      "toji_voice_157_t11m02_5s.mp3",   // I'll show you the difference in strength.
      "toji_voice_281_t14m40_3s.mp3",   // I can't even get ready for the exercise.
      "toji_voice_060_t08m35_7s.mp3",   // Are you already depending on yourself?
      "toji_voice_208_t12m31_7s.mp3",   // You're good at choosing your opponent.
      "toji_voice_151_t10m52_0s.mp3",   // I feel like I'm going to die.
      "toji_voice_246_t13m41_0s.mp3",   // Are you already going to win?
      "toji_voice_098_t09m30_5s.mp3",   // Let's go face-to-face.
      "toji_voice_156_t11m00_9s.mp3",   // Are you ready, Ka-kun?
      "toji_voice_170_t11m29_3s.mp3",   // Are you going to die?
      "toji_voice_200_t12m17_3s.mp3",   // Are you ready to die?
      "toji_voice_210_t12m35_7s.mp3",   // The opponent was bad.
      "toji_voice_197_t12m10_4s.mp3",   // Are you ready, Ina?
      "toji_voice_270_t14m17_5s.mp3",   // I'll kill you here.
    ],
    combatBark: [
      "toji_voice_348_t16m31_9s.mp3",   // I hate it when people look at me like I don't have anything
      "toji_voice_209_t12m33_8s.mp3",   // It took me a long time to figure out what to do.
      "toji_voice_252_t13m49_6s.mp3",   // Are you going to challenge me with your power?
      "toji_voice_068_t08m45_9s.mp3",   // Of course, you have to be able to handle it.
      "toji_voice_321_t15m48_5s.mp3",   // It's better to be separated from each other.
      "toji_voice_357_t16m46_3s.mp3",   // You have to think about how to deal with it.
      "toji_voice_217_t12m46_1s.mp3",   // It's been a long time since I last saw you.
      "toji_voice_150_t10m49_8s.mp3",   // I'm sure you can tell me what's going on.
      "toji_voice_274_t14m24_4s.mp3",   // I'll do my best for the rest of my life.
      "toji_voice_277_t14m31_7s.mp3",   // I'll let you choose the order of death.
      "toji_voice_198_t12m12_0s.mp3",   // There's nothing to be sad about, Zako.
      "toji_voice_260_t13m59_8s.mp3",   // It doesn't make any sense just to run.
      "toji_voice_125_t10m13_6s.mp3",   // What are you talking about? It's fun!
      "toji_voice_282_t14m42_5s.mp3",   // It's easy to get a job against Zarko.
      "toji_voice_354_t16m40_8s.mp3",   // The current battle isn't bad, is it?
      "toji_voice_115_t09m56_6s.mp3",   // Are you trying to get away from me?
      "toji_voice_360_t16m51_2s.mp3",   // This is the end of the game, right?
      "toji_voice_294_t15m03_5s.mp3",   // I'm not going to suffer like that.
      "toji_voice_345_t16m26_5s.mp3",   // Do you remember the name of a man?
      "toji_voice_083_t09m07_8s.mp3",   // I don't have time to fight again.
      "toji_voice_255_t13m53_5s.mp3",   // You're gonna hear it, aren't you?
      "toji_voice_104_t09m39_9s.mp3",   // I thought it wouldn't reach you.
      "toji_voice_278_t14m34_2s.mp3",   // I don't think I'm in a bad mood.
      "toji_voice_293_t15m01_9s.mp3",   // I wonder if the feeling is back.
      "toji_voice_322_t15m50_5s.mp3",   // It's better to get away from it.
      "toji_voice_135_t10m28_4s.mp3",   // I don't think it's a good idea.
      "toji_voice_143_t10m40_2s.mp3",   // I'll make a decision with this.
      "toji_voice_244_t13m36_5s.mp3",   // It looks like it's just a joke.
      "toji_voice_254_t13m52_1s.mp3",   // Do you want to take it from me?
      "toji_voice_271_t14m18_9s.mp3",   // It's enough for me to be alone.
      "toji_voice_318_t15m42_6s.mp3",   // It's a revolutionary technique.
      "toji_voice_056_t08m29_9s.mp3",   // I'm investigating the process.
    ],
    hitReact: [
      "toji_voice_380_t17m28_3s.mp3",   // I don't give a damn.
      "toji_voice_238_t13m23_6s.mp3",   // Damn it.
    ],
    lowHealth: [
      "toji_voice_341_t16m20_4s.mp3",   // It's a monster.
    ],
    win: [
      "toji_voice_351_t16m37_1s.mp3",   // I'm done with the next one.
      "toji_voice_272_t14m20_7s.mp3",   // I'll kill you and go home.
      "toji_voice_186_t11m51_5s.mp3",   // That's it, that's it.
      "toji_voice_127_t10m16_6s.mp3",   // The game is over!
      "toji_voice_212_t12m38_6s.mp3",   // Do your job!
      "toji_voice_149_t10m48_6s.mp3",   // It's over.
      "toji_voice_162_t11m17_7s.mp3",   // That's it!
      "toji_voice_084_t09m09_8s.mp3",   // I'm done!
    ],
    castSplitSoul: [
      "toji_voice_113_t09m54_1s.mp3",   // I'll cut you!
    ],
    castChain: [],
    castPlayfulCloud: [],
    comebackSave1: [
      "toji_voice_204_t12m25_6s.mp3",   // It's not over yet!
      "toji_voice_206_t12m28_6s.mp3",   // I'm still going.
      "toji_voice_230_t13m12_7s.mp3",   // Not yet, not yet.
      "toji_voice_196_t12m07_9s.mp3",   // I'll play until I get up.
    ],
    comebackSave2: [
      "toji_voice_267_t14m12_7s.mp3",   // I'll come back now.
      "toji_voice_189_t11m56_0s.mp3",   // Let's go from here.
    ],
  },
  en: {
    intro: [
      "toji_voice_039_t06m54_6s.mp3",   // I'll kill you. Don't be hasty now. You're wide open. Looks l
      "toji_voice_042_t07m06_7s.mp3",   // I'm like the invisible man. You have the blessing of parenta
      "toji_voice_055_t08m17_1s.mp3",   // Going for this one. It's decided. They're backing out fine o
      "toji_voice_041_t07m03_4s.mp3",   // You're free to go now, and since I have no cursed energy.
      "toji_voice_035_t05m59_9s.mp3",   // Your luck ran out when you became my target. Oh well.
      "toji_voice_019_t03m37_3s.mp3",   // I won't hold back or anything. Are you ready to die?
      "toji_voice_010_t02m32_3s.mp3",   // I'll show you the difference in our strength.
      "toji_voice_032_t05m20_8s.mp3",   // And I won't kill you, nothing against you.
      "toji_voice_009_t02m31_1s.mp3",   // Are you ready?
      "toji_voice_015_t02m52_8s.mp3",   // Die already.
      "toji_voice_037_t06m34_4s.mp3",   // Follow me.
    ],
    combatBark: [
      "toji_voice_017_t03m13_4s.mp3",   // Wet behind the ears thought you'd guard that you're done for
      "toji_voice_020_t03m51_6s.mp3",   // That's how it goes. You're in over your head.
      "toji_voice_005_t01m01_8s.mp3",   // You're the front, sweet dreams.
      "toji_voice_002_t00m11_3s.mp3",   // Increasing the pressure later
      "toji_voice_016_t03m11_2s.mp3",   // Baw! Let your guard down!
      "toji_voice_008_t02m29_3s.mp3",   // Look isn't on your side.
      "toji_voice_011_t02m34_7s.mp3",   // You got a big head, huh?
      "toji_voice_045_t07m19_0s.mp3",   // I get what you're asking
      "toji_voice_051_t07m47_4s.mp3",   // That's perfect. Shut up.
      "toji_voice_052_t08m01_6s.mp3",   // What? Are you for real?
      "toji_voice_046_t07m20_9s.mp3",   // I'll give it a rest.
      "toji_voice_014_t02m51_7s.mp3",   // So all that coming.
      "toji_voice_018_t03m35_2s.mp3",   // Wasted on a nobody.
      "toji_voice_192_t12m00_7s.mp3",   // Well done, don't I?
    ],
    hitReact: [
      "toji_voice_024_t04m13_3s.mp3",   // Tch! Shut up! MMM! GAH! NUH! GAH! WHAT?! NUH!
      "toji_voice_027_t04m36_6s.mp3",   // Not bad. Seriously? I screwed up. Damn.
      "toji_voice_034_t05m41_7s.mp3",   // Nothing special. Damn.
      "toji_voice_021_t03m55_0s.mp3",   // Wasting my damn time
      "toji_voice_025_t04m19_1s.mp3",   // That hurts!
      "toji_voice_383_t17m33_9s.mp3",   // Damn it.
    ],
    lowHealth: [
      "toji_voice_043_t07m11_9s.mp3",   // What a monster. Well, who really knows? You're not my type.
    ],
    win: [
      "toji_voice_047_t07m34_4s.mp3",   // Later. Time to strike. Let's see where this is going. Okay,
      "toji_voice_022_t03m57_0s.mp3",   // Choose the wrong opponent. Do your best now. Do your job.
      "toji_voice_040_t06m59_6s.mp3",   // Seriously? Sorry, signal's dropping. Okay, job's done.
      "toji_voice_031_t05m16_9s.mp3",   // Count me in. Do what you will with that. Go home now.
    ],
    castSplitSoul: [
      "toji_voice_007_t02m05_1s.mp3",   // Looking away? I won't back down. I'll cleave you apa
    ],
    castChain: [
      "toji_voice_029_t05m12_9s.mp3",   // Inverted spear of heaven
    ],
    castPlayfulCloud: [],
    comebackSave1: [],
    comebackSave2: [
      "toji_voice_048_t07m40_2s.mp3",   // You're free to go now. Our fight is just getting sta
      "toji_voice_050_t07m45_3s.mp3",   // Time to change the flow, shall we?
    ],
  },
}

let _activeLang = "ja"   // JA default (JJK subbed convention); setTojiVoiceLang("en") swaps live
export function setTojiVoiceLang(lang) { if (TOJI_VOICE[lang]) _activeLang = lang; return _activeLang }
export function getTojiVoiceLang() { return _activeLang }

export function pickTojiVoice(pool) {
  const set = TOJI_VOICE[_activeLang] || {}
  let arr = set[pool]
  // a move-specific cast pool empty in the active language → same-language general combat bark
  if ((!Array.isArray(arr) || arr.length === 0) && /^cast/.test(pool)) arr = set.combatBark
  // a comeback pool empty in the active language → same-language generic low-health line
  if ((!Array.isArray(arr) || arr.length === 0) && /^comeback/.test(pool)) arr = set.lowHealth
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
