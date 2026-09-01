"""Build a company HQ in the asset library from brand + generated specs.

Usage (Blender background or MCP execute_blender_code):
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_company_building.py

Optional env:
  ASW_BUILD_RECIPE=bridge_complex  — preview a non-production recipe in library (no publish)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.company_building import build_company_building
from agentspace.company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec
from agentspace.echt_spec import ECHT_BRAND, ECHT_BUILDING_SPEC

MARKER = "ASW_BUILD_JSON:"


def _preview_spec(recipe: str) -> tuple[BrandSpec, GeneratedBuildingSpec]:
    brand = BrandSpec(
        company_id=f"preview.{recipe}",
        company_name="Preview Co",
        logo=BrandLogoSpec(wordmark="PREV"),
    )
    spec = GeneratedBuildingSpec(
        asset_id=f"pack.agentspace.building.preview.{recipe}.01",
        building_id=f"preview-{recipe}",
        parcel_id="preview",
        brand=brand,
        recipe=recipe,
        scale=1.2,
        footprint_w=36.0,
        footprint_d=24.0,
        mat_defs=ECHT_BUILDING_SPEC.mat_defs,
    )
    return brand, spec


if __name__ == "__main__":
    preview_recipe = os.environ.get("ASW_BUILD_RECIPE")
    if preview_recipe and preview_recipe != "bridge_complex":
        brand, spec = _preview_spec(preview_recipe)
    else:
        brand, spec = ECHT_BRAND, ECHT_BUILDING_SPEC

    report = build_company_building(brand, spec)
    print(MARKER + json.dumps(report))
    print("BUILD_OK", spec.asset_id, spec.recipe)
