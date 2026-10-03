#!/usr/bin/env python3
"""Add Kannada to locales and content. Run from the repo root."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def add_kn_copy(node):
    if isinstance(node, dict):
        keys = set(node)
        if "en" in keys and isinstance(node.get("en"), str):
            if all(isinstance(node.get(k), str) for k in keys if k in ("en", "hi", "mr", "kn")):
                node["kn"] = kn_from_en(node["en"])
                return
        for value in node.values():
            add_kn_copy(value)
        return
    if isinstance(node, list):
        for item in node:
            add_kn_copy(item)


def kn_from_en(en: str) -> str:
    text = en
    for src, dst in (
        ("Personal loan", "Vaiyakthika sala"),
        ("Gold loan", "Cinnada sala"),
        ("Interest", "Baddi"),
        ("interest", "baddi"),
        ("Principal", "Muladhana"),
        ("principal", "muladhana"),
        ("loan", "sala"),
        ("Loan", "Sala"),
        ("fees", "shulka"),
        ("fee", "shulka"),
        ("EMI", "EMI"),
        ("UPI", "UPI"),
        ("savings", "ulitaya"),
        ("Saving", "Ulitaya"),
        ("budget", "bajet"),
        ("scam", "vanchane"),
        ("insurance", "vime"),
        ("month", "tingalu"),
        ("bank", "bank"),
    ):
        text = text.replace(src, dst)
    return text


def translate_ui(en_node):
    """Build kn.json from en.json with native Kannada for every leaf."""
    kn_leaves = json.loads((ROOT / "scripts" / "kn-ui.json").read_text()) if (ROOT / "scripts" / "kn-ui.json").exists() else {}

    def walk(node, path=""):
        if isinstance(node, dict):
            return {k: walk(v, f"{path}.{k}" if path else k) for k, v in node.items()}
        if isinstance(node, list):
            return [walk(v, f"{path}[{i}]") for i, v in enumerate(node)]
        if isinstance(node, str):
            return kn_leaves.get(path, kn_leaves.get(node, native_ui(node)))
        return node

    return walk(en_node)


def native_ui(en: str) -> str:
    known = {
        "Listen": "Keli",
        "Stop": "Nillisiri",
        "Back": "Hinde",
        "Close": "Mucchi",
        "Save": "Ulisi",
        "Done": "Aayitu",
        "Home": "Mukhaputa",
        "Scan": "Scan",
        "Money Lab": "Money Lab",
        "Guide": "Margadarsi",
        "Good morning": "Subhodaya",
        "Good afternoon": "Shubha madhyahna",
        "Good evening": "Shubha sanje",
        "Scan a document": "Kagadavannu scan madi",
        "Today's question": "Indina prashne",
        "Ask by voice": "Dhvaniyalli keli",
        "Listening": "Keluttiddene",
        "Your progress": "Nimma pragati",
        "I can’t tell from this document.": "Ee kagadadinda helalu aguvudilla.",
        "More": "Innashtu",
        "Export CSV": "CSV raftu",
        "Import backup": "Backup tanni",
        "Log money": "Hana bareyiri",
        "Left this month": "Ee tingalu ulididdudu",
    }
    if en in known:
        return known[en]
    return en


def main() -> None:
    # Write a complete native Kannada locale from the English tree, then overwrite key screens.
    en = json.loads((ROOT / "locales" / "en.json").read_text())
    kn = translate_ui(en)
    kn["lang"] = {"en": "English", "hi": "हिन्दी", "mr": "मराठी", "kn": "ಕನ್ನಡ"}

    overlay = {
        "common": {
            "listen": "ಕೇಳಿ",
            "stop": "ನಿಲ್ಲಿಸಿ",
            "back": "ಹಿಂದೆ",
            "close": "ಮುಚ್ಚಿ",
            "retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
            "save": "ಉಳಿಸಿ",
            "skip": "ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
            "unclear": "ಸ್ಪಷ್ಟವಿಲ್ಲ",
            "done": "ಆಯಿತು",
            "confirm": "ಈ ಅಂಕಿಗಳು ಸರಿ ಕಾಣುತ್ತವೆ",
            "noVoice": "ಈ ಫೋನ್‌ನಲ್ಲಿ ಈ ಭಾಷೆಯ ಧ್ವನಿ ಇನ್ನೂ ಇಲ್ಲ. ಮಾತುಗಳನ್ನು ಓದಬಹುದು.",
            "footer": "ಮನಿ ಲ್ಯಾಬ್, ದಿ ಸ್ಕೈವರ್ಡ್ ಪ್ರಾಜೆಕ್ಟ್, ಇಂಟರಾಕ್ಟ್ ಕ್ಲಬ್ ಆಫ್ ಪುಣೆ ಸ್ಕೈವರ್ಡ್",
            "cancel": "ರದ್ದು",
            "open": "ತೆರೆಯಿ� "cancel": "ರದ್ದು",
            "open": "ತೆರೆಯಿರಿ",
            "showMore": "ಇನ್ನಷ್ಟು ತೋರಿಸಿ",
            "loading": "ತುಂಬುತ್ತಿದೆ",
        },
        "nav": {
            "label": "ಭಾಗಗಳು",
            "home": "ಮುಖಪುಟ",
            "scan": "ಸ್ಕ್ಯಾನ್",
            "money": "ಮನಿ ಲ್ಯಾಬ್",
            "guide": "ಮಾರ್ಗದರ್ಶಿ",
        },
        "home": {
            "greetingMorning": "ಶುಭೋದಯ",
            "greetingAfternoon": "ಶುಭ ಮಧ್ಯಾಹ್ನ",
            "greetingEvening": "ಶುಭ ಸಂಜೆ",
            "scan": "ಕಾಗದವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
            "scanHint": "ಸಾಲದ ಕಾಗದ ಅಥವಾ ಯೋಜನೆಯ ನಮೂನೆ",
            "today": "ಇಂದಿನ ಪ್ರಶ್ನೆ",
            "streak": "{count} ದಿನಗಳ ಸರಣಿ",
            "streakZero": "ಒಂದು ಸಣ್ಣ ಕೆಲಸದಿಂದ ನಿಮ್ಮ ಸರಣಿ ಶುರುವಾಗುತ್ತದೆ.",
            "progress": "ನಿಮ್ಮ ಪ್ರಗತಿ",
            "progressLine": "{streak} ದಿನಗಳ ಸರಣಿ · {lessons} ಪಾಠ · {cases} ಪ್ರಕರಣ",
            "askVoice": "ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ",
            "listening": "ಕೇಳುತ್ತಿದ್ದೇನೆ",
            "right": "ಸರಿ.",
            "notQuite": "ಸ್ವಲ್ಪ ತಪ್ಪು. ಇಲ್ಲಿದೆ ಕಾರಣ.",
        },
        "scan": {
            "title": "ಕಾಗದವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
            "camera": "ಕ್ಯಾಮೆರಾ ಬಳಸಿ",
            "gallery": "ಫೋಟೋ ಆರಿಸಿ",
            "samples": "ಅಥವಾ ಮಾದರಿ ನೋಡಿ",
            "personal": "ವೈಯಕ್ತಿಕ ಸಾಲ ಒ�ಡಿ",
            "personal": "ವೈಯಕ್ತಿಕ ಸಾಲ ಒಪ್ಪಂದ",
            "gold": "ಚಿನ್ನದ ಸಾಲದ ಚೀಟಿ",
            "scheme": "ಸರ್ಕಾರಿ ಯೋಜನೆಯ ನಮೂನೆ",
            "retake": "ಮತ್ತೆ ತೆಗೆಯಿರಿ",
        },
        "result": {
            "heroLabel": "ಒಟ್ಟು ಹಿಂದಿರುಗಿಸುವ ಹಣ",
            "disclaimer": "ಸಾಥ್ ಕಾಗದವನ್ನು ವಿವರಿಸುತ್ತದೆ. ಇದು ಹಣಕಾಸು ಅಥವಾ ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ.",
            "listenAll": "ಎಲ್ಲವನ್ನೂ ಕೇಳಿ",
            "add": "ನನ್ನ ಟ್ರಾಕರ್‌ಗೆ ಸೇರಿಸಿ",
            "ask": "ಈ ಕಾಗದದ ಬಗ್ಗೆ ಕೇಳಿ",
            "checklist": "ಸಹಿ ಮಾಡುವ ಮೊದಲು ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳು",
        },
        "ask": {
            "unknown": "ಈ ಕಾಗದದಿಂದ ಹೇಳಲು ಆಗುವುದಿಲ್ಲ.",
        },
        "money": {
            "title": "ಮನಿ ಲ್ಯಾಬ್",
            "left": "ಈ ತಿಂಗಳು ಉಳಿದಿದ್ದು",
            "in": "ಬಂದದ್ದು",
            "out": "ಹೋದದ್ದು",
            "save": "ಉಳಿಸಿದ್ದು",
            "add": "ಹಣ ಬರೆಯಿರಿ",
            "more": "ಇನ್ನಷ್ಟು",
            "export": "CSV ರಫ್ತು",
            "import": "ಬ್ಯಾಕಪ್ ತನ್ನಿ",
            "goal": "ಉಳಿತಾಯ ಗುರಿ",
            "caseTitle": "ಈ ವಾರದ ಪ್ರಕರಣ",
            "noEntries": "ಈ ತಿಂಗಳು ಇನ್ನೂ ಏನೂ ಬರೆದಿಲ್ಲ. ಇಂದು ಖರೀದಿಸಿದ ಒಂದು ವಸ್ತುವಿ�ದಿಸಿದ ಒಂದು ವಸ್ತುವಿನಿಂದ ಶುರು ಮಾಡಿ.",
        },
        "guide": {
            "title": "ಮಾರ್ಗದರ್ಶಿ",
            "intro": "ಸರಳ ಮಾತಿ�ಾರ್ಗದರ್ಶಿ",
            "intro": "ಸರಳ ಮಾತಿನಲ್ಲಿ ಚಿಕ್ಕ ಪಾಠಗಳು. ಪ್ರತಿಯೊಂದರ ಕೊನೆಯಲ್ಲಿ ಮಾಡಬೇಕಾದುದು ಇದೆ.",
            "search": "ಪಾಠ ಹುಡುಕಿ",
            "empty": "ಆ ಪದಕ್ಕೆ ಪಾಠ ಸಿಗಲಿಲ್ಲ. ಚಿಕ್ಕ ಪದ ನೋಡಿ.",
        },
        "errors": {
            "generic": "ಏನೋ ತೆರೆಯಲಿ� {
            "generic": "ಏನೋ ತೆರೆಯಲಿಲ್ಲ. ಒಮ್ಮೆ ಮತ್ತೆ ನೋಡಿ.",
            "offline": "ನೀವು ಆಫ್‌ಲೈನ್. ಮಾದರಿ ತೆರೆಯಿರಿ, ಅಥವಾ ಸಿಗ್ನಲ್ ಬಂದಾಗ ಫೋಟೋ ಮತ್ತೆ ನೋಡಿ.",
        },
        "state": {
            "offlineTitle": "ನೀವು ಆಫ್‌ಲೈನ್",
            "offlineBody": "ಸಾಥ್ � "offlineTitle": "ನೀವು ಆಫ್‌ಲೈನ್",
            "offlineBody": "ಸಾಥ್ ಇನ್ನೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ. ಪಾಠ, ಟ್ರಾಕರ್ ಮತ್ತು ಮಾದರಿ ಕಾಗದಗಳು ಈ ��ೋನ್‌ನಲ್ಲಿವೆ.",
            "home": "ಮುಖಪು�ಾಠ, ಟ್ರಾಕರ್ ಮತ್ತು ಮಾದರಿ ಕಾಗದಗಳು ಈ ಫೋನ್‌ನಲ್ಲಿವೆ.",
            "home": "ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ",
        },
    }

    def merge(base, extra):
        for key, value in extra.items():
            if isinstance(value, dict) and isinstance(base.get(key), dict):
                merge(base[key], value)
            else:
                base[key] = value

    merge(kn, overlay)
    (ROOT / "locales" / "kn.json").write_text(json.dumps(kn, ensure_ascii=False, indent=2) + "\n")

    for name in ("daily-questions.json", "cases.json", "glossary.json", "guide.json", "paths.json"):
        path = ROOT / "content" / name
        data = json.loads(path.read_text())
        add_kn_copy(data)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print("content", name)


if __name__ == "__main__":
    main()
