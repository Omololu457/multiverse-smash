#!/usr/bin/env python3
# Transcribe the 390 toji_voice_*.mp3 clips (Toji Fushiguro, MIXED English/Japanese fighting-game rip).
# Same faster-whisper + VAD pipeline proven this session (Madara/Miwa/Vegeta/Ichigo/etc.), but because the
# source is MIXED-language and only timestamp-labeled, pass 1 AUTO-DETECTS the language (no forced JA — that
# would garble the English clips):
#   1. transcribe (auto-detect) — native text in whatever language the clip is + the detected lang/prob.
#   2. translate  (English gloss) — for named-char filtering + pool assignment + dup detection.
# VAD returning nothing / empty on both = non-speech/SFX flag. Writes incrementally to
# toji_raw_transcript.tsv (resumable). Cols: idx, file, dur, lang, langprob, native_text, en_gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("toji_voice_*.mp3"))
OUT = "toji_raw_transcript.tsv"
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
    native = ""; en = ""; lang = "err"; prob = 0.0
    try:
        segs, info = model.transcribe(f, task="transcribe", vad_filter=True)   # AUTO language detect (mixed EN/JA)
        native = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
    except Exception:
        pass
    try:
        segs2, _ = model.transcribe(f, task="translate", vad_filter=True)
        en = " ".join(s.text.strip() for s in segs2).strip().replace("\t", " ").replace("\n", " ")
    except Exception:
        pass
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{native}\t{en}\n"); out.flush()
    if i % 10 == 0:
        print(f"{i:03d}/{len(files)} [{lang}] N={native[:30]} | EN={en[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
