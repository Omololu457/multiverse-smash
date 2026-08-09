#!/usr/bin/env python3
# Transcribe the 167 ichigo_voice_*.mp3 clips (Ichigo Kurosaki, Bleach Rebirth of Souls, Japanese voice).
# Same faster_whisper + VAD pipeline proven this session (Madara/Miwa/Vegeta/Sukuna), TWO passes per clip
# because Ichigo's kit has technique callouts (Getsuga Tenshō, Bankai) that are clearest in NATIVE Japanese:
#   1. transcribe (native JA text) — for matching technique callouts + native-line curation.
#   2. translate  (English gloss)  — for named-char filtering + pool assignment + dup detection.
# VAD returning nothing on both = non-speech/SFX flag. Writes incrementally to ichigo_raw_transcript.tsv
# (resumable). Cols: idx, file, dur, lang, langprob, ja_text, en_gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("ichigo_voice_*.mp3"))
OUT = "ichigo_raw_transcript.tsv"
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
        print(f"{i:03d}/{len(files)} [{lang}] JA={ja[:32]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
