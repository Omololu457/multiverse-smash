#!/usr/bin/env python3
# Transcribe the 210 pain_voice_*.mp3 clips (Pain / Nagato's Deva Path, Japanese fighting-game voice rip,
# Storm Connections source). Same faster-whisper + VAD 2-pass pipeline proven this session (Madara/Miwa/
# Vegeta/etc.) — TWO passes per clip because Pain's kit is technique-name-heavy and the callouts (Shinra
# Tensei / Bansho Ten'in / Chibaku Tensei) + the 5 assist NAMES (Itachi/Konan/Sasori/Sasuke/Tobi) are
# clearest in NATIVE Japanese:
#   1. transcribe (native JA text) — for matching jutsu callouts + assist-name calls + native-line curation.
#   2. translate  (English gloss)  — for filtering + pool assignment + dup detection.
# VAD returning nothing / empty on both = non-speech/SFX flag. Writes incrementally to
# pain_raw_transcript.tsv (resumable). Cols: idx, file, dur, lang, langprob, ja_text, en_gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("pain_voice_*.mp3"))
OUT = "pain_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit():
            done.add(int(p[0]))

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
    ja = ""; en = ""; lang = "err"; prob = 0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", language="ja", vad_filter=True)
        ja = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
    except Exception:
        pass
    try:
        segs2, _ = model.transcribe(f, task="translate", vad_filter=True)
        en = " ".join(s.text.strip() for s in segs2).strip().replace("\t", " ").replace("\n", " ")
    except Exception:
        pass
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{ja}\t{en}\n"); out.flush()
    if i % 10 == 0:
        print(f"{i:03d}/{len(files)} [{lang}] JA={ja[:32]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
