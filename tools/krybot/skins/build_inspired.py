#!/usr/bin/env python3
"""Krybot crossover-palette skins ("— Inspired"). Requires Pillow; never edits base art or Codex's build.py output.

REUSES the existing semantic region masks written by tools/krybot/skins/build.py (assets/krybot/skins/masks/<cell>.png,
regions documented in docs/skins/krybot/region_mapping.json) and the SAME finite-ramp method: every source colour index
(build.COLORS) maps to one RGB per material. No hue filters, no new geometry, outlines/alpha/pivots stay source pixels,
original energy/explosion strips untouched. Run build.py first (masks), then this:
    python3 tools/krybot/skins/build_inspired.py        (from the repo root)
Outputs assets/krybot/skins/<tag>/<action>.png + portrait.png for each tag below, and rebuilds
docs/skins/krybot/skins_contact.png (default + every alternate, 8 evidence poses each).
"""
from pathlib import Path
import sys, json
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build as B   # constants only (main() is __main__-guarded): COLORS, RAMPS, META, ROOT

ROOT, OUT, DOC = B.ROOT, B.OUT, B.DOC
O = (33, 24, 16)    # source outline colour — always index 0 of every ramp
def R(*c): return [O, *c]

# Ramps follow build.RAMPS' shape: 'metal' (helmet/silver armor/weapon tip), 'dark' (undersuit/hands/feet),
# 'plates' (existing shoulder/chest/knee plates), 'sensor' (red head sensors), 'circuit' (red chest circuitry).
INSPIRED = {
  # A. ALIEN X — Inspired: void-black/charcoal body, green sensors; the game's generic Alien X starfield is drawn on
  #    top because the skin id ends in "AlienX" (game.js drawAlienXStarfield).
  'alienx': {'metal': R((14,15,18),(20,22,26),(30,32,38),(42,45,52),(58,62,70),(78,83,92)),
             'dark':  R((6,6,8),(9,9,12),(12,13,16),(16,17,21),(21,22,27),(27,29,34)),
             'plates':R((16,17,20),(24,26,30),(34,37,43),(48,52,60),(66,71,80),(88,94,104)),
             'sensor':(70,255,130),'circuit':(40,205,95)},
  # B. UPGRADE — Inspired: black body, glowing green circuit plates and sensors.
  'upgrade':{'metal': R((10,12,10),(16,19,16),(24,28,24),(34,40,34),(48,56,48),(66,76,66)),
             'dark':  R((5,7,5),(8,10,8),(11,14,11),(15,18,15),(19,23,19),(24,29,24)),
             'plates':R((0,60,20),(0,95,35),(20,140,55),(60,190,90),(110,230,130),(170,255,180)),
             'sensor':(130,255,150),'circuit':(80,255,110)},
  # C. HEATBLAST — Inspired: charred-rock armor, magma undersuit, fire-orange plates, yellow-hot sensors.
  'heatblast':{'metal':R((40,22,16),(60,32,20),(88,46,26),(118,62,32),(150,82,40),(182,104,52)),
             'dark':  R((60,8,4),(84,14,6),(110,22,8),(140,34,10),(172,50,12),(204,70,16)),
             'plates':R((160,40,0),(210,80,0),(240,130,10),(255,180,40),(255,220,90),(255,245,170)),
             'sensor':(255,230,80),'circuit':(255,140,20)},
  # D. DIAMONDHEAD — Inspired: green crystal helmet/armor, black undersuit, white plates.
  'diamondhead':{'metal':R((10,70,60),(20,110,90),(40,160,130),(90,210,175),(150,240,210),(210,255,240)),
             'dark':  R((14,16,18),(22,25,28),(32,36,40),(44,49,54),(58,64,70),(74,80,88)),
             'plates':R((90,95,100),(130,135,140),(170,175,180),(205,210,214),(230,234,236),(250,252,252)),
             'sensor':(90,255,190),'circuit':(120,255,210)},
  # E. XLR8 — Inspired: speed-blue armor, black undersuit, white plates, green visor sensors.
  'xlr8':   {'metal': R((10,30,70),(16,48,110),(30,72,160),(60,110,205),(110,160,235),(170,205,250)),
             'dark':  R((8,8,12),(12,12,18),(17,17,25),(23,23,33),(30,30,42),(38,38,52)),
             'plates':R((96,100,110),(140,144,152),(180,184,192),(212,215,222),(234,236,242),(250,251,253)),
             'sensor':(70,255,120),'circuit':(230,240,255)},
  # F. FOUR ARMS — Inspired: red armor, black undersuit, white plates, yellow sensors. (No extra arms — palette only.)
  'fourarms':{'metal':R((80,10,10),(120,18,16),(165,30,26),(205,52,44),(232,88,74),(250,130,115)),
             'dark':  R((10,8,8),(16,12,12),(23,18,18),(31,24,24),(40,31,31),(50,40,40)),
             'plates':R((100,100,104),(140,140,145),(180,180,184),(210,210,214),(234,234,236),(250,250,250)),
             'sensor':(255,215,40),'circuit':(255,200,60)},
  # ── second batch (user request via the S.P.D. Red session) ──
  # Shared crossover trio with Alien X: Ben 10 (green jacket armor, black undersuit, white plates) and Albedo (pale + red).
  'ben10':  {'metal': R((10,50,14),(16,72,20),(24,96,28),(36,124,38),(52,150,52),(72,176,70)),
             'dark':  R((10,10,10),(15,15,15),(21,21,21),(28,28,28),(36,36,36),(46,46,46)),
             'plates':R((100,100,104),(140,140,145),(180,180,184),(210,210,214),(234,234,236),(250,250,250)),
             'sensor':(90,255,90),'circuit':(60,230,60)},
  'albedo': {'metal': R((96,96,100),(124,124,128),(152,152,156),(180,180,184),(206,206,210),(232,232,236)),
             'dark':  R((44,44,48),(56,56,60),(68,68,72),(82,82,86),(96,96,100),(112,112,116)),
             'plates':R((90,6,6),(130,8,8),(170,16,14),(205,30,26),(232,54,46),(250,90,80)),
             'sensor':(255,40,30),'circuit':(230,30,24)},
  # Squad-leader palettes: ONLY the helmet shell + sensors change (ordinary-Krybot body). Not the Blue-Head / Orange-Head
  # models (different geometry — still pending real art, see NEEDS_ART.md).
  'leaderblue':  {'metal': B.RAMPS['tv']['metal'], 'dark': B.RAMPS['tv']['dark'], 'plates': B.RAMPS['tv']['plates'],
             'helmet':R((8,24,70),(14,40,110),(24,62,160),(46,96,210),(90,140,240),(150,190,255)),
             'sensor':(120,220,255),'circuit':B.RAMPS['tv']['circuit']},
  'leaderorange':{'metal': B.RAMPS['tv']['metal'], 'dark': B.RAMPS['tv']['dark'], 'plates': B.RAMPS['tv']['plates'],
             'helmet':R((90,30,0),(140,52,0),(190,80,6),(230,116,20),(250,156,50),(255,200,110)),
             'sensor':(255,236,120),'circuit':B.RAMPS['tv']['circuit']},
  # Gruumm's Elite Guard: villain purple armor, gold plates.
  'gruumm': {'metal': R((36,6,54),(54,12,78),(74,20,104),(98,32,134),(124,48,164),(152,70,194)),
             'dark':  R((12,4,18),(18,6,26),(24,9,34),(31,12,44),(40,16,56),(50,21,70)),
             'plates':R((110,80,10),(160,120,20),(200,156,32),(230,190,56),(250,220,100),(255,240,160)),
             'sensor':(255,220,80),'circuit':(240,190,50)},
  # Broodwing's Arsenal: dark bat purple, sickly green circuitry.
  'broodwing':{'metal':R((26,14,32),(38,22,46),(52,30,62),(68,40,80),(86,52,100),(106,66,122)),
             'dark':  R((10,6,12),(14,9,17),(19,12,23),(24,16,29),(30,20,36),(37,25,44)),
             'plates':R((40,20,48),(58,30,68),(78,42,90),(100,56,114),(124,72,140),(150,92,168)),
             'sensor':(170,255,60),'circuit':(140,230,40)},
  # Mora's Toy Army: candy colours — pink helmet, mint armor, lemon plates, lavender undersuit, cyan sensors.
  'mora':   {'metal': R((40,120,96),(64,160,128),(96,196,160),(132,224,190),(176,242,216),(220,255,240)),
             'helmet':R((150,30,90),(200,50,124),(236,84,160),(250,130,190),(255,176,216),(255,214,236)),
             'dark':  R((70,50,110),(88,66,134),(108,84,158),(130,104,182),(152,126,204),(176,152,224)),
             'plates':R((170,140,10),(210,180,30),(240,214,60),(252,234,100),(255,246,150),(255,252,200)),
             'sensor':(60,230,255),'circuit':(255,110,190)},
  # Rust Bucket: scrapyard rust armor, oxidised bronze plates.
  'rust':   {'metal': R((60,24,10),(90,38,14),(122,54,20),(156,74,30),(186,100,46),(212,130,70)),
             'dark':  R((26,16,10),(36,22,14),(46,29,18),(58,37,23),(70,46,29),(84,56,36)),
             'plates':R((44,70,56),(62,96,74),(84,120,92),(108,142,108),(140,164,124),(176,188,146)),
             'sensor':(255,150,40),'circuit':(200,110,40)},
  # Chrome Krybot: high-contrast mirror silver (dark troughs, bright speculars).
  'chrome': {'metal': R((30,34,42),(78,86,100),(150,158,172),(110,118,132),(206,212,224),(255,255,255)),
             'dark':  R((14,16,20),(24,27,32),(40,44,52),(32,35,42),(60,66,76),(90,98,110)),
             'plates':R((50,56,66),(110,118,132),(180,188,200),(140,148,162),(226,232,240),(255,255,255)),
             'sensor':(120,200,255),'circuit':(200,230,255)},
  # Delta Base Training Drone: S.P.D. white/blue test-target livery.
  'training':{'metal':R((120,128,140),(150,158,170),(178,186,198),(204,210,220),(226,230,238),(246,248,252)),
             'dark':  R((10,30,80),(16,44,110),(24,60,140),(36,80,170),(52,104,200),(76,132,226)),
             'plates':R((14,50,150),(24,72,190),(40,100,220),(70,130,240),(110,165,252),(160,200,255)),
             'sensor':(255,200,40),'circuit':(60,140,255)},
  # Krybot Gala Glitter: hot-pink chrome with baked glitter (same fixed integer hash as the One Piece glitter skins).
  'glitter':{'metal': R((110,10,60),(150,20,86),(190,36,116),(226,64,150),(246,110,184),(255,170,214)),
             'dark':  R((30,6,22),(42,9,30),(56,12,40),(72,16,52),(90,22,64),(110,28,78)),
             'plates':R((140,100,20),(190,150,40),(230,190,70),(250,220,110),(255,240,160),(255,250,210)),
             'sensor':(255,240,255),'circuit':(255,200,240), 'glitter':((255,205,238),(255,255,255))},
}


def _glitter(x, y):
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = (h ^ (h >> 16)) & 0xFFFF
    return h < int(0.07 * 65536), h < int(0.02 * 65536)
# Same frame order/pivots as build.py (asserted against the base strips' alpha below, so any drift fails loudly).
SEQ = {
  'idle':['idle0','idle1'],'walk':[f'run{i}'for i in range(8)],'walk_back':[f'run{i}'for i in range(7,-1,-1)],
  'run':[f'run{i}'for i in range(8)],'jump':['jump'],'fall':['tumble0'],'hurt':['recoil'],'guard':['guard'],'crouch':['guard'],
  'dash':[f'run{i}'for i in range(8)],'light':['punchWind','punch'],'kJ2':['punchWind','punch'],'kJ3':['kickWind','kick'],
  'heavy':['kickWind','kick'],'kLow':['kickWind','kick'],'up':['ready','jump'],'air':['kickWind','kick'],'down_air':['kick'],
  'kAdvance':['punchWind','punch'],'kChainKick':['kickWind','kick'],'kAway':['kickWind','kick'],'kBlaster':['ready','aim','lowerArm'],
  'kBreach':['punchWind','punch'],'kLeap':['jump','tumble0','tumble1','tumble2','tumble3','kick'],'kCover':['ready','aim'],
  'ultimate':['ready','aim'],'grab':['punchWind','punch'],'knockdown':[f'fall{i}'for i in range(4)],'getup':['fall2','guard','idle0'],'win':['idle0','idle1']}


# build.py's HEAD boxes for these three cells sit on the fist / arm rather than the head (harmless for whole-body ramps,
# where helmet and armor share a material). Helmet-only palettes use these corrected boxes, found as the topmost silver
# blob carrying the red sensor. Codex's masks are NOT modified; every non-helmet skin is unaffected.
HEAD_FIX = {'kick': [18, 2, 28, 14], 'kickWind': [12, 0, 22, 11], 'tumble3': [17, 2, 29, 12]}


def paint(im, mask, ramp, name=None):
    dest = im.copy(); px, mk, dp = im.load(), mask.load(), dest.load()
    hb = HEAD_FIX.get(name, B.HEAD.get(name)) if 'helmet' in ramp else None
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]; reg = mk[x, y]; rgb = p[:3]
            if not p[3] or not reg or reg == 1: continue
            if hb is not None:   # helmet-only palettes: re-derive head membership from the (corrected) head box
                inh = hb[0] <= x <= hb[2] and hb[1] <= y <= hb[3]
                if rgb == (181, 0, 0): reg = 3 if inh else 9
                elif reg == 2 and not inh: reg = 4
                elif reg == 4 and inh: reg = 2
            if reg == 3 and rgb != (181, 0, 0): continue          # black face apertures stay exact
            if reg in (3, 9): new = ramp['sensor' if reg == 3 else 'circuit']
            else:
                mat = 'helmet' if reg == 2 and 'helmet' in ramp else 'metal' if reg in (2, 4, 8) else 'plates' if reg == 10 else 'dark'
                new = ramp[mat][B.COLORS.index(rgb)]
                if ramp.get('glitter') and reg in (2, 4, 10):
                    g, w = _glitter(x, y)
                    if w: new = ramp['glitter'][1]
                    elif g: new = ramp['glitter'][0]
            dp[x, y] = (*new, p[3])
    return dest


def main():
    cells = [c for c in B.META['frames'] if c['kind'] == 'body']; anchors = {c['name']: c['anchor'] for c in cells}
    src = {c['name']: Image.open(ROOT / f"assets/krybot/cells/{c['name']}.png").convert('RGBA') for c in cells}
    masks = {n: Image.open(OUT / 'masks' / f'{n}.png') for n in src}
    images = {('default', n): im for n, im in src.items()}
    for tag, ramp in INSPIRED.items():
        for n, im in src.items(): images[tag, n] = paint(im, masks[n], ramp, n)
        folder = OUT / tag; folder.mkdir(exist_ok=True)
        for action, names in SEQ.items():
            strip = Image.new('RGBA', (112 * len(names), 88))
            for i, n in enumerate(names):
                ax, ay = anchors[n]; strip.paste(images[tag, n], (112 * i + 56 - ax, 80 - ay))
            base = Image.open(ROOT / f'assets/krybot/{action}.png').convert('RGBA')
            assert base.size == strip.size and base.getchannel('A').tobytes() == strip.getchannel('A').tobytes(), (tag, action)
            strip.save(folder / f'{action}.png', optimize=True)
        images[tag, 'idle0'].crop((8, 0, 29, 24)).resize((84, 96), Image.Resampling.NEAREST).save(folder / 'portrait.png')
    # Contact sheet from the SHIPPED strips (what the game draws): idle/walk/normal/blaster/hit/knockdown/helper/ultimate.
    rows = ['default', 'tv', 'ds', 'ds_red', *INSPIRED]
    poses = [('idle', 0), ('walk', 1), ('heavy', 1), ('kBlaster', 1), ('hurt', 0), ('knockdown', 3), ('kCover', 1), ('ultimate', 1)]
    labels = ['idle', 'walk', 'normal', 'blaster', 'hit reaction', 'knockdown', 'Covering Unit', 'ultimate ally']
    sheet = Image.new('RGB', (len(poses) * 150 + 110, len(rows) * 150), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    for r, tag in enumerate(rows):
        y = r * 150; d.text((6, y + 60), tag, fill='white')
        for c, (action, fr) in enumerate(poses):
            p = ROOT / ('assets/krybot' if tag == 'default' else f'assets/krybot/skins/{tag}') / f'{action}.png'
            cell = Image.open(p).convert('RGBA').crop((112 * fr, 0, 112 * fr + 112, 88)).resize((224, 176), Image.Resampling.NEAREST).crop((40, 20, 184, 176))
            x = 110 + c * 150; sheet.paste(cell, (x, y + 4), cell)
            if r == 0: d.text((x + 4, y + 2), labels[c], fill=(200, 220, 255))
    sheet.save(DOC / 'skins_contact.png')
    (DOC / 'inspired_ramps.json').write_text(json.dumps({'method': 'build.py masks + finite ramps (no hue filters)', 'ramps': INSPIRED}, indent=1) + '\n')
    print(f'Built {len(INSPIRED)} crossover palettes x {len(SEQ)} actions + portrait; contact sheet {DOC / "skins_contact.png"}')


if __name__ == '__main__': main()
