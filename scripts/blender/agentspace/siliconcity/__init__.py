"""Silicon City daylight toy-diorama company buildings — clean-slate generator.

Modules:
  materials   brand palette → packed PBR mats, logo texture material
  primitives  chunky bevelled masses, floor lines, window grids, storefronts, awnings, vaults
  props       rooftop + street props (solar, HVAC, dish, tank, billboard, cars, trees…)
  signage     toy_font wordmarks + 3D logo marks (totem/blade/roof) + plaques
  archetypes  enterprise_hq / smb_block / startup_loft
  builder     build_from_profile → tagged library asset + footprint report
  render      daylight 3/4 preview camera + PNG render helpers

Only infrastructure is imported from the parent package (geom, registry.tag,
pbr_library.ensure_mats, plot_validator, param_rng, toy_font,
company_building_spec, brand_profile). Nothing from the legacy vocabulary.
"""
from __future__ import annotations

from .archetypes import ARCHETYPES
from .builder import build_from_profile

__all__ = ["ARCHETYPES", "build_from_profile"]
