// miwaVoice.js
// ---------------------------------------------------------------------------
// Kasumi Miwa voice-line pools (audio-only; NO gameplay effect). Wired from the
// JAPANESE dub set (clips 358–718) curated in MIWA_VOICE_LOG.md. Per the brief the
// English session (clips 000–357) was DISCARDED entirely — only Japanese is wired
// (Miwa is a subbed-anime JJK character). The project has no per-character voice-
// language toggle (same as Maki), so ONE language is wired consistently.
//
// pickMiwaVoice(pool) returns ONE clip at random (genuine Math.random, same shape
// as pickMakiVoice / pickVegetaVoice). Callers play via sound.playSfxFile(clip,
// null); the single-voice-channel (no self-overlap) is handled by sound._voiceOwner.
//
// ── TRIGGER MAP ──
//   intro + taunt → game.js INTRO_VOICE (match start). Miwa has NO taunt action
//                   (build-confirmed — `Drinking` is flavor-only, no gameplay hook), so
//                   the taunt pool folds into the intro beat (same fallback as Gon /
//                   Shinobu / Naruto). INTRO_VOICE.miwa fires from the combined pool.
//   iaiDash       → abilities.js fireMiwaIaiDash (grounded Special — battojutsu gap-close)
//   airVortex     → abilities.js fireMiwaAirSlash (airborne Special — Rapid Slash Vortex)
//   ultimate      → abilities.js executeMiwaUltimate ("Blade of the Neophyte" cast beat)
//   combatBark    → combat.js applyMiwaOffenseVoice (heavy / long-string connect)
//   hitReact      → combat.js applyMiwaHitVoice (defender got hit)
//   lowHealth     → combat.js applyMiwaLowHealthVoice (once, crossing the low-HP line)
//   win           → game.js round-end WINNER block
//
// ── NOTES / flags ──
//   • specialCast is split into the THREE built moves (iaiDash / airVortex / ultimate)
//     so a technique callout never plays over the wrong move (Maki precedent).
//   • The cursed-energy CHARGE stance (hold P) is engine-driven (animationData.charge,
//     no fire function) → no cast line is wired there.
//   • Cast lines set _atkVoiceCd on fire so they don't ALSO trigger the offense
//     combatBark on connect (and the cast fire is gated on _atkVoiceCd<=0).
//   • Best anime-authentic casts are the technique names: 390 簡易領域 (Simple Domain)
//     and 506/510 新陰流 (Shinkage-ryū, her sword school).
//   All filenames are exact on-disk names (verified against the 719-clip set).
// ---------------------------------------------------------------------------

export const MIWA_VOICE = {
  // ── INTRO — pre-fight openers / self-intro ──
  intro: [
    "miwa_667_t22m12_4s.mp3",   // "…Miwa desu!" (self-introduction)
    "miwa_360_t11m49_8s.mp3",   // "I will defeat you here!"
    "miwa_361_t11m51_5s.mp3",   // "Are you going to stop me?"
    "miwa_542_t17m46_0s.mp3",   // "Are you ready?"
    "miwa_545_t17m52_1s.mp3",   // "You're going to fight me, aren't you?"
    "miwa_438_t14m18_3s.mp3",   // "I can fight, too!"
    "miwa_514_t16m47_3s.mp3",   // "I'll show you what I can do!"
    "miwa_589_t19m25_5s.mp3",   // "I'll show you how strong I am!"
    "miwa_417_t13m34_1s.mp3",   // "Is it okay for me to win?" (timid-Miwa flavor)
  ],

  // ── TAUNT — nervous / playful flavor (no taunt action → folds into intro beat) ──
  taunt: [
    "miwa_381_t12m25_0s.mp3",   // "I'm not drunk!" (signature comedic line)
    "miwa_416_t13m31_9s.mp3",   // "Please don't think of me as a bad girl!"
    "miwa_405_t13m11_5s.mp3",   // "What do you think?"
    "miwa_531_t17m21_9s.mp3",   // "It's fun, isn't it?"
    "miwa_585_t19m16_6s.mp3",   // "You're strong, aren't you?"
    "miwa_574_t18m52_8s.mp3",   // "Are you sure you're okay with that?"
  ],

  // ── SPECIAL casts — one pool per built move ──
  iaiDash: [                     // grounded Special — battojutsu quick-draw gap-closer
    "miwa_506_t16m31_4s.mp3",   // "Shinkage-ryū" (新陰流 — her sword school)
    "miwa_510_t16m39_2s.mp3",   // "Shinkage-ryū!"
    "miwa_422_t13m44_1s.mp3",   // "With this one blow!"
    "miwa_494_t16m09_6s.mp3",   // "From the neck!" (battojutsu targeting)
    "miwa_617_t20m33_2s.mp3",   // "I'll cut it out!"
    "miwa_406_t13m13_0s.mp3",   // "I'm going to cut it!"
    "miwa_371_t12m07_2s.mp3",   // "With my counter!"
  ],
  airVortex: [                   // airborne Special — Rapid Slash Vortex
    "miwa_390_t12m42_3s.mp3",   // "KANI RYOIKI" (簡易領域 — Simple Domain)
    "miwa_439_t14m20_5s.mp3",   // "I'll strike with all my might!"
    "miwa_462_t15m07_1s.mp3",   // "With this one shot!"
  ],
  ultimate: [                    // "Blade of the Neophyte" — battojutsu quick-draw ult
    "miwa_419_t13m38_6s.mp3",   // "I'll put my full power on it!"
    "miwa_643_t21m24_7s.mp3",   // "I'm aiming for the awakening technique!"
  ],

  // ── COMBAT BARK — on landing a heavy / long-string connect ──
  combatBark: [
    "miwa_363_t11m54_2s.mp3",   // "I'll cut you off!"
    "miwa_368_t12m02_7s.mp3",   // "This is the end!"
    "miwa_384_t12m30_4s.mp3",   // "I won't let you attack!"
    "miwa_401_t13m03_2s.mp3",   // "It's over!"
    "miwa_425_t13m50_4s.mp3",   // "I won't let you go!"
    "miwa_443_t14m30_1s.mp3",   // "I'm going to beat you up!"
    "miwa_446_t14m36_3s.mp3",   // "I won't let you get away!"
    "miwa_463_t15m09_0s.mp3",   // "Here it comes!"
    "miwa_484_t15m51_6s.mp3",   // "I'll eat you up!"
    "miwa_650_t21m38_7s.mp3",   // "I'll keep attacking!"
    "miwa_697_t23m16_6s.mp3",   // "It's the end!"
    "miwa_445_t14m34_7s.mp3",   // "Now is my chance!"
    "miwa_370_t12m06_0s.mp3",   // "Now is the time!"
    "miwa_457_t14m56_8s.mp3",   // "Here I go."
    "miwa_703_t23m48_0s.mp3",   // "Let's do this!"
  ],

  // ── HIT-REACTION — taking a hit ──
  hitReact: [
    "miwa_362_t11m53_0s.mp3",   // "Crap!"
    "miwa_461_t15m05_9s.mp3",   // "Ouch!"
    "miwa_378_t12m19_1s.mp3",   // "That was close!"
    "miwa_537_t17m36_2s.mp3",   // "I'm scared!"
    "miwa_529_t17m17_8s.mp3",   // "I'm getting nervous!"
    "miwa_480_t15m43_4s.mp3",   // "I shouldn't have done this…"
    "miwa_660_t21m59_1s.mp3",   // "This guy…"
    "miwa_692_t23m08_3s.mp3",   // "Please don't come!"
  ],

  // ── LOW-HEALTH — hurt but still fighting (once, on crossing the line) ──
  lowHealth: [
    "miwa_403_t13m06_9s.mp3",   // "I can't lose!"
    "miwa_515_t16m49_6s.mp3",   // "I don't want to lose!"
    "miwa_485_t15m53_2s.mp3",   // "I won't give up yet!"
    "miwa_467_t15m15_1s.mp3",   // "I can still do it!"
    "miwa_459_t15m00_2s.mp3",   // "I used too much of my power!"
    "miwa_430_t14m00_8s.mp3",   // "I can't use my full power yet."
    "miwa_659_t21m56_4s.mp3",   // "I won't be able to lose either!"
    "miwa_478_t15m38_9s.mp3",   // "I don't want to live like this!"
  ],

  // ── WIN — victory ──
  win: [
    "miwa_375_t12m14_4s.mp3",   // "I did it!"
    "miwa_450_t14m44_4s.mp3",   // "I made it!"
    "miwa_464_t15m10_4s.mp3",   // "I did a good job!"
    "miwa_604_t20m04_5s.mp3",   // "I won safely!"
    "miwa_602_t20m00_9s.mp3",   // "I won!"
    "miwa_582_t19m10_6s.mp3",   // "I did it somehow!"
    "miwa_685_t22m51_3s.mp3",   // "It was a good match, wasn't it?"
    "miwa_628_t20m55_2s.mp3",   // "See you next time!"
    "miwa_376_t12m15_9s.mp3",   // "This is how much I can do."
    "miwa_614_t20m26_0s.mp3",   // "I'm glad I did my best!"
  ],
}

export function pickMiwaVoice(pool) {
  const arr = MIWA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
