# Pre-rendered videos

- `intro.html` → `assets/video/intro_loop.mp4` (12 s seamless loop, 1920×1200, start screen; title sits in the calm centre)
- `teaser.html` → `assets/video/tarzan_teaser.mp4` (10 s, 960×600, end card; plays once and holds its last frame)

Both pages expose `renderAt(t)` and draw from the game's own art (paths are relative to this folder: `../../assets`).

Re-render (Node + playwright-core + ffmpeg):
1. From the **project root**: `python3 -m http.server 5541` (so `tools/video/*.html` can reach `../../assets`).
2. `node render.mjs video tools/video/intro.html frames_intro 30 360` and `node render.mjs video tools/video/teaser.html frames_teaser 30 300`
   (check the URL/path handling at the top of `render.mjs`; Chrome needs `--use-angle=swiftshader --enable-unsafe-swiftshader` headless).
3. Encode: `ffmpeg -framerate 30 -i frames_X/f_%05d.png -c:v libx264 -profile:v high -preset veryslow -crf 16 -pix_fmt yuv420p -movflags +faststart -an`
   + intro: `-tune film -x264-params keyint=360:min-keyint=360:scenecut=0:ipratio=1.1` (one keyframe: no mid-loop quality jump); teaser: `-g 60`.

Brief rules: no people/operator, no text, nothing claiming real ropeways are inspected by bots or that pulleys make lifting easier.
