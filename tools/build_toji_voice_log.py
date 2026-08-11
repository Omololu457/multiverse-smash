#!/usr/bin/env python3
# Curate the toji_raw_transcript.tsv → TOJI_VOICE_LOG.md + a draft pool map (both EN and JA, separate pools).
# Heuristic categoriser over the English gloss (present for every clip regardless of source language), then
# HAND-REVIEWED for the small/critical pools (technique casts + the two comeback pools). Discards: non-speech
# SFX (empty / pure-grunt), lines naming a specific character, and near-duplicate glosses.
import re, collections

ROWS = []
for ln in open("toji_raw_transcript.tsv"):
    p = ln.rstrip("\n").split("\t")
    if len(p) < 7 or not p[0].strip().isdigit():
        continue
    idx, f, dur, lang, prob, native, en = p[0], p[1], float(p[2]), p[3], p[4], p[5], p[6]
    ROWS.append(dict(idx=idx, f=f, dur=dur, lang=lang, native=native, en=en))

# whisper misdetects short JA grunts as ko/ru/zh/tr/pl/it/sv → treat as JA for pooling if they carry words
JA = {"ja", "ko", "ru", "zh", "tr", "pl", "it", "sv"}
def L(r): return "ja" if r["lang"] in JA else "en"

NAMES = re.compile(r"\b(gojo|geto|megumi|fushiguro|nanami|sukuna|itadori|yuji|nobara|zenin|maki|satoru|dagon|riko|kugisaki|nitta|shiu|toji)\b", re.I)
# a clip is non-speech if it has no gloss, or the gloss is only interjection/grunt tokens
GRUNT = re.compile(r"^[\W_]*((a+h+|u+g+h+|g+a+h+|h+u+h+|h+e+h+|t+c+h+|z+e+h+|n+u+h+|m+m+|u+h+|o+h+|e+h+|w+h+a+t|argh|hah|nng|hmph|sigh|ugh|gah|tch|huh|yeah|no|sot it|zeh)[\W_!?.…]*)+$", re.I)

def norm(t): return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()

# a gloss reads as REAL translated speech if it carries common English function words (short JA combat
# shouts hallucinate into proper-noun gibberish like "EJICSEN!" / "Music, please" — those we DON'T wire).
COMMON = set("i you your the a an to it is are not no yes now do don't i'll we my me he this that of "
             "and but so with for on off up down here there what who how why get got go come let kill "
             "die hold back ready over done still won't can't your'e you're they them all out".split())
HITWORD = re.compile(r"\bthat hurts\b|\bit hurts\b|\bdamn\b|\bscrewed up\b|\bnot bad\b|\bugh\b|\bgah\b|\bguh\b|\bargh\b|\bkuh\b|\btch\b", re.I)
def sensible(low):
    toks = norm(low).split()
    return len(toks) >= 2 and sum(1 for t in toks if t in COMMON) >= 1

def categorise(r):
    en = r["en"].strip(); low = en.lower()
    if not en and not r["native"].strip():             return "discard_nonspeech"
    if NAMES.search(low):                               return "discard_named"
    if len(norm(en)) <= 3 or GRUNT.match(en):           return "discard_nonspeech"
    # ── TECHNIQUE casts (Step 4 — actively flagged) ──
    if re.search(r"inverted spear|spear of heaven|thousand|chain", low):     return "tech_chainInvertedSpear"
    if re.search(r"split soul|cleave|split you|cut you|slice|slash", low):    return "tech_splitSoul"
    if re.search(r"playful cloud|three.section|nunchaku|staff|club", low):    return "tech_playfulCloud"
    # ── COMEBACK moments (Step 4 — defiant survival, distinct from generic lowHealth) ──
    if re.search(r"not over|not yet|still (going|alive|standing|moving)|won'?t (back down|give|lose|die)|i'?ll come back|get up|not (done|finished)|not enough", low):
        return "comebackSave"
    # ── hit reaction (took a hit — pain interjection / brief recoil) ──
    if HITWORD.search(low):                             return "hitReact"
    # ── low-health (deeper hurt, but not defiant-survival) ──
    if re.search(r"too strong|monster|painful|this bad|serious now|getting serious", low):    return "lowHealth"
    # ── win / finisher ──
    if re.search(r"it'?s over|game is over|i'?m done|job'?s? done|finished|go home|too easy|boring|that'?s it|do your job", low):  return "win"
    # ── intro / pre-fight taunt ──
    if re.search(r"ready|kill you|difference in|hold back|underestimate|let'?s go|opponent|come on|follow me|face.to.face|die\b|target|no cursed|invisible|worth it", low):  return "intro"
    # ── everything else: real translated speech → combat bark; unverifiable gibberish gloss → held (documented, NOT wired) ──
    return "combatBark" if sensible(low) else "held_unverified"

for r in ROWS:
    r["cat"] = categorise(r)
    r["L"] = L(r)

# near-duplicate detection PER (lang, category): keep first, mark the rest dup_discard
seen = collections.defaultdict(set)
for r in ROWS:
    if r["cat"].startswith("discard"):
        continue
    key = norm(r["en"])[:40]
    if key and key in seen[(r["L"], r["cat"])]:
        r["cat_final"] = "discard_dup"
    else:
        r["cat_final"] = r["cat"]
        if key: seen[(r["L"], r["cat"])].add(key)
for r in ROWS:
    r.setdefault("cat_final", r["cat"])

# per-pool WIRE caps (keep pools tight/high-quality; the rest stay documented in the LOG). Prefer longer
# glosses (more likely distinct real speech). tech/comeback/lowHealth are uncapped (small + important).
CAPS = {"combatBark": (32, 16), "intro": (16, 14), "hitReact": (12, 8), "win": (10, 6)}
def cap_pick(rs, lang):
    pool = rs[0]["cat_final"] if rs else ""
    n = CAPS.get(pool, (999, 999))[0 if lang == "ja" else 1]
    return sorted(rs, key=lambda r: -len(r["en"]))[:n]

# ── write the LOG ──
POOL_ORDER = ["intro","combatBark","hitReact","lowHealth","win","tech_splitSoul","tech_chainInvertedSpear",
              "tech_playfulCloud","comebackSave"]
with open("TOJI_VOICE_LOG.md", "w") as o:
    kept = [r for r in ROWS if not r["cat_final"].startswith("discard")]
    o.write("# TOJI FUSHIGURO — VOICE LOG\n\n")
    o.write(f"Source: 390 `toji_voice_*.mp3` clips (mixed EN/JA, timestamp-labeled — filenames preserved). ")
    o.write("Transcribed via `tools/transcribe_toji.py` (faster-whisper, 2-pass auto-detect + EN gloss).\n\n")
    langc = collections.Counter(r["L"] for r in ROWS)
    o.write(f"**Language split (auto-detect, misdetected short grunts folded into JA):** ")
    o.write(f"JA {sum(1 for r in ROWS if r['L']=='ja')} · EN {sum(1 for r in ROWS if r['L']=='en')}.\n\n")
    o.write("**Language decision:** KEEP BOTH — separate EN + JA pools (per request), JA default at play (larger set), ")
    o.write("EN available via the per-fighter voice-language toggle. Same dual-pool shape as Sukuna/Yuji.\n\n")
    catc = collections.Counter(r["cat_final"] for r in ROWS)
    o.write("## Disposition counts\n\n| Category | count |\n|---|---:|\n")
    for k, v in catc.most_common():
        o.write(f"| {k} | {v} |\n")
    o.write(f"\n**Kept {len(kept)} / 390** (discarded: non-speech, named-char, near-dup).\n\n")
    o.write("## WIRED pools (capped; both languages separate)\n\n")
    wired_total = 0
    for pool in POOL_ORDER:
        for lang in ("ja", "en"):
            rs = cap_pick([r for r in ROWS if r["cat_final"] == pool and r["L"] == lang], lang)
            if not rs: continue
            wired_total += len(rs)
            o.write(f"### {pool} — {lang.upper()} ({len(rs)})\n\n")
            for r in rs:
                o.write(f"- `{r['f']}` — {r['en'] or r['native']}\n")
            o.write("\n")
    o.write(f"**Total wired: {wired_total}.**\n\n")
    held = [r for r in ROWS if r["cat_final"] == "held_unverified"]
    o.write(f"## Held — unverifiable short JA shouts ({len(held)})\n\n")
    o.write("Real audio but the whisper gloss is hallucinated gibberish (short combat shouts) → NOT wired ")
    o.write("(can't confirm content/no named-char guarantee). Available for a future manual listen-through.\n\n")
    o.write(", ".join(r["idx"] for r in held) + "\n\n")
    o.write("## Discarded\n\n")
    for tag in ("discard_nonspeech","discard_named","discard_dup"):
        rs = [r for r in ROWS if r["cat_final"] == tag]
        o.write(f"### {tag} ({len(rs)})\n\n")
        o.write(", ".join(r["idx"] for r in rs) + "\n\n")

# ── emit the WIRED pool map (capped) for tojiVoice.js ──
import json
pools = collections.defaultdict(lambda: collections.defaultdict(list))
for pool in POOL_ORDER:
    for lang in ("ja", "en"):
        for r in cap_pick([r for r in ROWS if r["cat_final"] == pool and r["L"] == lang], lang):
            pools[pool][lang].append((r["f"], (r["en"] or r["native"])[:60]))
json.dump({k: dict(v) for k, v in pools.items()}, open("toji_voice_pools.json", "w"), ensure_ascii=False, indent=1)
wired = sum(len(v) for p in pools.values() for v in p.values())
print("wrote TOJI_VOICE_LOG.md + toji_voice_pools.json")
print("WIRED", wired, "| kept-total", sum(1 for r in ROWS if not r["cat_final"].startswith("discard")), "/ 390")
for k, v in collections.Counter(r["cat_final"] for r in ROWS).most_common():
    print(f"  {k:26} {v}")
