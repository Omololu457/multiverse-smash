import subprocess, os, tempfile
def head(f): return subprocess.run(["git","show",f"HEAD:{f}"],capture_output=True,text=True).stdout
def wt(f): return open(f,encoding="utf-8").read()
FOREIGN=["goku_rose","gogeta","madara","rosedragon","_madara"]
def block(src, start_marker, end_marker):
    i=src.index(start_marker); j=src.index(end_marker, i); return src[i:j]
# my NEW puppeteer-susanoo block (worktree) and the OLD one (HEAD), swap in HEAD
W=wt("abilities.js"); H=head("abilities.js")
START="function firePuppeteerSusanooStance(fighter, context) {"
END="\n// ══ THE PUPPETEER — ULTIMATE: KOTOAMATSUKAMI"
newblk=block(W, START, END)
oldblk=block(H, START, END)
assert START in H and END in H, "markers missing in HEAD"
newtext=H.replace(oldblk, newblk, 1)
# verify: diff HEAD vs newtext adds no foreign
a=tempfile.NamedTemporaryFile("w",delete=False,encoding="utf-8");a.write(H);a.close()
b=tempfile.NamedTemporaryFile("w",delete=False,encoding="utf-8");b.write(newtext);b.close()
diff=subprocess.run(["git","diff","--no-index",a.name,b.name],capture_output=True,text=True).stdout
os.unlink(a.name);os.unlink(b.name)
adds=[l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
bad=[l for l in adds if any(k in l.lower() for k in FOREIGN) and not l.strip().startswith("//")]
if bad:
    print("FOREIGN LEAK:");[print("  ",x[:70]) for x in bad[:5]]
else:
    sha=subprocess.run(["git","hash-object","-w","--stdin"],input=newtext,capture_output=True,text=True).stdout.strip()
    subprocess.run(["git","update-index","--cacheinfo",f"100644,{sha},abilities.js"],check=True)
    print(f"  ✓ abilities.js staged mine-only (+{len(adds)} vs HEAD, {sha[:8]})")
