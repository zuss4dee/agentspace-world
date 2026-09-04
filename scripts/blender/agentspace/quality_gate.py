"""Visual quality gate — reject stacked-box / blank-facade placeholders."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

import bpy
from mathutils import Vector


def inspect_building(
    asset_id: str,
    *,
    local_meters: dict[str, float] | None = None,
    fingerprint: str | None = None,
    logo_available: bool = False,  # reserved — official logo is validated via logo anchors
) -> dict[str, Any]:
    kinds: dict[str, int] = defaultdict(int)
    structures: list[tuple[float, float, float, float, float, float]] = []
    roofs = 0
    enrich_roofs = 0
    official_logo = 0
    brand_mats = 0
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != asset_id or ob.type != "MESH":
            continue
        kind = str(ob.get("asw_kind") or "building")
        kinds[kind] += 1
        cid = str(ob.get("asw_componentId") or ob.name)
        if "enrich." in cid and ".roof" in cid:
            enrich_roofs += 1
        if kind == "roof" or cid.split("/")[-1].startswith("roof."):
            roofs += 1
        if ob.get("asw_logoOfficial") or kind in {"brand_logo", "signage"}:
            official_logo += 1 if ob.get("asw_logoOfficial") or kind == "brand_logo" else 0
        if kind in {"structure", "building"} and "mass." in cid:
            xs, ys, zs = [], [], []
            for corner in ob.bound_box:
                loc = ob.matrix_local @ Vector(corner)
                xs.append(loc.x)
                ys.append(loc.y)
                zs.append(loc.z)
            if xs:
                structures.append((min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
        for slot in ob.data.materials:
            name = (slot.name if slot else "").lower()
            if "brand" in name or "asw.mat." in name:
                brand_mats += 1

    stacked = _vertical_stack_count(structures)
    windows = kinds.get("window", 0)
    canopies = kinds.get("canopy", 0)
    doors = kinds.get("door", 0)
    landscape = kinds.get("landscape", 0)
    site = kinds.get("site", 0)
    facade = kinds.get("facade", 0)
    signage = kinds.get("signage", 0) + kinds.get("brand", 0) + official_logo
    meshes = sum(kinds.values())

    issues: list[str] = []
    if meshes < 180:
        issues.append(f"too_few_meshes:{meshes}")
    if windows < 24:
        issues.append(f"no_window_rhythm:{windows}")
    if canopies < 1 and doors < 1:
        issues.append("no_entrance")
    if site < 1 and landscape < 4:
        issues.append("no_site")
    if facade < 2 and windows < 40:
        issues.append("blank_facade")
    if stacked >= 3:
        issues.append(f"wedding_cake:{stacked}")
    if enrich_roofs >= 3:
        issues.append(f"duplicate_roofs:{enrich_roofs}")
    if kinds.get("building", 0) > meshes * 0.85 and windows < 10:
        issues.append("placeholder_kinds")
    if signage < 1:
        issues.append("missing_signage")
    if brand_mats < 1:
        issues.append("missing_brand_identity")
    if fingerprint is not None and not str(fingerprint).strip():
        issues.append("missing_fingerprint")

    if local_meters:
        w = float(local_meters.get("w") or 0)
        d = float(local_meters.get("d") or 0)
        h = float(local_meters.get("h") or 0)
        span = max(w, d, 0.01)
        if h > 56.0:
            issues.append(f"disproportionate_height:{h}")
        elif h > span * 2.85 and span < 22.0:
            issues.append(f"disproportionate_height:{h}>{span}")

    return {
        "ok": not issues,
        "issues": issues,
        "kinds": dict(kinds),
        "meshes": meshes,
        "windows": windows,
        "signage": signage,
        "officialLogo": official_logo,
        "stackedMasses": stacked,
        "enrichRoofs": enrich_roofs,
        "roofs": roofs,
        "fingerprint": fingerprint or "",
    }


def _vertical_stack_count(boxes: list[tuple[float, float, float, float, float, float]]) -> int:
    """How many major masses share ~the same XY footprint (wedding-cake test)."""
    if len(boxes) < 3:
        return 0
    best = 1
    for i, a in enumerate(boxes):
        group = 1
        for j, b in enumerate(boxes):
            if i == j:
                continue
            overlap = _xy_overlap(a, b)
            if overlap >= 0.78:
                group += 1
        best = max(best, group)
    return best


def _xy_overlap(a, b) -> float:
    ax0, ax1, ay0, ay1, _, _ = a
    bx0, bx1, by0, by1, _, _ = b
    ix0, ix1 = max(ax0, bx0), min(ax1, bx1)
    iy0, iy1 = max(ay0, by0), min(ay1, by1)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    area_a = max(0.01, (ax1 - ax0) * (ay1 - ay0))
    area_b = max(0.01, (bx1 - bx0) * (by1 - by0))
    return inter / min(area_a, area_b)
