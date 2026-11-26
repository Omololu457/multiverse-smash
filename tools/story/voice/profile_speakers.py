# tools/story/voice/profile_speakers.py — MSV1-STORY voice: measure every Piper LibriTTS-R speaker so characters can be cast
# by ear-proxy numbers (median pitch, pitch movement, speaking speed). Output: tools/story/voice/speakers.json
#   ~/.cache/msv1-story-voice/venv/bin/python tools/story/voice/profile_speakers.py
import json, os, sys, numpy as np
from piper import PiperVoice, SynthesisConfig
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.expanduser("~/.cache/msv1-story-voice/models/en_US-libritts_r-medium.onnx")
TEXT = "I told you already. Step back, and let me handle this one myself."
voice = PiperVoice.load(MODEL)
SR = voice.config.sample_rate

def f0_track(x, sr):
    fr, hop = int(0.04 * sr), int(0.01 * sr)
    out = []
    for i in range(0, len(x) - fr, hop):
        w = x[i:i + fr] * np.hanning(fr)
        if np.sqrt(np.mean(w * w)) < 0.02: continue
        ac = np.correlate(w, w, "full")[fr - 1:]
        lo, hi = int(sr / 400), int(sr / 65)
        if hi >= len(ac): continue
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] / (ac[0] + 1e-9) > 0.45: out.append(sr / k)
    return np.array(out)

res = {}
n = voice.config.num_speakers
for sid in range(n):
    audio = np.concatenate([c.audio_float_array for c in voice.synthesize(TEXT, SynthesisConfig(speaker_id=sid))])
    f = f0_track(audio, SR)
    if len(f) < 20: continue
    st = 12 * np.log2(f / np.median(f))
    res[sid] = { "f0": round(float(np.median(f)), 1), "move": round(float(np.std(st)), 2), "dur": round(len(audio) / SR, 2),
                 "rms": round(float(np.sqrt(np.mean(audio ** 2))), 3) }
    if sid % 100 == 0: print(sid, res[sid], flush=True)
json.dump(res, open(os.path.join(HERE, "speakers.json"), "w"), indent=0)
print("profiled", len(res), "of", n)
