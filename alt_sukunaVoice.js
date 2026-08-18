// alt_sukunaVoice.js
// ---------------------------------------------------------------------------
// ALTERNATE SUKUNA voice pools — a TONE-FILTERED REUSE of the ORIGINAL Sukuna's 685-clip bank
// (sukuna_new_000..684.mp3). NO new audio was produced: this is a SELECTION pass only. Alternate Sukuna
// is meant to read as LESS MALICIOUS than the original, so this wires PREFERENTIALLY the `measured`
// (calm / matter-of-fact / instructional / impressed-respectful) and `neutral_exertion` (wordless effort)
// deliveries, and EXCLUDES the `cruel_mocking` clips (the villain-contempt lines: "Know your place",
// "Crawl on the ground!", "What a disappointment", "Nothing but boring gutter trash", …). That exclusion
// IS the "less malicious" lever — it's about which real performances get reused, not about changing what
// was said.
//
// ★ HONEST LIMITATION: tone was classified from the TRANSCRIPT CONTENT (sukuna_raw_transcript.tsv — the
// words) + duration (exertion proxy), NOT by ear — this model cannot listen to the MP3s. For Sukuna most
// malice is verbal, so content is a strong proxy, but neutral WORDS delivered cruelly can't be verified
// acoustically. Borderline-condescending lines kept as measured (e.g. "You did well" for win) are flagged
// in SUKUNA_VOICE_LOG / the build report as ambiguous-included. Confirm by ear if any ever sounds off.
//
// Parallel EN/JA sets (the "Maki/Yuji approach", mirrors the original sukunaVoice.js). Default = EN (the
// language whose tone this pass could most defensibly verify). Switch with setAltSukunaVoiceLang("ja").
// pickAltSukunaVoice(pool) → ONE clip at random from the ACTIVE language, or null if empty.
//
// TRIGGERS (wired in game.js / combat.js / abilities.js, alt_sukuna-gated):
//   intro       → game.js INTRO_VOICE (match start; no taunt action → measured openers only)
//   offense     → combat.js applyAltSukunaAttackVoice (landed an attack; light-effort gated)
//   hitReact    → combat.js applyAltSukunaHitVoice (Sukuna got hit — IMPRESSED/entertained, not hurt)
//   castCleave  → abilities.js fireAltSukunaCmd (the Fwd+Heavy Dismantle/Cleave string)   ★ "Open." / "Cleave"
//   castFlame   → abilities.js fireAltSukunaBeam (Fūga: Fire Arrow, neutral special)
//   cast        → abilities.js fireAltSukunaSpinkick / fireAltSukunaGrab (general cursed-technique cast)
//   castDomain  → abilities.js executeAltSukunaUltimate (Domain Expansion: Malevolent Shrine)  ★ incantation
//   win         → game.js round-end WINNER block
//   exertion    → generic wordless effort (available for movement/neutral hooks)
//
//   • castCleave / castFlame / castDomain are SEPARATE pools so a technique callout matches its move; a
//     move-specific cast pool that's EMPTY in the active language falls back to the same-language `cast`.
//   • JA castCleave is intentionally empty (no clean callout in the rip) → falls back to JA `cast`.
//   All filenames are exact on-disk names (verified against the 685-clip set).
// ---------------------------------------------------------------------------

// ── ENGLISH (active/default) — tone-filtered ──
const ALT_SUKUNA_EN = {
  intro: [
    "sukuna_new_004_t00m13_9s.mp3",   // "First of all..."
    "sukuna_new_023_t00m43_0s.mp3",   // "It's about time."
    "sukuna_new_073_t01m59_9s.mp3",   // "This is a good opportunity."
    "sukuna_new_126_t03m21_4s.mp3",   // "This might be some fun."
    "sukuna_new_173_t04m47_8s.mp3",   // "Are we starting now?"
    "sukuna_new_293_t08m41_8s.mp3",   // "This is gonna be fun."
    "sukuna_new_300_t08m53_4s.mp3",   // "This is a good opportunity."
    "sukuna_new_304_t09m01_4s.mp3",   // "Shall we play?"
    "sukuna_new_311_t09m15_6s.mp3",   // "Here I come."
    "sukuna_new_324_t09m36_5s.mp3",   // "Here I go."
    "sukuna_new_325_t09m38_0s.mp3",   // "Time to get started."
    "sukuna_new_287_t08m31_0s.mp3",   // "Very well."
    "sukuna_new_314_t09m19_3s.mp3",   // "Very well."
  ],
  // "hitReact" for Sukuna = IMPRESSED, not hurt — the measured-respectful subset (the least-malicious lines
  // in the whole bank; where a villain acknowledges a good hit). This is the tone the alt build wants most.
  hitReact: [
    "sukuna_new_152_t04m10_4s.mp3",   // "Good hit."
    "sukuna_new_153_t04m11_6s.mp3",   // "That's the spirit."
    "sukuna_new_155_t04m14_9s.mp3",   // "Well done!"
    "sukuna_new_171_t04m43_7s.mp3",   // "You're not bad at all."
    "sukuna_new_177_t04m54_6s.mp3",   // "That's interesting."
    "sukuna_new_180_t04m59_8s.mp3",   // "Perhaps you are a worthy opponent."
    "sukuna_new_186_t05m12_2s.mp3",   // "You're strong."
    "sukuna_new_187_t05m13_8s.mp3",   // "Well placed."
    "sukuna_new_204_t05m45_8s.mp3",   // "Magnificent."
    "sukuna_new_238_t06m53_7s.mp3",   // "Now you've got my attention."
    "sukuna_new_272_t07m54_7s.mp3",   // "Oh, interesting."
    "sukuna_new_316_t09m23_5s.mp3",   // "Excellent."
    "sukuna_new_318_t09m26_1s.mp3",   // "Magnificent!"
  ],
  // offense = the NEUTRAL-combat deliveries only (plain "take this"); the "I'll kill you / Crawl / Go to hell /
  // I'll carve you up" cruel deliveries are deliberately EXCLUDED — offense is a thin pool as a result (flagged).
  offense: [
    "sukuna_new_018_t00m35_3s.mp3",   // "Take this!"
    "sukuna_new_069_t01m54_1s.mp3",   // "Back at ya."
    "sukuna_new_092_t02m28_8s.mp3",   // "Take this!"
    "sukuna_new_093_t02m29_9s.mp3",   // "Take this."
    "sukuna_new_094_t02m31_0s.mp3",   // "I'll give you something good."
    "sukuna_new_095_t02m32_8s.mp3",   // "Take that!"
    "sukuna_new_133_t03m36_3s.mp3",   // "A few more hits."
    "sukuna_new_135_t03m39_7s.mp3",   // "Here's more!"
  ],
  cast: [                              // general cursed-technique cast (Spin Kick / Cursed Grab) — instructional
    "sukuna_new_141_t03m49_7s.mp3",   // "Follow my lead."
    "sukuna_new_164_t04m31_2s.mp3",   // "Put more curse behind it."
    "sukuna_new_168_t04m38_8s.mp3",   // "Use your own power."
    "sukuna_new_250_t07m13_8s.mp3",   // "Combine your strength with mine."
    "sukuna_new_251_t07m16_2s.mp3",   // "Combine your strength with mine."
  ],
  castCleave: [                        // Dismantle/Cleave string callout
    "sukuna_new_199_t05m36_9s.mp3",   // "Open."
    "sukuna_new_200_t05m37_9s.mp3",   // "Cleave." (CLEE)
    "sukuna_new_226_t06m29_1s.mp3",   // "Cleave." (CLEE)
    "sukuna_new_063_t01m44_8s.mp3",   // "I'll cleave through."
  ],
  castFlame: [                         // Fūga: Fire Arrow — thin (most flame lines were cruel "burn you to nothing")
    "sukuna_new_067_t01m50_9s.mp3",   // "Let's see whose flames are hotter."
    "sukuna_new_108_t02m51_7s.mp3",   // "Going even hotter."
  ],
  castDomain: [                        // ★ Domain Expansion: Malevolent Shrine — incantation (inherently measured)
    "sukuna_new_201_t05m39_0s.mp3",   // "Malevolent Shrine."
    "sukuna_new_221_t06m22_3s.mp3",   // "Malevolent Shrine."
  ],
  win: [                               // measured close-outs only (cruel "Did you think you'd win?" etc. EXCLUDED)
    "sukuna_new_109_t02m53_4s.mp3",   // "It's over."
    "sukuna_new_240_t06m57_4s.mp3",   // "You did well."   (ambiguous-included: condescending but measured, not cruel)
    "sukuna_new_328_t09m44_4s.mp3",   // "You did well."   (ambiguous-included)
    "sukuna_new_335_t09m53_6s.mp3",   // "It is done."
    "sukuna_new_337_t09m56_1s.mp3",   // "That's that."
  ],
  exertion: [                          // wordless / near-wordless effort — no malicious coloring
    "sukuna_new_024_t00m44_8s.mp3",   // "Mm-hmm"
    "sukuna_new_086_t02m20_4s.mp3",   // "Eh."
    "sukuna_new_156_t04m16_4s.mp3",   // "Oh"
    "sukuna_new_158_t04m18_3s.mp3",   // "Whoa!"
    "sukuna_new_170_t04m42_6s.mp3",   // "Wow!"
    "sukuna_new_222_t06m23_9s.mp3",   // "Hmm"
    "sukuna_new_323_t09m35_4s.mp3",   // "Oh"
    "sukuna_new_490_t14m49_0s.mp3",   // "Heh."
    "sukuna_new_508_t15m19_2s.mp3",   // "Ho?"
    "sukuna_new_535_t16m16_2s.mp3",   // "Oh."
    "sukuna_new_629_t19m23_9s.mp3",   // "Ah."
    "sukuna_new_659_t20m23_8s.mp3",   // "Hmm"
    "sukuna_new_668_t20m45_5s.mp3",   // "Ha!"
  ],
}

// ── JAPANESE (switchable) — same tone filter applied to the JA text meaning ──
const ALT_SUKUNA_JA = {
  intro: [
    "sukuna_new_458_t13m34_4s.mp3",   // さて、やるか — "Well, let's do it."
    "sukuna_new_611_t18m41_2s.mp3",   // そろそろか — "About time."
    "sukuna_new_646_t19m57_5s.mp3",   // いい機会だ — "A good opportunity."
    "sukuna_new_669_t20m46_8s.mp3",   // やるとしよう — "Let's do it."
    "sukuna_new_670_t20m48_7s.mp3",   // やるとするか — "Shall we, then."
  ],
  hitReact: [
    "sukuna_new_485_t14m38_5s.mp3",   // やってくれたな — "You did it."
    "sukuna_new_486_t14m40_6s.mp3",   // 良い攻撃だ — "Nice attack."
    "sukuna_new_487_t14m42_6s.mp3",   // そうでなくては — "That's more like it."
    "sukuna_new_488_t14m44_5s.mp3",   // もっとだ — "More."
    "sukuna_new_509_t15m20_4s.mp3",   // やるではないか — "Not bad."
    "sukuna_new_515_t15m32_6s.mp3",   // 面白い — "Interesting."
    "sukuna_new_522_t15m47_6s.mp3",   // いい刺激だ — "A good stimulus."
    "sukuna_new_525_t15m53_3s.mp3",   // いい配置だ — "Well placed."
    "sukuna_new_542_t16m30_2s.mp3",   // 素晴らしい! — "Splendid!"
    "sukuna_new_663_t20m32_3s.mp3",   // いいぞ — "Good."
  ],
  offense: [
    "sukuna_new_431_t12m46_9s.mp3",   // 受け取れ — "Take it."
    "sukuna_new_432_t12m48_1s.mp3",   // いいものをやろう — "I'll give you something good."
    "sukuna_new_452_t13m22_8s.mp3",   // 受け止めてみろ — "Try to withstand it."
    "sukuna_new_477_t14m14_9s.mp3",   // 合わせろ — "Match me."
  ],
  cast: [
    "sukuna_new_445_t13m10_5s.mp3",   // 出力をあげるぞ — "Raising my output."
    "sukuna_new_502_t15m06_9s.mp3",   // もっと呪いを込めて — "Pour in more curse."
    "sukuna_new_526_t15m55_2s.mp3",   // 術式を使うまでもない — "No need for my technique."
    "sukuna_new_617_t18m55_7s.mp3",   // 教えてやる — "I'll teach you."
    "sukuna_new_645_t19m54_4s.mp3",   // 呪いのなんたるかを知るがいい — "Learn what a curse is."
  ],
  castCleave: [],                      // no clean JA callout → falls back to JA `cast` (see pickAltSukunaVoice)
  castFlame: [
    "sukuna_new_407_t12m03_0s.mp3",   // 火力勝負といこう — "A battle of firepower."
  ],
  castDomain: [
    "sukuna_new_560_t17m09_9s.mp3",   // 領域展開 (Ryoiki Tenkai — "Domain Expansion")
    "sukuna_new_561_t17m12_2s.mp3",   // 伏魔御廚子 (Fukuma Mizushi — "Malevolent Shrine")
  ],
  win: [
    "sukuna_new_411_t12m09_9s.mp3",   // 終わりだ — "It's over."
    "sukuna_new_467_t13m56_1s.mp3",   // 仕込みは終わりだ — "The setup is finished."
    "sukuna_new_637_t19m39_6s.mp3",   // 多少は楽しめたぞ — "I enjoyed that, somewhat."
    "sukuna_new_638_t19m41_8s.mp3",   // 退出する — "I'll take my leave."
    "sukuna_new_673_t20m57_0s.mp3",   // よくやった — "Well done."
  ],
  exertion: [
    "sukuna_new_552_t16m45_4s.mp3",   // 全く — "Good grief."
    "sukuna_new_671_t20m51_6s.mp3",   // なに? — "What?"
  ],
}

export const ALT_SUKUNA_VOICE = { ja: ALT_SUKUNA_JA, en: ALT_SUKUNA_EN }

let _activeLang = "en"   // default = English (the language whose tone this filter could most defensibly verify)
export function setAltSukunaVoiceLang(lang) { if (lang === "en" || lang === "ja") _activeLang = lang; return _activeLang }
export function getAltSukunaVoiceLang() { return _activeLang }

export function pickAltSukunaVoice(pool) {
  const set = ALT_SUKUNA_VOICE[_activeLang] || {}
  let arr = set[pool]
  // a move-specific cast pool empty in the active language falls back to the same-language general `cast`.
  if ((!Array.isArray(arr) || arr.length === 0) && /^cast/.test(pool) && pool !== "cast") arr = set.cast
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
