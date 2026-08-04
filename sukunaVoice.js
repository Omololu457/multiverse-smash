// sukunaVoice.js
// ---------------------------------------------------------------------------
// Ryomen Sukuna voice-line pools (audio-only; NO gameplay effect). Curated in
// SUKUNA_VOICE_LOG.md from the 685-clip replacement rip (his prior pool was
// deleted 2026-08-04; this rebuilds it). Per the owner's decision, BOTH languages
// are kept in SEPARATE parallel pool sets (the "Maki / Yuji approach"):
//   SUKUNA_VOICE.ja  — Japanese dub  (65 lines)   ← ACTIVE by default
//   SUKUNA_VOICE.en  — English dub   (80 lines)
// The project has no per-character language TOGGLE UI, so ONE language is wired
// live at a time (same as Maki / Miwa / Yuji, which wired JA). Japanese is the
// default — Sukuna is a JJK character (subbed-anime convention shared with Maki /
// Miwa / Yuji) AND the JA set carries the CANONICAL domain incantation the EN set
// only approximates (領域展開 → 伏魔御廚子). The EN pools ship wired-and-ready and are
// LARGER/cleaner (0.95–0.99 conf) — one switch away via setSukunaVoiceLang("en")
// (harness hook: sukunaVoiceLang).
//
// pickSukunaVoice(pool) returns ONE clip at random from the ACTIVE language set
// (genuine Math.random, same shape as pickYujiVoice / pickMakiVoice). Callers play
// via sound.playSfxFile(clip, null); the single-voice-channel (no self-overlap) is
// handled by sound._voiceOwner.
//
// ── TRIGGER MAP ──
//   intro        → game.js INTRO_VOICE (match start; Sukuna has no taunt action →
//                  intro + taunt pools MERGE on the intro beat, like Miwa)
//   castCleave   → abilities.js executeSukunaSpecial, Cleave branch (neutral special)   ★ "Open." 開
//   castFlame    → abilities.js executeSukunaSpecial, Flame Arrow branch (Fwd+Special)
//   cast         → abilities.js executeSukunaSpecial, Dismantle (Back) + Cursed Slash (Down)
//                  — neither has a dedicated callout in the rip → general cast pool
//   castDomain   → domains.js activateDomain sukuna branch (the Malevolent Shrine ult
//                  incantation — restores the exact slot the deleted line occupied)     ★ 領域展開/伏魔御廚子
//   offense      → combat.js applySukunaOffenseVoice (heavy / long-string connect)
//   hitReact     → combat.js applySukunaHitVoice (defender got hit — Sukuna is ENTERTAINED)
//   lowHealth    → combat.js applySukunaLowHealthVoice (once, crossing the low-HP line)
//   win          → game.js round-end WINNER block
//
// ── NOTES / flags ──
//   • castCleave / castFlame / castDomain are SEPARATE pools so a technique callout
//     never plays over the wrong move (Maki / Yuji precedent). Dismantle & Cursed
//     Slash have NO dedicated callout → they draw the general `cast` pool.
//   • The JA `castCleave` pool is intentionally empty (no clean 開 callout in the rip)
//     → pickSukunaVoice falls castCleave back to the same-language general `cast` pool.
//   • Cast lines set _atkVoiceCd on fire so they don't ALSO trigger the offense bark
//     on connect (and the cast fire is gated on _atkVoiceCd<=0).
//   • The Malevolent Dash (double-tap-toward) and the cursed-energy CHARGE stance are
//     NOT voiced (movement-tech / engine-driven) — no cast line wired there.
//   • castDomain 220 ("No Main Expansion") is a probable whisper mis-hear of "Domain
//     Expansion" — kept in the EN domain pool; confirm by ear if it ever sounds off.
//   All filenames are exact on-disk names (verified against the 685-clip set + LOG).
// ---------------------------------------------------------------------------

// ── JAPANESE dub (active) ──
const SUKUNA_JA = {
  intro: [
    "sukuna_new_458_t13m34_4s.mp3",   // さて、やるか — "Well, let's do it."
    "sukuna_new_348_t10m27_3s.mp3",   // よけてみろ — "Try to dodge."
    "sukuna_new_358_t10m43_0s.mp3",   // 受けてみろ — "Try to take this."
    "sukuna_new_434_t12m50_9s.mp3",   // どんなところか — "Let's see what you've got."
    "sukuna_new_540_t16m25_7s.mp3",   // 死にたいのか? — "Do you want to die?"
    "sukuna_new_546_t16m36_7s.mp3",   // ほらかかってこい — "Come on, come at me."
    "sukuna_new_551_t16m43_4s.mp3",   // 相手をしてやろう — "I'll deal with you."
    "sukuna_new_651_t20m07_2s.mp3",   // 遊んでやろう — "Let's play."
  ],
  taunt: [                             // no taunt action → merges into intro beat
    "sukuna_new_415_t12m16_1s.mp3",   // 貴様にも飽きたな — "I've grown tired of you."
    "sukuna_new_460_t13m38_7s.mp3",   // 本気を出すまでもない — "No need to get serious."
    "sukuna_new_461_t13m41_1s.mp3",   // この程度か — "Is this all?"
    "sukuna_new_474_t14m08_9s.mp3",   // 期待外れだ — "What a letdown."
    "sukuna_new_519_t15m41_2s.mp3",   // 許可なく見上げるな — "Don't look up without permission."
    "sukuna_new_520_t15m43_6s.mp3",   // 思い上がるなよ — "Don't get cocky."
    "sukuna_new_556_t16m56_9s.mp3",   // つまらん奴らばかりだな — "Nothing but boring fools."
    "sukuna_new_557_t16m59_7s.mp3",   // ゴミばかりでつまらんな — "Nothing but trash — boring."
    "sukuna_new_558_t17m02_6s.mp3",   // この時代にまともなやつはいない — "No one decent in this era."
    "sukuna_new_567_t17m23_4s.mp3",   // 実につまらんな — "Truly boring."
    "sukuna_new_624_t19m11_2s.mp3",   // お前はつまらんな — "You're boring."
    "sukuna_new_650_t20m04_5s.mp3",   // ザコの相手などつまらん — "Fighting weaklings is boring."
  ],
  offense: [
    "sukuna_new_339_t10m10_9s.mp3",   // 吹き飛べ — "Blow away."
    "sukuna_new_343_t10m17_2s.mp3",   // 消えろ! — "Disappear!"
    "sukuna_new_349_t10m29_0s.mp3",   // 遅い — "Too slow."
    "sukuna_new_364_t10m54_1s.mp3",   // 許さんぞ — "I won't forgive you."
    "sukuna_new_366_t10m57_4s.mp3",   // 寝てろ — "Stay down."
    "sukuna_new_370_t11m03_1s.mp3",   // 死ね! — "Die!"
    "sukuna_new_371_t11m04_3s.mp3",   // 動くな — "Don't move."
    "sukuna_new_373_t11m07_6s.mp3",   // 一切の行動を禁ずる — "I forbid all action."
    "sukuna_new_384_t11m27_2s.mp3",   // くたばれ — "Drop dead."
    "sukuna_new_405_t11m59_3s.mp3",   // まとめて殺す — "I'll kill you all at once."
    "sukuna_new_409_t12m06_6s.mp3",   // お返しだ — "Payback."
    "sukuna_new_410_t12m08_2s.mp3",   // 逃がさんぞ — "You won't escape."
    "sukuna_new_429_t12m43_3s.mp3",   // もっと抵抗してみろ — "Resist a little more."
    "sukuna_new_431_t12m46_9s.mp3",   // 受け取れ — "Take this."
    "sukuna_new_432_t12m48_1s.mp3",   // いいものをやろう — "I'll give you something good."
    "sukuna_new_452_t13m22_8s.mp3",   // 受け止めてみろ — "Try to withstand it."
    "sukuna_new_598_t18m20_9s.mp3",   // 殺しに行くぞ — "Going in for the kill."
  ],
  cast: [                              // Dismantle (Back) + Cursed Slash (Down) — general cursed-technique cast
    "sukuna_new_445_t13m10_5s.mp3",   // 出力をあげるぞ — "Raising my output."
    "sukuna_new_502_t15m06_9s.mp3",   // もっと呪いを込めて — "Pour in more curse."
    "sukuna_new_526_t15m55_2s.mp3",   // 術式を使うまでもない — "No need to even use my technique."
  ],
  castCleave: [],                      // no clean 開 callout in JA → falls back to `cast` (see pickSukunaVoice)
  castFlame: [                         // Flame Arrow (Fwd+Special)
    "sukuna_new_406_t12m01_3s.mp3",   // 焼き尽くす — "Burn it all."
    "sukuna_new_407_t12m03_0s.mp3",   // 火力勝負といこう — "A battle of firepower."
  ],
  castDomain: [                        // ★ Ultimate — Malevolent Shrine (canonical two-beat incantation)
    "sukuna_new_560_t17m09_9s.mp3",   // 領域展開 (Ryoiki Tenkai — "Domain Expansion")
    "sukuna_new_561_t17m12_2s.mp3",   // 伏魔御廚子 (Fukuma Mizushi — "Malevolent Shrine")
  ],
  hitReact: [                          // Sukuna is ENTERTAINED by a good hit, not hurt
    "sukuna_new_437_t12m56_5s.mp3",   // 気持ちいいね — "That feels good."
    "sukuna_new_486_t14m40_6s.mp3",   // 良い攻撃だ — "Nice attack."
    "sukuna_new_488_t14m44_5s.mp3",   // もっとだ — "More!"
    "sukuna_new_507_t15m17_0s.mp3",   // 楽しくなってきた — "This is getting fun."
    "sukuna_new_515_t15m32_6s.mp3",   // 面白い — "Interesting."
    "sukuna_new_522_t15m47_6s.mp3",   // いい刺激だ — "A good stimulus."
    "sukuna_new_542_t16m30_2s.mp3",   // 素晴らしい! — "Wonderful!"
    "sukuna_new_663_t20m32_3s.mp3",   // いいぞ — "Good."
  ],
  lowHealth: [
    "sukuna_new_418_t12m25_6s.mp3",   // まだまだ行くぞ — "I'm not done yet."
    "sukuna_new_469_t13m60_0s.mp3",   // まだ行くぞ — "Still going."
    "sukuna_new_472_t14m05_1s.mp3",   // 終わりじゃないぞ — "It's not over yet."
    "sukuna_new_625_t19m13_6s.mp3",   // 命を燃やすのはこれからだ — "Now I start burning my life."
  ],
  win: [
    "sukuna_new_411_t12m09_9s.mp3",   // 終わりだ — "It's over."
    "sukuna_new_416_t12m18_4s.mp3",   // 余興はここまで — "The sideshow ends here."
    "sukuna_new_467_t13m56_1s.mp3",   // 仕込みは終わりだ — "The setup is finished."
    "sukuna_new_473_t14m06_9s.mp3",   // 次はおまえだ — "You're next."
    "sukuna_new_475_t14m10_8s.mp3",   // 勝てると思ったか? — "Did you think you could win?"
    "sukuna_new_553_t16m46_4s.mp3",   // つまらん相手だったな — "A boring opponent."
    "sukuna_new_635_t19m35_7s.mp3",   // 次が最後だ — "The next is the last."
    "sukuna_new_637_t19m39_6s.mp3",   // 多少は楽しめたぞ — "I enjoyed that, somewhat."
    "sukuna_new_673_t20m57_0s.mp3",   // よくやった — "Well done."
  ],
}

// ── ENGLISH dub (present, switchable via setSukunaVoiceLang("en")) ──
const SUKUNA_EN = {
  intro: [
    "sukuna_new_008_t00m20_7s.mp3",   // "Judge this if you can."
    "sukuna_new_058_t01m38_1s.mp3",   // "Let's put you through your paces."
    "sukuna_new_073_t01m59_9s.mp3",   // "This is a good opportunity."
    "sukuna_new_126_t03m21_4s.mp3",   // "This might be some fun."
    "sukuna_new_173_t04m47_8s.mp3",   // "Are we starting now?"
    "sukuna_new_202_t05m41_5s.mp3",   // "Do you have a death wish?"
    "sukuna_new_274_t08m00_1s.mp3",   // "There's no reason to be scared."
    "sukuna_new_293_t08m41_8s.mp3",   // "This is gonna be fun."
    "sukuna_new_304_t09m01_4s.mp3",   // "Shall we play?"
  ],
  taunt: [                             // no taunt action → merges into intro beat
    "sukuna_new_002_t00m11_1s.mp3",   // "How infuriating."
    "sukuna_new_016_t00m32_3s.mp3",   // "Don't be so arrogant."
    "sukuna_new_026_t00m47_5s.mp3",   // "Don't get conceited."
    "sukuna_new_075_t02m03_1s.mp3",   // "I've grown so bored with you."
    "sukuna_new_077_t02m10_0s.mp3",   // "So dull."
    "sukuna_new_125_t03m19_6s.mp3",   // "I expected more."
    "sukuna_new_138_t03m44_1s.mp3",   // "What a disappointment."
    "sukuna_new_182_t05m04_5s.mp3",   // "Know your place."
    "sukuna_new_216_t06m10_0s.mp3",   // "You lot are putting me to sleep."
    "sukuna_new_219_t06m17_9s.mp3",   // "I'm sick of all the cannon fodder."
    "sukuna_new_231_t06m40_9s.mp3",   // "Don't forget your place, foolish puppet."
    "sukuna_new_276_t08m03_7s.mp3",   // "You couldn't be any more pathetic."
    "sukuna_new_278_t08m10_0s.mp3",   // "You're just so predictable."
    "sukuna_new_303_t08m58_9s.mp3",   // "Weaklings just bore me to pieces."
  ],
  offense: [
    "sukuna_new_015_t00m30_8s.mp3",   // "I'll bury you."
    "sukuna_new_030_t00m53_9s.mp3",   // "I'll kill you."
    "sukuna_new_035_t01m01_0s.mp3",   // "Crawl on the ground!"
    "sukuna_new_044_t01m17_5s.mp3",   // "Go to hell."
    "sukuna_new_046_t01m20_5s.mp3",   // "I'll carve you up."
    "sukuna_new_051_t01m27_7s.mp3",   // "I'll take you down."
    "sukuna_new_053_t01m30_7s.mp3",   // "I'll cut you."
    "sukuna_new_065_t01m47_3s.mp3",   // "I'll kill you all!"
    "sukuna_new_088_t02m23_1s.mp3",   // "Die here."
    "sukuna_new_091_t02m26_8s.mp3",   // "Try to resist for longer."
    "sukuna_new_092_t02m28_8s.mp3",   // "Take this!"
    "sukuna_new_094_t02m31_0s.mp3",   // "I'll give you something good."
    "sukuna_new_107_t02m50_0s.mp3",   // "Try to endure this."
    "sukuna_new_110_t02m54_8s.mp3",   // "Try to block this."
    "sukuna_new_111_t02m56_3s.mp3",   // "I'll blow you away!"
    "sukuna_new_129_t03m28_4s.mp3",   // "I'll show you the difference in our levels."
    "sukuna_new_135_t03m39_7s.mp3",   // "Here's more!"
    "sukuna_new_249_t07m12_0s.mp3",   // "I'll kill this one."
  ],
  cast: [                              // Dismantle (Back) + Cursed Slash (Down) — general cursed-technique cast
    "sukuna_new_252_t07m18_6s.mp3",   // "Time for an awakened move."
    "sukuna_new_299_t08m50_8s.mp3",   // "Time to teach you what curses really are."
  ],
  castCleave: [                        // ★ Cleave (neutral Special) — "Open." = 開 (kai)
    "sukuna_new_199_t05m36_9s.mp3",   // "Open."
    "sukuna_new_063_t01m44_8s.mp3",   // "I'll cleave through it."
  ],
  castFlame: [                         // Flame Arrow (Fwd+Special)
    "sukuna_new_066_t01m49_2s.mp3",   // "I'll burn you to nothing."
    "sukuna_new_067_t01m50_9s.mp3",   // "Let's see whose flames are hotter."
    "sukuna_new_108_t02m51_7s.mp3",   // "Going even hotter."
  ],
  castDomain: [                        // ★ Ultimate — Malevolent Shrine
    "sukuna_new_221_t06m22_3s.mp3",   // "Malevolent Shrine" (clean)
    "sukuna_new_201_t05m39_0s.mp3",   // "Malevolent Shrine" (alt take)
    "sukuna_new_220_t06m20_4s.mp3",   // "…Domain Expansion" (prob. mis-heard as "No Main Expansion")
  ],
  hitReact: [                          // Sukuna is ENTERTAINED by a good hit, not hurt
    "sukuna_new_099_t02m38_5s.mp3",   // "That feels great!"
    "sukuna_new_151_t04m08_8s.mp3",   // "Now you've annoyed me."
    "sukuna_new_152_t04m10_4s.mp3",   // "Good hit."
    "sukuna_new_153_t04m11_6s.mp3",   // "That's the spirit."
    "sukuna_new_171_t04m43_7s.mp3",   // "You're not bad at all."
    "sukuna_new_180_t04m59_8s.mp3",   // "Perhaps you are a worthy opponent."
    "sukuna_new_184_t05m08_3s.mp3",   // "Well, this is stimulating."
    "sukuna_new_186_t05m12_2s.mp3",   // "You're strong."
    "sukuna_new_204_t05m45_8s.mp3",   // "Magnificent."
    "sukuna_new_238_t06m53_7s.mp3",   // "Now you've got my attention."
    "sukuna_new_272_t07m54_7s.mp3",   // "Oh, interesting."
    "sukuna_new_316_t09m23_5s.mp3",   // "Excellent."
  ],
  lowHealth: [
    "sukuna_new_078_t02m11_3s.mp3",   // "I'm just getting started."
    "sukuna_new_119_t03m10_2s.mp3",   // "I'm not done yet."
    "sukuna_new_131_t03m32_8s.mp3",   // "I'm warmed up enough now."
    "sukuna_new_165_t04m33_4s.mp3",   // "I have nothing to fear yet."
    "sukuna_new_166_t04m35_2s.mp3",   // "Get serious."
    "sukuna_new_267_t07m44_8s.mp3",   // "I'm getting into it now."
  ],
  win: [
    "sukuna_new_071_t01m57_1s.mp3",   // "This is the end."
    "sukuna_new_076_t02m05_4s.mp3",   // "This sideshow is over."
    "sukuna_new_109_t02m53_4s.mp3",   // "It's over."
    "sukuna_new_132_t03m34_7s.mp3",   // "Now to end you."
    "sukuna_new_139_t03m46_0s.mp3",   // "Did you really think you'd win?"
    "sukuna_new_140_t03m47_9s.mp3",   // "You were out of your depth."
    "sukuna_new_229_t06m35_8s.mp3",   // "Whether you live or die is of no consequence to me."
    "sukuna_new_240_t06m57_4s.mp3",   // "You did well."
    "sukuna_new_288_t08m32_2s.mp3",   // "The next one's the last one."
    "sukuna_new_305_t09m03_2s.mp3",   // "Cut your squealing. You got off lightly."
    "sukuna_new_335_t09m53_6s.mp3",   // "It is done."
  ],
}

export const SUKUNA_VOICE = { ja: SUKUNA_JA, en: SUKUNA_EN }

let _activeLang = "ja"   // default wired language (see header)
export function setSukunaVoiceLang(lang) { if (lang === "en" || lang === "ja") _activeLang = lang; return _activeLang }
export function getSukunaVoiceLang() { return _activeLang }

export function pickSukunaVoice(pool) {
  const set = SUKUNA_VOICE[_activeLang] || {}
  // intro beat merges intro + taunt (Sukuna has no taunt action — Miwa precedent)
  let arr = pool === "intro" ? [...(set.intro || []), ...(set.taunt || [])] : set[pool]
  // a move-specific cast pool that's empty in the active language falls back to the
  // same-language general `cast` pool (keeps language consistent — e.g. JA Cleave).
  if ((!Array.isArray(arr) || arr.length === 0) && /^cast/.test(pool) && pool !== "cast") arr = set.cast
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
