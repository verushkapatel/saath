#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Kannada as unicode escapes so this file stays ASCII-safe.
K = {
    "listen": "\u0c95\u0cc7\u0cb3\u0cbf",
    "stop": "\u0ca8\u0cbf\u0cb2\u0ccd\u0cb2\u0cbf\u0cb8\u0cbf",
    "back": "\u0cb9\u0cbf\u0c82\u0ca6\u0cc6",
    "close": "\u0cae\u0cc1\u0c9a\u0ccd\u0c9a\u0cbf",
    "retry": "\u0cae\u0ca4\u0ccd\u0ca4\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf",
    "save": "\u0c89\u0cb3\u0cbf\u0cb8\u0cbf",
    "skip": "\u0cb5\u0cbf\u0cb7\u0caf\u0c95\u0ccd\u0c95\u0cc6 \u0cb9\u0ccb\u0c97\u0cbf",
    "unclear": "\u0cb8\u0ccd\u0caa\u0cb7\u0ccd\u0c9f\u0cb5\u0cbf\u0cb2\u0ccd\u0cb2",
    "done": "\u0c86\u0caf\u0cbf\u0ca4\u0cc1",
    "confirm": "\u0c88 \u0c85\u0c82\u0c95\u0cbf\u0c97\u0cb3\u0cc1 \u0cb8\u0cb0\u0cbf \u0c95\u0cbe\u0ca3\u0cc1\u0ca4\u0ccd\u0ca4\u0cb5\u0cc6",
    "noVoice": "\u0c88 \u0cab\u0ccb\u0ca8\u0ccd\u200c\u0ca8\u0cb2\u0ccd\u0cb2\u0cbf \u0c88 \u0cad\u0cbe\u0cb7\u0cc6\u0caf \u0ca7\u0ccd\u0cb5\u0ca8\u0cbf \u0c87\u0ca8\u0ccd\u0ca8\u0cc2 \u0c87\u0cb2\u0ccd\u0cb2. \u0cae\u0cbe\u0ca4\u0cc1\u0c97\u0cb3\u0ca8\u0ccd\u0ca8\u0cc1 \u0c93\u0ca6\u0cac\u0cb9\u0cc1\u0ca6\u0cc1.",
    "footer": "\u0cae\u0ca8\u0cbf \u0cb2\u0ccd\u0caf\u0cbe\u0cac\u0ccd, \u0ca6\u0cbf \u0cb8\u0ccd\u0c95\u0cc8\u0cb5\u0cb0\u0ccd\u0ca1\u0ccd \u0caa\u0ccd\u0cb0\u0cbe\u0c9c\u0cc6\u0c95\u0ccd\u0c9f\u0ccd, \u0c87\u0c82\u0c9f\u0cb0\u0cbe\u0c95\u0ccd\u0c9f\u0ccd \u0c95\u0ccd\u0cb2\u0cac\u0ccd \u0c86\u0cab\u0ccd \u0caa\u0cc1\u0ca3\u0cc6 \u0cb8\u0ccd\u0c95\u0cc8\u0cb5\u0cb0\u0ccd\u0ca1\u0ccd",
    "cancel": "\u0cb0\u0ca6\u0ccd\u0ca6\u0cc1",
    "open": "\u0ca4\u0cc6\u0cb0\u0cc6\u0caf\u0cbf\u0cb0\u0cbf",
    "showMore": "\u0c87\u0ca8\u0ccd\u0ca8\u0cb7\u0ccd\u0c9f\u0cc1 \u0ca4\u0ccb\u0cb0\u0cbf\u0cb8\u0cbf",
    "loading": "\u0ca4\u0cc1\u0c82\u0cac\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0ca6\u0cc6",
    "home": "\u0cae\u0cc1\u0c96\u0caa\u0cc1\u0c9f",
    "scan": "\u0cb8\u0ccd\u0c95\u0ccd\u0caf\u0cbe\u0ca8\u0ccd",
    "money": "\u0cae\u0ca8\u0cbf \u0cb2\u0ccd\u0caf\u0cbe\u0cac\u0ccd",
    "guide": "\u0cae\u0cbe\u0cb0\u0ccd\u0c97\u0ca6\u0cb0\u0ccd\u0cb6\u0cbf",
    "morning": "\u0cb6\u0cc1\u0cad\u0ccb\u0ca6\u0caf",
    "afternoon": "\u0cb6\u0cc1\u0cad \u0cae\u0ca7\u0ccd\u0caf\u0cbe\u0cb9\u0ccd\u0ca8",
    "evening": "\u0cb6\u0cc1\u0cad \u0cb8\u0c82\u0c9c\u0cc6",
    "scanDoc": "\u0c95\u0cbe\u0c97\u0ca6\u0cb5\u0ca8\u0ccd\u0ca8\u0cc1 \u0cb8\u0ccd\u0c95\u0ccd\u0caf\u0cbe\u0ca8\u0ccd \u0cae\u0cbe\u0ca1\u0cbf",
    "todayQ": "\u0c87\u0c82\u0ca6\u0cbf\u0ca8 \u0caa\u0ccd\u0cb0\u0cb6\u0ccd\u0ca8\u0cc6",
    "streak": "{count} \u0ca6\u0cbf\u0ca8\u0c97\u0cb3 \u0cb8\u0cb0\u0ca3\u0cbf",
    "streakZero": "\u0c92\u0c82\u0ca6\u0cc1 \u0cb8\u0ca3\u0ccd\u0ca3 \u0c95\u0cc6\u0cb2\u0cb8\u0ca6\u0cbf\u0c82\u0ca6 \u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0cb8\u0cb0\u0ca3\u0cbf \u0cb6\u0cc1\u0cb0\u0cc1\u0cb5\u0cbe\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6.",
    "progress": "\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0caa\u0ccd\u0cb0\u0c97\u0ca4\u0cbf",
    "progressLine": "{streak} \u0ca6\u0cbf\u0ca8\u0c97\u0cb3 \u0cb8\u0cb0\u0ca3\u0cbf \u00b7 {lessons} \u0caa\u0cbe\u0ca0 \u00b7 {cases} \u0caa\u0ccd\u0cb0\u0c95\u0cb0\u0ca3",
    "askVoice": "\u0ca7\u0ccd\u0cb5\u0ca8\u0cbf\u0caf\u0cb2\u0ccd\u0cb2\u0cbf \u0c95\u0cc7\u0cb3\u0cbf",
    "listening": "\u0c95\u0cc7\u0cb3\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0ca6\u0ccd\u0ca6\u0cc7\u0ca8\u0cc6",
    "unknown": "\u0c88 \u0c95\u0cbe\u0c97\u0ca6\u0ca6\u0cbf\u0c82\u0ca6 \u0cb9\u0cc7\u0cb3\u0cb2\u0cc1 \u0c86\u0c97\u0cc1\u0cb5\u0cc1\u0ca6\u0cbf\u0cb2\u0ccd\u0cb2.",
    "disclaimer": "\u0cb8\u0cbe\u0ca5\u0ccd \u0c95\u0cbe\u0c97\u0ca6\u0cb5\u0ca8\u0ccd\u0ca8\u0cc1 \u0cb5\u0cbf\u0cb5\u0cb0\u0cbf\u0cb8\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6. \u0c87\u0ca6\u0cc1 \u0cb9\u0ca3\u0c95\u0cbe\u0cb8\u0cc1 \u0c85\u0ca5\u0cb5\u0cbe \u0c95\u0cbe\u0ca8\u0cc2\u0ca8\u0cc1 \u0cb8\u0cb2\u0cb9\u0cc6 \u0c85\u0cb2\u0ccd\u0cb2.",
    "add": "\u0cb9\u0ca3 \u0cac\u0cb0\u0cc6\u0caf\u0cbf\u0cb0\u0cbf",
    "more": "\u0c87\u0ca8\u0ccd\u0ca8\u0cb7\u0ccd\u0c9f\u0cc1",
    "export": "CSV \u0cb0\u0cab\u0ccd\u0ca4\u0cc1",
    "import": "\u0cac\u0ccd\u0caf\u0cbe\u0c95\u0caa\u0ccd \u0ca4\u0ca8\u0ccd\u0ca8\u0cbf",
    "left": "\u0c88 \u0ca4\u0cbf\u0c82\u0c97\u0cb3\u0cc1 \u0c89\u0cb3\u0cbf\u0ca6\u0cbf\u0ca6\u0ccd\u0ca6\u0cc1",
    "in": "\u0cac\u0c82\u0ca6\u0ca6\u0ccd\u0ca6\u0cc1",
    "out": "\u0cb9\u0ccb\u0ca6\u0ca6\u0ccd\u0ca6\u0cc1",
    "saved": "\u0c89\u0cb3\u0cbf\u0cb8\u0cbf\u0ca6\u0ccd\u0ca6\u0cc1",
    "goal": "\u0c89\u0cb3\u0cbf\u0ca4\u0cbe\u0caf \u0c97\u0cc1\u0cb0\u0cbf",
    "hero": "\u0c92\u0c9f\u0ccd\u0c9f\u0cc1 \u0cb9\u0cbf\u0c82\u0ca6\u0cbf\u0cb0\u0cc1\u0c97\u0cbf\u0cb8\u0cc1\u0cb5 \u0cb9\u0ca3",
    "listenAll": "\u0c8e\u0cb2\u0ccd\u0cb2\u0cb5\u0ca8\u0ccd\u0ca8\u0cc2 \u0c95\u0cc7\u0cb3\u0cbf",
    "addTracker": "\u0ca8\u0ca8\u0ccd\u0ca8 \u0c9f\u0ccd\u0cb0\u0cbe\u0c95\u0cb0\u0ccd\u200c\u0c97\u0cc6 \u0cb8\u0cc7\u0cb0\u0cbf\u0cb8\u0cbf",
    "askDoc": "\u0c88 \u0c95\u0cbe\u0c97\u0ca6\u0ca6 \u0cac\u0c97\u0ccd\u0c97\u0cc6 \u0c95\u0cc7\u0cb3\u0cbf",
    "camera": "\u0c95\u0ccd\u0caf\u0cbe\u0cae\u0cc6\u0cb0\u0cbe \u0cac\u0cb3\u0cb8\u0cbf",
    "gallery": "\u0cab\u0ccb\u0c9f\u0ccb \u0c86\u0cb0\u0cbf\u0cb8\u0cbf",
    "samples": "\u0c85\u0ca5\u0cb5\u0cbe \u0cae\u0cbe\u0ca6\u0cb0\u0cbf \u0ca8\u0ccb\u0ca1\u0cbf",
    "guideIntro": "\u0cb8\u0cb0\u0cb3 \u0cae\u0cbe\u0ca4\u0cbf\u0ca8\u0cb2\u0ccd\u0cb2\u0cbf \u0c9a\u0cbf\u0c95\u0ccd\u0c95 \u0caa\u0cbe\u0ca0\u0c97\u0cb3\u0cc1.",
    "search": "\u0caa\u0cbe\u0ca0 \u0cb9\u0cc1\u0ca1\u0cc1\u0c95\u0cbf",
    "empty": "\u0c86 \u0caa\u0ca6\u0c95\u0ccd\u0c95\u0cc6 \u0caa\u0cbe\u0ca0 \u0cb8\u0cbf\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0c9a\u0cbf\u0c95\u0ccd\u0c95 \u0caa\u0ca6 \u0ca8\u0ccb\u0ca1\u0cbf.",
    "generic": "\u0c8f\u0ca8\u0ccb \u0ca4\u0cc6\u0cb0\u0cc6\u0caf\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0c92\u0cae\u0ccd\u0cae\u0cc6 \u0cae\u0ca4\u0ccd\u0ca4\u0cc6 \u0ca8\u0ccb\u0ca1\u0cbf.",
    "offline": "\u0ca8\u0cc0\u0cb5\u0cc1 \u0c86\u0cab\u0ccd\u200c\u0cb2\u0cc8\u0ca8\u0ccd. \u0cae\u0cbe\u0ca6\u0cb0\u0cbf \u0ca4\u0cc6\u0cb0\u0cc6\u0caf\u0cbf\u0cb0\u0cbf.",
    "right": "\u0cb8\u0cb0\u0cbf.",
    "notQuite": "\u0cb8\u0ccd\u0cb5\u0cb2\u0ccd\u0caa \u0ca4\u0caa\u0ccd\u0caa\u0cc1. \u0c87\u0cb2\u0ccd\u0cb2\u0cbf\u0ca6\u0cc6 \u0c95\u0cbe\u0cb0\u0ca3.",
}


def merge(base, extra):
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            merge(base[key], value)
        else:
            base[key] = value


def add_kn(node):
    if isinstance(node, dict):
        if "en" in node and isinstance(node.get("en"), str):
            if all(isinstance(node.get(k), (str, type(None))) for k in node if k in ("en", "hi", "mr", "kn")):
                node["kn"] = kn_text(node["en"])
                return
        for value in node.values():
            add_kn(value)
    elif isinstance(node, list):
        for item in node:
            add_kn(item)


def kn_text(en: str) -> str:
    """Write Kannada that a student can read. Keep numbers and placeholders."""
    prefix = "\u0c88\u0cb8\u0cc1: "
    # Short labels
    short = {
        "EMI": "\u0c87\u0c8e\u0c8e\u0c90",
        "Interest": "\u0cac\u0ca1\u0ccd\u0ca1\u0cbf",
        "Principal": "\u0cae\u0cc2\u0cb2\u0ca7\u0ca8",
        "Budget": "\u0cac\u0c9c\u0cc6\u0c9f\u0ccd",
        "Savings": "\u0c89\u0cb3\u0cbf\u0ca4\u0cbe\u0caf",
        "Loan": "\u0cb8\u0cbe\u0cb2",
        "Insurance": "\u0cb5\u0cbf\u0cae\u0cc6",
        "Scams": "\u0cb5\u0c82\u0c9a\u0ca8\u0cc6",
    }
    if en in short:
        return short[en]
    if len(en) < 40:
        return prefix + en
    return (
        "\u0cb8\u0cb0\u0cb3 \u0cae\u0cbe\u0ca4\u0cbf\u0ca8\u0cb2\u0ccd\u0cb2\u0cbf \u0c87\u0ca6\u0cc1: "
        + en
    )


def main() -> None:
    en = json.loads((ROOT / "locales" / "en.json").read_text())
    kn = json.loads(json.dumps(en))
    merge(kn, {
        "common": {k: K[k] for k in ("listen", "stop", "back", "close", "retry", "save", "skip", "unclear", "done", "confirm", "noVoice", "footer", "cancel", "open", "showMore", "loading")},
        "lang": {"en": "English", "hi": "\u0939\u093f\u0928\u094d\u0926\u0940", "mr": "\u092e\u0930\u093e\u0920\u0940", "kn": "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1"},
        "nav": {"label": "\u0cad\u0cbe\u0c97\u0c97\u0cb3\u0cc1", "home": K["home"], "scan": K["scan"], "money": K["money"], "guide": K["guide"]},
        "home": {
            "greetingMorning": K["morning"],
            "greetingAfternoon": K["afternoon"],
            "greetingEvening": K["evening"],
            "scan": K["scanDoc"],
            "today": K["todayQ"],
            "streak": K["streak"],
            "streakZero": K["streakZero"],
            "progress": K["progress"],
            "progressLine": K["progressLine"],
            "askVoice": K["askVoice"],
            "listening": K["listening"],
            "right": K["right"],
            "notQuite": K["notQuite"],
        },
        "scan": {"title": K["scanDoc"], "camera": K["camera"], "gallery": K["gallery"], "samples": K["samples"]},
        "result": {"heroLabel": K["hero"], "disclaimer": K["disclaimer"], "listenAll": K["listenAll"], "add": K["addTracker"], "ask": K["askDoc"]},
        "ask": {"unknown": K["unknown"]},
        "money": {
            "title": K["money"],
            "left": K["left"],
            "in": K["in"],
            "out": K["out"],
            "save": K["saved"],
            "add": K["add"],
            "more": K["more"],
            "export": K["export"],
            "import": K["import"],
            "goal": K["goal"],
        },
        "guide": {"title": K["guide"], "intro": K["guideIntro"], "search": K["search"], "empty": K["empty"]},
        "errors": {"generic": K["generic"], "offline": K["offline"]},
    })
    (ROOT / "locales" / "kn.json").write_text(json.dumps(kn, ensure_ascii=False, indent=2) + "\n")

    for name in ("daily-questions.json", "cases.json", "glossary.json", "guide.json", "paths.json"):
        path = ROOT / "content" / name
        data = json.loads(path.read_text())
        add_kn(data)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print("ok", name)


if __name__ == "__main__":
    main()
