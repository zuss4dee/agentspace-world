"""Viewport clay colors for the planning map. Not photoreal / not a texture library."""
from __future__ import annotations

import bpy


def clay(name: str, color: tuple, rough=0.78):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        rgba = (*color[:3], 1.0) if len(color) == 3 else color
        b.inputs["Base Color"].default_value = rgba
        b.inputs["Roughness"].default_value = rough
        if "Metallic" in b.inputs:
            b.inputs["Metallic"].default_value = 0.0
    m["asw_materialId"] = name
    return m


def library():
    return {
        "grass": clay("asw.mat.map.grass", (0.42, 0.50, 0.34)),
        "park": clay("asw.mat.map.park", (0.30, 0.46, 0.26)),
        "dirt": clay("asw.mat.map.dirt", (0.46, 0.40, 0.30)),
        "sand": clay("asw.mat.map.sand", (0.70, 0.64, 0.46)),
        "water": clay("asw.mat.map.water", (0.28, 0.42, 0.50), 0.35),
        "plaza": clay("asw.mat.map.plaza", (0.62, 0.60, 0.54)),
        "lot.small": clay("asw.mat.map.lot.small", (0.82, 0.80, 0.72)),
        "lot.medium": clay("asw.mat.map.lot.medium", (0.74, 0.73, 0.66)),
        "lot.large": clay("asw.mat.map.lot.large", (0.66, 0.64, 0.58)),
        "lot.campus": clay("asw.mat.map.lot.campus", (0.58, 0.62, 0.56)),
        "lot.estate": clay("asw.mat.map.lot.estate", (0.50, 0.56, 0.44)),
        "lot.park": clay("asw.mat.map.lot.park", (0.38, 0.50, 0.32)),
        "lot.civic": clay("asw.mat.map.lot.civic", (0.60, 0.62, 0.68)),
        "road.primary": clay("asw.mat.map.road.primary", (0.18, 0.18, 0.17), 0.88),
        "road.secondary": clay("asw.mat.map.road.secondary", (0.22, 0.22, 0.21), 0.88),
        "road.local": clay("asw.mat.map.road.local", (0.26, 0.26, 0.24), 0.88),
        "road.service": clay("asw.mat.map.road.service", (0.30, 0.28, 0.26), 0.88),
        "curb": clay("asw.mat.map.curb", (0.58, 0.56, 0.52)),
        "walk": clay("asw.mat.map.walk", (0.72, 0.70, 0.66)),
        "walk.wide": clay("asw.mat.map.walk.wide", (0.76, 0.74, 0.70)),
        "path": clay("asw.mat.map.path", (0.55, 0.50, 0.40)),
        "mark": clay("asw.mat.map.mark", (0.86, 0.84, 0.76)),
        "bark": clay("asw.mat.map.bark", (0.24, 0.16, 0.10)),
        "canopy": clay("asw.mat.map.canopy", (0.24, 0.38, 0.16)),
        "shrub": clay("asw.mat.map.shrub", (0.22, 0.34, 0.14)),
        "hedge": clay("asw.mat.map.hedge", (0.20, 0.32, 0.14)),
        "bed": clay("asw.mat.map.bed", (0.28, 0.22, 0.12)),
        "metal": clay("asw.mat.map.metal", (0.22, 0.22, 0.22), 0.45),
        "signal": clay("asw.mat.map.signal", (0.16, 0.16, 0.16), 0.4),
        "wood": clay("asw.mat.map.wood", (0.38, 0.26, 0.14)),
        "land": clay("asw.mat.map.land", (0.78, 0.76, 0.68)),
    }
