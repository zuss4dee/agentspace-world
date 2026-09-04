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
        from .plot_validator import logo_asset_id, ad_asset_id

        self.assertEqual(logo_asset_id("Stripe"), "pack.agentspace.logo.stripe.01")
        self.assertEqual(ad_asset_id("Stripe"), "pack.agentspace.ad.stripe.01")

    def test_plot_envelope_tiers(self):
        from .plot_envelope import resolve_envelope

        small = resolve_envelope(plot_id="p1", tier="smb", plot_grid={"w": 4, "h": 3})
        large = resolve_envelope(plot_id="p2", tier="enterprise", plot_grid={"w": 8, "h": 6})
        self.assertEqual(small.size_class, "small")
        self.assertEqual(large.size_class, "large")
        self.assertLess(small.footprint_w, large.footprint_w)
        wide = resolve_envelope(plot_id="p3", tier="smb", plot_grid={"w": 10, "h": 4})
        self.assertGreater(wide.footprint_w, 50.0)
        self.assertGreater(wide.footprint_w, small.footprint_w)

    def test_structural_fingerprint_ignores_colours(self):
        import tempfile
        from pathlib import Path

        from . import uniqueness_registry as ur
        from .uniqueness_registry import register_fingerprint, structural_fingerprint

        orig = ur.REGISTRY_PATH
        with tempfile.TemporaryDirectory() as td:
            ur.REGISTRY_PATH = Path(td) / "structural-registry.json"
            ur.clear_registry()
            try:
                fp_a = structural_fingerprint("tower_campus", {"tower_height": 28.0, "tower_style": "cylinder"})
                fp_b = structural_fingerprint("tower_campus", {"tower_height": 28.0, "tower_style": "cylinder", "brand_hex": "#ff0000"})
                self.assertEqual(fp_a, fp_b)
                self.assertTrue(register_fingerprint(fp_a, company_id="a", plot_id="plot-a", asset_id="pack.agentspace.building.a.01", recipe="tower_campus"))
                self.assertFalse(register_fingerprint(fp_a, company_id="b", plot_id="plot-b", asset_id="pack.agentspace.building.b.01", recipe="tower_campus"))
            finally:
                ur.REGISTRY_PATH = orig

    def test_build_spec_uses_grammar_not_archetype(self):
        import tempfile
        from pathlib import Path

        from . import uniqueness_registry as ur
        from .brand_profile import brand_profile_from_dict, build_spec_from_profile

        orig = ur.REGISTRY_PATH
        with tempfile.TemporaryDirectory() as td:
            ur.REGISTRY_PATH = Path(td) / "structural-registry.json"
            ur.clear_registry()
            try:
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
            finally:
                ur.REGISTRY_PATH = orig

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

    def test_plot_family_drives_recipe_weights(self):
        from .building_architecture import classify_plot_family, recipe_weights_for_plot

        self.assertEqual(classify_plot_family(80, 28), "wide_shallow")
        self.assertEqual(classify_plot_family(28, 72), "narrow_deep")
        self.assertEqual(classify_plot_family(64, 24), "wide_shallow")
        self.assertEqual(classify_plot_family(32, 24), "compact")
        self.assertEqual(classify_plot_family(56, 56), "campus_square")
        wide = recipe_weights_for_plot(80, 28)
        self.assertGreater(wide["pavilion"], wide["stacked_volumes"])
        self.assertLessEqual(wide["stacked_volumes"], 0.0)
        deep = recipe_weights_for_plot(28, 72)
        self.assertGreater(deep["tower_campus"], deep["stacked_volumes"])

    def test_grammar_maps_to_siliconcity_vocabulary(self):
        from .building_graph import archetype_for_grammar

        self.assertEqual(archetype_for_grammar("courtyard_block"), "courtyard_campus")
        self.assertEqual(archetype_for_grammar("tower_campus"), "enterprise_hq")
        self.assertEqual(archetype_for_grammar("pavilion"), "startup_loft")
        self.assertEqual(archetype_for_grammar("stacked_volumes"), "startup_loft")
        self.assertEqual(archetype_for_grammar("hybrid", "wide_shallow"), "low_rise_strip")
        self.assertEqual(archetype_for_grammar("hybrid", "narrow_deep"), "industrial_hall")
        self.assertEqual(archetype_for_grammar("asymmetric_campus", "wide_shallow"), "low_rise_strip")
        self.assertEqual(archetype_for_grammar("tower_campus", "compact"), "smb_block")
        self.assertNotEqual(archetype_for_grammar("stacked_volumes"), "stacked_volumes")

    def test_light_led_brand_uses_neutral_walls(self):
        from .brand_profile import brand_profile_from_dict, derive_mat_defs, value

        profile = brand_profile_from_dict(
            {
                "companyId": "grove-walls",
                "companyName": "Grove Health",
                "primaryColours": ["#ffffff", "#22a94f"],
                "colourRoles": {"primary": "#22a94f", "background": "#ffffff"},
            }
        )
        defs = derive_mat_defs(profile)
        wall = defs["brand"]["color"]
        accent = defs["coral"]["color"]
        self.assertGreater(value(wall), 0.7)
        self.assertGreater(accent[1], accent[0])

    def test_brand_colours_keep_white_and_green(self):
        from .brand_profile import brand_profile_from_dict, pick_brand_colours, saturation, value

        profile = brand_profile_from_dict(
            {
                "companyId": "echt-palette",
                "companyName": "Echt Palette",
                "primaryColours": ["#ffffff", "#22a94f"],
                "secondaryColours": ["#0f1211"],
                "colourRoles": {"primary": "#22a94f", "background": "#ffffff", "foreground": "#0f1211"},
            }
        )
        brand, accent = pick_brand_colours(profile)
        self.assertGreater(saturation(brand), 0.3)
        self.assertGreater(brand[1], brand[0])
        self.assertGreater(value(accent) + value(brand), 0.8)

    def test_neutral_palette_does_not_invent_indigo(self):
        from .brand_profile import brand_profile_from_dict, hue_deg, pick_brand_colours, saturation

        profile = brand_profile_from_dict(
            {
                "companyId": "greyco",
                "companyName": "Grey Co",
                "primaryColours": ["#aaaaaa", "#ffffff", "#333333"],
                "colourRoles": {"primary": "#22a94f", "background": "#ffffff"},
            }
        )
        brand, _accent = pick_brand_colours(profile)
        self.assertLess(abs(hue_deg(brand) - hue_deg((0.133, 0.663, 0.310))), 40)
        self.assertGreater(saturation(brand), 0.2)

    def test_recipe_params_include_architectural_proportions(self):
        from .param_rng import ParamRNG, generate_recipe_params

        params = generate_recipe_params(ParamRNG(42), "tower_campus", w=48.0, d=32.0)
        for key in ("storey_h", "ground_storey_h", "setback_m", "window_bay", "canopy_depth", "plot_family"):
            self.assertIn(key, params)
        self.assertGreater(params["storey_h"], 3.0)
        self.assertLess(params["storey_h"], 4.0)

    def test_plot_fit_depth_overshoot_then_validates(self):
        from .plot_fit import fit_building_to_plot

        spec = GeneratedBuildingSpec(
            "pack.agentspace.building.demo.01",
            "demo",
            "land-ridge-demo",
            BrandSpec("demo", "Demo"),
            "tower_campus",
            footprint_w=28,
            footprint_d=32,
            plot_grid={"x": 0, "y": 0, "w": 7, "h": 4},
        )
        fit = fit_building_to_plot(28.0, 32.27, 56.0, 32.0, generated_h=18.0)
        self.assertLess(fit.xy_scale, 1.0)
        self.assertEqual(fit.z_scale, 1.0)
        self.assertLessEqual(fit.fitted_d, 32.0 - 0.05)
        self.assertTrue(fit.applied)
        report = validate_footprint({"w": fit.fitted_w, "d": fit.fitted_d, "h": fit.fitted_h}, spec)
        self.assertTrue(report["ok"], report["issues"])

    def test_plot_fit_already_inside_stays_one(self):
        from .plot_fit import fit_building_to_plot

        fit = fit_building_to_plot(28.0, 30.0, 56.0, 32.0, generated_h=18.0)
        self.assertEqual(fit.xy_scale, 1.0)
        self.assertEqual(fit.z_scale, 1.0)
        self.assertFalse(fit.applied)
        self.assertEqual(fit.fitted_w, 28.0)
        self.assertEqual(fit.fitted_d, 30.0)

    def test_plot_fit_substantial_oversize_is_proportional(self):
        from .plot_fit import fit_building_to_plot

        fit = fit_building_to_plot(80.0, 48.0, 40.0, 32.0, generated_h=22.0)
        self.assertAlmostEqual(fit.fitted_w / fit.fitted_d, 80.0 / 48.0, places=6)
        self.assertLessEqual(fit.fitted_w, 40.0 - 0.05)
        self.assertLessEqual(fit.fitted_d, 32.0 - 0.05)
        self.assertEqual(fit.z_scale, 1.0)

    def test_plot_fit_non_square_uses_limiting_axis(self):
        from .plot_fit import fit_building_to_plot

        depth_limited = fit_building_to_plot(28.0, 40.0, 56.0, 32.0)
        self.assertAlmostEqual(depth_limited.xy_scale, depth_limited.usable_d / 40.0, places=9)
        width_limited = fit_building_to_plot(70.0, 20.0, 56.0, 32.0)
        self.assertAlmostEqual(width_limited.xy_scale, width_limited.usable_w / 70.0, places=9)

    def test_plot_fit_float_overshoot_does_not_fail_validation(self):
        from .plot_fit import fit_building_to_plot

        spec = GeneratedBuildingSpec(
            "pack.agentspace.building.demo.01",
            "demo",
            "plot",
            BrandSpec("demo", "Demo"),
            "tower_campus",
            footprint_w=32,
            footprint_d=32,
            plot_grid={"x": 0, "y": 0, "w": 4, "h": 4},
        )
        fit = fit_building_to_plot(32.01, 32.01, 32.0, 32.0, generated_h=16.0)
        self.assertLess(fit.xy_scale, 1.0)
        report = validate_footprint({"w": fit.fitted_w, "d": fit.fitted_d, "h": 16.0}, spec)
        self.assertTrue(report["ok"], report["issues"])

    def test_plot_fit_height_unchanged_for_xy_only(self):
        from .plot_fit import fit_building_to_plot

        fit = fit_building_to_plot(40.0, 40.0, 32.0, 32.0, generated_h=24.5)
        self.assertLess(fit.xy_scale, 1.0)
        self.assertEqual(fit.z_scale, 1.0)
        self.assertEqual(fit.fitted_h, 24.5)

    def test_plot_fit_skips_echt(self):
        from .echt_spec import ECHT_BUILDING_SPEC
        from .plot_fit import fit_spec_to_plot

        fit = fit_spec_to_plot(ECHT_BUILDING_SPEC, {"w": 120.0, "d": 90.0, "h": 40.0})
        self.assertTrue(fit.skipped)
        self.assertEqual(fit.reason, "frozen_asset")
        self.assertEqual(fit.xy_scale, 1.0)
        self.assertEqual(fit.z_scale, 1.0)
        self.assertFalse(fit.applied)
        self.assertEqual(fit.fitted_w, 120.0)
        self.assertEqual(fit.fitted_d, 90.0)

    def test_generated_recipe_footprints_unchanged(self):
        from .siliconcity.massing import ARCHETYPE_FOOTPRINT, STRATEGY_TO_ARCHETYPE

        self.assertEqual(
            ARCHETYPE_FOOTPRINT,
            {
                "smb_block": (26.0, 18.0),
                "enterprise_hq": (54.0, 38.0),
                "startup_loft": (40.0, 28.0),
                "courtyard_campus": (56.0, 56.0),
                "low_rise_strip": (72.0, 26.0),
                "industrial_hall": (34.0, 70.0),
            },
        )
        self.assertEqual(
            STRATEGY_TO_ARCHETYPE,
            {
                "small_commercial": "smb_block",
                "hq_campus": "enterprise_hq",
                "loft_conversion": "startup_loft",
                "courtyard": "courtyard_campus",
                "wide_shallow": "low_rise_strip",
                "narrow_deep": "industrial_hall",
                "corner_landmark": "smb_block",
            },
        )

    def test_mass_detail_aliases_see_recipe_roofs(self):
        from .building_architecture import mass_detail_aliases, mass_stem

        aliases = mass_detail_aliases("mass.studio")
        self.assertIn("roof.studio", aliases)
        self.assertIn("facade.studio", aliases)
        self.assertIn("mass.studio", aliases)
        self.assertEqual(mass_stem("mass.gallery.left.base"), "mass.gallery.left")
        self.assertEqual(mass_stem("mass.studio"), "mass.studio")
        self.assertIn("roof.left", mass_detail_aliases(mass_stem("mass.gallery.left")))


if __name__ == "__main__":
    unittest.main()