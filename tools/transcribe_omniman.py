#!/usr/bin/env python3
# Omni-Man voice transcription — SAME pipeline proven for the Reverse Flash / Batman batches:
# faster-whisper (base.en + VAD) over the omniman_*.mp3 clips (English, Mortal Kombat 1). Filenames
# encode only the original timestamp; content is unknown until transcribed. Emits a raw TSV for
# hand-review into OMNIMAN_VOICE_LOG.md.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("omniman_*.mp3"))
model = WhisperModel("base.en", device="cpu", compute_type="int8")

out = open("omniman_raw_transcript.tsv", "w")
for i, f in enumerate(files):
    segs, info = model.transcribe(f, vad_filter=True, language="en")
    text = " ".join(s.text.strip() for s in segs).strip()
    line = f"{i:03d}\t{f}\t{text}"
    print(line, flush=True)
    out.write(line + "\n")
    out.flush()
out.close()
print("DONE", len(files), "files", file=sys.stderr)
