"""Structural fingerprint registry — reject duplicate/near-duplicate massing.

Persisted across restarts at scripts/blender/data/structural-registry.json.
Fingerprints exclude brand colours and logos (structure only).
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Structural slots only — NOT colours, logos, or materials.
STRUCTURAL_KEYS = (
    "recipe",
    "preset",
    "tower_height",
    "wing_height",
    "step_count",
    "stack_count",
    "tower_style",
    "roof_module",
    "facade_module",
    "entrance_module",
    "mass_count",
    "asymmetry",
    "width_ratio",
    "depth_ratio",
    "open_side",
    "canopy_lift",
    "landmark_style",
    "hybrid_mode",
    "grammar_combo",
    "composition_profile",
    "massing_strategy",
    "volume_count",
    "storey_count",
    "wing_offset_x",
    "entrance_side",
    "window_cols",
    "facade_style",
    "corner_style",
)

REGISTRY_PATH = Path(__file__).resolve().parents[1] / "data" / "structural-registry.json"
NEAR_DUP_HAMMING_MAX = 3


def _registry_path() -> Path:
    return REGISTRY_PATH


def _load_registry() -> dict[str, Any]:
    path = _registry_path()
    if not path.is_file():
        return {"version": 1, "entries": []}
    with path.open() as f:
        data = json.load(f)
    data.setdefault("entries", [])
    return data


def _save_registry(data: dict[str, Any]) -> None:
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")


def structural_payload(recipe: str, params: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {"recipe": recipe}
    for key in STRUCTURAL_KEYS:
        if key == "recipe":
            continue
        if key in params and params[key] is not None:
            out[key] = params[key]
    return out


def structural_fingerprint(recipe: str, params: dict[str, Any]) -> str:
    """16-char hex hash of structural slots (no brand colours)."""
    payload = structural_payload(recipe, params)
    raw = json.dumps(payload, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def _hamming(a: str, b: str) -> int:
    if len(a) != len(b):
        return 999
    return sum(x != y for x, y in zip(a, b))


def is_duplicate(fingerprint: str, *, company_id: str = "", plot_id: str = "", near: bool = True) -> bool:
    data = _load_registry()
    for entry in data["entries"]:
        fp = str(entry.get("fingerprint") or "")
        if fp == fingerprint:
            if company_id and entry.get("companyId") == company_id and entry.get("plotId") == plot_id:
                return False
            return True
        if near and _hamming(fp, fingerprint) <= NEAR_DUP_HAMMING_MAX:
            if company_id and entry.get("companyId") == company_id and entry.get("plotId") == plot_id:
                continue
            return True
    return False


def register_fingerprint(
    fingerprint: str,
    *,
    company_id: str,
    plot_id: str,
    asset_id: str,
    recipe: str,
    attempt: int = 0,
) -> bool:
    """Register fingerprint if unique. Returns True when registered or same owner rebuild."""
    if is_duplicate(fingerprint, company_id=company_id, plot_id=plot_id):
        return False
    data = _load_registry()
    # Rebuild for same owner+plot — replace prior fingerprint instead of duplicating rows.
    for i, entry in enumerate(data["entries"]):
        if entry.get("companyId") == company_id and entry.get("plotId") == plot_id:
            data["entries"][i] = {
                "fingerprint": fingerprint,
                "companyId": company_id,
                "plotId": plot_id,
                "assetId": asset_id,
                "recipe": recipe,
                "attempt": attempt,
                "registeredAt": datetime.now(timezone.utc).isoformat(),
            }
            _save_registry(data)
            return True
    # Idempotent rebuild — update timestamp, do not duplicate row
    for entry in data["entries"]:
        if (
            entry.get("companyId") == company_id
            and entry.get("plotId") == plot_id
            and entry.get("fingerprint") == fingerprint
        ):
            entry["attempt"] = attempt
            entry["registeredAt"] = datetime.now(timezone.utc).isoformat()
            _save_registry(data)
            return True
    data["entries"].append(
        {
            "fingerprint": fingerprint,
            "companyId": company_id,
            "plotId": plot_id,
            "assetId": asset_id,
            "recipe": recipe,
            "attempt": attempt,
            "registeredAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    _save_registry(data)
    return True


def list_entries() -> list[dict[str, Any]]:
    return list(_load_registry().get("entries") or [])


def clear_registry() -> None:
    """Test helper — wipe persisted fingerprints."""
    _save_registry({"version": 1, "entries": []})
