"""Compile brand + base spec → deterministic GeneratedBuildingSpec."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from .company_building_spec import BrandSpec, GeneratedBuildingSpec
from .param_rng import ParamRNG, deterministic_seed, generate_recipe_params, select_recipe


def compile_spec(brand: BrandSpec, spec: GeneratedBuildingSpec) -> GeneratedBuildingSpec:
    """Resolve recipe + params. Frozen presets skip RNG."""
    out = deepcopy(spec)
    seed = deterministic_seed(brand.company_id, spec.asset_id)
    preset = (spec.recipe_params or {}).get("preset")

    if preset:
        out.recipe_params = dict(spec.recipe_params)
        return out

    rng = ParamRNG(seed)
    if not out.recipe or out.recipe == "auto":
        out.recipe = select_recipe(rng)
    params = generate_recipe_params(rng, out.recipe, w=out.footprint_w, d=out.footprint_d)
    overrides = dict(spec.recipe_params or {})
    out.recipe_params = {**params, "seed": seed, **overrides}
    return out


def mat_defs_from_brand(brand: BrandSpec, base_defs: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Tint generic palette from brand hex colours when base defs provided."""
    if not base_defs:
        return {}
    out = deepcopy(base_defs)
    # Future: map primaryColours into brand/coral slots
    return out
