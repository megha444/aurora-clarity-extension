import re
from typing import List, Dict

SCORE_MAP = {"low": 15, "medium": 25, "high": 40}

PATTERN_RULES = {
    "urgency": {
        "severity": "high",
        "patterns": [
            r"sale ends(?: in| tonight| soon)?",
            r"today only",
            r"limited time(?: offer)?",
            r"expires? in",
            r"last chance",
            r"flash sale",
            r"deal ends",
            r"hurry[\s,!]",
            r"offer ends",
        ],
        "fallback_message": "This page uses time-pressure language that may push faster decisions.",
        "why_it_matters": "Artificial deadlines can create anxiety and discourage comparison shopping.",
    },
    "scarcity": {
        "severity": "high",
        "patterns": [
            r"only \d+ left(?: in stock)?",
            r"\d+ (items? )?left in stock",
            r"(almost|selling) (gone|fast|out)",
            r"low stock",
            r"limited (stock|availability|supply)",
            r"while supplies last",
        ],
        "fallback_message": "This page flags low inventory, which may not reflect actual stock levels.",
        "why_it_matters": "Low-stock claims can manufacture urgency even when supply is plentiful.",
    },
    "social_proof": {
        "severity": "medium",
        "patterns": [
            r"\d+ people (are )?viewing (this|now)",
            r"\d+ (others? )?(are )?looking at this",
            r"\d+ (people |customers? )?(just |recently )?bought",
            r"\d+ sold in the (last|past) \d+ hours?",
            r"trending",
            r"popular choice",
            r"bestsell(er|ing)",
        ],
        "fallback_message": "This page shows social activity counts that may pressure conformity.",
        "why_it_matters": "Displaying live viewer or buyer counts creates social pressure to act quickly.",
    },
    "confirmshaming": {
        "severity": "medium",
        "patterns": [
            r"no[,\s] thanks[,\s] i (don.t|hate|prefer)",
            r"i (don.t|hate) (want|saving|deals|discounts)",
            r"i prefer to pay (full|more)",
            r"no thanks[,\s] i.ll (pay|miss|pass)",
            r"i don.t (want|need) (to save|savings|discounts)",
        ],
        "fallback_message": "The opt-out language here is designed to make declining feel embarrassing.",
        "why_it_matters": "Confirmshaming uses shame or guilt to coerce users into accepting offers.",
    },
    "hidden_costs": {
        "severity": "low",
        "patterns": [
            r"shipping calculated at checkout",
            r"fees (may )?apply",
            r"taxes (not )?included",
            r"additional charges",
            r"service fee",
        ],
        "fallback_message": "Final price may differ from what is shown here.",
        "why_it_matters": "Prices shown before checkout may not include fees, shipping, or taxes.",
    },
}


class DarkPatternDetector:

    def detect(self, page_text: str) -> List[Dict]:
        text_lower = page_text.lower()
        findings = []
        seen_keys = set()

        for pattern_type, config in PATTERN_RULES.items():
            for regex in config["patterns"]:
                for match in re.finditer(regex, text_lower):
                    key = (pattern_type, match.group())
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)

                    start = max(0, match.start() - 40)
                    end = min(len(page_text), match.end() + 40)
                    context = page_text[start:end].strip()

                    findings.append({
                        "pattern_type": pattern_type,
                        "severity": config["severity"],
                        "matched_text": match.group(),
                        "context": context,
                        "fallback_message": config["fallback_message"],
                        "why_it_matters": config["why_it_matters"],
                        "confidence": 0.85,
                        "score_contribution": SCORE_MAP[config["severity"]],
                    })

        return findings

    def compute_score(self, findings: List[Dict]) -> int:
        return min(sum(f["score_contribution"] for f in findings), 100)

    def score_label(self, score: int) -> str:
        if score < 25:
            return "Low manipulation signals"
        elif score < 50:
            return "Mild persuasion cues detected"
        elif score < 75:
            return "Strong persuasion cues detected"
        else:
            return "Heavy persuasion pressure detected"
