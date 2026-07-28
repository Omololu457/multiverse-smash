#!/usr/bin/env python3
# Continuation: finish the remaining Minato clips TRANSLATE-ONLY (English gloss = what's needed for
# named-char filtering + pool assignment). Clips 000-42 already have JA+EN; append EN-only for the rest.
import glob, sys
from faster_whisper import WhisperModel
files = sorted(glob.glob("minatostorm_*.mp3"))
START = 43
model = WhisperModel("small", device="cpu", compute_type="int8")
out = open("minato_raw_transcript.tsv", "a")
for i in range(START, len(files)):
    f = files[i]
    es, info = model.transcribe(f, task="translate", vad_filter=True)
    en = " ".join(s.text.strip() for s in es).strip().replace("\t"," ").replace("\n"," ")
    line = f"{i:03d}\t{f}\t{info.language}\t{info.language_probability:.2f}\t\t{en}"
    print(f"{i:03d} EN={en[:60]}", flush=True)
    out.write(line + "\n"); out.flush()
out.close()
print("DONE", file=sys.stderr)
