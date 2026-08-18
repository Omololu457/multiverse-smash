#!/usr/bin/env python3
# Acoustic analysis for Orochimaru's 59 UNIDENTIFIED voice clips (no transcript). Decodes each mp3 → mono
# wav via ffmpeg, extracts per-clip features (loudness / brightness / pitch / voiced-ratio) to drive the
# by-VIBE pool sort (Nezuko/Saitama/Jason precedent), AND runs a fine-grained vocal-band VAD on the long
# clips to detect MUSIC-MASKED multiple utterances (the 7 flagged: 01,02,16,20,24,27,43) → split candidates.
import subprocess, sys, glob, os, json
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

SR = 22050
TMP = "/tmp/oro_voice_wav"
os.makedirs(TMP, exist_ok=True)

def decode(mp3):
    wav = os.path.join(TMP, os.path.basename(mp3).replace(".mp3", ".wav"))
    if not os.path.exists(wav):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ac", "1", "-ar", str(SR), wav], check=True)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float32)
    if x.size: x /= (np.abs(x).max() + 1e-9)
    return x

def vocal_band(x):
    sos = butter(4, [250, 3400], btype="band", fs=SR, output="sos")
    return sosfiltfilt(sos, x).astype(np.float32)

def frame_energy(x, win=0.025, hop=0.010):
    w, h = int(win * SR), int(hop * SR)
    n = max(0, 1 + (len(x) - w) // h)
    return np.array([np.sqrt(np.mean(x[i*h:i*h+w] ** 2) + 1e-12) for i in range(n)]), h

def features(x):
    dur = len(x) / SR
    rms = np.sqrt(np.mean(x ** 2) + 1e-12)
    peak = np.abs(x).max() + 1e-9
    # spectral centroid (brightness)
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) if len(x) > 16 else np.array([1.0])
    freqs = np.fft.rfftfreq(len(x), 1 / SR) if len(x) > 16 else np.array([0.0])
    centroid = float((freqs * X).sum() / (X.sum() + 1e-9))
    # zero-crossing rate
    zcr = float(np.mean(np.abs(np.diff(np.sign(x))) > 0)) if len(x) > 1 else 0.0
    # crude F0 via autocorrelation on the loudest 0.4s voiced window
    vb = vocal_band(x)
    e, hop = frame_energy(vb)
    f0 = 0.0
    if e.size:
        c = int(np.argmax(e)); s = max(0, c * hop - int(0.2 * SR)); seg = vb[s:s + int(0.4 * SR)]
        if len(seg) > 400:
            seg = seg - seg.mean()
            ac = np.correlate(seg, seg, "full")[len(seg) - 1:]
            lo, hi = int(SR / 400), int(SR / 70)          # 70–400 Hz search
            if hi < len(ac):
                lag = lo + int(np.argmax(ac[lo:hi])); f0 = SR / lag if lag else 0.0
    # voiced ratio (vocal-band energy above a relative floor)
    thr = e.max() * 0.15 if e.size else 0
    voiced = float(np.mean(e > thr)) if e.size else 0.0
    return dict(dur=round(dur, 2), rms=round(20 * np.log10(rms), 1), peak_db=round(20 * np.log10(peak), 1),
                centroid=int(centroid), zcr=round(zcr, 3), f0=int(f0), voiced=round(voiced, 2))

def segments(x, min_voice=0.28, min_gap=0.26):
    # vocal-band VAD: voiced runs (energy above a relative threshold) separated by gaps → utterances.
    vb = vocal_band(x)
    e, hop = frame_energy(vb)
    if not e.size: return []
    thr = max(e.max() * 0.14, np.median(e) * 2.2)         # relative + above the (music) noise floor
    voiced = e > thr
    hop_s = hop / SR
    runs = []; i = 0; n = len(voiced)
    while i < n:
        if voiced[i]:
            j = i
            while j < n and (voiced[j] or (j + int(min_gap / hop_s) < n and voiced[min(n-1, j + int(min_gap / hop_s))] and np.any(voiced[j:j + int(min_gap / hop_s)]))):
                j += 1
            runs.append((i * hop_s, j * hop_s)); i = j
        else: i += 1
    # merge runs closer than min_gap, drop runs shorter than min_voice
    merged = []
    for a, b in runs:
        if merged and a - merged[-1][1] < min_gap: merged[-1] = (merged[-1][0], b)
        else: merged.append((a, b))
    return [(round(a, 2), round(b, 2)) for a, b in merged if b - a >= min_voice]

if __name__ == "__main__":
    SUPERSEDED = {1, 2, 16, 20, 24, 27, 43}   # the 7 flagged originals — replaced by their split segments
    def keyf(f):
        p = f.split("_")[2]
        return (int(''.join(c for c in p if c.isdigit())), p)
    files = [f for f in glob.glob("orochi_line_*.mp3")
             if not (f.split("_")[2].isdigit() and int(f.split("_")[2]) in SUPERSEDED)]
    files = sorted(files, key=keyf)
    LONG = set()
    out = {}
    print(f"{'clip':<30}{'dur':>6}{'rms':>7}{'cent':>7}{'f0':>5}{'zcr':>7}{'voi':>6}   segments(long)")
    for f in files:
        tag = f.split("_")[2]; x = decode(f); ft = features(x)
        segs = segments(x) if ft["dur"] >= 6.0 else []
        out[f] = {**ft, "num": tag, "segments": segs}
        seg_str = f"  {len(segs)} segs: {segs}" if segs else ""
        print(f"{f:<30}{ft['dur']:>6}{ft['rms']:>7}{ft['centroid']:>7}{ft['f0']:>5}{ft['zcr']:>7}{ft['voiced']:>6}{seg_str}")
    json.dump(out, open("/tmp/oro_voice_features.json","w"), indent=1, default=lambda o: float(o) if hasattr(o,"item") else str(o))
    print("\n→ /tmp/oro_voice_features.json")
