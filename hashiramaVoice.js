// hashiramaVoice.js
// ---------------------------------------------------------------------------
// Hashirama Senju voice-line pools (audio-only; NO gameplay effect). Curated from the 106-clip
// JAPANESE set (hashirama_voice_*, Storm Connections rip) transcribed in HASHIRAMA_VOICE_LOG.md
// (native-JA pass + English gloss). Named-character lines (Madara/Kyūbi/Sarutobi + the friend/
// Nine-Tails-battle relational lines), non-speech grunts/roars, and near-duplicates were discarded.
// pickHashiramaVoice(pool) returns ONE clip at random (same shape as pickMadaraVoice/pickMiwaVoice);
// callers play via sound.playSfxFile(clip, null). Single-voice-channel handled by sound._voiceOwner.
//
// Per-technique cast pools are matched individually to his BUILT Mokuton kit (the callouts are
// technique-name-heavy):
//   mokutonArm 木遁! · treeSummon 樹海降誕 Jukai Kōtan · woodGolem 真数千手 Shinsu Senju / 木人の術 ·
//   gates 動きを止める (immobilize) · woodPunch (charged melee) · kunai (zoning barks) ·
//   woodClone ともに攻めるぞ (summon-ally) · sealingJutsu 火の意志 Will of Fire (the Domain ult).
// See HASHIRAMA_VOICE_LOG.md for the full 106-line disposition (52 wired / 39 discarded / 15 avail).
// ---------------------------------------------------------------------------

export const HASHIRAMA_VOICE = {
  // ── Kunai Throw (neutral/air Special) — short zoning barks (no dedicated kunai callout) ──
  kunai: [
    "hashirama_voice_043_t02m03_7s.mp3",   // 043 お前は後! — You're next!
    "hashirama_voice_079_t04m58_2s.mp3",   // 079 させぬ! — I won't let you!
    "hashirama_voice_097_t05m24_4s.mp3",   // 097 先鋒! — Senpō! (first strike)
  ],
  // ── Mokuton Arm eruption (Fwd+Special) — the bare Wood-Release shout ──
  mokutonArm: [
    "hashirama_voice_005_t00m16_6s.mp3",   // 005 木遁! — Mokuton!
    "hashirama_voice_087_t05m12_6s.mp3",   // 087 木遁! — Mokuton!
    "hashirama_voice_098_t05m25_6s.mp3",   // 098 木遁! — Mokuton!
  ],
  // ── Tree Summon 4-tier ladder (Down+Special) — 樹海降誕 Jukai Kōtan (Nativity of a World of Trees) ──
  treeSummon: [
    "hashirama_voice_000_t00m00_0s.mp3",   // 000 木遁秘術・樹海降誕 — Mokuton Hijutsu: Jukai Kōtan
    "hashirama_voice_084_t05m06_2s.mp3",   // 084 木遁秘術 — Mokuton Hijutsu
    "hashirama_voice_085_t05m08_1s.mp3",   // 085 樹海、降誕! — Jukai, Kōtan!
  ],
  // ── Wood Golem (Up+Special) — 真数千手 Shinsu Senju / 木人の術 Mokujin no Jutsu (the giant statue) ──
  woodGolem: [
    "hashirama_voice_006_t00m18_4s.mp3",   // 006 真数千手 — Shinsu Senju
    "hashirama_voice_009_t00m34_0s.mp3",   // 009 行くぞ! 真数千手! — Here we go! Shinsu Senju!
    "hashirama_voice_090_t05m16_1s.mp3",   // 090 木人の術 — Mokujin no Jutsu (Wood Golem)
    "hashirama_voice_099_t05m26_6s.mp3",   // 099 真数千手 — Shinsu Senju
  ],
  // ── Gracious Deity Gates (Back+Special) — the immobilize / "stop the movement" pin ──
  gates: [
    "hashirama_voice_066_t04m22_7s.mp3",   // 066 これで少しはおとなしくなろう — This'll quiet you down
    "hashirama_voice_070_t04m30_2s.mp3",   // 070 決着をつけるしかない — No choice but to settle it
    "hashirama_voice_086_t05m10_1s.mp3",   // 086 やはり動きを止めるが先決か — Best to stop the movement first
  ],
  // ── Wood Release Punch (CHARGE tap/hold) — committed melee barks ──
  woodPunch: [
    "hashirama_voice_044_t02m04_7s.mp3",   // 044 全力で生かせてもらうぞ — I'll fight with all my might!
    "hashirama_voice_080_t04m59_2s.mp3",   // 080 よっし! — Alright!
    "hashirama_voice_094_t05m21_4s.mp3",   // 094 勝負! — Shōbu! (face me!)
  ],
  // ── Wood Clone spawn ("," key) — summon-an-ally flavor ──
  woodClone: [
    "hashirama_voice_001_t00m03_5s.mp3",   // 001 ともに攻めるぞ! — Let's attack together!
    "hashirama_voice_010_t00m37_7s.mp3",   // 010 出番ぞ! — Your turn!
  ],
  // ── Sealing Jutsu ULTIMATE (Domain) — the grand seal / Will-of-Fire declaration ──
  sealingJutsu: [
    "hashirama_voice_038_t01m54_6s.mp3",   // 038 かつもくせよ! — Behold! (Katsumoku seyo)
    "hashirama_voice_046_t02m13_1s.mp3",   // 046 我がホムラの印 — My seal of fire
    "hashirama_voice_054_t03m24_7s.mp3",   // 054 …それが俺の覚悟だ! — …that is my resolve!
    "hashirama_voice_055_t03m54_2s.mp3",   // 055 我らが火の意志、存分に発揮しよう! — Our Will of Fire — let it show!
  ],
  // ── INTRO / self-declaration (fires on the intro beat; merges with taunt) ──
  intro: [
    "hashirama_voice_002_t00m06_2s.mp3",   // 002 歴代火影の力を思い知れ — Know the power of the Hokage line!
    "hashirama_voice_019_t01m07_8s.mp3",   // 019 初代火影 — First Hokage
    "hashirama_voice_020_t01m09_4s.mp3",   // 020 千手柱間 — Senju Hashirama
    "hashirama_voice_034_t01m42_5s.mp3",   // 034 平和を実現する — I will realize peace
    "hashirama_voice_042_t02m02_2s.mp3",   // 042 俺は信じる — I believe
    "hashirama_voice_052_t02m23_7s.mp3",   // 052 我が名は千手柱間 — My name is Senju Hashirama
  ],
  // ── TAUNT (dismissive; merges into the intro beat) ──
  taunt: [
    "hashirama_voice_021_t01m11_3s.mp3",   // 021 あれごときでは倒れぬ — I won't fall to that
    "hashirama_voice_024_t01m16_7s.mp3",   // 024 俺はまだまだ動けるのだが — I can still move plenty
    "hashirama_voice_025_t01m18_8s.mp3",   // 025 俺に挑むにはまだ力が足らぬ — You lack the strength to challenge me
  ],
  // ── COMBAT BARK (heavy / long-string connect) ──
  combatBark: [
    "hashirama_voice_031_t01m34_0s.mp3",   // 031 だからお前は負けたのだ — That is why you lost
    "hashirama_voice_059_t04m11_1s.mp3",   // 059 火影を甘く見るなよ! — Don't underestimate the Hokage!
    "hashirama_voice_060_t04m15_2s.mp3",   // 060 お前とて許さぬ! — Not even you will I forgive!
    "hashirama_voice_078_t04m54_8s.mp3",   // 078 無敵ではない! — You're not invincible!
  ],
  // ── HIT-REACTION (taking a hit) ──
  hitReact: [
    "hashirama_voice_022_t01m13_2s.mp3",   // 022 ん? — Hmm?
    "hashirama_voice_067_t04m25_2s.mp3",   // 067 かっ — Kah!
    "hashirama_voice_068_t04m26_4s.mp3",   // 068 やはり効かぬか — So it won't work…
    "hashirama_voice_069_t04m27_7s.mp3",   // 069 くっ、なんという力だ! — Ngh — what power!
    "hashirama_voice_081_t05m02_0s.mp3",   // 081 止めたぞ! くっ! — I stopped it! Ngh!
  ],
  // ── LOW-HEALTH (once, crossing the line) ──
  lowHealth: [
    "hashirama_voice_045_t02m08_9s.mp3",   // 045 だがこれで最後ぞ 今こそ見せよう — But this is the last — now I'll show you!
    "hashirama_voice_058_t04m09_8s.mp3",   // 058 まだ戦える! — I can still fight!
    "hashirama_voice_075_t04m45_9s.mp3",   // 075 迷いは捨てろ、柱間! — Cast off your doubt, Hashirama!
  ],
  // ── WIN (victory) ──
  win: [
    "hashirama_voice_016_t00m55_0s.mp3",   // 016 ここで負けているようでは火影は務まらん — Losing here, you can't be Hokage
    "hashirama_voice_017_t00m59_9s.mp3",   // 017 腕を磨いて出直してこい — Hone your skills and come back
    "hashirama_voice_018_t01m03_4s.mp3",   // 018 良い手合わせであったぞ — That was a fine match!
    "hashirama_voice_027_t01m23_0s.mp3",   // 027 もう一度やりあおうぞ — Let's do this again!
    "hashirama_voice_032_t01m36_0s.mp3",   // 032 貴様のその気概、見事 — Your spirit — splendid
    "hashirama_voice_103_t05m37_6s.mp3",   // 103 お前の心はまだ死んではおらぬ — Your heart is not yet dead
  ],
}

export function pickHashiramaVoice(pool) {
  const arr = HASHIRAMA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
