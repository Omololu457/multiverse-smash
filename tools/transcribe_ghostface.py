#!/usr/bin/env python3
# Transcribe the 338 ghostface_*.mp3 clips (English, MK1 voice rip). Same pipeline proven on
# Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman: faster-whisper (base.en) + VAD.
# English source → task="transcribe" (no translate). VAD returning NO segments = non-speech/SFX flag
# (empty gloss). Writes incrementally to ghostface_raw_transcript.tsv (resumable) —
# cols: idx, file, dur, langprob, gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("ghostface_*.mp3"))
OUT = "ghostface_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit(): done.add(int(p[0]))

model = WhisperModel("base.en", device="cpu", compute_type="int8")
out = open(OUT, "a")
for i, f in enumerate(files):
    if i in done:
        continue
    try:
        import av
        c = av.open(f); dur = c.duration / 1e6 if c.duration else 0.0; c.close()
    except Exception:
        dur = 0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", vad_filter=True)
        gloss = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        prob = getattr(info, "language_probability", 0.0)
    except Exception:
        gloss = ""; prob = 0.0
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{prob:.2f}\t{gloss}\n"); out.flush()
    if i % 20 == 0:
        print(f"{i:03d}/{len(files)}  {gloss[:60]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
