"""Recipe template registry — maps recipe id → compose function."""
from __future__ import annotations

from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from .company_building import BuildingContext

TemplateFn = Callable[["BuildingContext"], None]

# Lazy import to avoid cycles
_REGISTRY: dict[str, TemplateFn] | None = None


def get_recipe_registry() -> dict[str, TemplateFn]:
    global _REGISTRY
    if _REGISTRY is None:
        from . import building_recipes as br

        _REGISTRY = dict(br.RECIPES)
    return _REGISTRY


def compose(recipe_id: str, ctx: "BuildingContext") -> None:
    reg = get_recipe_registry()
    fn = reg.get(recipe_id)
    if fn is None:
        raise ValueError(f"unknown recipe template: {recipe_id}")
    fn(ctx)


RECIPE_IDS = (
    "bridge_complex",
    "tower_campus",
    "stepped_terrace",
    "courtyard_block",
    "pavilion",
    "stacked_volumes",
    "asymmetric_campus",
)
