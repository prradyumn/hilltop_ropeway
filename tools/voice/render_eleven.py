# Render the game's read-aloud lines with an ElevenLabs voice (the SKAI voice library).
# Same lines and same clean-up as render.py (Kokoro), so either can rebuild assets/voice/.
# usage: ELEVENLABS_API_KEY=... python3 render_eleven.py <out_dir> <voice_id> [comma-separated ids]
# The key is read from the environment only. Never commit it.
import ast, json, os, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
out, voice = sys.argv[1], sys.argv[2]
only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
key = os.environ.get("ELEVENLABS_API_KEY")
if not key: sys.exit("set ELEVENLABS_API_KEY")
MODEL = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
os.makedirs(out, exist_ok=True)

# read LINES from render.py without running it (it loads Kokoro on import)
src = open(os.path.join(HERE, "render.py")).read()
i = src.index("LINES = {"); j = src.index("\n}\n", i) + 2
LINES = ast.literal_eval(src[i + 8:j])

report = {}
for k, text in LINES.items():
    if only and k not in only: continue
    # no voice_settings: each SKAI voice keeps the settings saved with it in the library
    body = json.dumps({"text": text, "model_id": MODEL}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                                 data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    raw = os.path.join(out, k + ".raw.mp3")
    with urllib.request.urlopen(req, timeout=60) as r, open(raw, "wb") as f: f.write(r.read())
    mp3 = os.path.join(out, k + ".ogg")
    # trim leading/trailing silence, gentle loudness normalisation, mono 24 kbps Opus .ogg (same as render.py)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ac", "1", "-c:a", "libopus", "-b:a", "24k", "-application", "voip", mp3], check=True)
    os.remove(raw)
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout.strip()
    report[k] = round(float(d or 0), 2)
    print(k, report[k], flush=True)
print(json.dumps({"voice": voice, "model": MODEL, "durations": report}))
