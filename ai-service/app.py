from __future__ import annotations

import hashlib
import json
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Arcane Codex AI Service", version="0.2.0")

AI_MODE = os.getenv("AI_MODE", "cpu").lower()
AI_MODEL_CPU = os.getenv("AI_MODEL_CPU", "codellama:7b-instruct-q4")
AI_MODEL_GPU = os.getenv("AI_MODEL_GPU", "mistral:7b-instruct")
AI_PROVIDER = os.getenv("AI_PROVIDER", "local")
REGISTRY_PATH = Path(os.getenv("AI_MODEL_REGISTRY_PATH", "/data/models.json"))
TRAINING_DATA_PATH = Path(os.getenv("AI_TRAINING_DATA_PATH", "/data/feedback.jsonl"))

ENTITY_TYPES = (
    "player_investigator",
    "ally_npc",
    "hostile_npc",
    "neutral_contact",
    "creature_entity",
    "deity_cosmic_power",
    "other",
)

ARCHETYPE_PROFILES: dict[str, dict[str, Any]] = {
    "player_investigator": {
        "default_tone": "gothic",
        "default_relationship": "supportive",
        "default_threat": "moderate",
        "default_faction": "bureau",
        "default_metaphysical": "mortal",
        "default_focus": "knowledge",
        "roles": ["field investigator", "occult detective", "case agent", "forensic medium"],
        "affiliations": ["the Bureau of Supernatural Investigation", "an improvised occult task force", "a private case bureau"],
        "cases": ["a spreading occult incident", "a sealed file tied to vanished witnesses", "an investigation no one else will touch"],
        "locations": ["a rain-soaked industrial district", "an archive with too many locked rooms", "a town already whispering about omens"],
        "narrative_roles": ["front-line investigator", "player-facing protagonist", "truth-seeker with too much to lose"],
        "motivations": ["proving the impossible is real", "protecting the innocent before panic wins", "uncovering the truth behind a buried conspiracy"],
        "demeanors": ["measured under pressure", "restless but disciplined", "haunted yet stubbornly methodical"],
        "descriptors": ["sharp-eyed", "resourceful", "battle-worn", "scholarly"],
        "pressures": ["every clue threatens to become a curse", "their curiosity keeps dragging them deeper", "they work best when the situation turns impossible"],
        "stat_bias": {"dex": 2, "intelligence": 3, "pow": 2, "edu": 2},
        "skill_keywords": ["spot", "listen", "library", "psychology", "occult", "track", "firearms", "dodge"],
    },
    "ally_npc": {
        "default_tone": "mysterious",
        "default_relationship": "supportive",
        "default_threat": "low",
        "default_faction": "independent",
        "default_metaphysical": "mortal",
        "default_focus": "support",
        "roles": ["trusted fixer", "occult confidant", "scarred field medic", "librarian of forbidden records"],
        "affiliations": ["a cautious allied circle", "a discreet chapter house", "an old family network with occult ties"],
        "cases": ["quietly moving evidence away from dangerous hands", "keeping a fragile alliance intact", "helping the investigators survive the next revelation"],
        "locations": ["a hidden safehouse", "a shuttered parish archive", "a candlelit back room above a pharmacy"],
        "narrative_roles": ["supportive ally", "keeper of essential context", "fragile anchor in a worsening campaign"],
        "motivations": ["shielding others from a mistake they once made", "repaying an old debt before the dead collect it", "keeping hope alive in a campaign built on dread"],
        "demeanors": ["warm but guarded", "soft-spoken and practical", "steady until the occult grows personal"],
        "descriptors": ["reliable", "weathered", "compassionate", "discreet"],
        "pressures": ["their loyalty may cost them everything", "they know more than they are saying", "their help only matters if the investigators trust them in time"],
        "stat_bias": {"con": 1, "pow": 2, "cha": 2, "edu": 2},
        "skill_keywords": ["first aid", "medicine", "psychology", "persuade", "listen", "occult", "library", "charm"],
    },
    "hostile_npc": {
        "default_tone": "grim",
        "default_relationship": "adversarial",
        "default_threat": "high",
        "default_faction": "cult",
        "default_metaphysical": "mortal",
        "default_focus": "combat",
        "roles": ["cult enforcer", "rival investigator", "occult assassin", "fanatical handler"],
        "affiliations": ["a sealed inner cult", "a predatory conspiracy", "a rival cell feeding on fear"],
        "cases": ["breaking the investigators before they reach the truth", "silencing witnesses tied to a ritual", "turning a local panic into strategic cover"],
        "locations": ["a tenement already under surveillance", "a desecrated warehouse chapel", "the edge of a ritual perimeter"],
        "narrative_roles": ["active antagonist", "escalation engine", "human face of a larger threat"],
        "motivations": ["winning power through sacrifice and intimidation", "burying evidence before it exposes their patron", "proving fear is more useful than loyalty"],
        "demeanors": ["coldly focused", "serpentine and patient", "brutal the instant restraint stops paying"],
        "descriptors": ["predatory", "disciplined", "merciless", "charismatic in a dangerous way"],
        "pressures": ["their plans leave little room for mercy", "they weaponize uncertainty as effectively as violence", "they only become more dangerous when cornered"],
        "stat_bias": {"str": 2, "con": 2, "dex": 2, "pow": 1},
        "skill_keywords": ["fight", "firearms", "intimidate", "stealth", "dodge", "brawl", "occult"],
    },
    "neutral_contact": {
        "default_tone": "scholarly",
        "default_relationship": "transactional",
        "default_threat": "low",
        "default_faction": "civilian",
        "default_metaphysical": "mortal",
        "default_focus": "social",
        "roles": ["city archivist", "reluctant witness", "black-market broker", "retired inspector"],
        "affiliations": ["a mundane civic institution", "no faction stronger than self-preservation", "a local network of rumors and favors"],
        "cases": ["deciding whether helping the investigators is worth the danger", "trading information in careful fragments", "staying alive while everyone else wants answers"],
        "locations": ["a municipal records office", "a train platform after midnight", "a respectable club with too many side deals"],
        "narrative_roles": ["information gatekeeper", "tense bargaining partner", "mundane witness near the supernatural edge"],
        "motivations": ["surviving without choosing a side too early", "protecting personal leverage in a dangerous city", "keeping their name out of the official report"],
        "demeanors": ["careful and evasive", "courteous but wary", "pragmatic with flashes of nerves"],
        "descriptors": ["well-informed", "cagey", "socially agile", "hard to read"],
        "pressures": ["every answer they give creates a fresh risk", "they can become ally or obstacle by small degrees", "they understand that the truth has a price"],
        "stat_bias": {"dex": 1, "intelligence": 2, "cha": 2, "edu": 2},
        "skill_keywords": ["persuade", "fast talk", "psychology", "credit", "law", "library", "history"],
    },
    "creature_entity": {
        "default_tone": "surreal",
        "default_relationship": "predatory",
        "default_threat": "high",
        "default_faction": "occult",
        "default_metaphysical": "eldritch",
        "default_focus": "survival",
        "roles": ["shrine-haunting entity", "ritual predator", "threshold guardian", "unnatural stalker"],
        "affiliations": ["an ancient hunger", "a place corrupted by ritual residue", "no human allegiance at all"],
        "cases": ["manifesting wherever reality is thin", "hunting anyone who disturbs its pattern", "feeding on fear, memory, or blood"],
        "locations": ["beneath a church crypt", "inside a collapsed mine chapel", "where the veil has been worn raw"],
        "narrative_roles": ["supernatural threat", "nonhuman complication", "embodiment of the campaign's wrongness"],
        "motivations": ["satisfying an inhuman hunger", "protecting the terms of an ancient trespass", "expanding its influence through dread and repetition"],
        "demeanors": ["alien and unreadable", "ritualistic in its violence", "patient until provoked into sudden brutality"],
        "descriptors": ["unnatural", "luminous", "wrong-limbed", "grave-cold"],
        "pressures": ["its existence distorts every scene around it", "its logic is consistent only by nonhuman standards", "it turns a simple encounter into a test of sanity"],
        "stat_bias": {"str": 3, "con": 3, "siz": 2, "dex": 2, "pow": 2, "app": -3},
        "skill_keywords": ["stealth", "track", "listen", "spot", "dodge", "occult", "intimidate"],
    },
    "deity_cosmic_power": {
        "default_tone": "gothic",
        "default_relationship": "revered",
        "default_threat": "apocalyptic",
        "default_faction": "cosmic",
        "default_metaphysical": "divine",
        "default_focus": "occult",
        "roles": ["sleeping star-god", "saint of the abyss", "cosmic patron", "judgment-bearing divinity"],
        "affiliations": ["a cosmic order older than humanity", "its worshippers across forgotten centuries", "the vast dark beyond mortal theology"],
        "cases": ["reshaping the campaign through prophecy and dread", "testing mortals through signs and impossible bargains", "awakening through compromised rites and desperate faith"],
        "locations": ["beyond the visible heavens", "inside dreams shared by cultists and saints", "at the ritual center of a crumbling city"],
        "narrative_roles": ["cosmic mover", "divine patron or destroyer", "source of campaign-scale consequences"],
        "motivations": ["reordering human meaning around its will", "drawing worship, sacrifice, and revelation into one design", "proving that mortal certainty is a temporary illusion"],
        "demeanors": ["austere and immense", "terribly calm", "merciful only by inhuman standards"],
        "descriptors": ["celestial", "vast", "mythic", "reality-bending"],
        "pressures": ["its attention alone changes the stakes", "every appearance should feel like a shift in the campaign itself", "its goals can eclipse ordinary human survival"],
        "stat_bias": {"str": 4, "con": 4, "siz": 4, "intelligence": 4, "pow": 6, "cha": 4, "app": 2, "edu": 3},
        "skill_keywords": ["occult", "language", "history", "intimidate", "persuade", "science", "psychology"],
    },
    "other": {
        "default_tone": "mysterious",
        "default_relationship": "uncertain",
        "default_threat": "moderate",
        "default_faction": "independent",
        "default_metaphysical": "mortal",
        "default_focus": "knowledge",
        "roles": ["unclassifiable actor", "strange interloper", "wild-card presence", "difficult witness"],
        "affiliations": ["a shifting set of obligations", "no stable allegiance", "a private agenda no faction fully understands"],
        "cases": ["complicating an already unstable investigation", "pulling the campaign in an unexpected direction", "forcing the investigators to question their assumptions"],
        "locations": ["wherever the pattern becomes unstable", "a liminal meeting place", "the edge between rumor and incident"],
        "narrative_roles": ["wild card", "complication vector", "unfixed influence on the story"],
        "motivations": ["testing what everyone else believes is true", "pursuing a private agenda behind public events", "keeping the campaign unstable enough to stay interesting"],
        "demeanors": ["enigmatic", "mercurial", "controlled until it suddenly is not"],
        "descriptors": ["unsettling", "adaptable", "hard to categorize", "quietly dangerous"],
        "pressures": ["they refuse to settle into a single role", "their presence should widen the story rather than flatten it", "they keep everyone else slightly off balance"],
        "stat_bias": {"dex": 1, "intelligence": 2, "pow": 1},
        "skill_keywords": ["occult", "persuade", "stealth", "history", "psychology", "spot"],
    },
}

ENTITY_KEYWORDS = {
    "player_investigator": ["investigator", "detective", "agent", "case officer", "bureau", "sleuth", "player character", "pc"],
    "ally_npc": ["ally", "friend", "helper", "confidant", "support", "trusted", "mentor", "healer"],
    "hostile_npc": ["enemy", "villain", "hostile", "assassin", "rival", "cultist", "traitor", "antagonist"],
    "neutral_contact": ["contact", "witness", "informant", "merchant", "civilian", "broker", "archivist"],
    "creature_entity": ["creature", "entity", "monster", "spirit", "ghost", "beast", "abomination", "undead"],
    "deity_cosmic_power": ["deity", "god", "goddess", "cosmic", "divine", "patron", "saint", "eldritch god"],
}

TONE_KEYWORDS = {
    "gothic": ["gothic", "cathedral", "candlelit", "somber", "baroque"],
    "grim": ["grim", "bleak", "harsh", "brutal", "merciless"],
    "mysterious": ["mysterious", "enigmatic", "uncertain", "veiled", "secretive"],
    "scholarly": ["scholarly", "academic", "archival", "measured", "erudite"],
    "heroic": ["heroic", "resolute", "noble", "brave"],
    "tragic": ["tragic", "doomed", "haunted", "grief-stricken"],
    "clinical": ["clinical", "cold", "precise", "forensic"],
    "surreal": ["surreal", "dreamlike", "alien", "impossible", "nightmare"],
}

RELATIONSHIP_KEYWORDS = {
    "supportive": ["ally", "friendly", "supportive", "helpful", "protector"],
    "adversarial": ["enemy", "hostile", "rival", "opposed", "hunter"],
    "uncertain": ["ambiguous", "uncertain", "unreliable", "mixed loyalty"],
    "transactional": ["transactional", "for a price", "mercenary", "broker"],
    "revered": ["worship", "revered", "divine", "saint"],
    "predatory": ["predatory", "feeds on", "hunts", "stalks"],
}

THREAT_KEYWORDS = {
    "low": ["safe", "minor", "humble", "small-scale"],
    "moderate": ["dangerous", "unstable", "fraught", "volatile"],
    "high": ["deadly", "lethal", "high threat", "violent", "catastrophic"],
    "apocalyptic": ["apocalyptic", "world-ending", "cosmic", "civilization", "extinction"],
}

FACTION_KEYWORDS = {
    "bureau": ["bureau", "investigation", "agency", "task force"],
    "civilian": ["civilian", "merchant", "local", "town", "public"],
    "cult": ["cult", "rite", "sacrifice", "fanatic"],
    "occult": ["occult", "society", "arcane", "ritual"],
    "cosmic": ["cosmic", "divine", "star", "god", "celestial"],
    "independent": ["independent", "freelance", "private", "unaffiliated"],
}

METAPHYSICAL_KEYWORDS = {
    "mortal": ["mortal", "human", "ordinary"],
    "touched": ["touched", "blessed", "cursed", "marked"],
    "spectral": ["spectral", "ghost", "undead", "wraith"],
    "eldritch": ["eldritch", "otherworldly", "alien", "abomination"],
    "divine": ["divine", "god", "holy", "cosmic"],
    "constructed": ["construct", "artificial", "clockwork", "automaton"],
}

MECHANICAL_FOCUS_KEYWORDS = {
    "social": ["social", "diplomat", "persuade", "charm", "influence"],
    "combat": ["combat", "fighter", "soldier", "battle", "duelist"],
    "stealth": ["stealth", "infiltration", "sneak", "thief", "shadow"],
    "occult": ["occult", "ritual", "magic", "mythos", "spell"],
    "survival": ["survival", "endurance", "tracker", "beast", "hardy"],
    "command": ["command", "leader", "officer", "captain"],
    "support": ["support", "healer", "medic", "aid"],
    "knowledge": ["knowledge", "scholar", "research", "library", "forensic"],
}

MECHANICAL_FOCUS_STAT_BONUS = {
    "social": {"cha": 3, "app": 2, "edu": 1},
    "combat": {"str": 3, "dex": 2, "con": 2},
    "stealth": {"dex": 3, "intelligence": 1, "siz": -1},
    "occult": {"pow": 4, "intelligence": 2, "edu": 1},
    "survival": {"con": 3, "siz": 1, "pow": 1},
    "command": {"cha": 3, "pow": 2, "edu": 2},
    "support": {"pow": 2, "edu": 2, "cha": 1},
    "knowledge": {"intelligence": 3, "edu": 3, "pow": 1},
}

EVALUATION_CRITERIA = [
    {
        "key": "distinctiveness",
        "label": "Distinctiveness",
        "description": "Checks whether the output has a unique identity, agenda, and demeanor rather than recycling the same investigator framing.",
    },
    {
        "key": "prompt_adherence",
        "label": "Prompt Adherence",
        "description": "Checks whether explicit role, tone, relationship, and threat cues are reflected in the generated result.",
    },
    {
        "key": "repetition_control",
        "label": "Repetition Control",
        "description": "Checks whether the prose avoids stock phrases and excessive reuse of the same wording.",
    },
    {
        "key": "archetype_accuracy",
        "label": "Archetype Accuracy",
        "description": "Checks whether the final concept fits the intended investigator, ally, enemy, entity, or deity lane.",
    },
]


class PromptContext(BaseModel):
    entityType: str = ""
    narrativeRole: str = ""
    tone: str = ""
    playerRelationship: str = ""
    threatLevel: str = ""
    factionAlignment: str = ""
    metaphysicalNature: str = ""
    mechanicalFocus: str = ""


class CharacterTextInput(BaseModel):
    name: str = ""
    firstName: str = ""
    lastName: str = ""
    race: str = ""
    gender: str = ""
    role: str = ""
    affiliation: str = ""
    currentCase: str = ""
    currentLocation: str = ""
    homeOrigin: str = ""
    baseDescription: str = ""
    additionalPrompt: str = ""
    systemPrompt: str = ""
    promptContext: PromptContext = Field(default_factory=PromptContext)


class SkillInput(BaseModel):
    id: int
    name: str
    category: str = "Other"
    baseValue: int = 0


class CharacterStatsInput(BaseModel):
    name: str = ""
    role: str = ""
    race: str = ""
    description: str = ""
    additionalPrompt: str = ""
    systemPrompt: str = ""
    promptContext: PromptContext = Field(default_factory=PromptContext)
    skills: list[SkillInput] = Field(default_factory=list)


class CharacterBulkRowInput(BaseModel):
    rowIndex: int
    name: str = ""
    firstName: str = ""
    lastName: str = ""
    role: str = ""
    status: str = ""
    systemPrompt: str = ""
    additionalPrompt: str = ""
    promptContext: PromptContext = Field(default_factory=PromptContext)


class RetrainRequest(BaseModel):
    trainingExamples: list[dict[str, Any]] = Field(default_factory=list)
    mode: Literal["cpu", "gpu"] = "cpu"
    baseModel: str = ""


class FeedbackRecord(BaseModel):
    generationId: str
    status: Literal["ACCEPTED", "EDITED", "REJECTED"]
    finalValues: dict[str, Any] | None = None


class EvaluationCase(BaseModel):
    id: str
    label: str
    promptSummary: str
    payload: CharacterTextInput


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def active_model_name() -> str:
    return AI_MODEL_GPU if AI_MODE == "gpu" else AI_MODEL_CPU


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def load_registry() -> dict[str, Any]:
    if not REGISTRY_PATH.exists():
        return {
            "provider": AI_PROVIDER,
            "active_model": active_model_name(),
            "active_version": "bootstrap-v1",
            "history": [
                {
                    "version": "bootstrap-v1",
                    "model": active_model_name(),
                    "mode": AI_MODE,
                    "created_at": now_iso(),
                }
            ],
        }
    with REGISTRY_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_registry(registry: dict[str, Any]) -> None:
    ensure_parent(REGISTRY_PATH)
    with REGISTRY_PATH.open("w", encoding="utf-8") as f:
        json.dump(registry, f)


def clean(value: Any) -> str:
    return str(value or "").strip()


def normalized_key(value: str) -> str:
    lowered = re.sub(r"[^a-z0-9]+", "_", clean(value).lower()).strip("_")
    return lowered


def labelize(value: str) -> str:
    return clean(value).replace("_", " ").title()


def joined_text(*values: Any) -> str:
    return " ".join(part for part in (clean(v) for v in values) if part)


def seeded_random(*parts: Any) -> random.Random:
    text = "|".join(clean(part) for part in parts)
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))


def pick(rnd: random.Random, items: list[str]) -> str:
    return items[rnd.randrange(len(items))] if items else ""


def keyword_score(text: str, keywords: list[str]) -> int:
    lowered = text.lower()
    return sum(2 if f" {keyword.lower()} " in f" {lowered} " else 1 for keyword in keywords if keyword.lower() in lowered)


def infer_key(explicit: str, text: str, mapping: dict[str, list[str]], fallback: str) -> str:
    normalized = normalized_key(explicit)
    if normalized in mapping or normalized in ENTITY_TYPES:
        return normalized

    scores = {key: keyword_score(text, words) for key, words in mapping.items()}
    best_key = max(scores, key=scores.get, default=fallback)
    return best_key if scores.get(best_key, 0) > 0 else fallback


def stat_clamp(value: int, low: int = 3, high: int = 28) -> int:
    return max(low, min(high, value))


def extract_name(payload_name: str, first_name: str, last_name: str, fallback: str) -> str:
    full_name = clean(payload_name)
    if full_name:
        return full_name
    combined = joined_text(first_name, last_name)
    return combined or fallback


def normalize_context(context: PromptContext) -> dict[str, str]:
    return {
        "entityType": normalized_key(context.entityType),
        "narrativeRole": clean(context.narrativeRole),
        "tone": normalized_key(context.tone),
        "playerRelationship": normalized_key(context.playerRelationship),
        "threatLevel": normalized_key(context.threatLevel),
        "factionAlignment": normalized_key(context.factionAlignment),
        "metaphysicalNature": normalized_key(context.metaphysicalNature),
        "mechanicalFocus": normalized_key(context.mechanicalFocus),
    }


def infer_reasoning(*, name: str, role: str, affiliation: str, description: str, additional_prompt: str, system_prompt: str, current_case: str, current_location: str, home_origin: str, context: PromptContext) -> dict[str, Any]:
    ctx = normalize_context(context)
    text = joined_text(
        name,
        role,
        affiliation,
        description,
        additional_prompt,
        system_prompt,
        current_case,
        current_location,
        home_origin,
        ctx["narrativeRole"],
    ).lower()

    fallback_entity = "neutral_contact"
    if any(term in text for term in ["investigator", "detective", "bureau"]):
        fallback_entity = "player_investigator"
    elif any(term in text for term in ["god", "deity", "cosmic", "divine"]):
        fallback_entity = "deity_cosmic_power"
    elif any(term in text for term in ["creature", "entity", "spirit", "ghost", "monster"]):
        fallback_entity = "creature_entity"
    elif any(term in text for term in ["enemy", "cult", "assassin", "hostile", "rival"]):
        fallback_entity = "hostile_npc"
    elif any(term in text for term in ["ally", "friend", "mentor", "healer"]):
        fallback_entity = "ally_npc"

    entity_type = ctx["entityType"] if ctx["entityType"] in ENTITY_TYPES else infer_key(ctx["entityType"], text, ENTITY_KEYWORDS, fallback_entity)
    profile = ARCHETYPE_PROFILES[entity_type]

    tone = infer_key(ctx["tone"], text, TONE_KEYWORDS, profile["default_tone"])
    relationship = infer_key(ctx["playerRelationship"], text, RELATIONSHIP_KEYWORDS, profile["default_relationship"])
    threat_level = infer_key(ctx["threatLevel"], text, THREAT_KEYWORDS, profile["default_threat"])
    faction_alignment = infer_key(ctx["factionAlignment"], text, FACTION_KEYWORDS, profile["default_faction"])
    metaphysical_nature = infer_key(ctx["metaphysicalNature"], text, METAPHYSICAL_KEYWORDS, profile["default_metaphysical"])
    mechanical_focus = infer_key(ctx["mechanicalFocus"], text, MECHANICAL_FOCUS_KEYWORDS, profile["default_focus"])

    rnd = seeded_random(name, role, affiliation, description, additional_prompt, system_prompt, current_case, current_location, home_origin, entity_type, tone, relationship, threat_level, faction_alignment, metaphysical_nature, mechanical_focus, ctx["narrativeRole"])

    narrative_role = clean(ctx["narrativeRole"]) or pick(rnd, profile["narrative_roles"])
    motivation = pick(rnd, profile["motivations"])
    demeanor = pick(rnd, profile["demeanors"])
    descriptor = pick(rnd, profile["descriptors"])
    pressure = pick(rnd, profile["pressures"])

    suggested_role = clean(role) or pick(rnd, profile["roles"])
    suggested_affiliation = clean(affiliation) or pick(rnd, profile["affiliations"])
    suggested_case = clean(current_case) or pick(rnd, profile["cases"])
    suggested_location = clean(current_location) or clean(home_origin) or pick(rnd, profile["locations"])
    suggested_home = clean(home_origin) or suggested_location

    mechanical_label = mechanical_focus.replace("_", " ")
    internal_plan = [
        f"Infer archetype as {entity_type}",
        f"Set tone to {tone}",
        f"Set player relationship to {relationship}",
        f"Set mechanical emphasis to {mechanical_focus}",
        f"Use narrative role '{narrative_role}'",
    ]

    return {
        "entityType": entity_type,
        "tone": tone,
        "playerRelationship": relationship,
        "threatLevel": threat_level,
        "factionAlignment": faction_alignment,
        "metaphysicalNature": metaphysical_nature,
        "mechanicalFocus": mechanical_focus,
        "mechanicalLabel": labelize(mechanical_label),
        "narrativeRole": narrative_role,
        "motivation": motivation,
        "demeanor": demeanor,
        "descriptor": descriptor,
        "pressure": pressure,
        "suggestedRole": suggested_role,
        "suggestedAffiliation": suggested_affiliation,
        "suggestedCase": suggested_case,
        "suggestedLocation": suggested_location,
        "suggestedHome": suggested_home,
        "internalPlan": internal_plan,
        "random": rnd,
        "profile": profile,
    }


def build_character_text_suggestion(payload: CharacterTextInput) -> dict[str, Any]:
    name = extract_name(payload.name, payload.firstName, payload.lastName, "Unnamed Figure")
    reasoning = infer_reasoning(
        name=name,
        role=payload.role,
        affiliation=payload.affiliation,
        description=payload.baseDescription,
        additional_prompt=payload.additionalPrompt,
        system_prompt=payload.systemPrompt,
        current_case=payload.currentCase,
        current_location=payload.currentLocation,
        home_origin=payload.homeOrigin,
        context=payload.promptContext,
    )

    role = reasoning["suggestedRole"]
    affiliation = reasoning["suggestedAffiliation"]
    current_case = reasoning["suggestedCase"]
    location = reasoning["suggestedLocation"]
    home_origin = reasoning["suggestedHome"]

    lead = f"{name} is cast as {reasoning['narrativeRole']}, working as {role}"
    if affiliation:
        lead += f" within {affiliation}"
    lead += "."

    agenda = (
        f"Driven by {reasoning['motivation']}, this {reasoning['descriptor']} presence stays {reasoning['demeanor']} even as "
        f"{current_case} spreads through {location}."
    )
    campaign_role = f"Their scenes should feel {reasoning['tone']} and {reasoning['playerRelationship']}, with {reasoning['pressure']}"
    mechanical = f" Mechanically, lean toward {reasoning['mechanicalLabel'].lower()} rather than a generic investigator template."

    description_parts = []
    if clean(payload.baseDescription):
        description_parts.append(clean(payload.baseDescription).rstrip(".") + ".")
    description_parts.extend([lead, agenda, campaign_role + "." + mechanical])

    return {
        "description": " ".join(description_parts),
        "affiliation": affiliation,
        "currentCase": current_case,
        "currentLocation": location,
        "homeOrigin": home_origin,
        "role": role,
        "entityType": labelize(reasoning["entityType"]),
        "narrativeRole": reasoning["narrativeRole"],
        "motivations": reasoning["motivation"],
        "demeanor": reasoning["demeanor"],
        "mechanicalFocus": reasoning["mechanicalLabel"],
    }


def skill_score(skill: SkillInput, reasoning: dict[str, Any], rnd: random.Random) -> int:
    name = clean(skill.name).lower()
    category = clean(skill.category).lower()
    profile_keywords = reasoning["profile"]["skill_keywords"]
    focus_keywords = MECHANICAL_FOCUS_KEYWORDS.get(reasoning["mechanicalFocus"], [])

    score = skill.baseValue
    if any(keyword in name or keyword in category for keyword in profile_keywords):
        score += rnd.randint(12, 24)
    if any(keyword in name or keyword in category for keyword in focus_keywords):
        score += rnd.randint(10, 20)
    if clean(reasoning["suggestedRole"]).lower() and clean(reasoning["suggestedRole"]).lower() in name:
        score += 8
    if reasoning["entityType"] == "deity_cosmic_power" and any(keyword in name for keyword in ["occult", "language", "intimid", "mythos"]):
        score += 12
    if reasoning["entityType"] == "creature_entity" and any(keyword in name for keyword in ["stealth", "track", "listen", "spot", "dodge"]):
        score += 10
    score += rnd.randint(-4, 8)
    return max(1, min(100, score))


def build_stats_suggestion(payload: CharacterStatsInput) -> dict[str, Any]:
    name = extract_name(payload.name, "", "", "Unnamed Figure")
    reasoning = infer_reasoning(
        name=name,
        role=payload.role,
        affiliation="",
        description=payload.description,
        additional_prompt=payload.additionalPrompt,
        system_prompt=payload.systemPrompt,
        current_case="",
        current_location="",
        home_origin="",
        context=payload.promptContext,
    )
    rnd = reasoning["random"]

    stats = {
        "str": 10,
        "con": 10,
        "siz": 10,
        "dex": 10,
        "intelligence": 10,
        "pow": 10,
        "cha": 10,
        "app": 10,
        "edu": 10,
    }

    for key, value in reasoning["profile"]["stat_bias"].items():
        stats[key] = stats.get(key, 10) + value
    for key, value in MECHANICAL_FOCUS_STAT_BONUS.get(reasoning["mechanicalFocus"], {}).items():
        stats[key] = stats.get(key, 10) + value

    if reasoning["threatLevel"] == "high":
        stats["pow"] += 1
        stats["con"] += 1
    elif reasoning["threatLevel"] == "apocalyptic":
        stats["pow"] += 3
        stats["intelligence"] += 2

    if reasoning["metaphysicalNature"] in {"spectral", "eldritch", "divine"}:
        stats["pow"] += 2
        stats["app"] -= 1 if reasoning["metaphysicalNature"] == "eldritch" else 0

    for key in stats:
        stats[key] = stat_clamp(stats[key] + rnd.randint(-2, 3))

    hp = max(8, round((stats["con"] + stats["siz"]) / 2))
    sanity = min(99, max(15, stats["pow"] * 5))
    mp = min(99, max(1, stats["pow"]))

    skill_values = []
    for skill in payload.skills:
        skill_values.append({"skillId": skill.id, "value": skill_score(skill, reasoning, rnd)})

    return {
        "stats": {
            **stats,
            "maxHp": hp,
            "currentHp": hp,
            "maxSanity": sanity,
            "currentSanity": sanity,
            "maxMp": mp,
            "currentMp": mp,
            "luck": max(15, min(95, 35 + stats["pow"] * 2 + rnd.randint(-10, 12))),
            "build": max(-2, min(4, (stats["str"] + stats["siz"] - 24) // 8)),
        },
        "skills": skill_values,
    }


def default_status_for(entity_type: str, current_status: str) -> str:
    if clean(current_status):
        return clean(current_status)
    if entity_type in {"player_investigator", "ally_npc", "hostile_npc", "other"}:
        return "Active"
    if entity_type == "neutral_contact":
        return "Unknown"
    if entity_type == "creature_entity":
        return "Missing"
    return "Unknown"


def build_bulk_suggestion(row: CharacterBulkRowInput) -> dict[str, Any]:
    name = extract_name(row.name, row.firstName, row.lastName, "Unnamed Figure")
    reasoning = infer_reasoning(
        name=name,
        role=row.role,
        affiliation="",
        description="",
        additional_prompt=row.additionalPrompt,
        system_prompt=row.systemPrompt,
        current_case="",
        current_location="",
        home_origin="",
        context=row.promptContext,
    )
    role = reasoning["suggestedRole"]
    status = default_status_for(reasoning["entityType"], row.status)
    description = (
        f"{name} is {role}, presented as {reasoning['narrativeRole']}. "
        f"Their scenes should feel {reasoning['tone']} and {reasoning['playerRelationship']}, driven by {reasoning['motivation'].lower()}."
    )
    return {
        "rowIndex": row.rowIndex,
        "role": role,
        "status": status,
        "description": description,
    }


def repetition_score(text: str) -> int:
    lowered = text.lower()
    repeated_penalties = sum(lowered.count(phrase) for phrase in ["field investigator", "bureau review", "tracking anomalous reports"])
    words = re.findall(r"[a-z']+", lowered)
    unique_ratio = len(set(words)) / max(1, len(words))
    score = 5 - repeated_penalties
    if unique_ratio < 0.55:
        score -= 1
    return max(1, min(5, score))


def evaluate_case(case: EvaluationCase, suggestion: dict[str, Any]) -> dict[str, int]:
    description = clean(suggestion.get("description"))
    prompt = case.payload
    entity_match = 1 if labelize(normalized_key(prompt.promptContext.entityType)) == clean(suggestion.get("entityType")) else 0

    adherence = 1
    if clean(prompt.role) and clean(prompt.role).lower() in clean(suggestion.get("role")).lower():
        adherence += 2
    if clean(prompt.currentCase) and clean(prompt.currentCase).lower() in description.lower():
        adherence += 1
    if clean(prompt.promptContext.tone) and clean(prompt.promptContext.tone).lower() in description.lower():
        adherence += 1

    distinctiveness = 2
    if clean(suggestion.get("motivations")):
        distinctiveness += 1
    if clean(suggestion.get("demeanor")):
        distinctiveness += 1
    if clean(suggestion.get("narrativeRole")):
        distinctiveness += 1

    archetype_accuracy = min(5, 3 + entity_match + (1 if clean(prompt.promptContext.playerRelationship) and clean(prompt.promptContext.playerRelationship).lower() in description.lower() else 0))

    return {
        "distinctiveness": min(5, distinctiveness),
        "prompt_adherence": min(5, adherence),
        "repetition_control": repetition_score(description),
        "archetype_accuracy": max(1, archetype_accuracy),
    }


EVALUATION_CASES = [
    EvaluationCase(
        id="pc-investigator",
        label="Player Investigator",
        promptSummary="Front-line investigator, knowledge-heavy, rain-soaked occult case.",
        payload=CharacterTextInput(
            name="Evelyn Harrow",
            role="occult detective",
            currentCase="a string of ritual disappearances at the docks",
            currentLocation="Greyhaven Harbor",
            additionalPrompt="Make her clever, exhausted, and dangerous when cornered.",
            promptContext=PromptContext(entityType="player_investigator", tone="gothic", playerRelationship="supportive", threatLevel="moderate", mechanicalFocus="knowledge"),
        ),
    ),
    EvaluationCase(
        id="ally-npc",
        label="Ally NPC",
        promptSummary="Supportive confidant with occult medical experience.",
        payload=CharacterTextInput(
            name="Brother Caldus",
            role="field medic",
            affiliation="a hidden monastic infirmary",
            additionalPrompt="He should feel compassionate but one confession away from collapse.",
            promptContext=PromptContext(entityType="ally_npc", tone="tragic", playerRelationship="supportive", mechanicalFocus="support"),
        ),
    ),
    EvaluationCase(
        id="hostile-npc",
        label="Hostile NPC",
        promptSummary="Active human antagonist tied to cult violence.",
        payload=CharacterTextInput(
            name="Mara Voss",
            role="cult enforcer",
            currentCase="stopping the investigators before the eclipse rite fails",
            additionalPrompt="Make her precise, predatory, and willing to burn allies.",
            promptContext=PromptContext(entityType="hostile_npc", tone="grim", playerRelationship="adversarial", threatLevel="high", factionAlignment="cult", mechanicalFocus="combat"),
        ),
    ),
    EvaluationCase(
        id="neutral-contact",
        label="Mundane Neutral Contact",
        promptSummary="Mundane contact who knows too much and trusts no one.",
        payload=CharacterTextInput(
            name="Martin Vale",
            role="municipal archivist",
            currentLocation="the city records office",
            additionalPrompt="Keep him mundane, cagey, and useful only after bargaining.",
            promptContext=PromptContext(entityType="neutral_contact", tone="scholarly", playerRelationship="transactional", factionAlignment="civilian", mechanicalFocus="social"),
        ),
    ),
    EvaluationCase(
        id="creature-entity",
        label="Occult Entity",
        promptSummary="Nonhuman ritual predator at the campaign edge.",
        payload=CharacterTextInput(
            name="The Lantern-Eater",
            currentCase="feeding on mourners who cross the graveyard gate after midnight",
            additionalPrompt="Make it ritualistic, alien, and wrong in every mundane context.",
            promptContext=PromptContext(entityType="creature_entity", tone="surreal", playerRelationship="predatory", threatLevel="high", metaphysicalNature="eldritch", mechanicalFocus="survival"),
        ),
    ),
    EvaluationCase(
        id="deity-cosmic",
        label="Deity / Cosmic Power",
        promptSummary="Campaign-scale divine or cosmic presence.",
        payload=CharacterTextInput(
            name="The Saint Beneath the Tides",
            currentCase="awakening through prophecies written in drowned blood",
            additionalPrompt="It should feel vast, calm, and horrifyingly inevitable.",
            promptContext=PromptContext(entityType="deity_cosmic_power", tone="gothic", playerRelationship="revered", threatLevel="apocalyptic", metaphysicalNature="divine", mechanicalFocus="occult"),
        ),
    ),
]


@app.get("/health")
def health() -> dict[str, str]:
    registry = load_registry()
    return {
        "status": "ok",
        "provider": AI_PROVIDER,
        "mode": AI_MODE,
        "model": str(registry.get("active_model", active_model_name())),
        "version": str(registry.get("active_version", "bootstrap-v1")),
    }


@app.post("/v1/generate/character-text")
def generate_character_text(payload: CharacterTextInput) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestion": build_character_text_suggestion(payload),
    }


@app.post("/v1/generate/character-stats-skills")
def generate_character_stats(payload: CharacterStatsInput) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestion": build_stats_suggestion(payload),
    }


@app.post("/v1/generate/character-bulk-text")
def generate_character_bulk(rows: list[CharacterBulkRowInput]) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    suggestions = [build_bulk_suggestion(row) for row in rows]
    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestions": suggestions,
    }


@app.get("/v1/evaluate/character-generators")
def evaluate_character_generators() -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    cases = []
    for case in EVALUATION_CASES:
        suggestion = build_character_text_suggestion(case.payload)
        cases.append(
            {
                "id": case.id,
                "label": case.label,
                "entityType": suggestion["entityType"],
                "promptSummary": case.promptSummary,
                "suggestion": suggestion,
                "scores": evaluate_case(case, suggestion),
            }
        )

    return {
        "modelName": model,
        "modelVersion": version,
        "criteria": EVALUATION_CRITERIA,
        "cases": cases,
    }


@app.post("/v1/train/feedback")
def append_feedback(record: FeedbackRecord) -> dict[str, Any]:
    ensure_parent(TRAINING_DATA_PATH)
    with TRAINING_DATA_PATH.open("a", encoding="utf-8") as f:
        f.write(record.model_dump_json() + "\n")
    return {"ok": True}


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessageInput(BaseModel):
    role: Literal["user", "assistant"] = "user"
    content: str = ""


class LoreDocumentInput(BaseModel):
    title: str = ""
    type: str = ""
    summary: str = ""
    content: str = ""


class ChatContextInput(BaseModel):
    primaryPrompt: str = ""
    loreDocuments: list[LoreDocumentInput] = Field(default_factory=list)
    character: dict[str, Any] | None = None


class ChatRequest(BaseModel):
    messages: list[ChatMessageInput] = Field(default_factory=list)
    context: ChatContextInput = Field(default_factory=ChatContextInput)


def _build_chat_response(request: ChatRequest) -> str:
    """
    Pattern-based conversational response grounded in lore and character context.
    Generates a structured, helpful reply based on the most recent user message.
    """
    messages = request.messages
    context = request.context

    # Extract last user message
    user_msg = ""
    for m in reversed(messages):
        if m.role == "user":
            user_msg = clean(m.content)
            break

    if not user_msg:
        return "I'm here to assist with your campaign. Ask me about characters, lore, or story ideas."

    rnd = seeded_random(user_msg, len(messages))
    lower_msg = user_msg.lower()

    # Assemble lore summary for context
    lore_summary_parts: list[str] = []
    for doc in context.loreDocuments:
        if doc.summary:
            lore_summary_parts.append(f"[{doc.type.replace('_', ' ').title()}] {doc.title}: {doc.summary}")
        elif doc.content:
            lore_summary_parts.append(f"[{doc.type.replace('_', ' ').title()}] {doc.title}: {doc.content[:200]}")
    lore_summary = " | ".join(lore_summary_parts) if lore_summary_parts else ""

    char = context.character
    char_name = clean(char.get("name", "")) if char else ""
    char_race = clean(char.get("race", "")) if char else ""
    char_role = clean(char.get("role", "")) if char else ""
    char_desc = clean(char.get("description", "")) if char else ""
    char_affiliation = clean(char.get("affiliation", "")) if char else ""

    # Determine intent from message keywords
    is_backstory = any(k in lower_msg for k in ["backstory", "history", "past", "origin", "background", "grew up", "childhood"])
    is_personality = any(k in lower_msg for k in ["personality", "character", "trait", "behave", "attitude", "motivation", "demeanor"])
    is_stats = any(k in lower_msg for k in ["stats", "skills", "abilities", "numbers", "strength", "dexterity", "sanity", "health", "hp"])
    is_campaign = any(k in lower_msg for k in ["campaign", "arc", "plot", "story", "adventure", "mission", "case", "encounter"])
    is_faction = any(k in lower_msg for k in ["faction", "group", "organization", "bureau", "cult", "society", "alliance"])
    is_species = any(k in lower_msg for k in ["species", "race", "creature", "entity", "being", "ancestry"])
    is_lore = any(k in lower_msg for k in ["lore", "world", "setting", "history", "mythology", "legend", "rumor"])
    is_suggestion = any(k in lower_msg for k in ["suggest", "idea", "help", "recommend", "what should", "how should", "can you", "would you", "could you"])
    is_name = any(k in lower_msg for k in ["name", "call", "named", "title"])

    # Build contextual response
    parts: list[str] = []

    if char_name and (is_backstory or is_personality):
        tone_pick = pick(rnd, ["gothic", "scholarly", "atmospheric", "measured"])
        aspects = [
            f"{char_name} carries the weight of their {char_race or 'mortal'} heritage through every case they take.",
            f"Their role as {char_role} shapes how they approach every encounter — methodically, with one eye always on the shadows.",
            f"What drives {char_name} is not glory but answers: the kind that only come at a cost.",
            f"There is a restlessness to {char_name} that allies find useful and enemies find dangerous.",
        ]
        if char_affiliation:
            aspects.append(f"Their connection to {char_affiliation} provides resources, but also obligations they cannot easily set aside.")
        if char_desc:
            aspects.append(f"In their own words, they might say: \"{char_desc[:120]}{'...' if len(char_desc) > 120 else ''}\"")
        parts.append(pick(rnd, aspects))
        parts.append(pick(rnd, [
            f"For backstory depth, consider what event first revealed the supernatural to {char_name} — and what it cost them.",
            f"A strong backstory often hinges on a single defining moment of loss or revelation. What was {char_name}'s?",
            f"The most compelling characters carry a contradiction. What does {char_name} believe that the evidence is slowly disproving?",
        ]))

    elif is_campaign or (is_suggestion and not char_name):
        campaign_ideas = [
            "A sealed archive surfaces — containing files that should not exist, written by investigators who died before the events they describe.",
            "A series of ritualistic disappearances follows a pattern tied to an alignment of stars not due for another century.",
            "A trusted ally begins reporting memories of events that never occurred — but which match events that are about to happen.",
            "The Bureau receives a warning from a rival cell: something ancient has been awakened, and it knows their names.",
            "A small coastal town stops responding to correspondence. Investigators arrive to find the residents — but no one can agree on what they see.",
        ]
        if lore_summary:
            parts.append(f"Drawing on the established lore for this campaign:")
        parts.append(pick(rnd, campaign_ideas))
        parts.append(pick(rnd, [
            "This arc works best if the threat escalates in stages — mundane unease, then impossible evidence, then irreversible consequence.",
            "Consider anchoring the plot to a specific lore document: what faction or species is behind this, and what do they want?",
            "A strong campaign arc always has a human face on the supernatural threat. Who is the collaborator, and why did they make the deal?",
        ]))

    elif is_faction:
        faction_lines = [
            "Factions are most compelling when their goals are internally consistent but externally incompatible with the investigators' survival.",
            "A faction's power should always feel just slightly beyond the investigators' reach — enough to be a threat, not so much as to feel hopeless.",
            "Consider the faction's founding myth. Every organization believes a story about itself that justifies its worst actions.",
        ]
        if lore_summary:
            parts.append("Based on the lore context for this setting:")
        parts.append(pick(rnd, faction_lines))

    elif is_species:
        species_lines = [
            "The most memorable entities are defined by what they want, not just what they can do. What need drives this creature?",
            "Consider how this species perceives time, identity, or reality differently from mortals — that gap is where horror lives.",
            "A creature's weakness should feel like a logical consequence of its nature, not an arbitrary rule.",
        ]
        parts.append(pick(rnd, species_lines))

    elif is_lore:
        lore_lines = [
            "The strongest world lore ties the supernatural to something grounded in history or human psychology.",
            "Consider what ordinary people in this setting believe about the strange occurrences — rumor and misinformation are as important as fact.",
            "Good lore creates questions that the campaign can answer — but reveals enough to make those questions feel urgent.",
        ]
        if lore_summary:
            parts.append(f"The current lore library provides context across {len(context.loreDocuments)} document(s). Here's a guiding thought:")
        parts.append(pick(rnd, lore_lines))

    elif is_stats:
        if char_name:
            parts.append(
                f"For {char_name}'s mechanical profile, consider their role as {char_role or 'an investigator'}: "
                f"the stats should reflect what they have paid for in experience. "
                f"High EDU and INT for scholarly types, high DEX and CON for field agents — but always leave one stat lower than expected to create vulnerability."
            )
        else:
            parts.append(
                "Stat allocation is most interesting when it reflects a character's history rather than an optimal build. "
                "Where are the gaps — the skills they never trained, the resilience they haven't been tested on yet?"
            )

    elif is_name:
        name_suggestions = [
            "For gothic occult investigators, names with weight work well — something that sounds like it belongs in an old case file.",
            "Consider a name that reflects cultural heritage or a chosen alias. Many Bureau agents operate under pseudonyms.",
            "A memorable name often has a slight incongruity — something too formal for the chaos they operate in, or too ordinary for someone who deals with the impossible.",
        ]
        parts.append(pick(rnd, name_suggestions))

    else:
        # General helpful response
        general = [
            "I can help you develop characters, explore campaign arcs, detail factions and species, or work through story ideas grounded in the established lore.",
            "What aspect would you like to explore? I can assist with backstory, personality, stats, campaign plotting, or world-building details.",
            "Happy to help refine any element of the campaign. Share what you're working on — a character, a plot thread, or a piece of setting lore — and I'll build on it.",
        ]
        if lore_summary:
            parts.append(f"The lore library has context available. {pick(rnd, general)}")
        else:
            parts.append(pick(rnd, general))

    # Always close with a follow-up prompt if char is in context
    if char_name and not (is_backstory or is_personality):
        follow_ups = [
            f"Would you like to explore {char_name}'s relationship to any specific faction or event in the lore?",
            f"Is there a specific aspect of {char_name}'s story you'd like to develop further?",
            f"Let me know if you'd like to focus on {char_name}'s mechanical profile, their backstory, or their role in the current campaign arc.",
        ]
        parts.append(pick(rnd, follow_ups))
    elif not char_name:
        parts.append(pick(rnd, [
            "Is there a specific character, faction, or arc you'd like to focus on?",
            "Let me know if you'd like to tie this to a specific document in the lore library.",
            "Would you like me to connect this to an existing character or build something new from scratch?",
        ]))

    return " ".join(p for p in parts if p)


@app.post("/v1/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    response_text = _build_chat_response(request)

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "response": response_text,
    }





@app.post("/v1/train/retrain")
def retrain_model(payload: RetrainRequest) -> dict[str, Any]:
    registry = load_registry()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    active = payload.baseModel.strip() or active_model_name()
    new_version = f"{active.replace(':', '-')}-adapter-{timestamp}"

    grouped_by_entity_type: dict[str, int] = {}
    for example in payload.trainingExamples:
        prompt_context = example.get("inputPayload", {}).get("promptContext", {}) if isinstance(example.get("inputPayload"), dict) else {}
        entity_type = clean(prompt_context.get("entityType")) or "unspecified"
        grouped_by_entity_type[entity_type] = grouped_by_entity_type.get(entity_type, 0) + 1

    history = list(registry.get("history", []))
    history.append(
        {
            "version": new_version,
            "model": active,
            "mode": payload.mode,
            "created_at": now_iso(),
            "training_examples": len(payload.trainingExamples),
            "grouped_by_entity_type": grouped_by_entity_type,
        }
    )

    registry.update(
        {
            "active_model": active,
            "active_version": new_version,
            "history": history,
            "provider": AI_PROVIDER,
        }
    )
    save_registry(registry)

    return {
        "ok": True,
        "modelName": active,
        "modelVersion": new_version,
        "mode": payload.mode,
        "trainingExamples": len(payload.trainingExamples),
        "groupedByEntityType": grouped_by_entity_type,
    }
