"""Echt HQ — premium stylized toy-city headquarters (SiliconCity-inspired).

Library only. Asset: pack.agentspace.building.echt.02
Exterior-only: unified connected masses on shared podium + miniature site.

Implementation delegates to the company building generator (bridge_complex recipe).
"""
from __future__ import annotations

from .company_building import build_company_building
from .echt_spec import ECHT_BRAND, ECHT_BUILDING_SPEC


def build_echt_canonical():
    """Rebuild Echt via the shared generator — preserves pack.agentspace.building.echt.02."""
    return build_company_building(ECHT_BRAND, ECHT_BUILDING_SPEC)
