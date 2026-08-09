#!/usr/bin/env python3
# Transcribe the 564 yuji_voice_*.mp3 clips (Yuji Itadori, JJK; mixed EN/JA fighting-game voice rip). Same
# pipeline proven on Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman / Maki / Miwa / Ghostface:
# faster-whisper "small" + VAD, translate task (English gloss = what named-char filtering + pool assignment +
# dup detection need), plus the detected SOURCE language so EN vs JA is recorded (language decision pending).
# VAD returning NO segments / empty gloss = non-speech/SFX flag. Writes incrementally to
# yuji_raw_transcript.tsv (resumable) — cols: idx, file, dur, lang, langprob, gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("yuji_voice_*.mp3"))
OUT = "yuji_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit(): done.add(int(p[0]))

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
    try:
        segs, info = model.transcribe(f, task="translate", vad_filter=True)
        gloss = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
    except Exception as e:
        gloss = ""; lang = "err"; prob = 0.0
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{gloss}\n"); out.flush()
    if i % 20 == 0:
        print(f"{i:03d}/{len(files)} [{lang}] {gloss[:55]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
