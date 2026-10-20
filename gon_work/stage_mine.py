import subprocess, sys
def hunks(f):
    d = subprocess.run(["git","diff","-U3","--",f],capture_output=True,text=True).stdout
    lines = d.splitlines(keepends=True); i=0; hdr=[]
    while i<len(lines) and not lines[i].startswith("@@"): hdr.append(lines[i]); i+=1
    chunks=[]; cur=None
    for l in lines[i:]:
        if l.startswith("@@"):
            if cur: chunks.append(cur)
            cur=[l]
        elif cur is not None: cur.append(l)
    if cur: chunks.append(cur)
    return "".join(hdr), chunks
def keep(c):
    ch=[l for l in c if (l[:1] in "+-") and not l.startswith(("+++","---"))]
    t="".join(ch).lower(); return ("gon" in t) and not any(k in t for k in ("shizuku","meruem"))
f=sys.argv[1]; hdr,chunks=hunks(f); kept=[c for c in chunks if keep(c)]
patch=hdr+"".join("".join(c) for c in kept)
r=subprocess.run(["git","apply","--cached"],input=patch,capture_output=True,text=True)
print(f"{f}: kept {len(kept)}/{len(chunks)} hunks  {'OK' if r.returncode==0 else 'FAIL: '+r.stderr[:300]}")
