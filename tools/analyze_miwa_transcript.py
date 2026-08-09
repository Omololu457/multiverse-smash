#!/usr/bin/env python3
# Post-transcription analysis for Miwa. Reads miwa_raw_transcript.tsv and reports:
#   - language breakdown (en/ja/other), with mis-detect note
#   - SFX / empty-gloss count (non-speech)
#   - the JA survivor set (non-empty gloss) dumped for hand-curation
# Miwa brief: DISCARD all EN, keep JA only; then content-filter the JA survivors by hand.
import sys, collections, re

ROWS = []
for ln in open("miwa_raw_transcript.tsv"):
    p = ln.rstrip("\n").split("\t")
    if len(p) < 6 or not p[0].strip().isdigit():
        continue
    idx, f, dur, lang, prob, gloss = p[0], p[1], p[2], p[3], p[4], p[5]
    ROWS.append(dict(idx=int(idx), f=f, dur=float(dur), lang=lang, prob=float(prob), gloss=gloss.strip()))

print(f"total rows: {len(ROWS)}")
langs = collections.Counter(r["lang"] for r in ROWS)
print("lang breakdown:", dict(langs.most_common()))

empty = [r for r in ROWS if not r["gloss"] or r["gloss"] in (".", "...", "-")]
print(f"empty/SFX gloss: {len(empty)}")

ja = [r for r in ROWS if r["lang"] == "ja" and r["gloss"] and r["gloss"] not in (".", "...", "-")]
en = [r for r in ROWS if r["lang"] == "en" and r["gloss"] and r["gloss"] not in (".", "...", "-")]
other = [r for r in ROWS if r["lang"] not in ("ja", "en") and r["gloss"] and r["gloss"] not in (".", "...", "-")]
print(f"JA with text: {len(ja)} | EN with text: {len(en)} | other-lang with text: {len(other)}")

# short glosses that are likely grunts even if lang=ja
def is_grunt(g):
    letters = re.sub(r"[^A-Za-z]", "", g)
    return len(letters) <= 3

print(f"\n==== JA SURVIVORS ({len(ja)}) — for hand-curation ====")
for r in ja:
    tag = " <grunt?>" if is_grunt(r["gloss"]) else ""
    print(f"{r['idx']:03d}\t{r['dur']:.1f}s\t{r['prob']:.2f}\t{r['f']}\t{r['gloss']}{tag}")

if other:
    print(f"\n==== OTHER-LANG WITH TEXT ({len(other)}) — check for JA mis-tags ====")
    for r in other:
        print(f"{r['idx']:03d}\t{r['lang']}\t{r['dur']:.1f}s\t{r['f']}\t{r['gloss']}")
