"""Additive multitask catalog: extra reusable assets + ASSET_LIBRARY organisation.

Does not clear the existing library. Does not move world geometry.
"""
from __future__ import annotations

import bpy

from .asset_library import LIBRARY_ORIGIN, PAD, _pad, _part, _tag
from .geom import box, cyl, empty, ensure_collection, ico, link
from .pbr_library import ensure_env_pbr

LIB = "Agentspace_Asset_Library"
ALIAS = "ASSET_LIBRARY"


def _cols():
    lib = bpy.data.collections.get(LIB) or ensure_collection(LIB, bpy.context.scene.collection)
    names = (
        "Asset_Test_Ground",
        "Characters",
        "Avatars",
        "Vehicles",
        "Clothing",
        "Accessories",
        "Signs",
        "Benches",
        "Parking",
        "Street_Lights",
        "Traffic_Lights",
        "Misc",
        "AL_Street_Furniture",
        "AL_Traffic",
        "AL_Lighting",
        "AL_Other",
    )
    return {n: (bpy.data.collections.get(n) or ensure_collection(n, lib)) for n in names}


def organise_asset_library():
    """Keep Agentspace_Asset_Library on the scene so objects stay in the view layer.

    ASSET_LIBRARY is a sibling authoring label, not a reparent that would hide
    objects from export selection.
    """
    scene = bpy.context.scene.collection
    alias = bpy.data.collections.get(ALIAS) or ensure_collection(ALIAS, scene)
    lib = bpy.data.collections.get(LIB) or ensure_collection(LIB, scene)
    if lib.name in {c.name for c in alias.children}:
        alias.children.unlink(lib)
    if lib.name not in {c.name for c in scene.children}:
        scene.children.link(lib)
    cols = _cols()
    mapping = {
        "pack.agentspace.bench": "AL_Street_Furniture",
        "pack.agentspace.bin": "AL_Street_Furniture",
        "pack.agentspace.bollard": "AL_Street_Furniture",
        "pack.agentspace.barrier": "AL_Street_Furniture",
        "pack.agentspace.busstop": "AL_Street_Furniture",
        "pack.agentspace.hydrant": "AL_Street_Furniture",
        "pack.agentspace.trafficlight": "AL_Traffic",
        "pack.agentspace.streetlight": "AL_Lighting",
        "pack.agentspace.gutter": "AL_Other",
    }
    moved = 0
    for ob in list(lib.all_objects):
        aid = str(ob.get("asw_assetId") or "")
        target = None
        for prefix, col_name in mapping.items():
            if aid.startswith(prefix):
                target = col_name
                break
        if target:
            col = cols[target]
            if col not in ob.users_collection:
                link(ob, col)
                moved += 1
    for ob in alias.all_objects:
        ob["asw_runtimeExport"] = 0
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
    return {"alias": ALIAS, "moved": moved, "children": [c.name for c in lib.children]}


def _place_root(name, col, gx, gy, mats, root, ground_col):
    ox, oy, oz = LIBRARY_ORIGIN
    loc = (ox - 48 + gx * PAD, oy - 28 + gy * PAD, oz)
    _pad(f"Pad_{name}", (loc[0], loc[1], oz + 0.06), mats["asw.mat.pavement.concrete"], root, ground_col, name)
    er = empty(name, loc=(loc[0], loc[1], oz + 0.12), parent=root)
    _tag(er, name, f"{name}/root", "library_root", extra={"asw_libraryRoot": 1})
    link(er, col)
    return er, loc


def add_multitask_assets():
    existing = {str(o.get("asw_assetId")) for o in bpy.data.objects if o.get("asw_libraryRoot")}
    mats = ensure_env_pbr()
    cols = _cols()
    root = bpy.data.objects.get("Agentspace_Asset_Library")
    added = []

    def need(aid):
        return aid not in existing

    def vehicle(aid, gx, gy, body, w, d, h):
        er, loc = _place_root(aid, cols["Vehicles"], gx, gy, mats, root, cols["Asset_Test_Ground"])
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(box, f"{aid}.body", w, d, h, (x, y, z + h / 2 + 0.18), body, er, asset_id=aid, cid=f"{aid}/body", kind="vehicle", col=cols["Vehicles"])
        _part(box, f"{aid}.cabin", w * 0.5, d * 0.72, h * 0.45, (x - w * 0.12, y, z + h + 0.1), mats["asw.mat.glass.standard"], er, asset_id=aid, cid=f"{aid}/cabin", kind="vehicle", col=cols["Vehicles"])
        for i, (wx, wy) in enumerate(((-w * 0.32, -d * 0.38), (-w * 0.32, d * 0.38), (w * 0.32, -d * 0.38), (w * 0.32, d * 0.38))):
            _part(cyl, f"{aid}.wheel{i}", 0.18, 0.12, (x + wx, y + wy, z + 0.18), mats["asw.mat.metal.dark"], er, segs=8, asset_id=aid, cid=f"{aid}/wheel/{i}", kind="vehicle", col=cols["Vehicles"])
        added.append(aid)

    def character(aid, gx, gy, col_name, skin, cloth):
        er, loc = _place_root(aid, cols[col_name], gx, gy, mats, root, cols["Asset_Test_Ground"])
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(cyl, f"{aid}.legL", 0.12, 0.7, (x - 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.l", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.legR", 0.12, 0.7, (x + 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.r", kind="character", col=cols[col_name])
        _part(box, f"{aid}.torso", 0.42, 0.28, 0.62, (x, y, z + 1.05), cloth, er, asset_id=aid, cid=f"{aid}/torso", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.armL", 0.08, 0.55, (x - 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.l", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.armR", 0.08, 0.55, (x + 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.r", kind="character", col=cols[col_name])
        _part(ico, f"{aid}.head", 0.18, (x, y, z + 1.52), skin, er, subdiv=0, asset_id=aid, cid=f"{aid}/head", kind="character", col=cols[col_name])
        added.append(aid)

    if need("pack.agentspace.vehicle.car.taxi.01"):
        vehicle("pack.agentspace.vehicle.car.taxi.01", 0, 12, mats["asw.mat.road.marking.yellow"], 3.7, 1.65, 1.2)
    if need("pack.agentspace.vehicle.bus.city.01"):
        vehicle("pack.agentspace.vehicle.bus.city.01", 1, 12, mats["asw.mat.metal.paint"], 9.2, 2.4, 2.6)
    if need("pack.agentspace.vehicle.van.delivery.01"):
        vehicle("pack.agentspace.vehicle.van.delivery.01", 2, 12, mats["asw.mat.metal.dark"], 5.0, 2.0, 2.2)
    if need("pack.agentspace.hydrant.city.01"):
        aid = "pack.agentspace.hydrant.city.01"
        er, loc = _place_root(aid, cols["AL_Street_Furniture"], 3, 12, mats, root, cols["Asset_Test_Ground"])
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(cyl, f"{aid}.body", 0.16, 0.55, (x, y, z + 0.4), mats["asw.mat.signal.red"], er, segs=8, asset_id=aid, cid=f"{aid}/body", kind="street_furniture", col=cols["AL_Street_Furniture"])
        _part(cyl, f"{aid}.cap", 0.12, 0.1, (x, y, z + 0.72), mats["asw.mat.metal.dark"], er, segs=8, asset_id=aid, cid=f"{aid}/cap", kind="street_furniture", col=cols["AL_Street_Furniture"])
        added.append(aid)
    if need("pack.agentspace.character.pedestrian.casual.01"):
        character("pack.agentspace.character.pedestrian.casual.01", 0, 14, "Characters", mats["asw.mat.skin.neutral"], mats["asw.mat.cloth.body"])
    if need("pack.agentspace.character.pedestrian.worker.01"):
        character("pack.agentspace.character.pedestrian.worker.01", 1, 14, "Characters", mats["asw.mat.skin.neutral"], mats["asw.mat.road.marking.yellow"])
    if need("pack.agentspace.character.agent.civic.01"):
        character("pack.agentspace.character.agent.civic.01", 2, 14, "Characters", mats["asw.mat.skin.neutral"], mats["asw.mat.metal.paint"])
    if need("pack.agentspace.clothing.accessory.hair.long.01"):
        aid = "pack.agentspace.clothing.accessory.hair.long.01"
        er, loc = _place_root(aid, cols["Accessories"], 4, 12, mats, root, cols["Asset_Test_Ground"])
        _part(ico, f"{aid}.mesh", 0.22, (loc[0], loc[1], loc[2] + 0.4), mats["asw.mat.metal.dark"], er, subdiv=0, asset_id=aid, cid=f"{aid}/mesh", kind="clothing", col=cols["Accessories"])
        added.append(aid)
    if need("pack.agentspace.clothing.uniform.civic.01"):
        aid = "pack.agentspace.clothing.uniform.civic.01"
        er, loc = _place_root(aid, cols["Clothing"], 5, 12, mats, root, cols["Asset_Test_Ground"])
        _part(box, f"{aid}.mesh", 0.46, 0.3, 0.7, (loc[0], loc[1], loc[2] + 0.55), mats["asw.mat.metal.paint"], er, asset_id=aid, cid=f"{aid}/mesh", kind="clothing", col=cols["Clothing"])
        added.append(aid)
    return added


def run_multitask_catalog():
    org = organise_asset_library()
    added = add_multitask_assets()
    org = organise_asset_library()
    return {"organised": org, "added": added}
