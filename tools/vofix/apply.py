# tools/vofix/apply.py — write the fixes in out/plan.json IN PLACE (same filename, same format / sample rate / channels), so
# every module, manifest and map keeps working untouched. Originals are backed up first (backup dir = argv[1]) and listed in
# out/applied.json, so any clip can be restored. Skips clips whose cut would leave < 0.25 s.
# usage: python3 apply.py <backup_dir> [--only bleed|silence|click|all] [--dry]
import json, os, subprocess, sys, shutil
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'tools/vofix/out')
backup = sys.argv[1]; only = (sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else 'all'); dry = '--dry' in sys.argv
plan = json.load(open(os.path.join(OUT, 'plan.json')))
GROUP = {'bleed-after': 'bleed', 'bleed-before': 'bleed', 'lead-silence': 'silence', 'tail-silence': 'silence', 'click': 'click'}
def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels,codec_name,bit_rate', '-of', 'json', p], capture_output=True, text=True)
    s = (json.loads(r.stdout or '{}').get('streams') or [{}])[0]
    return int(s.get('sample_rate') or 44100), int(s.get('channels') or 1), s.get('codec_name'), int(s.get('bit_rate') or 0)
prev = json.load(open(os.path.join(OUT, 'applied.json'))) if os.path.exists(os.path.join(OUT, 'applied.json')) else {'applied': {}}
applied, skipped = dict(prev.get('applied', {})), []
for path, P in plan.items():
    if only != 'all' and not any(GROUP.get(r) == only for r in P['reasons']): continue
    ap = os.path.join(ROOT, path)
    if not os.path.exists(ap) or path in prev.get('applied', {}): continue   # never re-trim an already-fixed clip
    start, end = P['start'], P['end']
    if end - start < 0.25: skipped.append([path, 'too-short']); continue
    sr, ch, codec, br = probe(ap)
    ext = os.path.splitext(ap)[1].lower()
    enc = {'.mp3': ['-c:a', 'libmp3lame', '-q:a', '2'], '.m4a': ['-c:a', 'aac', '-b:a', f'{max(128, br // 1000 or 160)}k'], '.ogg': ['-c:a', 'vorbis', '-strict', '-2', '-q:a', '6'], '.wav': ['-c:a', 'pcm_s16le']}.get(ext)
    if not enc: skipped.append([path, 'format']); continue
    af = []
    if P['fade_in']: af.append(f"afade=t=in:st=0:d={P['fade_in']}")
    if P['fade_out']: af.append(f"afade=t=out:st={max(0, end - start - P['fade_out']):.3f}:d={P['fade_out']}")
    if dry: applied[path] = P; continue
    bp = os.path.join(backup, path)
    os.makedirs(os.path.dirname(bp), exist_ok=True)
    if not os.path.exists(bp): shutil.copy2(ap, bp)
    tmp = ap + '.vofix' + ext
    cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.3f}', '-to', f'{end:.3f}', '-i', bp, '-ar', str(sr), '-ac', str(2 if ext == '.ogg' else ch)] + (['-af', ','.join(af)] if af else []) + enc + ['-map_metadata', '-1', tmp]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode or not os.path.exists(tmp) or os.path.getsize(tmp) < 500:
        skipped.append([path, 'ffmpeg: ' + r.stderr[:120]]);
        if os.path.exists(tmp): os.remove(tmp)
        continue
    os.replace(tmp, ap); applied[path] = P
json.dump({'backup': backup, 'applied': applied, 'skipped': skipped}, open(os.path.join(OUT, 'applied.json'), 'w'), indent=1)
print('applied', len(applied), 'skipped', len(skipped), 'dry' if dry else '')
