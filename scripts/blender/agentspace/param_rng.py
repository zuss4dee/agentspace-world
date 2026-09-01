"""Deterministic parameter RNG for company building generation."""
from __future__ import annotations

import hashlib
import random
from typing import Any


def deterministic_seed(company_id: str, asset_id: str) -> int:
    raw = f"{company_id}:{asset_id}".encode()
    return int(hashlib.sha256(raw).hexdigest()[:8], 16)


class ParamRNG:
    """Seeded draws — same company+asset always yields same params."""

    def __init__(self, seed: int):
        self._rng = random.Random(seed)

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
        return int(hashlib.sha256(f"{self._rng.getstate()[1][0]}:{key}".encode()).hexdigest()[:8], 16)


RECIPE_IDS = (
    "bridge_complex",
    "tower_campus",
    "stepped_terrace",
    "courtyard_block",
    "pavilion",
    "stacked_volumes",
    "asymmetric_campus",
)

ROOF_MODULES = ("stack", "terrace", "pitch_cap", "dome")
FACADE_MODULES = ("curtain", "punched", "band", "mixed")
ENTRANCE_MODULES = ("portal", "canopy", "portico", "steps")


def generate_recipe_params(rng: ParamRNG, recipe: str, *, w: float, d: float) -> dict[str, Any]:
    """Param slots for a recipe — topology chosen separately."""
    base = {
        "tower_height": rng.uniform("tower_h", 14.0, min(34.0, w * 0.85)),
        "mass_count": rng.randint("mass_n", 2, 5),
        "prop_density": rng.uniform("props", 0.35, 1.0),
        "roof_module": rng.choice("roof", list(ROOF_MODULES)),
        "facade_module": rng.choice("facade", list(FACADE_MODULES)),
        "entrance_module": rng.choice("entrance", list(ENTRANCE_MODULES)),
        "asymmetry": rng.uniform("asym", 0.0, 1.0),
        "glass_bias": rng.uniform("glass", 0.35, 0.75),
        "width_ratio": rng.uniform("wr", 0.72, 0.96),
        "depth_ratio": rng.uniform("dr", 0.68, 0.94),
    }
    if recipe == "tower_campus":
        base["tower_height"] = rng.uniform("tower_h", 22.0, min(38.0, w * 0.9))
        base["wing_height"] = rng.uniform("wing_h", 6.0, 12.0)
    elif recipe == "stepped_terrace":
        base["step_count"] = rng.randint("steps", 3, 5)
    elif recipe == "stacked_volumes":
        base["stack_count"] = rng.randint("stacks", 4, 6)
    elif recipe == "pavilion":
        base["canopy_lift"] = rng.uniform("lift", 4.5, 7.5)
    return base


def select_recipe(rng: ParamRNG) -> str:
    return rng.weighted_choice(
        "recipe",
        list(RECIPE_IDS),
        [1.2, 1.0, 1.0, 0.9, 0.85, 1.0, 1.1],
    )
