#!/usr/bin/env python3
"""STEP 1 — split clips over 8s into single lines on sentence-length silences. Uses ffmpeg
silencedetect to find gaps, cuts the voiced segments between them, and writes pieces BESIDE the
copy (never overwrites, never touches homelander_sfx/ originals). Pieces: <name>_pNN.ogg."""
import glob, os, re, subprocess
import numpy as np

SRC = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "homelander", "source")
NOISE_DB = "-30dB"      # below this = silence
MIN_SIL = 0.30          # a gap this long (s) is a sentence/line boundary
MIN_PIECE = 0.45        # drop slivers shorter than this
PAD = 0.06              # keep a little lead/tail around each piece

def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nk=1:nw=1", path], capture_output=True, text=True).stdout or 0)

def silences(path):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af",
                        f"silencedetect=noise={NOISE_DB}:d={MIN_SIL}", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    starts = [float(m) for m in re.findall(r"silence_start: ([\-\d.]+)", r)]
    ends   = [float(m) for m in re.findall(r"silence_end: ([\-\d.]+)", r)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))

def segments(total, sils):
    """Voiced spans between the detected silences."""
    segs, cur = [], 0.0
    for s, e in sils:
        if s - cur > MIN_PIECE:
            segs.append((cur, s))
        cur = e if e is not None else total
    if total - cur > MIN_PIECE:
        segs.append((cur, total))
    return segs

def main():
    longs = sorted(glob.glob(os.path.join(SRC, "long_over_8s_maybe_music", "*.ogg")))
    longs = [p for p in longs if "_p" not in os.path.basename(p)]   # skip any pieces from a prior run
    made = 0
    report = []
    for path in longs:
        total = dur(path)
        if total <= 8: continue
        segs = segments(total, silences(path))
        base = os.path.splitext(path)[0]
        n = 0
        for (a, bnd) in segs:
            a2, b2 = max(0, a - PAD), min(total, bnd + PAD)
            if b2 - a2 < MIN_PIECE: continue
            n += 1
            out = f"{base}_p{n:02d}.ogg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ss", f"{a2:.3f}", "-to", f"{b2:.3f}",
                            "-c:a", "vorbis", "-strict", "-2", "-q:a", "5", out], capture_output=True)
            made += 1
        report.append((os.path.basename(path), round(total, 1), n))
    for name, t, n in report:
        print(f"  {name:34s} {t:>6}s → {n} pieces")
    print(f"\n{made} pieces from {len(report)} long clips")

if __name__ == "__main__":
    main()
