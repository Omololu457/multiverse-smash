#!/usr/bin/env python3
# Transcribe the 54 hiruzen_line_*.mp3 clips (Hiruzen Sarutobi, Japanese, silence-segmented rip — UNIDENTIFIED).
# Same faster_whisper + VAD pipeline as transcribe_hashirama.py: JA text (technique callouts) + EN gloss
# (pool assignment + named-char filter). ALSO dumps per-SEGMENT timestamps for the 40.6s line_23 block so we
# can tell whether it's several masked lines that need splitting. Writes hiruzen_raw_transcript.tsv (resumable).
import glob, os, sys, re
from faster_whisper import WhisperModel

def clipnum(f):
    m = re.search(r"line_(\d+)", f); return int(m.group(1)) if m else 0
files = sorted(glob.glob("hiruzen_line_*.mp3"), key=lambda f: (clipnum(f), f))
OUT = "hiruzen_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip() and not p[0].startswith("#") and p[1:2]:
            done.add(p[1])

model = WhisperModel("small", device="cpu", compute_type="int8")
out = open(OUT, "a")
if not done: out.write("#file\tdur\tlang\tprob\tja_text\ten_gloss\n"); out.flush()
for i, f in enumerate(files):
    if f in done: continue
    try:
        import av
        c = av.open(f); dur = c.duration / 1e6 if c.duration else 0.0; c.close()
    except Exception:
        dur = 0.0
    ja = ""; en = ""; lang = "err"; prob = 0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", language="ja", vad_filter=True)
        segs = list(segs)
        ja = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
        # 40s block: dump segment timeline so we can decide whether to split it
        if dur > 20:
            with open("hiruzen_line23_segments.txt", "w") as sf:
                for s in segs:
                    sf.write(f"[{s.start:6.1f}-{s.end:6.1f}] {s.text.strip()}\n")
    except Exception as e:
        ja = f"ERR:{e}"
    try:
        segs2, _ = model.transcribe(f, task="translate", vad_filter=True)
        en = " ".join(s.text.strip() for s in segs2).strip().replace("\t", " ").replace("\n", " ")
    except Exception:
        pass
    out.write(f"{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{ja}\t{en}\n"); out.flush()
    print(f"{i:02d}/{len(files)} {f} [{dur:.1f}s] JA={ja[:28]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
