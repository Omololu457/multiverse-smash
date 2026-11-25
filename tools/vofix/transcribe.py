# tools/vofix/transcribe.py — word-timestamped transcripts for the clips in out/clips.json (cached per file).
# usage: python3 transcribe.py <shard> <nshards>     → out/tx_<shard>.jsonl
import json, sys, os, subprocess
from faster_whisper import WhisperModel
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'tools/vofix/out')
shard, n = int(sys.argv[1]), int(sys.argv[2])
clips = json.load(open(os.path.join(OUT, 'clips.json')))
pri = {}
for c in clips:
    if c['path']: pri[c['path']] = min(pri.get(c['path'], 9), {'comment': 0, 'tuple': 0, 'slug': 1}.get(c['src'], 2))
paths = sorted(pri, key=lambda p: (pri[p], p))[shard::n]
done = set()
fn = os.path.join(OUT, f'tx_{shard}.jsonl')
if os.path.exists(fn):
    for l in open(fn):
        try: done.add(json.loads(l)['path'])
        except Exception: pass
m = WhisperModel('base', device='cpu', compute_type='int8', cpu_threads=2, num_workers=1)
with open(fn, 'a') as f:
    for p in paths:
        if p in done: continue
        ap = os.path.join(ROOT, p)
        try:
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ap], capture_output=True, text=True).stdout.strip() or 0)
            segs, info = m.transcribe(ap, word_timestamps=True, vad_filter=False, beam_size=1)
            words = [[w.word.strip(), round(w.start, 3), round(w.end, 3), round(w.probability, 3)] for s in segs for w in (s.words or [])]
            f.write(json.dumps({'path': p, 'dur': dur, 'lang': info.language, 'lp': round(info.language_probability, 3), 'words': words}) + '\n'); f.flush()
        except Exception as e:
            f.write(json.dumps({'path': p, 'err': str(e)[:200]}) + '\n'); f.flush()
