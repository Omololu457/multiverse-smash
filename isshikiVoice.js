// isshikiVoice.js
// ---------------------------------------------------------------------------
// Isshiki Otsutsuki voice-line pools (audio-only; NO gameplay effect). Curated from the 34-clip JAPANESE
// set (isshiki_line_*.mp3, silence-cut from a Boruto source compilation), transcribed via
// tools/transcribe_isshiki.py (faster_whisper native-JA + English gloss → isshiki_raw_transcript.tsv).
// Assignment is CONTENT-MATCHED where the line's meaning maps to a trigger (marked ★), else best-guess
// BY VIBE (tone/length/energy — marked ~). pickIsshikiVoice(pool) returns ONE clip at random (same shape
// as pickIchigoVoice/pickMadaraVoice); callers play via sound.playSfxFile(clip, null).
//
// Isshiki has NO taunt action → the taunt-vibe lines fold into `intro` (fires on the intro beat only,
// like Ichigo/Pain/Obito). NO clip is Isshiki saying his OWN name → the namecall slot is left UNMAPPED
// (his pre-match namecall sequence skips him cleanly). THREE clips name a SPECIFIC opponent (Naruto /
// Uchiha Sasuke / Kawaki) → EXCLUDED (awkward in generic play): line_15, line_16, line_17.
// ---------------------------------------------------------------------------

export const ISSHIKI_VOICE = {
  // ── INTRO / pre-fight (menacing declarations; taunt-vibe folded in — no taunt action). ★content ──
  intro: [
    "isshiki_line_01_000.0s.mp3",   // 実に愚かな選択をしたものだ — What a foolish choice you've made.
    "isshiki_line_02_004.0s.mp3",   // わざわざ恥をかきに来るとは — Coming all this way to embarrass yourself.
    "isshiki_line_03_007.4s.mp3",   // 今更逃げられるわけがないだろう — There's no escaping now.
    "isshiki_line_07_021.9s.mp3",   // 無駄な努力という言葉を知っているか? — Do you know the words 'futile effort'?
    "isshiki_line_08_026.3s.mp3",   // 自ら寿命を縮めにくるか — Come to shorten your own lifespan?
    "isshiki_line_09_029.9s.mp3",   // へっへっへ おてなみ拝見といこう — Heheh… let's see what you can do.
    "isshiki_line_13_041.9s.mp3",   // なぜ自ら死地に踏み込む — Why step into your own death?
    "isshiki_line_19_060.4s.mp3",   // お前に俺は倒せん — You cannot defeat me.
  ],
  // ── Sukunahikona (neutral, shrink-WARP strike) — ★content: "Begone/disappear". ──
  sukunahikona: [
    "isshiki_line_21_066.9s.mp3",   // 消えうせろ — Begone! (★ shrink-warp / erase)
    "isshiki_line_10_033.8s.mp3",   // なんだろうと関係ないな — It makes no difference. ~
  ],
  // ── Daikokuten rods (Fwd projectile) — ~vibe: aggressive strike. ──
  rods: [
    "isshiki_line_20_063.5s.mp3",   // 挑んだ罰だ — This is your punishment for challenging me. ~
    "isshiki_line_26_079.6s.mp3",   // 戦律しろ! — (aggressive shout) ~
  ],
  // ── Daikokuten cubes (Down, shrink-TRAP) — ★content: "want to see hell" (trapping). ──
  cubes: [
    "isshiki_line_11_036.9s.mp3",   // どうやら地獄を見たいようだな — Seems you want to see hell. (★ trap)
    "isshiki_line_20_063.5s.mp3",   // 挑んだ罰だ — This is your punishment. ~
  ],
  // ── Senpo: Gokashin Ensen (Up, hell-fire wave) — ~vibe: destructive. ──
  fire: [
    "isshiki_line_26_079.6s.mp3",   // 戦律しろ! — (aggressive shout) ~
    "isshiki_line_28_082.0s.mp3",   // お前はこれで終わる — This ends you. ~
  ],
  // ── Finisher 1 (Back, rod barrage) — ~vibe: finishing declaration. ──
  finisher1: [
    "isshiki_line_28_082.0s.mp3",   // お前はこれで終わる — This ends you. ~
    "isshiki_line_20_063.5s.mp3",   // 挑んだ罰だ — This is your punishment. ~
  ],
  // ── Finisher 2 (airborne, dash-slash) — ~vibe: quick shout. ──
  finisher2: [
    "isshiki_line_23_071.7s.mp3",   // (short shout) ~
    "isshiki_line_26_079.6s.mp3",   // 戦律しろ! — (aggressive shout) ~
    "isshiki_line_10_033.8s.mp3",   // なんだろうと関係ないな — It makes no difference. ~
  ],
  // ── ULTIMATE (Daikokuten Barrage) — LONGER/dramatic prioritized (task): the marquee finishing lines. ──
  ultimate: [
    "isshiki_line_05_013.8s.mp3",   // いかにあらがおうと結果は変わらんぞ — No matter how you resist, the result won't change. (★ long/dramatic)
    "isshiki_line_25_076.2s.mp3",   // すべて無駄だったというわけだ — It was all in vain.
    "isshiki_line_28_082.0s.mp3",   // お前はこれで終わる — This ends you.
    "isshiki_line_20_063.5s.mp3",   // 挑んだ罰だ — This is your punishment.
  ],
  // ── HIT REACTION (light) — weak hits: short dismissive/surprised grunts. ~vibe by length/tone. ──
  hitLight: [
    "isshiki_line_27_081.4s.mp3",   // ん! — Hmp! (0.3s grunt)
    "isshiki_line_12_040.3s.mp3",   // わからんな — I don't understand.
    "isshiki_line_06_018.0s.mp3",   // おお、なかなかの… — Oh, not bad…
    "isshiki_line_30_088.4s.mp3",   // ゴミが — Trash.
  ],
  // ── HIT REACTION (heavy) — strong hits: arrogant irritation. ~vibe. ──
  hitHeavy: [
    "isshiki_line_04_010.9s.mp3",   // 格の違いもわからんか — Can't you tell the difference in class?
    "isshiki_line_18_058.4s.mp3",   // 知らなかったか — Didn't you know?
    "isshiki_line_10_033.8s.mp3",   // なんだろうと関係ないな — It makes no difference.
  ],
  // ── KNOCKDOWN — short grunt / dismissive on being downed. ~vibe. ──
  knockdown: [
    "isshiki_line_27_081.4s.mp3",   // ん! — Hmp!
    "isshiki_line_30_088.4s.mp3",   // ゴミが — Trash.
    "isshiki_line_12_040.3s.mp3",   // わからんな — I don't understand.
  ],
  // ── WIN (victory; mocking, superior). ★content, rich pool. ──
  win: [
    "isshiki_line_14_045.1s.mp3",   // ご苦労だったな — Good effort. (mocking)
    "isshiki_line_22_069.0s.mp3",   // チャクラの無駄遣いだったな — What a waste of chakra.
    "isshiki_line_24_074.1s.mp3",   // そろそろお開きだ — Time to wrap this up.
    "isshiki_line_29_084.2s.mp3",   // 当然の結果にして これが現実だ — The natural result — this is reality.
    "isshiki_line_31_089.5s.mp3",   // 俺に勝てると思ったが — You thought you could beat me?
    "isshiki_line_32_092.2s.mp3",   // 悲しいかな それがお前の実力だ — Sad, but that is the extent of your strength.
    "isshiki_line_33_096.6s.mp3",   // 俺に勝てる見込みなどなかったのだ 最初からな — You never stood a chance — from the very start.
    "isshiki_line_34_101.2s.mp3",   // お前ごときに相手してやったことを ありがたく思え — Be grateful I even dealt with you.
  ],
}

export function pickIsshikiVoice(pool) {
  const arr = ISSHIKI_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
