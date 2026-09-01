"""Reusable miniature-city building vocabulary (stylised diorama / isometric-friendly).

Visual target: docs/BUILDING_VISUAL_STYLE.md (Apple 3D Maps / premium toy-city).

Used by company HQ assets. Keep helpers generic — brand colours and composition
live in the asset builder (e.g. echt_building_canonical).
"""
from __future__ import annotations

PartFn = type("_PartFn", (), {})  # callable shim for type hints


def stylized_tree(part, prefix, x, y, z, mats, parent, col, *, scale=1.0, lean=0.0):
    """Blob tree — stick trunk + rounded canopy (Apple Maps park read)."""
    blob_tree(part, prefix, x, y, z, mats, parent, col, scale=scale, lean=lean)


def blob_tree(part, prefix, x, y, z, mats, parent, col, *, scale=1.0, lean=0.0):
    """Apple Maps blob tree: thin trunk + soft sphere canopy cluster."""
    r = 0.42 * scale
    th = 1.1 * scale
    part(f"{prefix}.trunk", r * 0.22, r * 0.22, th, (x, y, z + th / 2), mats["bark"], parent, col, f"{prefix}.trunk", bevel=0.02)
    part(
        f"{prefix}.canopy",
        r * 2.4,
        r * 2.2,
        r * 2.0,
        (x + lean, y, z + th + r * 0.85),
        mats["canopy"],
        parent,
        col,
        f"{prefix}.canopy",
        bevel=0.35,
    )
    part(
        f"{prefix}.canopy.b",
        r * 1.5,
        r * 1.4,
        r * 1.3,
        (x + lean * 0.6 + r * 0.35, y + r * 0.2, z + th + r * 0.55),
        mats["canopy"],
        parent,
        col,
        f"{prefix}.canopy.b",
        bevel=0.28,
    )


def stylized_shrub(part, prefix, x, y, z, mat, parent, col, *, s=1.0):
    part(
        f"{prefix}.shrub",
        0.72 * s,
        0.72 * s,
        0.62 * s,
        (x, y, z + 0.48 * s),
        mat,
        parent,
        col,
        f"{prefix}.shrub",
        bevel=0.08,
    )
    part(
        f"{prefix}.pot",
        0.55 * s,
        0.55 * s,
        0.32 * s,
        (x, y, z + 0.16 * s),
        mat,
        parent,
        col,
        f"{prefix}.pot",
    )


def stylized_planter(part, prefix, x, y, z, w, d, h, body_mat, plant_mat, parent, col):
    part(f"{prefix}.box", w, d, h * 0.55, (x, y, z + h * 0.28), body_mat, parent, col, f"{prefix}.box", bevel=0.04)
    part(f"{prefix}.soil", w * 0.88, d * 0.88, h * 0.18, (x, y, z + h * 0.62), plant_mat, parent, col, f"{prefix}.soil")
    stylized_shrub(part, f"{prefix}.plant", x, y, z + h * 0.55, plant_mat, parent, col, s=min(w, d) * 0.9)


def stylized_bench(part, prefix, x, y, z, mat_wood, mat_metal, parent, col, *, rot_y=0.0):
    part(f"{prefix}.seat", 1.35, 0.38, 0.12, (x, y, z + 0.42), mat_wood, parent, col, f"{prefix}.seat")
    for i, dx in enumerate((-0.52, 0.52)):
        part(f"{prefix}.leg.{i}", 0.08, 0.08, 0.42, (x + dx, y, z + 0.21), mat_metal, parent, col, f"{prefix}.leg.{i}")


def stylized_lamp(part, prefix, x, y, z, mat_pole, mat_glow, parent, col):
    part(f"{prefix}.pole", 0.14, 0.14, 2.4, (x, y, z + 1.2), mat_pole, parent, col, f"{prefix}.pole")
    part(f"{prefix}.head", 0.32, 0.32, 0.22, (x, y, z + 2.52), mat_pole, parent, col, f"{prefix}.head", bevel=0.03)
    part(f"{prefix}.glow", 0.22, 0.22, 0.08, (x, y - 0.02, z + 2.38), mat_glow, parent, col, f"{prefix}.glow")


def stylized_bike(part, prefix, x, y, z, mat_frame, mat_wheel, parent, col):
    part(f"{prefix}.bar", 0.06, 0.06, 0.7, (x, y, z + 0.55), mat_frame, parent, col, f"{prefix}.bar")
    part(f"{prefix}.frame", 0.9, 0.06, 0.06, (x, y + 0.12, z + 0.38), mat_frame, parent, col, f"{prefix}.frame")
    for i, ox in enumerate((-0.32, 0.32)):
        part(
            f"{prefix}.wheel.{i}",
            0.56,
            0.06,
            0.56,
            (x + ox, y, z + 0.28),
            mat_wheel,
            parent,
            col,
            f"{prefix}.wheel.{i}",
            bevel=0.02,
        )


def lot_ground(part, prefix, w, d, grass_mat, paver_mat, parent, col, *, plaza_w, plaza_d, plaza_y):
    """Grass lot base + warm paver plaza — no grey foundation slab."""
    part(f"{prefix}.grass", w * 0.98, d * 0.98, 0.14, (0, 0, 0.07), grass_mat, parent, col, f"{prefix}.grass")
    part(
        f"{prefix}.plaza",
        plaza_w,
        plaza_d,
        0.1,
        (0, plaza_y, 0.12),
        paver_mat,
        parent,
        col,
        f"{prefix}.plaza",
    )
    # Plaza curb lip — chunky miniature edge
    part(
        f"{prefix}.plaza.lip",
        plaza_w + 0.28,
        0.22,
        0.16,
        (0, plaza_y - plaza_d / 2 - 0.08, 0.14),
        paver_mat,
        parent,
        col,
        f"{prefix}.plaza.lip",
    )


def site_composition(
    part,
    prefix,
    lot_w,
    lot_d,
    mats,
    parent,
    col,
    *,
    podium_w,
    podium_d,
    plaza_w,
    plaza_d,
    plaza_y,
    site_z=0.34,
):
    """Tiered HQ site: grass verge → raised podium → forecourt plaza."""
    # Lot-grade grass
    part(f"{prefix}.grade", lot_w * 0.99, lot_d * 0.99, 0.12, (0, 0, 0.06), mats["grass"], parent, col, f"{prefix}.grade")
    # Perimeter grass berms (setback bands)
    berm = min(lot_w, lot_d) * 0.11
    part(
        f"{prefix}.berm.n",
        lot_w * 0.96,
        berm,
        0.16,
        (0, lot_d / 2 - berm / 2 - 0.08, 0.08),
        mats["grass"],
        parent,
        col,
        f"{prefix}.berm.n",
    )
    part(
        f"{prefix}.berm.s",
        lot_w * 0.96,
        berm,
        0.16,
        (0, -lot_d / 2 + berm / 2 + 0.08, 0.08),
        mats["grass"],
        parent,
        col,
        f"{prefix}.berm.s",
    )
    part(
        f"{prefix}.berm.w",
        berm,
        lot_d * 0.72,
        0.16,
        (-lot_w / 2 + berm / 2 + 0.08, 0.35, 0.08),
        mats["grass"],
        parent,
        col,
        f"{prefix}.berm.w",
    )
    part(
        f"{prefix}.berm.e",
        berm,
        lot_d * 0.72,
        0.16,
        (lot_w / 2 - berm / 2 - 0.08, 0.35, 0.08),
        mats["grass"],
        parent,
        col,
        f"{prefix}.berm.e",
    )
    # Street-facing curb lip
    part(
        f"{prefix}.curb.front",
        lot_w * 0.92,
        0.32,
        0.2,
        (0, -lot_d / 2 + 0.28, 0.1),
        mats["charcoal"],
        parent,
        col,
        f"{prefix}.curb.front",
        bevel=0.04,
    )
    # Raised architectural podium — building sits here
    part(
        f"{prefix}.podium",
        podium_w,
        podium_d,
        site_z,
        (0, 0.55, site_z / 2),
        mats["cream_dark"],
        parent,
        col,
        f"{prefix}.podium",
        bevel=0.06,
    )
    part(
        f"{prefix}.podium.lip",
        podium_w + 0.55,
        podium_d + 0.55,
        0.2,
        (0, 0.55, site_z + 0.1),
        mats["charcoal"],
        parent,
        col,
        f"{prefix}.podium.lip",
        bevel=0.05,
    )
    # Forecourt pavers on podium front
    part(
        f"{prefix}.forecourt",
        plaza_w,
        plaza_d,
        0.14,
        (0, plaza_y, site_z + 0.07),
        mats["paver"],
        parent,
        col,
        f"{prefix}.forecourt",
    )
    part(
        f"{prefix}.forecourt.lip",
        plaza_w + 0.35,
        0.24,
        0.18,
        (0, plaza_y - plaza_d / 2 - 0.06, site_z + 0.06),
        mats["paver"],
        parent,
        col,
        f"{prefix}.forecourt.lip",
    )
    return site_z


def chunky_punched_window(part, prefix, cx, face_y, z, w, h, frame_mat, glass_mat, parent, col, *, depth=0.28):
    part(f"{prefix}.frame", w, depth, h, (cx, face_y, z), frame_mat, parent, col, f"{prefix}.frame", bevel=0.03)
    part(f"{prefix}.glass", w * 0.82, depth * 0.35, h * 0.82, (cx, face_y - depth * 0.22, z), glass_mat, parent, col, f"{prefix}.glass")


def chunky_curtain(part, prefix, cx, face_y, z0, z1, span_w, glass_mat, frame_mat, parent, col, *, depth=0.22, cols=2):
    h = z1 - z0
    part(f"{prefix}.glass", span_w * 0.94, 0.1, h * 0.92, (cx, face_y - 0.12, z0 + h / 2), glass_mat, parent, col, f"{prefix}.glass")
    for i in range(cols + 1):
        x = cx - span_w / 2 + i * span_w / cols
        part(f"{prefix}.mullion.{i}", 0.16, depth, h * 0.94, (x, face_y, z0 + h / 2), frame_mat, parent, col, f"{prefix}.mullion.{i}")


def roof_slab(part, prefix, w, d, x, y, z, roof_mat, lip_mat, parent, col, *, lip=0.38):
    part(f"{prefix}.slab", w, d, 0.42, (x, y, z + 0.21), roof_mat, parent, col, f"{prefix}.slab")
    part(f"{prefix}.lip", w + 0.24, d + 0.24, lip, (x, y, z + 0.42 + lip / 2), lip_mat, parent, col, f"{prefix}.lip", bevel=0.04)


def entrance_hero(
    part,
    prefix,
    x,
    y,
    z,
    mats,
    parent,
    col,
    *,
    canopy_w=10.5,
    canopy_d=2.8,
    pier_h=8.5,
    detail_scale=1.0,
):
    """Oversized stylised entrance — canopy, piers, doors, sign band."""
    ds = detail_scale
    pier_w = 0.72 * ds
    px = canopy_w * 0.38
    for side, sx in (("left", -px), ("right", px)):
        part(
            f"{prefix}.pier.{side}",
            pier_w,
            1.6,
            pier_h,
            (x + sx, y, z + pier_h / 2),
            mats["charcoal"],
            parent,
            col,
            f"{prefix}.pier.{side}",
            bevel=0.06,
        )
        part(
            f"{prefix}.pier.{side}.accent",
            pier_w * 0.28,
            0.12,
            pier_h * 0.65,
            (x + sx + (pier_w * 0.28 if side == "left" else -pier_w * 0.28), y - 0.55, z + pier_h * 0.45),
            mats["brand"],
            parent,
            col,
            f"{prefix}.pier.{side}.accent",
        )

    cz = z + pier_h + 0.55
    part(
        f"{prefix}.canopy",
        canopy_w,
        canopy_d,
        0.72,
        (x, y - 0.35, cz),
        mats["charcoal"],
        parent,
        col,
        f"{prefix}.canopy",
        bevel=0.08,
    )
    part(
        f"{prefix}.canopy.soffit",
        canopy_w * 0.92,
        canopy_d * 0.86,
        0.12,
        (x, y - 0.35, cz - 0.34),
        mats["cream_dark"],
        parent,
        col,
        f"{prefix}.canopy.soffit",
    )
    part(
        f"{prefix}.canopy.brand",
        canopy_w * 0.78,
        0.18,
        0.28,
        (x, y - canopy_d / 2 - 0.06, cz - 0.18),
        mats["coral"],
        parent,
        col,
        f"{prefix}.canopy.brand",
    )
    for i, lx in enumerate((-1.6, 0.0, 1.6)):
        part(
            f"{prefix}.light.{i}",
            0.85,
            0.1,
            0.08,
            (x + lx, y - canopy_d / 2 + 0.12, cz - 0.38),
            mats["glow"],
            parent,
            col,
            f"{prefix}.light.{i}",
        )

    # Recessed portal + chunky doors
    part(f"{prefix}.portal", 6.2 * ds, 1.05 * ds, 6.8 * ds, (x, y + 0.55 * ds, z + 3.6 * ds), mats["cream_dark"], parent, col, f"{prefix}.portal")
    dw, dh = 2.15 * ds, 5.6 * ds
    for i, dx in enumerate((-dw / 2 - 0.06 * ds, dw / 2 + 0.06 * ds)):
        part(
            f"{prefix}.door.{i}",
            dw,
            0.14 * ds,
            dh,
            (x + dx, y + 0.08 * ds, z + 3.2 * ds),
            mats["glass"],
            parent,
            col,
            f"{prefix}.door.{i}" if i else f"{prefix}.door",
        )
    part(f"{prefix}.door.mullion", 0.18 * ds, 0.12 * ds, dh * 0.96, (x, y + 0.02 * ds, z + 3.2 * ds), mats["charcoal"], parent, col, f"{prefix}.door.mullion")

    # Steps
    for i, (sw, sh, sy) in enumerate(((6.8, 0.18, 0.18), (5.8, 0.18, 0.36), (4.9, 0.18, 0.54))):
        part(
            f"{prefix}.step.{i}",
            sw * ds,
            sh * ds,
            0.2 * ds,
            (x, y + sy * ds, z + (0.1 + i * 0.2) * ds),
            mats["paver"],
            parent,
            col,
            f"{prefix}.step.{i}",
        )


def block_sign(part, prefix, text, x, y, z, mat, parent, col, *, s=0.52, t=0.2, d=0.24, gap=0.14):
    glyphs = {
        "E": ((0, 0, t, 1.0), (0, 0.85, 0.72, t), (0, 0.42, 0.58, t), (0, 0, 0.72, t)),
        "C": ((0, 0, t, 1.0), (0, 0.85, 0.72, t), (0, 0, 0.72, t)),
        "H": ((0, 0, t, 1.0), (0.56, 0, t, 1.0), (0, 0.42, 0.72, t)),
        "T": ((0, 0.85, 0.78, t), (0.31, 0, t, 1.0)),
    }
    cursor = 0.0
    for li, ch in enumerate(text):
        for bi, (lx, lz, lw, lh) in enumerate(glyphs[ch]):
            part(
                f"{prefix}.sign.{ch}.{bi}",
                lw * s,
                d,
                lh * s,
                (x + cursor + (lx + lw / 2) * s, y, z + (lz + lh / 2) * s),
                mat,
                parent,
                col,
                f"{prefix}.sign.{ch.lower()}.{li}.{bi}",
            )
        cursor += (0.82 if ch != "T" else 0.78) * s + gap
    return cursor


def hero_sculpture_rings(part, prefix, x, y, z, mat_a, mat_b, parent, col, *, scale=1.0):
    """Landmark interlocking-ring sculpture — reads as abstract E / network node."""
    s = scale
    part(f"{prefix}.base", 2.4 * s, 2.4 * s, 0.28 * s, (x, y, z + 0.14 * s), mat_b, parent, col, f"{prefix}.base")
    part(f"{prefix}.pedestal", 0.65 * s, 0.65 * s, 1.1 * s, (x, y, z + 0.55 * s), mat_b, parent, col, f"{prefix}.pedestal")
    # Three chunky interlocking bars suggesting E + connection
    part(f"{prefix}.ring.a", 0.42 * s, 2.6 * s, 2.6 * s, (x, y, z + 2.0 * s), mat_a, parent, col, f"{prefix}.ring.a", bevel=0.08)
    part(f"{prefix}.ring.b", 2.6 * s, 0.42 * s, 2.6 * s, (x + 0.35 * s, y, z + 2.55 * s), mat_b, parent, col, f"{prefix}.ring.b", bevel=0.08)
    part(f"{prefix}.ring.c", 0.42 * s, 2.6 * s, 1.5 * s, (x - 0.25 * s, y + 0.15 * s, z + 3.35 * s), mat_a, parent, col, f"{prefix}.ring.c", bevel=0.06)
    part(f"{prefix}.cap", 0.55 * s, 0.55 * s, 0.55 * s, (x, y, z + 4.15 * s), mat_b, parent, col, f"{prefix}.cap", bevel=0.05)


def terrace_garden(part, prefix, x, y, z, w, d, mats, parent, col):
    part(f"{prefix}.deck", w, d, 0.16, (x, y, z + 0.08), mats["paver"], parent, col, f"{prefix}.deck")
    stylized_planter(part, f"{prefix}.planter.a", x - w * 0.28, y + d * 0.22, z + 0.16, 0.9, 0.9, 0.55, mats["charcoal"], mats["canopy"], parent, col)
    stylized_planter(part, f"{prefix}.planter.b", x + w * 0.28, y - d * 0.18, z + 0.16, 0.9, 0.9, 0.55, mats["charcoal"], mats["canopy"], parent, col)


# ---------------------------------------------------------------------------
# Toy-city reusable primitives (SiliconCity-style)
# ---------------------------------------------------------------------------


def rounded_mass(part, prefix, w, d, h, x, y, z, mat, parent, col, *, bevel=0.28, cid=None):
    """Chunky bevelled volume — primary building mass primitive."""
    part(prefix, w, d, h, (x, y, z + h / 2), mat, parent, col, cid or prefix, bevel=bevel)


def shared_podium(part, prefix, w, d, z, body_mat, lip_mat, parent, col, *, h=0.48, bevel=0.22):
    """Unified architectural plinth — all masses share this base."""
    part(f"{prefix}.body", w, d, h, (0, 0.4, z + h / 2), body_mat, parent, col, f"{prefix}.body", bevel=bevel)
    part(
        f"{prefix}.lip",
        w + 0.6,
        d + 0.6,
        0.22,
        (0, 0.4, z + h + 0.11),
        lip_mat,
        parent,
        col,
        f"{prefix}.lip",
        bevel=0.08,
    )
    return z + h


def bridge_connector(part, prefix, x, y, z, span_w, span_d, span_h, mat, parent, col):
    """Horizontal link volume physically connecting two masses."""
    part(prefix, span_w, span_d, span_h, (x, y, z + span_h / 2), mat, parent, col, prefix, bevel=min(span_h * 0.25, 0.35))


def toy_window_band(part, prefix, cx, face_y, z, w, h, frame_mat, glass_mat, parent, col, *, depth=0.42, sill=True):
    """Large stylized window group — thick frame, oversized glass, reads at city scale."""
    part(f"{prefix}.frame", w, depth, h, (cx, face_y, z), frame_mat, parent, col, f"{prefix}.frame", bevel=0.06)
    part(
        f"{prefix}.glass",
        w * 0.78,
        depth * 0.28,
        h * 0.78,
        (cx, face_y - depth * 0.32, z),
        glass_mat,
        parent,
        col,
        f"{prefix}.glass",
    )
    if sill:
        part(
            f"{prefix}.sill",
            w * 1.06,
            depth * 0.55,
            h * 0.08,
            (cx, face_y - depth * 0.18, z - h * 0.46),
            frame_mat,
            parent,
            col,
            f"{prefix}.sill",
            bevel=0.03,
        )


def toy_curtain_wall(part, prefix, cx, face_y, z0, z1, span_w, glass_mat, frame_mat, parent, col, *, depth=0.38, cols=2):
    """Oversized curtain wall — few thick mullions, big glass panels."""
    h = z1 - z0
    part(
        f"{prefix}.glass",
        span_w * 0.9,
        depth * 0.35,
        h * 0.88,
        (cx, face_y - depth * 0.28, z0 + h / 2),
        glass_mat,
        parent,
        col,
        f"{prefix}.glass",
    )
    for i in range(cols + 1):
        fx = cx - span_w / 2 + i * span_w / cols
        part(
            f"{prefix}.mullion.{i}",
            0.28,
            depth,
            h * 0.92,
            (fx, face_y, z0 + h / 2),
            frame_mat,
            parent,
            col,
            f"{prefix}.mullion.{i}",
            bevel=0.04,
        )


def toy_roof_stack(part, prefix, w, d, x, y, z, roof_mat, lip_mat, parent, col, *, lip=0.48):
    """Chunky roof slab + parapet lip."""
    part(f"{prefix}.slab", w, d, 0.52, (x, y, z + 0.26), roof_mat, parent, col, f"{prefix}.slab", bevel=0.05)
    part(f"{prefix}.lip", w + 0.32, d + 0.32, lip, (x, y, z + 0.52 + lip / 2), lip_mat, parent, col, f"{prefix}.lip", bevel=0.06)


def toy_rooftop_beacon(part, prefix, x, y, z, mat_body, mat_accent, parent, col, *, scale=1.0):
    """Signature E-shaped rooftop landmark — company identity at city scale."""
    sc = scale
    part(f"{prefix}.base", 1.8 * sc, 1.8 * sc, 0.35 * sc, (x, y, z + 0.18 * sc), mat_body, parent, col, f"{prefix}.base", bevel=0.08)
    # Chunky E form
    part(f"{prefix}.e.stem", 0.38 * sc, 0.38 * sc, 2.8 * sc, (x - 0.55 * sc, y, z + 1.4 * sc), mat_accent, parent, col, f"{prefix}.e.stem", bevel=0.06)
    part(f"{prefix}.e.top", 1.35 * sc, 0.38 * sc, 0.38 * sc, (x, y, z + 2.55 * sc), mat_accent, parent, col, f"{prefix}.e.top", bevel=0.05)
    part(f"{prefix}.e.mid", 0.95 * sc, 0.38 * sc, 0.38 * sc, (x - 0.08 * sc, y, z + 1.45 * sc), mat_accent, parent, col, f"{prefix}.e.mid", bevel=0.05)
    part(f"{prefix}.e.bot", 1.35 * sc, 0.38 * sc, 0.38 * sc, (x, y, z + 0.45 * sc), mat_accent, parent, col, f"{prefix}.e.bot", bevel=0.05)
    part(f"{prefix}.beacon", 0.55 * sc, 0.55 * sc, 0.55 * sc, (x + 0.65 * sc, y, z + 3.15 * sc), mat_body, parent, col, f"{prefix}.beacon", bevel=0.08)


def toy_entrance_portal(
    part,
    prefix,
    x,
    y,
    z,
    mats,
    parent,
    col,
    *,
    portal_w=14.0,
    portal_h=9.5,
    canopy_w=16.0,
    canopy_d=3.2,
    pier_h=9.0,
    sign_scale=0.72,
):
    """Oversized rounded toy entrance — canopy, chunky frame, integrated ECHT sign."""
    # Chunky portal recess
    part(
        f"{prefix}.recess",
        portal_w,
        1.4,
        portal_h,
        (x, y + 0.65, z + portal_h / 2),
        mats["cream_dark"],
        parent,
        col,
        f"{prefix}.recess",
        bevel=0.12,
    )
    # Thick frame columns
    col_w = 0.95
    for side, sx in (("l", -portal_w * 0.38), ("r", portal_w * 0.38)):
        part(
            f"{prefix}.col.{side}",
            col_w,
            1.25,
            portal_h * 0.92,
            (x + sx, y + 0.15, z + portal_h * 0.46),
            mats["charcoal"],
            parent,
            col,
            f"{prefix}.col.{side}",
            bevel=0.1,
        )
        part(
            f"{prefix}.col.{side}.accent",
            col_w * 0.35,
            0.14,
            portal_h * 0.55,
            (x + sx + (col_w * 0.32 if side == "l" else -col_w * 0.32), y - 0.35, z + portal_h * 0.5),
            mats["brand"],
            parent,
            col,
            f"{prefix}.col.{side}.accent",
        )
    # Oversized glass doors
    dw, dh = portal_w * 0.28, portal_h * 0.72
    for i, dx in enumerate((-dw * 0.55, dw * 0.55)):
        part(
            f"{prefix}.door.{i}",
            dw,
            0.18,
            dh,
            (x + dx, y + 0.05, z + dh / 2 + 0.35),
            mats["glass"],
            parent,
            col,
            f"{prefix}.door.{i}" if i else f"{prefix}.door",
        )
    # Canopy
    cz = z + portal_h + 0.65
    part(f"{prefix}.canopy", canopy_w, canopy_d, 0.85, (x, y - 0.25, cz), mats["charcoal"], parent, col, f"{prefix}.canopy", bevel=0.14)
    part(
        f"{prefix}.canopy.underside",
        canopy_w * 0.9,
        canopy_d * 0.82,
        0.14,
        (x, y - 0.25, cz - 0.42),
        mats["cream_dark"],
        parent,
        col,
        f"{prefix}.canopy.underside",
    )
    part(
        f"{prefix}.canopy.trim",
        canopy_w * 0.82,
        0.22,
        0.32,
        (x, y - canopy_d / 2 - 0.05, cz - 0.22),
        mats["coral"],
        parent,
        col,
        f"{prefix}.canopy.trim",
    )
    for i, lx in enumerate((-2.2, 0.0, 2.2)):
        part(
            f"{prefix}.light.{i}",
            1.1,
            0.12,
            0.1,
            (x + lx, y - canopy_d / 2 + 0.15, cz - 0.48),
            mats["glow"],
            parent,
            col,
            f"{prefix}.light.{i}",
        )
    block_sign(part, prefix, "ECHT", x - 2.1, y - canopy_d / 2 - 0.12, cz + 0.05, mats["sign"], parent, col, s=sign_scale, d=0.28)
    # Chunky steps
    for i, (sw, sy) in enumerate(((portal_w * 1.05, 0.22), (portal_w * 0.88, 0.44), (portal_w * 0.72, 0.66))):
        part(
            f"{prefix}.step.{i}",
            sw,
            0.28,
            0.26,
            (x, y + sy, z + 0.13 + i * 0.26),
            mats["paver"],
            parent,
            col,
            f"{prefix}.step.{i}",
            bevel=0.04,
        )


def stylized_bollard(part, prefix, x, y, z, mat, parent, col, *, h=0.75):
    part(f"{prefix}.post", 0.22, 0.22, h, (x, y, z + h / 2), mat, parent, col, f"{prefix}.post", bevel=0.04)
    part(f"{prefix}.cap", 0.32, 0.32, 0.14, (x, y, z + h + 0.07), mat, parent, col, f"{prefix}.cap", bevel=0.05)


def signage_from_brand(part, prefix, brand, x, y, z, sign_mat, parent, col, *, s=0.55, d=0.22):
    """Place an official logo when supplied, otherwise an explicit wordmark fallback."""
    logo = getattr(brand, "logo", None)
    logo_path = getattr(logo, "asset_path", None) if logo else None
    wordmark = getattr(logo, "wordmark", "") if logo else ""
    if logo_path:
        from .logo_ingestion import apply_logo_surface

        result = apply_logo_surface(
            part,
            prefix,
            logo,
            x,
            y,
            z,
            parent,
            col,
            width=max(1.2, 5.0 * s),
            depth=d,
            asset_id=str(parent.get("asw_assetId") or ""),
        )
        if result.get("placed"):
            return {"mode": "official", **result}
    text = wordmark or getattr(brand, "company_name", "HQ")[:4].upper()
    block_sign(part, prefix, text, x, y, z, sign_mat, parent, col, s=s, d=d)
    return {"mode": "wordmark_fallback", "wordmark": text}


def toy_pitch_cap(part, prefix, w, d, x, y, z, roof_mat, accent_mat, parent, col, *, pitch=0.55):
    """Chunky gabled cap — toy roof silhouette."""
    part(f"{prefix}.ridge", w * 0.92, d * 0.35, pitch, (x, y, z + pitch / 2), roof_mat, parent, col, f"{prefix}.ridge", bevel=0.08)
    part(f"{prefix}.peak", w * 0.28, d * 0.22, pitch * 1.35, (x, y - d * 0.08, z + pitch * 0.85), accent_mat, parent, col, f"{prefix}.peak", bevel=0.06)


def toy_dome_cap(part, prefix, r, x, y, z, roof_mat, parent, col):
    part(f"{prefix}.dome", r * 2, r * 2, r * 1.1, (x, y, z + r * 0.55), roof_mat, parent, col, f"{prefix}.dome", bevel=0.35)


def emissive_glow_band(part, prefix, cx, face_y, z, w, h, glow_mat, parent, col, *, depth=0.28):
    """Horizontal warm glow band — Empire State crown lighting."""
    part(f"{prefix}.band", w, depth, h, (cx, face_y, z), glow_mat, parent, col, f"{prefix}.band", bevel=0.04)


def vertical_fin_grooves(part, prefix, cx, face_y, z0, z1, span_w, fin_mat, parent, col, *, count=5, depth=0.32, inset=0.08):
    """Vertical fin/groove accents — tall tower rhythm."""
    h = z1 - z0
    step = span_w / max(1, count)
    for i in range(count):
        fx = cx - span_w / 2 + step * (i + 0.5)
        part(
            f"{prefix}.fin.{i}",
            step * 0.28,
            depth,
            h * 0.92,
            (fx, face_y - inset, z0 + h / 2),
            fin_mat,
            parent,
            col,
            f"{prefix}.fin.{i}",
            bevel=0.03,
        )


def glow_window_slots(
    part,
    prefix,
    cx,
    face_y,
    z0,
    z1,
    span_w,
    glow_mat,
    parent,
    col,
    *,
    cols=4,
    rows=6,
    fill=0.55,
    seed=0,
):
    """Scattered warm glow squares — Marina Bay night façades."""
    import random

    rng = random.Random(seed & 0xFFFFFFFF)
    h = z1 - z0
    col_w = span_w / max(1, cols)
    row_h = h / max(1, rows)
    slot_w = col_w * 0.62
    slot_h = row_h * 0.55
    idx = 0
    for row in range(rows):
        for col_i in range(cols):
            if rng.random() > fill:
                continue
            sx = cx - span_w / 2 + col_w * (col_i + 0.5)
            sz = z0 + row_h * (row + 0.5)
            part(
                f"{prefix}.slot.{idx}",
                slot_w,
                0.12,
                slot_h,
                (sx, face_y, sz),
                glow_mat,
                parent,
                col,
                f"{prefix}.slot.{idx}",
            )
            idx += 1


def tiered_setback_tower(
    part,
    prefix,
    w,
    d,
    h,
    x,
    y,
    z,
    body_mat,
    glow_mat,
    fin_mat,
    parent,
    col,
    *,
    tiers=4,
    bevel=0.32,
):
    """Empire State style stepped tower with crown glow bands and vertical fins."""
    cz = z
    tw, td = w, d
    tier_h = h / tiers
    face_y = y - d / 2 - 0.06
    for i in range(tiers):
        th = tier_h * (1.02 if i == tiers - 1 else 1.0)
        rounded_mass(part, f"{prefix}.tier.{i}", tw, td, th, x, y, cz, body_mat, parent, col, bevel=bevel, cid=f"{prefix}.tier.{i}")
        vertical_fin_grooves(part, f"{prefix}.tier.{i}.fin", x, face_y, cz + th * 0.12, cz + th * 0.88, tw * 0.82, fin_mat, parent, col, count=5 + i)
        emissive_glow_band(part, f"{prefix}.tier.{i}.crown", x, face_y - 0.04, cz + th - 0.35, tw * 0.88, 0.42, glow_mat, parent, col)
        cz += th - 0.18
        tw *= 0.82
        td *= 0.82
        bevel *= 0.92
    return cz


def toy_setback_tower(part, prefix, w, d, h, x, y, z, mat, parent, col, *, bevel=0.3, cid=None, glow_mat=None, fin_mat=None):
    """Tapered tower — delegates to tiered setbacks when glow/fin mats supplied."""
    if glow_mat is not None and fin_mat is not None:
        tiered_setback_tower(part, prefix, w, d, h, x, y, z, mat, glow_mat, fin_mat, parent, col, tiers=3, bevel=bevel)
        return
    rounded_mass(part, f"{prefix}.base", w, d, h * 0.72, x, y, z, mat, parent, col, bevel=bevel, cid=cid or f"{prefix}.base")
    rounded_mass(
        part,
        f"{prefix}.setback",
        w * 0.72,
        d * 0.72,
        h * 0.32,
        x,
        y + d * 0.04,
        z + h * 0.72,
        mat,
        parent,
        col,
        bevel=bevel * 0.85,
        cid=f"{prefix}.setback",
    )


def site_props_tier(part, prefix, front_y, site_z, m, parent, col, *, density=0.7, scale=1.0, width=40.0):
    """Exterior site props scaled by deterministic density."""
    if density < 0.25:
        return
    stylized_tree(part, f"{prefix}.tree.a", -width * 0.42, front_y + 4 * scale, site_z + 0.1, m, parent, col, scale=scale * 0.85)
    if density > 0.45:
        stylized_tree(part, f"{prefix}.tree.b", width * 0.4, front_y + 3 * scale, site_z + 0.1, m, parent, col, scale=scale * 0.75)
    if density > 0.65:
        stylized_planter(part, f"{prefix}.planter", -width * 0.22, front_y + 1.5 * scale, site_z + 0.1, 0.9, 0.9, 0.5, m["charcoal"], m["canopy"], parent, col)
        stylized_lamp(part, f"{prefix}.lamp", width * 0.18, front_y + 1.8 * scale, site_z + 0.1, m["charcoal"], m["glow"], parent, col)
    if density > 0.85:
        stylized_bench(part, f"{prefix}.bench", width * 0.08, front_y + 0.5 * scale, site_z + 0.08, m["paver"], m["charcoal"], parent, col)
