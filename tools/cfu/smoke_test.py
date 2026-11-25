#!/usr/bin/env python3
"""Open a built cfu.html in headless Chromium, answer every question, and check
the results event fires. Answers correctly by default; --wrong answers every
question wrongly to check the 'Not quite' path. Saves screenshots if --shots DIR.

Usage: python smoke_test.py path/to/cfu.html [--wrong] [--shots DIR] [--mobile]
Needs: pip install playwright && playwright install chromium (skips if missing).
"""
import argparse, json, sys
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("SKIP: playwright not installed"); sys.exit(0)


def run(path, wrong=False, shots=None, mobile=False):
    errors = []
    url = Path(path).resolve().as_uri()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 390, "height": 844} if mobile else {"width": 1100, "height": 900})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
        pg.goto(url)
        pg.evaluate("document.addEventListener('skai-cfu-complete', e => window.__done = e.detail)")
        qs = pg.evaluate("SKAI_CFU.data.questions")
        for n, q in enumerate(qs):
            if shots: pg.wait_for_timeout(450); pg.screenshot(path=f"{shots}/q{n+1}-{q['type']}.png", full_page=True)
            if q["type"] == "mcq":
                k = q["correct"] if not wrong else (q["correct"] + 1) % len(q["options"])
                # real click through the UI
                pg.locator(".opt", has_text=q["options"][k]).first.click()
                pg.click("#act")
            elif q["type"] == "match":
                tids = [t["id"] for t in q["targets"]]
                resp = {}
                for i, c in enumerate(q["cards"]):
                    tgt = c["target"] if not wrong else tids[(tids.index(c["target"]) + 1) % len(tids)]
                    resp[i] = tgt
                # first card via real tap-tap UI, rest via API
                first = q["cards"][0]["text"]
                pg.locator(".mcard", has_text=first).first.click()
                pg.locator(f'.target[data-t="{resp[0]}"]').click()
                pg.evaluate("r => SKAI_CFU.answer(r)", {str(k): v for k, v in resp.items()})
            else:
                order = list(range(len(q["items"])))
                if wrong: order = order[1:] + order[:1]
                pg.evaluate("o => SKAI_CFU.answer(o)", order)
            got = pg.evaluate("SKAI_CFU.state.answers[SKAI_CFU.state.i].correct")
            if got == wrong:
                errors.append(f"Q{n+1} ({q['type']}): graded {got}, expected {not wrong}")
            if shots: pg.screenshot(path=f"{shots}/q{n+1}-{q['type']}-feedback.png", full_page=True)
            pg.click("#act")
        done = pg.evaluate("window.__done")
        if shots: pg.wait_for_timeout(450); pg.screenshot(path=f"{shots}/results.png", full_page=True)
        b.close()
    if not done: errors.append("skai-cfu-complete event did not fire")
    else:
        exp = 0 if wrong else len(qs)
        if done["score"]["correct"] != exp: errors.append(f"score {done['score']} expected {exp} correct")
    return errors, done


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("html"); ap.add_argument("--wrong", action="store_true")
    ap.add_argument("--shots"); ap.add_argument("--mobile", action="store_true")
    a = ap.parse_args()
    if a.shots: Path(a.shots).mkdir(parents=True, exist_ok=True)
    errs, done = run(a.html, a.wrong, a.shots, a.mobile)
    for e in errs: print("FAIL ", e)
    if not errs: print(f"PASS — {done['score']['correct']}/{done['score']['total']}, skills: {json.dumps(done['bySkill'])}")
    sys.exit(1 if errs else 0)
