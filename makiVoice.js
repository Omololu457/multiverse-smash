// makiVoice.js
// ---------------------------------------------------------------------------
// Maki Zenin voice-line pools (audio-only; NO gameplay effect). Wired from the
// JAPANESE dub set (clips 098–536) curated in MAKI_VOICE_LOG.md. The project has
// no per-character voice-language toggle, so ONE language is wired consistently —
// Japanese was chosen (Maki is a subbed-anime JJK character; the JA session is
// ~4.5× larger → better per-pool variety). The English set (clips 000–097) stays
// documented in MAKI_VOICE_LOG.md for a future toggle — swapping is a pool edit.
//
// pickMakiVoice(pool) returns ONE clip at random (genuine Math.random, same shape
// as pickVegetaVoice / pickSamuraiVoice). Callers play via sound.playSfxFile(clip,
// null); the single-voice-channel (no self-overlap) is handled by sound._voiceOwner.
//
// ── TRIGGER MAP ──
//   intro             → game.js INTRO_VOICE (match start; Maki has no taunt action → intro-only)
//   kunai             → abilities.js fireMakiKunai (Kunai Throw special cast)
//   nunchaku          → abilities.js fireMakiNunchaku (Nunchaku Flurry special cast)
//   powerCharge       → abilities.js fireMakiPowerCharge (Power Charge self-buff cast)
//   combatBark        → combat.js applyMakiOffenseVoice (heavy / long-string connect)
//   hitReact          → combat.js applyMakiHitVoice (defender got hit)
//   lowHealth         → combat.js applyMakiLowHealthVoice (once, crossing the low-HP line)
//   shibuyaActivation → abilities.js executeMakiShibuyaUltimate (≤25%-HP transformation CAST beat,
//                       BEFORE the cinematic reveal resolves — the "getting serious / turn it around" cue)
//   win               → game.js round-end WINNER block
//
// ── NOTES / flags ──
//   • Maki has NO `taunt` action (build-confirmed) → the intro/taunt lines fire on INTRO only
//     (same fallback as Rengoku/Shinobu/Samurai). Flagged, no new mechanic built.
//   • specialCast is split into the THREE built specials (kunai / nunchaku / powerCharge) so a
//     technique callout never plays over the wrong move.
//   • Cast lines set _atkVoiceCd on fire so they don't ALSO trigger the offense combatBark on connect
//     (and the cast fire is gated on _atkVoiceCd<=0 so rapid special use doesn't stack voices).
//   • shibuyaActivation is SEPARATE from the general lowHealth pool (per brief): the ★ "here we go /
//     turn it around" lines fire only at the transformation cast; lowHealth holds the "still moving" set.
//   All filenames are exact on-disk names (verified against the 537-clip set).
// ---------------------------------------------------------------------------

export const MAKI_VOICE = {
  // ── INTRO / taunt — pre-fight openers (no taunt action → intro only) ──
  intro: [
    "maki_129_t10m20_7s.mp3",   // "Don't underestimate me!"
    "maki_130_t10m22_5s.mp3",   // "Are you ready?"
    "maki_136_t10m31_8s.mp3",   // "Take a good look."
    "maki_139_t10m36_9s.mp3",   // "Are you making fun of me?"
    "maki_339_t16m13_7s.mp3",   // "Don't underestimate me!"
    "maki_453_t20m07_2s.mp3",   // "Preparation exercise is over."
    "maki_456_t20m13_0s.mp3",   // "If you don't feel like doing it, go home!"
    "maki_536_t22m41_0s.mp3",   // "Are you ready?"
  ],

  // ── SPECIAL casts — one pool per built special ──
  kunai: [                       // Kunai Throw ("open the hole")
    "maki_122_t10m09_0s.mp3",   // "I'll open the hole!"
    "maki_205_t12m21_4s.mp3",   // "I'm going to inflate the hole!"
  ],
  nunchaku: [                    // Nunchaku Flurry (weapon-name shouts)
    "maki_106_t09m44_4s.mp3",   // "Kiritobasu!" (slash away)
    "maki_193_t12m02_6s.mp3",   // "Kudakechiru!" (shatter)
    "maki_211_t12m32_3s.mp3",   // "Take this — Shindoken!"
    "maki_124_t10m13_1s.mp3",   // "I'll crush you!"
  ],
  powerCharge: [                 // Power Charge self-buff
    "maki_128_t10m18_7s.mp3",   // "I'll show you my power!"
    "maki_200_t12m12_9s.mp3",   // "I'll show you my power!"
  ],

  // ── COMBAT BARK — on landing a heavy / long-string connect ──
  combatBark: [
    "maki_104_t09m41_6s.mp3",   // "It's not over yet!"
    "maki_117_t10m01_7s.mp3",   // "I'll win!"
    "maki_120_t10m05_9s.mp3",   // "How about this?"
    "maki_121_t10m07_6s.mp3",   // "Can you avoid it?"
    "maki_143_t10m43_1s.mp3",   // "Behind you!"
    "maki_144_t10m44_3s.mp3",   // "Your back is open!"
    "maki_188_t11m53_6s.mp3",   // "Try to avoid it!"
    "maki_189_t11m55_2s.mp3",   // "I'm going to make you pay for this!"
    "maki_264_t14m06_3s.mp3",   // "This is my turn!"
    "maki_300_t15m08_0s.mp3",   // "I'll beat you up!"
    "maki_125_t10m14_6s.mp3",   // "Fly away!"
    "maki_177_t11m37_2s.mp3",   // "What do you think?"
  ],

  // ── HIT-REACTION — taking a hit ──
  hitReact: [
    "maki_109_t09m48_5s.mp3",   // "I can't believe it!"
    "maki_126_t10m15_9s.mp3",   // "This guy hurts!"
    "maki_133_t10m26_9s.mp3",   // "That was close!"
    "maki_303_t15m12_3s.mp3",   // "That was close."
    "maki_170_t11m26_1s.mp3",   // "You made me lose my sight!"
    "maki_321_t15m43_9s.mp3",   // "What the hell is this?!"
  ],

  // ── LOW-HEALTH — hurt but still fighting (general; once on crossing the line) ──
  lowHealth: [
    "maki_155_t11m02_2s.mp3",   // "My body is still moving!"
    "maki_159_t11m09_2s.mp3",   // "I haven't lost yet."
    "maki_161_t11m12_5s.mp3",   // "I can still do it!"
    "maki_220_t12m46_7s.mp3",   // "This is not my place to die!"
    "maki_280_t14m32_9s.mp3",   // "I'm not tired!"
    "maki_307_t15m19_5s.mp3",   // "Not yet!"
    "maki_314_t15m31_5s.mp3",   // "I can still do it!"
    "maki_336_t16m08_1s.mp3",   // "I'm not going to die."
    "maki_478_t20m53_7s.mp3",   // "I won't give up!"
  ],

  // ── SHIBUYA ACTIVATION — ≤25%-HP transformation cast cue (SEPARATE from lowHealth) ──
  shibuyaActivation: [
    "maki_316_t15m35_2s.mp3",   // ★ "I'm going to turn it upside down from here!"
    "maki_266_t14m10_0s.mp3",   // "This is where it starts!"
    "maki_454_t20m09_3s.mp3",   // "Seriously — let's go!"
    "maki_190_t11m57_2s.mp3",   // "To the limit!"
    "maki_380_t17m41_5s.mp3",   // "I'm going higher!"
  ],

  // ── WIN — victory ──
  win: [
    "maki_225_t13m03_2s.mp3",   // "It's over!"
    "maki_396_t18m10_9s.mp3",   // "It's my win."
    "maki_422_t19m09_9s.mp3",   // "It's over."
    "maki_474_t20m47_9s.mp3",   // "It was a good match."
    "maki_424_t19m15_6s.mp3",   // "I don't think it was a bad match."
    "maki_376_t17m32_4s.mp3",   // "Well, it's not bad, is it?"
    "maki_508_t21m48_8s.mp3",   // "See you next time!"
  ],
}

export function pickMakiVoice(pool) {
  const arr = MAKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
