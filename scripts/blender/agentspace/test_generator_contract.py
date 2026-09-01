"""Fast tests that do not require Blender.

Blender integration is exercised by build_test_buildings.py when Blender is
available; these checks cover the deterministic contracts in every checkout.
"""
from __future__ import annotations

import unittest

from .brand_materials import brand_material_defs
from .company_building_spec import BrandSpec, GeneratedBuildingSpec
from .param_rng import ParamRNG, deterministic_seed, select_recipe
from .plot_validator import validate_asset_id, validate_footprint


class GeneratorContractTests(unittest.TestCase):
    def test_seed_is_stable_and_namespaced(self):
        first = deterministic_seed("stripe", "pack.agentspace.building.stripe.01")
        second = deterministic_seed("stripe", "pack.agentspace.building.stripe.01")
        other = deterministic_seed("openai", "pack.agentspace.building.stripe.01")
        self.assertEqual(first, second)
        self.assertNotEqual(first, other)

    def test_seeded_draws_are_key_stable(self):
        rng_a = ParamRNG(1234)
        rng_b = ParamRNG(1234)
        self.assertEqual(rng_a.choice("recipe", ["a", "b", "c"]), rng_b.choice("recipe", ["a", "b", "c"]))
        self.assertEqual(rng_a.uniform("height", 1, 10), rng_b.uniform("height", 1, 10))

    def test_brand_bias_still_returns_a_real_family(self):
        brand = BrandSpec("figma", "Figma", industry="creative software", personality=["playful"])
        recipe = select_recipe(ParamRNG(deterministic_seed("figma", "asset")), brand)
        self.assertIn(recipe, {"tower_campus", "stacked_volumes", "stepped_terrace", "courtyard_block", "pavilion", "asymmetric_campus", "sculpture_hq", "vertical_landmark", "hybrid", "bridge_complex"})

    def test_generated_palette_has_all_runtime_slots(self):
        brand = BrandSpec("demo", "Demo", primary_colours=["#635BFF"], secondary_colours=["#00D4FF"])
        palette = brand_material_defs(brand)
        for slot in ("cream", "cream_dark", "brand", "coral", "charcoal", "glass", "roof", "sign", "glow"):
            self.assertIn(slot, palette)

    def test_plot_and_height_constraints_fail_loudly(self):
        spec = GeneratedBuildingSpec(
            "pack.agentspace.building.demo.01",
            "demo",
            "plot",
            BrandSpec("demo", "Demo"),
            "tower_campus",
            footprint_w=16,
            footprint_d=16,
            plot_grid={"x": 0, "y": 0, "w": 2, "h": 2},
            max_height=20,
        )
        report = validate_footprint({"w": 17, "d": 16, "h": 21}, spec)
        self.assertFalse(report["ok"])
        self.assertEqual(len(report["issues"]), 2)

    def test_asset_id_contract(self):
        self.assertTrue(validate_asset_id("pack.agentspace.building.demo.01")["ok"])
        self.assertFalse(validate_asset_id("demo-building")["ok"])


if __name__ == "__main__":
    unittest.main()