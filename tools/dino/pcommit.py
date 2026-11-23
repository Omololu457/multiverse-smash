#!/usr/bin/env python3
"""MSV1-DINO private-index commit (never touches the shared index's foreign entries or anyone's worktree WIP).

  python3 tools/dino/pcommit.py --msg MSGFILE [--hooks a.js,b.js] PATH...

1. a private index from the CURRENT HEAD; 2. add the listed Dino-owned PATHs (files or dirs; __pycache__ / out skipped);
3. the listed shared files get HEAD's blob + this tool's hook lines (tools/dino/hooks.py blobs); 4. index.html stamped by
tools/stamp_version.mjs inside a scratch export of that tree (what the pre-commit hook would do); 5. commit-tree +
update-ref main (compare-and-swap on the old HEAD); 6. the shared index takes the new HEAD entries for exactly these paths
(`git reset -q HEAD -- paths`), and index.html in the worktree is refreshed only if it was clean.
"""
import os, sys, subprocess, tempfile, shutil, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap = argparse.ArgumentParser(); ap.add_argument('--msg', default=''); ap.add_argument('--hooks', default=''); ap.add_argument('--export', default=''); ap.add_argument('paths', nargs='*')
a = ap.parse_args()
def git(*args, env=None, inp=None):
    r = subprocess.run(['git', *args], cwd=ROOT, env=env, input=inp, capture_output=True)
    if r.returncode: sys.exit(f"git {' '.join(args)} failed: {r.stderr.decode()}")
    return r.stdout.decode().strip()
old = git('rev-parse', 'HEAD')
idx = os.path.join(ROOT, '.git', 'dino_private_index')
env = {**os.environ, 'GIT_INDEX_FILE': idx}
git('read-tree', old, env=env)
files = []
for p in a.paths:
    full = os.path.join(ROOT, p)
    if os.path.isdir(full):
        for d, ds, fs in os.walk(full):
            ds[:] = [x for x in ds if x not in ('__pycache__', 'out')]
            files += [os.path.relpath(os.path.join(d, f), ROOT) for f in fs if not f.endswith('.pyc') and f != '.DS_Store']
    elif os.path.exists(full): files.append(p)
    else: sys.exit(f'missing {p}')
for i in range(0, len(files), 200): git('add', '-f', '--', *files[i:i + 200], env=env)
hooked = [h for h in a.hooks.split(',') if h]
if hooked:
    r = subprocess.run([sys.executable, 'tools/dino/hooks.py', 'blobs', old], cwd=ROOT, env={**os.environ, 'DINO_FILES': ','.join(hooked)}, capture_output=True)
    if r.returncode: sys.exit('hooks failed: ' + r.stderr.decode())
    for line in r.stdout.decode().split('\n'):
        if not line.strip(): continue
        f, blob = line.split()
        git('update-index', '--cacheinfo', f'100644,{blob},{f}', env=env)
# stamp index.html in a scratch export of exactly this tree
tmp = tempfile.mkdtemp(prefix='dino_stamp_')
try:
    git('checkout-index', '-a', f'--prefix={tmp}/', env=env)
    subprocess.run(['node', 'tools/stamp_version.mjs'], cwd=tmp, check=True, capture_output=True)
    blob = git('hash-object', '-w', os.path.join(tmp, 'index.html'))
    git('update-index', '--cacheinfo', f'100644,{blob},index.html', env=env)
finally: shutil.rmtree(tmp, ignore_errors=True)
if a.export:   # dry run: write the exact tree that would be committed to a folder (render check), commit nothing
    os.makedirs(a.export, exist_ok=True); git('checkout-index', '-a', f'--prefix={a.export.rstrip("/")}/', env=env); os.remove(idx); print('exported', a.export); sys.exit(0)
tree = git('write-tree', env=env)
new = git('commit-tree', tree, '-p', old, '-F', a.msg)
git('update-ref', 'refs/heads/main', new, old)
changed = git('diff', '--name-only', old, new).split('\n')
was_clean_html = subprocess.run(['git', 'diff', '--quiet', old, '--', 'index.html'], cwd=ROOT).returncode == 0
for i in range(0, len(changed), 200): git('reset', '-q', new, '--', *changed[i:i + 200])
if was_clean_html: open(os.path.join(ROOT, 'index.html'), 'wb').write(subprocess.run(['git', 'show', f'{new}:index.html'], cwd=ROOT, capture_output=True).stdout)
os.remove(idx)
print(new, len(changed), 'paths')
