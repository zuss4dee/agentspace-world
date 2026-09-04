"""Plot-first architectural composition helpers for the company-building generator.

Recipes stay in building_recipes_procedural.py. This module owns:
- plot envelope → family
- architectural proportions
- punched facades, storefronts, and alive ground floors

bpy-free except when a `part` callback is supplied by the live builder.
"""
from __future__ import annotations

from typing import Any

from .mini_city_style import (
    chunky_curtain,
    chunky_punched_window,
    entrance_hero,
    hero_sculpture_rings,
    roof_slab,
    stylized_bench,
    stylized_lamp,
    stylized_planter,
    stylized_tree,
    terrace_garden,
)
from .mini_city_style_v2 import orb_sculpture_stack
from .param_rng import ParamRNG

# Families describe topology, not a finished building.
PLOT_FAMILIES = (
    "compact",
    "wide_shallow",
    "narrow_deep",
    "campus_square",
    "headquarters",
)

# Residual stacked-box recipes stay registered but must be rare.
FAMILY_RECIPE_WEIGHTS: dict[str, dict[str, float]] = {
    "compact": {
        "pavilion": 2.4,
        "sculpture_hq": 2.0,
        "tower_campus": 0.35,
        "courtyard_block": 0.25,
        "stacked_volumes": 0.0,
        "stepped_terrace": 0.12,
    },
    "wide_shallow": {
        "pavilion": 1.8,
        "asymmetric_campus": 1.5,
        "courtyard_block": 1.4,
        "bridge_complex": 1.0,
        "sculpture_hq": 0.9,
        "stepped_terrace": 0.45,
        "stacked_volumes": 0.0,
    },
    "narrow_deep": {
        "tower_campus": 1.8,
        "vertical_landmark": 1.6,
        "courtyard_block": 1.1,
        "bridge_complex": 0.7,
        "hybrid": 0.5,
        "stacked_volumes": 0.0,
        "stepped_terrace": 0.2,
    },
    "campus_square": {
        "courtyard_block": 2.0,
        "bridge_complex": 1.6,
        "asymmetric_campus": 1.5,
        "hybrid": 1.0,
        "tower_campus": 0.8,
        "sculpture_hq": 0.7,
        "stacked_volumes": 0.0,
        "stepped_terrace": 0.25,
    },
    "headquarters": {
        "tower_campus": 1.5,
        "bridge_complex": 1.3,
        "asymmetric_campus": 1.2,
        "courtyard_block": 1.0,
        "sculpture_hq": 1.0,
        "hybrid": 0.7,
        "vertical_landmark": 0.6,
        "pavilion": 0.5,
        "stepped_terrace": 0.3,
        "stacked_volumes": 0.0,
    },
}


def classify_plot_family(width_m: float, depth_m: float, *, area_m2: float | None = None) -> str:
    """Plot envelope → architectural family. Plot is the first constraint."""
    w = max(float(width_m), 1.0)
    d = max(float(depth_m), 1.0)
    ratio = w / d
    area = float(area_m2) if area_m2 is not None else w * d
    if ratio >= 1.75:
        return "wide_shallow"
    if ratio <= 0.62:
        return "narrow_deep"
    if area < 800 or (min(w, d) <= 24.0 and max(w, d) <= 40.0):
        return "compact"
    if min(w, d) >= 40.0 and 0.82 <= ratio <= 1.22:
        return "campus_square"
    return "headquarters"


def recipe_weights_for_plot(width_m: float, depth_m: float, *, area_m2: float | None = None) -> dict[str, float]:
    family = classify_plot_family(width_m, depth_m, area_m2=area_m2)
    return dict(FAMILY_RECIPE_WEIGHTS[family])


def architectural_proportions(rng: ParamRNG, *, footprint_w: float, footprint_d: float) -> dict[str, Any]:
    """Seeded architectural measures — not arbitrary box sizes."""
    storey_h = round(rng.uniform("arch.storey_h", 3.2, 3.7), 3)
    ground_h = round(rng.uniform("arch.ground_h", 4.2, 5.2), 3)
    podium_storeys = rng.randint("arch.podium_storeys", 1, 2)
    return {
        "storey_h": storey_h,
        "ground_storey_h": ground_h,
        "podium_storeys": podium_storeys,
        "podium_h": round(ground_h + storey_h * max(0, podium_storeys - 1), 3),
        "setback_m": round(rng.uniform("arch.setback", 1.8, min(4.2, footprint_d * 0.18)), 3),
        "window_bay": round(rng.uniform("arch.bay", 2.4, 3.2), 3),
        "column_spacing": round(rng.uniform("arch.col", 3.0, 4.4), 3),
        "canopy_depth": round(rng.uniform("arch.canopy", 1.6, 2.6), 3),
        "parapet_h": round(rng.uniform("arch.parapet", 0.45, 0.8), 3),
        "entrance_span": round(min(footprint_w * 0.38, rng.uniform("arch.entrance", 8.5, 13.0)), 3),
        "plot_family": classify_plot_family(footprint_w, footprint_d),
    }


def mass_mat(ctx: Any, role: str):
    """Primary masses use brand/cream. Coral is accent-only (awnings, fins)."""
    m = ctx.mats
    if role == "primary":
        return m["brand"]
    if role == "secondary":
        return m["cream"]
    if role == "tertiary":
        return m["cream_dark"]
    if role == "accent":
        return m.get("coral", m["brand"])
    return m["cream"]


def punched_facade(
    part,
    prefix: str,
    cx: float,
    face_y: float,
    z0: float,
    z1: float,
    span_w: float,
    mats,
    parent,
    col,
    *,
    storey_h: float = 3.4,
    bay: float = 2.8,
    skip_ground: bool = True,
    ground_h: float = 4.6,
    seed: int = 0,
) -> int:
    """Recessed window grid with frames — facade depth, not pasted black rectangles."""
    rng = ParamRNG(seed)
    start = z0 + (ground_h if skip_ground else storey_h * 0.28)
    if z1 - start < storey_h * 0.7 or span_w < bay * 1.4:
        return 0
    cols = max(2, min(8, int(span_w / bay)))
    rows = max(1, min(6, int((z1 - start) / storey_h)))
    win_w = min(bay * 0.62, span_w / cols * 0.68)
    win_h = storey_h * 0.58
    x0 = cx - (cols - 1) * bay * 0.5
    placed = 0
    for r in range(rows):
        z = start + storey_h * (r + 0.48)
        if z + win_h * 0.4 > z1:
            break
        for c in range(cols):
            if rng.uniform(f"win.{r}.{c}", 0, 1) < 0.08:
                continue
            chunky_punched_window(
                part,
                f"{prefix}.w{r}c{c}",
                x0 + c * bay,
                face_y,
                z,
                win_w,
                win_h,
                mats["charcoal"],
                mats["glass"],
                parent,
                col,
                depth=0.34,
            )
            placed += 1
    return placed


def storefront_frontage(
    part,
    prefix: str,
    cx: float,
    face_y: float,
    z0: float,
    span_w: float,
    mats,
    parent,
    col,
    *,
    height: float = 3.6,
    cols: int = 4,
    canopy_depth: float = 1.8,
) -> None:
    """Ground-floor lobby / shop glass + projecting canopy."""
    chunky_curtain(
        part,
        f"{prefix}.shop",
        cx,
        face_y,
        z0 + 0.25,
        z0 + height,
        span_w,
        mats["glass"],
        mats["charcoal"],
        parent,
        col,
        depth=0.28,
        cols=max(2, cols),
    )
    part(
        f"{prefix}.awning",
        span_w + 0.4,
        canopy_depth,
        0.28,
        (cx, face_y - canopy_depth * 0.42, z0 + height + 0.12),
        mats.get("coral", mats["brand"]),
        parent,
        col,
        f"{prefix}.awning",
        bevel=0.04,
    )
    part(
        f"{prefix}.awning.strip",
        span_w + 0.2,
        0.1,
        0.08,
        (cx, face_y - canopy_depth * 0.85, z0 + height + 0.02),
        mats["glow"],
        parent,
        col,
        f"{prefix}.awning.strip",
    )


def alive_entrance(ctx: Any, x: float, y: float, z: float, *, span: float, height: float, canopy_d: float) -> None:
    entrance_hero(
        ctx.part,
        "entrance",
        x,
        y,
        z,
        ctx.mats,
        ctx.root,
        ctx.col,
        canopy_w=span,
        canopy_d=canopy_d,
        pier_h=height,
        detail_scale=min(1.15, max(0.75, span / 11.0)),
    )
    ctx.anchors["entrance"] = (x, y, z)


def roof_finish(part, prefix: str, w: float, d: float, x: float, y: float, z: float, mats, parent, col, *, parapet_h: float = 0.55) -> None:
    roof_slab(part, prefix, w, d, x, y, z, mats["roof"], mats["charcoal"], parent, col, lip=parapet_h)


def site_life(ctx: Any, *, front_y: float, width: float, density: float = 0.75) -> None:
    """Trees, benches, lamps, planters along the street edge — not a blank wall."""
    part, m, root, col = ctx.part, ctx.mats, ctx.root, ctx.col
    z = ctx.site_z
    n_trees = 2 if density < 0.5 else 3 if density < 0.9 else 4
    span = width * 0.42
    for i in range(n_trees):
        t = -0.5 + (i + 0.5) / n_trees
        stylized_tree(part, f"site.tree.{i}", t * span * 2, front_y + 1.1, z, m, root, col, scale=0.85 + i * 0.06)
    if density >= 0.45:
        stylized_bench(part, "site.bench.0", -width * 0.18, front_y + 2.2, z, m["cream_dark"], m["charcoal"], root, col)
        stylized_lamp(part, "site.lamp.0", width * 0.22, front_y + 1.6, z, m["charcoal"], m["glow"], root, col)
    if density >= 0.7:
        stylized_planter(part, "site.planter.0", width * 0.28, front_y + 2.4, z, 1.6, 1.1, 0.55, m["cream_dark"], m["canopy"], root, col)
    rng = ParamRNG(int(getattr(ctx, "seed", 0)))
    sculpt = rng.choice("site.sculpt", ["hero_rings", "orb_stack", "none", "none"])
    if sculpt == "hero_rings":
        hero_sculpture_rings(part, "site.sculpture", -width * 0.26, front_y + 3.4, z + 0.08, m["brand"], m["charcoal"], root, col, scale=0.72)
    elif sculpt == "orb_stack":
        orb_sculpture_stack(part, "site.sculpture", width * 0.24, front_y + 3.2, z + 0.08, m, root, col, count=3, scale=0.7)


def setback_terrace(ctx: Any, prefix: str, x: float, y: float, z: float, w: float, d: float) -> None:
    terrace_garden(ctx.part, prefix, x, y, z, w, d, ctx.mats, ctx.root, ctx.col)


_GEOM_SUFFIXES = {
    "base",
    "cap",
    "shaft",
    "band",
    "fin",
    "core",
    "lip",
    "shelf",
    "slot",
    "glass",
    "frame",
}


def mass_stem(short: str) -> str:
    """mass.gallery.left.base → mass.gallery.left so roof.left is visible."""
    parts = [p for p in short.split(".") if p]
    while parts:
        last = parts[-1]
        if last in _GEOM_SUFFIXES or last.isdigit() or last[:1] == "w" and "c" in last:
            parts.pop()
            continue
        if last.startswith("band") or last.startswith("fin"):
            parts.pop()
            continue
        break
    if len(parts) >= 3 and parts[0] in {"mass", "blob", "ring", "pod", "base", "gate", "stack", "step"}:
        return ".".join(parts[:3])
    if len(parts) >= 2:
        return ".".join(parts[:2])
    return parts[0] if parts else short


def mass_detail_aliases(stem: str) -> tuple[str, ...]:
    """Recipe roofs/facades are named roof.studio / facade.studio, not mass.studio.roof."""
    name = stem.split(".")[-1] if stem else stem
    aliases = [stem, f"roof.{name}", f"facade.{name}", f"ground.{name}", f"enrich.{stem}"]
    if name:
        aliases.extend((f"shop.{name}", f"link.{name}"))
    return tuple(aliases)
