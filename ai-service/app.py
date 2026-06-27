from __future__ import annotations

import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Arcane Codex AI Service", version="0.1.0")

AI_MODE = os.getenv("AI_MODE", "cpu").lower()
AI_MODEL_CPU = os.getenv("AI_MODEL_CPU", "codellama:7b-instruct-q4")
AI_MODEL_GPU = os.getenv("AI_MODEL_GPU", "mistral:7b-instruct")
AI_PROVIDER = os.getenv("AI_PROVIDER", "local")
REGISTRY_PATH = Path(os.getenv("AI_MODEL_REGISTRY_PATH", "/data/models.json"))
TRAINING_DATA_PATH = Path(os.getenv("AI_TRAINING_DATA_PATH", "/data/feedback.jsonl"))


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
    skills: list[SkillInput] = Field(default_factory=list)


class CharacterBulkRowInput(BaseModel):
    rowIndex: int
    name: str = ""
    firstName: str = ""
    lastName: str = ""
    role: str = ""
    status: str = ""
    systemPrompt: str = ""


class RetrainRequest(BaseModel):
    trainingExamples: list[dict[str, Any]] = Field(default_factory=list)
    mode: Literal["cpu", "gpu"] = "cpu"
    baseModel: str = ""


class FeedbackRecord(BaseModel):
    generationId: str
    status: Literal["ACCEPTED", "EDITED", "REJECTED"]
    finalValues: dict[str, Any] | None = None


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

    who = payload.name.strip() or "Unnamed Operative"
    role = payload.role.strip() or "field investigator"
    affiliation = payload.affiliation.strip() or "Bureau of Supernatural Investigation"
    case = payload.currentCase.strip() or "an active occult incident"
    location = payload.currentLocation.strip() or payload.homeOrigin.strip() or "an undisclosed location"

    desc = (
        f"{who} serves as a {role} aligned with {affiliation}. "
        f"They are currently focused on {case} near {location}, balancing procedure with intuition "
        "when confronting unstable supernatural threats."
    )
    if payload.baseDescription.strip():
        desc = f"{payload.baseDescription.strip()} {desc}"
    if payload.additionalPrompt.strip():
        desc = f"{desc}\n{payload.additionalPrompt.strip()}"
    system = payload.systemPrompt.strip()
    if system:
        desc = f"{system}\n{desc}"

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestion": {
            "description": desc,
            "affiliation": affiliation,
            "currentCase": case,
            "currentLocation": location,
            "homeOrigin": payload.homeOrigin.strip() or location,
            "role": role,
        },
    }


@app.post("/v1/generate/character-stats-skills")
def generate_character_stats(payload: CharacterStatsInput) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    seed_input = f"{payload.name}|{payload.role}|{payload.race}|{payload.description}|{payload.additionalPrompt}"
    rnd = random.Random(seed_input)

    def brp_stat(low: int = 7, high: int = 18) -> int:
        return rnd.randint(low, high)

    stats = {
        "str": brp_stat(),
        "con": brp_stat(),
        "siz": brp_stat(),
        "dex": brp_stat(),
        "intelligence": brp_stat(),
        "pow": brp_stat(),
        "cha": brp_stat(),
        "app": brp_stat(),
        "edu": brp_stat(),
    }

    hp = max(8, round((stats["con"] + stats["siz"]) / 2))
    sanity = min(99, max(20, stats["pow"] * 5))
    mp = min(99, max(1, stats["pow"]))

    skill_values: list[dict[str, Any]] = []
    for skill in payload.skills:
        shift = rnd.randint(-10, 25)
        bonus = 10 if (payload.role and payload.role.lower() in skill.name.lower()) else 0
        proposed = max(0, min(100, skill.baseValue + shift + bonus))
        skill_values.append({"skillId": skill.id, "value": proposed})

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestion": {
            "stats": {
                **stats,
                "maxHp": hp,
                "currentHp": hp,
                "maxSanity": sanity,
                "currentSanity": sanity,
                "maxMp": mp,
                "currentMp": mp,
                "luck": rnd.randint(20, 95),
                "build": max(-2, min(4, (stats["str"] + stats["siz"] - 24) // 8)),
            },
            "skills": skill_values,
        },
    }


@app.post("/v1/generate/character-bulk-text")
def generate_character_bulk(rows: list[CharacterBulkRowInput]) -> dict[str, Any]:
    registry = load_registry()
    model = str(registry.get("active_model", active_model_name()))
    version = str(registry.get("active_version", "bootstrap-v1"))

    suggestions = []
    for row in rows:
        name = row.name.strip() or "Unnamed Operative"
        role = row.role.strip() or "Investigator"
        suggestions.append(
            {
                "rowIndex": row.rowIndex,
                "role": role,
                "status": row.status.strip() or "Active",
                "description": (
                    f"{name} operates as a {role}, tracking anomalous reports and compiling "
                    "field evidence for Bureau review."
                ),
            }
        )

    return {
        "modelName": model,
        "modelVersion": version,
        "mode": AI_MODE,
        "suggestions": suggestions,
    }


@app.post("/v1/train/feedback")
def append_feedback(record: FeedbackRecord) -> dict[str, Any]:
    ensure_parent(TRAINING_DATA_PATH)
    with TRAINING_DATA_PATH.open("a", encoding="utf-8") as f:
        f.write(record.model_dump_json() + "\n")
    return {"ok": True}


@app.post("/v1/train/retrain")
def retrain_model(payload: RetrainRequest) -> dict[str, Any]:
    registry = load_registry()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    active = payload.baseModel.strip() or active_model_name()
    new_version = f"{active.replace(':', '-')}-adapter-{timestamp}"

    history = list(registry.get("history", []))
    history.append(
        {
            "version": new_version,
            "model": active,
            "mode": payload.mode,
            "created_at": now_iso(),
            "training_examples": len(payload.trainingExamples),
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
    }
