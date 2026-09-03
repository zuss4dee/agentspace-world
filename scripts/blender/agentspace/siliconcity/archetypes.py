"""Silicon City archetypes — authored SPARK/NOVA language plus envelope-scaled families.

All coordinates are metres, root at plot centre, street at -Y, Z up. Each
archetype builds: lawn tile + paver apron + sidewalk, saturated brand masses
with white trim / visible floor lines / big dark-framed window grids, ground
floor storefront glass + awnings, a crowded flat roof, a logo on the roof AND
on a facade, the wordmark under an awning / on a fascia, a street pole sign,
parked cars, blob trees and shrubs.
"""
from __future__ import annotations

import math

from .primitives import (
    Face,
    Mass,
    accent_wall,
    awning,
    balcony,
    barrel_vault,
    block,
    columns,
    entrance,
    flat_roof,
    floor_lines,
    horizontal_bands,
    industrial_window,
    parapet,
    pitched_cap,
    roof_slab,
    rotunda,
    sawtooth_roof,
    sky_bridge,
    storefront,
    trim_slab,
    vertical_fins,
    window_grid,
    window_row,
)
from .props import (
    avatar_orbs,
    beacon_mast,
    bench,
    blob_tree,
    bollard,
    hedge,
    helipad,
    hvac_unit,
    lamp,
    lawn_tile,
    parking_row,
    paver_apron,
    planter,
    pole_sign,
    roof_access_box,
    roof_deck,
    rooftop_billboard,
    satellite_dish,
    shrub,
    sidewalk,
    solar_array,
    vent_stack,
    water_tank,
)
from .signage import fascia_sign, logo_flat, logo_on_face, place_brand_logo_complements, wordmark_on_face


def _site(ctx, apron: Mass, *, walk_depth: float):
    """Lawn tile + street sidewalk + paver apron. Returns (base_z, lawn_z, walk_front_y)."""
    lawn_z = lawn_tile(ctx, "site", ctx.W, ctx.D)
    walk_y = sidewalk(ctx, "site", ctx.W, ctx.D, lawn_z, depth=walk_depth)
    base_z = paver_apron(ctx, "site", apron.x, apron.y, lawn_z, apron.w, apron.d)
    ctx.anchors["base_z"] = base_z
    return base_z, lawn_z, walk_y


def _anchors(ctx, *, entrance_xyz, roof_center_xy, roof_z):
    ctx.anchors["entrance"] = tuple(entrance_xyz)
    ctx.anchors["roof_center"] = (roof_center_xy[0], roof_center_xy[1], roof_z)
    ctx.anchors["roof_z"] = roof_z


def _storeys(ctx, default: int) -> int:
    return int(ctx.p("storey_count", default))


def _wing(ctx) -> tuple[float, float]:
    return float(ctx.p("wing_offset_x", 0.0)), float(ctx.p("wing_offset_y", 0.0))


def _win_cols(ctx, default: int) -> int:
    return int(ctx.p("window_cols", default))


def _roof_module(ctx, default: str = "flat") -> str:
    return str(ctx.p("roof_module", default))


def _apply_main_roof(ctx, name: str, m: Mass, *, default: str = "flat") -> float:
    """Finish a mass roof according to roof_module uniqueness param."""
    mod = _roof_module(ctx, default)
    if mod == "barrel":
        parapet(ctx, name, m, "cream", h=0.45)
        return barrel_vault(ctx, f"{name}.vault", m.x, m.y, m.top + 0.15, max(4.0, m.w - 1.0), min(m.d * 0.7, 12.0), "brand", "cream", slats=7, rise=min(5.0, m.h * 0.45), end_mat="coral")
    if mod == "pitch":
        return pitched_cap(ctx, name, m, "cream", rise=ctx.storey * 0.7, along="y", ridge_mat="brand")
    if mod == "helipad":
        z = flat_roof(ctx, name, m, parapet_mat="cream", parapet_h=0.55)
        helipad(ctx, f"{name}.heli", m.x, m.y, z, r=min(4.2, min(m.w, m.d) * 0.35))
        return z
    if mod == "parapet":
        return flat_roof(ctx, name, m, parapet_mat="cream", parapet_h=0.85)
    return flat_roof(ctx, name, m, parapet_mat="cream")


def _tower_facade(ctx, name: str, m: Mass, faces, floors, cols, frame, *, style: str, levels, skip_by_face=None):
    """Window grids + facade rhythm (fins/bands) on the listed faces of a tower cube."""
    gb = float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))
    gb = max(0.35, min(0.95, gb))
    for side in faces:
        f = m.face(side)
        skip = (skip_by_face or {}).get(side, ())
        window_grid(ctx, f"{name}.{side}", f, m.z0, ctx.storey, floors, cols, frame, "glass", glass_bias=gb, skip=skip, margin=1.0)
        if style in ("fins", "mixed"):
            vertical_fins(ctx, f"{name}.{side}.fins", f, m.z0 + 0.3, m.top - 0.3, cols + 1, "cream", span=f.length - 1.2, fin_w=0.36, depth=0.45)
        if style in ("band", "mixed"):
            horizontal_bands(ctx, f"{name}.{side}.bands", f, levels, "cream", span=f.length + 0.4, band_h=0.36, depth=0.3)


# ---------------------------------------------------------------------------
# smb_block — corner store, 2–3 storeys, awnings, fascia sign, crowded roof
# ---------------------------------------------------------------------------


def smb_block(ctx) -> None:
    W, D = ctx.W, ctx.D  # 26 × 18 default
    sh = ctx.storey
    storeys = _storeys(ctx, 2)
    ox, oy = _wing(ctx)
    ground_h = sh * 1.25
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))
    gb = max(0.35, min(0.95, gb))
    frame = ctx.frame
    cols = _win_cols(ctx, 5)
    logo_mode = str(ctx.p("logo_mode", "plaza_totem"))
    entrance_side = str(ctx.p("entrance_side", "front"))

    apron = Mass(0.0, 1.6, 0.0, W - 2.0, D - 4.0, 0.0)
    base, lawn_z, walk_y = _site(ctx, apron, walk_depth=3.4)

    # Main shop block A (brand) — height from storey_count, offset from wing knobs
    upper = max(1, storeys - 1)
    A = Mass(-3.5 + ox * 0.4, 0.7 + oy * 0.3, base, 16.0, 11.0, ground_h + sh * upper)
    block(ctx, "A", A, "brand")
    floor_levels = [base + ground_h + sh * i for i in range(upper)]
    floor_lines(ctx, "A", A, floor_levels[: max(1, upper)], "cream")
    roof_z = _apply_main_roof(ctx, "A", A, default="parapet")

    front = A.face("front")
    left = A.face("left")
    back = A.face("back")
    right = A.face("right")
    # storefront on front (left of the entrance) + wrapping the left face
    sf_span = 10.5
    sf_u = -5.75 - A.x
    storefront(ctx, "A.shop.front", front, base, ground_h * 0.78, "glass", "cream", "cream_dark", u0=sf_u, span=sf_span, cols=4 if gb < 0.6 else 5)
    awning(ctx, "A.awning.front", front, sf_u, base + ground_h * 0.72, sf_span + 0.6, "coral", stripe_mat="cream", stripes=5, glow_mat="glow")
    storefront(ctx, "A.shop.left", left, base, ground_h * 0.78, "glass", "cream", "cream_dark", u0=0.0, span=8.0, cols=3)
    awning(ctx, "A.awning.left", left, 0.0, base + ground_h * 0.72, 8.6, "coral", stripe_mat="cream", stripes=4, glow_mat="glow")
    # entrance — side varies by uniqueness param
    ent_face = {"front": front, "left": left, "right": right}.get(entrance_side, front)
    ent_u = (2.5 - A.x) if entrance_side == "front" else 0.0
    entrance(ctx, "A.entrance", ent_face, ent_u, base, 3.0, ground_h * 0.82, "charcoal", "glass", "paver", canopy_mat="cream", canopy_strip="brand", steps=2)
    # fascia sign band above the awning (wordmark)
    fascia_sign(ctx, "A.fascia", front, 0.0, base + ground_h + 0.72, min(A.w - 1.2, 14.0), 1.15, "charcoal", "sign", text)
    # upper-floor window rows (density / cols from brand seed)
    for fi in range(upper):
        window_row(ctx, f"A.front.f{fi}", front, base + ground_h + sh * fi, sh, cols, frame, "glass", z_frac=0.66, glass_bias=gb, span=A.w - 2.4)
        window_row(ctx, f"A.left.f{fi}", left, base + ground_h + sh * fi, sh, max(2, cols - 2), frame, "glass", z_frac=0.62, glass_bias=gb)
        window_row(ctx, f"A.back.f{fi}", back, base + ground_h + sh * fi, sh, max(3, cols - 1), frame, "glass", z_frac=0.62, glass_bias=gb)
    window_row(ctx, "A.back.f0g", back, base + 0.6, sh, max(3, cols - 1), frame, "glass", z_frac=0.62, glass_bias=gb)

    # Corner tower B (accent) — box + gable cap, or glass rotunda
    corner_style = ctx.p("corner_style", "accent_tower")
    B = Mass(8.0 + ox * 0.5, -1.3 + oy * 0.4, base, 7.0, 7.0, sh * (storeys + 1))
    if corner_style == "rotunda":
        cap_z = rotunda(ctx, "B", B.x, B.y, base, 3.5, sh * (storeys + 1), storeys + 1, "coral", "glass", "cream", "cream", finial_mat="brand")
        logo_on_face(ctx, "logo.facade", left, -1.5, base + ground_h + sh * 0.55, min(2.9, sh * 0.8), backing_mat="cream")
        tower_top = cap_z + 3.6
    else:
        block(ctx, "B", B, "coral")
        floor_lines(ctx, "B", B, [base + sh * k for k in range(1, storeys + 1)], "cream")
        bf, br = B.face("front"), B.face("right")
        window_grid(ctx, "B.front", bf, base, sh, list(range(storeys)), 2, ctx.accent_frame, "glass", glass_bias=gb, margin=0.9)
        window_grid(ctx, "B.right", br, base, sh, list(range(storeys + 1)), 2, ctx.accent_frame, "glass", glass_bias=gb, margin=0.9)
        logo_on_face(ctx, "logo.facade", bf, 0.0, base + sh * (storeys - 0.5), min(3.4, sh * 0.85), backing_mat="cream")
        tower_top = pitched_cap(ctx, "B", B, "cream", rise=sh * 0.8, along="y", ridge_mat="brand")
    # rear service block
    C = Mass(-5.5 + ox * 0.3, 6.8 + oy * 0.2, base, 11.0, 3.2, sh * 1.15)
    block(ctx, "C", C, "cream_dark", bevel=0.2)
    parapet(ctx, "C", C, "cream", h=0.4, t=0.3)
    window_row(ctx, "C.back", C.face("back"), base, C.h, 3, "charcoal", "glass", z_frac=0.55, glass_bias=gb)

    # 3D logo complements (plaza totem / blade / roof) — distinct brand pieces
    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(-11.2, -6.6),
        plaza_z=lawn_z,
        roof_xy=(-6.0 + ox * 0.2, 1.2),
        roof_z=roof_z,
        facade_face=front,
        facade_u=-4.0,
        facade_z0=base + ground_h,
        facade_h=sh * max(2, storeys),
        roof_size=A.w * 0.4,
        always_roof_plaque=True,
    )
    solar_array(ctx, "A.roof.solar", 1.2, 3.4, roof_z, 2, 3)
    hvac_unit(ctx, "A.roof.hvac.a", 2.6, -2.6, roof_z)
    if density > 0.5:
        hvac_unit(ctx, "A.roof.hvac.b", 0.0, -3.0, roof_z, w=1.6, d=1.3, h=1.1)
    satellite_dish(ctx, "A.roof.dish", -10.3, 5.0, roof_z)
    water_tank(ctx, "A.roof.tank", -10.0, -3.0, roof_z, r=1.05, h=2.0)
    vent_stack(ctx, "A.roof.vent.a", 3.6, 0.5, roof_z)
    vent_stack(ctx, "A.roof.vent.b", -2.0, -3.6, roof_z, h=1.2)
    if density > 0.65:
        rooftop_billboard(ctx, "A.roof.billboard", -6.5, 5.3, roof_z, text, w=7.0, h=2.6, lift=1.8, panel="cream", letters="charcoal")
    n_av = int(ctx.p("avatar_count", 0)) or int(ctx.p("sculpture_count", 0))
    if n_av:
        avatar_orbs(ctx, "A.roof.avatars", 1.5, 0.6, roof_z, n_av, spacing=2.2)
    if ctx.p("motion_accent", False):
        beacon_mast(ctx, "A.roof.beacon", 4.0, 5.4, roof_z, h=4.5, motion=True)

    # Street + plot props
    pole_sign(ctx, "sign.pole", -11.6, -6.9, lawn_z, text, h=8.2, panel_w=5.0, panel_h=2.2, with_logo=False)
    parking_row(ctx, "cars", -6.0, 8.0, -7.4, lawn_z + 0.14, 2, rng=ctx.rng)
    blob_tree(ctx, "tree.a", -12.0, 7.6, lawn_z, s=1.0)
    blob_tree(ctx, "tree.b", 12.2, 6.6, lawn_z, s=0.9)
    blob_tree(ctx, "tree.c", 12.2, -3.6, lawn_z, s=0.8)
    for i, y in enumerate((-2.0, 1.0, 4.0)):
        shrub(ctx, f"shrub.l.{i}", -12.4, y, lawn_z, s=0.9)
    hedge(ctx, "hedge.rear", -1.0, 8.7, lawn_z, 20.0)
    bench(ctx, "bench", -7.0, -4.6, base)
    lamp(ctx, "lamp", 6.0, -6.2, lawn_z)
    for i, x in enumerate((0.4, 4.6)):
        bollard(ctx, f"bollard.{i}", x, -6.3, lawn_z)
        planter(ctx, f"planter.{i}", x - 0.6 + i * 1.2, -5.9, lawn_z, w=1.1)

    if entrance_side == "front":
        ent_xy = (A.x + ent_u, A.y0, base)
    elif entrance_side == "left":
        ent_xy = (A.x0, A.y, base)
    else:
        ent_xy = (A.x1, A.y, base)
    _anchors(ctx, entrance_xyz=ent_xy, roof_center_xy=(A.x, A.y), roof_z=max(roof_z, tower_top))


# ---------------------------------------------------------------------------
# startup_loft — warehouse conversion, striped barrel vault, cantilevered glass box
# ---------------------------------------------------------------------------


def startup_loft(ctx) -> None:
    W, D = ctx.W, ctx.D  # 40 × 28 default
    sh = ctx.storey
    storeys = _storeys(ctx, 2)
    ox, oy = _wing(ctx)
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))
    gb = max(0.35, min(0.95, gb))
    skew = float(ctx.p("skew", 0.2))
    frame = ctx.frame
    cols = _win_cols(ctx, 5)
    logo_mode = str(ctx.p("logo_mode", "roof_deck"))
    roof_mod = _roof_module(ctx, "barrel")

    apron = Mass(0.0, 1.5, 0.0, W - 2.0, D - 4.6, 0.0)
    base, lawn_z, walk_y = _site(ctx, apron, walk_depth=3.6)

    # Main loft L (brand) — long mass; storey_count drives height
    L = Mass(-4.0 + ox * 0.5, 4.5 + oy * 0.35, base, 28.0, 16.0, sh * storeys)
    block(ctx, "L", L, "brand")
    floor_lines(ctx, "L", L, [base + sh * k for k in range(1, storeys)], "cream", thick=0.4, proud=0.28)
    parapet(ctx, "L", L, "cream", h=0.55)
    roof_slab(ctx, "L", L, "roof")
    lf, lb = L.face("front"), L.face("back")
    # industrial window grids — column count from uniqueness
    n_front = max(3, cols)
    for f_i, (u, zc) in enumerate([(-13 + 26 * (i + 0.5) / n_front, base + sh * (storeys - 0.5)) for i in range(n_front)]):
        industrial_window(ctx, f"L.front.f1.{f_i}", lf, u, zc, 3.8, sh * 0.66, frame, "glass", panes_x=3, panes_y=2)
    n_back = max(3, cols - 1)
    for f_i, u in enumerate([-12 + 24 * (i + 0.5) / n_back for i in range(n_back)]):
        industrial_window(ctx, f"L.back.f1.{f_i}", lb, u, base + sh * (storeys - 0.5), 4.2, sh * 0.66, frame, "glass", panes_x=3, panes_y=2)
        industrial_window(ctx, f"L.back.f0.{f_i}", lb, u, base + sh * 0.55, 4.2, sh * 0.62, frame, "glass", panes_x=3, panes_y=2)
    # loading door on the exposed front-left ground floor
    dl, dd = lf.place(-12.0, base + 1.75, 3.4, 0.2, 3.5)
    ctx.box("L.dock.door", *dd, dl, "charcoal", bevel=0.04, kind="door")
    for i in range(4):
        rl, rd = lf.place(-12.0, base + 0.6 + i * 0.85, 3.4, 0.08, 0.14, out=0.2)
        ctx.box(f"L.dock.rib.{i}", *rd, rl, "cream_dark", kind="door")
    # mural wall on the left flank with the big wordmark + logo
    mural = accent_wall(ctx, "L.mural", L.face("left"), "coral", t=0.45, inset=0.25)
    wordmark_on_face(ctx, "L.mural.text", text, mural, 0.0, base + 1.4, ctx.letters_on_accent, s=2.4, depth=0.3, max_w=mural.length - 2.0)
    logo_on_face(ctx, "logo.facade", mural, 0.0, base + L.h - 2.1, min(3.2, sh * 0.75), backing_mat="cream")

    # roof: striped barrel vault / pitch / flat from roof_module
    vault_span = 13.0
    if roof_mod == "pitch" or ctx.p("roof_style", "barrel") == "sawtooth":
        crown_z = sawtooth_roof(ctx, "L.roof", Mass(L.x, L.y, L.top + 0.18, L.w - 1.2, vault_span, 0.0), 4, "cream", "glass", "coral", rise=sh * 0.85)
    elif roof_mod in ("flat", "parapet", "helipad"):
        crown_z = flat_roof(ctx, "L.roof", Mass(L.x, L.y, L.top, L.w - 0.8, vault_span, 0.4), parapet_mat="cream", parapet_h=0.6 if roof_mod == "parapet" else 0.4)
        if roof_mod == "helipad":
            helipad(ctx, "L.roof.heli", L.x, L.y, crown_z, r=3.8)
    else:
        crown_z = barrel_vault(ctx, "L.roof", L.x, L.y, L.top + 0.18, L.w - 0.8, vault_span, "brand", "cream", slats=9, rise=5.0, end_mat="coral")
    # flat strips either side of the vault
    for i, x in enumerate((-14.0, -8.0, 2.0)):
        vent_stack(ctx, f"L.roof.vent.{i}", x, L.y0 + 0.85, L.top + 0.2, h=1.1 + 0.2 * i)
    hvac_unit(ctx, "L.roof.hvac", 6.5, L.y0 + 0.85, L.top + 0.2, w=1.4, d=1.1, h=1.0)
    water_tank(ctx, "L.roof.tank", 5.0, L.y1 - 0.85, L.top + 0.2, r=1.0, h=2.0)

    # Entrance block E (cream) with storefront + roof deck + roof-edge sign
    E = Mass(-4.0 + ox * 0.25, -6.85 + oy * 0.2, base, 20.0, 6.7, sh * 1.12)
    block(ctx, "E", E, "cream", bevel=0.26)
    e_roof = flat_roof(ctx, "E", E, parapet_mat="cream_dark", roof_mat="roof", parapet_h=0.5)
    ef = E.face("front")
    storefront(ctx, "E.shop", ef, base, E.h * 0.8, "glass", "charcoal", "cream_dark", u0=-2.0, span=14.0, cols=5 if gb > 0.55 else 4)
    awning(ctx, "E.awning", ef, -2.0, base + E.h * 0.7, 14.6, "coral", stripe_mat="cream", stripes=6, glow_mat="glow")
    entrance(ctx, "E.entrance", ef, 7.0, base, 3.4, E.h * 0.84, "charcoal", "glass", "paver", canopy_mat="coral", canopy_strip="cream", steps=2)
    edge = Face(Mass(E.x, E.y, E.top + 0.5, E.w, E.d, 2.2), "front")
    wordmark_on_face(ctx, "E.edge.sign", text, edge, 5.0, E.top + 0.6, "brand", s=1.15, depth=0.34, max_w=9.0, out=-0.4)
    roof_deck(ctx, "E.deck", -7.0, -7.25, e_roof, 12.0, 4.5)
    solar_array(ctx, "E.roof.solar", 3.0, -6.0, e_roof, 1, 3)
    blob_tree(ctx, "E.deck.tree", -11.5, -6.5, e_roof + 0.18, s=0.55)

    # Hero: cream_dark plinth C + cantilevered accent glass box D
    C = Mass(12.0 + ox * 0.4, -6.85, base, 12.0, 6.7, E.h)
    block(ctx, "C", C, "cream_dark", bevel=0.24)
    storefront(ctx, "C.shop", C.face("front"), base, C.h * 0.8, "glass", "cream", "cream_dark", u0=0.0, span=10.0, cols=3)
    dx = 1.0 + 1.5 * skew + ox * 0.15
    D = Mass(12.0 + dx, -8.1 + oy * 0.25, C.top, 12.0, 8.2, sh * (1.1 + 0.25 * max(0, storeys - 2)))
    block(ctx, "D", D, "coral", bevel=0.34)
    floor_lines(ctx, "D", D, [D.z0 + 0.5], "cream", thick=0.5, proud=0.3)
    d_roof = flat_roof(ctx, "D", D, parapet_mat="cream", parapet_h=0.6)
    for side, span in (("front", D.w - 2.0), ("right", D.d - 2.0), ("left", D.d - 2.0)):
        storefront(ctx, f"D.glass.{side}", D.face(side), D.z0 + 0.9, D.h - 1.6, "glass", "cream", "coral", u0=0.0, span=span, cols=4 if side == "front" else 3, base_h=0.3)
    columns(ctx, "D.cols", [(D.x0 + 1.2, D.y0 + 0.6), (D.x1 - 1.2, D.y0 + 0.6)], base, C.h, "charcoal", size=0.5)

    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(-17.0, -12.0),
        plaza_z=lawn_z,
        roof_xy=(D.x, D.y),
        roof_z=d_roof,
        facade_face=ef,
        facade_u=-6.0,
        facade_z0=base,
        facade_h=E.h + D.h,
        roof_size=D.w * 0.42,
        always_roof_plaque=True,
    )
    satellite_dish(ctx, "D.roof.dish", D.x0 + 1.6, D.y1 - 1.6, d_roof)
    if ctx.p("motion_accent", False):
        beacon_mast(ctx, "D.roof.beacon", D.x1 - 1.7, D.y1 - 1.7, d_roof, h=5.0, motion=True)
    else:
        vent_stack(ctx, "D.roof.vent", D.x1 - 1.7, D.y1 - 1.7, d_roof, h=1.0)

    # Right-hand plaza (between L and the plot edge)
    n_av = int(ctx.p("avatar_count", 0)) or int(ctx.p("sculpture_count", 0))
    if n_av:
        avatar_orbs(ctx, "plaza.avatars", 14.5, 4.0, base, n_av, spacing=3.0)
    bench(ctx, "plaza.bench.a", 12.0, 8.5, base, along="y")
    bench(ctx, "plaza.bench.b", 17.0, 8.5, base, along="y")
    planter(ctx, "plaza.planter", 14.5, 11.5, base, w=1.6)

    # Street + plot props
    pole_sign(ctx, "sign.pole", -17.4, -12.4, lawn_z, text, h=9.0, panel_w=5.6, panel_h=2.4, with_logo=False)
    parking_row(ctx, "cars", -12.0, 0.0, -12.2, lawn_z + 0.14, 3, rng=ctx.rng)
    blob_tree(ctx, "tree.a", -18.6, 12.4, lawn_z, s=1.05)
    blob_tree(ctx, "tree.b", 18.6, 12.2, lawn_z, s=0.95)
    blob_tree(ctx, "tree.c", 18.6, 1.5, lawn_z, s=0.85)
    blob_tree(ctx, "tree.d", -19.0, -7.2, lawn_z, s=0.8)
    hedge(ctx, "hedge.rear", -2.0, 13.4, lawn_z, 30.0)
    for i, x in enumerate((-16.5, -14.8)):
        shrub(ctx, f"shrub.{i}", x, -3.6 - 1.2 * (i + 1), lawn_z, s=0.8)
    lamp(ctx, "lamp.a", 5.0, -12.6, lawn_z)
    if density > 0.6:
        lamp(ctx, "lamp.b", -15.0, -12.8, lawn_z)
    for i, x in enumerate((4.6, 9.4)):
        bollard(ctx, f"bollard.{i}", x, -11.6, lawn_z)

    _anchors(ctx, entrance_xyz=(3.0, E.y0, base), roof_center_xy=(L.x, L.y), roof_z=crown_z)


# ---------------------------------------------------------------------------
# enterprise_hq — L-shaped podium wings + stacked-cube tower, sky bridge, helipad
# ---------------------------------------------------------------------------


def enterprise_hq(ctx) -> None:
    W, D = ctx.W, ctx.D  # 54 × 38 default
    sh = ctx.storey
    storeys = _storeys(ctx, 5)
    ox, oy = _wing(ctx)
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))
    gb = max(0.35, min(0.95, gb))
    skew = float(ctx.p("skew", 0.2))
    style = ctx.p("facade_style", "band")
    tower_style = ctx.p("tower_style", "stacked_rotated")
    frame = ctx.frame
    symmetric = float(ctx.p("symmetry", 0.7)) >= 0.9
    cols = _win_cols(ctx, 3)
    logo_mode = str(ctx.p("logo_mode", "facade_blade"))
    podium_floors = max(2, min(4, storeys - 2))
    t1_floors = max(3, min(5, storeys - 1))
    t2_floors = max(2, min(4, storeys - 2))
    t3_floors = max(2, min(3, storeys - 3))

    apron = Mass(0.0, 1.8, 0.0, W - 2.0, D - 5.2, 0.0)
    base, lawn_z, walk_y = _site(ctx, apron, walk_depth=4.2)

    # Podium wings (L-shape) — wing offsets shift silhouette per company
    A = Mass(-10.0 + ox, -7.0 + oy * 0.5, base, 30.0, 14.0, sh * podium_floors)
    B = Mass(-17.0 + ox * 0.6, 8.75 + oy, base, 16.0, 17.5, sh * podium_floors)
    for name, m in (("A", A), ("B", B)):
        block(ctx, name, m, "brand")
        floor_lines(ctx, name, m, [base + sh * k for k in range(1, podium_floors)], "cream", thick=0.4, proud=0.26)
    a_roof = flat_roof(ctx, "A", A, parapet_mat="cream", parapet_h=0.7)
    b_roof = flat_roof(ctx, "B", B, parapet_mat="cream", parapet_h=0.7)

    af, al = A.face("front"), A.face("left")
    ent_u = 2.0 + ox * 0.3
    ent_w = 6.0
    ent_h = sh * 1.85
    entrance(ctx, "A.entrance", af, ent_u, base, ent_w, ent_h, "charcoal", "glass", "paver", canopy_mat="cream", canopy_strip="brand", steps=3, depth=0.9)
    storefront(ctx, "A.shop.l", af, base, sh * 0.92, "glass", "cream", "cream_dark", u0=-8.0, span=12.0, cols=4 if gb < 0.6 else 5)
    awning(ctx, "A.awning.l", af, -8.0, base + sh * 0.82, 12.6, "coral", stripe_mat="cream", stripes=6, glow_mat="glow")
    storefront(ctx, "A.shop.r", af, base, sh * 0.92, "glass", "cream", "cream_dark", u0=10.0, span=8.0, cols=3)
    awning(ctx, "A.awning.r", af, 10.0, base + sh * 0.82, 8.6, "coral", stripe_mat="cream", stripes=4, glow_mat="glow")
    fascia_sign(ctx, "A.fascia", af, ent_u, base + ent_h + 2.3, 11.0, 1.3, "charcoal", "sign", text)
    for fi in range(1, podium_floors):
        skip = (3, 4) if fi == 1 else ()
        window_row(ctx, f"A.front.f{fi}", af, base + sh * fi, sh, max(5, cols + 2), frame, "glass", glass_bias=gb, span=A.w - 2.0, skip=skip, z_frac=0.6)
    window_grid(ctx, "A.left", al, base, sh, list(range(podium_floors)), cols, frame, "glass", glass_bias=gb)
    window_grid(ctx, "B.left", B.face("left"), base, sh, list(range(podium_floors)), cols + 1, frame, "glass", glass_bias=gb)
    window_grid(ctx, "B.back", B.face("back"), base, sh, list(range(podium_floors)), cols, frame, "glass", glass_bias=gb)
    window_grid(ctx, "B.court", B.face("right"), base, sh, list(range(podium_floors)), cols, frame, "glass", glass_bias=gb)
    if style in ("band", "mixed"):
        horizontal_bands(ctx, "A.front.bands", af, [base + sh * podium_floors - 0.5], "cream", span=A.w + 0.4)

    # Tower — stacked cubes (rotated crown) or classic setback
    T1 = Mass(12.0 + ox * 0.35, 7.0 + oy * 0.35, base, 18.0, 18.0, sh * t1_floors)
    block(ctx, "T1", T1, "brand")
    floor_lines(ctx, "T1", T1, [base + sh * k for k in range(1, t1_floors)], "cream", thick=0.4, proud=0.26)
    t1_levels = [base + sh * k for k in range(1, t1_floors)]
    _tower_facade(ctx, "T1", T1, ("left", "right", "back"), list(range(t1_floors)), cols, frame, style=style if style != "band" else "none", levels=t1_levels)
    # big wordmark on the T1 face rising above wing A
    wordmark_on_face(ctx, "T1.wordmark", text, T1.face("front"), 0.0, a_roof + 1.3, ctx.letters_on_brand, s=2.3, depth=0.36, max_w=T1.w - 2.0)
    z = trim_slab(ctx, "T1", T1, "cream", t=0.8, proud=0.5)

    if tower_style == "setback":
        T2 = Mass(12.0 + ox * 0.2, 7.0 + oy * 0.2, z, 14.5, 14.5, sh * t2_floors)
        rot3 = 0.0
        T3 = Mass(12.0, 7.0, 0.0, 10.5, 10.5, sh * t3_floors)
    else:
        off = 0.6 + 1.6 * skew + abs(ox) * 0.15
        T2 = Mass(12.0 + off, 7.0 + off * 0.6, z, 15.0, 15.0, sh * t2_floors)
        rot3 = math.radians(18.0 + 24.0 * skew)
        T3 = Mass(12.0, 7.4, 0.0, 12.5, 12.5, sh * t3_floors)
    block(ctx, "T2", T2, "coral")
    floor_lines(ctx, "T2", T2, [T2.z0 + sh * k for k in range(1, t2_floors)], "cream", thick=0.4, proud=0.26)
    _tower_facade(ctx, "T2", T2, ("front", "left", "right", "back"), list(range(t2_floors)), cols, ctx.accent_frame, style=style, levels=[T2.z0 + sh * k for k in range(1, t2_floors)], skip_by_face={"front": (1,)})
    logo_on_face(ctx, "logo.facade", T2.face("front"), 0.0, T2.z0 + T2.h * 0.5, min(6.0, T2.h * 0.42), backing_mat="cream", out=0.5)
    z = trim_slab(ctx, "T2", T2, "cream", t=0.8, proud=0.5)
    T3 = Mass(T3.x, T3.y, z, T3.w, T3.d, T3.h)
    block(ctx, "T3", T3, "brand", rot_z=rot3)
    # crown: rotated parapet ring (built as a slightly larger thin frame) + logo + props
    ctx.box("T3.crown", T3.w + 0.5, T3.d + 0.5, 0.7, (T3.x, T3.y, T3.top + 0.35), "cream", bevel=0.1, kind="roof", rot=(0, 0, rot3))
    ctx.box("T3.crown.roof", T3.w - 0.6, T3.d - 0.6, 0.3, (T3.x, T3.y, T3.top + 0.7 + 0.15), "roof", kind="roof", rot=(0, 0, rot3))
    t3_roof = T3.top + 1.0
    # windows on the rotated cube
    for side in ("front", "left", "right", "back"):
        f = T3.face(side)
        for fl in range(t3_floors):
            for c in range(2):
                u = -T3.w * 0.22 + c * T3.w * 0.44
                zc = T3.z0 + sh * (fl + 0.55)
                loc, dims = f.place(u, zc, sh * 0.62, 0.22, sh * 0.62)
                loc = _rot_about(loc, (T3.x, T3.y), rot3)
                ctx.box(f"T3.{side}.win.{fl}.{c}.frame", *dims, loc, frame, bevel=0.05, kind="window", rot=(0, 0, rot3))
                gl, gd = f.place(u, zc, sh * 0.62 - 0.4, 0.06, sh * 0.62 - 0.4, out=0.2)
                gl = _rot_about(gl, (T3.x, T3.y), rot3)
                ctx.box(f"T3.{side}.win.{fl}.{c}.glass", *gd, gl, "glass", kind="window", rot=(0, 0, rot3))

    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(22.0, -16.5),
        plaza_z=lawn_z,
        roof_xy=(T3.x, T3.y),
        roof_z=t3_roof,
        facade_face=T2.face("front"),
        facade_u=-T2.w * 0.35,
        facade_z0=T2.z0,
        facade_h=T2.h,
        roof_size=T3.w * 0.42,
        always_roof_plaque=True,
    )
    # Extra wing roof plaque for enterprise landmark read
    logo_flat(ctx, "logo.roof.wing", A.x0 + 4.0, A.y, a_roof, 6.5, backing_mat="cream")
    hvac_unit(ctx, "T3.roof.hvac", T3.x + 3.05, T3.y - 3.05, t3_roof, w=2.0, d=1.5, h=1.2)
    satellite_dish(ctx, "T3.roof.dish", T3.x - 3.2, T3.y + 3.2, t3_roof)
    if ctx.p("motion_accent", False):
        beacon_mast(ctx, "T3.roof.beacon", T3.x + 3.2, T3.y + 3.2, t3_roof, h=7.0, motion=True)
    else:
        beacon_mast(ctx, "T3.roof.mast", T3.x + 3.2, T3.y + 3.2, t3_roof, h=5.5, motion=False, orb="coral")

    # Sky bridge B → T1 across the courtyard
    sky_bridge(ctx, "bridge", B.x1 - 0.2, T1.x0 + 0.2, (B.y + T1.y) / 2, base + sh * min(2, podium_floors - 1), d=3.8, h=sh * 0.8)

    # Roofs of the wings — crowded
    solar_array(ctx, "A.roof.solar", A.x + 4.0, A.y - 1.5, a_roof, 3, 5)
    hvac_unit(ctx, "A.roof.hvac.a", A.x + 11.5, A.y + 3.5, a_roof)
    hvac_unit(ctx, "A.roof.hvac.b", A.x + 11.5, A.y - 4.0, a_roof, w=1.8, d=1.4, h=1.1)
    water_tank(ctx, "A.roof.tank", A.x0 + 2.0, A.y + 4.0, a_roof)
    satellite_dish(ctx, "A.roof.dish", A.x0 + 1.8, A.y - 4.8, a_roof)
    roof_access_box(ctx, "A.roof.access", A.x - 2.5, A.y + 4.4, a_roof)
    for i, x in enumerate((A.x + 7.5, A.x + 1.0)):
        vent_stack(ctx, f"A.roof.vent.{i}", x, A.y0 + 1.5, a_roof, h=1.2 + 0.3 * i)
    helipad(ctx, "B.roof.helipad", B.x, B.y + 1.25, b_roof, r=4.6)
    water_tank(ctx, "B.roof.tank", B.x0 + 2.2, B.y1 - 2.5, b_roof, r=1.1, h=2.2)
    rooftop_billboard(ctx, "B.roof.billboard", B.x, B.y0 + 1.5, b_roof, text, w=10.0, h=3.6, lift=2.4, panel="cream", letters="charcoal")
    if density > 0.6:
        hvac_unit(ctx, "B.roof.hvac", B.x1 - 2.5, B.y1 - 2.5, b_roof, w=1.8, d=1.4, h=1.1)

    # Courtyard between B and the tower
    n_av = int(ctx.p("avatar_count", 0)) or int(ctx.p("sculpture_count", 0))
    if n_av:
        avatar_orbs(ctx, "court.avatars", -3.0 + ox * 0.2, 6.0, base, n_av, spacing=3.2)
    blob_tree(ctx, "court.tree.a", -6.0, 14.5, base, s=0.9)
    blob_tree(ctx, "court.tree.b", 0.5, 15.5, base, s=0.8)
    bench(ctx, "court.bench.a", -6.0, 3.0, base)
    bench(ctx, "court.bench.b", 0.0, 3.0, base)
    hedge(ctx, "court.hedge", -3.0, 17.2, base, 11.0)

    # Street + plot props
    pole_sign(ctx, "sign.pole", 24.0, -17.2, lawn_z, text, h=10.5, panel_w=6.0, panel_h=2.6, with_logo=False)
    parking_row(ctx, "cars.r", 8.0, 21.0, -17.2, lawn_z + 0.14, 3, rng=ctx.rng)
    parking_row(ctx, "cars.l", -25.0, -17.0, -17.2, lawn_z + 0.14, 2, rng=ctx.rng)
    for i, x in enumerate((-13.0, -3.0)):
        planter(ctx, f"planter.{i}", x, -15.6, lawn_z, w=1.5)
    for i in range(4):
        bollard(ctx, f"bollard.{i}", -12.0 + i * 2.7, -16.0, lawn_z)
    lamp(ctx, "lamp.a", -20.0, -16.6, lawn_z)
    lamp(ctx, "lamp.b", 8.0, -16.6, lawn_z)
    blob_tree(ctx, "tree.a", -26.0, 18.0, lawn_z, s=1.15)
    blob_tree(ctx, "tree.b", 24.5, 12.0, lawn_z, s=1.05)
    blob_tree(ctx, "tree.c", 24.5, 0.5, lawn_z, s=0.95)
    blob_tree(ctx, "tree.d", 24.5, -10.5, lawn_z, s=1.0)
    blob_tree(ctx, "tree.e", -26.0, -12.0, lawn_z, s=0.9)
    for i, y in enumerate((-2.0, 3.0, 8.0, 13.0)):
        shrub(ctx, f"shrub.l.{i}", -26.4, y, lawn_z, s=0.9)
    for i, x in enumerate((5.0, 9.0, 13.0, 17.0)):
        shrub(ctx, f"shrub.r.{i}", x, 17.6, lawn_z, s=0.85)
    if symmetric:
        for i, x in enumerate((-22.0, -16.0, 2.0, 6.0)):
            planter(ctx, f"formal.planter.{i}", x, -15.6, lawn_z, w=1.3)

    _anchors(ctx, entrance_xyz=(A.x + ent_u, A.y0, base), roof_center_xy=(T3.x, T3.y), roof_z=t3_roof)


# ---------------------------------------------------------------------------
# courtyard_campus — U-wings + mixed heights around a planted court
# ---------------------------------------------------------------------------


def courtyard_campus(ctx) -> None:
    """Large-square campus: front bar, two wings of different height, rear link, corner tower."""
    W, D = ctx.W, ctx.D
    sh = ctx.storey
    storeys = _storeys(ctx, 3)
    ox, oy = _wing(ctx)
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = max(0.35, min(0.95, float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))))
    frame = ctx.frame
    cols = _win_cols(ctx, 4)
    logo_mode = str(ctx.p("logo_mode", "facade_blade"))
    style = str(ctx.p("facade_style", "fins"))

    apron = Mass(0.0, 1.0, 0.0, W - 2.6, D - 5.0, 0.0)
    base, lawn_z, _walk = _site(ctx, apron, walk_depth=3.8)

    front_d = min(12.0, max(9.0, D * 0.20))
    wing_t = min(12.0, max(8.6, W * 0.18))
    y_front = -D / 2 + 4.4 + front_d / 2
    F = Mass(ox * 0.2, y_front + oy * 0.12, base, W - 5.2, front_d, sh * 2)

    back_limit = D / 2 - 2.4
    left_d = max(16.0, back_limit - F.y1 + 1.8)
    Lw = Mass(F.x0 + wing_t / 2 + ox * 0.25, F.y1 + left_d / 2 - 1.8, base, wing_t, left_d, sh * max(3, storeys))
    right_d = max(14.0, left_d * 0.72)
    Rw = Mass(F.x1 - wing_t / 2 + ox * 0.12, F.y1 + right_d / 2 - 1.8, base, wing_t, right_d, sh * 2)
    rear_w = max(16.0, Rw.x0 - Lw.x1 + wing_t * 0.35)
    rear_d = min(10.0, max(7.5, D * 0.14))
    R = Mass((Lw.x1 + Rw.x0) / 2, Lw.y1 - rear_d / 2 + 0.5, base, rear_w, rear_d, sh * 1.15)
    tw = min(11.0, wing_t)
    T = Mass(Rw.x, min(Rw.y1 - tw / 2 + 1.0, back_limit - tw / 2), base, tw, tw, sh * (storeys + 1))

    for name, m, mat, floors in (
        ("F", F, "brand", 2),
        ("L", Lw, "brand", max(3, storeys)),
        ("Rwing", Rw, "coral", 2),
        ("Rear", R, "cream_dark", 1),
        ("T", T, "brand", storeys + 1),
    ):
        block(ctx, name, m, mat)
        if floors > 1:
            floor_lines(ctx, name, m, [base + sh * k for k in range(1, floors)], "cream")

    f_roof = flat_roof(ctx, "F", F, parapet_mat="cream", parapet_h=0.6)
    l_roof = _apply_main_roof(ctx, "L", Lw, default="parapet")
    rw_roof = flat_roof(ctx, "Rwing", Rw, parapet_mat="cream", parapet_h=0.55)
    r_roof = flat_roof(ctx, "Rear", R, parapet_mat="cream", parapet_h=0.4)
    t_roof = flat_roof(ctx, "T", T, parapet_mat="cream", parapet_h=0.7)

    ff = F.face("front")
    storefront(ctx, "F.shop.l", ff, base, sh * 0.95, "glass", "cream", "cream_dark", u0=-F.w * 0.22, span=F.w * 0.32, cols=4)
    awning(ctx, "F.awning.l", ff, -F.w * 0.22, base + sh * 0.84, F.w * 0.34, "coral", stripe_mat="cream", stripes=5, glow_mat="glow")
    storefront(ctx, "F.shop.r", ff, base, sh * 0.95, "glass", "cream", "cream_dark", u0=F.w * 0.26, span=F.w * 0.22, cols=3)
    awning(ctx, "F.awning.r", ff, F.w * 0.26, base + sh * 0.84, F.w * 0.24, "coral", stripe_mat="cream", stripes=3, glow_mat="glow")
    entrance(ctx, "F.entrance", ff, 0.0, base, 4.4, sh * 1.7, "charcoal", "glass", "paver", canopy_mat="cream", canopy_strip="brand", steps=3)
    fascia_sign(ctx, "F.fascia", ff, 0.0, base + sh * 1.85, min(14.0, F.w * 0.4), 1.2, "charcoal", "sign", text)
    window_row(ctx, "F.front.f1", ff, base + sh, sh, max(6, cols + 2), frame, "glass", glass_bias=gb, span=F.w - 2.4)
    window_grid(ctx, "L.court", Lw.face("right"), base, sh, list(range(max(3, storeys))), cols, frame, "glass", glass_bias=gb)
    window_grid(ctx, "L.left", Lw.face("left"), base, sh, list(range(max(3, storeys))), cols, frame, "glass", glass_bias=gb)
    window_grid(ctx, "Rw.court", Rw.face("left"), base, sh, list(range(2)), max(3, cols - 1), ctx.accent_frame, "glass", glass_bias=gb)
    window_grid(ctx, "Rw.right", Rw.face("right"), base, sh, list(range(2)), max(3, cols - 1), ctx.accent_frame, "glass", glass_bias=gb)
    _tower_facade(ctx, "T", T, ("front", "left", "right", "back"), list(range(storeys + 1)), max(2, cols - 1), frame, style=style if style != "slots" else "fins", levels=[base + sh * k for k in range(1, storeys + 1)])

    # Inner terraces looking into the court
    balcony(ctx, "L.balcony", Lw.face("right"), 0.0, base + sh * 2, min(8.0, Lw.d * 0.4), depth=1.6)
    balcony(ctx, "Rw.balcony", Rw.face("left"), 0.0, base + sh, min(7.0, Rw.d * 0.45), depth=1.5)
    roof_deck(ctx, "F.deck", F.x * 0.2, F.y, f_roof, min(14.0, F.w * 0.35), min(6.5, F.d * 0.55))

    court_x = (Lw.x1 + Rw.x0) / 2
    court_y = (F.y1 + min(Lw.y1, Rw.y1)) / 2
    sky_bridge(ctx, "bridge", Lw.x1 - 0.15, Rw.x0 + 0.15, court_y + 2.0, base + sh * 1.05, d=3.4, h=sh * 0.75)

    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(F.x1 - 4.0, F.y0 - 2.2),
        plaza_z=lawn_z,
        roof_xy=(T.x, T.y),
        roof_z=t_roof,
        facade_face=T.face("front"),
        facade_u=0.0,
        facade_z0=base + sh,
        facade_h=T.h - sh,
        roof_size=T.w * 0.42,
        always_roof_plaque=True,
    )
    solar_array(ctx, "L.roof.solar", Lw.x, Lw.y - 2.0, l_roof, 2, 4)
    hvac_unit(ctx, "L.roof.hvac", Lw.x, Lw.y + left_d * 0.22, l_roof)
    satellite_dish(ctx, "T.roof.dish", T.x - 2.4, T.y + 2.2, t_roof)
    water_tank(ctx, "Rear.tank", R.x0 + 2.2, R.y, r_roof, r=1.0, h=1.9)
    vent_stack(ctx, "Rw.vent", Rw.x, Rw.y, rw_roof)
    if density > 0.55:
        rooftop_billboard(ctx, "L.billboard", Lw.x, Lw.y0 + 1.4, l_roof, text, w=8.5, h=2.8, lift=1.8, panel="cream", letters="charcoal")
    if ctx.p("motion_accent", False):
        beacon_mast(ctx, "T.beacon", T.x + 2.4, T.y + 2.4, t_roof, h=6.2, motion=True)

    pole_sign(ctx, "sign.pole", F.x0 + 2.4, F.y0 - 2.6, lawn_z, text, h=9.2, panel_w=5.4, panel_h=2.3, with_logo=False)
    parking_row(ctx, "cars", F.x - 10.0, F.x + 6.0, F.y0 - 2.8, lawn_z + 0.14, 3, rng=ctx.rng)
    blob_tree(ctx, "court.tree.a", court_x - 3.2, court_y, base, s=0.95)
    blob_tree(ctx, "court.tree.b", court_x + 3.4, court_y + 2.2, base, s=0.85)
    blob_tree(ctx, "court.tree.c", court_x, court_y + 5.0, base, s=0.75)
    bench(ctx, "court.bench.a", court_x - 1.2, court_y - 2.4, base)
    bench(ctx, "court.bench.b", court_x + 2.4, court_y - 2.4, base)
    hedge(ctx, "court.hedge", court_x, min(Lw.y1, Rw.y1) - 1.2, base, min(12.0, rear_w * 0.6))
    planter(ctx, "F.planter.l", F.x - 6.0, F.y0 - 1.4, lawn_z, w=1.3)
    planter(ctx, "F.planter.r", F.x + 6.0, F.y0 - 1.4, lawn_z, w=1.3)
    lamp(ctx, "lamp.l", F.x0 + 3.0, F.y0 - 2.0, lawn_z)
    lamp(ctx, "lamp.r", F.x1 - 3.0, F.y0 - 2.0, lawn_z)
    blob_tree(ctx, "edge.tree.a", Lw.x0 - 1.6, Lw.y, lawn_z, s=1.0)
    blob_tree(ctx, "edge.tree.b", Rw.x1 + 1.6, Rw.y, lawn_z, s=0.9)
    blob_tree(ctx, "edge.tree.c", R.x, min(D / 2 - 2.0, R.y1 + 1.4), lawn_z, s=0.85)
    for i in range(3):
        bollard(ctx, f"bollard.{i}", F.x - 4.0 + i * 2.4, F.y0 - 1.8, lawn_z)

    _anchors(ctx, entrance_xyz=(F.x, F.y0, base), roof_center_xy=(T.x, T.y), roof_z=max(t_roof, l_roof))


# ---------------------------------------------------------------------------
# low_rise_strip — wide + shallow retail / studio ribbon
# ---------------------------------------------------------------------------


def low_rise_strip(ctx) -> None:
    """Horizontal headquarters: long two-storey frontage + taller end pavilion + rear service."""
    W, D = ctx.W, ctx.D
    sh = ctx.storey
    storeys = _storeys(ctx, 2)
    ox, oy = _wing(ctx)
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = max(0.35, min(0.95, float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))))
    frame = ctx.frame
    cols = _win_cols(ctx, 8)
    logo_mode = str(ctx.p("logo_mode", "plaza_totem"))

    apron = Mass(0.0, 0.6, 0.0, W - 2.2, D - 3.6, 0.0)
    base, lawn_z, _walk = _site(ctx, apron, walk_depth=3.2)

    main_d = min(11.4, max(8.8, D * 0.44))
    pav_w = min(13.5, max(10.0, W * 0.15))
    y_main = -D / 2 + 4.6 + main_d / 2 + oy * 0.15
    A = Mass(-1.0 + ox * 0.2, y_main, base, W - 8.0 - pav_w, main_d, sh * storeys)
    P = Mass(min(A.x1 + pav_w / 2 - 1.1, W / 2 - pav_w / 2 - 1.6), y_main - 0.6, base, pav_w, main_d + 1.4, sh * (storeys + 1))
    S = Mass(A.x0 + min(A.w, 22.0) * 0.28, A.y1 + 3.2 + oy * 0.1, base, min(22.0, A.w * 0.38), min(6.4, D * 0.22), sh * 1.05)

    block(ctx, "A", A, "brand")
    floor_lines(ctx, "A", A, [base + sh * k for k in range(1, storeys)], "cream")
    block(ctx, "P", P, "coral")
    floor_lines(ctx, "P", P, [base + sh * k for k in range(1, storeys + 1)], "cream")
    block(ctx, "S", S, "cream_dark", bevel=0.2)

    a_roof = flat_roof(ctx, "A", A, parapet_mat="cream", parapet_h=0.55)
    p_roof = _apply_main_roof(ctx, "P", P, default="pitch")
    parapet(ctx, "S", S, "cream", h=0.4, t=0.3)

    af = A.face("front")
    bay = A.w / 3.2
    storefront(ctx, "A.shop.a", af, base, sh * 0.92, "glass", "cream", "cream_dark", u0=-bay * 0.95, span=bay * 0.9, cols=4)
    awning(ctx, "A.awning.a", af, -bay * 0.95, base + sh * 0.82, bay * 0.96, "coral", stripe_mat="cream", stripes=4, glow_mat="glow")
    storefront(ctx, "A.shop.b", af, base, sh * 0.92, "glass", "cream", "cream_dark", u0=bay * 0.15, span=bay * 0.85, cols=3)
    awning(ctx, "A.awning.b", af, bay * 0.15, base + sh * 0.82, bay * 0.9, "coral", stripe_mat="cream", stripes=3, glow_mat="glow")
    entrance(ctx, "A.entrance", af, -bay * 0.15, base, 3.6, sh * 0.95, "charcoal", "glass", "paver", canopy_mat="cream", canopy_strip="brand", steps=2)
    fascia_sign(ctx, "A.fascia", af, 0.0, base + sh * 1.05, min(16.0, A.w * 0.42), 1.15, "charcoal", "sign", text)
    for fi in range(1, storeys):
        window_row(ctx, f"A.front.f{fi}", af, base + sh * fi, sh, max(8, cols), frame, "glass", glass_bias=gb, span=A.w - 2.2)
    window_row(ctx, "A.back", A.face("back"), base + 0.5, sh, max(6, cols - 2), "charcoal", "glass", glass_bias=gb, span=A.w - 2.4)

    pf = P.face("front")
    storefront(ctx, "P.shop", pf, base, sh * 0.9, "glass", "cream", "cream_dark", u0=0.0, span=P.w - 2.2, cols=3)
    awning(ctx, "P.awning", pf, 0.0, base + sh * 0.8, P.w - 1.6, "brand", stripe_mat="cream", stripes=3, glow_mat="glow")
    window_grid(ctx, "P.front", pf, base, sh, list(range(1, storeys + 1)), 3, ctx.accent_frame, "glass", glass_bias=gb, margin=0.9)
    window_grid(ctx, "P.right", P.face("right"), base, sh, list(range(storeys + 1)), 2, ctx.accent_frame, "glass", glass_bias=gb, margin=0.85)
    balcony(ctx, "P.balcony", pf, 0.0, base + sh * storeys, min(6.5, P.w - 2.4), depth=1.45)
    logo_on_face(ctx, "logo.facade", pf, 0.0, base + sh * storeys * 0.55, min(3.2, sh * 0.8), backing_mat="cream")

    window_row(ctx, "S.back", S.face("back"), base, S.h, 3, "charcoal", "glass", z_frac=0.55, glass_bias=gb)

    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(A.x0 + 3.0, A.y0 - 2.4),
        plaza_z=lawn_z,
        roof_xy=(P.x, P.y),
        roof_z=p_roof if isinstance(p_roof, float) else a_roof,
        facade_face=af,
        facade_u=-bay * 0.6,
        facade_z0=base + sh,
        facade_h=sh,
        roof_size=P.w * 0.5,
        always_roof_plaque=True,
    )
    solar_array(ctx, "A.roof.solar", A.x - A.w * 0.15, A.y, a_roof, 2, 6)
    hvac_unit(ctx, "A.roof.hvac.a", A.x + A.w * 0.22, A.y - 1.4, a_roof)
    if density > 0.5:
        hvac_unit(ctx, "A.roof.hvac.b", A.x + A.w * 0.08, A.y + 1.6, a_roof, w=1.6, d=1.2, h=1.0)
    satellite_dish(ctx, "P.roof.dish", P.x - 2.0, P.y + 1.6, a_roof + 0.2)
    water_tank(ctx, "S.tank", S.x1 - 1.6, S.y, S.top, r=0.9, h=1.7)
    vent_stack(ctx, "A.vent", A.x - A.w * 0.3, A.y + 1.5, a_roof)
    rooftop_billboard(ctx, "A.billboard", A.x + A.w * 0.12, A.y0 + 0.8, a_roof, text, w=9.0, h=2.6, lift=1.6, panel="cream", letters="charcoal")

    pole_sign(ctx, "sign.pole", A.x0 + 2.2, A.y0 - 2.5, lawn_z, text, h=8.0, panel_w=5.0, panel_h=2.1, with_logo=False)
    parking_row(ctx, "cars", A.x - 16.0, A.x + 12.0, A.y0 - 2.6, lawn_z + 0.14, 4, rng=ctx.rng)
    for i, x in enumerate((A.x - A.w * 0.35, A.x, A.x + A.w * 0.28)):
        planter(ctx, f"planter.{i}", x, A.y0 - 1.35, lawn_z, w=1.15)
        blob_tree(ctx, f"tree.front.{i}", x + 2.2, A.y0 - 1.5, lawn_z, s=0.72 + 0.08 * i)
    blob_tree(ctx, "tree.l", A.x0 - 1.5, A.y, lawn_z, s=0.9)
    blob_tree(ctx, "tree.r", P.x1 + 1.5, P.y, lawn_z, s=0.85)
    hedge(ctx, "hedge.rear", S.x, min(D / 2 - 1.4, S.y1 + 1.3), lawn_z, min(24.0, A.w * 0.5))
    bench(ctx, "bench", A.x - 4.0, A.y0 - 1.2, base)
    lamp(ctx, "lamp.l", A.x0 + 4.0, A.y0 - 2.2, lawn_z)
    lamp(ctx, "lamp.r", P.x, P.y0 - 2.0, lawn_z)
    for i in range(4):
        bollard(ctx, f"bollard.{i}", A.x - 6.0 + i * 2.2, A.y0 - 1.7, lawn_z)

    _anchors(ctx, entrance_xyz=(A.x - bay * 0.15, A.y0, base), roof_center_xy=(P.x, P.y), roof_z=max(a_roof, p_roof if isinstance(p_roof, float) else a_roof))


# ---------------------------------------------------------------------------
# industrial_hall — narrow + deep office head + long sawtooth hall
# ---------------------------------------------------------------------------


def industrial_hall(ctx) -> None:
    """Deep plot: street-facing office / lab head, long connected hall, loading dock."""
    W, D = ctx.W, ctx.D
    sh = ctx.storey
    storeys = _storeys(ctx, 3)
    ox, oy = _wing(ctx)
    text = ctx.p("wordmark", "HQ")
    density = float(ctx.p("prop_density", 0.7))
    gb = max(0.35, min(0.95, float(ctx.p("glass_bias", 0.5)) * float(ctx.p("window_density", 1.0))))
    frame = ctx.frame
    cols = _win_cols(ctx, 4)
    logo_mode = str(ctx.p("logo_mode", "roof_deck"))
    roof_mod = _roof_module(ctx, "pitch")

    apron = Mass(0.0, 1.4, 0.0, W - 2.4, D - 4.4, 0.0)
    base, lawn_z, _walk = _site(ctx, apron, walk_depth=3.6)

    head_d = min(16.0, max(12.0, D * 0.22))
    y_head = -D / 2 + 4.8 + head_d / 2
    H = Mass(ox * 0.2, y_head + oy * 0.1, base, min(W - 5.0, W * 0.84), head_d, sh * storeys)
    hall_w = min(H.w * 0.78, W - 8.0)
    hall_d = max(22.0, (D / 2 - 2.4) - H.y1 + 1.6)
    L = Mass(H.x + ox * 0.1, H.y1 + hall_d / 2 - 1.6, base, hall_w, hall_d, sh * 1.85)
    dock_w = 5.0
    dock = Mass(max(L.x0 - 2.2, -W / 2 + dock_w / 2 + 1.4), L.y - hall_d * 0.12, base + 0.2, dock_w, min(10.0, hall_d * 0.28), sh * 0.85)

    block(ctx, "H", H, "brand")
    floor_lines(ctx, "H", H, [base + sh * k for k in range(1, storeys)], "cream")
    block(ctx, "L", L, "cream_dark", bevel=0.22)
    floor_lines(ctx, "L", L, [base + sh], "cream", thick=0.3, proud=0.2)
    block(ctx, "Dock", dock, "charcoal", bevel=0.16)

    h_roof = flat_roof(ctx, "H", H, parapet_mat="cream", parapet_h=0.65)
    if roof_mod == "barrel":
        hall_top = barrel_vault(ctx, "L.vault", L.x, L.y, L.top + 0.12, L.w - 1.0, min(L.d * 0.7, 16.0), "brand", "cream", slats=7, rise=min(5.2, sh * 1.2), end_mat="coral")
        parapet(ctx, "L", L, "cream", h=0.4)
    else:
        hall_top = sawtooth_roof(ctx, "L.roof", Mass(L.x, L.y, L.top, L.w - 0.8, L.d - 1.0, 0.0), max(3, min(6, int(L.w / 5.5))), "cream", "glass", "coral", rise=sh * 0.9)
        parapet(ctx, "L", L, "cream", h=0.35)

    hf = H.face("front")
    storefront(ctx, "H.shop", hf, base, sh * 0.95, "glass", "cream", "cream_dark", u0=-H.w * 0.18, span=H.w * 0.42, cols=4)
    awning(ctx, "H.awning", hf, -H.w * 0.18, base + sh * 0.84, H.w * 0.46, "coral", stripe_mat="cream", stripes=5, glow_mat="glow")
    entrance(ctx, "H.entrance", hf, H.w * 0.22, base, 3.8, sh * 1.55, "charcoal", "glass", "paver", canopy_mat="cream", canopy_strip="brand", steps=3)
    fascia_sign(ctx, "H.fascia", hf, 0.0, base + sh * 1.7, min(12.0, H.w * 0.5), 1.2, "charcoal", "sign", text)
    for fi in range(1, storeys):
        window_row(ctx, f"H.front.f{fi}", hf, base + sh * fi, sh, max(4, cols), frame, "glass", glass_bias=gb, span=H.w - 2.2)
    window_grid(ctx, "H.right", H.face("right"), base, sh, list(range(storeys)), 3, frame, "glass", glass_bias=gb)
    window_grid(ctx, "H.left", H.face("left"), base, sh, list(range(storeys)), 3, frame, "glass", glass_bias=gb)
    balcony(ctx, "H.balcony", hf, -H.w * 0.08, base + sh * 2, min(8.0, H.w * 0.35), depth=1.5)

    lf, lb = L.face("left"), L.face("back")
    n_ind = max(4, min(8, int(L.d / 4.5)))
    for i in range(n_ind):
        u = -L.d * 0.38 + L.d * 0.76 * (i + 0.5) / n_ind
        industrial_window(ctx, f"L.left.{i}", lf, u, base + sh * 0.95, 3.4, sh * 0.7, frame, "glass", panes_x=3, panes_y=2)
    for i in range(max(3, cols)):
        u = -L.w * 0.32 + L.w * 0.64 * (i + 0.5) / max(3, cols)
        industrial_window(ctx, f"L.back.{i}", lb, u, base + sh * 0.9, 3.6, sh * 0.66, frame, "glass", panes_x=3, panes_y=2)
    # loading door on dock
    df = dock.face("left")
    dl, dd = df.place(0.0, dock.z0 + dock.h * 0.42, 3.2, 0.18, dock.h * 0.7)
    ctx.box("Dock.door", *dd, dl, "metal", bevel=0.04, kind="door")
    awning(ctx, "Dock.canopy", df, 0.0, dock.z0 + dock.h * 0.88, 4.6, "coral", depth=2.2, drop=0.7, stripe_mat="cream", stripes=3)

    mural = accent_wall(ctx, "L.mural", L.face("right"), "coral", t=0.4, inset=0.3)
    wordmark_on_face(ctx, "L.mural.text", text, mural, 0.0, base + 1.2, ctx.letters_on_accent, s=2.1, depth=0.28, max_w=min(16.0, mural.length - 2.0))

    place_brand_logo_complements(
        ctx,
        mode=logo_mode,
        text=text,
        plaza_xy=(H.x1 - 3.2, H.y0 - 2.3),
        plaza_z=lawn_z,
        roof_xy=(H.x, H.y),
        roof_z=h_roof,
        facade_face=hf,
        facade_u=H.w * 0.22,
        facade_z0=base + sh,
        facade_h=sh * max(1, storeys - 1),
        roof_size=H.w * 0.36,
        always_roof_plaque=True,
    )
    solar_array(ctx, "H.solar", H.x - 4.0, H.y, h_roof, 2, 3)
    hvac_unit(ctx, "H.hvac", H.x + 5.0, H.y - 2.0, h_roof)
    hvac_unit(ctx, "L.hvac", L.x + hall_w * 0.22, L.y - 4.0, L.top + 0.15, w=1.8, d=1.4, h=1.15)
    satellite_dish(ctx, "L.dish", L.x - hall_w * 0.28, L.y + hall_d * 0.28, L.top + 0.15)
    water_tank(ctx, "L.tank", L.x + hall_w * 0.28, L.y + hall_d * 0.3, L.top + 0.15, r=1.05, h=2.1)
    vent_stack(ctx, "L.vent.a", L.x - 3.0, L.y, L.top + 0.15, h=1.4)
    vent_stack(ctx, "L.vent.b", L.x + 3.0, L.y + 4.0, L.top + 0.15, h=1.8)
    roof_access_box(ctx, "L.access", L.x, L.y - hall_d * 0.2, L.top + 0.1)
    if ctx.p("motion_accent", False):
        beacon_mast(ctx, "L.beacon", L.x, L.y1 - 2.2, hall_top, h=6.5, motion=True)
    else:
        beacon_mast(ctx, "L.mast", L.x, L.y1 - 2.2, hall_top, h=5.2, motion=False, orb="coral")

    pole_sign(ctx, "sign.pole", H.x0 + 2.0, H.y0 - 2.5, lawn_z, text, h=8.6, panel_w=5.2, panel_h=2.2, with_logo=False)
    parking_row(ctx, "cars", H.x - 8.0, H.x + 6.0, H.y0 - 2.7, lawn_z + 0.14, 3, rng=ctx.rng)
    blob_tree(ctx, "tree.fl", H.x0 - 1.4, H.y0 + 2.0, lawn_z, s=0.9)
    blob_tree(ctx, "tree.fr", H.x1 + 1.4, H.y0 + 2.0, lawn_z, s=0.85)
    blob_tree(ctx, "tree.ml", L.x0 - 2.6, L.y, lawn_z, s=0.8)
    blob_tree(ctx, "tree.back", L.x, min(D / 2 - 1.8, L.y1 + 1.5), lawn_z, s=0.95)
    hedge(ctx, "hedge.r", min(W / 2 - 1.6, L.x1 + 2.4), L.y, lawn_z, min(22.0, hall_d * 0.55), along="y")
    planter(ctx, "planter.l", H.x - 5.0, H.y0 - 1.3, lawn_z, w=1.2)
    planter(ctx, "planter.r", H.x + 5.0, H.y0 - 1.3, lawn_z, w=1.2)
    bench(ctx, "bench", H.x - 2.4, H.y0 - 1.15, base)
    lamp(ctx, "lamp", H.x + 8.0, H.y0 - 2.1, lawn_z)
    for i in range(3):
        bollard(ctx, f"bollard.{i}", H.x + 2.0 + i * 2.0, H.y0 - 1.7, lawn_z)

    _anchors(ctx, entrance_xyz=(H.x + H.w * 0.22, H.y0, base), roof_center_xy=(L.x, L.y), roof_z=hall_top)


def _rot_about(loc, centre, ang):
    if not ang:
        return loc
    x, y, z = loc
    cx, cy = centre
    dx, dy = x - cx, y - cy
    c, s = math.cos(ang), math.sin(ang)
    return (cx + dx * c - dy * s, cy + dx * s + dy * c, z)


ARCHETYPES = {
    "enterprise_hq": enterprise_hq,
    "smb_block": smb_block,
    "startup_loft": startup_loft,
    "courtyard_campus": courtyard_campus,
    "low_rise_strip": low_rise_strip,
    "industrial_hall": industrial_hall,
}
