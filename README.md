# Hilltop Ropeway

Grade 4 SKAI Space mission: story (4 slides) + game (7 chapters). Built for the Lenovo Tab K11 (1920×1200).

## Run it
Open this folder in VS Code, install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.
(Opening `index.html` by double-click won't work: browsers block JS modules from `file://`.)

Reviewing: open `index.html?review` to get the ≡ chapter menu (top-right) and jump to any chapter. Players never see it.

## Folder
```
index.html        page markup + script order
css/style.css     all styles (stage is a fixed 1600×1000 box scaled to fit)
js/main.js        game flow: chapters, camera (GSAP), nudges, scoring, logging
js/world.js       2D world drawn on canvas (hill, towers, cable, bot, kids, VFX)
js/lens.js        the only 3D: close-up of pulley / wheel on rope (three.js)
js/art.js         textures baked at startup
js/sfx.js         synthesized sounds
js/assets.js      list of every image + sprite sizes/anchors
js/vendor/        three.js, RoomEnvironment, GSAP (no install needed)
assets/ui/        buttons, icons, cards
assets/sprites/   bot body/face, bags, wheels (Blender renders)
assets/world/     painted world, characters, effects
assets/fonts/     Nunito
assets/voice/     read-aloud lines (Kokoro TTS, mp3) — see tools/voice/
assets/video/     intro_loop.mp4 (start screen), tarzan_teaser.mp4 (end card)
tools/            offline render scripts (voice, video); not loaded by the game
```
To add an image: drop it in the right `assets/` folder and add one line to `js/assets.js`.
