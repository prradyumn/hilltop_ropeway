#!/usr/bin/env python3
"""Validate cfu-data.json against the SKAI CFU rules and build cfu.html.

Usage (from the repo root):
  python3 tools/cfu/build_cfu.py tools/cfu/cfu-data.json --out cfu.html
  python3 tools/cfu/build_cfu.py tools/cfu/cfu-data.json --check        # validate only

Errors (rule breaks) stop the build unless --force. Warnings are printed for
you to review; fix them unless there is a good reason not to.
"""
import argparse, json, re, sys, html
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "cfu-template.html"

SKILLS = {"Computational thinking", "Reasoning", "Understanding", "Logical thinking",
          "Self-direction & agency", "Judgment", "Empathy", "Communication"}
GRADES = {"G3", "G4", "G5", "G6", "G7", "G8"}
MCQ_OPTIONS = {"G3": 3, "G4": 3, "G5": 4, "G6": 4, "G7": 4, "G8": 4}
Q_WORDS = {"G3": 8, "G4": 10, "G5": 14, "G6": 22, "G7": 25, "G8": 35}
OPT_WORDS = {"G3": 3, "G4": 4, "G5": 4}           # G6+ allow short sentences
MIX9 = {"G3": (7, 2, 0), "G4": (6, 3, 0), "G5": (4, 5, 0), "G6": (3, 3, 3), "G7": (3, 3, 3)}
THEME_KEYS = {"bg", "surface", "surface-2", "text", "muted", "accent", "accent-ink", "correct",
              "wrong", "line", "radius", "radius-sm", "font-display", "font-body", "bg-image"}
BANNED = re.compile(r"\b(all|none) of the above\b", re.I)


def words(s):
    return len(re.findall(r"[A-Za-z0-9'’]+", s or ""))


def validate(d):
    E, W = [], []
    m = d.get("mission") or {}
    qs = d.get("questions") or []
    g = m.get("grade")
    if not m.get("title"): E.append("mission.title is missing")
    if g not in GRADES: E.append(f"mission.grade must be one of {sorted(GRADES)} (got {g!r})")
    if m.get("mode") not in ("self", "group"): E.append("mission.mode must be 'self' or 'group'")
    want = m.get("questionCount", 9)
    if len(qs) != want: E.append(f"expected {want} questions (mission.questionCount), got {len(qs)}")

    types = Counter(q.get("type") for q in qs)
    for t in ("mcq", "match", "sequence"):
        if not types[t]: E.append(f"no '{t}' question — every game needs at least one of each format")
    if not any(q.get("transfer") for q in qs):
        E.append("no transfer question — mark at least one new-situation question with \"transfer\": true")

    skills = [q.get("skill") for q in qs]
    sk = Counter(skills)
    if len(sk) != 3: W.append(f"bank missions test exactly 3 skills; this has {len(sk)}: {dict(sk)}")
    if want == 9 and len(sk) == 3 and any(v != 3 for v in sk.values()):
        E.append(f"9-question CFUs use 3 questions per skill; got {dict(sk)}")
    if m.get("mode") == "group" and "Communication" not in sk:
        W.append("group mission without a Communication question (every group mission in the bank has one)")
    if m.get("mode") == "self" and "Communication" in sk:
        W.append("self mission uses Communication (bank self missions never do) — is it really a team skill here?")

    diffs = Counter(q.get("difficulty") for q in qs)
    if g in ("G3", "G4", "G5") and diffs["Hard"]:
        E.append(f"{g} has no Hard questions in the grade guide; found {diffs['Hard']}")
    if want == 9 and g in MIX9:
        e, mm, h = MIX9[g]
        got = (diffs["Easy"], diffs["Medium"], diffs["Hard"])
        if got != (e, mm, h): W.append(f"difficulty mix {got} (E,M,H) differs from the {g} guide {(e, mm, h)}")
    if g == "G8" and diffs["Easy"] > 1: W.append(f"G8 should be mostly Medium/Hard; found {diffs['Easy']} Easy")
    if g in ("G6", "G7"):
        rank = {"Easy": 0, "Medium": 1, "Hard": 2}
        per = defaultdict(list)
        for q in qs: per[q.get("skill")].append(rank.get(q.get("difficulty"), 0))
        for s, r in per.items():
            if r != sorted(r): W.append(f"{s}: questions should go Easy → Medium → Hard")

    seen_ids, mcq_pos = set(), []
    for n, q in enumerate(qs, 1):
        tag = f"Q{n}"
        qid = q.get("id") or f"q{n}"
        if qid in seen_ids: E.append(f"{tag}: duplicate id {qid}")
        seen_ids.add(qid)
        t = q.get("type")
        if t not in ("mcq", "match", "sequence"): E.append(f"{tag}: type must be mcq, match or sequence"); continue
        if q.get("skill") not in SKILLS: E.append(f"{tag}: skill {q.get('skill')!r} is not one of the 8 skill names")
        if q.get("difficulty") not in ("Easy", "Medium", "Hard"): E.append(f"{tag}: difficulty must be Easy, Medium or Hard")
        p = q.get("prompt", "")
        if not p.strip(): E.append(f"{tag}: prompt is empty")
        if g in Q_WORDS and words(p) > Q_WORDS[g] + 3:
            W.append(f"{tag}: prompt is {words(p)} words; {g} guide is ~{Q_WORDS[g]}")
        fb = q.get("feedback", "")
        if not fb.strip(): E.append(f"{tag}: feedback is empty (1–2 lines explaining why)")
        elif words(fb) > 40: W.append(f"{tag}: feedback is {words(fb)} words — keep it to 1–2 short lines")
        if BANNED.search(json.dumps(q)): E.append(f"{tag}: 'all/none of the above' is not allowed")

        if t == "mcq":
            opts = q.get("options") or []
            need = MCQ_OPTIONS.get(g)
            if need and len(opts) != need: E.append(f"{tag}: {g} MCQs have {need} options, got {len(opts)}")
            if len(set(o.strip().lower() for o in opts)) != len(opts): E.append(f"{tag}: duplicate options")
            c = q.get("correct")
            if not isinstance(c, int) or not (0 <= c < len(opts)): E.append(f"{tag}: correct must be a 0-based index into options")
            else: mcq_pos.append(c)
            if opts and re.match(r"^\s*[A-Da-d][\)\.]\s", opts[0]): E.append(f"{tag}: don't put 'A)' letters in options; the engine adds them")
            lim = OPT_WORDS.get(g)
            if lim:
                long = [o for o in opts if words(o) > lim + 2]
                if long: W.append(f"{tag}: options longer than the {g} guide (~{lim} words): {long}")
            if opts:
                wl = [max(1, words(o)) for o in opts]
                if max(wl) >= 3 * min(wl) and max(wl) - min(wl) >= 4:
                    W.append(f"{tag}: option lengths vary a lot {wl} — the longest often gives the answer away")
        elif t == "match":
            cards, targets = q.get("cards") or [], q.get("targets") or []
            if not 3 <= len(cards) <= 7: E.append(f"{tag}: match needs 3–7 cards, got {len(cards)}")
            if len(targets) < 2: E.append(f"{tag}: match needs at least 2 targets")
            tids = [x.get("id") for x in targets]
            if len(set(tids)) != len(tids) or not all(tids): E.append(f"{tag}: every target needs a unique id")
            for c in cards:
                if c.get("target") not in tids: E.append(f"{tag}: card {c.get('text')!r} points to unknown target {c.get('target')!r}")
            used = Counter(c.get("target") for c in cards)
            if any(v > 1 for v in used.values()) and not re.search(r"more than one|several|some .* take|can take", p, re.I):
                W.append(f"{tag}: a target takes several cards — say so in the prompt")
            unused = [x for x in tids if x not in used]
            if unused: W.append(f"{tag}: target(s) {unused} get no cards — fine as a distractor, but make sure it's intended")
        elif t == "sequence":
            items = q.get("items") or []
            if not 3 <= len(items) <= 6: E.append(f"{tag}: sequence needs 3–6 items, got {len(items)}")
            if len(set(i.strip().lower() for i in items)) != len(items): E.append(f"{tag}: duplicate sequence items")

    if len(mcq_pos) >= 3:
        top, cnt = Counter(mcq_pos).most_common(1)[0]
        if cnt / len(mcq_pos) > 0.5:
            W.append(f"correct answer sits at position {'ABCD'[top]} in {cnt}/{len(mcq_pos)} MCQs — vary it")

    theme = d.get("theme") or {}
    bad = [k for k in theme if k not in THEME_KEYS and k not in ("headExtra",)]
    if bad: W.append(f"unknown theme keys ignored: {bad} (allowed: {sorted(THEME_KEYS)} + headExtra)")
    return E, W


def css_value(v):
    v = str(v)
    if re.search(r"[;{}<>]", v): raise ValueError(f"unsafe theme value: {v!r}")
    return v


def build(d, out):
    tpl = TEMPLATE.read_text(encoding="utf-8")
    theme = d.get("theme") or {}
    css = "\n  ".join(f"--{k}: {css_value(v)};" for k, v in theme.items() if k in THEME_KEYS)
    head = theme.get("headExtra", "")
    if isinstance(head, list): head = "\n".join(head)
    payload = {k: v for k, v in d.items() if k != "theme"}
    js = json.dumps(payload, ensure_ascii=False, indent=1).replace("</", "<\\/")
    title = html.escape(f"{(d.get('mission') or {}).get('title', 'Mission')} · Check your understanding")
    page = (tpl.replace("/*__THEME__*/", css)
               .replace("<!--__HEAD_EXTRA__-->", head)
               .replace("__TITLE__", title)
               .replace("__CFU_DATA__", js))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(page, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--out", default="cfu.html")
    ap.add_argument("--check", action="store_true", help="validate only")
    ap.add_argument("--force", action="store_true", help="build even with errors")
    a = ap.parse_args()
    d = json.loads(Path(a.data).read_text(encoding="utf-8"))
    E, W = validate(d)
    for e in E: print("ERROR  ", e)
    for w in W: print("WARN   ", w)
    if not E and not W: print("OK — all rules pass")
    if a.check: sys.exit(1 if E else 0)
    if E and not a.force: print("\nNot built. Fix the errors (or use --force)."); sys.exit(1)
    build(d, a.out)
    print(f"\nBuilt {a.out}")


if __name__ == "__main__":
    main()
