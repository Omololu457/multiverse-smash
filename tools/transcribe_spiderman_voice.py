#!/usr/bin/env python3
# Transcribe Spider-Man (Marvel Rivals) voice clips with faster_whisper. Outputs a JSON with the ACTUAL
# spoken text + confidence + no_speech_prob per clip, so classification is content-driven (not filename/
# duration). Empty text + high no_speech_prob ≈ a wordless effort/grunt; real text ≈ a spoken line.
import sys, json, glob, os
from faster_whisper import WhisperModel

MODEL = sys.argv[1] if len(sys.argv) > 1 else "small.en"
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 0
OUT   = sys.argv[3] if len(sys.argv) > 3 else "/tmp/spidey_transcripts.json"

clips = sorted(glob.glob("spiderman_mr_*.mp3"), key=lambda f: int(f.split("_")[-1].split(".")[0]))
if LIMIT: clips = clips[:LIMIT]
model = WhisperModel(MODEL, device="cpu", compute_type="int8")
out = []
for i, f in enumerate(clips):
    segs, info = model.transcribe(f, language="en", vad_filter=False, beam_size=1)
    segs = list(segs)
    text = " ".join(s.text.strip() for s in segs).strip()
    alp  = sum(s.avg_logprob for s in segs) / len(segs) if segs else -9.0
    nsp  = sum(s.no_speech_prob for s in segs) / len(segs) if segs else 1.0
    out.append({"f": f, "dur": round(info.duration, 3), "text": text,
                "avg_logprob": round(alp, 3), "no_speech_prob": round(nsp, 3)})
    if i % 40 == 0: print(f"  {i}/{len(clips)} …", flush=True)
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=0)
print(f"wrote {OUT}  ({len(out)} clips)")
