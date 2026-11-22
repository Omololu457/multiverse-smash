"""Build Kevin's versioned nearest-neighbor atlases. Run with Pillow from the repository root."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/kevin'
DOC = ROOT / 'docs/kevin'
SOURCE = 'kevin_ethan_levin_jus_sprite_sheet_by_regulardor8go_dcdyjul.png'
sheet = Image.open(ROOT / SOURCE).convert('RGBA')
assert sheet.size == (2118, 4936)
background = (52, 80, 116)
# [top,bottom), horizontal crop boundaries measured in the source. Optional anchors
# give body-center X (relative to the listed left) for wide poses or attached effects.
groups = {}
def row(name, top, bottom, spans, region, anchors=None, speed=5):
    groups[name] = (top, bottom, spans, region, anchors or {}, speed)

row('intro', 42, 97, [(1,146),(171,316),(347,492),(518,663),(689,723)], 'car', {0:116,1:100,2:57,3:55}, 12)
row('idle', 155, 210, [(5,40),(46,81),(87,122),(132,167)], 'human', speed=8)
row('run', 250, 305, [(7,43),(54,97),(116,151),(166,199),(220,255),(267,306),(327,364),(382,415)], 'human', speed=4)
row('jump', 345, 402, [(5,35),(50,80),(101,128),(149,179)], 'human')
row('guard', 439, 494, [(10,45),(61,95),(112,146),(161,196),(206,241),(253,288)], 'human', speed=4)
row('carFlash', 520, 574, [(9,49),(71,111),(146,186),(223,263),(293,333),(355,395),(422,457)], 'mixed')
row('punch', 610, 666, [(8,43),(56,98),(109,172),(188,230),(246,281)], 'human', {1:22,2:34,3:18})
row('kick', 718, 772, [(9,44),(65,114),(132,176)], 'human', {1:21,2:16})
row('launch', 824, 881, [(9,44),(71,117),(142,176)], 'human', {1:16})
row('sweep', 936, 992, [(3,38),(58,104),(121,162)], 'human', {1:18,2:18})
row('air', 1023, 1084, [(12,42),(53,80),(110,157),(168,210),(242,271),(291,325),(349,384),(399,427),(439,466)], 'human', {2:16,3:12})
row('apply', 1112, 1166, [(7,47),(69,109),(144,184),(221,261),(291,331),(353,393),(420,455),(504,539)], 'mixed')
row('samples', 1115, 1165, [(607,642),(703,738),(836,871),(941,976)], 'reference')
row('coatRun', 1204, 1257, [(8,44),(55,98),(117,152),(167,200),(221,256),(268,307),(328,365),(383,416)], 'coat', speed=4)
row('coatJump', 1290, 1346, [(9,39),(55,85),(106,133),(169,199)], 'coat')
row('coatKick', 1387, 1442, [(11,46),(67,116),(134,178)], 'coat', {1:21,2:16})
row('coatLaunch', 1474, 1532, [(6,41),(68,114),(139,173)], 'coat', {1:16})
row('coatSweep', 1582, 1636, [(8,43),(80,126),(143,184)], 'coat', {1:18,2:18})
row('coatAir', 1697, 1757, [(7,37),(48,75),(105,152),(163,205),(237,266),(286,320),(344,379),(394,422),(434,461)], 'coat', {2:16,3:12})
row('coatPunch', 1812, 1868, [(6,41),(54,96),(107,170),(186,228),(244,279)], 'coat', {1:22,2:34,3:18})
row('quarry', 1969, 2066, [(0,57),(63,143),(145,218),(224,268)], 'coat', {0:17,1:20,2:20,3:20}, 6)
row('boulder', 1925, 2067, [(270,330)], 'stone')
row('debris', 1912, 2067, [(357,410),(412,484),(488,581),(600,709),(714,830)], 'stone', speed=3)
row('shed', 2118, 2164, [(15,53),(83,122),(149,189),(211,250)], 'mixed')
row('sampleCar', 2447, 2503, [(522,667)], 'car')
row('carSample', 2447, 2503, [(686,726),(748,788),(823,863),(900,940),(970,1010),(1032,1072),(1099,1134),(1149,1184),(1197,1239),(1250,1313),(1329,1371),(1387,1422)], 'mixed', {9:34}, 4)
row('hurtSet', 2614, 2670, [(8,48),(60,96),(116,172),(190,220)], 'human', {2:29})
row('win', 2741, 2796, [(5,150),(179,324),(348,493),(542,687),(715,860)], 'car', {0:57,1:56,2:58,3:10,4:-50}, 14)
row('lose', 2872, 2929, [(12,47),(66,96),(114,144)], 'human', speed=12)
row('transform', 3097, 3168, [(353,388),(411,446),(458,492),(510,543),(608,661),(683,732)], 'transition', speed=5)
row('mutantIdle', 3228, 3298, [(10,59),(87,137),(162,221),(248,303)], 'mutant', speed=7)
row('mutantMove', 3347, 3430, [(9,72),(99,165),(186,249),(282,345)], 'mutant')
row('mutantClaw', 3465, 3534, [(9,55),(89,150),(179,240)], 'mutant', {1:25,2:25})
row('mutantShard', 3596, 3665, [(4,53),(83,132),(164,217),(242,291)], 'mutant')
row('shard', 3596, 3665, [(306,335)], 'energy')
row('mutantHalo', 3708, 3807, [(8,70),(79,146),(151,218),(232,306),(310,389),(390,466),(468,539)], 'mutant', {5:28,6:26})
row('mutantArc', 3864, 3961, [(8,65),(107,233),(281,442),(487,643),(680,830)], 'mutant', {0:23,1:26,2:31,3:31,4:30})
row('mutantAir', 4013, 4104, [(7,82),(100,173),(189,264),(302,378),(409,483)], 'mutant')
row('flame', 4012, 4105, [(505,546),(547,597),(598,660),(663,730),(733,802),(804,870),(870,934)], 'energy', speed=3)
row('revert', 4181, 4253, [(17,74),(89,150),(161,211),(214,259),(265,330),(344,408),(410,452),(463,507)], 'transition', speed=4)

# Hair, shirt, sleeves, jeans, car, crystal/body and emitted energy independently.
skins = [
 ('default','Alien Force — Default',None),
 ('event_horizon','Alien X — Event Horizon','273143 293849 465065 253148 39495A A8BBCF D7FFF4'),
 ('blacktop','Upgrade — Blacktop','293F37 254336 6CCB39 223F38 14A44F 53CB74 86FF45'),
 ('prism_heist','Chromastone — Prism Heist','754A9A 744BA6 B650AA 5E498A 8C49BB B986E1 FF77E8'),
 ('tomorrows_alloy','Superman — Tomorrow’s Alloy','455C91 3D70C7 BB3A4F 3B61AB 547ACD 76A7E4 FF664A'),
 ('cursed_rose','JJK — Cursed Rose','D77B9C 422E51 9D294A 433447 943655 AB536F FF526F'),
 ('limitless_chrome','JJK — Limitless Chrome','C5E0F7 30416F 7DB5E9 3D507F B8D5EA B9E8FF 53B9FF'),
 ('victory_alloy','Winning Valkyrie — Victory Alloy','B59A56 3D66C0 C74F55 356DD8 597DCE E3BF5F FFE377'),
 ('afterglow','Anodite — Afterglow','B87590 764DAF B165CB 674892 A85CC9 D687DD F887FF'),
 ('ghostforge','Ghostforge','BCD8D0 3F696B 597C83 47656B 6D938C 94C6B7 A6FFE7'),
 ('gilded_outlaw','Black Gold — Gilded Outlaw','806742 403A38 AC8240 504837 A78141 E0AF52 FFE16F'),
 ('glitterstorm','Opal — Glitterstorm','B199D9 B5BDDF CF91C2 A5B7DE E3B7DB C8B5E9 FFABDD'),
]
materials = {
 'taydenite': None,
 'steel': 'B1B1B1',
 'alloy': '08AC48',
 'rubber': '34455A',
 'armor': '820C6B',
 'stone': '9C8052',
}
def rgb(h):
    return tuple(bytes.fromhex(h))

def shade(c, ramp):
    # Preserve stepped luminance, dark linework and near-white highlights.
    light = (c[0]*3+c[1]*5+c[2]*2)/10
    t = min(1, light/230)
    return tuple(round(8 + (v-8)*t*.98 + 135*t**3*(1-v/255)) for v in rgb(ramp))

def recolor(im, region, skin, material, salt):
    if not skin and not material and region != 'quarryHuman':
        return im
    colors = skin.split() if skin else None
    w = im.width
    result = []
    for i, pixel in enumerate(im.getdata()):
        r,g,b,a = pixel
        x,y = i % w, i // w
        maxc, minc = max(r,g,b), min(r,g,b)
        teal = g > r+12 and b > r+8 and g >= b
        car_green = g > r+22 and g > b+16
        skin_tone = r > g+9 and g > b+8 and r > 97
        ramp = None
        human_pixels = region in ('human','mixed') or (region == 'car' and w < 66)
        if colors and a and human_pixels and 4 <= maxc <= 55 and maxc-minc <= 9:
            # The native shirt and hair interiors are near-black. Differentiate
            # their fills while retaining the zero-RGB outlines and shading steps.
            hair = y < im.height*.27
            tone = (108 if hair else 74) + maxc*1.1
            c = shade((tone,tone,tone), colors[0 if hair else 1])
            if colors[6] in ('D7FFF4','FFABDD') and (x*29+y*37+salt*3)%109 == 0:
                c = rgb(colors[6])
            result.append((*c,a))
            continue
        if a and maxc >= 23:
            if region == 'quarryHuman' and teal:
                # The only boulder-lift art is coated. Use a neutral human ramp
                # on its authored silhouette, leaving every rock/arc pixel in place.
                if y<im.height*.44:
                    ramp=colors[0] if colors else '413A36'
                elif y<im.height*.79:
                    ramp=colors[2] if colors else '827D76'
                else:
                    ramp=colors[3] if colors else '405376'
                result.append((*shade(pixel,ramp),a))
                continue
            if region in ('coat','mixed') and teal:
                c = shade(pixel, material) if material else pixel[:3]
                if colors:
                    accent = shade(pixel, colors[5])
                    c = tuple(round(p*.67+q*.33) for p,q in zip(c,accent))
                result.append((*c,a))
                continue
            if colors:
                if region == 'energy': ramp = colors[6] if maxc > 62 else None
                elif region == 'stone': ramp = colors[5]
                elif region in ('car','mixed') and car_green: ramp = colors[4]
                elif region in ('mutant','transition') and (region == 'mutant' or not skin_tone):
                    if g > 142 and r > 142 and b < g-35: ramp = colors[6]
                    elif teal: ramp = colors[5]
                    elif b > g+12: ramp = colors[1] if r < 30 else colors[3]
                    elif r > g+30: ramp = colors[2]
                    elif g > r+15: ramp = colors[4]
                elif region != 'reference' and not skin_tone:
                    if b > r+8: ramp = colors[3]
                    elif maxc-minc <= 13:
                        ramp = colors[0] if y < im.height*.30 and (region != 'car' or im.width < 65) else colors[1] if maxc < 55 else colors[2]
        c = shade(pixel, ramp) if ramp else pixel[:3]
        if ramp and colors[6] in ('D7FFF4','FFABDD') and (x*29+y*37+salt*3)%109 == 0 and 26 < maxc < 150:
            c = rgb(colors[6])
        result.append((*c,a))
    out = Image.new('RGBA', im.size)
    out.putdata(result)
    return out

def crop(rect):
    img = sheet.crop(rect)
    img.putdata([(0,0,0,0) if p[:3] == background else p for p in img.getdata()])
    return img

# Pack all forms/materials for a selected skin into one decode. FX strips use the same
# cropped frame data and their own exact origin/bounds in the generated ledger.
variants = {}
for name, data in groups.items():
    region = data[3]
    if region == 'reference':
        continue
    variants[name] = (name, None)
    if region in ('coat','mixed') and name not in ('carFlash','carSample'):
        for mat,ramp in materials.items():
            if ramp:
                variants[f'{name}_{mat}'] = (name, ramp)
    if name in ('hurtSet','guard','lose'):
        for mat,ramp in materials.items():
            variants[f'{name}_{mat}'] = (name, ramp or '7CCBB6')

variants['quarry_human'] = ('quarry', None)
layout = {}
ledger = {}
cursor_x = cursor_y = row_height = 0
atlas_w = 2048
for variant, (name, ramp) in variants.items():
    top,bottom,spans,region,anchors,speed = groups[name]
    cells = []
    for i,(x0,x1) in enumerate(spans):
        img = crop((x0,top,x1,bottom))
        box = img.getbbox()
        assert box, (name,i)
        x,y,r,b = box
        ax = anchors.get(i, (x+r)//2)
        # Baselines are feet/wheels, or bottom of the visual-only effect. High aerial
        # poses preserve the observed row's suspension around the physics root.
        foot = b
        if name == 'mutantArc':
            # Yellow discharge on frames two and three extends below the feet.
            # Measure the lowest red boot pixels independently of the discharge.
            boots = [j//img.width for j,(r0,g0,b0,a0) in enumerate(img.getdata())
                     if a0 and r0>100 and 1.4*g0<r0 and 1.2*b0<r0 and g0<65]
            foot = max(boots)+1 if boots else b
        hand_x = ax + (22 if region in ('mutant','transition') else 14)
        hand_y = max(y, foot - (43 if region in ('mutant','transition') else 33))
        cells.append((img.crop(box), ax-x, foot-y))
        if variant == name:
            ledger.setdefault(name, []).append({
                'id': f'{name}.{i+1:02}', 'source': [x0+x,top+y,r-x,b-y],
                'ticks': speed, 'foot': [ax-x,foot-y], 'hand': [hand_x-x,hand_y-y],
                'projectileOrigin': [hand_x-x,hand_y-y], 'visualBounds': [0,0,r-x,b-y]
            })
    half = max(max(ax, im.width-ax) for im,ax,_ in cells) + 1
    floor = max(ay for _,_,ay in cells)+1
    height = floor + max(im.height-ay for im,_,ay in cells)
    width = half*2
    if variant == 'quarry_human':
        region = 'quarryHuman'
    if width*len(cells) > atlas_w:
        raise ValueError(variant)
    if cursor_x + width*len(cells) > atlas_w:
        cursor_x = 0
        cursor_y += row_height
        row_height = 0
    region = 'dyed' if ramp and region == 'human' else region
    layout[variant] = ({'frames':len(cells),'width':width,'height':height,'speed':speed,
                        'sourceX':cursor_x,'sourceY':cursor_y,'originY':floor}, cells, region, ramp)
    cursor_x += width*len(cells)
    row_height = max(row_height,height)

for skin_id,label,colors in skins:
    atlas = Image.new('RGBA',(atlas_w,cursor_y+row_height))
    for variant,(pos,cells,region,ramp) in layout.items():
        for i,(img,ax,ay) in enumerate(cells):
            if region == 'dyed':
                # Legacy hurt/guard frames have no coated counterpart; remap their
                # opaque values to the same material ramp, preserving outlines.
                img = recolor(img,'stone',f'{ramp} '*7,None,i)
                region_here = 'coat'
                mat = None
            else:
                region_here,mat = region,ramp
                if region == 'transition' and ((variant == 'transform' and i < 4) or (variant == 'revert' and i > 0)):
                    region_here = 'human'
            img = recolor(img,region_here,colors,mat,i)
            atlas.paste(img,(pos['sourceX']+i*pos['width']+pos['width']//2-ax,
                             pos['sourceY']+pos['originY']-ay))
    atlas.save(OUT / f'{skin_id}-v1.png', optimize=True)
    k=layout['idle'][0]
    atlas.crop((k['sourceX'],k['sourceY'],k['sourceX']+k['width'],k['sourceY']+k['height'])).save(OUT/f'{skin_id}-portrait.png')

    samples = ['idle','apply','apply_steel','apply_alloy','apply_rubber','apply_armor','apply_stone','mutantIdle','sampleCar','mutantArc']
    if skin_id == 'default':
        palette_preview = Image.new('RGB',(1120,76*len(skins)),'#e3e6e9')
        palette_draw = ImageDraw.Draw(palette_preview)
    y=76*next(n for n,(key,_,_) in enumerate(skins) if key==skin_id)
    if (y//76)%2==1:
        palette_draw.rectangle((0,y,1120,y+75),fill='#1c2634')
    for i,name in enumerate(samples):
        x=233+i*81
        p=layout[name][0]
        fi=6 if name.startswith('apply') else 1 if name=='mutantArc' else 0
        left=p['sourceX']+fi*p['width']
        img=atlas.crop((left,p['sourceY'],left+p['width'],p['sourceY']+p['height']))
        img=img.crop(img.getbbox())
        img.thumbnail((78,62),Image.Resampling.NEAREST)
        palette_preview.paste(img,(x+(78-img.width)//2,y+68-img.height),img)
    palette_draw.text((10,y+33),label,fill='white' if (y//76)%2 else '#112031')

    if skin_id == 'default':
        preview_names = ['intro','idle','run','jump','guard','punch','kick','launch','sweep','air','apply','coatRun',
                         'coatJump','coatKick','coatLaunch','coatSweep','coatAir','coatPunch','quarry','quarry_human','boulder','debris','shed','sampleCar','carSample','hurtSet','win','lose',
                         'transform','mutantIdle','mutantMove','mutantClaw','mutantShard','shard',
                         'mutantHalo','mutantArc','mutantAir','flame','revert']
        height = sum(layout[n][0]['height']+20 for n in preview_names)
        width = max(118+layout[n][0]['width']*layout[n][0]['frames'] for n in preview_names)
        contact = Image.new('RGB',(width,height),'#192639')
        draw = ImageDraw.Draw(contact)
        y=0
        for name in preview_names:
            p=layout[name][0]
            draw.text((6,y+4),name,fill='white')
            for i in range(p['frames']):
                x=p['sourceX']+i*p['width']
                frame=atlas.crop((x,p['sourceY'],x+p['width'],p['sourceY']+p['height']))
                px=114+i*p['width']
                contact.paste(frame,(px,y+15),frame)
            y+=p['height']+20
        contact.save(DOC/'contact-sheet.png')

palette_preview.save(DOC/'skin-contact-sheet.png')

(DOC/'frame-map.json').write_text(json.dumps({
 'source':SOURCE,'sha256':hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest(),'size':list(sheet.size),'backgroundRGB':background,
 'rectFormat':'x, y, width, height; sockets relative to crop',
 'groups':ledger,
 'excluded':['red instruction labels','text and color swatches','large human and mutant portraits','large car-reference still',
             'four palette demonstration stances (color references)','sheet divider rules and isolated guide pixels']
},indent=2)+'\n')
(ROOT/'kevinAtlas.js').write_text('// Generated by tools/kevin/pack.py.\nexport const KEVIN_CELLS = '+json.dumps({k:v[0] for k,v in layout.items()},indent=2)
    +'\nexport const KEVIN_PALETTES = '+json.dumps(skins,ensure_ascii=False,indent=2)+'\n')
