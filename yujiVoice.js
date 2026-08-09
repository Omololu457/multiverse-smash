// yujiVoice.js
// ---------------------------------------------------------------------------
// Yuji Itadori voice-line pools (audio-only; NO gameplay effect). Curated in
// YUJI_VOICE_LOG.md from the 564-clip rip. Per the owner's decision, BOTH
// languages are kept in SEPARATE parallel pool sets (the "Maki approach"):
//   YUJI_VOICE.ja  — Japanese dub  (72 lines)   ← ACTIVE by default
//   YUJI_VOICE.en  — English dub   (46 lines)
// The project has no per-character language TOGGLE UI, so ONE language is wired
// live at a time (same as Maki/Miwa, which wired JA). Japanese is the default
// (Yuji is a subbed-anime JJK character; the JA session is larger → more per-pool
// variety). setYujiVoiceLang("en") flips the whole kit to the English set — the
// EN pools ship wired-and-ready, one switch away (harness hook: yujiVoiceLang).
//
// pickYujiVoice(pool) returns ONE clip at random from the ACTIVE language set
// (genuine Math.random, same shape as pickMakiVoice / pickVegetaVoice). Callers
// play via sound.playSfxFile(clip, null); the single-voice-channel (no self-
// overlap) is handled by sound._voiceOwner.
//
// ── TRIGGER MAP ──
//   intro       → game.js INTRO_VOICE (match start; Yuji has no taunt action → intro-only)
//   cast        → abilities.js fireYuji{Ball,Beam,Pillar,Crescent,AirCombo} (cursed-energy Y specials)
//   blackFlash  → abilities.js executeYujiUltimate (the "Black Flash" ult cast beat)  ★ dedicated callout
//   offense     → combat.js applyYujiOffenseVoice (heavy / long-string connect; carries the "Divergent!" punch line)
//   hitReact    → combat.js applyYujiHitVoice (defender got hit)
//   lowHealth   → combat.js applyYujiLowHealthVoice (once, crossing the low-HP line)
//   win         → game.js round-end WINNER block
//
// ── NOTES / flags ──
//   • Yuji has NO `taunt` action → intro/taunt lines fire on INTRO only (same fallback as Maki/Rengoku/Shinobu).
//   • blackFlash is a SEPARATE pool from `cast` so the "Black Flash / 黒閃 Kokusen" callout only ever plays on
//     the Ultimate — never over a Ball/Beam/etc. His Divergent Fist HEAVY carries the "Divergent!" line inside
//     `offense` (EN 082). Sukuna Slash + Koma have NO dedicated callout in the rip → they use `cast`/`offense`.
//   • Cast lines set _atkVoiceCd on fire so they don't ALSO trigger the offense bark on connect.
//   All filenames are exact on-disk names (verified against the 564-clip set + YUJI_VOICE_LOG.md).
// ---------------------------------------------------------------------------

// ── JAPANESE dub (active) ──
const YUJI_JA = {
  intro: [
    "yuji_voice_189_t09m25_1s.mp3",   // "Prepare yourself!"
    "yuji_voice_191_t09m27_9s.mp3",   // "Don't look down on me!"
    "yuji_voice_234_t10m41_9s.mp3",   // "If you don't mind — let's go!"
    "yuji_voice_337_t13m32_8s.mp3",   // "Let's do this!"
    "yuji_voice_338_t13m34_3s.mp3",   // "Alright, let's go!"
    "yuji_voice_340_t13m38_4s.mp3",   // "I don't want to lose to anyone!"
    "yuji_voice_368_t14m33_2s.mp3",   // "I want to be stronger!"
    "yuji_voice_422_t16m26_7s.mp3",   // "Well, here we go!"
    "yuji_voice_455_t17m23_5s.mp3",   // "Well, let's do it!"
    "yuji_voice_498_t18m44_9s.mp3",   // "Let's have fun!"
    "yuji_voice_540_t20m12_0s.mp3",   // "Let's do it!"
  ],
  offense: [
    "yuji_voice_154_t08m38_5s.mp3",   // "I'll crush you!"
    "yuji_voice_159_t08m45_9s.mp3",   // "I'll attack you!"
    "yuji_voice_172_t09m03_6s.mp3",   // "I'm going forward!"
    "yuji_voice_174_t09m05_9s.mp3",   // "I'll make you pay for this!"
    "yuji_voice_179_t09m12_2s.mp3",   // "Stop moving!"
    "yuji_voice_195_t09m34_9s.mp3",   // "With this one blow!"
    "yuji_voice_198_t09m39_9s.mp3",   // "Get out of my way!"
    "yuji_voice_201_t09m44_0s.mp3",   // "Don't get in my way!"
    "yuji_voice_204_t09m48_0s.mp3",   // "I'll finish it in one shot!"
    "yuji_voice_210_t09m57_3s.mp3",   // "It's the end!"
    "yuji_voice_213_t10m02_5s.mp3",   // "It's over!"
    "yuji_voice_216_t10m17_1s.mp3",   // "This is it!"
    "yuji_voice_227_t10m31_1s.mp3",   // "Take this!"
    "yuji_voice_232_t10m38_7s.mp3",   // "I'll defeat you with this!"
    "yuji_voice_242_t10m52_4s.mp3",   // "This is a one-shot!"
    "yuji_voice_245_t10m57_0s.mp3",   // "It's decided — now!"
    "yuji_voice_255_t11m14_0s.mp3",   // "More!"
    "yuji_voice_361_t14m21_7s.mp3",   // "I will defeat you!"
    "yuji_voice_456_t17m25_1s.mp3",   // "I'll catch you!"
    "yuji_voice_209_t09m55_8s.mp3",   // "I'll beat you up!"
    "yuji_voice_230_t10m35_6s.mp3",   // "Let's end this!"
    "yuji_voice_180_t09m13_6s.mp3",   // "Die!"
  ],
  cast: [                              // general cursed-energy special cast (Ball/Beam/Pillar/Crescent/AirCombo)
    "yuji_voice_202_t09m45_5s.mp3",   // "I'm using my full power!"
    "yuji_voice_239_t10m48_6s.mp3",   // "Full power!"
    "yuji_voice_241_t10m51_2s.mp3",   // "It's full of power!"
    "yuji_voice_254_t11m11_8s.mp3",   // "The power's come to me!"
    "yuji_voice_203_t09m46_8s.mp3",   // "Build it up!"
    "yuji_voice_326_t13m10_6s.mp3",   // "The energy's coming out!"
    "yuji_voice_256_t11m15_7s.mp3",   // "This is my strength."
    "yuji_voice_251_t11m06_7s.mp3",   // "I've got a knife!" (slash special)
    "yuji_voice_430_t16m39_2s.mp3",   // "Decide it — awakening technique!"
    "yuji_voice_495_t18m38_9s.mp3",   // "Power battle!"
  ],
  blackFlash: [                        // ★ Ultimate — 黒閃 (kokusen = Black Flash)
    "yuji_voice_372_t14m41_9s.mp3",   // "KOKUSEN!"
    "yuji_voice_373_t14m43_4s.mp3",   // "KOKUSEN!" (alt take)
  ],
  hitReact: [
    "yuji_voice_220_t10m21_3s.mp3",   // "Damn it!"
    "yuji_voice_266_t11m34_3s.mp3",   // "That was close!"
    "yuji_voice_302_t12m28_9s.mp3",   // "This is bad!"
    "yuji_voice_322_t13m04_6s.mp3",   // "Oh no!"
    "yuji_voice_379_t14m54_7s.mp3",   // "I can't take it!"
    "yuji_voice_388_t15m18_2s.mp3",   // "I can't move!"
    "yuji_voice_233_t10m40_5s.mp3",   // "Are you kidding me?"
    "yuji_voice_454_t17m20_9s.mp3",   // "What the hell are you doing?"
    "yuji_voice_387_t15m14_9s.mp3",   // "Heh — damn it!"
  ],
  lowHealth: [
    "yuji_voice_252_t11m08_4s.mp3",   // "It's not over yet!"
    "yuji_voice_299_t12m23_7s.mp3",   // "Not yet!"
    "yuji_voice_321_t13m02_8s.mp3",   // "I won't give up!"
    "yuji_voice_364_t14m26_2s.mp3",   // "I won't lose!"
    "yuji_voice_447_t17m09_4s.mp3",   // "I can't lose either!"
    "yuji_voice_491_t18m31_0s.mp3",   // "I don't want to regret it!"
    "yuji_voice_494_t18m37_0s.mp3",   // "I don't feel like I'm going to lose."
    "yuji_voice_271_t11m42_2s.mp3",   // "I can't bring it out yet!"
    "yuji_voice_273_t11m45_2s.mp3",   // "At a time like this!"
  ],
  win: [
    "yuji_voice_265_t11m32_3s.mp3",   // "I managed to beat him!"
    "yuji_voice_367_t14m30_8s.mp3",   // "Whoa — I finally did it!"
    "yuji_voice_371_t14m40_1s.mp3",   // "I'm the best!"
    "yuji_voice_389_t15m19_8s.mp3",   // "It was a good match!"
    "yuji_voice_444_t17m04_7s.mp3",   // "It's a success!"
    "yuji_voice_448_t17m11_5s.mp3",   // "I'm the winner!"
    "yuji_voice_369_t14m35_3s.mp3",   // "I'm in a good mood!"
    "yuji_voice_406_t15m59_7s.mp3",   // "I'll become even stronger!"
    "yuji_voice_464_t17m39_0s.mp3",   // "That was a good match!"
  ],
}

// ── ENGLISH dub (present, switchable via setYujiVoiceLang("en")) ──
const YUJI_EN = {
  intro: [
    "yuji_voice_003_t00m09_1s.mp3",   // "Focus."
    "yuji_voice_024_t01m52_2s.mp3",   // "Now I'm warmed up!"
    "yuji_voice_025_t01m53_4s.mp3",   // "Now I'm feeling it!"
    "yuji_voice_055_t03m25_8s.mp3",   // "Let's win — I'm doing this."
    "yuji_voice_057_t03m29_9s.mp3",   // "I didn't come here to lose."
    "yuji_voice_069_t03m52_4s.mp3",   // "There's nothing to be afraid of."
    "yuji_voice_072_t04m01_9s.mp3",   // "Let's go all out!"
    "yuji_voice_094_t04m49_1s.mp3",   // "I'm just getting started!"
    "yuji_voice_128_t07m04_5s.mp3",   // "Let's have some fun. Let's go."
    "yuji_voice_130_t07m09_6s.mp3",   // "I'm looking forward to this."
    "yuji_voice_146_t08m01_3s.mp3",   // "Let's do this!"
  ],
  offense: [
    "yuji_voice_007_t00m33_2s.mp3",   // "I'll wipe you out!"
    "yuji_voice_010_t00m43_4s.mp3",   // "Put it in your fist!"
    "yuji_voice_011_t00m44_8s.mp3",   // "With this fist!"
    "yuji_voice_014_t01m09_0s.mp3",   // "Checkmate!"
    "yuji_voice_016_t01m37_9s.mp3",   // "Take that!"
    "yuji_voice_019_t01m41_3s.mp3",   // "Take this!"
    "yuji_voice_021_t01m44_7s.mp3",   // "Found an opening."
    "yuji_voice_028_t02m08_0s.mp3",   // "Let's put an end to this!"
    "yuji_voice_030_t02m10_8s.mp3",   // "Follow through!"
    "yuji_voice_040_t02m43_6s.mp3",   // "Come on!"
    "yuji_voice_043_t02m48_6s.mp3",   // "You think that'll stop me?"
    "yuji_voice_075_t04m05_7s.mp3",   // "I'll flatten you!"
    "yuji_voice_117_t06m17_8s.mp3",   // "The next one's the last."
    "yuji_voice_082_t04m28_1s.mp3",   // "Divergent!" (Divergent Fist heavy callout)
  ],
  cast: [
    "yuji_voice_020_t01m42_4s.mp3",   // "Full power! This is it!"
    "yuji_voice_058_t03m32_1s.mp3",   // "All out."
  ],
  blackFlash: [                        // ★ Ultimate — "Black Flash"
    "yuji_voice_078_t04m20_7s.mp3",   // "Black Flash!"
  ],
  hitReact: [
    "yuji_voice_045_t02m51_4s.mp3",   // "Crap! I'm onto you!"
    "yuji_voice_046_t02m53_1s.mp3",   // "That was close."
    "yuji_voice_047_t02m55_6s.mp3",   // "I'm not done yet!"
    "yuji_voice_145_t07m57_9s.mp3",   // "Damn! What?!"
    "yuji_voice_531_t19m57_0s.mp3",   // "Shit!"
    "yuji_voice_291_t12m14_1s.mp3",   // (grunt) "Gah!"
    "yuji_voice_281_t11m59_9s.mp3",   // (grunt) "Ahh!"
    "yuji_voice_301_t12m27_2s.mp3",   // (grunt) "Rrghh!"
  ],
  lowHealth: [
    "yuji_voice_027_t02m04_9s.mp3",   // "I'm not gonna lose now!"
    "yuji_voice_048_t02m59_8s.mp3",   // "Won't get rid of me that easy."
    "yuji_voice_050_t03m05_3s.mp3",   // "I'm still in this!"
    "yuji_voice_052_t03m08_2s.mp3",   // "It's now or never."
  ],
  win: [
    "yuji_voice_089_t04m42_1s.mp3",   // "Piece of cake!"
    "yuji_voice_091_t04m43_8s.mp3",   // "Have I got moves or what? That was a good fight!"
    "yuji_voice_096_t04m55_8s.mp3",   // "How'd I do?"
    "yuji_voice_103_t05m15_8s.mp3",   // "Not bad at all!"
    "yuji_voice_032_t02m14_7s.mp3",   // "Yes! I did it!"
    "yuji_voice_124_t06m54_3s.mp3",   // "I won't regret the way I live."
  ],
}

export const YUJI_VOICE = { ja: YUJI_JA, en: YUJI_EN }

let _activeLang = "ja"   // default wired language (see header)
export function setYujiVoiceLang(lang) { if (lang === "en" || lang === "ja") _activeLang = lang; return _activeLang }
export function getYujiVoiceLang() { return _activeLang }

export function pickYujiVoice(pool) {
  const set = YUJI_VOICE[_activeLang] || {}
  const arr = set[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
