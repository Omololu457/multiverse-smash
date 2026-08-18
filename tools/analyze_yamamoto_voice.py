#!/usr/bin/env python3
"""Signal analysis of the 158 UNIDENTIFIED Yamamoto voice clips (no transcript possible). Per clip:
duration, loudness (RMS dBFS), PEAK dBFS + crest (peak-rms = punchiness), median pitch F0, voiced fraction,
and internal silence-gap count. Adds an INTENSITY score so movement-adjacent triggers (intro/casts) can be
kept CALM/measured and the genuinely intense clips reserved for the Ultimate + heavy-hit reactions — per the
"unhurried old man" archetype brief. Decodes each mp3 via ffmpeg → 16 kHz mono float32. Usage:
  analyze_yamamoto_voice.py            -> analyze ALL, write yamamoto_voice_analysis.tsv (sorted)
  analyze_yamamoto_voice.py gaps NNN [gap_s] -> dump internal-gap segments for one clip (for splitting)
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
    thr = env.max() * floor_ratio; quiet = env < thr
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
    if len(x) == 0: return dict(dur=0, rms=-99, peak=-99, crest=0, f0=0, voiced=0, gaps=0, intensity=0)
    rms = 20*np.log10(np.sqrt(np.mean(x**2)) + 1e-9)
    peak = 20*np.log10(np.max(np.abs(x)) + 1e-9)
    crest = peak - rms
    f0 = median_f0(x)
    env = rms_env(x)
    voiced = float(np.mean(env > env.max()*0.10))
    # loud-fraction: how much of the voiced clip sits near its own peak (sustained loudness = intensity)
    loud_frac = float(np.mean(env > env.max()*0.55))
    g = len(internal_gaps(x))
    # INTENSITY (0..~1+): louder overall (rms) + sustained-loud + a touch of duration bump; low crest (yelling
    # sits closer to peak) also reads intense. Normalized empirically so calm measured lines score < ~0.45.
    intensity = max(0.0, (rms + 30) / 22.0) * 0.55 + loud_frac * 0.45
    return dict(dur=dur, rms=rms, peak=peak, crest=crest, f0=f0, voiced=voiced, gaps=g, intensity=intensity)

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(ROOT, "yamamoto_line_*.mp3")))
    if len(sys.argv) > 2 and sys.argv[1] == "gaps":
        nnn = sys.argv[2]; gap_s = float(sys.argv[3]) if len(sys.argv) > 3 else 0.22
        f = [p for p in files if f"_line_{nnn}_" in os.path.basename(p)][0]
        x = decode(f); dur = len(x)/SR
        print(f"{os.path.basename(f)}  dur={dur:.1f}s  (gap_s={gap_s})")
        gaps = internal_gaps(x, gap_s=gap_s)
        print(f"{len(gaps)} internal gaps >= {gap_s}s:")
        prev = 0.0
        for i, (a, b) in enumerate(gaps):
            print(f"  segment {i}: {prev:6.2f}s -> {a:6.2f}s  (len {a-prev:.2f}s) | gap {a:.2f}-{b:.2f} ({b-a:.2f}s)")
            prev = b
        print(f"  segment {len(gaps)}: {prev:6.2f}s -> {dur:6.2f}s  (len {dur-prev:.2f}s)")
        sys.exit(0)
    rows = []
    for p in files:
        a = analyze_one(p); a["name"] = os.path.basename(p); rows.append(a)
    out = os.path.join(ROOT, "yamamoto_voice_analysis.tsv")
    with open(out, "w") as fh:
        fh.write("name\tdur\trms\tpeak\tcrest\tf0\tvoiced\tgaps\tintensity\n")
        for a in sorted(rows, key=lambda r: r["dur"]):
            fh.write(f"{a['name']}\t{a['dur']:.2f}\t{a['rms']:.1f}\t{a['peak']:.1f}\t{a['crest']:.1f}\t{a['f0']:.0f}\t{a['voiced']:.2f}\t{a['gaps']}\t{a['intensity']:.2f}\n")
    n = len(rows)
    print(f"analyzed {n} clips -> {out}")
    durs = sorted(r["dur"] for r in rows)
    print(f"dur: min {durs[0]:.1f}s  median {durs[n//2]:.1f}s  max {durs[-1]:.1f}s")
    print(f"clips >=8s (Ultimate/long candidates): " + ", ".join(f"{r['name'].split('_')[2]}({r['dur']:.1f}s)" for r in sorted(rows,key=lambda r:-r['dur'])[:8]))
    print(f"MOST intense (reserve for ult/heavy-hit): " + ", ".join(f"{r['name'].split('_')[2]}({r['intensity']:.2f})" for r in sorted(rows,key=lambda r:-r['intensity'])[:8]))
    print(f"CALMEST (intro/casts): " + ", ".join(f"{r['name'].split('_')[2]}({r['intensity']:.2f})" for r in sorted(rows,key=lambda r:r['intensity'])[:8]))
