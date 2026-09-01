"""Placeholder vegetation library. Unique component IDs. Instanced meshes."""
from __future__ import annotations

import math

from .geom import box, cone, cyl, ico, linked_place


def _h(a, b):
    return (math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1.0


def build_veg_library(mats, parent):
    lib = {
        "tree.small": ico("Lib_TreeSmall", 1.05, (0, 0, -90), mats["canopy"], parent, subdiv=0),
        "tree.medium": ico("Lib_TreeMed", 1.7, (0, 0, -90), mats["canopy"], parent, subdiv=1),
        "tree.large": ico("Lib_TreeLarge", 2.45, (0, 0, -90), mats["canopy"], parent, subdiv=1),
        "tree.canopy": ico("Lib_TreeCanopy", 3.2, (0, 0, -90), mats["canopy"], parent, subdiv=1),
        "tree.street": cone("Lib_TreeStreet", 1.15, 2.6, (0, 0, -90), mats["canopy"], parent, segs=8),
        "tree.park": ico("Lib_TreePark", 2.05, (0, 0, -90), mats["canopy"], parent, subdiv=1),
        "shrub": ico("Lib_Shrub", 0.62, (0, 0, -90), mats["shrub"], parent, subdiv=0),
        "hedge": box("Lib_Hedge", 1.6, 0.4, 0.7, (0, 0, -90), mats["hedge"], parent),
        "planting_bed": box("Lib_Bed", 1.4, 0.9, 0.22, (0, 0, -90), mats["bed"], parent),
        "trunk": cyl("Lib_Trunk", 0.22, 2.8, (0, 0, -90), mats["bark"], parent, segs=6),
        "grass_zone": box("Lib_GrassZone", 2.4, 2.4, 0.06, (0, 0, -90), mats["grass"], parent),
    }
    for key, ob in lib.items():
        ob.hide_set(True)
        ob.hide_render = True
        ob.hide_viewport = True
        ob["asw_runtimeExport"] = 0
        ob["asw_vegKind"] = key
    return lib


def veg_kind(scenery_kind: str, gx: float, gy: float, rxs, rys) -> str:
    near_road = min([abs(gx - rx) for rx in rxs] + [abs(gy - ry) for ry in rys], default=9) < 0.85
    if scenery_kind == "hedge":
        return "hedge"
    if scenery_kind == "bush":
        return "shrub"
    if scenery_kind == "flower":
        return "planting_bed"
    if scenery_kind != "tree":
        return "shrub"
    if near_road:
        return "tree.street"
    h = _h(gx, gy)
    if h < 0.18:
        return "tree.small"
    if h < 0.4:
        return "tree.medium"
    if h < 0.55:
        return "tree.park"
    if h < 0.72:
        return "tree.large"
    return "tree.canopy"


def build_vegetation(c, mats, groups, cols, put, kw, lib=None):
    if lib is None:
        lib = build_veg_library(mats, groups["Vegetation"])
    rxs, rys = c["roadXs"], c["roadYs"]
    for s in c["scenery"]:
        kind = s["kind"]
        if kind not in {"tree", "bush", "hedge", "flower"}:
            continue
        wx, wy = s["world"]["x"], s["world"]["y"]
        vk = veg_kind(kind, s.get("x", 0), s.get("y", 0), rxs, rys)
        src = lib[vk]
        h = 1.2 + _h(wx, wy) * 1.8
        diam = 0.75 + _h(wy, wx) * 0.7
        if vk == "tree.street":
            h *= 0.9
            diam *= 0.72
        if vk == "tree.canopy":
            diam *= 1.25
            h *= 0.75
        if vk.startswith("tree"):
            trunk = linked_place(
                lib["trunk"],
                s["id"] + "_trunk",
                (wx, wy, h * 0.35),
                groups["Vegetation"],
                (diam * 0.7, diam * 0.7, h / 2.8),
                **kw("vegetation", f"{vk}/{s['id']}/trunk"),
            )
            put("Vegetation", trunk)
            z_scale = diam * (0.55 if vk == "tree.canopy" else 0.95 if vk == "tree.street" else 0.85 + _h(wx, 3) * 0.3)
            cap = linked_place(
                src,
                s["id"],
                (wx, wy, h * 0.85),
                groups["Vegetation"],
                (diam, diam, z_scale),
                **kw("vegetation", f"{vk}/{s['id']}"),
            )
            cap.rotation_euler.z = _h(wx, wy) * math.tau
            cap["asw_vegKind"] = vk
            put("Vegetation", cap)
        else:
            sc = 0.7 + _h(wx, wy) * 0.6
            ob = linked_place(
                src,
                s["id"],
                (wx, wy, 0.4),
                groups["Vegetation"],
                (sc * (1.4 if vk == "hedge" else 1.0), sc, sc * 0.85),
                **kw("vegetation", f"{vk}/{s['id']}"),
            )
            ob.rotation_euler.z = _h(wy, wx) * math.tau
            ob["asw_vegKind"] = vk
            put("Vegetation", ob)
    return lib
