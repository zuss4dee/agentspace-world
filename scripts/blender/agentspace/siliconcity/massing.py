"""Plot-first massing strategy — pick a Silicon City family from the envelope.

Bpy-free so contracts can be unit-tested. The gallery and later live generator
use this to choose an architectural family; colour is never a strategy input.
"""
from __future__ import annotations

from typing import Any

# Architectural families (not colour variants). Each must produce a distinct silhouette.
STRATEGIES = (
    "small_commercial",  # smb_block — shop + corner tower
    "hq_campus",  # enterprise_hq — L-podium + stacked tower
    "loft_conversion",  # startup_loft — warehouse + vault + cantilever
    "courtyard",  # courtyard_campus — U-wings around a court
    "wide_shallow",  # low_rise_strip — horizontal retail ribbon
    "narrow_deep",  # industrial_hall — office head + long hall
    "corner_landmark",  # two-sided frontage, stronger entrance
)

STRATEGY_TO_ARCHETYPE = {
    "small_commercial": "smb_block",
    "hq_campus": "enterprise_hq",
    "loft_conversion": "startup_loft",
    "courtyard": "courtyard_campus",
    "wide_shallow": "low_rise_strip",
    "narrow_deep": "industrial_hall",
    "corner_landmark": "smb_block",
}

# Designed footprint the authored archetypes were drawn at (metres).
ARCHETYPE_FOOTPRINT = {
    "smb_block": (26.0, 18.0),
    "enterprise_hq": (54.0, 38.0),
    "startup_loft": (40.0, 28.0),
    "courtyard_campus": (56.0, 56.0),
    "low_rise_strip": (72.0, 26.0),
    "industrial_hall": (34.0, 70.0),
}


def classify_plot(
    width_m: float,
    depth_m: float,
    *,
    is_corner: bool = False,
    area_m2: float | None = None,
) -> str:
    """Map plot proportions to a massing strategy. Plot is the first constraint."""
    w = max(float(width_m), 1.0)
    d = max(float(depth_m), 1.0)
    ratio = w / d
    area = float(area_m2) if area_m2 is not None else w * d

    if is_corner and area < 1400:
        return "corner_landmark"
    if ratio >= 1.85:
        return "wide_shallow"
    if ratio <= 0.62:
        return "narrow_deep"
    if min(w, d) >= 44.0 and 0.78 <= ratio <= 1.28:
        return "courtyard"
    if area < 700:
        return "small_commercial"
    if area >= 1600 and ratio >= 1.15:
        return "hq_campus"
    if 0.85 <= ratio <= 1.55 and area >= 900:
        return "loft_conversion"
    if w >= 40:
        return "hq_campus"
    return "small_commercial"


def archetype_for_strategy(strategy: str) -> str:
    return STRATEGY_TO_ARCHETYPE.get(strategy, "smb_block")


def archetype_for_plot(
    width_m: float,
    depth_m: float,
    *,
    is_corner: bool = False,
    industry: str = "",
    personality: list[str] | None = None,
) -> str:
    """Strategy from plot, then a light industry bias — never a rigid template."""
    strategy = classify_plot(width_m, depth_m, is_corner=is_corner)
    bag = {t.lower() for t in (personality or [])}
    bag.update(t for t in (industry or "").lower().replace("-", " ").split() if t)

    # Biases only: same industry can still land on different families via plot shape.
    if strategy == "hq_campus" and {"creative", "design", "studio"} & bag:
        return "startup_loft"
    if strategy == "loft_conversion" and {"finance", "bank", "capital"} & bag:
        return "enterprise_hq"
    if strategy == "courtyard" and {"manufacturing", "logistics", "warehouse"} & bag:
        return "industrial_hall"
    return archetype_for_strategy(strategy)


def volume_count_for_archetype(archetype: str) -> int:
    return {
        "smb_block": 3,
        "enterprise_hq": 6,
        "startup_loft": 4,
        "courtyard_campus": 5,
        "low_rise_strip": 3,
        "industrial_hall": 3,
    }.get(archetype, 3)


def recipe_payload(archetype: str, params: dict[str, Any]) -> dict[str, Any]:
    """Architectural fingerprint slots (no colours)."""
    return {
        "recipe": archetype,
        "massing_strategy": params.get("massing_strategy"),
        "volume_count": params.get("volume_count") or volume_count_for_archetype(archetype),
        "storey_count": params.get("storey_count"),
        "wing_offset_x": params.get("wing_offset_x"),
        "wing_offset_y": params.get("wing_offset_y"),
        "roof_module": params.get("roof_module"),
        "entrance_side": params.get("entrance_side"),
        "window_cols": params.get("window_cols"),
        "tower_style": params.get("tower_style"),
        "facade_style": params.get("facade_style"),
        "logo_mode": params.get("logo_mode"),
        "corner_style": params.get("corner_style"),
    }
