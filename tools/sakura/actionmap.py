# Action regions: name -> (y0,y1,x0,x1,expected,min_gap). x1=901 means to-right-edge.
# y from detected bands (padded); x splits/expected from sheet map.
ACTIONS = {
 'palettes':     (233,313,  0,901, 4, 8),   # reference only (default+3)
 'intro':        (364,443,  0,901, 4, 6),
 'stance':       (516,588,  0,300, 4, 6),
 'dash':         (516,588,330,600, 3, 8),
 'run':          (643,707,  0,901, 6, 6),
 'jump':         (776,850,  0,250, 3, 6),
 'guard':        (776,850,240,430, 3, 6),
 'kawarimi':     (776,850,500,660, 1, 6),
 'damage_a':     (925,1005, 0,901, 8, 5),
 'damage_b':     (1044,1099,0,901, 4, 6),
 'combo_r1':     (1172,1249, 0,430, 3, 6),
 'combo2_r1':    (1172,1249,430,800,3, 6),
 'combo_r2':     (1262,1346, 0,430, 3, 6),
 'combo2_r2':    (1262,1346,430,800,3, 6),
 'combo_r3':     (1353,1450, 0,430, 3, 6),
 'combo2_r3':    (1353,1450,430,800,3, 6),
 'air_combo':    (1479,1586, 0,901,10, 5),
 'throw':        (1656,1742, 0,330, 4, 6),
 'throw_air':    (1656,1742,320,620, 4, 6),
 'chakra_charge':(1801,1873, 0,901, 4, 6),
 'strong':       (1932,2012, 0,901, 5, 6),
 'strong_fwd':   (2086,2160, 0,901, 5, 6),
 'strong_down':  (2213,2293, 0,370, 4, 6),
 'strong_down_fx':(2250,2300,360,820,8, 4),
 'strong_air':   (2360,2440, 0,901, 6, 6),
 'byakugou':     (2489,2563, 0,901, 9, 5),
 'special1':     (2632,2742, 0,370, 4, 6),   # char crouch palm-down
 'special1_slug':(2632,2742,360,901, 4, 6),  # large slug
 'special2':     (2788,2885, 0,901, 6, 5),
 'special3':     (2938,3030, 0,901, 5, 6),
 'special4':     (3086,3155, 0,901, 3, 6),
 'special5':     (3220,3322, 0,370, 4, 6),   # char gather
 'special5_fx':  (3220,3322,360,760, 4, 6),  # petal burst (exclude grayscale victim below y3370)
 'win':          (3597,3795, 0,540, 4, 6),   # left; banner is bottom-right (excluded by x1=540)
}
