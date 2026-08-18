#!/usr/bin/env python3
# Transcribe the 34 isshiki_line_*.mp3 clips (Isshiki Otsutsuki, Japanese, unidentified silence-cut set).
# Same faster_whisper + VAD pipeline proven this session (Madara/Miwa/Ichigo/Hashirama). TWO passes/clip:
#   1. transcribe (native JA text) — for matching technique callouts + line curation.
#   2. translate  (English gloss)  — for emotional/contextual pool assignment + dup detection.
# Also records DURATION + a crude RMS energy so lines can be sorted by length/energy when content is
# ambiguous (the "assignment by vibe" fallback the task allows). Writes isshiki_raw_transcript.tsv
# (resumable). Cols: idx, file, dur, rms, lang, langprob, ja_text, en_gloss.
import glob, os, sys, math
from faster_whisper import WhisperModel

files = sorted(glob.glob("isshiki_line_*.mp3"))
OUT = "isshiki_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit():
            done.add(int(p[0]))

def rms_energy(path):
    try:
        import av, numpy as np
        c = av.open(path); acc = 0.0; n = 0
        for fr in c.decode(audio=0):
            a = fr.to_ndarray().astype("float64")
            acc += float((a * a).sum()); n += a.size
        c.close()
        return math.sqrt(acc / n) if n else 0.0
    except Exception:
        return 0.0

model = WhisperModel("small", device="cpu", compute_type="int8")
out = open(OUT, "a")
for i, f in enumerate(files):
    if i in done:
        continue
    try:
        import av
        c = av.open(f); dur = c.duration / 1e6 if c.duration else 0.0; c.close()
    except Exception:
        dur = 0.0
    rms = rms_energy(f)
    ja = ""; en = ""; lang = "err"; prob = 0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", language="ja", vad_filter=True)
        ja = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
    except Exception:
        pass
    try:
        segs2, _ = model.transcribe(f, task="translate", vad_filter=True)
        en = " ".join(s.text.strip() for s in segs2).strip().replace("\t", " ").replace("\n", " ")
    except Exception:
        pass
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{rms:.4f}\t{lang}\t{prob:.2f}\t{ja}\t{en}\n"); out.flush()
    print(f"{i:03d}/{len(files)} dur={dur:.1f} [{lang}] JA={ja[:26]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
