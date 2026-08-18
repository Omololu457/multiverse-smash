#!/usr/bin/env python3
# Transcribe the 39 naoya_line_*.mp3 clips (Naoya Zenin, JUJUTSU KAISEN, Japanese, silence-segmented rip,
# NO transcript at split time). faster_whisper + VAD: JA text + EN gloss (content classification + wiring).
# Writes naoya_raw_transcript.tsv (resumable). Also flags very-short clips (likely grunts/effort).
import glob, os, re
from faster_whisper import WhisperModel

def clipnum(f):
    m = re.search(r"line_(\d+)", f); return int(m.group(1)) if m else 0
files = sorted(glob.glob("naoya_line_*.mp3"), key=clipnum)
OUT = "naoya_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if len(p) > 1 and not p[0].startswith("#"): done.add(p[0])

model = WhisperModel("small", device="cpu", compute_type="int8")
out = open(OUT, "a")
if not done: out.write("#file\tdur\tlang\tprob\tja_text\ten_gloss\n"); out.flush()
for i, f in enumerate(files):
    if f in done: continue
    try:
        import av; c = av.open(f); dur = c.duration/1e6 if c.duration else 0.0; c.close()
    except Exception: dur = 0.0
    ja=""; en=""; lang="err"; prob=0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", language="ja", vad_filter=True)
        ja = " ".join(s.text.strip() for s in segs).strip().replace("\t"," ").replace("\n"," ")
        lang=info.language; prob=info.language_probability
    except Exception as e: ja=f"ERR:{e}"
    try:
        segs2,_ = model.transcribe(f, task="translate", vad_filter=True)
        en = " ".join(s.text.strip() for s in segs2).strip().replace("\t"," ").replace("\n"," ")
    except Exception: pass
    out.write(f"{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{ja}\t{en}\n"); out.flush()
    print(f"{i:02d}/{len(files)} {f} [{dur:.1f}s] JA={ja[:24]} | EN={en[:38]}", flush=True)
out.close()
