import subprocess, sys, os, tempfile

def head(f): return subprocess.run(["git","show",f"HEAD:{f}"],capture_output=True,text=True).stdout
def wt(f):   return open(f,encoding="utf-8").read()

def brace_block(lines, start_idx):
    """from a line that opens a { ... } object/fn, return end index (inclusive) at matching close at col0 '}'."""
    depth=0; started=False
    for i in range(start_idx, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if "{" in lines[i]: started=True
        if started and depth<=0:
            return i
    raise RuntimeError("no brace match")

def extract(wtlines, start_marker_substr, open_decl_substr):
    """find start = first line containing start_marker_substr (and back up over leading // ═ comment lines),
       find the decl line containing open_decl_substr at/after start, brace-match to its close. Return block lines."""
    s=None
    for i,l in enumerate(wtlines):
        if start_marker_substr in l: s=i; break
    if s is None: raise RuntimeError(f"start marker not found: {start_marker_substr}")
    # back up over contiguous leading comment/banner lines belonging to the block
    while s>0 and wtlines[s-1].lstrip().startswith("//"):
        s-=1
    d=None
    for i in range(s, len(wtlines)):
        if open_decl_substr in wtlines[i]: d=i; break
    e=brace_block(wtlines, d)
    return wtlines[s:e+1]

def verify_and_stage(f, newtext):
    h=head(f)
    # write temp and diff vs HEAD
    with tempfile.NamedTemporaryFile("w",suffix=".tmp",delete=False,encoding="utf-8") as t:
        t.write(newtext); tmp=t.name
    with tempfile.NamedTemporaryFile("w",suffix=".head",delete=False,encoding="utf-8") as t:
        t.write(h); htmp=t.name
    diff=subprocess.run(["git","diff","--no-index",htmp,tmp],capture_output=True,text=True).stdout
    added=[l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    removed=[l[1:] for l in diff.splitlines() if l.startswith("-") and not l.startswith("---")]
    blob=" ".join(added+removed).lower()
    foreign=any(k in blob for k in ["goku_rose","gokurose","rosé","rose_3","rosekameha","roseki","rose ki","super saiyan rosé"])
    shisui="shisui" in blob
    os.unlink(tmp); os.unlink(htmp)
    if foreign:
        print(f"  ✗ {f}: FOREIGN content present in mine-only build — ABORT"); 
        for l in added:
            if any(k in l.lower() for k in ["goku_rose","rosé","rose_3","roseki","rosekameha"]): print("     foreign+:",l[:80])
        return False
    if not shisui:
        print(f"  ✗ {f}: no shisui content — ABORT"); return False
    # stage: hash-object -w then update-index
    sha=subprocess.run(["git","hash-object","-w","--stdin"],input=newtext,capture_output=True,text=True).stdout.strip()
    subprocess.run(["git","update-index","--cacheinfo",f"100644,{sha},{f}"],check=True)
    print(f"  ✓ {f}: staged mine-only (+{len(added)}/-{len(removed)} vs HEAD, blob {sha[:8]})")
    return True

ok=True

# ---- characters.js ----
f="characters.js"; H=head(f).split("\n"); W=wt(f).split("\n")
block=extract(W, "SHISUI (TRINITY) — ONE roster slot", "const shisuiTrinity = {")
# insert before 'export const characters = {'
out=[]
for l in H:
    if l.startswith("export const characters = {"):
        out.extend(block); out.append("")
    out.append(l)
new="\n".join(out)
# export entry
new=new.replace(
"  naruto_seventh: narutoSeventh      // NEW additive standalone (Naruto / Seventh Hokage) — built from the padakun H sheet; all others untouched\n}",
"  naruto_seventh: narutoSeventh,     // NEW additive standalone (Naruto / Seventh Hokage) — built from the padakun H sheet; all others untouched\n  shisui_trinity: shisuiTrinity      // NEW additive — MK1-Ghostface 3-identity fighter (Loyalist form, P1); Blade/Puppeteer identities added in later phases\n}")
ok &= verify_and_stage(f, new)

# ---- abilities.js ----
f="abilities.js"; H=head(f).split("\n"); W=wt(f).split("\n")
block=extract(W, "SHISUI (TRINITY) — MK1-Ghostface 3-identity fighter", "const SHISUI_KEYS = new Set")
# block currently ends at close of SHISUI_KEYS set line? No — need the WHOLE shisui region up to end of executeShisuiTrinityUltimate.
# Re-extract: start marker -> end = line before 'export function triggerSpecial'
s=None
for i,l in enumerate(W):
    if "SHISUI (TRINITY) — MK1-Ghostface 3-identity fighter" in l: s=i; break
while s>0 and W[s-1].lstrip().startswith("//"): s-=1
e=None
for i in range(s,len(W)):
    if W[i].startswith("export function triggerSpecial(fighter, context = {})"): e=i; break
block=W[s:e]  # up to (not incl) export function; includes trailing blank line
out=[]
for l in H:
    if l.startswith("export function triggerSpecial(fighter, context = {})"):
        out.extend(block)
    out.append(l)
new="\n".join(out)
new=new.replace(
'    case "ghostface_exe": return executeGhostfaceExeSpecial(fighter, context)   // BILLY (base): Special = IDENTITY SWAP (Down+Sp → Sasuke / Up+Sp → Deathstroke). While swapped, rosterKey is sasuke/deathstroke → routes to THEIR special above.',
'    case "ghostface_exe": return executeGhostfaceExeSpecial(fighter, context)   // BILLY (base): Special = IDENTITY SWAP (Down+Sp → Sasuke / Up+Sp → Deathstroke). While swapped, rosterKey is sasuke/deathstroke → routes to THEIR special above.\n    case "shisui_trinity": return executeShisuiTrinitySpecial(fighter, context)   // SHISUI — THE LOYALIST: Fwd=Backstab / N=Fireball / B=Genjutsu Grab / D=Kunai Rain / U=Flurry. Blade/Puppeteer identities (P2/P3) add their own cases.')
new=new.replace(
'      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); break   // Kuchiyose: Gamabunta — summon→committed sure-hit slash (half on block)',
'      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); break   // Kuchiyose: Gamabunta — summon→committed sure-hit slash (half on block)\n      case "shisui_trinity": cast = executeShisuiTrinityUltimate(fighter, context); break   // SHISUI — THE LOYALIST: Susanoo Tsukumo (ribcage + magatama + needle volley). Blade/Puppeteer ults (P2/P3) add their own cases.')
ok &= verify_and_stage(f, new)

print("characters+abilities done:", ok)

# ---- skins.js ----
f="skins.js"; H=head(f)
anchor='    { id: "kwarEmerald",  name: "Emerald",        unlockLevel: 0, portrait: recolorPortrait("kakashi_war", "emerald"),  spriteScale: characters.kakashi_war?.spriteScale, animationData: recolorSkinAnim("kakashi_war", "emerald"),  recolorTag: "emerald" },  // emerald-themed hair/outfit\n  ],\n  kakashi: ['
repl=anchor.replace('  ],\n  kakashi: [',
'''  ],
  // Shisui (Trinity) — REQUIRED default entry so getSkins() carries the real spriteScale (1.4) instead of
  // clobbering it to 1 (the bug that shrank Omololu / Sasuke-Adult). The Loyalist's green-vest colour
  // variant (from N's in-sheet COLOR PALETTE) is added in a later phase.
  shisui_trinity: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shisui_trinity?.portrait, spriteScale: characters.shisui_trinity?.spriteScale, animationData: null },
  ],
  kakashi: [''')
assert anchor in H, "skins anchor missing in HEAD"
ok &= verify_and_stage(f, H.replace(anchor, repl))

# ---- spritesheets.js ----
f="spritesheets.js"; H=head(f)
anchor='  kakashi_war: {\n    actions: { idle: "./kakashi_war_idle_uniform.png" }\n  },\n'
add=anchor+'''
  // Shisui (Trinity) — MK1-Ghostface 3-identity fighter. GATES spritesReady() only (decodes idle → flips
  // from procedural box to sprite); per-action rendering reads the `sheet` paths from characters.js →
  // shisui_trinity.animationData (shisui_trinity_*_uniform.png, Altair jonin sheet, border-flood-fill keyed).
  // The hidden identity defs (shisui_blade / shisui_puppeteer) get their own gate entries in later phases.
  shisui_trinity: {
    actions: { idle: "./shisui_trinity_idle_uniform.png" }
  },
'''
assert anchor in H, "spritesheets anchor missing in HEAD"
ok &= verify_and_stage(f, H.replace(anchor, add))

# ---- sprite.js ----
f="sprite.js"; H=head(f)
anchor='  down_air: "down_air",\n  // Gaara — Sand Bullet throw cast poses'
add='''  down_air: "down_air",
  // Shisui (Trinity) — THE LOYALIST special cast poses (_spriteCastMove). Identity maps so a cast recovery
  // tail never resolves to the fallback box. (Backstab / Fireball / Genjutsu Grab / Kunai Rain / Flurry / Susanoo.)
  shiBackstab: "shiBackstab", shiFireball: "shiFireball", shiGenjutsu: "shiGenjutsu",
  shiKunaiRain: "shiKunaiRain", shiFlurry: "shiFlurry", shiArmslam: "shiArmslam", shiSusanoo: "shiSusanoo",
  // Gaara — Sand Bullet throw cast poses'''
assert anchor in H, "sprite anchor missing in HEAD"
ok &= verify_and_stage(f, H.replace(anchor, add))

# ---- credits.js ----
f="credits.js"; H=head(f)
anchor='    files:   ["naruto_seventh_*.png"]\n  },\n  // Dark Vegeta'
# pull my shisui credits block from worktree (contiguous) to avoid retyping
Wc=wt(f)
import re
mstart=Wc.index('  // Shisui (Trinity) — a THREE-identity fighter built from THREE separate fan sprite sheets')
mend=Wc.index('  // Dark Vegeta', mstart)
myblock=Wc[mstart:mend]
assert anchor in H, "credits anchor missing in HEAD"
new=H.replace('    files:   ["naruto_seventh_*.png"]\n  },\n  // Dark Vegeta',
              '    files:   ["naruto_seventh_*.png"]\n  },\n'+myblock+'  // Dark Vegeta')
ok &= verify_and_stage(f, new)

print("ALL surgical staging ok:", ok)
