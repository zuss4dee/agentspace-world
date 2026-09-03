"""Brand-aware toy-city PBR palette derivation.

Visual target: docs/BUILDING_VISUAL_STYLE.md — saturated brand bodies, warm trim,
dark window frames. Cream is trim/podium only; masses read in brand/coral slots.
"""
from __future__ import annotations


def brand_material_defs(brand) -> dict[str, dict]:
    """On-site Silicon City palette — shared with derive_mat_defs()."""
    from .brand_profile import brand_profile_from_dict, derive_mat_defs

    profile = brand_profile_from_dict(
        {
            "companyId": getattr(brand, "company_id", "brand"),
            "companyName": getattr(brand, "company_name", "Brand"),
            "primaryColours": list(getattr(brand, "primary_colours", []) or []),
            "secondaryColours": list(getattr(brand, "secondary_colours", []) or []),
            "industry": getattr(brand, "industry", ""),
            "personality": list(getattr(brand, "personality", []) or []),
            "styleKeywords": list(getattr(brand, "style_keywords", []) or []),
        }
    )
    return derive_mat_defs(profile)