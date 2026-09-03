"""Silhouette recipe implementations for company HQ assets.

Each recipe produces a substantially different massing language. Echt keeps
its frozen bridge_complex preset; every other family is parametric.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from .mini_city_style import (
    bridge_connector,
    hero_sculpture_rings,
    rounded_mass,
    shared_podium,
    signage_from_brand,
    site_composition,
    site_props_tier,
    stylized_bench,
    stylized_bike,
    stylized_site_car,
    stylized_bollard,
    stylized_lamp,
    stylized_planter,
    stylized_tree,
    terrace_garden,
    toy_curtain_wall,
    toy_dome_cap,
    toy_entrance_portal,
    toy_pitch_cap,
    toy_roof_stack,
    toy_rooftop_beacon,
    toy_setback_tower,
    toy_window_band,
)

if TYPE_CHECKING:
    from .company_building import BuildingContext

RecipeFn = Callable[["BuildingContext"], None]


def _s(ctx: "BuildingContext", v: float) -> float:
    return round(v * ctx.scale, 3)


def _front(ctx: "BuildingContext") -> float:
    return -ctx.D / 2


def _plaza_y(ctx: "BuildingContext") -> float:
    return _front(ctx) + _s(ctx, 3.5)


def recipe_bridge_complex_echt(ctx: "BuildingContext") -> None:
    """Echt production preset — unified connected masses + bridge links (frozen)."""
    m = ctx.mats
    part = ctx.part
    W, D = ctx.W, ctx.D
    root, col = ctx.root, ctx.col
    front = _front(ctx)
    plaza_y = _plaza_y(ctx)
    site_z = ctx.site_z

    site_composition(
        part,
        "site",
        W,
        D,
        m,
        root,
        col,
        podium_w=W * 0.88,
        podium_d=D * 0.82,
        plaza_w=_s(ctx, 11.5),
        plaza_d=_s(ctx, 4.5),
        plaza_y=plaza_y,
        site_z=site_z,
    )

    pod_w, pod_d = W * 0.78, D * 0.62
    base_z = shared_podium(part, "podium", pod_w, pod_d, site_z, m["cream_dark"], m["charcoal"], root, col, h=0.52, bevel=0.24)

    lx, ly, lw, ld, lh = -13.5, 2.2, 12.5, 11.5, 17.5
    rounded_mass(part, "mass.left", lw, ld, lh, lx, ly, base_z, m["cream"], root, col, bevel=0.38, cid="mass.left")
    face = ly - ld / 2 - 0.08
    toy_window_band(part, "mass.left.win.a", lx - lw * 0.15, face, base_z + 4.5, 3.8, 4.2, m["charcoal"], m["glass"], root, col)
    toy_window_band(part, "mass.left.win.b", lx + lw * 0.2, face, base_z + 10.0, 3.2, 3.6, m["charcoal"], m["glass"], root, col)

    cx, cy, cw, cd, ch = 0.0, 1.5, 12.0, 12.5, 30.0
    rounded_mass(part, "mass.tower", cw, cd, ch, cx, cy, base_z, m["cream"], root, col, bevel=0.42, cid="mass.tower")
    rounded_mass(
        part,
        "mass.tower.crown",
        cw * 0.55,
        cd * 0.48,
        1.6,
        cx,
        cy + 0.5,
        base_z + ch,
        m["brand"],
        root,
        col,
        bevel=0.28,
        cid="mass.tower.crown",
    )
    toy_curtain_wall(
        part,
        "mass.tower.front",
        cx,
        cy - cd / 2 - 0.06,
        base_z + 2.0,
        base_z + ch - 1.5,
        cw * 0.62,
        m["glass"],
        m["charcoal"],
        root,
        col,
        depth=0.42,
        cols=2,
    )
    signage_from_brand(part, "facade", ctx.brand, cx, cy - cd / 2 - 0.32, base_z + 14.0, m["sign"], root, col, s=0.72, d=0.22)

    rx, ry, rw, rd, rh = 13.0, 2.0, 11.0, 10.5, 14.0
    rounded_mass(part, "mass.right", rw, rd, rh, rx, ry, base_z, m["cream"], root, col, bevel=0.36, cid="mass.right")
    toy_window_band(part, "mass.right.win", rx, ry - rd / 2 - 0.08, base_z + 5.0, 3.5, 4.0, m["charcoal"], m["glass"], root, col)
    terrace_garden(part, "terrace.right", rx, ry - rd * 0.08, base_z + rh + 0.65, 5.5, 4.0, m, root, col)

    back_y = cy + cd / 2 + 0.15
    rounded_mass(
        part,
        "mass.rear",
        pod_w * 0.55,
        3.5,
        6.5,
        cx,
        back_y + 1.2,
        base_z,
        m["cream_dark"],
        root,
        col,
        bevel=0.22,
        cid="mass.rear",
    )

    bridge_connector(part, "link.left", -6.5, 1.5, base_z + 9.5, 5.5, 9.0, 2.8, m["cream_dark"], root, col)
    bridge_connector(part, "link.right", 6.5, 1.5, base_z + 8.0, 5.5, 9.0, 2.6, m["cream_dark"], root, col)
    part(f"{ctx.asset_id}.link.front", pod_w * 0.92, 2.2, 1.8, (0, front + 4.8, base_z + 0.9), m["charcoal"], root, col, "link.front", bevel=0.14)

    toy_roof_stack(part, "roof.left", lw + 0.4, ld + 0.3, lx, ly, base_z + lh, m["roof"], m["charcoal"], root, col)
    toy_roof_stack(part, "roof.tower", cw + 0.5, cd + 0.4, cx, cy, base_z + ch + 1.6, m["roof"], m["charcoal"], root, col, lip=0.55)
    toy_roof_stack(part, "roof.right", rw + 0.35, rd + 0.3, rx, ry, base_z + rh, m["roof"], m["charcoal"], root, col)
    for i, (ox, oy) in enumerate(((-1.2, 0.8), (1.0, -0.6))):
        rounded_mass(part, f"roof.unit.{i}", 1.4, 1.4, 1.1, cx + ox * 3, cy + oy * 2, base_z + ch + 2.2, m["charcoal"], root, col, bevel=0.12, cid=f"roof.unit.{i}")

    toy_rooftop_beacon(part, "beacon", cx, cy + 0.3, base_z + ch + 2.8, m["brand"], m["charcoal"], root, col, scale=1.15)
    signage_from_brand(part, "roof", ctx.brand, cx, cy + 0.3, base_z + ch + 5.6, m["sign"], root, col, s=0.58, d=0.18)

    toy_entrance_portal(
        part,
        "entrance",
        0,
        front + 2.0,
        base_z,
        m,
        root,
        col,
        brand=ctx.brand,
        portal_w=13.5,
        portal_h=9.0,
        canopy_w=15.5,
        canopy_d=3.4,
        pier_h=0,
        sign_scale=0.68,
    )

    hero_sculpture_rings(part, "sculpture", -7.5, plaza_y + 0.2, site_z + 0.08, m["brand"], m["charcoal"], root, col, scale=ctx.scale * 0.95)

    stylized_tree(part, "tree.nw", -17.5, 8.5, 0.12, m, root, col, scale=ctx.scale * 0.9)
    stylized_tree(part, "tree.ne", 17.0, 7.8, 0.12, m, root, col, scale=ctx.scale * 0.85)
    stylized_tree(part, "tree.sw", -15.5, -4.0, 0.12, m, root, col, scale=ctx.scale * 0.7)
    stylized_planter(part, "planter.fl", -9.0, front + 2.5, 0.12, 1.0, 1.0, 0.55, m["charcoal"], m["canopy"], root, col)
    stylized_planter(part, "planter.fr", 9.2, front + 2.3, 0.12, 1.0, 1.0, 0.55, m["charcoal"], m["canopy"], root, col)
    stylized_bench(part, "bench", 6.5, plaza_y + 0.4, site_z + 0.08, m["paver"], m["charcoal"], root, col)
    stylized_bike(part, "bike", -4.5, plaza_y - 0.3, site_z + 0.08, m["brand"], m["charcoal"], root, col)
    for i, lx in enumerate((-3.5, 3.2)):
        stylized_lamp(part, f"lamp.{i}", lx, front + 2.6, 0.12, m["charcoal"], m["glow"], root, col)
    for i, bx in enumerate((-12.0, 12.0)):
        stylized_bollard(part, f"bollard.{i}", bx, front + 1.5, site_z + 0.06, m["charcoal"], root, col)

    # Incubator runtime lot is 5 tiles wide — use that for site-car fit, not the wider authoring grid.
    from .vehicle_scale import site_vehicle_fit_for_plot

    car_fit = site_vehicle_fit_for_plot(5.0, W)
    for i, (cx, body, cabin) in enumerate(
        ((-5.5, m["brand"], m["glass"]), (5.8, m["charcoal"], m["glass"]))
    ):
        stylized_site_car(
            part,
            f"cars.car.{i}",
            cx,
            front + 3.8,
            site_z + 0.1,
            body,
            cabin,
            root,
            col,
            fit=car_fit,
            along="y",
        )


from .building_recipes_procedural import (
    recipe_asymmetric_campus_procedural as recipe_asymmetric_campus,
    recipe_bridge_complex_procedural,
    recipe_courtyard_block_procedural as recipe_courtyard_block,
    recipe_hybrid_procedural as recipe_hybrid,
    recipe_pavilion_procedural as recipe_pavilion,
    recipe_sculpture_hq_procedural as recipe_sculpture_hq,
    recipe_stacked_volumes_procedural as recipe_stacked_volumes,
    recipe_stepped_terrace_procedural as recipe_stepped_terrace,
    recipe_tower_campus_procedural as recipe_tower_campus,
    recipe_vertical_landmark_procedural as recipe_vertical_landmark,
)


def recipe_bridge_complex(ctx: "BuildingContext") -> None:
    """Frozen Echt preset OR parametric bridge-linked campus."""
    if ctx.params.get("preset") == "echt_v1":
        recipe_bridge_complex_echt(ctx)
    else:
        recipe_bridge_complex_procedural(ctx)


RECIPE_IDS = (
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
)

RECIPES: dict[str, RecipeFn] = {
    "bridge_complex": recipe_bridge_complex,
    "tower_campus": recipe_tower_campus,
    "stepped_terrace": recipe_stepped_terrace,
    "courtyard_block": recipe_courtyard_block,
    "pavilion": recipe_pavilion,
    "stacked_volumes": recipe_stacked_volumes,
    "asymmetric_campus": recipe_asymmetric_campus,
    "sculpture_hq": recipe_sculpture_hq,
    "vertical_landmark": recipe_vertical_landmark,
    "hybrid": recipe_hybrid,
}
