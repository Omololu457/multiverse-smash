#!/usr/bin/env python3
# Transcribe the 685 sukuna_new_*.mp3 clips (Ryomen Sukuna, JJK; mixed EN/JA fighting-game voice rip). This is
# the REPLACEMENT source after Sukuna's prior voice pool was deleted entirely (see SUKUNA_VOICE_DELETION memo).
# Same pipeline proven on Reverse Flash / Batman / Omni-Man / Minato / Hisoka / Superman / Maki / Miwa / Yuji:
# faster-whisper "small" + VAD, translate task (English gloss = what named-char filtering + pool assignment +
# dup detection need), plus the detected SOURCE language so EN vs JA is recorded (language decision pending).
# SUKUNA-SPECIFIC ADDITION: also run a native transcribe pass so JA lines keep their real text — needed to flag
# named-technique callouts (領域展開/伏魔御廚子/フーガ/開/捌) that a translate-only gloss would smear.
# VAD returning NO segments / empty gloss = non-speech/SFX flag. Writes incrementally to
# sukuna_raw_transcript.tsv (resumable) — cols: idx, file, dur, lang, langprob, native, gloss.
import glob, os, sys
from faster_whisper import WhisperModel

files = sorted(glob.glob("sukuna_new_*.mp3"))
OUT = "sukuna_raw_transcript.tsv"
done = set()
if os.path.exists(OUT):
    for ln in open(OUT):
        p = ln.split("\t")
        if p and p[0].strip().isdigit(): done.add(int(p[0]))

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
    try:
        segs, info = model.transcribe(f, task="translate", vad_filter=True)
        gloss = " ".join(s.text.strip() for s in segs).strip().replace("\t", " ").replace("\n", " ")
        lang = info.language; prob = info.language_probability
    except Exception as e:
        gloss = ""; lang = "err"; prob = 0.0
    try:
        nsegs, _ = model.transcribe(f, task="transcribe", vad_filter=True)
        native = " ".join(s.text.strip() for s in nsegs).strip().replace("\t", " ").replace("\n", " ")
    except Exception:
        native = ""
    out.write(f"{i:03d}\t{f}\t{dur:.2f}\t{lang}\t{prob:.2f}\t{native}\t{gloss}\n"); out.flush()
    if i % 20 == 0:
        print(f"{i:03d}/{len(files)} [{lang}] {native[:30]} | {gloss[:40]}", flush=True)
out.close()
print("DONE", file=sys.stderr)
