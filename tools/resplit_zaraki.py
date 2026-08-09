#!/usr/bin/env python3
# Re-split merged Zaraki voice clips into distinct SPOKEN lines. Silence-splitting fails on these because
# the merged lines are separated by ROARS (loud, not silent) — so instead we cut at faster-whisper's VAD
# SEGMENT boundaries: whisper's VAD isolates spoken phrases and skips roars, so grouping its segments (and
# cutting the audio there via PyAV) yields clean per-line pieces. Roars/pure-grunt gaps between groups are
# dropped (we're extracting wireable spoken lines). Also prints each piece's JA transcript.
#   USAGE: resplit_zaraki.py zaraki_line_011.mp3 [more...]
import sys, av, numpy as np
from faster_whisper import WhisperModel

GROUP_GAP = 0.60     # merge whisper segments whose inter-gap is under this into one line
PAD = 0.10           # keep 100ms around each group so onsets/tails aren't clipped
MIN_LEN = 0.35       # skip groups shorter than this

def decode_mono(path):
    c = av.open(path); st = c.streams.audio[0]; sr = st.rate
    rs = av.AudioResampler(format="flt", layout="mono", rate=sr)
    chunks = []
    for frame in c.decode(st):
        for rf in rs.resample(frame):
            chunks.append(rf.to_ndarray().reshape(-1))
    c.close()
    return (np.concatenate(chunks) if chunks else np.zeros(1, np.float32)).astype(np.float32), sr

def write_mp3(x, sr, path):
    out = av.open(path, "w"); ost = out.add_stream("libmp3lame", rate=sr); ost.layout = "mono"
    fr = av.AudioFrame.from_ndarray(x.reshape(1, -1).astype(np.float32), format="fltp", layout="mono"); fr.rate = sr
    for pkt in ost.encode(fr): out.mux(pkt)
    for pkt in ost.encode(None): out.mux(pkt)
    out.close()

model = WhisperModel("small", device="cpu", compute_type="int8")
for path in sys.argv[1:]:
    x, sr = decode_mono(path); dur = len(x) / sr
    segs, _ = model.transcribe(path, task="transcribe", language="ja", vad_filter=True)
    segs = [(s.start, s.end, s.text.strip()) for s in segs if s.text.strip()]
    if not segs:
        print(f"{path}: no speech segments (pure grunt/roar) — left as-is"); continue
    # group consecutive segments separated by < GROUP_GAP
    groups = [[segs[0]]]
    for s in segs[1:]:
        if s[0] - groups[-1][-1][1] < GROUP_GAP: groups[-1].append(s)
        else: groups.append([s])
    if len(groups) <= 1:
        print(f"{path}: 1 spoken group → single line (dur={dur:.2f}s): {' '.join(t for _,_,t in groups[0])}")
        continue
    base = path[:-4]
    for i, g in enumerate(groups):
        a = max(0, g[0][0] - PAD); b = min(dur, g[-1][1] + PAD)
        if (b - a) < MIN_LEN: continue
        sub = f"{base}_{chr(97+i)}.mp3"
        write_mp3(x[int(a*sr):int(b*sr)], sr, sub)
        print(f"  {sub}: {b-a:.2f}s  JA={' '.join(t for _,_,t in g)}")
    print(f"{path}: split into {len(groups)} spoken lines (dur={dur:.2f}s)")
