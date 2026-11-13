# tools/sanji_build/frames.py — Sanji source-frame table + mask-based cutter (shared by extract.py).
# Rects are inclusive sheet coords from the connected-component pass (tools/zoro_build/components.py, gap 1).
# A frame = every opaque pixel inside its rect whose 8-connected component's centre lies inside the rect
# (so a neighbour's stray limb that pokes into the rect is never copied). Pure pixel copy, no resampling.
from PIL import Image

FRAMES = {
 # R1 — 6: stance/idle set + two kicks with BLUE motion arcs (F5, F6)
 'R1F1': (4, 0, 37, 53), 'R1F2': (49, 14, 77, 54), 'R1F3': (87, 3, 112, 54),
 'R1F4': (121, 2, 158, 54), 'R1F5': (167, 2, 209, 53), 'R1F6': (224, 3, 274, 53),
 # R2 — 3: knee/front kick, BIG blue crescent kick, long low front kick
 'R2F1': (2, 71, 35, 122), 'R2F2': (50, 63, 97, 123), 'R2F3': (107, 75, 157, 123),
 # R3 — 5: tuck, HANDSTAND kick (blue arc), handstand split, one-hand low sweep, handstand rising kick
 'R3F1': (1, 145, 27, 188), 'R3F2': (42, 137, 105, 189), 'R3F3': (114, 152, 177, 189),
 'R3F4': (184, 150, 227, 188), 'R3F5': (243, 141, 301, 188),
 # R4 — 11: somersault, crouch, high kick (blue arc), axe kick raised, stance, swirl kick, front kick,
 #          knee, rising knee, low back-sweep, low lunge kick
 'R4F1': (0, 222, 36, 257), 'R4F2': (46, 211, 78, 257), 'R4F3': (86, 204, 133, 257),
 'R4F4': (138, 205, 188, 257), 'R4F5': (200, 204, 235, 257), 'R4F6': (246, 203, 274, 257),
 'R4F7': (281, 205, 327, 256), 'R4F8': (336, 208, 365, 258), 'R4F9': (376, 211, 411, 258),
 'R4F10': (416, 215, 467, 258), 'R4F11': (471, 214, 513, 258),
 # R5 — 11 (+4 steam specks): serving the PLATE (roast on a dish) F1-F7, crouches F8-F9, leap F10, plate alone F11
 'R5F1': (1, 273, 34, 335), 'R5F2': (44, 280, 85, 335), 'R5F3': (89, 279, 133, 335),
 'R5F4': (138, 278, 180, 336), 'R5F5': (186, 277, 221, 336), 'R5F6': (224, 277, 262, 336),
 'R5F7': (275, 298, 306, 335), 'R5F8': (314, 296, 339, 334), 'R5F9': (348, 300, 370, 334),
 'R5F10': (380, 275, 407, 332), 'R5F11': (413, 318, 434, 335),
 # R6 — 6: hands-in-pockets standing poses, CIGARETTE in mouth
 'R6F1': (8, 347, 25, 401), 'R6F2': (32, 346, 49, 401), 'R6F3': (50, 346, 71, 401),
 'R6F4': (76, 347, 98, 401), 'R6F5': (111, 346, 129, 401), 'R6F6': (135, 347, 152, 401),
 # R7 — 6: smoking poses (smoke puff) F1-F3, hunched hurt F4, kneeling F5 (+sweat), lying knockdown F6
 'R7F1': (7, 412, 30, 465), 'R7F2': (39, 412, 62, 465), 'R7F3': (68, 412, 91, 465),
 'R7F4': (99, 414, 124, 465), 'R7F5': (137, 420, 172, 465), 'R7F6': (185, 446, 220, 465),
 # R8 — 2: "love mode" serving a COCKTAIL GLASS on a tray
 'R8F1': (7, 475, 34, 522), 'R8F2': (44, 475, 71, 522),
 # R9 — 4: rising front-kick series (low → high)
 'R9F1': (7, 530, 45, 582), 'R9F2': (56, 530, 93, 582), 'R9F3': (102, 531, 134, 582), 'R9F4': (143, 531, 175, 582),
}
# R9 right side: Going Merry figurehead + credit text panels share one component (224,529)-(387,582).
MERRY_CREDIT = (224, 529, 387, 582)

_sheet = None; _comp = None; _cent = None
def load(src):
    global _sheet, _comp, _cent
    _sheet = Image.open(src).convert('RGBA'); W, H = _sheet.size; a = _sheet.getchannel('A').load()
    lab = [[-1] * W for _ in range(H)]; cents = []
    for y in range(H):
        for x in range(W):
            if a[x, y] and lab[y][x] < 0:
                k = len(cents); st = [(x, y)]; lab[y][x] = k; pts = []
                while st:
                    cx, cy = st.pop(); pts.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H and a[nx, ny] and lab[ny][nx] < 0:
                                lab[ny][nx] = k; st.append((nx, ny))
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                cents.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2))
    _comp, _cent = lab, cents
    return _sheet

def cut(fid, rect=None):
    x0, y0, x1, y1 = rect or FRAMES[fid]
    out = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0)); p = _sheet.load(); o = out.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            k = _comp[y][x]
            if k < 0: continue
            cx, cy = _cent[k]
            if x0 <= cx <= x1 and y0 <= cy <= y1: o[x - x0, y - y0] = p[x, y]
    return out
