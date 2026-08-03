#!/usr/bin/env python3
"""Generate Goku Black's 12 creative alt-skins (__<tag>.png) across BOTH tiers (base + SSJ Rose).

Recolors BOTH tiers so a skin stays consistent through the transform:
  * BASE tier — the 17 sheets in characters.goku_black.animationData (retagged by skins.js recolorSkinAnim).
  * ROSE tier — the 18 SSJ_ROSE_ANIM sheets (abilities.js retagFormAnim(SSJ_ROSE_ANIM, fighter._recolorTag)).

THE HARD PART (same failure mode as the deleted SSG pilot): the GI and the HAIR are BOTH near-black in the
base sprite, so colour alone can't separate them, AND the warm-tan face/neck skin sits right between them.
Regions (captured from the ORIGINAL first, contamination-proof — same as gen_gold_creative / gen_omega):
  * SKIN  — warm tan face/neck. EXPLICITLY EXCLUDED from EVERY pass, at every brightness (this is the
            pilot's exact bug — a recolour bleeding onto the neck). Never added to any mask.
  * GI     — the near-black/gray outfit: dark & low-sat, BELOW the per-frame chin line (the torso/limbs).
            The primary identity colour. Works for both tiers (the gi is black in base AND Rose).
  * TRIM   — the white boots/gloves (sat<0.18, val>=0.52).
  * HAIR   — dark & low-sat ABOVE the chin (base black hair) + optional pink (Rose hair, hue 300-358).
            Recoloured ONLY for skins that opt in (`hair`); otherwise left natural (black base / pink Rose).
  * AURA   — bright energy FX (val>=0.72) on the CHARGE/KI/beam sheets only — tinted to the skin's aura hue.

Per-frame CHIN line = lowest warm-skin row in the head band (the pilot's face_chin_y): the GI/HAIR spatial
split. NECK_MARGIN=0 (no row below the chin is ever treated as hair — the pilot's fix). LINE-ART GUARD:
masks never select outline pixels; a `floor` keeps dark targets a clear margin above outline-black so plates
never fuse. Multi-tone preserved via tone-remap. Cosmetic only; zero gameplay.
"""
import os, sys, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

BASE_FW = {"black_goku_idle.png":31,"black_goku_run.png":66,"black_goku_dash.png":88,"black_goku_jump.png":69,"black_goku_jump_2.png":50,"black_goku_hit.png":69,"black_goku_get_up.png":69,"black_goku_block.png":52,"black_goku_front_attack.png":65,"black_goku_ki_slash.png":112,"black_goku_kick_attack.png":65,"black_goku_air_attack.png":56,"black_goku_base_attack.png":53,"black_goku_transformation_to_ssj_rose.png":36,"black_goku_power_up_uniform.png":112,"black_goku_kamehameha.png":95,"black_goku_spirit_bomb.png":53}
ROSE_FW = {"goku_black_ssj_rose_idle.png":29,"goku_black_ssj_rose_run.png":58,"goku_black_ssj_rose_dash.png":65,"goku_black_ssj_rose_jump.pmg.png":49,"goku_black_ssj_rose_hit.png":71,"goku_black_ssj_rose_get_up.png":71,"goku_black_ssj_rose_gaurd.png":46,"goku_black_ssj_rose_charge_uniform.png":112,"goku_black_ssj_rose_foward_attack.png":65,"goku_black_ssj_rose_ki_slash.png":108,"goku_black_ssj_rose_up_attack.png":43,"goku_black_ssj_rose_down_attack.png":63,"goku_black_ssj_rose_idle_2.png":52,"goku_black_ssj_rose_kamehameha.png":95,"goku_black_ssj_rose_spirit_bomb.png":53,"goku_black_ssj_rose_electric_ki_push.png":64,"goku_black_ssj_rose_electric_slash.png":65,"goku_black_ssj_rose_super_ki_slash.png":80}
# FX sheets that carry energy → eligible for the AURA tint pass.
AURA_SHEETS = {"black_goku_power_up_uniform.png","black_goku_ki_slash.png","black_goku_kamehameha.png","black_goku_spirit_bomb.png",
               "goku_black_ssj_rose_charge_uniform.png","goku_black_ssj_rose_ki_slash.png","goku_black_ssj_rose_kamehameha.png","goku_black_ssj_rose_spirit_bomb.png","goku_black_ssj_rose_super_ki_slash.png"}

def hsv(p): h,s,v = colorsys.rgb_to_hsv(p[0]/255,p[1]/255,p[2]/255); return h*360,s,v

# ── SKIN — the untouchable warm-tan face/neck (bright AND shadowed). Never in any mask. ──
def is_skin(h,s,v):
    if 8 <= h <= 52 and s >= 0.22 and v >= 0.28: return True          # lit tan
    if 6 <= h <= 45 and s >= 0.14 and 0.18 <= v < 0.28: return True    # shadowed jaw/neck tan
    return False
def is_trim(h,s,v):  return s < 0.18 and v >= 0.52                     # white boots/gloves
def is_gidark(h,s,v):return s < 0.42 and 0.05 <= v < 0.52              # dark/gray gi cloth
def is_hairdark(h,s,v): return s < 0.55 and v < 0.42                   # near-black hair (base)
def is_pink(h,s,v):  return (h >= 300 or h <= 10) and s >= 0.15 and v >= 0.32  # Rose pink hair (hue wraps ~0)
def is_aura(h,s,v):  return v >= 0.72                                  # bright energy (FX sheets)

def frame_chin(px, x0, x1, H):
    ys = [y for y in range(H) for x in range(x0,x1) if px[x,y][3] >= 128]
    if not ys: return None, None, None
    yt, yb = min(ys), max(ys); sh = max(1, yb-yt)
    hb = yt + int(0.45*sh)
    sk = [y for y in range(yt, hb+1) for x in range(x0,x1)
          if px[x,y][3] >= 128 and is_skin(*hsv(px[x,y]))]
    return (max(sk) if sk else None), yt, sh

def paint(px, idxs, target_hex, spread=1.0, to_sat=None, floor=0.0):
    if not idxs: return 0
    th, ts, tv = rgb_hsv(*hex2rgb(target_hex))
    if to_sat is not None: ts = to_sat
    pivot = sum(rgb_hsv(px[i*4],px[i*4+1],px[i*4+2])[2] for i in idxs)/len(idxs)
    for i in idxs:
        _, _, v = rgb_hsv(px[i*4],px[i*4+1],px[i*4+2])
        nv = max(floor, min(1.0, tv + (v-pivot)*spread))
        nr,ng,nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4]=max(0,min(255,round(nr*255))); px[i*4+1]=max(0,min(255,round(ng*255))); px[i*4+2]=max(0,min(255,round(nb*255)))
    return len(idxs)

def recolor(path, fw, tag, cfg):
    fname = os.path.basename(path)
    img = Image.open(path).convert("RGBA"); W,H = img.size
    px = bytearray(img.tobytes())
    aura_ok = fname in AURA_SHEETS and cfg.get("aura")
    masks = {"gi":[], "trim":[], "hair":[], "aura":[]}
    pxl = img.load()
    nframes = (W + fw - 1)//fw
    for f in range(nframes):
        x0, x1 = f*fw, min(f*fw+fw, W)
        chin, yt, sh = frame_chin(pxl, x0, x1, H)
        for y in range(H):
            for x in range(x0, x1):
                i = y*W + x
                if px[i*4+3] == 0: continue
                h,s,v = hsv((px[i*4],px[i*4+1],px[i*4+2]))
                if is_skin(h,s,v): continue                      # NEVER touch skin
                above = (chin is not None and y <= chin)
                if aura_ok and is_aura(h,s,v): masks["aura"].append(i); continue
                # TRIM is body-wear (boots/gloves): below the chin only — never grab hair highlights above the face
                if is_trim(h,s,v) and (chin is None or y > chin): masks["trim"].append(i); continue
                if cfg.get("hair") and above and (is_hairdark(h,s,v) or (cfg.get("hair_pink") and is_pink(h,s,v))):
                    masks["hair"].append(i); continue
                # GI: dark cloth below the chin (or anywhere if this frame has no detectable head)
                if is_gidark(h,s,v) and (chin is None or y > chin):
                    masks["gi"].append(i); continue
    total = 0
    for name in ("gi","trim","hair","aura"):
        spec = cfg.get(name)
        if not spec: continue
        hexv = spec[0]; to_sat = spec[1] if len(spec)>1 else None
        spread = spec[2] if len(spec)>2 else 1.0
        floor  = spec[3] if len(spec)>3 else 0.0
        total += paint(px, masks[name], hexv, spread=spread, to_sat=to_sat, floor=floor)
    Image.frombytes("RGBA",(W,H),bytes(px)).save(path[:-4]+f"__{tag}.png")
    return total

# ── trim / aura presets ──
T_BLACK=("#141418",0.10,1.35,0.13); T_SILVER=("#C6C6CC",0.04); T_GOLD=("#C79A2E",None); T_DKRED=("#6E1F26",None)
# ── 12 SKINS: region -> (hex, [to_sat], [spread], [floor]) ──
SKINS = {
    # 1 VOID SOVEREIGN — near-black everything (+ procedural red-ember overlay, game.js). hair recoloured (incl Rose pink).
    "voidsovereign": dict(gi=("#141419",0.12,1.4,0.13), trim=("#141419",0.12,1.4,0.13), hair=("#141419",0.12,1.4,0.13), hair_pink=True),
    # 2 AZURE TYRANT — deep blue gi, silver trim, black aura tint
    "azuretyrant":   dict(gi=("#1E3A6B",None),           trim=T_SILVER, aura=("#12131F",0.20,1.2,0.08)),
    # 3 EMERALD RIFT — deep green gi, black trim, green aura
    "emeraldrift":   dict(gi=("#1E5A2E",None),           trim=T_BLACK,  aura=("#2E8A3E",0.55)),
    # 4 OBSIDIAN GODHOOD — near-black gi, single vivid-gold trim accent
    "obsidian":      dict(gi=("#16161A",0.12,1.45,0.14), trim=("#D4A02E",None)),
    # 5 CRIMSON JUDGMENT — blood-red gi, black trim, red aura
    "crimson":       dict(gi=("#7A1620",None),           trim=T_BLACK,  aura=("#B02226",0.60)),
    # 6 IVORY DECREE — white/pale gi, black trim, pale-gold aura
    "ivory":         dict(gi=("#DEDCD4",0.05,1.1),       trim=T_BLACK,  aura=("#D8BE6E",0.42)),
    # 7 AMETHYST VOID — deep purple gi, black trim, purple aura
    "amethyst":      dict(gi=("#4B2E7A",None),           trim=T_BLACK,  aura=("#8A4FB0",0.55)),
    # 8 SUNFIRE EMPEROR — orange-gold gi, black trim, amber aura
    "sunfire":       dict(gi=("#C8791E",None),           trim=T_BLACK,  aura=("#E8A83C",0.60)),
    # 9 TEAL ECLIPSE — deep teal gi, black trim, teal aura
    "teal":          dict(gi=("#166B66",None),           trim=T_BLACK,  aura=("#2EA89E",0.55)),
    # 10 ASHEN KING — muted charcoal-gray gi, dark-red trim, desaturated aura
    "ashen":         dict(gi=("#46464E",0.10,1.15,0.12), trim=T_DKRED,  aura=("#6B5A5A",0.18)),
    # 11 ROSE SHADOW — gi → black, KEEP the pink hair/aura (riff on default Rose). No hair pass = pink stays.
    "roseshadow":    dict(gi=("#141419",0.12,1.4,0.13),  trim=T_BLACK),
    # 12 GOLDEN TYRANT — rich gold gi, black trim, gold aura
    "goldentyrant":  dict(gi=("#C79A2E",None),           trim=T_BLACK,  aura=("#E8C64A",0.55)),
}

PORTRAIT = "goku_black_mug_shot.png"   # SSJ-Rose bust; single frame (fw = image width)
def targets():
    out = [(os.path.join(ROOT,n), fw) for n,fw in {**BASE_FW, **ROSE_FW}.items()]
    pp = os.path.join(ROOT, PORTRAIT)
    if os.path.exists(pp):
        out.append((pp, Image.open(pp).size[0]))   # 1 frame across the full width
    return out

def build(tag, only=None):
    cfg = SKINS[tag]; total = 0
    for path, fw in targets():
        if only and only not in path: continue
        if not os.path.exists(path): print(f"  SKIP(missing) {os.path.basename(path)}"); continue
        c = recolor(path, fw, tag, cfg); total += c
        print(f"  {c:7d}px  {os.path.basename(path)}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in (None, "all"):
        for t in SKINS: print(f"\n=== {t} ==="); build(t, only)
    else:
        build(tag, only)

if __name__ == "__main__":
    main()
