"""Fast tests that do not require Blender.

Blender integration is exercised by build_test_buildings.py when Blender is
available; these checks cover the deterministic contracts in every checkout.
"""
from __future__ import annotations

import unittest

from .brand_materials import brand_material_defs
from .company_building_spec import BrandSpec, GeneratedBuildingSpec
from .param_rng import ParamRNG, deterministic_seed, select_recipe
from .plot_validator import validate_asset_id, validate_footprint, validate_logo_asset_id


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

    def test_logo_asset_id_contract(self):
        self.assertTrue(validate_logo_asset_id("pack.agentspace.logo.echt.01")["ok"])
        self.assertFalse(validate_logo_asset_id("pack.agentspace.building.echt.01")["ok"])

    def test_logo_asset_id_helper(self):
        from .plot_validator import logo_asset_id

        self.assertEqual(logo_asset_id("Stripe"), "pack.agentspace.logo.stripe.01")

    def test_plot_envelope_tiers(self):
        from .plot_envelope import resolve_envelope

        small = resolve_envelope(plot_id="p1", tier="smb", plot_grid={"w": 4, "h": 3})
        large = resolve_envelope(plot_id="p2", tier="enterprise", plot_grid={"w": 8, "h": 6})
        self.assertEqual(small.size_class, "small")
        self.assertEqual(large.size_class, "large")
        self.assertLess(small.footprint_w, large.footprint_w)

    def test_structural_fingerprint_ignores_colours(self):
        from .uniqueness_registry import clear_registry, register_fingerprint, structural_fingerprint

        clear_registry()
        fp_a = structural_fingerprint("tower_campus", {"tower_height": 28.0, "tower_style": "cylinder"})
        fp_b = structural_fingerprint("tower_campus", {"tower_height": 28.0, "tower_style": "cylinder", "brand_hex": "#ff0000"})
        self.assertEqual(fp_a, fp_b)
        self.assertTrue(register_fingerprint(fp_a, company_id="a", plot_id="plot-a", asset_id="pack.agentspace.building.a.01", recipe="tower_campus"))
        self.assertFalse(register_fingerprint(fp_a, company_id="b", plot_id="plot-b", asset_id="pack.agentspace.building.b.01", recipe="tower_campus"))

    def test_build_spec_uses_grammar_not_archetype(self):
        from .brand_profile import brand_profile_from_dict, build_spec_from_profile

        profile = brand_profile_from_dict(
            {
                "companyId": "grammar-test",
                "companyName": "Grammar Test Co",
                "tier": "enterprise",
                "industry": "software",
                "styleKeywords": ["tech"],
            }
        )
        spec = build_spec_from_profile(profile, plot_id="plot-grammar-test")
        self.assertNotIn(spec.recipe, {"enterprise_hq", "smb_block", "startup_loft"})
        self.assertIn(
            spec.recipe,
            {
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
            },
        )
        self.assertTrue(spec.recipe_params.get("structuralFingerprint"))

    def test_plot_first_massing_families(self):
        from .siliconcity.massing import archetype_for_plot, classify_plot

        self.assertEqual(classify_plot(72, 26), "wide_shallow")
        self.assertEqual(classify_plot(34, 70), "narrow_deep")
        self.assertEqual(classify_plot(56, 56), "courtyard")
        self.assertEqual(classify_plot(26, 18), "small_commercial")
        self.assertEqual(classify_plot(54, 38), "hq_campus")
        self.assertEqual(classify_plot(40, 28), "loft_conversion")
        self.assertEqual(archetype_for_plot(72, 26), "low_rise_strip")
        self.assertEqual(archetype_for_plot(34, 70), "industrial_hall")
        self.assertEqual(archetype_for_plot(56, 56), "courtyard_campus")
        # Same industry, different plots → different families
        self.assertNotEqual(archetype_for_plot(72, 26, industry="software"), archetype_for_plot(34, 70, industry="software"))


if __name__ == "__main__":
    unittest.main()