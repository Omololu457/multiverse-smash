# Connected-component analysis of the Zoro source sheet (alpha>0 = foreground, 8-connected,
# components within GAP px merged so detached sword tips / glints stay with their body).
import sys, json
from PIL import Image
SRC = sys.argv[1]; GAP = int(sys.argv[2]) if len(sys.argv) > 2 else 3
im = Image.open(SRC).convert('RGBA'); W, H = im.size; a = im.getchannel('A').load()
seen = [[False]*W for _ in range(H)]; comps = []
for y in range(H):
    for x in range(W):
        if a[x, y] and not seen[y][x]:
            st = [(x, y)]; seen[y][x] = True; x0 = x1 = x; y0 = y1 = y; n = 0
            while st:
                cx, cy = st.pop(); n += 1
                x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx+dx, cy+dy
                        if 0 <= nx < W and 0 <= ny < H and a[nx, ny] and not seen[ny][nx]:
                            seen[ny][nx] = True; st.append((nx, ny))
            comps.append([x0, y0, x1, y1, n])
def near(p, q):
    return not (p[2]+GAP < q[0] or q[2]+GAP < p[0] or p[3]+GAP < q[1] or q[3]+GAP < p[1])
merged = True
while merged:
    merged = False
    for i in range(len(comps)):
        for j in range(i+1, len(comps)):
            if near(comps[i], comps[j]):
                p, q = comps[i], comps[j]
                comps[i] = [min(p[0], q[0]), min(p[1], q[1]), max(p[2], q[2]), max(p[3], q[3]), p[4]+q[4]]
                comps.pop(j); merged = True; break
        if merged: break
comps.sort(key=lambda c: (c[1] // 40, c[0]))
print(json.dumps(comps))
