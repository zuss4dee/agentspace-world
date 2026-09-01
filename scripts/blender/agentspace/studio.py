"""Echt Studio architecture — local space, origin at footprint centre."""
from __future__ import annotations

import math

import bpy

from .contract import building_height
from .geom import box, cyl, link
from .registry import tag

TILE = 32.0
TILES_W, TILES_H = 4, 3
LOT_W, LOT_D = TILES_W * TILE, TILES_H * TILE
BODY_W = LOT_W * 0.80
BODY_D = LOT_D * 0.74
HEIGHT = building_height(48)
FLOORS = 4
STOREY = HEIGHT / FLOORS
SLAB = 0.38
WALL_T = 0.70
GLASS_T = 0.06
MULL = 0.20
REVEAL = 0.55
ASSET = "pack.northshore.building.studio.loft"


def cid(kind: str, name: str) -> str:
    return f"{ASSET}/{kind}/{name}"


def kw(kind: str, name: str):
    return dict(asset_id=ASSET, component_id=cid(kind, name), kind=kind, runtime=True)


def build_studio(parent, mats, col):
    plaster = mats["asw.mat.concrete.plaster"]
    olive = mats["asw.mat.concrete.olive"]
    conc = mats["asw.mat.concrete.structural"]
    floor = mats["asw.mat.concrete.floor"]
    glass = mats["asw.mat.glass.vision"]
    glow = mats["asw.mat.glass.warm"]
    dark = mats["asw.mat.metal.mullion"]
    metal = mats["asw.mat.metal.panel"]
    gravel = mats["asw.mat.roof.membrane"]
    accent = mats["asw.mat.accent.brand"]
    wood = mats["asw.mat.wood.furniture"]
    fabric = mats["asw.mat.fabric.seating"]
    ceil = mats["asw.mat.light.warm"]
    sign_m = mats["asw.mat.sign.letter"]

    def B(name, w, d, h, loc, mat, kind, bevel=0.06):
        ob = box(name, w, d, h, loc, mat, parent, bevel=bevel, **kw(kind, name))
        link(ob, col)
        return ob

    def C(name, r, h, loc, mat, kind, segs=16):
        ob = cyl(name, r, h, loc, mat, parent, segs=segs, **kw(kind, name))
        link(ob, col)
        return ob

    plinth_h = 1.35
    B("Plinth", BODY_W + 1.8, BODY_D + 1.6, plinth_h, (0, 0, plinth_h / 2), conc, "building", 0.18)
    B("PlinthReveal", BODY_W + 1.4, BODY_D + 1.2, 0.08, (0, 0, plinth_h + 0.02), dark, "building", 0.02)

    bar_w = BODY_W * 0.32
    hall_w = BODY_W * 0.66
    bar_x = -BODY_W / 2 + bar_w / 2
    hall_x = BODY_W / 2 - hall_w / 2
    z0 = plinth_h
    hall_h = HEIGHT * 0.84
    bar_h = HEIGHT * 0.97
    hall_d = BODY_D * 0.94
    bar_d = BODY_D * 0.98
    hall_y = -1.1

    B("ServiceBar", bar_w, bar_d, bar_h, (bar_x, 0, z0 + bar_h / 2), olive, "facade", 0.18)
    B("BarShadowGap", 0.18, bar_d * 0.98, bar_h * 0.98, (bar_x + bar_w / 2 + 0.08, 0, z0 + bar_h / 2), dark, "facade", 0)
    B("BarCap", bar_w + 0.7, bar_d + 0.7, 0.28, (bar_x, 0, z0 + bar_h + 0.16), metal, "roof", 0.05)
    B("BarCoping", bar_w + 0.95, bar_d + 0.95, 0.1, (bar_x, 0, z0 + bar_h + 0.34), dark, "roof", 0.02)

    win_w, win_h, recess = 5.1, 4.2, 0.42
    for k in range(FLOORS):
        z = z0 + STOREY * (k + 0.48)
        sill_z = z - win_h / 2 - 0.12
        for yi in range(2):
            y = -bar_d * 0.22 + yi * bar_d * 0.44
            B(f"BarNRecess{k}{yi}", win_w + 0.55, recess, win_h + 0.7, (bar_x, bar_d / 2 - recess / 2, z), dark, "window", 0.02)
            B(f"BarNFrame{k}{yi}", win_w + 0.22, 0.12, win_h + 0.22, (bar_x, bar_d / 2 - recess - 0.04, z), metal, "window", 0.03)
            B(f"BarNGlass{k}{yi}", win_w, 0.05, win_h, (bar_x, bar_d / 2 - recess - 0.12, z), glow if k % 2 == 0 else glass, "window", 0)
            B(f"BarNSill{k}{yi}", win_w + 0.7, 0.38, 0.1, (bar_x, bar_d / 2 - 0.08, sill_z), conc, "window", 0.03)
        B(f"BarWRecess{k}", recess, win_w * 0.72, win_h + 0.55, (bar_x - bar_w / 2 + recess / 2, 0, z), dark, "window", 0.02)
        B(f"BarWFrame{k}", 0.12, win_w * 0.66, win_h + 0.18, (bar_x - bar_w / 2 + recess + 0.04, 0, z), metal, "window", 0.03)
        B(f"BarWGlass{k}", 0.05, win_w * 0.60, win_h, (bar_x - bar_w / 2 + recess + 0.12, 0, z), glass, "window", 0)

    north_y = hall_y + hall_d / 2 - WALL_T / 2
    south_y = hall_y - hall_d / 2 + REVEAL
    B("HallNorth", hall_w, WALL_T, hall_h, (hall_x, north_y, z0 + hall_h / 2), plaster, "facade", 0.1)
    B("HallWest", WALL_T, hall_d - 1.2, hall_h, (hall_x - hall_w / 2 + WALL_T / 2, hall_y, z0 + hall_h / 2), plaster, "facade", 0.1)
    B("HallEastHead", WALL_T, hall_d * 0.92, 1.85, (hall_x + hall_w / 2 - WALL_T / 2, hall_y, z0 + hall_h - 0.92), plaster, "facade", 0.08)
    B("HallEastSill", WALL_T, hall_d * 0.92, 1.25, (hall_x + hall_w / 2 - WALL_T / 2, hall_y, z0 + 0.62), plaster, "facade", 0.06)
    B("HallEastJambN", WALL_T, 0.55, hall_h, (hall_x + hall_w / 2 - WALL_T / 2, hall_y + hall_d * 0.42, z0 + hall_h / 2), plaster, "facade", 0.06)
    B("HallEastJambS", WALL_T, 0.55, hall_h, (hall_x + hall_w / 2 - WALL_T / 2, hall_y - hall_d * 0.42, z0 + hall_h / 2), plaster, "facade", 0.06)

    inner_w = hall_w - WALL_T * 2 - 0.5
    inner_d = hall_d - REVEAL - WALL_T - 0.7
    for i in range(FLOORS):
        z = z0 + i * STOREY + SLAB / 2
        B(f"Slab{i}", inner_w, inner_d, SLAB, (hall_x, hall_y + 0.15, z), floor if i else conc, "floor", 0.03)
        if i > 0:
            B(f"Soffit{i}", inner_w * 0.9, inner_d * 0.42, 0.08, (hall_x, hall_y - 2.2, z + STOREY * 0.46), ceil, "lighting", 0)

    roof_z = z0 + hall_h
    B("RoofDeck", hall_w - 0.9, hall_d - 0.9, 0.22, (hall_x, hall_y, roof_z + 0.12), gravel, "roof", 0.03)
    B("RoofGravel", hall_w - 2.4, hall_d - 2.4, 0.08, (hall_x, hall_y, roof_z + 0.28), gravel, "roof", 0.02)
    ph = 1.55
    pw, pd = hall_w, hall_d
    B("ParaS", pw, 0.22, ph, (hall_x, hall_y - pd / 2 + 0.11, roof_z + ph / 2), plaster, "roof", 0.04)
    B("ParaN", pw, 0.22, ph, (hall_x, hall_y + pd / 2 - 0.11, roof_z + ph / 2), plaster, "roof", 0.04)
    B("ParaE", 0.22, pd, ph, (hall_x + pw / 2 - 0.11, hall_y, roof_z + ph / 2), plaster, "roof", 0.04)
    B("ParaW", 0.22, pd, ph, (hall_x - pw / 2 + 0.11, hall_y, roof_z + ph / 2), plaster, "roof", 0.04)
    B("CopingS", pw + 0.16, 0.32, 0.08, (hall_x, hall_y - pd / 2 + 0.11, roof_z + ph + 0.04), metal, "roof", 0.02)
    B("CopingN", pw + 0.16, 0.32, 0.08, (hall_x, hall_y + pd / 2 - 0.11, roof_z + ph + 0.04), metal, "roof", 0.02)
    B("FlashS", pw, 0.06, 0.12, (hall_x, hall_y - pd / 2 + 0.28, roof_z + 0.08), dark, "roof", 0)
    B("HVAC", 8.2, 4.8, 3.0, (hall_x + 14, hall_y + 7, roof_z + 1.7), metal, "roof", 0.1)
    B("HVACBase", 8.8, 5.4, 0.22, (hall_x + 14, hall_y + 7, roof_z + 0.32), dark, "roof", 0.03)
    for i in range(7):
        B(f"Louver{i}", 7.6, 0.07, 0.22, (hall_x + 14, hall_y + 7 + 2.45, roof_z + 0.65 + i * 0.36), dark, "roof", 0)
    B("HVAC2", 5.6, 3.8, 2.1, (hall_x - 10, hall_y - 6, roof_z + 1.2), metal, "roof", 0.08)
    C("Vent", 0.72, 1.35, (hall_x + 4, hall_y + 9, roof_z + 0.9), metal, "roof", 18)
    C("VentCap", 0.9, 0.12, (hall_x + 4, hall_y + 9, roof_z + 1.62), dark, "roof", 18)
    B("Scupper0", 0.55, 0.18, 0.22, (hall_x + 8, hall_y - pd / 2 + 0.05, roof_z + 0.35), dark, "roof", 0.02)
    B("Scupper1", 0.55, 0.18, 0.22, (hall_x - 8, hall_y - pd / 2 + 0.05, roof_z + 0.35), dark, "roof", 0.02)

    pane_w = hall_w - 2.4
    pane_h = hall_h - 2.55
    glass_y = south_y
    B("SouthGlass", pane_w, GLASS_T, pane_h, (hall_x, glass_y + 0.08, z0 + 1.35 + pane_h / 2), glass, "window", 0)
    cols_n, rows = 7, FLOORS
    for i in range(cols_n + 1):
        x = hall_x - pane_w / 2 + i * (pane_w / cols_n)
        B(f"MullV{i}", MULL, 0.16, pane_h + 0.2, (x, glass_y - 0.02, z0 + 1.35 + pane_h / 2), dark, "facade", 0.02)
        B(f"MullVFin{i}", 0.08, 0.38, pane_h + 0.1, (x, glass_y + 0.22, z0 + 1.35 + pane_h / 2), metal, "facade", 0.015)
    for j in range(rows + 1):
        z = z0 + 1.35 + j * (pane_h / rows)
        B(f"MullH{j}", pane_w + 0.16, 0.16, MULL, (hall_x, glass_y - 0.02, z), dark, "facade", 0.02)
        if 0 < j < rows:
            B(f"Spandrel{j}", pane_w - 0.4, 0.1, 0.55, (hall_x, glass_y + 0.14, z), metal, "facade", 0.02)
    B("SouthHead", pane_w + 1.0, 0.62, 1.05, (hall_x, glass_y + 0.22, z0 + hall_h - 0.62), plaster, "facade", 0.07)
    B("SouthSill", pane_w + 1.0, 0.85, 0.22, (hall_x, glass_y + 0.18, z0 + 0.72), conc, "facade", 0.05)
    B("SouthSillNose", pane_w + 1.1, 0.22, 0.08, (hall_x, glass_y - 0.18, z0 + 0.62), conc, "facade", 0.02)

    east_x = hall_x + hall_w / 2 - REVEAL
    e_d = hall_d * 0.78
    e_h = pane_h * 0.9
    B("EastGlass", GLASS_T, e_d, e_h, (east_x - 0.06, hall_y, z0 + 1.5 + e_h / 2), glass, "window", 0)
    for i in range(6):
        y = hall_y - e_d / 2 + i * (e_d / 5)
        B(f"EastMull{i}", 0.14, MULL, e_h, (east_x + 0.04, y, z0 + 1.5 + e_h / 2), dark, "facade", 0.02)
        B(f"EastMullFin{i}", 0.36, 0.08, e_h, (east_x - 0.18, y, z0 + 1.5 + e_h / 2), metal, "facade", 0.015)

    door_x = hall_x - 7.2
    B("Reveal", 10.2, 2.6, 8.8, (door_x, glass_y + 1.25, z0 + 4.5), plaster, "door", 0.08)
    B("DoorThreshold", 6.6, 0.55, 0.12, (door_x, glass_y - 0.05, z0 + 0.18), conc, "door", 0.03)
    B("DoorL", 2.45, 0.08, 6.5, (door_x - 1.4, glass_y + 0.08, z0 + 3.55), glass, "door", 0)
    B("DoorR", 2.45, 0.08, 6.5, (door_x + 1.4, glass_y + 0.08, z0 + 3.55), glass, "door", 0)
    B("DoorTransom", 5.5, 0.08, 0.9, (door_x, glass_y + 0.08, z0 + 7.15), glass, "door", 0)
    B("DoorFrame", 6.5, 0.18, 7.4, (door_x, glass_y + 0.28, z0 + 3.85), dark, "door", 0.035)
    B("DoorMull", 0.12, 0.14, 6.5, (door_x, glass_y + 0.02, z0 + 3.55), dark, "door", 0)
    B("KickL", 2.45, 0.09, 0.28, (door_x - 1.4, glass_y + 0.02, z0 + 0.45), metal, "door", 0.02)
    B("KickR", 2.45, 0.09, 0.28, (door_x + 1.4, glass_y + 0.02, z0 + 0.45), metal, "door", 0.02)
    B("Pull", 0.06, 0.08, 1.35, (door_x + 0.42, glass_y - 0.28, z0 + 3.35), accent, "door", 0.01)
    B("PullBack", 0.06, 0.08, 1.35, (door_x - 0.42, glass_y - 0.28, z0 + 3.35), metal, "door", 0.01)
    canopy_d = 8.2
    B("Canopy", 11.2, canopy_d, 0.22, (door_x, glass_y - canopy_d / 2 + 0.5, z0 + 8.35), metal, "canopy", 0.06)
    B("CanopyFascia", 11.4, 0.12, 0.42, (door_x, glass_y - canopy_d + 0.56, z0 + 8.18), dark, "canopy", 0.03)
    B("CanopyDrip", 11.2, 0.06, 0.08, (door_x, glass_y - canopy_d + 0.52, z0 + 7.95), dark, "canopy", 0)
    B("CanopyLight", 9.6, canopy_d * 0.62, 0.05, (door_x, glass_y - canopy_d / 2 + 0.5, z0 + 8.12), ceil, "lighting", 0)
    for i in range(4):
        B(f"CanopyRib{i}", 0.08, canopy_d * 0.85, 0.1, (door_x - 3.6 + i * 2.4, glass_y - canopy_d / 2 + 0.5, z0 + 8.22), dark, "canopy", 0)
    for s in (-1, 1):
        C(f"Col{s}", 0.18, z0 + 8.1, (door_x + s * 4.6, glass_y - canopy_d + 1.35, (z0 + 8.1) / 2), metal, "canopy", 20)
        C(f"ColBase{s}", 0.32, 0.16, (door_x + s * 4.6, glass_y - canopy_d + 1.35, 0.2), dark, "canopy", 16)
    for i, (dd, zz) in enumerate(((9.4, 0.16), (8.2, 0.16), (7.0, 0.16))):
        B(f"Step{i}", 9.4, dd, 0.16, (door_x, glass_y - 0.9 - i * 0.48, 0.22 + i * 0.16), conc, "building", 0.03)
    B("StepNosing", 9.5, 0.12, 0.04, (door_x, glass_y - 0.55, 0.32), conc, "building", 0.01)

    for i in range(FLOORS):
        z = z0 + i * STOREY + SLAB + 0.55
        for n, dx in enumerate((-10, -2, 7)):
            B(f"Desk{i}{n}", 5.4, 1.55, 0.08, (hall_x + dx, hall_y - 5.0, z + 0.82), wood, "interior", 0.025)
            B(f"DeskLeg{i}{n}a", 0.1, 1.35, 0.82, (hall_x + dx - 2.3, hall_y - 5.0, z + 0.4), dark, "interior", 0)
            B(f"DeskLeg{i}{n}b", 0.1, 1.35, 0.82, (hall_x + dx + 2.3, hall_y - 5.0, z + 0.4), dark, "interior", 0)
            B(f"Chair{i}{n}", 1.05, 1.05, 1.05, (hall_x + dx, hall_y - 6.7, z + 0.52), fabric, "interior", 0.08)
        B(f"Mood{i}", 0.12, 11.0, STOREY * 0.5, (hall_x, north_y - 0.5, z + STOREY * 0.26), accent, "interior", 0)
        C(f"Pend{i}", 0.48, 0.1, (hall_x, hall_y - 3.2, z0 + (i + 1) * STOREY - 1.05), metal, "lighting", 14)
        B(f"PendGlow{i}", 1.6, 1.6, 0.05, (hall_x, hall_y - 3.2, z0 + (i + 1) * STOREY - 1.16), ceil, "lighting", 0)

    bpy.ops.object.text_add(location=(hall_x + hall_w / 2 + 0.38, hall_y - 4.2, z0 + hall_h * 0.55))
    txt = bpy.context.object
    txt.name = "SignECHT"
    txt.data.body = "ECHT"
    txt.data.size = 3.2
    txt.data.extrude = 0.12
    txt.data.bevel_depth = 0.018
    txt.data.align_x = "CENTER"
    txt.rotation_euler = (math.radians(90), 0, math.radians(90))
    bpy.ops.object.convert(target="MESH")
    txt.parent = parent
    txt.data.materials.append(sign_m)
    tag(txt, **kw("signage", "SignECHT"))
    link(txt, col)
    B("SignBack", 0.14, 2.4, 10.2, (hall_x + hall_w / 2 + 0.16, hall_y - 4.2, z0 + hall_h * 0.55), dark, "signage", 0.03)
    B("Fascia", pane_w * 0.28, 0.1, 0.42, (hall_x - 10, glass_y - 0.14, roof_z - 0.85), accent, "facade", 0.02)

    tag(
        parent,
        asset_id=ASSET,
        component_id=cid("building", "root"),
        kind="building",
        runtime=True,
        grid_origin=(26, 2),
        grid_size=(4, 3),
    )
    return parent
