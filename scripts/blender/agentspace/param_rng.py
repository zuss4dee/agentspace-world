"""Deterministic parameter RNG for company building generation."""
from __future__ import annotations

import hashlib
import random
from typing import Any


def deterministic_seed(company_id: str, asset_id: str) -> int:
    raw = f"{company_id}:{asset_id}".encode()
    return int(hashlib.sha256(raw).hexdigest()[:8], 16)


class ParamRNG:
    """Seeded draws — same company+asset always yields same params.

    Sub-keys are hashed against the *stored* seed (not MT getstate()[1][0],
    which is not unique across seeds in CPython's Mersenne Twister).
    """

    def __init__(self, seed: int):
        self.seed = int(seed) & 0xFFFFFFFF
        self._rng = random.Random(self.seed)

    def uniform(self, key: str, lo: float, hi: float) -> float:
        self._rng.seed(self._subseed(key))
        return self._rng.uniform(lo, hi)

    def randint(self, key: str, lo: int, hi: int) -> int:
        self._rng.seed(self._subseed(key))
        return self._rng.randint(lo, hi)

    def choice(self, key: str, options: list[Any]) -> Any:
        self._rng.seed(self._subseed(key))
        return self._rng.choice(options)

    def weighted_choice(self, key: str, options: list[str], weights: list[float]) -> str:
        self._rng.seed(self._subseed(key))
        return self._rng.choices(options, weights=weights, k=1)[0]

    def _subseed(self, key: str) -> int:
        return int(hashlib.sha256(f"{self.seed}:{key}".encode()).hexdigest()[:8], 16)


RECIPE_IDS = (
    "bridge_complex",
    "tower_campus",
    "stepped_terrace",
    "courtyard_block",
    "pavilion",
    "stacked_volumes",
    "asymmetric_campus",
    "sculpture_hq",
    "vertical_landmark",
    "hybrid",
)

ROOF_MODULES = ("stack", "terrace", "pitch_cap", "dome")
FACADE_MODULES = ("curtain", "punched", "band", "mixed")
ENTRANCE_MODULES = ("portal", "canopy", "portico", "steps")
DETAIL_DENSITIES = ("LOW", "MEDIUM", "HIGH", "VERY_HIGH")


def generate_recipe_params(rng: ParamRNG, recipe: str, *, w: float, d: float) -> dict[str, Any]:
    """Param slots for a recipe — topology chosen separately."""
    from .building_architecture import architectural_proportions, classify_plot_family

    props = architectural_proportions(rng, footprint_w=w, footprint_d=d)
    base = {
        "tower_height": rng.uniform("tower_h", 14.0, min(34.0, w * 0.85)),
        "mass_count": rng.randint("mass_n", 2, 4),
        "prop_density": rng.uniform("props", 0.45, 1.0),
        "roof_module": rng.choice("roof", list(ROOF_MODULES)),
        "facade_module": rng.choice("facade", list(FACADE_MODULES)),
        "entrance_module": rng.choice("entrance", list(ENTRANCE_MODULES)),
        "asymmetry": rng.uniform("asym", 0.0, 1.0),
        "glass_bias": rng.uniform("glass", 0.35, 0.75),
        "width_ratio": rng.uniform("wr", 0.78, 0.94),
        "depth_ratio": rng.uniform("dr", 0.74, 0.92),
        "detail_density": rng.weighted_choice(
            "detail_density",
            list(DETAIL_DENSITIES),
            [0.2, 0.9, 2.4, 1.6],
        ),
        "volume_count": rng.randint("vol_n", 2, 4),
        "plot_family": classify_plot_family(w, d),
        **props,
    }
    if recipe == "tower_campus":
        base["tower_height"] = rng.uniform("tower_h", 18.0, min(36.0, w * 0.85))
        base["wing_height"] = rng.uniform("wing_h", 7.0, 12.0)
        base["tower_placement"] = rng.choice("tower.place", ["left", "right", "rear"])
    elif recipe == "stepped_terrace":
        base["step_count"] = rng.randint("steps", 2, 3)
        base["volume_count"] = 3
    elif recipe == "stacked_volumes":
        base["stack_count"] = rng.randint("stacks", 2, 3)
        base["volume_count"] = base["stack_count"]
    elif recipe == "pavilion":
        base["canopy_lift"] = rng.uniform("lift", 4.5, 7.5)
    elif recipe == "courtyard_block":
        base["open_side"] = rng.choice("open", ["south", "east"])
        base["courtyard"] = True
    return base


def _brand_recipe_weights(brand=None) -> dict[str, float]:
    """Industry/personality bias on architectural grammars (not finished buildings)."""
    weights = {recipe: 1.0 for recipe in RECIPE_IDS}
    weights.update(
        {
            "bridge_complex": 1.2,
            "tower_campus": 1.0,
            "stepped_terrace": 1.0,
            "courtyard_block": 0.9,
            "pavilion": 0.85,
            "stacked_volumes": 0.0,
            "asymmetric_campus": 1.1,
            "sculpture_hq": 0.85,
            "vertical_landmark": 0.9,
            "hybrid": 0.7,
        }
    )
    text = " ".join(
        [
            str(getattr(brand, "industry", "")),
            str(getattr(brand, "visual_style", "")),
            str(getattr(brand, "architectural_direction", "")),
            " ".join(getattr(brand, "personality", []) or []),
            " ".join(getattr(brand, "style_keywords", []) or []),
        ]
    ).lower()
    if any(token in text for token in ("creative", "design", "art", "playful", "marketing")):
        for recipe in ("asymmetric_campus", "sculpture_hq", "pavilion"):
            weights[recipe] += 0.8
    if any(token in text for token in ("tech", "ai", "software", "research", "lab")):
        for recipe in ("tower_campus", "vertical_landmark", "courtyard_block"):
            weights[recipe] += 0.65
    if any(token in text for token in ("finance", "bank", "legal", "formal", "premium")):
        for recipe in ("tower_campus", "courtyard_block"):
            weights[recipe] += 0.55
    if any(token in text for token in ("campus", "community", "education")):
        for recipe in ("courtyard_block", "bridge_complex"):
            weights[recipe] += 0.6
    return weights


def select_recipe(rng: ParamRNG, brand=None) -> str:
    """Choose an architectural grammar deterministically, with brand traits as bias."""
    weights = _brand_recipe_weights(brand)
    return rng.weighted_choice("recipe", list(RECIPE_IDS), [weights[r] for r in RECIPE_IDS])


def select_recipe_for_envelope(rng: ParamRNG, brand, envelope_weights: dict[str, float]) -> str:
    """Plot envelope + brand → grammar. Plot family wins; brand is a bias."""
    from .building_architecture import recipe_weights_for_plot

    plot_w = float(envelope_weights.get("_plot_w") or 40.0)
    plot_d = float(envelope_weights.get("_plot_d") or 28.0)
    weights = _brand_recipe_weights(brand)
    plot_weights = recipe_weights_for_plot(plot_w, plot_d)
    for recipe in RECIPE_IDS:
        weights[recipe] = max(0.04, weights.get(recipe, 0.2) * 0.35 + plot_weights.get(recipe, 0.08))
    for recipe, boost in envelope_weights.items():
        if recipe.startswith("_"):
            continue
        if recipe in weights:
            weights[recipe] += max(0.0, boost - 1.0) * 0.35
    weights["stacked_volumes"] = 0.0
    options = [r for r in RECIPE_IDS if r != "stacked_volumes"]
    return rng.weighted_choice("recipe", options, [max(0.04, weights[r]) for r in options])
