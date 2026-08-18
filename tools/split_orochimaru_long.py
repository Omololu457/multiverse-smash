#!/usr/bin/env python3
# Robust utterance segmentation for Orochimaru's 7 flagged LONG clips (music-masked). Combines a vocal-band
# energy envelope with a SPECTRAL-FLUX onset detector (finds new utterances that start OVER a music bed,
# where a plain silence/energy threshold fails — e.g. line_01). Prints an ASCII envelope + proposed cuts so
# the split decisions are transparent, then (with --cut) writes orochi_line_NNx_*.mp3 via ffmpeg.
import subprocess, os, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

SR = 22050; TMP = "/tmp/oro_voice_wav"
LONG = [1, 2, 16, 20, 24, 27, 43]

def load(num):
    import glob
    f = glob.glob(f"orochi_line_{num:02d}_*.mp3")[0]
    wav = os.path.join(TMP, os.path.basename(f).replace(".mp3", ".wav"))
    if not os.path.exists(wav):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-ac", "1", "-ar", str(SR), wav], check=True)
    sr, x = wavfile.read(wav); x = x.astype(np.float32); x /= (np.abs(x).max() + 1e-9)
    return f, x

def vb(x):
    sos = butter(4, [300, 3400], btype="band", fs=SR, output="sos")
    return sosfiltfilt(sos, x).astype(np.float32)

def envelope(x, hop=0.02, win=0.04):
    h, w = int(hop*SR), int(win*SR); n = 1 + (len(x)-w)//h
    return np.array([np.sqrt(np.mean(x[i*h:i*h+w]**2)+1e-12) for i in range(n)]), hop

def flux(x, hop=0.02, win=0.04):
    h, w = int(hop*SR), int(win*SR); n = 1 + (len(x)-w)//h; prev = None; out = []
    for i in range(n):
        S = np.abs(np.fft.rfft(x[i*h:i*h+w]*np.hanning(w)))
        out.append(0.0 if prev is None else float(np.sum(np.maximum(0, S-prev))))
        prev = S
    return np.array(out), hop

def segs_from_env(env, hop, rel=0.30, min_voice=0.22, min_gap=0.30):
    thr = env.max()*rel
    v = env > thr
    runs=[]; i=0; n=len(v)
    while i<n:
        if v[i]:
            j=i
            while j<n and v[j]: j+=1
            runs.append([i*hop, j*hop]); i=j
        else: i+=1
    merged=[]
    for a,b in runs:
        if merged and a-merged[-1][1] < min_gap: merged[-1][1]=b
        else: merged.append([a,b])
    return [(round(a,2),round(b,2)) for a,b in merged if b-a>=min_voice]

def ascii_env(env, width=80):
    if len(env)>width: env = np.array([env[int(i*len(env)/width):int((i+1)*len(env)/width)].max() for i in range(width)])
    m = env.max()+1e-9; bars=" .:-=+*#%@"
    return "".join(bars[min(len(bars)-1, int(v/m*len(bars)))] for v in env)

if __name__ == "__main__":
    cut = "--cut" in sys.argv
    for num in LONG:
        f, x = load(num); dur = len(x)/SR
        vbx = vb(x); env, hop = envelope(vbx)
        # normalise envelope by a local music-floor estimate so utterance PEAKS stand out over the bed
        floor = np.percentile(env, 40); norm = np.maximum(0, env - floor)
        segs = segs_from_env(norm, hop, rel=0.28, min_voice=0.45, min_gap=0.32)   # usable lines only (drop <0.45s fragments)
        print(f"\n{f}  ({dur:.2f}s)  → {len(segs)} utterance(s)")
        print("  env: [" + ascii_env(env) + "]")
        print("  seg: " + str(segs))
        if cut and len(segs) >= 2:
            for k,(a,b) in enumerate(segs):
                a2 = max(0, a-0.10); b2 = min(dur, b+0.12)          # small pad
                out = f.replace(".mp3", "").replace(f"line_{num:02d}", f"line_{num:02d}{chr(97+k)}") + ".mp3"
                # normalise output name to orochi_line_NN{a..}_orig.mp3
                out = f"orochi_line_{num:02d}{chr(97+k)}_{f.split('_',3)[3]}"
                seglen = b2 - a2
                # INPUT-side seek (-ss/-t BEFORE -i) so the output stream restarts at 0 and the afade
                # timestamps are relative to the TRIMMED output (output-side -ss silenced late segments).
                subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{a2:.3f}","-t",f"{seglen:.3f}","-i",f,
                                "-af",f"afade=t=in:st=0:d=0.03,afade=t=out:st={max(0,seglen-0.06):.3f}:d=0.05",out], check=True)
                print(f"    cut → {out}  ({b2-a2:.2f}s)")
