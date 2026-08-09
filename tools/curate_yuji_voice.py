#!/usr/bin/env python3
"""Mechanical first-pass filter over yuji_raw_transcript.tsv (Step 3 of the voice brief).
Buckets each clip: SFX (non-speech) / named-OTHER-char (discard) / technique-flag (keep+cross-ref) /
near-dup / survivor. Language kept per clip (EN + JA both retained → separate pools, user-confirmed).
Prints counts + per-bucket lists. Hand-categorization into pools happens after, in the LOG."""
import glob, os, re, sys
from collections import defaultdict

TSV = "yuji_raw_transcript.tsv"

# JJK characters OTHER than Yuji → a direct name-drop = discard (Step 3).
OTHER_CHARS = [
    "gojo", "satoru", "megumi", "fushiguro", "nobara", "kugisaki", "nanami", "kento",
    "todo", "aoi", "maki", "toji", "choso", "yuta", "okkotsu", "geto", "suguru",
    "panda", "inumaki", "toge", "mahito", "jogo", "hanami", "dagon", "kenjaku",
    "yorozu", "uraume", "higuruma", "kashimo", "utahime", "mechamaru", "yaga",
    "miwa", "kasumi", "momo", "noritoshi", "kamo", "shoko", "ieiri",
    "gocho", "gugisaki",   # whisper mis-hears of Gojo / Kugisaki (still a direct name-drop → discard)
]
# Yuji's OWN theme/technique terms → NEVER auto-discard; FLAG for move cross-reference (Step 3).
#   Sukuna = the curse in him + his Sukuna Slash move; Black Flash = ult; Divergent Fist = heavy;
#   Koma = ult payload; cursed energy = his whole kit; Ryomen = Sukuna's full name.
SELF_TECH = ["black flash", "kokusen", "divergent", "sukuna", "ryomen", "koma", "cursed energy",
             "cursed technique", "itadori", "yuji"]

def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()

def norm_name(s):
    # keep word boundaries for name matching — replace punctuation with SPACE (don't delete), so
    # "Gojo-sensei!" → "gojo sensei" (a bare \bgojo\b now matches) instead of "gojosensei".
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

def is_sfx(gloss):
    g = gloss.strip()
    if not g:
        return True
    # whisper non-speech hallucinations / bare tokens on grunts & SFX
    letters = re.sub(r"[^a-zA-Z]", "", g)
    if len(letters) <= 1:
        return True
    if norm(g) in {"you", "thank you", "thanks", "bye", "uh", "ah", "oh", "hmm", "mm", "hm",
                    "yeah", "ha", "haha", "music", "applause", "the", "so"}:
        return True
    if re.fullmatch(r"[\W_]+", g):
        return True
    return False

def main():
    if not os.path.exists(TSV):
        print("no TSV yet"); return
    rows = []
    for ln in open(TSV):
        p = ln.rstrip("\n").split("\t")
        if len(p) < 6 or not p[0].strip().isdigit():
            continue
        rows.append({"idx": int(p[0]), "file": p[1], "dur": p[2], "lang": p[3], "prob": p[4], "gloss": p[5]})
    # de-dup rows by idx (resume can append a re-tried row)
    seen = {}
    for r in rows:
        seen[r["idx"]] = r
    rows = [seen[k] for k in sorted(seen)]

    buckets = {"sfx": [], "other_char": [], "other_lang": [], "survivor": []}
    flags = []
    for r in rows:
        g = r["gloss"]; n = norm(g); nn = norm_name(g)
        if is_sfx(g):
            buckets["sfx"].append(r); continue
        # A line naming another specific character = discard (Step 3). "sukuna" is NOT in OTHER_CHARS —
        # it's a self/theme term (the curse in him + his Sukuna Slash move) → handled as a flag below.
        hit_other = next((c for c in OTHER_CHARS if re.search(r"\b" + re.escape(c) + r"\b", nn)), None)
        hit_self  = next((t for t in SELF_TECH if t in n), None)
        if hit_other:
            r["why"] = hit_other; buckets["other_char"].append(r); continue
        # Non-EN/JA detections on this rip are all low-confidence mis-detects over short grunts / count-ins /
        # bare interjections (reviewed: none are usable curated lines) → discard bucket, reported explicitly.
        if r["lang"] not in ("en", "ja"):
            buckets["other_lang"].append(r); continue
        if hit_self:
            r["flag"] = hit_self; flags.append(r)
        buckets["survivor"].append(r)

    # near-dup grouping among survivors (by normalized gloss)
    groups = defaultdict(list)
    for r in buckets["survivor"]:
        groups[norm(r["gloss"])].append(r)
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    dup_extra = sum(len(v) - 1 for v in dups.values())

    en = [r for r in buckets["survivor"] if r["lang"] == "en"]
    ja = [r for r in buckets["survivor"] if r["lang"] == "ja"]

    print(f"=== TOTAL rows parsed: {len(rows)} ===")
    print(f"SFX / non-speech discard : {len(buckets['sfx'])}")
    print(f"named OTHER-char discard : {len(buckets['other_char'])}")
    print(f"other-lang mis-detect discard : {len(buckets['other_lang'])}")
    print(f"survivors (speech)       : {len(buckets['survivor'])}   (EN={len(en)}  JA={len(ja)})")
    print(f"near-dup groups          : {len(dups)}  (redundant extra clips: {dup_extra})")
    print(f"  → unique survivor lines after de-dup: {len(buckets['survivor']) - dup_extra}  (EN≈{len(en)}  JA≈{len(ja)} before per-lang dedup)")
    print(f"technique-callout FLAGS  : {len(flags)}")
    print()
    print("---- named OTHER-char discards ----")
    for r in buckets["other_char"]:
        print(f"  {r['file']}  [{r['why']}]  {r['gloss'][:70]}")
    print()
    print("---- other-lang mis-detect discards ----")
    for r in buckets["other_lang"]:
        print(f"  {r['file']}  [{r['lang']} p={r['prob']}]  {r['gloss'][:60]}")
    print()
    print("---- technique-callout FLAGS (cross-ref vs built moves) ----")
    for r in flags:
        print(f"  {r['file']}  [{r['flag']}] ({r['lang']})  {r['gloss'][:70]}")
    print()
    print("---- near-dup groups (keep 1 each) ----")
    for k, v in sorted(dups.items(), key=lambda kv: -len(kv[1])):
        print(f"  x{len(v)}: \"{v[0]['gloss'][:55]}\"  -> {', '.join(r['file'].replace('yuji_voice_','').replace('.mp3','') for r in v)}")

    # dump survivor tables per language for hand-categorization
    with open("/tmp/yuji_survivors_en.txt", "w") as f:
        for r in sorted(en, key=lambda r: r["idx"]):
            f.write(f"{r['file']}\t{r['prob']}\t{r['gloss']}\n")
    with open("/tmp/yuji_survivors_ja.txt", "w") as f:
        for r in sorted(ja, key=lambda r: r["idx"]):
            f.write(f"{r['file']}\t{r['prob']}\t{r['gloss']}\n")
    if other_lang:
        with open("/tmp/yuji_survivors_other.txt", "w") as f:
            for r in sorted(other_lang, key=lambda r: r["idx"]):
                f.write(f"{r['file']}\t{r['lang']}\t{r['prob']}\t{r['gloss']}\n")
    print("\nsurvivor tables → /tmp/yuji_survivors_{en,ja,other}.txt")

if __name__ == "__main__":
    main()
