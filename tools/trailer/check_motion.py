"""Smoothness check for a frame folder: mean abs difference between consecutive frames (downscaled).
Flags frames that freeze in the middle of motion (diff≈0 between moving neighbours) and isolated spikes (a frame that differs
from both neighbours much more than they differ from each other: a pop/flicker).
usage: python3 check_motion.py <frames_dir> [first] [last]"""
import sys, os, numpy as np
from PIL import Image
d = sys.argv[1]; files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
a = int(sys.argv[2]) if len(sys.argv) > 2 else 0; b = int(sys.argv[3]) if len(sys.argv) > 3 else len(files) - 1
load = lambda f: np.asarray(Image.open(os.path.join(d, f)).convert('L').resize((320, 180), Image.BILINEAR), dtype=np.float32)
fr = [load(f) for f in files[a:b + 1]]
diff = [float(np.abs(fr[i + 1] - fr[i]).mean()) for i in range(len(fr) - 1)]
flags = []
for i in range(1, len(fr) - 1):
    prev, nxt = diff[i - 1], diff[i]
    skip = float(np.abs(fr[i + 1] - fr[i - 1]).mean())
    if prev < 0.02 and i >= 2 and diff[i - 2] > 0.5 and nxt > 0.5: flags.append((a + i, 'freeze', prev))
    if min(prev, nxt) > 3 * max(skip, 0.3) and min(prev, nxt) > 1.0: flags.append((a + i, 'spike', round(min(prev, nxt), 2), round(skip, 2)))
print(f'{d}: {len(fr)} frames, mean diff {np.mean(diff):.2f}, max {max(diff):.2f} at {a + int(np.argmax(diff))}')
for f in flags: print('  ', f)
