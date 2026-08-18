#!/usr/bin/env python3
"""Signal analysis of the UNIDENTIFIED Boruto voice clips (no transcript possible). Two SEPARATE pools:
base form (boruto_main_*.mp3, 163) and Momoshiki Karma form (boruto_karma_*.mp3, 49). Per clip: duration,
loudness (RMS dBFS), peak dBFS, median pitch F0 (Hz), voiced fraction, and internal silence-gap count (to
split the flagged long clips). Decodes each mp3 via ffmpeg → 16 kHz mono float32 PCM into numpy. Usage:
  analyze_boruto_voice.py main            -> analyze all base clips → boruto_main_voice_analysis.tsv
  analyze_boruto_voice.py karma           -> analyze all Karma clips → boruto_karma_voice_analysis.tsv
  analyze_boruto_voice.py main gaps 002   -> dump internal-gap split points for one clip
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
    win, hop = 640, 320
    lo, hi = int(SR/400), int(SR/70)
    f0s = []
    thr = np.sqrt(np.mean(x**2)) * 0.9 if len(x) else 0
    for i in range(0, max(1, len(x)-win), hop):
        fr = x[i:i+win]
        if np.sqrt(np.mean(fr**2)) < thr: continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, "full")[len(fr)-1:]
        if ac[0] <= 0: continue
        seg = ac[lo:hi]
        if len(seg) == 0: continue
        lag = lo + int(np.argmax(seg))
        if ac[lag] / ac[0] < 0.30: continue
        f0s.append(SR / lag)
    if not f0s: return 0.0
    return float(np.median(f0s))

def internal_gaps(x, gap_s=0.22, floor_ratio=0.10):
    env = rms_env(x); hop_s = 160 / SR
    thr = env.max() * floor_ratio
    quiet = env < thr
    gaps = []; run = 0; start = 0
    for i, q in enumerate(quiet):
        if q:
            if run == 0: start = i
            run += 1
        else:
            if run * hop_s >= gap_s and start > 0: gaps.append((start*hop_s, (start+run)*hop_s))
            run = 0
    if run * hop_s >= gap_s and start > 0: gaps.append((start*hop_s, (start+run)*hop_s))
    return gaps

def analyze_one(path):
    x = decode(path)
    dur = len(x) / SR
    if len(x) == 0: return dict(dur=0, rms=-99, peak=-99, f0=0, voiced=0, gaps=0)
    rms = 20*np.log10(np.sqrt(np.mean(x**2)) + 1e-9)
    peak = 20*np.log10(np.max(np.abs(x)) + 1e-9)
    env = rms_env(x)
    voiced = float(np.mean(env > env.max()*0.10))
    return dict(dur=dur, rms=rms, peak=peak, f0=median_f0(x), voiced=voiced, gaps=len(internal_gaps(x)))

if __name__ == "__main__":
    pool = sys.argv[1] if len(sys.argv) > 1 else "main"
    files = sorted(glob.glob(os.path.join(ROOT, f"boruto_{pool}_*.mp3")))
    if len(sys.argv) > 3 and sys.argv[2] == "gaps":
        nnn = sys.argv[3]
        f = [p for p in files if f"_{pool}_{nnn}_" in os.path.basename(p)][0]
        x = decode(f); print(f"{os.path.basename(f)}  dur={len(x)/SR:.1f}s")
        for (a, b) in internal_gaps(x): print(f"  gap {a:.2f}-{b:.2f}s  ({b-a:.2f}s)")
        sys.exit(0)
    rows = []
    for p in files:
        name = os.path.basename(p); nnn = name.split("_")[2]
        rows.append((nnn, name, analyze_one(p)))
    out = os.path.join(ROOT, f"boruto_{pool}_voice_analysis.tsv")
    with open(out, "w") as fh:
        fh.write("num\tdur_s\trms_db\tpeak_db\tf0_hz\tvoiced\tgaps\tfile\n")
        for nnn, name, a in rows:
            fh.write(f"{nnn}\t{a['dur']:.2f}\t{a['rms']:.1f}\t{a['peak']:.1f}\t{a['f0']:.0f}\t{a['voiced']:.2f}\t{a['gaps']}\t{name}\n")
    print(f"analyzed {len(rows)} {pool} clips → {out}")
    durs = [a['dur'] for _, _, a in rows]
    print(f"dur: median {np.median(durs):.1f}s  range {min(durs):.1f}-{max(durs):.1f}s")
    print("\n── LONG (>=6s) — ult / dramatic candidates; gaps=internal splits ──")
    for nnn, name, a in rows:
        if a['dur'] >= 6.0: print(f"  {nnn}: dur={a['dur']:.1f}s gaps={a['gaps']} rms={a['rms']:.1f} peak={a['peak']:.1f} f0={a['f0']:.0f}")
    print("\n── LOUDEST / most energetic (top RMS) — intro / transform / big-cast candidates ──")
    for nnn, name, a in sorted(rows, key=lambda r: r[2]['rms'], reverse=True)[:12]:
        print(f"  {nnn}: rms={a['rms']:.1f} peak={a['peak']:.1f} dur={a['dur']:.1f}s f0={a['f0']:.0f}")
    print("\n── SHORTEST (<=1.3s) — effort / grunt / namecall candidates ──")
    for nnn, name, a in sorted(rows, key=lambda r: r[2]['dur'])[:16]:
        print(f"  {nnn}: dur={a['dur']:.1f}s rms={a['rms']:.1f} f0={a['f0']:.0f} voiced={a['voiced']:.2f}")
