"""Agentspace Blender authoring helpers.

Blender is authoring only. Runtime loads GLBs from public/assets/gltf/
keyed by assetId. Query components with:

    import sys
    sys.path.append("<repo>/scripts/blender")
    from agentspace.registry import get_component, list_components, set_component
"""

from .contract import load_contract, world_xy, building_height, lot_center_grid
from .registry import get_component, list_components, set_component, dump_registry

__all__ = [
    "load_contract",
    "world_xy",
    "building_height",
    "lot_center_grid",
    "get_component",
    "list_components",
    "set_component",
    "dump_registry",
]
