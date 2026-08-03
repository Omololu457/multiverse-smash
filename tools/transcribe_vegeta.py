#!/usr/bin/env python3
"""Transcribe the 48 Vegeta FighterZ voice clips (26 ssj_ + 22 blue_) via faster-whisper
base.en + VAD (the Reverse-Flash/Batman/etc. pipeline). Emits JSON to stdout for review."""
import glob, json, sys
from faster_whisper import WhisperModel

model = WhisperModel("base.en", device="cpu", compute_type="int8")
files = sorted(glob.glob("vegeta_ssj_*.mp3")) + sorted(glob.glob("vegeta_blue_*.mp3"))
out = []
for f in files:
    segs, info = model.transcribe(f, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=300),
                                  beam_size=5, language="en")
    txt = " ".join(s.text.strip() for s in segs).strip()
    dur = round(info.duration, 2)
    out.append({"file": f, "dur": dur, "text": txt})
    print(f"{f}\t{dur}s\t{txt}", file=sys.stderr)
print(json.dumps(out, indent=2))
