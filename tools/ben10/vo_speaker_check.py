#!/usr/bin/env python3
"""
vo_speaker_check.py: "is this clip really THIS character?" evidence for every WIRED Ben 10 cast clip.

The clips come from fan compilations, so a "Rath" or "Albedo" folder also holds lines from other characters (Gwen, Kevin,
Grandpa Max, narrators, the other Ben). Two independent signals are written to docs/ben10/AUDIO_SPEAKER_CHECK.json:
  1. TRANSCRIPT: offline speech-to-text (faster-whisper small.en, CPU, deterministic: beam 5, temperature 0). The wording
     shows who is talking ("Ben, look out!" is not Ben) and whether the clip is speech at all.
  2. VOICE MATCH: median pitch (F0) + a 13-coefficient MFCC timbre profile per clip, compared with the robust centre of the
     clip's own destination pool (median + MAD). A large distance = probably a different speaker.
The keep / drop decision is made by a reviewer reading this evidence and recorded in tools/ben10/vo_curation.json (reasons
included). classify_vo.py applies that file. USAGE: python3 tools/ben10/vo_speaker_check.py
"""
import os, json, subprocess
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 16000

def decode(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)

def mel_fb(n_fft, n_mels=26, fmin=60, fmax=7600):
    m = lambda f: 2595 * np.log10(1 + f / 700); im = lambda x: 700 * (10 ** (x / 2595) - 1)
    pts = im(np.linspace(m(fmin), m(fmax), n_mels + 2)); bins = np.floor((n_fft + 1) * pts / SR).astype(int)
    fb = np.zeros((n_mels, n_fft // 2 + 1))
    for i in range(1, n_mels + 1):
        a, b, c = bins[i - 1], bins[i], bins[i + 1]
        for k in range(a, b): fb[i - 1, k] = (k - a) / max(1, b - a)
        for k in range(b, c): fb[i - 1, k] = (c - k) / max(1, c - b)
    return fb
FB = mel_fb(512)
DCT = np.cos(np.pi / 26 * (np.arange(26) + 0.5)[None, :] * np.arange(13)[:, None])

def voice_profile(x):
    n = 480; hop = 160; f0s = []; mf = []
    lo, hi = SR // 500, SR // 70
    for i in range(0, max(1, len(x) - n), hop):
        f = x[i:i + n]
        if np.sqrt(np.mean(f ** 2)) < 10 ** (-40 / 20): continue
        g = f - f.mean(); ac = np.correlate(g, g, "full")[n - 1:]
        if ac[0] <= 0: continue
        k = lo + int(np.argmax(ac[lo:hi])); voiced = ac[k] / ac[0] >= 0.45
        if not voiced: continue
        f0s.append(SR / k)
        spec = np.abs(np.fft.rfft(np.pad(g * np.hamming(n), (0, 512 - n)))) ** 2
        mf.append(DCT @ np.log(FB @ spec + 1e-10))
    if len(f0s) < 5: return None
    return dict(f0=float(np.median(f0s)), mfcc=np.mean(mf, axis=0).tolist())

def main():
    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    A = json.load(open(os.path.join(ROOT, "docs/ben10/AUDIO_ANALYSIS.json")))
    recs = [r for f in A.values() for r in f if r["pool"]]
    out = {}
    for r in recs:
        p = os.path.join(ROOT, r["path"][2:])
        segs, _ = model.transcribe(p, beam_size=5, temperature=0.0, vad_filter=False, condition_on_previous_text=False)
        text = " ".join(s.text.strip() for s in segs).strip()
        prof = voice_profile(decode(p))
        out[r["path"]] = dict(owner=r["owner"], origin=r["origin"], pool=r["pool"], dur=r["duration"], text=text,
                              f0=round(prof["f0"], 1) if prof else None, mfcc=[round(v, 3) for v in prof["mfcc"]] if prof else None)
        print(f'{r["owner"]:16} {r["pool"]:15} {os.path.basename(p):26} f0={out[r["path"]]["f0"]} | {text[:90]}', flush=True)
    # distance of each clip's voice from its owner's robust centre (median + MAD, per feature), in MAD units
    by = {}
    for k, v in out.items():
        if v["f0"] is not None: by.setdefault(v["owner"], []).append(k)
    for owner, ks in by.items():
        X = np.array([[np.log(out[k]["f0"])] + out[k]["mfcc"][1:] for k in ks])
        med = np.median(X, 0); mad = np.median(np.abs(X - med), 0) * 1.4826 + 1e-6
        Z = np.abs(X - med) / mad
        for k, z in zip(ks, Z):
            out[k]["pitch_z"] = round(float(z[0]), 2); out[k]["voice_dist"] = round(float(np.sqrt(np.mean(z ** 2))), 2)
    json.dump(out, open(os.path.join(ROOT, "docs/ben10/AUDIO_SPEAKER_CHECK.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
