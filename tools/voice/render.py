# Render the game's read-aloud lines with Kokoro (Apache-2.0, free for commercial use).
# usage: venv/bin/python render.py <out_dir> [voice] [speed]
import sys, json, subprocess, os
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]
voice = sys.argv[2] if len(sys.argv) > 2 else "af_heart"
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 0.95
os.makedirs(out, exist_ok=True)

# id -> (spoken text). The game maps each on-screen line to its id.
LINES = {
    "s1_queue": "Six fifteen a.m. Your class is first in line.",
    "s1_check": "No ride until the bot checks the cable.",
    "s1_towers": "Four towers. Each one steeper.",
    "s2_bot": "This is the inspection bot. It came with a smooth wheel.",
    "s3_q": "Will it reach the top tower?",
    "s4_tapwheel": "Tap the big wheel.",
    "s4_turns": "The wheel turns. The rope moves with it.",
    "s4_tapbot": "Now tap the bot.",
    "s4_same": "Same kind of wheel. Watch it on the bot.",
    "s4_q": "In the bot, what stays still?",
    "s4_rope": "The rope stays still, so the wheel moves itself along it.",
    "s4_pulley": "Pulley. A wheel with a groove that guides a rope.",
    "g4_q": "How many turns to the flag?",
    "g5_q": "Which sentence is true?",
    "g5_grip": "The steeper the rope, the more grip the wheel needs, so a slipping bot needs a grippier wheel or a lighter load.",
    "g5_motor": "The steeper the rope, the faster the wheel should spin, so a slipping bot needs a stronger motor.",
    "g5_big": "The steeper the rope, the bigger the wheel should be, because a big wheel covers more rope each turn.",
    "g5_bigslip": "At Tower 2, the big smooth wheel slipped too.",
    "g5_fastslip": "At Tower 2, the wheel was already spinning fast. It still slipped.",
    "g5_end": "Grip is what stops the slipping.",
    "h_g1": "Watch which way the top of the wheel moves.",
    "h_g2": "Look at where the wheel touches the cable.",
    "h_g3": "Read the mission card again.",
    "h_g4": "How far does one turn go?",
    "h_g6": "Check all three: turn, wheel, load.",
    # learning-objective pass: mission brief, step questions, what each tower showed
    "s1_mission": "Your mission: get the bot to the top. Check four towers, and the rope at the top. You set its turn, its wheel, and its load. The first ride is at seven. A failed run costs four minutes.",
    "g1_q": "Which way should the wheel turn?",
    "g2_q": "Steeper cable. Which wheel will get the bot up?",
    "g3_q": "What should the bot carry today?",
    "g4_watch": "Turn the wheel. How far does the bot go?",
    "g4_q80": "The flag is eighty centimeters up. How many turns?",
    "g4_q90": "The flag is ninety centimeters up. How many turns?",
    "g6_q": "Set up the new bot to climb the rope.",
    "f_t1": "Tower one checked. The way the wheel turns sets which way the bot goes.",
    "f_t2": "Tower two checked. On the steep cable, the grooved wheel with a band did not slip.",
    "f_t3": "Tower three checked. With only the camera, the bot was light enough to climb.",
    "f_t4": "Tower four checked. Each turn moves the bot the distance around its wheel. The bigger wheel goes farther.",
}

# optional 4th arg: comma-separated ids to render (default: all). KOKORO_DIR: where the model files live (default: here)
only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
MD = os.environ.get("KOKORO_DIR", HERE)
k = Kokoro(os.path.join(MD, "kokoro-v1.0.onnx"), os.path.join(MD, "voices-v1.0.bin"))
report = {}
for key, text in LINES.items():
    if only and key not in only: continue
    samples, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
    wav = os.path.join(out, key + ".wav")
    sf.write(wav, samples, sr)
    mp3 = os.path.join(out, key + ".mp3")
    # trim leading/trailing silence, gentle loudness normalisation, mono 48 kbps mp3
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ac", "1", "-ar", "24000", "-b:a", "48k", mp3], check=True)
    os.remove(wav)
    report[key] = round(len(samples) / sr, 2)
print(json.dumps({"voice": voice, "speed": speed, "durations": report}))
