"""Company building generation contracts (mirrors src/lib/brand-spec.ts)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class BrandLogoSpec:
    wordmark: str = ""
    asset_path: str | None = None
    source_url: str | None = None
    fetched_at: str | None = None
    sha256: str | None = None
    format: str | None = None
    aspect_ratio: float | None = None
    fallback: bool = False


@dataclass
class BrandSpec:
    company_id: str
    company_name: str
    primary_colours: list[str] = field(default_factory=list)
    secondary_colours: list[str] = field(default_factory=list)
    website: str = ""
    industry: str = ""
    personality: list[str] = field(default_factory=list)
    visual_style: str = ""
    architectural_direction: str = ""
    signage_direction: str = ""
    logo: BrandLogoSpec = field(default_factory=BrandLogoSpec)


@dataclass
class GeneratedBuildingSpec:
    asset_id: str
    building_id: str
    parcel_id: str
    brand: BrandSpec
    recipe: str
    root_local: tuple[float, float, float] = (180.0, 24.0, 0.0)
    scale: float = 1.0
    footprint_w: float = 30.0
    footprint_d: float = 20.0
    site_z: float = 0.34
    roof_kind: str = "membrane"
    glass_ratio: float = 0.5
    mat_defs: dict[str, dict[str, Any]] = field(default_factory=dict)
    recipe_params: dict[str, Any] = field(default_factory=dict)
    plot_grid: dict[str, float] | None = None  # {x, y, w, h} tiles — plot allocation
    runtime_export_kinds: list[str] = field(default_factory=list)
    max_height: float | None = None
    detail_density: str = "HIGH"
