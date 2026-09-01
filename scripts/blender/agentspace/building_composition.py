"""Toy-building composition pass — architecture then props from library + vocabulary."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import bpy
from mathutils import Vector

from .library_catalog import DECORATION_SLOTS, LIBRARY_ASSETS, resolve_library_id
from .library_instancer import _asset_footprint_z, instance_library_asset
from .mini_city_style import (
    hero_sculpture_rings,
    stylized_bench,
    stylized_lamp,
    stylized_planter,
    stylized_tree,
)
from .mini_city_style_v2 import orb_sculpture_stack, rooftop_antenna_farm, toy_spire
from .param_rng import ParamRNG

if TYPE_CHECKING:
    from .company_building import BuildingContext


@dataclass
class BuildingAnchors:
    front_y: float
    plaza_y: float
    site_z: float
    entrance: tuple[float, float, float]
    roof_center: tuple[float, float, float]
    roof_z: float
    width: float
    depth: float
    corners: list[tuple[float, float, float]] = field(default_factory=list)


@dataclass
class PropPlan:
    slot: str
    source: str  # library key or procedural id
    location: tuple[float, float, float]
    rotation_z: float = 0.0
    scale: float = 1.0
    kind: str = "landscape"


def _front(ctx: "BuildingContext") -> float:
    return -ctx.D / 2


def _plaza_y(ctx: "BuildingContext") -> float:
    return _front(ctx) + 3.5 * ctx.scale


def measure_anchors(ctx: "BuildingContext") -> BuildingAnchors:
    """Derive placement anchors from authored building meshes."""
    xs, ys, zs = [], [], []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != ctx.asset_id or ob.type != "MESH":
            continue
        kind = str(ob.get("asw_kind") or "")
        if kind in {"landscape", "site"} and "grass" in ob.name.lower():
            continue
        for corner in ob.bound_box:
            loc = ob.matrix_local @ Vector(corner)
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)

    front = _front(ctx)
    plaza = _plaza_y(ctx)
    if xs:
        roof_z = max(zs)
        cx = (min(xs) + max(xs)) / 2
        cy = (min(ys) + max(ys)) / 2
        w = max(xs) - min(xs)
        d = max(ys) - min(ys)
        corners = [
            (min(xs), min(ys), ctx.site_z),
            (max(xs), min(ys), ctx.site_z),
            (min(xs), max(ys), ctx.site_z),
            (max(xs), max(ys), ctx.site_z),
        ]
    else:
        roof_z = 12.0 * ctx.scale
        cx, cy, w, d = 0.0, 0.0, ctx.W, ctx.D
        corners = [
            (-ctx.W / 2, front, ctx.site_z),
            (ctx.W / 2, front, ctx.site_z),
            (-ctx.W / 2, -front, ctx.site_z),
            (ctx.W / 2, -front, ctx.site_z),
        ]

    anchors = ctx.params.get("_anchors") or {}
    ent = ctx.anchors.get("entrance") or anchors.get("entrance") or (cx * 0.15, front + 2.2 * ctx.scale, ctx.site_z)
    roof = ctx.anchors.get("roof_center") or anchors.get("roof_center") or (cx, cy, roof_z)
    if ctx.anchors.get("roof_z") is not None:
        roof_z = float(ctx.anchors["roof_z"])

    return BuildingAnchors(
        front_y=front,
        plaza_y=plaza,
        site_z=ctx.site_z,
        entrance=(float(ent[0]), float(ent[1]), float(ent[2])),
        roof_center=(float(roof[0]), float(roof[1]), float(roof[2])),
        roof_z=float(roof[2]) if len(roof) > 2 else roof_z,
        width=float(w or ctx.W),
        depth=float(d or ctx.D),
        corners=corners,
    )


def _pick(rng: ParamRNG, slot: str, options: tuple[str, ...]) -> str:
    if not options:
        return ""
    return rng.choice(f"comp.{slot}", list(options))


def plan_composition(ctx: "BuildingContext", anchors: BuildingAnchors) -> list[PropPlan]:
    """Deterministic prop plan from seed — intentional focal + secondary tiers."""
    rng = ParamRNG(ctx.seed)
    profile = ctx.params.get("composition_profile") or rng.weighted_choice(
        "comp.profile",
        ["landmark_roof", "plaza_sculpture", "street_buzz", "signage_corner", "roof_garden"],
        [1.2, 1.1, 1.0, 0.9, 0.85],
    )

    plans: list[PropPlan] = []
    slots = DECORATION_SLOTS

    def lib_pick(slot: str) -> str:
        spec = slots[slot]
        key = _pick(rng, f"{slot}.lib", spec["library"])
        return key

    def proc_pick(slot: str) -> str:
        spec = slots[slot]
        return _pick(rng, f"{slot}.proc", spec["procedural"])

    # 1 — focal landmark (one primary personality piece)
    if profile == "landmark_roof":
        src = lib_pick("company_landmark") or proc_pick("rooftop_sculpture") or "hero_rings"
        if src in LIBRARY_ASSETS:
            plans.append(
                PropPlan(
                    "company_landmark",
                    src,
                    (anchors.roof_center[0], anchors.roof_center[1], anchors.roof_z + 0.5),
                    rotation_z=rng.uniform("landmark.rot", -0.2, 0.2),
                    scale=rng.uniform("landmark.scale", 0.55, 0.85),
                    kind="brand",
                )
            )
        else:
            plans.append(
                PropPlan(
                    "rooftop_sculpture",
                    src,
                    (anchors.roof_center[0], anchors.roof_center[1], anchors.roof_z + 0.3),
                    scale=rng.uniform("sculpt.scale", 0.75, 1.05),
                    kind="brand",
                )
            )
    elif profile == "plaza_sculpture":
        src = proc_pick("entrance_sculpture") or lib_pick("entrance_sculpture") or "hero_rings"
        side = rng.uniform("sculpt.side", -1.0, 1.0)
        plans.append(
            PropPlan(
                "entrance_sculpture",
                src,
                (anchors.entrance[0] + side * anchors.width * 0.22, anchors.plaza_y + 0.5, anchors.site_z + 0.08),
                rotation_z=rng.uniform("sculpt.rot", -0.35, 0.35),
                scale=rng.uniform("sculpt.scale", 0.7, 1.0),
                kind="brand",
            )
        )
    elif profile == "signage_corner":
        src = lib_pick("facade_prop") or "sign_post"
        plans.append(
            PropPlan(
                "facade_prop",
                src,
                (anchors.corners[0][0] + 1.2, anchors.front_y + 1.5, anchors.site_z + 0.08),
                rotation_z=0.15,
                scale=0.85,
                kind="signage",
            )
        )
    elif profile == "roof_garden":
        plans.append(
            PropPlan(
                "roof_detail",
                proc_pick("roof_detail") or "antenna",
                (anchors.roof_center[0], anchors.roof_center[1], anchors.roof_z + 0.2),
                scale=0.9,
                kind="roof",
            )
        )
    else:  # street_buzz
        src = lib_pick("street_prop") or "bench"
        plans.append(
            PropPlan(
                "street_prop",
                src,
                (rng.uniform("st.x", -anchors.width * 0.25, anchors.width * 0.25), anchors.plaza_y + 0.4, anchors.site_z + 0.08),
                rotation_z=rng.uniform("st.rot", -0.25, 0.25),
                scale=0.95,
                kind="landscape",
            )
        )

    # 2 — entrance flank (asymmetric pair max 1–2)
    if rng.uniform("ent.flank", 0, 1) > 0.35:
        src = lib_pick("facade_prop") or "poster"
        off = rng.uniform("ent.off", 4.0, 7.5) * (1 if rng.choice("ent.side", ["l", "r"]) == "r" else -1)
        plans.append(
            PropPlan(
                "facade_prop",
                src,
                (anchors.entrance[0] + off, anchors.front_y + 1.8, anchors.site_z + 0.08),
                rotation_z=0.08 * (1 if off > 0 else -1),
                scale=0.75,
                kind="signage",
            )
        )

    # 3 — corner lamp / bollard (one side only — avoid symmetry)
    corner_i = rng.randint("corner.i", 0, 3)
    cx, cy, cz = anchors.corners[corner_i]
    src = lib_pick("corner_prop") or "streetlight_park"
    plans.append(
        PropPlan(
            "corner_prop",
            src,
            (cx + rng.uniform("cx", -0.8, 0.8), cy + rng.uniform("cy", 0.5, 1.5), cz + 0.08),
            rotation_z=rng.uniform("corner.rot", -0.5, 0.5),
            scale=rng.uniform("corner.scale", 0.85, 1.05),
            kind="landscape",
        )
    )

    # 4 — landscaping tier (trees/planters — procedural vocabulary, no mesh duplication)
    tree_n = rng.randint("trees", 1, 2)
    for i in range(tree_n):
        plans.append(
            PropPlan(
                "landscape_prop",
                "tree",
                (
                    rng.uniform(f"tree.{i}.x", -anchors.width * 0.38, anchors.width * 0.38),
                    anchors.plaza_y + rng.uniform(f"tree.{i}.y", -1.0, 2.5),
                    anchors.site_z + 0.1,
                ),
                scale=rng.uniform(f"tree.{i}.s", 0.72, 0.95),
                kind="landscape",
            )
        )
    if rng.uniform("planter", 0, 1) > 0.4:
        plans.append(
            PropPlan(
                "landscape_prop",
                "planter",
                (
                    rng.uniform("planter.x", -anchors.width * 0.2, anchors.width * 0.2),
                    anchors.front_y + 2.0,
                    anchors.site_z + 0.1,
                ),
                scale=0.9,
                kind="landscape",
            )
        )

    # 5 — secondary street prop (opposite side from focal)
    if profile != "street_buzz" and rng.uniform("st2", 0, 1) > 0.45:
        src = _pick(rng, "st2", ("bench", "bike", "bollard", "hydrant"))
        plans.append(
            PropPlan(
                "street_prop",
                src,
                (
                    rng.uniform("st2.x", -anchors.width * 0.32, anchors.width * 0.32),
                    anchors.plaza_y - rng.uniform("st2.y", 0.2, 1.2),
                    anchors.site_z + 0.08,
                ),
                rotation_z=rng.uniform("st2.rot", -0.3, 0.3),
                scale=0.88,
                kind="landscape",
            )
        )

    # 6 — optional roof detail (small, not competing with landmark)
    if profile != "landmark_roof" and anchors.roof_z > 8 and rng.uniform("roofdet", 0, 1) > 0.5:
        src = lib_pick("roof_detail") or "antenna"
        ox = rng.uniform("rd.x", -anchors.width * 0.15, anchors.width * 0.15)
        plans.append(
            PropPlan(
                "roof_detail",
                src,
                (anchors.roof_center[0] + ox, anchors.roof_center[1] + 1.0, anchors.roof_z + 0.15),
                scale=rng.uniform("rd.scale", 0.45, 0.7),
                kind="roof",
            )
        )

    return plans


def _place_procedural(ctx: "BuildingContext", plan: PropPlan, part) -> None:
    m = ctx.mats
    x, y, z = plan.location
    s = plan.scale * ctx.scale
    prefix = f"comp.{plan.slot}"
    if plan.source == "hero_rings":
        hero_sculpture_rings(part, prefix, x, y, z, m["brand"], m["coral"], ctx.root, ctx.col, scale=s)
    elif plan.source == "orb_stack":
        orb_sculpture_stack(part, prefix, x, y, z, m, ctx.root, ctx.col, count=3, scale=s)
    elif plan.source == "tree":
        stylized_tree(part, prefix, x, y, z, m, ctx.root, ctx.col, scale=s)
    elif plan.source == "planter":
        stylized_planter(part, prefix, x, y, z, 1.0 * s, 1.0 * s, 0.55, m["charcoal"], m["canopy"], ctx.root, ctx.col)
    elif plan.source == "bench":
        stylized_bench(part, prefix, x, y, z, m["paver"], m["charcoal"], ctx.root, ctx.col)
    elif plan.source == "lamp":
        stylized_lamp(part, prefix, x, y, z, m["charcoal"], m["glow"], ctx.root, ctx.col)
    elif plan.source == "antenna":
        rooftop_antenna_farm(part, prefix, x, y, z, m["charcoal"], m["coral"], ctx.root, ctx.col, count=2)
    elif plan.source == "spire":
        toy_spire(part, prefix, x, y, z, 2.5 * s, m["charcoal"], m["brand"], ctx.root, ctx.col)


def apply_toy_composition(ctx: "BuildingContext") -> dict[str, Any]:
    """Final composition pass — skip frozen Echt preset."""
    if ctx.params.get("preset") == "echt_v1":
        return {"skipped": True, "reason": "echt_v1 frozen"}

    anchors = measure_anchors(ctx)
    plans = plan_composition(ctx, anchors)
    placed: list[dict[str, Any]] = []

    for i, plan in enumerate(plans):
        cid = f"comp.{plan.slot}.{i}"
        try:
            if plan.source in LIBRARY_ASSETS:
                lib_id = resolve_library_id(plan.source)
                foot_z = _asset_footprint_z(lib_id)
                loc = (plan.location[0], plan.location[1], plan.location[2] - foot_z * plan.scale)
                instance_library_asset(
                    lib_id,
                    ctx.root,
                    ctx.col,
                    building_asset_id=ctx.asset_id,
                    cid_prefix=cid,
                    kind=plan.kind,
                    location=loc,
                    rotation_z=plan.rotation_z,
                    uniform_scale=plan.scale,
                )
                placed.append({"slot": plan.slot, "source": plan.source, "library": lib_id, "loc": loc})
            else:
                _place_procedural(ctx, plan, ctx.part)
                placed.append({"slot": plan.slot, "source": plan.source, "procedural": True, "loc": plan.location})
        except Exception as exc:
            placed.append({"slot": plan.slot, "source": plan.source, "error": str(exc)})

    return {
        "skipped": False,
        "anchors": {
            "front_y": anchors.front_y,
            "plaza_y": anchors.plaza_y,
            "entrance": anchors.entrance,
            "roof_center": anchors.roof_center,
            "roof_z": anchors.roof_z,
        },
        "plans": len(plans),
        "placed": placed,
        "profile": ctx.params.get("composition_profile"),
    }
