"""Isolated Agentspace asset library. Never parented to the runtime world."""
from __future__ import annotations

import bpy

from .geom import box, cyl, empty, ensure_collection, ico, link
from .pbr_library import ensure_env_pbr
from .registry import tag

LIBRARY_ORIGIN = (-6000.0, -6000.0, 0.0)
PAD = 6.0
COL_CHILDREN = (
    "Asset_Test_Ground",
    "Characters",
    "Avatars",
    "Vehicles",
    "Clothing",
    "Accessories",
    "AL_Street_Furniture",
    "AL_Lighting",
    "Signs",
    "Misc",
)


def _tag(ob, asset_id, component_id, kind, runtime=False, extra=None):
    tag(ob, asset_id=asset_id, component_id=component_id, kind=kind, runtime=runtime)
    ob["asw_staging"] = 1
    ob["asw_library"] = 1
    if extra:
        for k, v in extra.items():
            ob[k] = v
    return ob


def _clear_library():
    col = bpy.data.collections.get("Agentspace_Asset_Library")
    if col is None:
        return
    for ob in list(col.all_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for child in list(col.children):
        for ob in list(child.all_objects):
            bpy.data.objects.remove(ob, do_unlink=True)


def _pad(name, loc, mat, parent, col, asset_id):
    ob = box(name, 4.2, 4.2, 0.12, loc, mat, parent)
    _tag(ob, "agentspace.staging", f"agentspace.staging/pad/{name}", "staging", extra={"asw_runtimeExport": 0})
    link(ob, col)
    return ob


def _part(fn, *args, asset_id, cid, kind, col, extra=None, **fn_kw):
    ob = fn(*args, **fn_kw)
    _tag(ob, asset_id, cid, kind, extra=extra)
    link(ob, col)
    return ob


def build_asset_library():
    mats = ensure_env_pbr()
    _clear_library()
    scene = bpy.context.scene.collection
    lib = ensure_collection("Agentspace_Asset_Library", scene)
    cols = {n: ensure_collection(n, lib) for n in COL_CHILDREN}
    ox, oy, oz = LIBRARY_ORIGIN
    root = empty("Agentspace_Asset_Library", loc=(ox, oy, oz))
    _tag(root, "agentspace.staging", "agentspace.staging/root", "staging")
    link(root, lib)

    ground = box("Asset_Test_Ground", 120, 80, 0.2, (ox, oy, oz - 0.12), mats["asw.mat.terrain.soil"], root)
    _tag(ground, "agentspace.staging", "agentspace.staging/ground", "staging")
    link(ground, cols["Asset_Test_Ground"])

    catalog = []

    def place_root(name, col_name, gx, gy):
        loc = (ox - 48 + gx * PAD, oy - 28 + gy * PAD, oz)
        _pad(f"Pad_{name}", (loc[0], loc[1], oz + 0.06), mats["asw.mat.pavement.concrete"], root, cols["Asset_Test_Ground"], name)
        er = empty(name, loc=(loc[0], loc[1], oz + 0.12), parent=root)
        _tag(er, name, f"{name}/root", "library_root", extra={"asw_libraryRoot": 1})
        link(er, cols[col_name])
        catalog.append(name)
        return er, loc

    def character(aid, gx, gy, col_name, skin, cloth):
        er, loc = place_root(aid, col_name, gx, gy)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(cyl, f"{aid}.legL", 0.12, 0.7, (x - 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.l", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.legR", 0.12, 0.7, (x + 0.14, y, z + 0.45), mats["asw.mat.cloth.body"], er, segs=8, asset_id=aid, cid=f"{aid}/leg.r", kind="character", col=cols[col_name])
        _part(box, f"{aid}.torso", 0.42, 0.28, 0.62, (x, y, z + 1.05), cloth, er, asset_id=aid, cid=f"{aid}/torso", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.armL", 0.08, 0.55, (x - 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.l", kind="character", col=cols[col_name])
        _part(cyl, f"{aid}.armR", 0.08, 0.55, (x + 0.32, y, z + 1.05), cloth, er, segs=8, asset_id=aid, cid=f"{aid}/arm.r", kind="character", col=cols[col_name])
        _part(ico, f"{aid}.head", 0.18, (x, y, z + 1.52), skin, er, subdiv=0, asset_id=aid, cid=f"{aid}/head", kind="character", col=cols[col_name])
        return er

    character("pack.agentspace.character.agent.human.01", 0, 0, "Characters", mats["asw.mat.skin.neutral"], mats["asw.mat.cloth.body"])
    character("pack.agentspace.character.npc.human.01", 1, 0, "Characters", mats["asw.mat.skin.neutral"], mats["asw.mat.metal.paint"])
    character("pack.agentspace.character.avatar.01", 2, 0, "Avatars", mats["asw.mat.skin.neutral"], mats["asw.mat.terrain.grass"])

    def vehicle(aid, gx, gy, body, w, d, h):
        er, loc = place_root(aid, "Vehicles", gx, gy)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        _part(box, f"{aid}.body", w, d, h, (x, y, z + h / 2 + 0.18), body, er, asset_id=aid, cid=f"{aid}/body", kind="vehicle", col=cols["Vehicles"])
        _part(box, f"{aid}.cabin", w * 0.55, d * 0.72, h * 0.55, (x - w * 0.12, y, z + h + 0.18), mats["asw.mat.glass.standard"], er, asset_id=aid, cid=f"{aid}/cabin", kind="vehicle", col=cols["Vehicles"])
        for i, (wx, wy) in enumerate(((-w * 0.32, -d * 0.38), (-w * 0.32, d * 0.38), (w * 0.32, -d * 0.38), (w * 0.32, d * 0.38))):
            _part(cyl, f"{aid}.wheel{i}", 0.18, 0.12, (x + wx, y + wy, z + 0.18), mats["asw.mat.metal.dark"], er, segs=8, asset_id=aid, cid=f"{aid}/wheel/{i}", kind="vehicle", col=cols["Vehicles"])
        return er

    vehicle("pack.agentspace.vehicle.car.sedan.01", 0, 2, mats["asw.mat.paint.vehicle"], 3.6, 1.6, 1.1)
    vehicle("pack.agentspace.vehicle.car.hatch.01", 1, 2, mats["asw.mat.metal.paint"], 3.2, 1.55, 1.2)
    vehicle("pack.agentspace.vehicle.van.01", 2, 2, mats["asw.mat.metal.paint"], 4.4, 1.9, 1.8)
    vehicle("pack.agentspace.vehicle.truck.01", 3, 2, mats["asw.mat.metal.dark"], 5.2, 2.1, 1.9)
    er, loc = place_root("pack.agentspace.vehicle.emergency.01", "Vehicles", 4, 2)
    x, y, z = loc[0], loc[1], loc[2] + 0.12
    _part(box, "pack.agentspace.vehicle.emergency.01.body", 4.5, 1.9, 1.7, (x, y, z + 1.05), mats["asw.mat.metal.paint"], er, asset_id="pack.agentspace.vehicle.emergency.01", cid="pack.agentspace.vehicle.emergency.01/body", kind="vehicle", col=cols["Vehicles"])
    _part(box, "pack.agentspace.vehicle.emergency.01.bar", 1.4, 1.5, 0.18, (x, y, z + 2.05), mats["asw.mat.signal.red"], er, asset_id="pack.agentspace.vehicle.emergency.01", cid="pack.agentspace.vehicle.emergency.01/lightbar", kind="vehicle", col=cols["Vehicles"])
    er, loc = place_root("pack.agentspace.vehicle.bike.01", "Vehicles", 5, 2)
    x, y, z = loc[0], loc[1], loc[2] + 0.12
    _part(cyl, "pack.agentspace.vehicle.bike.01.w0", 0.28, 0.08, (x - 0.55, y, z + 0.28), mats["asw.mat.metal.dark"], er, segs=8, asset_id="pack.agentspace.vehicle.bike.01", cid="pack.agentspace.vehicle.bike.01/wheel/0", kind="vehicle", col=cols["Vehicles"])
    _part(cyl, "pack.agentspace.vehicle.bike.01.w1", 0.28, 0.08, (x + 0.55, y, z + 0.28), mats["asw.mat.metal.dark"], er, segs=8, asset_id="pack.agentspace.vehicle.bike.01", cid="pack.agentspace.vehicle.bike.01/wheel/1", kind="vehicle", col=cols["Vehicles"])
    _part(box, "pack.agentspace.vehicle.bike.01.frame", 1.1, 0.08, 0.08, (x, y, z + 0.42), mats["asw.mat.metal.paint"], er, asset_id="pack.agentspace.vehicle.bike.01", cid="pack.agentspace.vehicle.bike.01/frame", kind="vehicle", col=cols["Vehicles"])

    clothes = [
        ("pack.agentspace.clothing.shirt.01", "Clothing", 0, 4, (0.42, 0.28, 0.42)),
        ("pack.agentspace.clothing.jacket.01", "Clothing", 1, 4, (0.5, 0.32, 0.55)),
        ("pack.agentspace.clothing.trousers.01", "Clothing", 2, 4, (0.36, 0.24, 0.7)),
        ("pack.agentspace.clothing.dress.01", "Clothing", 3, 4, (0.4, 0.28, 0.85)),
        ("pack.agentspace.clothing.shoes.01", "Clothing", 4, 4, (0.28, 0.18, 0.14)),
        ("pack.agentspace.clothing.hat.01", "Accessories", 5, 4, (0.32, 0.32, 0.14)),
        ("pack.agentspace.clothing.accessory.bag.01", "Accessories", 6, 4, (0.22, 0.12, 0.28)),
    ]
    for aid, col_name, gx, gy, size in clothes:
        er, loc = place_root(aid, col_name, gx, gy)
        _part(box, f"{aid}.mesh", size[0], size[1], size[2], (loc[0], loc[1], loc[2] + 0.2 + size[2] / 2), mats["asw.mat.cloth.body"], er, asset_id=aid, cid=f"{aid}/mesh", kind="clothing", col=cols[col_name])

    def streetlight(aid, gx, gy, ht, arm_len):
        er, loc = place_root(aid, "AL_Lighting", gx, gy)
        x, y, z = loc[0], loc[1], loc[2] + 0.12
        metal = mats["asw.mat.metal.streetlight"]
        _part(cyl, f"{aid}.pole", 0.08, ht, (x, y, z + ht / 2), metal, er, segs=8, asset_id=aid, cid=f"{aid}/pole", kind="street_light", col=cols["AL_Lighting"])
        _part(box, f"{aid}.arm", arm_len, 0.08, 0.08, (x + arm_len / 2, y, z + ht), metal, er, asset_id=aid, cid=f"{aid}/arm", kind="street_light", col=cols["AL_Lighting"])
        _part(box, f"{aid}.fixture", 0.28, 0.22, 0.12, (x + arm_len, y, z + ht - 0.08), metal, er, asset_id=aid, cid=f"{aid}/fixture", kind="street_light", col=cols["AL_Lighting"])
        _part(cyl, f"{aid}.lamp", 0.1, 0.08, (x + arm_len, y, z + ht - 0.16), mats["asw.mat.glass"], er, segs=8, asset_id=aid, cid=f"{aid}/lamp", kind="street_light", col=cols["AL_Lighting"])
        light = bpy.data.objects.new(f"{aid}.light", None)
        light.empty_display_type = "SPHERE"
        light.empty_display_size = 0.15
        light.location = (x + arm_len, y, z + ht - 0.2)
        light.parent = er
        bpy.context.scene.collection.objects.link(light)
        _tag(light, aid, f"{aid}/light", "street_light", extra={"asw_lightRole": "source"})
        link(light, cols["AL_Lighting"])
        return er

    streetlight("pack.agentspace.streetlight.modern.01", 0, 6, 7.2, 1.1)
    streetlight("pack.agentspace.streetlight.park.01", 1, 6, 4.6, 0.55)
    streetlight("pack.agentspace.streetlight.pedestrian.01", 2, 6, 3.8, 0.4)

    aid = "pack.agentspace.trafficlight.standard.01"
    er, loc = place_root(aid, "AL_Lighting", 3, 6)
    x, y, z = loc[0], loc[1], loc[2] + 0.12
    metal = mats["asw.mat.metal.dark"]
    _part(cyl, f"{aid}.pole", 0.08, 4.2, (x, y, z + 2.1), metal, er, segs=8, asset_id=aid, cid=f"{aid}/pole", kind="traffic_light", col=cols["AL_Lighting"])
    _part(box, f"{aid}.arm", 1.1, 0.1, 0.1, (x + 0.55, y, z + 4.05), metal, er, asset_id=aid, cid=f"{aid}/arm", kind="traffic_light", col=cols["AL_Lighting"])
    _part(box, f"{aid}.housing", 0.28, 0.18, 0.85, (x + 1.1, y, z + 3.7), metal, er, asset_id=aid, cid=f"{aid}/housing", kind="traffic_light", col=cols["AL_Lighting"])
    _part(cyl, f"{aid}.red", 0.08, 0.06, (x + 1.22, y, z + 3.95), mats["asw.mat.signal.red"], er, segs=8, asset_id=aid, cid=f"{aid}/red", kind="traffic_light", col=cols["AL_Lighting"], extra={"asw_signal": "red"})
    _part(cyl, f"{aid}.amber", 0.08, 0.06, (x + 1.22, y, z + 3.7), mats["asw.mat.signal.amber"], er, segs=8, asset_id=aid, cid=f"{aid}/amber", kind="traffic_light", col=cols["AL_Lighting"], extra={"asw_signal": "amber"})
    _part(cyl, f"{aid}.green", 0.08, 0.06, (x + 1.22, y, z + 3.45), mats["asw.mat.signal.green"], er, segs=8, asset_id=aid, cid=f"{aid}/green", kind="traffic_light", col=cols["AL_Lighting"], extra={"asw_signal": "green"})
    _part(box, f"{aid}.ped", 0.16, 0.08, 0.28, (x + 0.18, y, z + 1.6), mats["asw.mat.metal.paint"], er, asset_id=aid, cid=f"{aid}/pedestrian_signal", kind="traffic_light", col=cols["AL_Lighting"], extra={"asw_signal": "pedestrian"})

    street = [
        ("pack.agentspace.bench.city.01", "AL_Street_Furniture", 0, 8, lambda er, loc: _part(box, "pack.agentspace.bench.city.01.seat", 1.8, 0.48, 0.42, (loc[0], loc[1], loc[2] + 0.33), mats["asw.mat.wood.bench"], er, asset_id="pack.agentspace.bench.city.01", cid="pack.agentspace.bench.city.01/seat", kind="street_furniture", col=cols["AL_Street_Furniture"])),
        ("pack.agentspace.bin.city.01", "AL_Street_Furniture", 1, 8, lambda er, loc: _part(cyl, "pack.agentspace.bin.city.01.body", 0.22, 0.7, (loc[0], loc[1], loc[2] + 0.47), mats["asw.mat.metal.paint"], er, segs=8, asset_id="pack.agentspace.bin.city.01", cid="pack.agentspace.bin.city.01/body", kind="street_furniture", col=cols["AL_Street_Furniture"])),
        ("pack.agentspace.bollard.city.01", "AL_Street_Furniture", 2, 8, lambda er, loc: _part(cyl, "pack.agentspace.bollard.city.01.body", 0.09, 0.85, (loc[0], loc[1], loc[2] + 0.545), mats["asw.mat.metal.dark"], er, segs=6, asset_id="pack.agentspace.bollard.city.01", cid="pack.agentspace.bollard.city.01/body", kind="street_furniture", col=cols["AL_Street_Furniture"])),
        ("pack.agentspace.barrier.crowd.01", "AL_Street_Furniture", 3, 8, lambda er, loc: _part(box, "pack.agentspace.barrier.crowd.01.body", 1.6, 0.12, 0.7, (loc[0], loc[1], loc[2] + 0.47), mats["asw.mat.metal.paint"], er, asset_id="pack.agentspace.barrier.crowd.01", cid="pack.agentspace.barrier.crowd.01/body", kind="street_furniture", col=cols["AL_Street_Furniture"])),
        ("pack.agentspace.busstop.shelter.01", "AL_Street_Furniture", 4, 8, lambda er, loc: (
            _part(box, "pack.agentspace.busstop.shelter.01.roof", 3.2, 1.1, 0.08, (loc[0], loc[1], loc[2] + 2.35), mats["asw.mat.metal.dark"], er, asset_id="pack.agentspace.busstop.shelter.01", cid="pack.agentspace.busstop.shelter.01/roof", kind="street_furniture", col=cols["AL_Street_Furniture"]),
            _part(box, "pack.agentspace.busstop.shelter.01.panel", 3.0, 0.08, 2.0, (loc[0], loc[1] - 0.45, loc[2] + 1.2), mats["asw.mat.glass.standard"], er, asset_id="pack.agentspace.busstop.shelter.01", cid="pack.agentspace.busstop.shelter.01/panel", kind="street_furniture", col=cols["AL_Street_Furniture"]),
        )),
        ("pack.agentspace.parking.meter.01", "AL_Street_Furniture", 5, 8, lambda er, loc: (
            _part(cyl, "pack.agentspace.parking.meter.01.pole", 0.05, 1.1, (loc[0], loc[1], loc[2] + 0.67), mats["asw.mat.metal.dark"], er, segs=6, asset_id="pack.agentspace.parking.meter.01", cid="pack.agentspace.parking.meter.01/pole", kind="street_furniture", col=cols["AL_Street_Furniture"]),
            _part(box, "pack.agentspace.parking.meter.01.head", 0.18, 0.12, 0.28, (loc[0], loc[1], loc[2] + 1.28), mats["asw.mat.metal.paint"], er, asset_id="pack.agentspace.parking.meter.01", cid="pack.agentspace.parking.meter.01/head", kind="street_furniture", col=cols["AL_Street_Furniture"]),
        )),
        ("pack.agentspace.sign.post.01", "Signs", 0, 10, lambda er, loc: (
            _part(cyl, "pack.agentspace.sign.post.01.pole", 0.05, 2.4, (loc[0], loc[1], loc[2] + 1.32), mats["asw.mat.metal.dark"], er, segs=6, asset_id="pack.agentspace.sign.post.01", cid="pack.agentspace.sign.post.01/pole", kind="sign", col=cols["Signs"]),
            _part(box, "pack.agentspace.sign.post.01.face", 0.7, 0.04, 0.5, (loc[0], loc[1] + 0.06, loc[2] + 2.15), mats["asw.mat.pavement.concrete"], er, asset_id="pack.agentspace.sign.post.01", cid="pack.agentspace.sign.post.01/face", kind="sign", col=cols["Signs"]),
        )),
        ("pack.agentspace.poster.frame.01", "Signs", 1, 10, lambda er, loc: _part(box, "pack.agentspace.poster.frame.01.board", 1.2, 0.06, 1.8, (loc[0], loc[1], loc[2] + 1.05), mats["asw.mat.metal.paint"], er, asset_id="pack.agentspace.poster.frame.01", cid="pack.agentspace.poster.frame.01/board", kind="sign", col=cols["Signs"])),
        ("pack.agentspace.billboard.frame.01", "Signs", 2, 10, lambda er, loc: _part(box, "pack.agentspace.billboard.frame.01.board", 3.6, 0.1, 2.0, (loc[0], loc[1], loc[2] + 2.2), mats["asw.mat.metal.dark"], er, asset_id="pack.agentspace.billboard.frame.01", cid="pack.agentspace.billboard.frame.01/board", kind="sign", col=cols["Signs"])),
        ("pack.agentspace.gutter.strip.01", "Misc", 3, 10, lambda er, loc: _part(box, "pack.agentspace.gutter.strip.01.body", 1.0, 0.22, 0.05, (loc[0], loc[1], loc[2] + 0.15), mats["asw.mat.road.asphalt.wet"], er, asset_id="pack.agentspace.gutter.strip.01", cid="pack.agentspace.gutter.strip.01/body", kind="road", col=cols["Misc"])),
    ]
    for aid, col_name, gx, gy, fn in street:
        er, loc = place_root(aid, col_name, gx, gy)
        fn(er, (loc[0], loc[1], loc[2] + 0.12))

    return {"origin": LIBRARY_ORIGIN, "assets": catalog, "collection": "Agentspace_Asset_Library"}
