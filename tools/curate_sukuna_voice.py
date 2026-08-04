#!/usr/bin/env python3
"""Mechanical first-pass filter over sukuna_raw_transcript.tsv (Step 3 of the voice brief).
Buckets each clip: SFX (non-speech) / named-OTHER-char (discard) / technique-flag (keep+cross-ref) /
near-dup / survivor. Both EN + JA retained (pending owner language decision → separate pools).
TSV cols: idx, file, dur, lang, langprob, native, gloss  (7 cols; native = JA source text, gloss = EN).
Prints counts + per-bucket lists. Hand-categorization into pools happens after, in the LOG."""
import glob, os, re, sys
from collections import defaultdict

TSV = "sukuna_raw_transcript.tsv"

# JJK characters OTHER than Sukuna → a direct name-drop = discard (Step 3). Sukuna's own vessel-mate Yuji
# and body-host Megumi are name-drops of OTHER characters too → discard bucket (hand review can rescue any
# that are genuinely characterful, but default is discard per brief).
OTHER_CHARS = [
    "gojo", "satoru", "megumi", "fushiguro", "nobara", "kugisaki", "nanami", "kento",
    "todo", "aoi", "maki", "toji", "choso", "yuta", "okkotsu", "geto", "suguru",
    "panda", "inumaki", "toge", "mahito", "jogo", "hanami", "dagon", "kenjaku",
    "yorozu", "uraume", "higuruma", "kashimo", "utahime", "mechamaru", "yaga",
    "miwa", "kasumi", "momo", "noritoshi", "kamo", "shoko", "ieiri", "yuji", "itadori",
    "gocho", "gugisaki", "fushigero", "megami",   # whisper mis-hears (still a direct name-drop → discard)
]
# Sukuna's OWN theme/technique terms → NEVER auto-discard; FLAG for move cross-reference (Step 3).
#   Built moves: Flame Arrow "Fuga" (F) · Dismantle (B) · Cursed Slash auto-target (D) · Cleave (neutral) ·
#   Malevolent Shrine / Domain Expansion (ultimate). Ryomen = his full name (Ryomen Sukuna). "cleave/open"
#   = 開 (Kai) · "dismantle" = 捌 (Hachi). Keep his own name "sukuna" as a self term.
SELF_TECH = ["domain expansion", "malevolent shrine", "shrine", "fuga", "cleave", "dismantle",
             "cursed technique", "cursed energy", "ryomen", "sukuna", "reversal", "flame arrow",
             "open", "dance of the", "king of curses"]

def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()

def norm_name(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

def is_sfx(gloss, native):
    g = gloss.strip()
    if not g and not native.strip():
        return True
    letters = re.sub(r"[^a-zA-Z]", "", g)
    if len(letters) <= 1 and len(re.sub(r"[^\w]", "", native)) <= 1:
        return True
    if norm(g) in {"you", "thank you", "thanks", "bye", "uh", "ah", "oh", "hmm", "mm", "hm",
                    "yeah", "ha", "haha", "music", "applause", "the", "so", "yes", "no", "okay"}:
        # only SFX if native is ALSO trivially short (guard against real JA line w/ weak gloss)
        if len(re.sub(r"[^\w]", "", native)) <= 3:
            return True
    if re.fullmatch(r"[\W_]+", g) and not native.strip():
        return True
    return False

def main():
    if not os.path.exists(TSV):
        print("no TSV yet"); return
    rows = []
    for ln in open(TSV):
        p = ln.rstrip("\n").split("\t")
        if len(p) < 7 or not p[0].strip().isdigit():
            continue
        rows.append({"idx": int(p[0]), "file": p[1], "dur": p[2], "lang": p[3], "prob": p[4],
                     "native": p[5], "gloss": p[6]})
    seen = {}
    for r in rows:
        seen[r["idx"]] = r
    rows = [seen[k] for k in sorted(seen)]

    buckets = {"sfx": [], "other_char": [], "other_lang": [], "survivor": []}
    flags = []
    for r in rows:
        g = r["gloss"]; n = norm(g); nn = norm_name(g); nnat = norm_name(r["native"])
        if is_sfx(g, r["native"]):
            buckets["sfx"].append(r); continue
        # name check across BOTH the English gloss and the native transcription
        hit_other = next((c for c in OTHER_CHARS
                          if re.search(r"\b" + re.escape(c) + r"\b", nn)
                          or re.search(r"\b" + re.escape(c) + r"\b", nnat)), None)
        hit_self  = next((t for t in SELF_TECH if t in n or t in norm(r["native"])), None)
        if hit_other and not hit_self:   # a self-tech line mentioning a name still flags for review
            r["why"] = hit_other; buckets["other_char"].append(r); continue
        if r["lang"] not in ("en", "ja"):
            buckets["other_lang"].append(r); continue
        if hit_self:
            r["flag"] = hit_self; flags.append(r)
        buckets["survivor"].append(r)

    groups = defaultdict(list)
    for r in buckets["survivor"]:
        groups[norm(r["gloss"])].append(r)
    dups = {k: v for k, v in groups.items() if len(v) > 1 and k}
    dup_extra = sum(len(v) - 1 for v in dups.values())

    en = [r for r in buckets["survivor"] if r["lang"] == "en"]
    ja = [r for r in buckets["survivor"] if r["lang"] == "ja"]

    print(f"=== TOTAL rows parsed: {len(rows)} ===")
    print(f"SFX / non-speech discard : {len(buckets['sfx'])}")
    print(f"named OTHER-char discard : {len(buckets['other_char'])}")
    print(f"other-lang mis-detect discard : {len(buckets['other_lang'])}")
    print(f"survivors (speech)       : {len(buckets['survivor'])}   (EN={len(en)}  JA={len(ja)})")
    print(f"near-dup groups          : {len(dups)}  (redundant extra clips: {dup_extra})")
    print(f"technique-callout FLAGS  : {len(flags)}")
    print()
    print("---- named OTHER-char discards ----")
    for r in buckets["other_char"]:
        print(f"  {r['file']}  [{r['why']}]  {r['gloss'][:55]} | {r['native'][:30]}")
    print()
    print("---- other-lang mis-detect discards ----")
    for r in buckets["other_lang"]:
        print(f"  {r['file']}  [{r['lang']} p={r['prob']}]  {r['gloss'][:45]} | {r['native'][:25]}")
    print()
    print("---- technique-callout FLAGS (cross-ref vs built moves) ----")
    for r in flags:
        print(f"  {r['file']}  [{r['flag']}] ({r['lang']})  {r['gloss'][:45]} | {r['native'][:30]}")
    print()
    print("---- near-dup groups (keep 1 each) ----")
    for k, v in sorted(dups.items(), key=lambda kv: -len(kv[1])):
        print(f"  x{len(v)}: \"{v[0]['gloss'][:45]}\"  -> {', '.join(r['file'].replace('sukuna_new_','').replace('.mp3','') for r in v)}")

    with open("/tmp/sukuna_survivors_en.txt", "w") as f:
        for r in sorted(en, key=lambda r: r["idx"]):
            f.write(f"{r['file']}\t{r['prob']}\t{r['native']}\t{r['gloss']}\n")
    with open("/tmp/sukuna_survivors_ja.txt", "w") as f:
        for r in sorted(ja, key=lambda r: r["idx"]):
            f.write(f"{r['file']}\t{r['prob']}\t{r['native']}\t{r['gloss']}\n")
    print("\nsurvivor tables → /tmp/sukuna_survivors_{en,ja}.txt")

if __name__ == "__main__":
    main()
