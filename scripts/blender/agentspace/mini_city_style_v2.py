"""Extended toy-city primitives — Apple 3D Maps style silhouettes.

Visual target: docs/BUILDING_VISUAL_STYLE.md
"""
from __future__ import annotations

from .mini_city_style import (
    block_sign,
    bridge_connector,
    emissive_glow_band,
    glow_window_slots,
    rounded_mass,
    signage_from_brand,
    stylized_planter,
    toy_curtain_wall,
    toy_roof_stack,
    toy_window_band,
    vertical_fin_grooves,
)


def skewed_mass(part, prefix, w, d, h, x, y, z, mat, parent, col, *, skew_x=0.0, skew_y=0.0, bevel=0.3, cid=None):
    """Lower block + offset upper slab — misaligned toy stack."""
    rounded_mass(part, f"{prefix}.base", w, d, h * 0.62, x, y, z, mat, parent, col, bevel=bevel, cid=cid or f"{prefix}.base")
    rounded_mass(
        part,
        f"{prefix}.cap",
        w * 0.78,
        d * 0.78,
        h * 0.42,
        x + skew_x,
        y + skew_y,
        z + h * 0.62,
        mat,
        parent,
        col,
        bevel=bevel * 0.9,
        cid=f"{prefix}.cap",
    )


def cantilever_volume(part, prefix, w, d, h, x, y, z, mat, accent, parent, col, *, overhang=2.5):
    """Vertical core + horizontal cantilever slab — dramatic silhouette."""
    core_w, core_d = w * 0.42, d * 0.42
    rounded_mass(part, f"{prefix}.core", core_w, core_d, h, x, y, z, mat, parent, col, bevel=0.32, cid=f"{prefix}.core")
    part(
        f"{prefix}.shelf",
        w * 0.95,
        d * 0.55,
        h * 0.14,
        (x + overhang * 0.35, y - d * 0.08, z + h * 0.68),
        accent,
        parent,
        col,
        f"{prefix}.shelf",
        bevel=0.12,
    )
    part(
        f"{prefix}.lip",
        w * 0.7,
        0.28,
        h * 0.08,
        (x + overhang * 0.5, y - d * 0.22, z + h * 0.76),
        accent,
        parent,
        col,
        f"{prefix}.lip",
    )


def slanted_wedge_roof(part, prefix, w, d, x, y, z, roof_mat, accent, parent, col, *, rise=1.2, tilt_y=1.8):
    """Angled wedge cap — breaks box skyline."""
    part(f"{prefix}.slab", w, d * 0.55, rise * 0.45, (x, y + tilt_y * 0.15, z + rise * 0.22), roof_mat, parent, col, f"{prefix}.slab", bevel=0.1)
    part(f"{prefix}.peak", w * 0.55, d * 0.35, rise, (x, y - tilt_y * 0.2, z + rise * 0.5), accent, parent, col, f"{prefix}.peak", bevel=0.08)


def toy_spire(part, prefix, x, y, z, h, mat, accent, parent, col, *, r=0.55):
    """Needle spire + ball top — rooftop landmark."""
    part(f"{prefix}.shaft", r * 0.35, r * 0.35, h * 0.82, (x, y, z + h * 0.41), mat, parent, col, f"{prefix}.shaft", bevel=0.04)
    part(f"{prefix}.orb", r * 0.9, r * 0.9, r * 0.9, (x, y, z + h * 0.88), accent, parent, col, f"{prefix}.orb", bevel=0.25)


def pod_tower(part, prefix, x, y, z, mats, parent, col, *, pods: list[tuple[float, float, float, str]]):
    """Stack of rounded pods — cartoon tower."""
    cz = z
    for i, (pw, pd, ph, mk) in enumerate(pods):
        rounded_mass(part, f"{prefix}.pod.{i}", pw, pd, ph, x, y, cz, mats[mk], parent, col, bevel=0.42, cid=f"{prefix}.pod.{i}")
        cz += ph - 0.25


def arch_portal_entrance(part, prefix, x, y, z, mats, parent, col, *, span=12.0, height=10.5, depth=3.2):
    """Oversized arch + chunky columns — hero entrance."""
    col_w = span * 0.12
    for side, sx in (("l", -span * 0.38), ("r", span * 0.38)):
        part(f"{prefix}.col.{side}", col_w, depth, height, (x + sx, y, z + height / 2), mats["charcoal"], parent, col, f"{prefix}.col.{side}", bevel=0.08)
        part(f"{prefix}.col.{side}.cap", col_w * 1.3, depth * 1.1, col_w * 0.9, (x + sx, y, z + height + col_w * 0.35), mats["coral"], parent, col, f"{prefix}.col.{side}.cap", bevel=0.06)
    part(f"{prefix}.arch", span * 0.82, depth * 0.55, span * 0.22, (x, y, z + height * 0.92), mats["brand"], parent, col, f"{prefix}.arch", bevel=0.14)
    part(f"{prefix}.lintel", span * 0.95, depth * 0.35, 0.65, (x, y - depth * 0.15, z + height * 0.55), mats["glass"], parent, col, f"{prefix}.lintel")
    part(f"{prefix}.step", span * 1.05, 0.32, 0.28, (x, y + depth * 0.55, z + 0.14), mats["paver"], parent, col, f"{prefix}.step", bevel=0.04)


def diagonal_bridge(part, prefix, x, y, z, length, width, thickness, mat, parent, col, *, rise=3.5):
    """Angled sky bridge between offset masses."""
    part(f"{prefix}.span", length, width, thickness, (x, y, z + rise / 2), mat, parent, col, f"{prefix}.span", bevel=0.1)
    part(f"{prefix}.rail.l", length * 0.92, 0.14, 0.55, (x, y - width / 2 + 0.08, z + rise + 0.18), mat, parent, col, f"{prefix}.rail.l")
    part(f"{prefix}.rail.r", length * 0.92, 0.14, 0.55, (x, y + width / 2 - 0.08, z + rise + 0.18), mat, parent, col, f"{prefix}.rail.r")


def orb_sculpture_stack(part, prefix, x, y, z, mats, parent, col, *, count=3, scale=1.0):
    """Playful stacked orbs — plaza sculpture."""
    s = scale
    part(f"{prefix}.ped", 1.8 * s, 1.8 * s, 0.35 * s, (x, y, z + 0.18 * s), mats["charcoal"], parent, col, f"{prefix}.ped", bevel=0.06)
    for i in range(count):
        r = (1.1 - i * 0.18) * s
        rounded_mass(part, f"{prefix}.orb.{i}", r * 2, r * 2, r * 2, x + i * 0.15 * s, y, z + (0.5 + i * 0.85) * s, mats[["brand", "coral", "cream"][i % 3]], parent, col, bevel=0.4, cid=f"{prefix}.orb.{i}")


def zigzag_terrace(part, prefix, x, y, z, w, d, mat_body, mat_deck, parent, col, *, tiers=3):
    """Stepping terraces along one edge — strong readable silhouette."""
    for i in range(tiers):
        tw = w * (0.92 - i * 0.12)
        td = d * 0.28
        tz = z + i * 1.35
        ty = y + i * 0.85
        part(f"{prefix}.deck.{i}", tw, td, 0.22, (x, ty, tz + 0.11), mat_deck, parent, col, f"{prefix}.deck.{i}", bevel=0.04)
        rounded_mass(part, f"{prefix}.rail.{i}", tw * 0.95, 0.18, 0.42, x, ty + td / 2, tz + 0.35, mat_body, parent, col, bevel=0.08, cid=f"{prefix}.rail.{i}")


def wishbone_tower(part, prefix, w, d, h, x, y, z, body_mat, uplight_mat, glow_mat, parent, col, *, bevel=0.34):
    """Marina Bay Sands style split-leg tower with purple cleft uplight."""
    leg_w, leg_d = w * 0.38, d * 0.42
    gap = w * 0.12
    for side, sx in (("l", -gap), ("r", gap)):
        rounded_mass(
            part,
            f"{prefix}.leg.{side}",
            leg_w,
            leg_d,
            h * 0.88,
            x + sx,
            y,
            z,
            body_mat,
            parent,
            col,
            bevel=bevel,
            cid=f"{prefix}.leg.{side}",
        )
    # Cleft uplight channel
    part(
        f"{prefix}.cleft",
        gap * 1.6,
        d * 0.18,
        h * 0.72,
        (x, y - d * 0.08, z + h * 0.38),
        uplight_mat,
        parent,
        col,
        f"{prefix}.cleft",
        bevel=0.12,
    )
    glow_window_slots(part, f"{prefix}.slots.l", x - gap, y - d / 2 - 0.05, z + 2.0, z + h * 0.82, leg_w * 0.9, glow_mat, parent, col, cols=3, rows=7, fill=0.48, seed=hash(prefix) & 0xFFFF)
    glow_window_slots(part, f"{prefix}.slots.r", x + gap, y - d / 2 - 0.05, z + 2.0, z + h * 0.82, leg_w * 0.9, glow_mat, parent, col, cols=3, rows=7, fill=0.52, seed=(hash(prefix) >> 4) & 0xFFFF)
    # Curved sky cap
    rounded_mass(part, f"{prefix}.cap", w * 0.92, d * 0.55, h * 0.12, x, y + d * 0.06, z + h * 0.88, body_mat, parent, col, bevel=0.2, cid=f"{prefix}.cap")
    emissive_glow_band(part, f"{prefix}.cap.glow", x, y - d * 0.22, z + h * 0.94, w * 0.78, 0.32, glow_mat, parent, col)


def sky_bridge_platform(part, prefix, x, y, z, span_w, span_d, thickness, body_mat, glow_mat, parent, col, *, bevel=0.14):
    """Boat-shaped sky bridge — connects tower tops."""
    rounded_mass(part, f"{prefix}.deck", span_w, span_d, thickness, x, y, z, body_mat, parent, col, bevel=bevel, cid=f"{prefix}.deck")
    emissive_glow_band(part, f"{prefix}.rim.f", x, y - span_d / 2 - 0.04, z + thickness - 0.12, span_w * 0.88, 0.28, glow_mat, parent, col)
    emissive_glow_band(part, f"{prefix}.rim.r", x + span_w / 2 - 0.08, y, z + thickness - 0.12, span_d * 0.55, 0.22, glow_mat, parent, col, depth=0.22)


def apply_night_facade(
    part,
    prefix,
    cx,
    face_y,
    z0,
    z1,
    span_w,
    mats,
    parent,
    col,
    *,
    style="band",
    seed=0,
):
    """Unified night-mode façade lighting pass."""
    fin = mats.get("fin", mats["charcoal"])
    if style == "slots":
        glow_window_slots(part, prefix, cx, face_y, z0, z1, span_w, mats["glass"], parent, col, cols=4, rows=8, fill=0.5, seed=seed)
    elif style == "fins":
        vertical_fin_grooves(part, prefix, cx, face_y, z0, z1, span_w, fin, parent, col, count=6)
        emissive_glow_band(part, f"{prefix}.crown", cx, face_y - 0.04, z1 - 0.45, span_w * 0.9, 0.38, mats["glow"], parent, col)
    elif style == "band":
        vertical_fin_grooves(part, prefix, cx, face_y, z0, z1, span_w, fin, parent, col, count=5)
        emissive_glow_band(part, f"{prefix}.crown", cx, face_y - 0.04, z1 - 0.45, span_w * 0.88, 0.38, mats["glow"], parent, col)
    else:
        emissive_glow_band(part, f"{prefix}.mid", cx, face_y, z0 + (z1 - z0) * 0.55, span_w * 0.75, 0.35, mats["glow"], parent, col)
        vertical_fin_grooves(part, prefix, cx, face_y, z0, z1, span_w, fin, parent, col, count=5)
        glow_window_slots(part, f"{prefix}.slots", cx, face_y - 0.02, z0 + 1.5, z1 - 1.2, span_w * 0.85, mats["glass"], parent, col, cols=3, rows=6, fill=0.42, seed=seed)


def cylinder_tower(part, prefix, r, h, x, y, z, mat, glass, frame, parent, col, *, bands=4, glow_mat=None):
    """Round tower with banded glass — non-rectangular footprint."""
    rounded_mass(part, f"{prefix}.shaft", r * 2, r * 2, h, x, y, z, mat, parent, col, bevel=0.45, cid=f"{prefix}.shaft")
    gm = glow_mat or glass
    for i in range(bands):
        z0 = z + 1.8 + i * (h - 3.5) / max(1, bands)
        if glow_mat:
            emissive_glow_band(part, f"{prefix}.band.{i}", x, y - r - 0.06, z0, r * 1.35, 0.32, gm, parent, col)
        else:
            toy_window_band(part, f"{prefix}.band.{i}", x, y - r - 0.06, z0, r * 1.4, 2.4, frame, glass, parent, col)
    vertical_fin_grooves(part, f"{prefix}.fin", x, y - r - 0.08, z + 2.0, z + h - 1.5, r * 1.6, frame, parent, col, count=4)


def rooftop_antenna_farm(part, prefix, x, y, z, mat, accent, parent, col, *, count=3):
    for i in range(count):
        ox = (i - count / 2) * 1.4
        part(f"{prefix}.mast.{i}", 0.12, 0.12, 1.8 + i * 0.35, (x + ox, y, z + 0.9 + i * 0.2), mat, parent, col, f"{prefix}.mast.{i}")
        part(f"{prefix}.dish.{i}", 0.55, 0.12, 0.55, (x + ox, y, z + 1.6 + i * 0.35), accent, parent, col, f"{prefix}.dish.{i}", bevel=0.05)


def projecting_box(part, prefix, w, d, h, x, y, z, mat, parent, col, *, proj_y=-1.2, bevel=0.18, cid=None):
    """Facade box projecting forward — breaks flat wall."""
    part(f"{prefix}.proj", w, d, h, (x, y + proj_y, z + h / 2), mat, parent, col, cid or f"{prefix}.proj", bevel=bevel)


def balcony_ledge(part, prefix, w, d, x, y, z, body_mat, rail_mat, parent, col, *, depth=1.1, drop=0.85):
    """Chunky toy balcony slab + low rail."""
    part(f"{prefix}.slab", w, depth, 0.2, (x, y - depth / 2, z), body_mat, parent, col, f"{prefix}.slab", bevel=0.06)
    part(f"{prefix}.rail", w * 0.92, 0.14, 0.38, (x, y - depth + 0.08, z + 0.28), rail_mat, parent, col, f"{prefix}.rail", bevel=0.04)
    rounded_mass(part, f"{prefix}.drop", w * 0.35, 0.22, drop, x, y - depth * 0.35, z - drop, body_mat, parent, col, bevel=0.1, cid=f"{prefix}.drop")


def recessed_niche(part, prefix, w, d, h, x, y, z, outer_mat, inner_mat, parent, col, *, recess=0.55):
    """Recessed facade pocket — shadow depth."""
    part(f"{prefix}.frame", w, d, h, (x, y, z + h / 2), outer_mat, parent, col, f"{prefix}.frame", bevel=0.1)
    part(f"{prefix}.niche", w * 0.72, d * 0.5, h * 0.78, (x, y - recess, z + h * 0.42), inner_mat, parent, col, f"{prefix}.niche", bevel=0.08)


def roof_deck_platform(part, prefix, w, d, x, y, z, deck_mat, rail_mat, parent, col, *, lift=0.35):
    """Roof terrace deck — readable platform silhouette."""
    part(f"{prefix}.deck", w, d, 0.24, (x, y, z + lift), deck_mat, parent, col, f"{prefix}.deck", bevel=0.05)
    part(f"{prefix}.rail.f", w, 0.16, 0.42, (x, y - d / 2 + 0.08, z + lift + 0.32), rail_mat, parent, col, f"{prefix}.rail.f")
    part(f"{prefix}.rail.r", 0.16, d * 0.85, 0.42, (x + w / 2 - 0.08, y, z + lift + 0.32), rail_mat, parent, col, f"{prefix}.rail.r")
