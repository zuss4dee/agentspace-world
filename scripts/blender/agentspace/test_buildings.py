"""Preview building cases for Blender library — composition + silhouette inspection.

Visual target: docs/BUILDING_VISUAL_STYLE.md (Apple 3D Maps / premium toy-city).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec
from .preview_style_mats import PREVIEW_MAT_DEFS

# Gallery grid: row Y=24 and Y=110, columns spaced ~62 m. Echt stays at (180, 24).
_BASE_SCALE = 1.25
_BASE_FOOTPRINT_W = 42.0
_BASE_FOOTPRINT_D = 30.0
_BASE_SITE_Z = 0.34


@dataclass(frozen=True)
class PreviewBuildingCase:
    recipe: str
    company_id: str
    asset_id: str
    root_local: tuple[float, float, float]
    label: str
    display_name: str
    scale: float = _BASE_SCALE
    footprint_w: float = _BASE_FOOTPRINT_W
    footprint_d: float = _BASE_FOOTPRINT_D
    recipe_params: dict = field(default_factory=dict)


PREVIEW_BUILDINGS: tuple[PreviewBuildingCase, ...] = (
    PreviewBuildingCase(
        "tower_campus",
        "preview.tower.s01",
        "pack.agentspace.building.preview.tower_campus.s01",
        (260.0, 24.0, 0.0),
        "Tall tower + cantilever/cylinder core + skewed wings",
        "PREVIEW tower_campus / seed s01",
        scale=1.35,
        recipe_params={"tower_style": "wishbone", "roof_module": "stack"},
    ),
    PreviewBuildingCase(
        "tower_campus",
        "preview.tower.s02",
        "pack.agentspace.building.preview.tower_campus.s02",
        (322.0, 24.0, 0.0),
        "Extra-tall cylinder tower + low wings contrast",
        "PREVIEW tower_campus / seed s02",
        scale=1.2,
        footprint_w=38.0,
        footprint_d=26.0,
        recipe_params={"tower_style": "cylinder", "tower_height": 36.0, "composition_profile": "landmark_roof"},
    ),
    PreviewBuildingCase(
        "stepped_terrace",
        "preview.terrace.s01",
        "pack.agentspace.building.preview.stepped_terrace.s01",
        (384.0, 24.0, 0.0),
        "Off-axis wedding cake + zigzag terraces",
        "PREVIEW stepped_terrace / seed s01",
        recipe_params={"step_count": 5, "composition_profile": "plaza_sculpture"},
    ),
    PreviewBuildingCase(
        "courtyard_block",
        "preview.courtyard.s01",
        "pack.agentspace.building.preview.courtyard_block.s01",
        (446.0, 24.0, 0.0),
        "U-ring + round turrets + gate tower",
        "PREVIEW courtyard_block / seed s01",
        recipe_params={"open_side": "south", "composition_profile": "signage_corner"},
    ),
    PreviewBuildingCase(
        "pavilion",
        "preview.pavilion.s01",
        "pack.agentspace.building.preview.pavilion.s01",
        (508.0, 24.0, 0.0),
        "Low horizontal pilotis + offset canopies",
        "PREVIEW pavilion / seed s01",
        scale=1.15,
        footprint_w=44.0,
        recipe_params={"canopy_lift": 7.2, "composition_profile": "street_buzz"},
    ),
    PreviewBuildingCase(
        "stacked_volumes",
        "preview.stacked.s01",
        "pack.agentspace.building.preview.stacked_volumes.s01",
        (260.0, 110.0, 0.0),
        "Pod tower + skewed stacks + sky bridge",
        "PREVIEW stacked_volumes / seed s01",
        recipe_params={"stack_count": 5, "composition_profile": "plaza_sculpture"},
    ),
    PreviewBuildingCase(
        "asymmetric_campus",
        "preview.campus.s01",
        "pack.agentspace.building.preview.asymmetric_campus.s01",
        (322.0, 110.0, 0.0),
        "Irregular blob cluster + bridges + satellite tower",
        "PREVIEW asymmetric_campus / seed s01",
        scale=1.3,
        recipe_params={"asymmetry": 0.92, "composition_profile": "landmark_roof"},
    ),
    PreviewBuildingCase(
        "bridge_complex",
        "preview.bridge.s01",
        "pack.agentspace.building.preview.bridge_complex.s01",
        (384.0, 110.0, 0.0),
        "Parametric bridge-linked campus (not Echt)",
        "PREVIEW bridge_complex / seed s01",
        recipe_params={"composition_profile": "plaza_sculpture"},
    ),
    PreviewBuildingCase(
        "bridge_complex",
        "preview.bridge.s02",
        "pack.agentspace.building.preview.bridge_complex.s02",
        (446.0, 110.0, 0.0),
        "Alternate bridge massing + round tower",
        "PREVIEW bridge_complex / seed s02",
        scale=1.1,
        footprint_w=36.0,
        footprint_d=28.0,
        recipe_params={"tower_height": 28.0, "composition_profile": "roof_garden"},
    ),
    PreviewBuildingCase(
        "tower_campus",
        "preview.tower.s03",
        "pack.agentspace.building.preview.tower_campus.s03",
        (508.0, 110.0, 0.0),
        "Cantilever tower + projecting wings — mid height tier",
        "PREVIEW tower_campus / seed s03",
        footprint_w=40.0,
        footprint_d=32.0,
        recipe_params={"tower_style": "cantilever", "roof_module": "pitch_cap", "composition_profile": "street_buzz"},
    ),
    PreviewBuildingCase(
        "sculpture_hq",
        "preview.sculpture.s01",
        "pack.agentspace.building.preview.sculpture_hq.s01",
        (570.0, 24.0, 0.0),
        "Gallery HQ + hero sculpture + terrace",
        "PREVIEW sculpture_hq / seed s01",
        recipe_params={"composition_profile": "plaza_sculpture", "detail_density": "VERY_HIGH"},
    ),
    PreviewBuildingCase(
        "vertical_landmark",
        "preview.landmark.s01",
        "pack.agentspace.building.preview.vertical_landmark.s01",
        (570.0, 110.0, 0.0),
        "Singular wishbone/cylinder skyline landmark",
        "PREVIEW vertical_landmark / seed s01",
        scale=1.1,
        recipe_params={"landmark_style": "wishbone", "detail_density": "HIGH"},
    ),
    PreviewBuildingCase(
        "hybrid",
        "preview.hybrid.s01",
        "pack.agentspace.building.preview.hybrid.s01",
        (632.0, 110.0, 0.0),
        "Controlled tower + bridge hybrid",
        "PREVIEW hybrid / seed s01",
        scale=1.1,
        recipe_params={"hybrid_mode": "tower", "detail_density": "MEDIUM"},
    ),
)


def preview_brand(case: PreviewBuildingCase) -> BrandSpec:
    wordmarks = {
        "preview.tower.s01": "TECH",
        "preview.tower.s02": "ETCH",
        "preview.tower.s03": "CHEE",
        "preview.terrace.s01": "ETCH",
        "preview.courtyard.s01": "CHEE",
        "preview.pavilion.s01": "ETC",
        "preview.stacked.s01": "TEE",
        "preview.campus.s01": "CHE",
        "preview.bridge.s01": "ETC",
        "preview.bridge.s02": "TECH",
        "preview.sculpture.s01": "FORM",
        "preview.landmark.s01": "VERT",
        "preview.hybrid.s01": "MIX",
    }
    return BrandSpec(
        company_id=case.company_id,
        company_name=case.display_name,
        logo=BrandLogoSpec(wordmark=wordmarks.get(case.company_id, "TECH")),
    )


def preview_spec(case: PreviewBuildingCase) -> GeneratedBuildingSpec:
    return GeneratedBuildingSpec(
        asset_id=case.asset_id,
        building_id=f"preview-{case.company_id.split('.')[-1]}",
        parcel_id="preview-library",
        brand=preview_brand(case),
        recipe=case.recipe,
        root_local=case.root_local,
        scale=case.scale,
        footprint_w=case.footprint_w,
        footprint_d=case.footprint_d,
        site_z=_BASE_SITE_Z,
        mat_defs=PREVIEW_MAT_DEFS,
        recipe_params=dict(case.recipe_params),
    )
