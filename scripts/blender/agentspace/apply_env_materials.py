"""Assign semantic PBR materials to existing world meshes. Does not move geometry."""
from __future__ import annotations

from .pbr_library import ensure_env_pbr


def _assign(ob, mat):
    if ob.type != "MESH" or mat is None:
        return
    if ob.get("asw_staging") or str(ob.get("asw_assetId", "")).startswith("pack.agentspace"):
        return
    data = ob.data
    data.materials.clear()
    data.materials.append(mat)


def ensure_world_uvs(scale: float = 0.05) -> int:
    """World-space XY UVs for meshes that have none. Does not move vertices."""
    import bpy

    n = 0
    seen = set()
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        if ob.get("asw_assetId") != "agentspace.world":
            continue
        me = ob.data
        if me.name in seen:
            continue
        seen.add(me.name)
        if me.uv_layers:
            continue
        uv = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                v = me.vertices[me.loops[li].vertex_index].co
                uv.data[li].uv = (v.x * scale, v.y * scale)
        n += 1
    return n


def apply_env_materials():
    mats = ensure_env_pbr()
    asphalt = mats["asw.mat.road.asphalt"]
    worn = mats["asw.mat.road.asphalt.worn"]
    pavement = mats["asw.mat.pavement.concrete"]
    stone = mats["asw.mat.pavement.stone"]
    grass = mats["asw.mat.terrain.grass"]
    worn_grass = mats["asw.mat.grass.worn"]
    soil = mats["asw.mat.terrain.soil"]
    water = mats["asw.mat.water.ocean"]
    white = mats["asw.mat.road.marking.white"]
    yellow = mats["asw.mat.road.marking.yellow"]
    wood = mats["asw.mat.wood.bench"]
    metal = mats["asw.mat.metal.dark"]
    paint = mats["asw.mat.metal.paint"]
    n = 0
    import bpy

    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        if ob.get("asw_staging") or str(ob.get("asw_assetId", "")).startswith("pack.agentspace"):
            continue
        if ob.name.startswith("Lib_"):
            continue
        name = ob.name
        mat = None
        if name.startswith("Ocean") or name.startswith("Water_"):
            mat = water
        elif name.startswith("TerrainCampus") or name.startswith("ParkGrass") or name.startswith("Verge_"):
            mat = grass
        elif name.startswith("Park_") or name.startswith("PocketPark") or name.startswith("Median_"):
            mat = worn_grass
        elif name.startswith("Shore_") or name.startswith("Coast") or name.startswith("LandPreview"):
            mat = soil
        elif name.startswith("Road_primary") or name.startswith("Jct_") or name.startswith("JctRing") or name.startswith("Turn_"):
            mat = asphalt
        elif name.startswith("Road_"):
            mat = worn
        elif name.startswith("Walk_") or name.startswith("CornerWalk") or name.startswith("PlazaWalk") or name.startswith("ParkPath") or name.startswith("ParkConn"):
            mat = pavement
        elif name.startswith("Curb"):
            mat = stone
        elif name.startswith("Zebra_"):
            mat = white
        elif name.startswith("Lane_"):
            mat = yellow if "primary" in str(ob.get("asw_componentId", "")) else white
        elif name.startswith("Gutter_"):
            mat = mats["asw.mat.road.asphalt.wet"]
        elif name.startswith("ParkTree") or name.startswith("Tree") or "Canopy" in name or name.startswith("Lib_Tree"):
            mat = mats.get("asw.mat.vegetation.canopy")
        elif "Trunk" in name or name.startswith("Lib_Trunk") or "Bark" in name:
            mat = mats.get("asw.mat.vegetation.bark")
        elif name.startswith("ParkShrub") or name.startswith("PocketShrub") or name.startswith("Lib_Shrub") or "Hedge" in name:
            mat = mats.get("asw.mat.vegetation.canopy")
        elif name.startswith("TL_") and name.endswith("_red"):
            mat = mats["asw.mat.signal.red"]
        elif name.startswith("TL_") and name.endswith("_amber"):
            mat = mats["asw.mat.signal.amber"]
        elif name.startswith("TL_") and name.endswith("_green"):
            mat = mats["asw.mat.signal.green"]
        elif name.startswith("TL_") and (name.endswith("_head") or name.endswith("_housing") or name.endswith("_ped")):
            mat = mats.get("asw.mat.trafficlight.housing") or metal
        elif (name.startswith("roadlamp") or name.startswith("lamp-") or name.startswith("ParkLamp")) and "head" in name:
            mat = mats.get("asw.mat.glass") or mats.get("asw.mat.light.warm")
        elif name.startswith("roadlamp") or name.startswith("lamp-") or name.startswith("ParkLamp"):
            mat = mats.get("asw.mat.streetlight.metal") or metal
        elif "Bench" in name:
            mat = wood
        elif name.startswith("TL_") or name.endswith("_post") or name.endswith("_pole") or name.endswith("_arm"):
            mat = mats.get("asw.mat.streetlight.metal") or metal
        elif name.startswith("BusStop") or name.startswith("Bollard") or name.startswith("Barrier") or name.startswith("Bike"):
            mat = paint
        elif name.endswith("_drive") or name.endswith("_parking"):
            mat = worn
        if mat:
            _assign(ob, mat)
            n += 1
    ensure_world_uvs()
    return n
