// zarakiVoice.js
// ---------------------------------------------------------------------------
// Zaraki Kenpachi voice-line pools (audio-only; NO gameplay effect). Curated from the 102-clip JAPANESE
// set (zaraki_line_*) transcribed in ZARAKI_VOICE_LOG.md (faster-whisper JA + EN gloss). The rip was a
// silence-gap split; the merged clips were re-split at whisper VAD boundaries (tools/resplit_zaraki.py) —
// only line_011 held a true roar-gap and split → zaraki_line_011_a.mp3 (the Shikai power-up line). The rest
// of the "merged" clips are single continuous rapid-fire deliveries, wired whole. Garbled fragments,
// pure-roar clips, and near-duplicates were discarded. pickZarakiVoice(pool) returns ONE clip at random
// (same shape as pickMadaraVoice); callers play via sound.playSfxFile(clip, null). Single-voice-channel
// handled by sound._voiceOwner.
// ---------------------------------------------------------------------------

export const ZARAKI_VOICE = {
  // ── Pre-fight intro / round-start (self-intro + "ready to die?") ──
  intro: [
    "zaraki_line_032.mp3",   // 11番隊隊長 — 11th Squad captain
    "zaraki_line_033.mp3",   // ザラキ剣八だ — I'm Zaraki Kenpachi
    "zaraki_line_017.mp3",   // 死ぬ覚悟はできたか? — Ready to die?
    "zaraki_line_034.mp3",   // 殺し合いに来た — Came here to kill you
    "zaraki_line_036.mp3",   // 久しぶりだぜ! — Been a while!
    "zaraki_line_001.mp3",   // 話になんねーな — You're not worth talking to
  ],
  // ── Battle cry (aggressive opener / general "let's go") ──
  battleCry: [
    "zaraki_line_002.mp3",   // 殺し合いは最高だ! — Killing's the best!
    "zaraki_line_009.mp3",   // やってみるか! — Let's give it a shot!
    "zaraki_line_012.mp3",   // 楽しませろ! 始めるぜ! — Entertain me! Let's begin!
    "zaraki_line_025.mp3",   // もう一弁やろうぜ! — One more round!
    "zaraki_line_027.mp3",   // 俺、全力で来い! — Come at me full force!
    "zaraki_line_099.mp3",   // もう一回散り合うぜ — Let's clash again!
    "zaraki_line_101.mp3",   // 遠慮なく行くぜ! 面白い! — No holding back! This is fun!
  ],
  // ── Taunt / provocation (Down-hold taunt commit) ──
  taunt: [
    "zaraki_line_006.mp3",   // この程度かよ… まだまだだな — That all? Not even close
    "zaraki_line_007.mp3",   // すまんねーな — Sorry 'bout that
    "zaraki_line_010.mp3",   // 加減はなしだ! — No holding back!
    "zaraki_line_019.mp3",   // 緩めるなって言ったろ! — Told you not to let up!
    "zaraki_line_026.mp3",   // たまんねーな — Can't get enough
    "zaraki_line_057.mp3",   // 俺を楽しませてくれ、邪魔だ! — Entertain me — you're in the way!
    "zaraki_line_064.mp3",   // 弱い奴にとどめを刺すのは性に合わねえ — Finishing off the weak isn't my style
    "zaraki_line_066.mp3",   // もっとよく狙え! — Aim better!
    "zaraki_line_067.mp3",   // 俺を切れねえのが不思議か — Strange you can't cut me?
    "zaraki_line_074.mp3",   // どうした? — What's wrong?
    "zaraki_line_075.mp3",   // 悪くない — Not bad
    "zaraki_line_079.mp3",   // 所詮は暇つぶしだ — It's just a way to kill time
    "zaraki_line_080.mp3",   // (rapid taunt string)
    "zaraki_line_082.mp3",   // すまんね、戦いだったぜ — Sorry, that was a fight
    "zaraki_line_088.mp3",   // まだ始まったばかりじゃねぇか — It's only just begun
    "zaraki_line_092.mp3",   // もう一度殺しに来い! — Come kill me again!
    "zaraki_line_098.mp3",   // いいぞ! いい反応だ! — Good! Good reaction!
  ],
  // ── Offense bark (light/heavy attack shout) ──
  offense: [
    "zaraki_line_004.mp3",   // こいつは! — This guy!
    "zaraki_line_014.mp3",   // すべてつぎこむ! — I'll pour everything in!
    "zaraki_line_015.mp3",   // 切るぜ! そらよ! 最高だ! — I'll cut you! There! The best!
    "zaraki_line_016.mp3",   // 切るぜ! — I'll cut you!
    "zaraki_line_018.mp3",   // ほらー! — There!
    "zaraki_line_038.mp3",   // ぶっ飛ばす! ビビってんじゃねえ! — I'll blow you away! Don't flinch!
    "zaraki_line_054.mp3",   // こっからが楽しいとこだぜ — Here's where it gets fun
    "zaraki_line_073.mp3",   // 死も苦痛も! オラオラ! — Death and pain too! Come on!
    "zaraki_line_096.mp3",   // ぶった斬る! さぁ! — I'll cut you down! Now!
  ],
  // ── Hit reaction / pain (taking a hit) ──
  hit: [
    "zaraki_line_077.mp3",   // チッ… — Tch…
    "zaraki_line_090.mp3",   // だが! — But!
    "zaraki_line_097.mp3",   // まだ緩めるなよ! がぁ! — Don't let up! Gah!
  ],
  // ── Shikai release (transform-in / power-up) ──
  shikai: [
    "zaraki_line_008.mp3",   // 力を手に入れた! — I've got the power!
    "zaraki_line_011_a.mp3", // この身体を… 久々の感覚だ! — This body… been ages since I felt this! (re-split)
    "zaraki_line_013.mp3",   // 久しぶりだ! こんな気分は! — Been a while — this feeling!
    "zaraki_line_037.mp3",   // 刃が尖ってくる感覚 — The blade sharpening feeling
  ],
  // ── Bankai ultimate ──
  bankai: [
    "zaraki_line_086.mp3",   // 久しぶりに抑える必要はねぇな! — No need to hold back for once!
    "zaraki_line_069.mp3",   // 最高だ! こいつを使うのは気乗りしねぇが — The best! Not that I want to use this…
    "zaraki_line_045.mp3",   // 能力が上がってやがる! — Your power's rising!
  ],
  // ── Yachiru Kusajishi assist call-out ──
  yachiru: [
    "zaraki_line_040.mp3",   // 鈴の音が聞こえたか? 知らせろ! — Hear the bells? Signal it! (Yachiru's bells)
  ],
  // ── Victory / post-fight ──
  victory: [
    "zaraki_line_048.mp3",   // いい戦いだったぜ、剣八 — Good fight
    "zaraki_line_049.mp3",   // これで終わりじゃねえぞ! — This isn't over!
    "zaraki_line_050.mp3",   // ザラキのキンパチだ! これで終わりじゃねえぞ! — Zaraki Kenpachi! Not over yet!
    "zaraki_line_052.mp3",   // 戦えなくなった奴に興味はねぇ — No interest in those who can't fight
    "zaraki_line_058.mp3",   // ありがとうよ — Thanks
    "zaraki_line_059.mp3",   // いい方ならしになったぜ — Good warm-up
    "zaraki_line_060.mp3",   // (post-fight rapid delivery)
    "zaraki_line_070.mp3",   // 生きてもう一度殺しに来い! — Live and come kill me again!
    "zaraki_line_083.mp3",   // すまんね — Sorry about that
  ],
  // ── Low health (comeback / "not dead yet") ──
  lowHealth: [
    "zaraki_line_094.mp3",   // 俺はまだ死んでねえぞ! — I'm not dead yet!
    "zaraki_line_087.mp3",   // まだ始まったばかりじゃねぇか — It's only just begun
    "zaraki_line_081.mp3",   // 立てよ — Get up
  ],
  // ── KO / defeat ──
  defeat: [
    "zaraki_line_078.mp3",   // もっと楽しみたかったのに — Wanted to have more fun…
    "zaraki_line_100.mp3",   // すまんね、幕引きだぜ — Sorry — curtain call
  ],
}

export function pickZarakiVoice(pool) {
  const arr = ZARAKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
