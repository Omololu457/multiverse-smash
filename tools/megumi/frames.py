"""Megumi Fushiguro — EXACT frame rectangles on the supplied sheet (1920x4230), authored by hand from the
row/column audit (docs/megumi/SPRITE_MAP.md). No uniform grid: every frame is an explicit x-interval inside an
explicit y-band of ORIGINAL pixels; a pixel belongs to a frame iff it is opaque after cleaning and inside that rect.
Rects deliberately exclude: the black label boxes, the white '/' sequence separators, the right-hand technique
captions, the 'MISS' / 'HIT' tags, the snowflake logo (top right), the signature mark (bottom right) and the
bracket ticks (handled in clean.py). 'split' = one rect holding two touching frames, cut at the emptiest column of
its middle third (asserted in extract.py).

Each entry: name -> list of (x0, x1, y0, y1) or ('split', x0, x1, y0, y1)."""

def row(y0, y1, xs):
    return [(a, b, y0, y1) if not isinstance(a, str) else (a, b[0], b[1], y0, y1) for a, b in xs]

def X(*pairs):
    return [(a, b) for a, b in pairs]

def S(a, b):
    return ('split', (a, b))

G = {}
# ── movement / stance ──
G['stance'] = row(60, 116, X((18, 46), (53, 81), (89, 117), (120, 147)))
G['move'] = row(160, 206, X((14, 53), (67, 106), (119, 150), (162, 193), (202, 241), (254, 293), (308, 340), (355, 384)))
G['jump'] = row(270, 342, X((17, 44), (51, 76))) + row(245, 342, X((88, 122), (130, 168), (171, 209), (217, 252), (255, 290),
            (293, 327), (338, 372), (385, 419), (428, 453), (459, 487)))
# ── 'guard' row: three sequences separated by '/' (x 253-281 and 681-710 excluded) ──
G['guardA'] = row(395, 456, X((8, 35), (42, 67), (74, 100), (107, 134), (139, 166), (174, 199), (215, 242)))
G['guardB'] = row(395, 456, X((293, 321), (327, 352), (359, 386), (392, 419), (425, 455), (462, 491), (497, 526)) + [S(533, 594)] +
              X((602, 627), (643, 670)))
G['guardC'] = row(395, 456, X((721, 749), (755, 781), (787, 814), (823, 855), (862, 895), (903, 931), (938, 966), (975, 1004),
              (1014, 1043), (1051, 1077), (1093, 1120)))
# ── 'specially action' (shadow pool + stored weapons rising) ──
G['special'] = row(512, 563, X((16, 43), (50, 75), (89, 114), (121, 161), (180, 248), (259, 327), (334, 402), (411, 479),
               (487, 555), (564, 604), (617, 643), (660, 685), (703, 730)))
# ── weak attack: A fist (x 8-338) / B sword (389-1187) / C staff + pale-blue slash (next row) ──
G['weakA'] = row(598, 660, X((8, 35), (42, 67), (74, 102), (109, 143), (148, 193), (197, 224), (232, 261), (270, 295), (311, 338)))
G['weakB'] = row(598, 660, X((389, 416), (423, 448), (458, 482), (504, 547), (550, 593), (599, 629), (647, 709), (722, 819),
             (832, 899), (922, 975), (989, 1032), (1037, 1080), (1085, 1109), (1118, 1144), (1160, 1187)))
G['weakC'] = row(682, 743, X((59, 86), (93, 118), (125, 155), (165, 197), (210, 243), (254, 305), (317, 362), (366, 417),
             (424, 470), (479, 525), (533, 564), (570, 596), (612, 639)))
G['wfwdA'] = row(784, 846, X((19, 42), (49, 72), (80, 122), (128, 172), (179, 210), (215, 243)))
G['wfwdB'] = row(784, 846, X((297, 321), (343, 386), (392, 436), (447, 471), (481, 530), (537, 615), (625, 692), (702, 734),
             (741, 785), (789, 832), (837, 861)))
G['wfwdC'] = row(784, 846, X((925, 952), (959, 984), (995, 1033), (1045, 1090), (1103, 1147), (1151, 1234), (1238, 1288),
             (1294, 1335), (1344, 1385), (1394, 1430), (1440, 1465), (1481, 1508)))
G['wupA'] = row(888, 969, X((15, 41), (49, 74), (82, 112), (122, 152), (159, 183), (192, 217)))
G['wupB'] = row(888, 969, X((280, 305), (326, 370), (376, 419), (430, 455), (465, 513), (523, 587), (603, 668), (678, 720),
            (730, 769), (773, 816), (821, 864), (868, 893)))
G['wupC'] = row(888, 969, X((949, 976), (983, 1008), (1020, 1045), (1061, 1086), (1099, 1124), (1129, 1180), (1188, 1233),
            (1240, 1305), (1310, 1360), (1371, 1421), (1426, 1467), (1474, 1501)))
# ── weak + down = Toad (Gama) summon gesture + the ground Toad ──
G['toadM'] = row(996, 1078, X((15, 42), (49, 75), (86, 112), (129, 155), (171, 196), (212, 239)))
G['toad'] = row(996, 1078, X((303, 324), (330, 351), (355, 376), (383, 404), (412, 433), (447, 478), (484, 529), (537, 570),
            (575, 626), (637, 678), (687, 718), (725, 746), (755, 776), (787, 808)))
# ── weak + air = air gesture + the sheet's winged Toad ──
G['airToadM'] = row(1120, 1189, [S(17, 93)] + X((102, 121), (137, 156), (166, 201), (212, 250)))
G['airToad'] = row(1096, 1189, X((297, 327), (339, 369), (378, 409), (417, 448), (457, 488), (499, 541), (547, 603), (613, 653),
               (658, 710), (716, 767), (775, 817), (822, 853), (859, 889), (900, 930)))
# ── strong attack = Nue (ground) ──
G['nueM'] = row(1230, 1288, [(18, 45)] + [S(52, 114)] + X((131, 163), (173, 198), (214, 241)))
G['nue'] = row(1192, 1288, X((300, 341), (351, 392), (405, 464), (472, 535), (545, 608), (625, 691), (704, 792), (802, 865), (875, 937)))
# ── strong + forward = Divine Dogs (black row above, white row below) ──
G['dogM'] = row(1366, 1420, X((18, 45), (52, 77), (82, 111), (120, 145), (153, 179), (194, 221)))
G['dogBlack'] = row(1328, 1364, X((259, 314), (330, 385), (395, 450), (458, 520), (530, 592)))
G['dogWhite'] = row(1383, 1420, X((263, 318), (334, 390), (399, 455), (462, 524), (534, 596)))
# ── strong + up = Great Serpent (Orochi) ──
G['serpentM'] = row(1500, 1555, X((17, 44), (51, 76), (87, 115), (130, 158), (172, 198), (213, 240)))
G['serpent'] = row(1580, 1764, X((24, 36), (44, 57), (65, 82), (92, 124), (135, 169), (187, 225), (242, 280)))
# ── strong + down = Rabbit Escape (Datto); sheet note 'X6' ──
G['rabbitM'] = row(1835, 1888, X((20, 47), (53, 79), (90, 116), (133, 159), (175, 200), (216, 243)))
G['rabbit'] = row(1835, 1888, X((268, 289), (295, 316), (319, 343), (349, 376), (383, 407), (417, 438), (442, 464), (470, 491)))
# ── strong + air = air gesture + Nue's lightning dive ──
G['airNueM'] = row(1940, 2010, [S(12, 89)] + X((98, 117), (132, 152), (161, 197), (206, 246)))
G['airNue'] = row(1900, 2010, X((273, 317), (336, 380), (399, 466), (484, 573), (581, 686), (692, 814), (838, 906), (909, 953),
              (971, 1015), (1034, 1078)))
# ── special 1: Divine Dog: Totality (Gyokuken: Kon) — hand sign, MISS branch, HIT branch ──
G['signKon'] = row(2050, 2132, X((19, 46), (53, 78), (87, 112), (132, 184), (194, 249), (259, 313), (326, 388), (399, 466),
               (476, 500), (511, 537), (546, 570), (580, 604), (613, 638), (654, 681)))
G['konMiss'] = [(41, 138, 2195, 2275), (153, 249, 2195, 2275), (275, 395, 2195, 2275), (407, 528, 2195, 2275), (533, 617, 2195, 2275),
                (626, 723, 2212, 2275), (732, 829, 2195, 2275)]
G['konHit'] = row(2328, 2402, X((62, 134), (148, 255), (270, 388), (391, 498), (509, 604), (611, 703), (717, 825), (829, 921),
              (930, 1027), (1037, 1134)))
# ── special 2: Max Elephant (Banshō) — hand sign, then the elephant + water sequence ──
G['signElephant'] = row(2486, 2562, X((24, 52), (58, 84), (93, 117), (138, 190), (200, 255), (265, 319), (332, 394), (405, 471),
                    (481, 506), (514, 542), (548, 574), (583, 611), (627, 658), (669, 695), (711, 738)))
G['elephant'] = row(2604, 2686, X((48, 148), (180, 282), (312, 441), (476, 617), (640, 805), (840, 1022), (1051, 1242), (1290, 1492),
                (1510, 1794))) + row(2825, 2907, X((75, 358), (391, 673), (702, 978), (1017, 1296), (1319, 1501), (1517, 1619), (1643, 1743)))
# ── special 1: Mahoraga (Makora) — hand sign, emergence (shadow pillars), sword sweep, return ──
G['signMahoraga'] = row(2984, 3062, X((28, 55), (62, 87), (96, 121), (141, 193), (203, 258), (269, 322), (335, 397), (408, 475), (485, 509)))
G['mahoraga'] = row(3088, 3320, X((29, 77), (85, 139), (144, 201), (203, 291), (294, 376), (383, 468), (473, 567), (577, 676),
                (684, 787), (797, 902), (915, 1014), (1042, 1138), (1164, 1211))) + \
                row(3370, 3530, X((48, 97), (100, 154), (156, 210), (223, 366), (368, 529), (536, 700), (705, 875), (875, 1049),
                (1052, 1182), (1195, 1236), (1249, 1289), (1303, 1360), (1364, 1419), (1427, 1475), (1538, 1578), (1588, 1628)))
# ── special 2: domain expansion Chimera Shadow Garden (Kangō An'eitei) ──
G['signDomain'] = row(3606, 3680, X((48, 75), (81, 107), (116, 140), (161, 213), (223, 278), (288, 342), (355, 417), (428, 494), (505, 529)))
G['domain'] = row(3714, 3770, X((40, 64), (82, 108), (132, 174), (194, 244), (256, 347), (369, 551), (560, 828), (837, 1114),
              (1122, 1417), (1433, 1757))) + row(3810, 3866, X((34, 358), (383, 689), (697, 721), (730, 755), (771, 798)))
# ── damage / win / lose ──
G['damage'] = row(3924, 3978, X((50, 74), (81, 116), (126, 154), (158, 229), (235, 272), (277, 322), (330, 374), (382, 414),
              (423, 449), (457, 485)))
G['win'] = row(4015, 4092, X((41, 68), (75, 100), (111, 138), (154, 198), (213, 258), (268, 328), (335, 397), (408, 502), (506, 598),
           (612, 654), (666, 725)))
G['lose'] = row(4130, 4205, X((39, 66), (73, 99), (107, 130), (137, 164), (170, 196)))

# Figure family per group: which anchor rule applies (extract.py).
#   'megumi'   head-template match (Megumi's hair + face), y = band ground line (air groups: own feet)
#   'mahoraga' head-template match on Mahoraga's white head; y = the band ground line
#   'summon'   bottom-centre of the creature core (electric / slash pixels excluded); y = band ground line
#   'left'     elephant: x = body rump (bbox left) + fixed body half-width; the trunk / water extend forward
MEGUMI_GROUPS = ['stance', 'move', 'jump', 'guardA', 'guardB', 'guardC', 'special', 'weakA', 'weakB', 'weakC', 'wfwdA', 'wfwdB',
                 'wfwdC', 'wupA', 'wupB', 'wupC', 'toadM', 'airToadM', 'nueM', 'dogM', 'serpentM', 'rabbitM', 'airNueM', 'signKon',
                 'signElephant', 'signMahoraga', 'signDomain', 'domain', 'damage', 'win', 'lose']
AIR_GROUPS = {'airToadM', 'airNueM'}           # drawn airborne on the sheet: anchor at their own feet
OWN_FEET = {('jump', i) for i in range(3, 7)} | {('damage', i) for i in (3, 4)}
SUMMON_GROUPS = ['toad', 'airToad', 'nue', 'dogBlack', 'dogWhite', 'serpent', 'rabbit', 'airNue', 'konMiss', 'konHit']
LEFT_GROUPS = ['elephant']
MAHORAGA_GROUPS = ['mahoraga']
