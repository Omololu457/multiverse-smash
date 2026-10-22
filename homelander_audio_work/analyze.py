#!/usr/bin/env python3
"""Classify the Homelander pack by acoustic features (ffmpeg-decode → numpy; no soundfile needed).
Per clip: duration, peak, RMS, attack time, spectral centroid/rolloff, voiced-band (85-255 Hz)
energy ratio, zero-crossing rate, silence ratio, and a MUSIC test (sustained harmonic energy +
steady tempo). Emits docs/homelander/AUDIO_ANALYSIS.csv."""
import csv, glob, os, subprocess, sys
import numpy as np

SR = 22050
ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "homelander", "source")
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "homelander", "AUDIO_ANALYSIS.csv")

def decode(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                       capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)

def frames(x, n=1024, hop=512):
    if len(x) < n: x = np.pad(x, (0, n - len(x)))
    idx = range(0, len(x) - n + 1, hop)
    return np.array([x[i:i + n] for i in idx]) if idx else np.zeros((1, n))

def features(x):
    f = {}
    x = x - np.mean(x)
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    f["peak"] = round(peak, 4)
    f["rms"] = round(float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.0, 4)
    fr = frames(x)
    win = np.hanning(fr.shape[1])
    frw = fr * win
    rms_fr = np.sqrt(np.mean(fr ** 2, axis=1) + 1e-12)
    # silence ratio (frames below 8% of this clip's frame-RMS max)
    thr = 0.08 * (rms_fr.max() + 1e-9)
    f["silence_ratio"] = round(float(np.mean(rms_fr < thr)), 3)
    # attack time: from start to the first frame reaching 80% of the RMS peak
    pk = int(np.argmax(rms_fr))
    rise = np.where(rms_fr[:pk + 1] >= 0.8 * rms_fr[pk])[0]
    f["attack_s"] = round((rise[0] if len(rise) else pk) * 512 / SR, 3)
    # zero-crossing rate (mean over frames)
    zcr = np.mean(np.abs(np.diff(np.sign(fr), axis=1)) > 0, axis=1)
    f["zcr"] = round(float(np.mean(zcr)), 4)
    # spectra
    mag = np.abs(np.fft.rfft(frw, axis=1))
    freqs = np.fft.rfftfreq(fr.shape[1], 1 / SR)
    msum = mag.sum(axis=1) + 1e-9
    cent = (mag * freqs).sum(axis=1) / msum
    f["centroid"] = round(float(np.mean(cent)), 1)
    # rolloff (85% energy)
    csum = np.cumsum(mag, axis=1)
    roll = freqs[np.argmax(csum >= 0.85 * csum[:, -1:], axis=1)]
    f["rolloff"] = round(float(np.mean(roll)), 1)
    # voiced band 85-255 Hz energy ratio (vs 85-4000 Hz band — speech-dominant range)
    vb = (freqs >= 85) & (freqs <= 255)
    sb = (freqs >= 85) & (freqs <= 4000)
    f["voiced_ratio"] = round(float((mag[:, vb].sum() + 1e-9) / (mag[:, sb].sum() + 1e-9)), 3)
    # MUSIC test: steadiness of frame-RMS (low CV = sustained), harmonic periodicity, low silence
    cv = float(np.std(rms_fr) / (np.mean(rms_fr) + 1e-9))
    f["rms_cv"] = round(cv, 3)
    # harmonic ratio: per-frame normalized autocorrelation peak in a pitch lag range (voice/music are pitched)
    har = []
    for fwi in frw[:: max(1, len(frw) // 40)]:
        ac = np.correlate(fwi, fwi, "full")[len(fwi) - 1:]
        if ac[0] <= 1e-9: har.append(0); continue
        ac = ac / ac[0]
        lo, hi = int(SR / 400), int(SR / 70)   # 70-400 Hz fundamental lags
        har.append(float(np.max(ac[lo:hi])) if hi < len(ac) else 0)
    f["harmonic"] = round(float(np.mean(har)) if har else 0.0, 3)
    # music score: sustained (low cv) + steady harmonic + low silence + broadband-but-pitched
    music = (max(0, 1 - cv) * 0.4 + f["harmonic"] * 0.35 + max(0, 1 - f["silence_ratio"]) * 0.25)
    f["music_score"] = round(music, 3)
    return f

def classify(dur, f):
    """Return (class, confidence, note). class in voice / sfx / music. Pack is a VOICE compilation,
    so pitched non-noisy clips default to voice; harmonic + ZCR + centroid separate SFX; long sustained
    harmonic = music."""
    v, cen, zc, har, sil, cv, att = (f["voiced_ratio"], f["centroid"], f["zcr"], f["harmonic"],
                                     f["silence_ratio"], f["rms_cv"], f["attack_s"])
    # MUSIC — long, sustained envelope (low CV), steady harmonic, little silence
    if dur >= 8 and cv < 0.72 and har > 0.42 and sil < 0.22:
        return "music", round(min(0.95, f["music_score"]), 2), "sustained harmonic + low-variance envelope (possible music bed)"
    # SFX — noise (high ZCR), bright-&-non-pitched, pure transient hit, or near-pure noise
    noisy      = zc > 0.20
    bright_fx  = cen > 3600 and har < 0.45
    transient  = att < 0.04 and har < 0.33 and dur < 1.3
    pure_noise = har < 0.26 and v < 0.18
    if noisy or bright_fx or transient or pure_noise:
        kind = ("sizzle/noise" if cen > 3200 else "boom/transient" if (att < 0.05 and cen < 1800) else "whoosh/fx")
        conf = round(min(0.85, 0.42 + zc + (0.5 - har) * 0.4), 2)
        return "sfx", max(0.4, conf), f"{kind} (centroid {cen}, zcr {zc}, harmonic {har})"
    # VOICE — pitched (harmonic) and not noisy; otherwise still leans voice (voice-dominant pack) at low conf
    if har >= 0.30 and zc < 0.20:
        return "voice", round(min(0.9, 0.42 + har * 0.4 + v * 0.3), 2), f"pitched speech (harmonic {har}, zcr {zc}, voiced-band {v})"
    return "voice", 0.35, f"low-confidence voice (harmonic {har}, zcr {zc}) — audition to confirm"

def main():
    files = sorted(glob.glob(os.path.join(ROOT, "**", "*.ogg"), recursive=True))
    rows = []
    for path in files:
        rel = os.path.relpath(path, ROOT)
        x = decode(path)
        dur = len(x) / SR
        f = features(x)
        cls, conf, note = classify(dur, f)
        rows.append({"file": rel, "length_s": round(dur, 2), "class": cls, "confidence": conf,
                     "peak": f["peak"], "rms": f["rms"], "attack_s": f["attack_s"],
                     "centroid": f["centroid"], "rolloff": f["rolloff"], "voiced_ratio": f["voiced_ratio"],
                     "zcr": f["zcr"], "silence_ratio": f["silence_ratio"], "rms_cv": f["rms_cv"],
                     "harmonic": f["harmonic"], "music_score": f["music_score"], "notes": note})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    from collections import Counter
    print("classes:", dict(Counter(r["class"] for r in rows)))
    print(f"{len(rows)} clips → {os.path.relpath(OUT)}")

if __name__ == "__main__":
    main()
