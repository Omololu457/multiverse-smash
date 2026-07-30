#!/usr/bin/env python3
# Superman voice transcription — SAME pipeline proven for the Reverse Flash / Batman
# batches: faster-whisper (base.en + VAD) over the superman_*.mp3 clips (Injustice 2,
# English). Filenames encode only the original source timestamp; content is unknown
# until transcribed. Emits a raw TSV for hand-review into SUPERMAN_VOICE_LOG.md.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("superman_*.mp3"))
model = WhisperModel("base.en", device="cpu", compute_type="int8")

out = open("superman_raw_transcript.tsv", "w")
for i, f in enumerate(files):
    segs, info = model.transcribe(f, vad_filter=True, language="en")
    text = " ".join(s.text.strip() for s in segs).strip()
    line = f"{i:03d}\t{f}\t{text}"
    print(line, flush=True)
    out.write(line + "\n")
    out.flush()
out.close()
print("DONE", len(files), "files", file=sys.stderr)
