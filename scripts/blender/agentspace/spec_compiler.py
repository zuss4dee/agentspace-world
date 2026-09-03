"""Compile brand + base spec → deterministic GeneratedBuildingSpec."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from .company_building_spec import BrandSpec, GeneratedBuildingSpec
from .brand_materials import brand_material_defs
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
        out.recipe = select_recipe(rng, brand)
    params = generate_recipe_params(rng, out.recipe, w=out.footprint_w, d=out.footprint_d)
    overrides = dict(spec.recipe_params or {})
    out.recipe_params = {**params, "seed": seed, **overrides}
    requested_density = str(getattr(spec, "detail_density", "") or "").upper()
    if requested_density in {"LOW", "MEDIUM", "HIGH", "VERY_HIGH"}:
        density_default = requested_density
    elif overrides.get("detail_density"):
        density_default = str(overrides["detail_density"]).upper()
    else:
        density_default = "HIGH"
    out.detail_density = str(overrides.get("detail_density", density_default)).upper()
    if not out.recipe_params.get("detail_density"):
        out.recipe_params["detail_density"] = out.detail_density
    if not out.recipe_params.get("composition_profile"):
        out.recipe_params.setdefault("composition_profile", "plaza_sculpture")
    if not out.mat_defs:
        out.mat_defs = brand_material_defs(brand)
    return out


def mat_defs_from_brand(brand: BrandSpec, base_defs: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Preserve authored palettes; derive a controlled palette for new companies."""
    if base_defs:
        return deepcopy(base_defs)
    return brand_material_defs(brand)
