# Voice lines (read-aloud)

Rendered offline with **Kokoro** (open-weight TTS, Apache-2.0: free, commercial use OK), voice `af_heart`, speed 0.95.
Output: `assets/voice/<id>.mp3` (mono, 48 kbps). The game maps on-screen text to ids in `VO` in `js/main.js`;
any line without a file falls back to the browser's speech.

Re-render (needs Python 3.10+ and ffmpeg):

```
python3.11 -m venv venv && ./venv/bin/pip install kokoro-onnx soundfile
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
./venv/bin/python render.py ../../assets/voice af_heart 0.95
```

To change a line: edit `LINES` in `render.py` and the matching key in `VO` (js/main.js), then re-render.
Brief rules apply to voice too: no praise after a failed run, never say the pulley "makes lifting easier".
