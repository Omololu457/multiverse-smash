# tools/sanji_build/arcs.py — find the BLUE MOTION-ARC pixels of a Sanji frame (render-only kick trails).
# The arcs share the suit's two blues but, unlike the suit, have NO black outline: an 8-connected component
# of blue pixels is an arc when fewer than 30% of its pixels touch a black pixel (same rule Zoro's Taka Nami
# cut used). Returns a set of (x, y) in frame coordinates.
ARC_BLUES = {(80, 112, 200), (40, 80, 144), (80, 128, 216), (32, 56, 88)}
def arc_pixels(img, min_size=6, touch_max=0.30):
    p = img.load(); w, h = img.size
    blue = [[p[x, y][3] > 0 and p[x, y][:3] in ARC_BLUES for x in range(w)] for y in range(h)]
    blk = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] > 0 and p[x, y][:3] == (0, 0, 0)
    seen = [[False] * w for _ in range(h)]; keep = set()
    for y in range(h):
        for x in range(w):
            if blue[y][x] and not seen[y][x]:
                st = [(x, y)]; seen[y][x] = True; comp = []
                while st:
                    cx, cy = st.pop(); comp.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and blue[ny][nx] and not seen[ny][nx]:
                                seen[ny][nx] = True; st.append((nx, ny))
                touch = sum(1 for (cx, cy) in comp if any(blk(cx + dx, cy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)))
                if len(comp) >= min_size and touch / len(comp) < touch_max: keep |= set(comp)
    return keep
