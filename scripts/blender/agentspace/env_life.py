"""Additive street-life on the existing world. Does not move land, roads, or lots."""
from __future__ import annotations

import bpy

from .geom import linked_dup, link
from .registry import tag

LIFE_FLAG = "asw_lifePass"


def _src(aid, suffix):
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") == aid and str(ob.get("asw_componentId", "")).endswith(suffix):
            return ob
    return None


def _place(src, name, loc, parent, col, asset_world_cid, pack_id):
    ob = linked_dup(src, name, loc, parent)
    tag(ob, asset_id="agentspace.world", component_id=asset_world_cid, kind=ob.get("asw_kind") or "street_furniture", runtime=True)
    ob[LIFE_FLAG] = 1
    ob["asw_packId"] = pack_id
    if col:
        link(ob, col)
    return ob


def add_env_life():
    if any(o.get(LIFE_FLAG) for o in bpy.data.objects):
        return {"skipped": True, "added": 0}

    world = bpy.data.objects.get("Agentspace_World")
    furn = bpy.data.objects.get("Street_Furniture")
    roads = bpy.data.objects.get("Roads")
    lighting = bpy.data.objects.get("Lighting")
    col_furn = bpy.data.collections.get("Street_Furniture")
    col_roads = bpy.data.collections.get("Roads")
    col_light = bpy.data.collections.get("Lighting")
    added = 0

    red_src = _src("pack.agentspace.trafficlight.standard.01", "/red")
    amber_src = _src("pack.agentspace.trafficlight.standard.01", "/amber")
    green_src = _src("pack.agentspace.trafficlight.standard.01", "/green")
    ped_src = _src("pack.agentspace.trafficlight.standard.01", "/pedestrian_signal")
    if red_src and amber_src and green_src:
        for head in list(bpy.data.objects):
            if not head.name.startswith("TL_") or not head.name.endswith("_head"):
                continue
            if head.get("asw_staging"):
                continue
            hx, hy, hz = head.matrix_world.translation
            base = head.name.replace("_head", "")
            parent = lighting or world
            for src, suffix, dz in (
                (red_src, "red", 0.22),
                (amber_src, "amber", 0.0),
                (green_src, "green", -0.22),
            ):
                ob = _place(
                    src,
                    f"{base}_{suffix}",
                    (hx, hy, hz + dz),
                    parent,
                    col_light,
                    f"agentspace.world/traffic_light/{base}/{suffix}",
                    "pack.agentspace.trafficlight.standard.01",
                )
                ob["asw_signal"] = suffix
                ob["asw_trafficLightId"] = head.get("asw_trafficLightId") or base
                added += 1
            if ped_src:
                ob = _place(
                    ped_src,
                    f"{base}_ped",
                    (hx, hy, hz - 1.8),
                    parent,
                    col_light,
                    f"agentspace.world/traffic_light/{base}/pedestrian_signal",
                    "pack.agentspace.trafficlight.standard.01",
                )
                ob["asw_signal"] = "pedestrian"
                added += 1

    poster_src = _src("pack.agentspace.poster.frame.01", "/board")
    sign_src = _src("pack.agentspace.sign.post.01", "/face")
    meter_src = _src("pack.agentspace.parking.meter.01", "/head")
    gutter_src = _src("pack.agentspace.gutter.strip.01", "/body")
    parent_f = furn or world

    primaries = [o for o in bpy.data.objects if o.name.startswith("Road_primary_") and o.type == "MESH" and not o.get("asw_staging")]
    for i, road in enumerate(primaries):
        loc = road.matrix_world.translation.copy()
        loc.z = 1.05
        loc.x += 6.0
        if poster_src:
            _place(poster_src, f"PosterFrame_{i}", loc, parent_f, col_furn, f"agentspace.world/sign/poster/{i}", "pack.agentspace.poster.frame.01")
            added += 1
        loc.x -= 12.0
        loc.z = 2.15
        if sign_src and i % 2 == 0:
            _place(sign_src, f"RoadSign_{i}", loc, parent_f, col_furn, f"agentspace.world/sign/post/{i}", "pack.agentspace.sign.post.01")
            added += 1
        if gutter_src:
            g = road.matrix_world.translation.copy()
            g.z = 0.04
            ob = _place(gutter_src, f"Gutter_{i}", g, roads or world, col_roads, f"agentspace.world/road/gutter/{i}", "pack.agentspace.gutter.strip.01")
            ob.scale = (max(road.dimensions.x, road.dimensions.y) * 0.9, 1, 1)
            added += 1

    for i, drv in enumerate(o for o in bpy.data.objects if o.name.endswith("_parking") and o.type == "MESH"):
        if meter_src is None:
            break
        loc = drv.matrix_world.translation.copy()
        loc.z = 1.28
        loc.x += 1.6
        _place(meter_src, f"ParkingMeter_{i}", loc, parent_f, col_furn, f"agentspace.world/parking/meter/{i}", "pack.agentspace.parking.meter.01")
        added += 1
        mark = drv.copy()
        mark.data = drv.data
        mark.name = f"ParkingBayMark_{i}"
        mark.location = drv.location
        mark.location.z = drv.location.z + 0.02
        mark.scale = drv.scale.copy()
        mark.scale.x *= 0.92
        mark.scale.y *= 0.92
        mark.parent = roads or world
        bpy.context.scene.collection.objects.link(mark)
        tag(mark, asset_id="agentspace.world", component_id=f"agentspace.world/road/parking_mark/{i}", kind="road", runtime=True)
        mark[LIFE_FLAG] = 1
        if col_roads:
            link(mark, col_roads)
        added += 1

    return {"skipped": False, "added": added}
