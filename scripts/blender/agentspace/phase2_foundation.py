"""Phase 2: organise the existing asset library, materials, and export tags.

Does not rebuild, widen, or move land/roads/lots/parks/ocean/trees.
Does not clear the existing library (masters already exist).
"""
from __future__ import annotations

import bpy

from .apply_env_materials import apply_env_materials
from .asset_library import LIBRARY_ORIGIN, _pad, _part, _tag
from .geom import box, cyl, empty, ensure_collection, ico, link
from .pbr_library import ENV_MATS, ensure_env_pbr
from .registry import tag

LIB = "Agentspace_Asset_Library"
MAT_COL = "Agentspace_Materials"
PASS = "phase2"

LIB_CHILDREN = (
    "Asset_Test_Ground",
    "Characters",
    "Avatars",
    "Vehicles",
    "Clothing",
    "Accessories",
    "Street_Lights",
    "Traffic_Lights",
    "Signs",
    "Benches",
    "Parking",
    "Misc",
)

SEMANTIC_MATS = (
    "asw.mat.road.asphalt",
    "asw.mat.road.asphalt.wet",
    "asw.mat.pavement.concrete",
    "asw.mat.pavement.stone",
    "asw.mat.terrain.grass",
    "asw.mat.terrain.soil",
    "asw.mat.water.ocean",
    "asw.mat.metal.dark",
    "asw.mat.metal.paint",
    "asw.mat.wood.bench",
    "asw.mat.glass.standard",
    "asw.mat.road.marking.white",
    "asw.mat.road.marking.yellow",
    "asw.mat.streetlight.metal",
    "asw.mat.trafficlight.housing",
    "asw.mat.signal.red",
    "asw.mat.signal.amber",
    "asw.mat.signal.green",
    "asw.mat.vegetation.canopy",
    "asw.mat.vegetation.bark",
)


def fingerprint():
    names = (
        "Agentspace_World",
        "TerrainCampus",
        "OceanWest",
        "Road_primary_14",
        "Walk_14_1",
        "Curb_14_1",
    )
    out = {}
    for n in names:
        ob = bpy.data.objects.get(n)
        if ob:
            out[n] = (tuple(ob.location), tuple(ob.dimensions))
    lots = sorted((str(o.get("asw_lotId")), tuple(o.location)) for o in bpy.data.objects if o.get("asw_lotId"))
    parks = sorted((o.name, tuple(o.location), tuple(o.dimensions)) for o in bpy.data.objects if o.name.startswith("ParkGrass") and o.type == "MESH")
    trees = sorted((o.name, tuple(o.location)) for o in bpy.data.objects if o.name.startswith("ParkTree_") and o.type == "MESH")
    return {"core": out, "lots": lots, "parks": parks, "trees": trees}


def sanitize_world_instances():
    n = 0
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != "agentspace.world":
            continue
        changed = False
        for key in ("asw_staging", "asw_library", "asw_libraryRoot"):
            if key in ob:
                del ob[key]
                changed = True
        if ob.get("asw_runtimeExport") != 1:
            ob["asw_runtimeExport"] = 1
            changed = True
        if changed:
            n += 1
    return n


def lock_library_export_off():
    col = bpy.data.collections.get(LIB)
    n = 0
    if col:
        for ob in col.all_objects:
            ob["asw_runtimeExport"] = 0
            ob["asw_staging"] = 1
            ob["asw_library"] = 1
            n += 1
    ground = bpy.data.objects.get("Asset_Test_Ground")
    if ground:
        ground["asw_runtimeExport"] = 0
        ground["asw_staging"] = 1
        ground["asw_library"] = 1
    return n


def _ensure_child(lib, name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = ensure_collection(name, lib)
    elif col.name not in {c.name for c in lib.children}:
        lib.children.link(col)
    return col


def reorganize_library():
    scene = bpy.context.scene.collection
    lib = bpy.data.collections.get(LIB) or ensure_collection(LIB, scene)
    cols = {n: _ensure_child(lib, n) for n in LIB_CHILDREN}

    def dest_for(aid: str, kind: str) -> str:
        if aid.startswith("pack.agentspace.character.avatar"):
            return "Avatars"
        if aid.startswith("pack.agentspace.character"):
            return "Characters"
        if aid.startswith("pack.agentspace.vehicle"):
            return "Vehicles"
        if aid.startswith("pack.agentspace.clothing.accessory") or "hair" in aid:
            return "Accessories"
        if aid.startswith("pack.agentspace.clothing"):
            return "Clothing"
        if aid.startswith("pack.agentspace.streetlight"):
            return "Street_Lights"
        if aid.startswith("pack.agentspace.trafficlight"):
            return "Traffic_Lights"
        if aid.startswith("pack.agentspace.bench"):
            return "Benches"
        if "parking" in aid:
            return "Parking"
        if aid.startswith("pack.agentspace.sign") or aid.startswith("pack.agentspace.poster") or aid.startswith("pack.agentspace.billboard") or aid.startswith("pack.agentspace.street.sign"):
            return "Signs"
        if kind == "staging" or aid.startswith("agentspace.staging"):
            return "Asset_Test_Ground"
        return "Misc"

    moved = 0
    for ob in list(lib.all_objects):
        aid = str(ob.get("asw_assetId") or "")
        kind = str(ob.get("asw_kind") or "")
        target = dest_for(aid, kind)
        if ob.name.startswith("Pad_") or ob.name == "Asset_Test_Ground":
            target = "Asset_Test_Ground"
        col = cols[target]
        if col not in ob.users_collection:
            link(ob, col)
            moved += 1
    return {"moved": moved, "children": [c.name for c in lib.children]}


def add_missing_pack_assets():
    """Add only catalog IDs that are not already library roots."""
    existing = {str(o.get("asw_assetId")) for o in bpy.data.objects if o.get("asw_libraryRoot")}
    mats = ensure_env_pbr()
    lib = bpy.data.collections.get(LIB)
    cols = {n: bpy.data.collections[n] for n in LIB_CHILDREN if n in bpy.data.collections}
    ox, oy, oz = LIBRARY_ORIGIN
    root = bpy.data.objects.get("Agentspace_Asset_Library")
    added = []

    def place_root(name, col_name, gx, gy):
        loc = (ox - 48 + gx * 6.0, oy - 28 + gy * 6.0, oz)
        _pad(f"Pad_{name}", (loc[0], loc[1], oz + 0.06), mats["asw.mat.pavement.concrete"], root, cols["Asset_Test_Ground"], name)
        er = empty(name, loc=(loc[0], loc[1], oz + 0.12), parent=root)
        _tag(er, name, f"{name}/root", "library_root", extra={"asw_libraryRoot": 1})
        link(er, cols[col_name])
        return er, loc

    if "pack.agentspace.character.avatar.human.01" not in existing:
        aid = "pack.agentspace.character.avatar.human.01"
        er, loc = place_root(aid, "Avatars", 3, 0)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        skin, cloth = mats["asw.mat.skin.neutral"], mats["asw.mat.terrain.grass"]
        _part(cyl, f"{aid}.legL", 0.12, 0.7, (x - 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.l", kind="character", col=cols["Avatars"])
        _part(cyl, f"{aid}.legR", 0.12, 0.7, (x + 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.r", kind="character", col=cols["Avatars"])
        _part(box, f"{aid}.torso", 0.42, 0.28, 0.62, (x, y, z + 1.05), cloth, er, asset_id=aid, cid=f"{aid}/torso", kind="character", col=cols["Avatars"])
        _part(cyl, f"{aid}.armL", 0.08, 0.55, (x - 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.l", kind="character", col=cols["Avatars"])
        _part(cyl, f"{aid}.armR", 0.08, 0.55, (x + 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.r", kind="character", col=cols["Avatars"])
        _part(ico, f"{aid}.head", 0.18, (x, y, z + 1.52), skin, er, subdiv=0, asset_id=aid, cid=f"{aid}/head", kind="character", col=cols["Avatars"])
        added.append(aid)

    if "pack.agentspace.vehicle.car.suv.01" not in existing:
        aid = "pack.agentspace.vehicle.car.suv.01"
        er, loc = place_root(aid, "Vehicles", 6, 2)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        w, d, h = 4.0, 1.85, 1.55
        body = mats["asw.mat.paint.vehicle"]
        _part(box, f"{aid}.body", w, d, h, (x, y, z + h / 2 + 0.18), body, er, asset_id=aid, cid=f"{aid}/body", kind="vehicle", col=cols["Vehicles"])
        _part(box, f"{aid}.cabin", w * 0.6, d * 0.78, h * 0.5, (x - w * 0.08, y, z + h + 0.12), mats["asw.mat.glass.standard"], er, asset_id=aid, cid=f"{aid}/cabin", kind="vehicle", col=cols["Vehicles"])
        for i, (wx, wy) in enumerate(((-w * 0.32, -d * 0.38), (-w * 0.32, d * 0.38), (w * 0.32, -d * 0.38), (w * 0.32, d * 0.38))):
            _part(cyl, f"{aid}.wheel{i}", 0.2, 0.14, (x + wx, y + wy, z + 0.2), mats["asw.mat.metal.dark"], er, segs=8, asset_id=aid, cid=f"{aid}/wheel/{i}", kind="vehicle", col=cols["Vehicles"])
        added.append(aid)

    if "pack.agentspace.clothing.accessory.hair.01" not in existing:
        aid = "pack.agentspace.clothing.accessory.hair.01"
        er, loc = place_root(aid, "Accessories", 7, 4)
        _part(ico, f"{aid}.mesh", 0.2, (loc[0], loc[1], loc[2] + 0.42), mats["asw.mat.metal.dark"], er, subdiv=0, asset_id=aid, cid=f"{aid}/mesh", kind="clothing", col=cols["Accessories"])
        added.append(aid)

    if "pack.agentspace.street.sign.standard.01" not in existing:
        aid = "pack.agentspace.street.sign.standard.01"
        er, loc = place_root(aid, "Signs", 3, 10)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(cyl, f"{aid}.pole", 0.05, 2.4, (x, y, z + 1.32), mats["asw.mat.metal.dark"], er, segs=6, asset_id=aid, cid=f"{aid}/pole", kind="sign", col=cols["Signs"])
        _part(box, f"{aid}.face", 0.7, 0.04, 0.5, (x, y + 0.06, z + 2.15), mats["asw.mat.pavement.concrete"], er, asset_id=aid, cid=f"{aid}/face", kind="sign", col=cols["Signs"])
        added.append(aid)

    if "pack.agentspace.sign.parking.01" not in existing:
        aid = "pack.agentspace.sign.parking.01"
        er, loc = place_root(aid, "Parking", 6, 8)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(cyl, f"{aid}.pole", 0.05, 2.2, (x, y, z + 1.2), mats["asw.mat.metal.dark"], er, segs=6, asset_id=aid, cid=f"{aid}/pole", kind="sign", col=cols["Parking"])
        _part(box, f"{aid}.face", 0.55, 0.04, 0.55, (x, y + 0.06, z + 2.05), mats["asw.mat.pavement.concrete"], er, asset_id=aid, cid=f"{aid}/face", kind="sign", col=cols["Parking"])
        added.append(aid)

    return added


def build_materials_collection():
    mats = ensure_env_pbr()
    scene = bpy.context.scene.collection
    col = bpy.data.collections.get(MAT_COL) or ensure_collection(MAT_COL, scene)
    ox, oy, oz = LIBRARY_ORIGIN[0], LIBRARY_ORIGIN[1] + 90.0, LIBRARY_ORIGIN[2]
    root = bpy.data.objects.get("Agentspace_Materials")
    if root is None:
        root = empty("Agentspace_Materials", loc=(ox, oy, oz))
        _tag(root, "agentspace.staging", "agentspace.staging/materials", "staging")
        link(root, col)
    created = 0
    for i, mid in enumerate(SEMANTIC_MATS):
        name = f"MatSwatch_{mid}"
        if name in bpy.data.objects:
            continue
        mat = mats.get(mid) or bpy.data.materials.get(mid)
        gx, gy = i % 7, i // 7
        loc = (ox - 18 + gx * 5.0, oy - 8 + gy * 5.0, oz + 0.4)
        ob = box(name, 1.6, 1.6, 0.35, loc, mat, root)
        tag(ob, asset_id="agentspace.staging", component_id=f"agentspace.staging/material/{mid}", kind="staging", runtime=False)
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
        ob["asw_materialId"] = mid
        ob["asw_runtimeExport"] = 0
        link(ob, col)
        created += 1
    for ob in col.all_objects:
        ob["asw_runtimeExport"] = 0
        ob["asw_staging"] = 1
    return created


def run_phase2():
    before = fingerprint()
    sanitized = sanitize_world_instances()
    org = reorganize_library()
    added = add_missing_pack_assets()
    swatches = build_materials_collection()
    locked = lock_library_export_off()
    assigned = apply_env_materials()
    after = fingerprint()
    bpy.context.scene["asw_phase2"] = PASS
    return {
        "sanitizedWorldInstances": sanitized,
        "libraryReorg": org,
        "newPackAssets": added,
        "materialSwatches": swatches,
        "libraryExportOff": locked,
        "materialsAssigned": assigned,
        "geometryLocked": before == after,
        "fingerprint": {k: before["core"][k] for k in before["core"]},
        "buildings": sum(1 for o in bpy.data.objects if o.get("asw_kind") in {"building", "envelope"}),
    }
