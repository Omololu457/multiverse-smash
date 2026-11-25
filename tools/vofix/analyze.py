# tools/vofix/analyze.py — decide what to FIX in each voice clip (no audio is written here; apply.py does that).
#   1. BLEED-OVER: the clip carries extra sentence(s) beyond the line it is wired as (rips cut at the wrong place: Goku's
#      "I can't wait to fight you again! You haven't really changed at all, Yamcha!"). Keep only the SENTENCES that contain the
#      intended words; cut in the quietest point of the gap between sentences. Only when the intended text clearly matches.
#   2. DEAD AIR: long silence before / after the speech (measured from the audio energy, not the ASR) → trimmed (cues land late).
#   3. CLICK: speech running into the very last ms (hard cut) → a short fade-out.
#   4. MISMATCH: intended text and what is actually said disagree → REPORTED for review, never auto-changed.
# Out: out/plan.json  { path: { start, end, fade_in, fade_out, reasons[], keep_text, drop_text } } + out/report.md
import json, os, re, subprocess, glob, difflib
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'tools/vofix/out')
clips = json.load(open(os.path.join(OUT, 'clips.json')))
tx = {}
for fn in glob.glob(os.path.join(OUT, 'tx_*.jsonl')):
    for l in open(fn):
        try:
            r = json.loads(l)
            if 'words' in r: tx[r['path']] = r
        except Exception: pass

NUM = {'0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten'}
def norm(w):
    w = w.lower().replace('’', "'").replace('‘', "'")
    w = re.sub(r"[^a-z0-9']", '', w)
    return NUM.get(w, w)
# laughs / grunts / gasps are PERFORMANCE, never 'bleed' (Ghostface's "Ha ha!", Bardock's "Heh heh heh", Yuji's pained "Ugh!")
INTERJ = {'ha','haha','hah','heh','hehe','huh','ugh','gah','ah','aah','oh','ohh','hmm','hm','mm','argh','agh','uh','eh','grr','hng','ngh','urgh','hyah','hah','yah','tch','ooh','whoa','wow','damn','what','nice','yeah','hey'}
def is_interj(ws): return all(norm(w) in INTERJ or not norm(w) for w in ws)
def words_of(text): return [w for w in (norm(x) for x in re.split(r"[\s\-—–…/]+", text or '')) if w]

SR = 16000
ENV = os.path.join(OUT, 'env'); os.makedirs(ENV, exist_ok=True)
def envelope(path):
    import hashlib
    st = os.stat(path); key = hashlib.md5(f'{path}|{st.st_size}|{st.st_mtime_ns}'.encode()).hexdigest()
    cf = os.path.join(ENV, key + '.npz')
    if os.path.exists(cf):
        z = np.load(cf); return z['db'], float(z['dur'])
    db, dur = _envelope(path)
    if db is not None: np.savez(cf, db=db, dur=dur)
    return db, dur
def _envelope(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if a.size == 0: return None, None
    hop = SR // 100   # 10 ms frames
    n = a.size // hop
    rms = np.sqrt(np.mean(a[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9), a.size / SR

def quietest(db, t0, t1):   # the quietest 10 ms frame between t0 and t1 (seconds)
    i0, i1 = int(t0 * 100), max(int(t0 * 100) + 1, int(t1 * 100))
    seg = db[i0:i1]
    return (i0 + int(np.argmin(seg))) / 100 if seg.size else (t0 + t1) / 2

by_path = {}
for c in clips:
    if c.get('path'): by_path.setdefault(c['path'], []).append(c)

plan, mism, stats = {}, [], {'bleed': 0, 'lead': 0, 'tail': 0, 'click': 0, 'mismatch': 0, 'checked': 0}
for path, refs in sorted(by_path.items()):
    ap = os.path.join(ROOT, path)
    if not os.path.exists(ap): continue
    db, dur = envelope(ap)
    if db is None or dur is None or dur < 0.15: continue
    stats['checked'] += 1
    peak = float(np.max(db)); thr = max(peak - 32, -50)   # "speech" = within 32 dB of the clip's peak
    loud = np.where(db > thr)[0]
    if loud.size == 0: continue
    s_on, s_off = loud[0] / 100, (loud[-1] + 1) / 100
    start, end, reasons, keep_txt, drop_txt = 0.0, dur, [], None, None
    r = tx.get(path)
    exp = next((c for c in refs if c.get('expect') and c.get('src') in ('comment', 'tuple')), None) or next((c for c in refs if c.get('expect')), None)
    if r and exp and r.get('words') and (r.get('lang') == 'en' or r.get('lp', 0) < 0.5):
        W = r['words']; tw = [norm(w[0]) for w in W]; ew = words_of(exp['expect'])
        sm = difflib.SequenceMatcher(None, tw, ew, autojunk=False)
        hit = set()
        for b in sm.get_matching_blocks():
            for k in range(b.size): hit.add(b.a + k)
        cover = sum(b.size for b in sm.get_matching_blocks()) / max(1, len(ew))
        # sentences of the transcript
        sents, cur = [], []
        for i, w in enumerate(W):
            cur.append(i)
            if re.search(r'[.!?]["\']?$', w[0].strip()) or i == len(W) - 1: sents.append(cur); cur = []
        keep = [s for s in sents if any(i in hit for i in s)]
        need = 0.6 if exp['src'] in ('comment', 'tuple') else 0.5
        if cover >= need and keep:
            k0, k1 = keep[0][0], keep[-1][-1]
            drop_before = [i for s in sents if s[-1] < k0 for i in s]
            drop_after = [i for s in sents if s[0] > k1 for i in s]
            # only real extra speech: ≥ 2 words, and the gap to cut in must exist
            if len(drop_after) >= 2 and not is_interj([W[i][0] for i in drop_after]):
                gap0, gap1 = W[k1][2], W[drop_after[0]][1]
                cut = quietest(db, gap0, max(gap0 + 0.02, gap1)) if gap1 > gap0 else gap0 + 0.04
                end = min(end, cut + 0.06); reasons.append('bleed-after'); drop_txt = ' '.join(W[i][0] for i in drop_after)
            if len(drop_before) >= 2 and not is_interj([W[i][0] for i in drop_before]):
                gap0, gap1 = W[drop_before[-1]][2], W[k0][1]
                cut = quietest(db, gap0, max(gap0 + 0.02, gap1)) if gap1 > gap0 else gap1 - 0.04
                start = max(start, cut - 0.04); reasons.append('bleed-before'); drop_txt = (drop_txt + ' | ' if drop_txt else '') + ' '.join(W[i][0] for i in drop_before)
            if reasons: keep_txt = ' '.join(W[i][0] for i in range(k0, k1 + 1)); stats['bleed'] += 1
        elif exp['src'] in ('comment', 'tuple') and len(ew) >= 3 and cover < 0.34:
            mism.append({'path': path, 'module': exp['module'], 'expect': exp['expect'], 'heard': ' '.join(w[0] for w in W)[:160], 'cover': round(cover, 2)})
            stats['mismatch'] += 1
    # dead air (re-measured inside the kept window)
    i0, i1 = int(start * 100), int(end * 100)
    lw = np.where(db[i0:i1] > thr)[0]
    if lw.size:
        on, off = (i0 + lw[0]) / 100, (i0 + lw[-1] + 1) / 100
        if on - start > 0.25: start = on - 0.06; reasons.append('lead-silence'); stats['lead'] += 1
        if end - off > 0.5: end = off + 0.2; reasons.append('tail-silence'); stats['tail'] += 1
    # click: loud right at the cut
    tail_db = float(np.max(db[max(0, int(end * 100) - 2):int(end * 100)])) if int(end * 100) > 2 else -99
    fade_out = 0.0
    if tail_db > peak - 12 and 'bleed-after' not in reasons: fade_out = 0.03; reasons.append('click'); stats['click'] += 1
    if reasons:
        plan[path] = {'start': round(max(0, start), 3), 'end': round(min(dur, end), 3), 'dur': round(dur, 3),
                      'fade_in': 0.012 if start > 0.001 else 0, 'fade_out': max(fade_out, 0.025 if end < dur - 0.001 else 0),
                      'reasons': reasons, 'keep': keep_txt, 'drop': drop_txt, 'modules': sorted({c['module'] for c in refs})}
json.dump(plan, open(os.path.join(OUT, 'plan.json'), 'w'), indent=1)
json.dump(mism, open(os.path.join(OUT, 'mismatch.json'), 'w'), indent=1)
print(json.dumps(stats), 'plan', len(plan), 'transcribed', len(tx))
