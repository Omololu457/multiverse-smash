#!/usr/bin/env python3
# Minato voice transcription — SAME faster-whisper pipeline as Reverse Flash/Batman/Omni-Man, adapted
# for JAPANESE audio (Naruto x Boruto Storm Connections). The English-only base.en used for prior
# batches can't read Japanese, so this uses the MULTILINGUAL `small` model and runs TWO passes per
# clip: task="transcribe" (Japanese original) + task="translate" (English gloss, for named-character
# filtering + pool assignment). Emits a TSV for hand-review into MINATO_VOICE_LOG.md.
import glob, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("minatostorm_*.mp3"))
model = WhisperModel("small", device="cpu", compute_type="int8")

out = open("minato_raw_transcript.tsv", "w")
out.write("idx\tfile\tlang\tprob\tja\ten\n")
for i, f in enumerate(files):
    js, info = model.transcribe(f, task="transcribe", language="ja", vad_filter=True)
    ja = " ".join(s.text.strip() for s in js).strip()
    es, _ = model.transcribe(f, task="translate", vad_filter=True)
    en = " ".join(s.text.strip() for s in es).strip()
    ja = ja.replace("\t", " ").replace("\n", " ")
    en = en.replace("\t", " ").replace("\n", " ")
    line = f"{i:03d}\t{f}\t{info.language}\t{info.language_probability:.2f}\t{ja}\t{en}"
    print(f"{i:03d} [{info.language}] JA={ja[:40]} | EN={en[:50]}", flush=True)
    out.write(line + "\n"); out.flush()
out.close()
print("DONE", len(files), "files", file=sys.stderr)
