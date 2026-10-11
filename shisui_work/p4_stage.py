import subprocess, os, tempfile
def head(f): return subprocess.run(["git","show",f"HEAD:{f}"],capture_output=True,text=True).stdout
def wt(f): return open(f,encoding="utf-8").read()
FOREIGN=["goku_rose","gogeta","madara_war","madarawar","executemadara","rosedragon"]
def verify_stage(f,newtext,token):
    h=head(f)
    a=tempfile.NamedTemporaryFile("w",delete=False,suffix=".h",encoding="utf-8");a.write(h);a.close()
    b=tempfile.NamedTemporaryFile("w",delete=False,suffix=".n",encoding="utf-8");b.write(newtext);b.close()
    diff=subprocess.run(["git","diff","--no-index",a.name,b.name],capture_output=True,text=True).stdout
    os.unlink(a.name);os.unlink(b.name)
    adds=[l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    bad=[l for l in adds if any(k in l.lower() for k in FOREIGN) and not l.strip().startswith("//")]
    if bad: print(f"  ✗ {f}: FOREIGN leak:");[print("   ",x[:70]) for x in bad[:3]];return False
    if token not in " ".join(adds): print(f"  ✗ {f}: no {token}");return False
    sha=subprocess.run(["git","hash-object","-w","--stdin"],input=newtext,capture_output=True,text=True).stdout.strip()
    subprocess.run(["git","update-index","--cacheinfo",f"100644,{sha},{f}"],check=True)
    print(f"  ✓ {f}: staged mine-only (+{len(adds)} vs HEAD, {sha[:8]})");return True
ok=True
# abilities.js — extract P4 Trinity block + the one-line stageLeft/sl change is inside it (the corner check)
f="abilities.js";H=head(f);W=wt(f);L=W.split("\n")
s=next(k for k,l in enumerate(L) if "PHASE 4: THE TRINITY SYSTEM (MK1 mechanics translated)" in l)
while s>0 and L[s-1].lstrip().startswith("//"): s-=1
e=next(k for k in range(s,len(L)) if L[k].startswith("export function triggerSpecial(fighter, context = {})"))
block=L[s:e]
new=H.replace("export function triggerSpecial(fighter, context = {})","\n".join(block)+"\nexport function triggerSpecial(fighter, context = {})",1)
ok&=verify_stage(f,new,"THE TRINITY SYSTEM")
# skins.js — insert my green entry after the shisui_trinity default
f="skins.js";H=head(f)
anchor='''  shisui_trinity: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shisui_trinity?.portrait, spriteScale: characters.shisui_trinity?.spriteScale, animationData: null },
  ],'''
repl='''  shisui_trinity: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shisui_trinity?.portrait, spriteScale: characters.shisui_trinity?.spriteScale, animationData: null },
    // THE LOYALIST's green-vest colourway (from N's in-sheet COLOR PALETTE). LOYALIST ONLY — the hidden Blade/
    // Puppeteer identities keep their own art (no __green sheets for them). gen_shisui_green.py recolors the flak vest.
    { id: "shisuiGreen", name: "Leaf Green (Alt)", unlockLevel: 0, portrait: recolorPortrait("shisui_trinity", "green"), spriteScale: characters.shisui_trinity?.spriteScale, animationData: recolorSkinAnim("shisui_trinity", "green"), recolorTag: "green" },
  ],'''
assert anchor in H, "skins anchor missing in HEAD"
ok&=verify_stage(f,H.replace(anchor,repl),"shisuiGreen")
print("ok:",ok)
