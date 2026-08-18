#!/usr/bin/env python3
"""Signal analysis of the 115 UNIDENTIFIED Mayuri voice clips (no transcript possible). Per clip:
duration, loudness (RMS dBFS), median pitch F0 (Hz — to flag a possible SECOND/Nemu voice by register),
voiced fraction, and internal silence-gap count (to split the 7 flagged long clips). Decodes each mp3 via
ffmpeg → 16 kHz mono float32 PCM into numpy. Outputs a TSV + a summary. Usage:
  analyze_mayuri_voice.py            -> analyze ALL, write mayuri_voice_analysis.tsv
  analyze_mayuri_voice.py gaps NNN   -> dump internal-gap segments for one clip (for splitting)
"""
import os, sys, glob, subprocess, numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
SR = 16000

def decode(path):
    p = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR),
                        "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32)

def rms_env(x, win=400, hop=160):
    if len(x) < win: return np.array([np.sqrt(np.mean(x**2)) + 1e-9])
    frames = [np.sqrt(np.mean(x[i:i+win]**2)) for i in range(0, len(x)-win, hop)]
    return np.array(frames) + 1e-9

def median_f0(x):
    """Autocorrelation F0 over voiced 40ms frames (70-400 Hz)."""
    win, hop = 640, 320
    lo, hi = int(SR/400), int(SR/70)
    f0s = []
    thr = np.sqrt(np.mean(x**2)) * 0.9 if len(x) else 0
    for i in range(0, max(1, len(x)-win), hop):
        fr = x[i:i+win]
        if np.sqrt(np.mean(fr**2)) < thr: continue          # skip quiet frames
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, "full")[len(fr)-1:]
        if ac[0] <= 0: continue
        seg = ac[lo:hi]
        if len(seg) == 0: continue
        lag = lo + int(np.argmax(seg))
        if ac[lag] / ac[0] < 0.30: continue                 # weak periodicity → unvoiced
        f0s.append(SR / lag)
    if not f0s: return 0.0, 0.0
    return float(np.median(f0s)), len(f0s)

def internal_gaps(x, gap_s=0.22, floor_ratio=0.10):
    """Find silence gaps >= gap_s inside the clip (candidate split points)."""
    env = rms_env(x)
    hop_s = 160 / SR
    thr = env.max() * floor_ratio
    quiet = env < thr
    gaps = []
    run = 0; start = 0
    for i, q in enumerate(quiet):
        if q:
            if run == 0: start = i
            run += 1
        else:
            if run * hop_s >= gap_s and start > 0: gaps.append((start*hop_s, (start+run)*hop_s))
            run = 0
    # trailing
    if run * hop_s >= gap_s and start > 0: gaps.append((start*hop_s, (start+run)*hop_s))
    return gaps

def analyze_one(path):
    x = decode(path)
    dur = len(x) / SR
    if len(x) == 0: return dict(dur=0, rms=-99, f0=0, voiced=0, gaps=0)
    rms = 20*np.log10(np.sqrt(np.mean(x**2)) + 1e-9)
    f0, nvoiced = median_f0(x)
    env = rms_env(x)
    voiced_frac = float(np.mean(env > env.max()*0.10))
    g = internal_gaps(x)
    return dict(dur=dur, rms=rms, f0=f0, voiced=voiced_frac, gaps=len(g))

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(ROOT, "mayuri_line_*.mp3")))
    if len(sys.argv) > 2 and sys.argv[1] == "gaps":
        nnn = sys.argv[2]
        f = [p for p in files if f"_line_{nnn}_" in os.path.basename(p)][0]
        x = decode(f); dur = len(x)/SR
        print(f"{os.path.basename(f)}  dur={dur:.1f}s")
        for (a, b) in internal_gaps(x):
            print(f"  gap {a:.2f}-{b:.2f}s  ({b-a:.2f}s)")
        sys.exit(0)
    rows = []
    for p in files:
        name = os.path.basename(p)
        nnn = name.split("_")[2]
        a = analyze_one(p)
        rows.append((nnn, name, a))
    out = os.path.join(ROOT, "mayuri_voice_analysis.tsv")
    with open(out, "w") as fh:
        fh.write("num\tdur_s\trms_db\tf0_hz\tvoiced\tgaps\tfile\n")
        for nnn, name, a in rows:
            fh.write(f"{nnn}\t{a['dur']:.2f}\t{a['rms']:.1f}\t{a['f0']:.0f}\t{a['voiced']:.2f}\t{a['gaps']}\t{name}\n")
    # summary
    f0s = [a['f0'] for _, _, a in rows if a['f0'] > 0]
    med = np.median(f0s)
    print(f"analyzed {len(rows)} clips → {out}")
    print(f"F0: median {med:.0f}Hz  range {min(f0s):.0f}-{max(f0s):.0f}Hz")
    print("\n── possible SECOND-VOICE (Nemu) candidates: F0 clearly above the male band (>175Hz) ──")
    for nnn, name, a in rows:
        if a['f0'] > 175: print(f"  {nnn}: f0={a['f0']:.0f}Hz dur={a['dur']:.1f}s rms={a['rms']:.1f} voiced={a['voiced']:.2f}")
    print("\n── LONG clips (>=6s) — ult candidates + the 7 flagged; gaps=internal silence splits ──")
    for nnn, name, a in rows:
        if a['dur'] >= 6.0: print(f"  {nnn}: dur={a['dur']:.1f}s gaps={a['gaps']} f0={a['f0']:.0f}Hz")
    print("\n── SHORTEST clips (<=1.2s) — namecall / effort / grunt candidates ──")
    for nnn, name, a in sorted(rows, key=lambda r: r[2]['dur'])[:14]:
        print(f"  {nnn}: dur={a['dur']:.1f}s f0={a['f0']:.0f}Hz rms={a['rms']:.1f}")
