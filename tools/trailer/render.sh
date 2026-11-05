#!/bin/sh
# Re-render the Hilltop Ropeway trailer → trailer/hilltop_ropeway_trailer.mp4 (+ trailer/poster.webp).
# Needs: node, ffmpeg, playwright-core (set PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs if it isn't resolvable),
# Chrome for Testing (CHROME=/path/to/chrome to override), and the game served at http://localhost:5517/
# (from the project root: python3 -m http.server 5517). Frames/temp files go to $TRAILER_WORK (default: $TMPDIR/hilltop_trailer_work).
# Steps: capture.mjs (clock-stepped 30 fps gameplay), render_audio.mjs (OfflineAudioContext cue + VO, −16 LUFS), compose.mjs (composite + encode).
# The edit (shot in-points, cards, music layers, SFX/VO times) lives in edit.json.
set -e
cd "$(dirname "$0")"
node capture.mjs "$@"
node render_audio.mjs
node compose.mjs
