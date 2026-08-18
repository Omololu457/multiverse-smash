// hiruzenVoice.js
// ---------------------------------------------------------------------------
// Hiruzen Sarutobi voice-line pools (audio-only; NO gameplay effect). Curated from the 54-clip JAPANESE set
// (hiruzen_line_*.mp3, silence-cut from a source compilation — UNIDENTIFIED originals), transcribed via
// tools/transcribe_hiruzen.py (faster_whisper native-JA + English gloss → hiruzen_raw_transcript.tsv).
// Assignment is CONTENT-MATCHED where the meaning maps to a trigger (★), else best-guess BY VIBE
// (tone/length/energy — ~). pickHiruzenVoice(pool) returns ONE clip at random; callers play it via
// sound.playSfxFile(clip, null). (Whisper on game audio is imperfect — glosses are indicative, not exact.)
//
// ★ line_23 was a 40.6s block that silence-detection couldn't split (background music masked the gaps). It
//   IS eight distinct lines — Hiruzen's dramatic Third-Hokage / Reaper-Death-Seal speech — so it was cut at
//   the whisper segment boundaries into hiruzen_line_23a…23h.mp3 (tools/transcribe_hiruzen.py dumped them).
//
// EXCLUDED (name a specific opponent / are canon-context-only → awkward in generic play, per the Isshiki
// convention): 23d (Danzō), 23g (Tsunade), line_27 (First Hokage / "as your father"), line_31 (a named
// student), line_51 (Orochimaru). Also skipped: line_09/24/33/44 (garbled/low-value transcriptions).
// NAMECALL: no clip is just his name → the slot is left UNMAPPED (his pre-match namecall skips him cleanly).
// ---------------------------------------------------------------------------

export const HIRUZEN_VOICE = {
  // ── INTRO / pre-match (confident veteran declarations). ★content where clear. ──
  intro: [
    "hiruzen_line_23a.mp3",          // 三代目火影の力を、侮るでないぞ！ — Don't underestimate the Third Hokage's power! ★
    "hiruzen_line_19b_0079.3s.mp3",  // 実力の差というものを教えてやろう — I'll teach you the difference in strength. ★
    "hiruzen_line_08_0028.8s.mp3",   // そう易々とはやられん、これが格の違いだ — I won't fall so easily — this is the gap in class. ★
    "hiruzen_line_22_0099.1s.mp3",   // 誰にも負けはせん — I won't lose to anyone. ★
    "hiruzen_line_14_0060.1s.mp3",   // この戦い、まだ終わらぬようじゃな！ — This battle isn't over yet! ~★
    "hiruzen_line_06_0020.1s.mp3",   // (rallying) 真の術！行くぞ！ — A true technique! Here I come! ~
    "hiruzen_line_15_0064.9s.mp3",   // なんとも妙な相手よ — What a curious opponent. ~
  ],
  // ── COMBO EFFORT (punches.png) — short strike shouts / jutsu callouts. ~vibe by length. ──
  effort: [
    "hiruzen_line_18_0072.1s.mp3",   // よし！ — Good! (0.6s) ★
    "hiruzen_line_16_0067.8s.mp3",   // (short shout, 0.5s) ★
    "hiruzen_line_30_0182.1s.mp3",   // ここじゃ！ — Here! (0.8s) ★
    "hiruzen_line_48_0265.6s.mp3",   // ここじゃ！ — Here! (1.0s) ★
    "hiruzen_line_47_0263.5s.mp3",   // 崩し！ — Break! (strike callout) ★
    "hiruzen_line_20_0094.5s.mp3",   // 全てを！ — All of it! ~
    "hiruzen_line_34_0195.9s.mp3",   // 今じゃ！ — Now! ~
    "hiruzen_line_36_0210.4s.mp3",   // 全てを！ — All of it! ~
    "hiruzen_line_26_0157.2s.mp3",   // 次も！ — And again! ~
    "hiruzen_line_05_0017.7s.mp3",   // 幻現分身手裏剣！ — (clone-shuriken jutsu callout) ~
    "hiruzen_line_04_0011.2s.mp3",   // (rapid jutsu callout string) ~
    "hiruzen_line_12_0054.0s.mp3",   // お前は… — You…! ~
  ],
  // ── SPIN — evasive dodge cast. ~vibe: quick repositioning line. ──
  spin: [
    "hiruzen_line_17_0069.1s.mp3",   // これで道は開けたぞ！ — Now the path is open! ★ (repositioning)
    "hiruzen_line_43_0246.7s.mp3",   // そこまで動けるとはな — So you can move that well. ~
    "hiruzen_line_45_0257.4s.mp3",   // 全てはな… — All of it… ~
    "hiruzen_line_40_0238.2s.mp3",   // 全ては… — Everything is… ~
  ],
  // ── FIRE RELEASE: GREAT FIREBALL cast. ★content (line mentions fire) + attack callouts. ──
  fireball: [
    "hiruzen_line_19a_0073.6s.mp3",  // 勝負だ！ここで燃える炎よ！ — Let's settle this! Flames, burn here! ★ (fire)
    "hiruzen_line_01_0000.0s.mp3",   // 喰らえ！ — Take this! ~ (attack callout)
    "hiruzen_line_02_0004.6s.mp3",   // これで終わりだ、行くぞ！ — This ends it, here I go! ~
    "hiruzen_line_13_0055.8s.mp3",   // これで終わりじゃ！ — This is the end! ~
  ],
  // ── EARTH RELEASE: WALL cast. ~vibe: grounded / defensive declarations. ──
  earthWall: [
    "hiruzen_line_39_0233.7s.mp3",   // 武器で遊ぶのは容易ではないぞ — Toying with a weapon won't come easy. ~
    "hiruzen_line_42_0243.5s.mp3",   // 児戯に等しい、だが… — Child's play — but… ~
    "hiruzen_line_07_0025.1s.mp3",   // あとは任せたぞ — I'll leave the rest to it. ~
    "hiruzen_line_49_0267.1s.mp3",   // あの者を退けるぞ！ — I'll drive that one back! ~
  ],
  // ── ENMA (Monkey King Staff) transform — his SIGNATURE; LONGER/dramatic prioritized (task). ★identity. ──
  enma: [
    "hiruzen_line_10_0041.1s.mp3",   // この刃でお前を守る…俺を倒せると思うか？ — I'll guard with this blade… think you can beat me? ★ (blade, 8.2s)
    "hiruzen_line_23b.mp3",          // 三代目として、その力を十分に発揮しようぞ！ — As the Third Hokage, I'll wield this power fully! ★ (signature)
    "hiruzen_line_25_0149.6s.mp3",   // 己を信じる者を守る、その強き意志！ — Protecting those who believe — that strong will! ★
    "hiruzen_line_29_0173.6s.mp3",   // 風向きが変わるぞ！ — The tide is turning! ~ (dramatic, 8s)
    "hiruzen_line_21_0095.9s.mp3",   // 木ノ葉の民のために — For the people of the Leaf. ~ (Will of Fire)
    "hiruzen_line_23c.mp3",          // 実力の差というものを教えてやろう！ — I'll teach you the true difference in strength! ★
  ],
  // ── ULTIMATE: Reaper Death Seal — the MOST dramatic/longest (task: check line_23 & 19a/b/c). ★★★ ──
  ultimate: [
    "hiruzen_line_23f.mp3",          // 闇に染まったお前には、相応の処罰を下す！ — You who are steeped in darkness — I sentence you to fitting punishment! ★★★ (Reaper)
    "hiruzen_line_35_0197.4s.mp3",   // その意志を継ぐ…幾千もの想いへと繋がる未来を！ — Inheriting that will… a future joined to thousands of hearts! ★★ (longest, 12.6s)
    "hiruzen_line_23h.mp3",          // 先代に託された、火影の名！ — The name of Hokage, entrusted to the next! ★★ (his sacrifice/legacy)
    "hiruzen_line_19c_0086.0s.mp3",  // 俺を倒せると思うか？…過去も未来もな！ — Think you can defeat me? …past and future both! ★ (7.9s)
    "hiruzen_line_37_0211.8s.mp3",   // 木ノ葉のために…邪魔はさせん！ — For the Leaf's sake… I won't let you interfere! ★ (9.6s)
    "hiruzen_line_38_0222.2s.mp3",   // (long dramatic declaration, 10.7s) ~
    "hiruzen_line_52_0277.6s.mp3",   // その叫びで目を覚ませ！先のために！ — Wake up with that cry! For the future's sake! ★ (sacrifice/legacy)
  ],
  // ── HIT REACTION (light) — short pained/irritated grunts. ~vibe by length/tone. ──
  hitLight: [
    "hiruzen_line_03_0008.6s.mp3",   // 知ったことか！ — I don't care! ~
    "hiruzen_line_41_0240.3s.mp3",   // 終わりまで分からんぞ — You never know till the end. ~
    "hiruzen_line_11_0049.7s.mp3",   // 愚か者が — Fool. ~
    "hiruzen_line_50_0271.1s.mp3",   // おのれ！ — Curse you! ★
    "hiruzen_line_12_0054.0s.mp3",   // お前は…！ — You…! ~
  ],
  // ── HIT REACTION (heavy) — stronger pained/defiant. ~vibe. ──
  hitHeavy: [
    "hiruzen_line_50_0271.1s.mp3",   // おのれ！ — Curse you! ★
    "hiruzen_line_46_0259.5s.mp3",   // 守ってみせる、愚か者め！ — I'll protect them, you fool! ~
    "hiruzen_line_03_0008.6s.mp3",   // 知ったことか！ — I don't care! ~
    "hiruzen_line_11_0049.7s.mp3",   // 愚か者が — Fool. ~
    "hiruzen_line_32_0188.7s.mp3",   // おのれ！ — Damn you! (0.8s defiant) ~
  ],
  // ── KNOCKDOWN — short grunt on being downed. ~vibe. ──
  knockdown: [
    "hiruzen_line_16_0067.8s.mp3",   // (short shout, 0.5s) ★
    "hiruzen_line_12_0054.0s.mp3",   // お前は…！ — You…! ~
    "hiruzen_line_50_0271.1s.mp3",   // おのれ！ — Curse you! ~
    "hiruzen_line_20_0094.5s.mp3",   // 全てを！ — All of it! ~
  ],
  // ── WIN (victory; veteran superiority / teaching tone). ★content. ──
  win: [
    "hiruzen_line_28_0167.1s.mp3",   // まだ教えられることがあるようじゃな — Seems there's still something I can teach you. ★★
    "hiruzen_line_08_0028.8s.mp3",   // これが格の違いだ — This is the gap in class. ★
    "hiruzen_line_23c.mp3",          // 実力の差というものを教えてやろう！ — I taught you the difference in strength. ★
    "hiruzen_line_23e.mp3",          // いかに年をとろうと、お前にはまだ負けぬ！ — No matter how old, I won't lose to you yet! ★ (opening name garbled)
    "hiruzen_line_15_0064.9s.mp3",   // なんとも妙な相手よ — What a curious opponent. ~
    "hiruzen_line_42_0243.5s.mp3",   // 児戯に等しい — Child's play. ~
  ],
}

export function pickHiruzenVoice(pool) {
  const arr = HIRUZEN_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
