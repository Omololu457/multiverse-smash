// tobiVoice.js
// ---------------------------------------------------------------------------
// Tobi (masked Obito alias) voice-line pools (audio-only; NO gameplay effect).
// 14 clips, Japanese (Naruto Storm Connections source, tobi_voice_* — exact
// on-disk filenames preserved). The goofy "Tobi" persona (playful, senpai-
// obsessed, lazy comic-relief masked man), so the lines are banter, not the
// stern jutsu callouts of Obito's own pack — kept SEPARATE from obitoVoice.js.
//
// pickTobiVoice(pool) returns ONE clip at random (genuine Math.random(), same
// shared-helper shape as pickObitoVoice / pickMadaraVoice). Callers play via
// sound.playSfxFile(clip, null); the single-voice-channel (no self-overlap) is
// handled by sound._voiceOwner.
//
// ── POOLS (kept intentionally simple — 3 pools for a 14-clip batch) ──
//   intro       → game.js INTRO_VOICE (round-1 match intro / battle start). Random {001,004}.
//   specialCast → abilities.js executeTobiSpecial (ANY special connects the cast) + executeTobiUltimate.
//                 Random {000,007,009}. Sets _atkVoiceCd so the connect doesn't ALSO combat-bark.
//   combatBark  → combat.js applyTobiOffenseVoice (attacker lands a HEAVY / long-string connect). The
//                 general taunt/bark pool. Random {002,003,005,006,008,011,012,013}.
//
// ── FILTER (14 → 13 wired, 1 discarded) ──
//   • 010 "イタチさんに後で謝らなきゃ" (I'll have to apologize to Itachi-san later) — DISCARDED: names a
//     specific other character (Itachi) directly, per the brief's filter rule.
//   • 000 "…の術!" is a garbled jutsu callout (whisper couldn't cleanly resolve the technique name) but is
//     unmistakably a "〜の術" technique shout → kept as a specialCast line (flagged as uncertain text).
//   • No non-speech SFX and no near-duplicates in the batch (all 14 are distinct clean JA speech).
//   • combatBark mixes confident banter and a couple of reactive/getting-bullied lines (003/012); per the
//     "keep it simple" directive they pool into ONE general bark rather than a separate hit-react pool.
//   • The batch ships no clear win / low-health / dedicated-ult line → those beats stay unvoiced (not
//     fabricated). The ULTIMATE borrows the specialCast pool (it IS a technique cast).
// ---------------------------------------------------------------------------

export const TOBI_VOICE = {
  // ── INTRO — pre-match / battle start (goofy pre-fight banter) ──
  intro: [
    "tobi_voice_001_t00m02_5s.mp3",   // セッティングオッケー！よいしょ！ — "Setting, OK! Heave-ho!"
    "tobi_voice_004_t00m29_7s.mp3",   // 無駄な争いはやめましょうよ — "Let's stop this pointless fighting~"
  ],

  // ── SPECIAL-CAST — announcing / performing a technique (fires on a special or the ult) ──
  specialCast: [
    "tobi_voice_000_t00m00_0s.mp3",   // 〜の術！ — a jutsu callout (garbled technique name; clearly a "…Jutsu!" shout)
    "tobi_voice_007_t00m38_7s.mp3",   // 俺の術、特別披露しちゃいますよ！ — "I'll give you a special showing of my jutsu!"
    "tobi_voice_009_t00m45_7s.mp3",   // はあああああ — an exertion shout (technique effort)
  ],

  // ── COMBAT BARK — general taunt / bark on landing a hit ──
  combatBark: [
    "tobi_voice_002_t00m13_0s.mp3",   // 今度からこういうのは先輩にやってもらおう！ — "From now on I'll leave this to senpai!"
    "tobi_voice_003_t00m26_2s.mp3",   // どうせ俺をいじめる気でしょ？ひどいなぁ！ — "You're gonna bully me, right? So mean!"
    "tobi_voice_005_t00m32_4s.mp3",   // やるときはやるっすよ！俺！ — "I do it when it counts! Me!"
    "tobi_voice_006_t00m34_5s.mp3",   // さすが俺の術！かっこいい！ — "As expected of my jutsu! So cool!"
    "tobi_voice_008_t00m41_6s.mp3",   // はぁ、超面倒くさい。さっさと終わらせちゃお！ — "Ugh, such a pain. Let's finish this quick!"
    "tobi_voice_011_t00m49_6s.mp3",   // 先輩！ — "Senpai!"
    "tobi_voice_012_t00m50_5s.mp3",   // この人動きが早すぎっすよ！僕らじゃ叶いませんって — "This guy's too fast! We can't keep up!"
    "tobi_voice_013_t00m55_7s.mp3",   // またやる気なんすか？ — "You wanna go again?"
  ],
}

export function pickTobiVoice(pool) {
  const arr = TOBI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
