#!/usr/bin/env python3
# Transcribe the 102 zaraki_line_*.mp3 clips (Zaraki Kenpachi, Japanese fighting-game voice rip).
# Same faster-whisper + VAD 2-pass pipeline proven this session (Madara/Miwa/Vegeta/Sukuna/etc.):
#   1. transcribe (native JA text) — for spoken-line content (battle cry / Shikai / Bankai / victory / taunt).
#   2. translate  (English gloss)  — for bucketing + merged-line detection.
# Empty on BOTH passes = non-speech (a combat grunt/roar/pain with no words) → flagged for by-ear review.
# Also stamps duration (PyAV) so clips > ~3.5s can be flagged as possible merged_multi.
# Writes incrementally to zaraki_raw_transcript.tsv (resumable). Cols: idx, file, dur, lang, langprob, ja, en.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("zaraki_line_*.mp3"))
OUT = "zaraki_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit():
            done.add(int(p[0]))

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
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{ja}\t{en}\n"); out.flush()
    if i % 10 == 0:
        print(f"{i:03d}/{len(files)} [{lang}] JA={ja[:28]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
