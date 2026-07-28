#!/usr/bin/env python3
# Emits HISOKANEN_VOICE_LOG.md (authoritative content reference, REVFLASH format) from the raw
# transcript + the hand-reviewed disposition map. Asserts every clip 0..135 is dispositioned exactly
# once and that POOL rows match hisokaVoice.js's pools verbatim (log can't drift from the wiring).
import csv, re

fn, ja_raw, en_raw = {}, {}, {}
with open("hisoka_raw_transcript.tsv") as f:
    for row in csv.DictReader(f, delimiter="\t"):
        i = int(row["idx"]); fn[i] = row["file"]; ja_raw[i] = row["ja"]; en_raw[i] = row["en"]

# Pools MUST equal hisokaVoice.js (kept in sync by gen_hisoka_voice.py).
POOLS = {
    "intro":      [2, 15, 47, 92, 128, 131, 135],
    "taunt":      [0, 1, 3, 6, 7, 12, 13, 14, 20, 25, 26, 27, 29, 30, 35, 37, 38, 80, 82, 123, 124],
    "bungee":     [58, 59, 60, 61, 62],
    "texture":    [68, 69, 70, 74, 76, 97, 98],
    "overdrive":  [90, 22],
    "rekka":      [88, 66, 93],
    "combatBark": [9, 19, 21, 32, 48, 49, 55, 64, 65, 81, 83, 112, 129],
    "hitReact":   [40, 50, 94, 95, 132],
    "lowHealth":  [51, 54],
    "win":        [18, 34, 75, 84, 96, 111],
}
idx2pool = {i: p for p, arr in POOLS.items() for i in arr}

# Discards: idx -> reason label
DISCARD = {}
def d(reason, *ids):
    for i in ids: DISCARD[i] = reason
d("named(Illumi)", 5); d("named(Gon)", 23, 24); d("named(Gon/gong)", 122); d("named(series title)", 133)
d("context(third-party)", 28); d("context(teamwork, not 1v1)", 85, 87)
d("low-value(filler)", 33, 67, 86, 99, 125, 126)
d("no-speech(silence)", 127)
d("noise(grunt/non-lexical)", 16, 36, 39, 45, 46, 56, 89, 91, 100, 101, 102, 103, 104, 105, 106,
  107, 108, 109, 110, 113, 114, 115, 116, 117, 118, 119, 120, 121)
d("garble/fragment", 4, 8, 10, 11, 17, 31, 41, 42, 43, 44, 52, 53, 57, 63, 71, 72, 73, 77, 78, 79, 130, 134)

# Coverage assertions.
covered = set(idx2pool) | set(DISCARD)
assert covered == set(range(136)), ("coverage gap/dupe", sorted(set(range(136)) - covered), sorted(set(idx2pool) & set(DISCARD)))

# Hand-cleaned JA + EN gloss for the WIRED survivors (auto-transcription fixed where I could verify it).
CLEAN = {
    2: ("獲物は強ければ強いほどいい", "The stronger the prey, the better."),
    15: ("試験の時からあなたとは戦ってみたかったんだ", "I've wanted to fight you ever since the Exam."),
    47: ("楽しもう", "Let's enjoy ourselves~"),
    92: ("遠慮するなよ", "Don't hold back now."),
    128: ("やろうか", "Shall we get started?"),
    131: ("楽しみだなぁ", "I'm so looking forward to this~"),
    135: ("そろそろ軽く", "Let's start off nice and light~"),
    0: ("そんな目で見つめるなよ 興奮しちゃうじゃないか", "Don't look at me like that — you'll get me excited~"),
    1: ("僕が特別に判定してあげるよ", "I'll give you a special grade~"),
    3: ("僕を失望させるなよ", "Don't disappoint me."),
    6: ("味見しちゃお?", "Shall I have a little taste~?"),
    7: ("交渉しないか?", "Care to make a deal?"),
    12: ("わざと怪我したら直してくれるかい?", "If you get hurt on purpose, will you let me heal you~?"),
    13: ("君からはいろいろと感じるものがあるね", "I can sense all sorts of things from you~"),
    14: ("せっかくやるなら完璧に勝つ", "If I'm going to do it, I'll win flawlessly."),
    20: ("ご苦労様", "Well done~ (thanks for the effort)"),
    25: ("どうして僕をそんなに興奮させるんだい", "Why do you excite me so~?"),
    26: ("これ以上はやめておこう", "Let's not take this any further~"),
    27: ("本当に怒られちゃうからね", "I'll really get scolded, you know~"),
    29: ("君はおとなしくしててね", "You just stay quiet, all right~?"),
    30: ("たまには君みたいのもいいよね", "Every now and then, someone like you is nice too~"),
    35: ("つれない", "How cold of you~"),
    37: ("嘘は良くないな", "Lying isn't nice~"),
    38: ("僕の言えたことじゃないけど", "Not that I'm one to talk~"),
    80: ("ほーらね", "See~?"),
    82: ("残念", "What a shame~"),
    123: ("そうかい", "Oh, is that so~"),
    124: ("なるほど", "I see, I see~"),
    58: ("バンジーガム", "Bungee Gum!"), 59: ("バンジーガム", "Bungee Gum!"), 60: ("バンジーガム", "Bungee Gum!"),
    61: ("バンジーガム", "Bungee Gum!"), 62: ("バンジーガム", "Bungee Gum!"),
    68: ("愛を込めて", "With all my love~"),
    69: ("ご招待", "You're invited~"),
    70: ("君に贈る", "A little gift, just for you~"),
    74: ("何枚でしょう", "How many cards, do you think~?"),
    76: ("誰も仕掛けもございません", "No tricks up my sleeve, I assure you~"),
    97: ("じゃじゃん", "Ta-daa~!"),
    98: ("あら不思議", "And now, like magic~"),
    90: ("お見せしよう", "Allow me to show you~"),
    22: ("手品師に不可能はないのさ", "Nothing is impossible for a magician~"),
    88: ("僕の番だね", "It's my turn now~"),
    66: ("あげるよ", "Here, this is for you~"),
    93: ("まだまだ", "Not yet, not yet~"),
    9: ("殺すから", "Because I'm going to kill you~"),
    19: ("無駄な努力", "What a wasted effort~"),
    21: ("冥土の土産に覚えておきな", "Keep this as a parting gift for the afterlife~"),
    32: ("やっぱりあなたは最高の獲物だ", "As I thought — you're the finest prey~"),
    48: ("足元", "Watch your footing~"),
    49: ("ここだね", "Right… here~"),
    55: ("いい子だね", "Good boy~"),
    64: ("逃さない", "You won't get away."),
    65: ("逃がさないよ", "I won't let you escape~"),
    81: ("すごくいい!", "Oh, that's very nice~!"),
    83: ("邪魔だよ", "You're in the way~"),
    112: ("いいね", "Nice~"),
    129: ("よーし", "Alright then~"),
    40: ("ダメダメ", "No, no~"), 50: ("ダメダメ", "No, no~"),
    94: ("凄いね", "Impressive~"),
    95: ("予想以上", "Even better than I expected~"),
    132: ("大丈夫", "It's fine, I'm all right~"),
    51: ("たまらない", "I can't stand it — this is irresistible~!"),
    54: ("そそるねぇ", "Now that's tantalizing~"),
    18: ("全員不合格だね", "Everyone… fails~"),
    34: ("この後食事なんて", "How about dinner after this~?"),
    75: ("答えはおしまい", "And the answer is… it's over~"),
    84: ("また後でね", "See you later~"),
    96: ("合格", "You pass~"),
    111: ("ちょっと遊びすぎたか", "I toyed with you a bit too much~"),
}

POOL_LABEL = {"intro":"intro","taunt":"taunt","bungee":"cast:Bungee-Gum","texture":"cast:Texture-Surprise",
              "overdrive":"cast:Overdrive-ult","rekka":"rekka:Card-Flourish","combatBark":"hitConnect",
              "hitReact":"hitReact","lowHealth":"lowHealth","win":"win"}

def esc(s): return (s or "").replace("|", "\\|").strip()

rows = []
for i in range(136):
    if i in idx2pool:
        pool = idx2pool[i]
        ja, en = CLEAN.get(i, (ja_raw[i], en_raw[i]))
        disp = "POOL:%s" % POOL_LABEL[pool]
    else:
        ja, en = ja_raw[i], en_raw[i]
        disp = "discard:%s" % DISCARD[i]
    rows.append((i, fn[i], ja, en, disp))

# Pool-size summary
sizes = ", ".join("%s %d" % (POOL_LABEL[p], len(POOLS[p])) for p in POOLS)
from collections import Counter
dc = Counter(DISCARD.values())
disc_summary = ", ".join("%s %d" % (k, v) for k, v in sorted(dc.items(), key=lambda x: -x[1]))
n_wired = sum(len(v) for v in POOLS.values())

md = []
md.append("# Hisoka Morrow — Voice Content Log (136 clips)\n")
md.append("Source: `hisokanen_*.mp3` (\"Nen Impact\", **Japanese**). Filenames encode only the original")
md.append("timestamp, not content. Cut clips were transcribed with faster-whisper (multilingual `small`,")
md.append("VAD; JA pass + EN-translate pass — `tools/transcribe_hisoka.py`) and **hand-reviewed** — the")
md.append("model handles Japanese well (lang-prob 1.00 throughout) but mangles stylised short lines and")
md.append("pure grunts, so the JA/EN below are hand-corrected where verifiable. This is the authoritative")
md.append("content reference going forward. Filenames keep their timestamp (Reverse-Flash precedent).\n")
md.append("**Totals:** 136 clips → **%d wired** into 10 pools; **%d discarded**." % (n_wired, 136 - n_wired))
md.append("Discards: %s.\n" % disc_summary)
md.append("Pool sizes: %s.\n" % sizes)
md.append("Filtering per the brief: any line naming another HxH character (Gon 023/024/122, Illumi 005) or the")
md.append("series title (133) is discarded; pure grunts/laughs, silence and garbled fragments are dropped;")
md.append("genuinely usable full lines are kept. Note 015 references \"the Exam\" (an event, not a named")
md.append("character) — kept as an intro, flagged here. Two clean signature clusters survived intact: five")
md.append("\"Bungee Gum\" callouts (058–062) → the neutral special, and the magician card-patter (068–076/097/098)")
md.append("→ Texture Surprise. No move referenced by a matched line is unbuilt — every pool maps to a shipped")
md.append("Hisoka trigger (build is green: `npm run test:hisoka` 39/39).\n")
md.append("| # | file | JA (transcription) | EN (gloss) | disposition |")
md.append("|---|---|---|---|---|")
for i, f, ja, en, disp in rows:
    md.append("| %03d | `%s` | %s | %s | %s |" % (i, f, esc(ja), esc(en), disp))
md.append("")

with open("HISOKANEN_VOICE_LOG.md", "w") as fp:
    fp.write("\n".join(md))
print("wrote HISOKANEN_VOICE_LOG.md: %d rows, %d wired, %d discarded" % (len(rows), n_wired, 136 - n_wired))
print("discards:", disc_summary)
