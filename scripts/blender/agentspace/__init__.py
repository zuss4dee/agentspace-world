"""Agentspace Blender authoring helpers.

Blender is authoring only. Runtime loads GLBs from public/assets/gltf/
keyed by assetId. Query components with:

    import sys
    sys.path.append("<repo>/scripts/blender")
    from agentspace.registry import get_component, list_components, set_component
"""

from .contract import load_contract, world_xy, building_height, lot_center_grid

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


def __getattr__(name: str):
    if name in {"get_component", "list_components", "set_component", "dump_registry"}:
        from .registry import get_component, list_components, set_component, dump_registry

        return {
            "get_component": get_component,
            "list_components": list_components,
            "set_component": set_component,
            "dump_registry": dump_registry,
        }[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
