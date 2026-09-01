"""Parcel footprints from the world contract. IDs and grid bounds stay authoritative."""
from __future__ import annotations

from .contract import world_xy
from .geom import box, prism


def size_class(w: float, h: float, kind: str) -> str:
    area = w * h
    if kind == "park":
        return "parcel.estate" if area >= 20 else "parcel.large"
    if kind == "civic" and area >= 24:
        return "parcel.campus"
    if area >= 36:
        return "parcel.campus"
    if area >= 18:
        return "parcel.large"
    if area <= 9:
        return "parcel.small"
    return "parcel.medium"


def _h(s: str) -> float:
    n = 2166136261
    for ch in s:
        n ^= ord(ch)
        n = (n * 16777619) & 0xFFFFFFFF
    return n / 4294967296


def lot_touches_road(g, rxs, rys) -> tuple[bool, bool, float]:
    x, y, w, h = g["x"], g["y"], g["w"], g["h"]
    access = False
    corner = False
    frontage = 0.0
    hit_x = hit_y = False
    for rx in rxs:
        if x - 1 <= rx <= x + w:
            hit_x = True
            frontage += h
            access = True
    for ry in rys:
        if y - 1 <= ry <= y + h:
            hit_y = True
            frontage += w
            access = True
    corner = hit_x and hit_y
    return access, corner, frontage


def shape_name(g, corner: bool) -> str:
    w, h = g["w"], g["h"]
    ratio = max(w, h) / max(0.01, min(w, h))
    roll = _h(f"{g['x']}:{g['y']}:{w}:{h}")
    if corner:
        return "corner"
    if ratio >= 2.2:
        return "narrow"
    if min(w, h) >= 3 and max(w, h) >= 6 and roll < 0.28:
        return "l"
    if abs(w - h) <= 1 and roll < 0.42:
        return "square"
    if roll > 0.78 and min(w, h) >= 3:
        return "irregular"
    if roll > 0.52 and min(w, h) >= 4:
        return "block"
    return "rectangle"


def outline_local(g, tile: float, shape: str) -> list[tuple[float, float]]:
    """Local XY outline centered on the lot. Stays inside the contract bounding box."""
    hw, hd = g["w"] * tile * 0.48, g["h"] * tile * 0.48
    if shape == "square":
        s = min(hw, hd)
        return [(-s, -s), (s, -s), (s, s), (-s, s)]
    if shape == "narrow":
        if g["w"] >= g["h"]:
            return [(-hw, -hd * 0.62), (hw, -hd * 0.62), (hw, hd * 0.62), (-hw, hd * 0.62)]
        return [(-hw * 0.62, -hd), (hw * 0.62, -hd), (hw * 0.62, hd), (-hw * 0.62, hd)]
    if shape == "l":
        cut_w, cut_d = hw * 0.42, hd * 0.42
        return [
            (-hw, -hd),
            (hw, -hd),
            (hw, hd - cut_d),
            (hw - cut_w, hd - cut_d),
            (hw - cut_w, hd),
            (-hw, hd),
        ]
    if shape == "irregular":
        k = 0.12
        return [
            (-hw, -hd * 0.92),
            (-hw * 0.2, -hd),
            (hw * 0.85, -hd * (1 - k)),
            (hw, -hd * 0.15),
            (hw * 0.92, hd * 0.88),
            (hw * 0.1, hd),
            (-hw * 0.9, hd * 0.7),
            (-hw, hd * 0.1),
        ]
    if shape == "corner":
        n = min(hw, hd) * 0.28
        return [
            (-hw, -hd),
            (hw, -hd),
            (hw, hd - n),
            (hw - n, hd),
            (-hw, hd),
        ]
    if shape == "block":
        return [(-hw, -hd * 0.94), (hw * 0.94, -hd), (hw, hd * 0.94), (-hw * 0.94, hd)]
    return [(-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)]


def stamp_parcel(ob, p, g, shape, size, access, corner, frontage, zone):
    ob["asw_assetId"] = "agentspace.world"
    ob["asw_parcelId"] = p["id"]
    ob["asw_parcelType"] = p["kind"]
    ob["asw_area"] = float(g["w"] * g["h"])
    ob["asw_gridX"] = float(g["x"])
    ob["asw_gridY"] = float(g["y"])
    ob["asw_shape"] = shape
    ob["asw_zone"] = zone
    ob["asw_frontage"] = float(frontage)
    ob["asw_roadAccess"] = 1 if access else 0
    ob["asw_cornerLot"] = 1 if corner else 0
    ob["asw_sizeClass"] = size
    ob["asw_marketTier"] = size
    ob["asw_lotId"] = p["id"]
    ob["asw_plotKind"] = p["kind"]


def _front_road(g, rxs, rys):
    south = g["y"] + g["h"]
    north = g["y"]
    east = g["x"] + g["w"]
    west = g["x"]
    if south in rys or (south - 1) in rys:
        return "s"
    if north - 1 in rys or north in rys:
        return "n"
    if east in rxs or (east - 1) in rxs:
        return "e"
    if west - 1 in rxs or west in rxs:
        return "w"
    return "s"


def build_parcels(c, mats, groups, cols, put, kw):
    tile = c["tile"]
    rxs, rys = c["roadXs"], c["roadYs"]
    for p in c["lots"]:
        g, wld = p["grid"], p["world"]
        access, corner, frontage = lot_touches_road(g, rxs, rys)
        size = size_class(g["w"], g["h"], p["kind"])
        shape = shape_name(g, corner)
        zone = next((d["id"] for d in c["districts"] if d["id"] == p.get("districtId")), p.get("districtId") or "campus")
        mat_key = {
            "parcel.small": "lot.small",
            "parcel.medium": "lot.medium",
            "parcel.large": "lot.large",
            "parcel.campus": "lot.campus",
            "parcel.estate": "lot.estate",
        }.get(size, "lot.medium")
        if p["kind"] == "park":
            mat_key = "lot.park"
        elif p["kind"] == "civic":
            mat_key = "lot.civic"
        loc = (wld["x"], wld["y"], 0.12)
        outline = outline_local(g, tile, shape)
        ob = prism(
            p["id"],
            outline,
            0.1,
            loc,
            mats[mat_key],
            groups["Lots"],
            **kw("lot", p["id"], origin=(g["x"], g["y"]), size=(g["w"], g["h"])),
        )
        stamp_parcel(ob, p, g, shape, size, access, corner, frontage, zone)
        put("Lots", ob)
        if not access or size not in {"parcel.medium", "parcel.large", "parcel.campus", "parcel.estate"}:
            continue
        if g["w"] * g["h"] < 8:
            continue
        side = _front_road(g, rxs, rys)
        if side == "s":
            gx, gy = g["x"] + g["w"] / 2, g["y"] + g["h"] + 0.12
            dw, dd = min(7.0, g["w"] * tile * 0.28), 2.8
        elif side == "n":
            gx, gy = g["x"] + g["w"] / 2, g["y"] - 0.12
            dw, dd = min(7.0, g["w"] * tile * 0.28), 2.8
        elif side == "e":
            gx, gy = g["x"] + g["w"] + 0.12, g["y"] + g["h"] / 2
            dw, dd = 2.8, min(7.0, g["h"] * tile * 0.28)
        else:
            gx, gy = g["x"] - 0.12, g["y"] + g["h"] / 2
            dw, dd = 2.8, min(7.0, g["h"] * tile * 0.28)
        dx, dy = world_xy(gx, gy, c["grid"], tile)
        drv = box(
            f"{p['id']}_drive",
            dw,
            dd,
            0.08,
            (dx, dy, 0.08),
            mats["road.service"],
            groups["Driveways"],
            **kw("road", f"{p['id']}/driveway"),
        )
        drv["asw_drivewayOf"] = p["id"]
        put("Driveways", drv)
        if size in {"parcel.large", "parcel.campus", "parcel.estate"}:
            if side in {"s", "n"}:
                px, py = gx, gy + (-0.22 if side == "s" else 0.22)
                pw, pd = dw * 1.8, 3.4
            else:
                px, py = gx + (-0.22 if side == "e" else 0.22), gy
                pw, pd = 3.4, dd * 1.8
            parkx, parky = world_xy(px, py, c["grid"], tile)
            bay = box(
                f"{p['id']}_parking",
                pw,
                pd,
                0.07,
                (parkx, parky, 0.07),
                mats["road.local"],
                groups["Driveways"],
                **kw("road", f"{p['id']}/parking"),
            )
            bay["asw_drivewayOf"] = p["id"]
            put("Driveways", bay)
