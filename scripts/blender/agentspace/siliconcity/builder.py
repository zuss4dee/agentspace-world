"""Build a Silicon City company building from a BrandProfile into the asset library.

Entry: build_from_profile(profile, ...) -> report dict
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import bpy
from mathutils import Vector

from ..brand_profile import BrandProfile, build_spec_from_profile
from ..company_building_spec import BrandSpec, GeneratedBuildingSpec
from ..geom import box, cone, cyl, ensure_collection, ico, link, prism
from ..param_rng import ParamRNG, deterministic_seed
from ..plot_validator import assert_no_interior_kinds, validate_footprint
from ..registry import tag
from .materials import ensure_brand_mats, logo_material

DEFAULT_KIND = "structure"
LIBRARY_EMPTY = "Agentspace_Asset_Library"
BUILDINGS_COLLECTION = "Buildings"


@dataclass
class Ctx:
    """Everything an archetype needs. Primitives/props/signage take `ctx` first."""

    asset_id: str
    profile: BrandProfile
    brand: BrandSpec
    spec: GeneratedBuildingSpec
    seed: int
    rng: ParamRNG
    scale: float
    W: float
    D: float
    site_z: float
    root: Any
    col: Any
    mats: dict[str, Any]
    logo_mat: Any
    params: dict[str, Any] = field(default_factory=dict)
    anchors: dict[str, Any] = field(default_factory=dict)
    counters: dict[str, int] = field(default_factory=dict)
    objects: list[Any] = field(default_factory=list)

    # -- convenience -----------------------------------------------------------

    @property
    def storey(self) -> float:
        """Storey height — scales with tier so big tiers read taller per floor."""
        return round(3.6 * (self.scale / 1.4), 3)

    @property
    def bevel(self) -> float:
        return float(self.params.get("roundness", 0.32))

    def p(self, key: str, default: Any = None) -> Any:
        v = self.params.get(key)
        return default if v is None else v

    def mat(self, m: Any):
        if isinstance(m, str):
            return self.mats[m]
        return m

    @property
    def body_is_dark(self) -> bool:
        return _mat_value(self.mats["brand"]) < 0.30

    @property
    def accent_is_dark(self) -> bool:
        return _mat_value(self.mats["coral"]) < 0.30

    @property
    def frame(self) -> str:
        """Window-frame slot for brand-coloured masses (white on dark bodies, dark on light)."""
        return "cream" if self.body_is_dark else "charcoal"

    @property
    def accent_frame(self) -> str:
        return "cream" if self.accent_is_dark else "charcoal"

    @property
    def letters_on_brand(self) -> str:
        return "sign" if self.body_is_dark else "charcoal"

    @property
    def letters_on_accent(self) -> str:
        return "sign" if self.accent_is_dark else "charcoal"

    # -- object factories ---------------------------------------------------------

    def _cid(self, name: str) -> str:
        n = self.counters.get(name, 0)
        self.counters[name] = n + 1
        return name if n == 0 else f"{name}.{n}"

    def adopt(self, ob, name: str, kind: str = DEFAULT_KIND, *, rot=None):
        cid = self._cid(name)
        ob.name = f"{self.asset_id}.{cid}"
        if ob.data is not None:
            ob.data.name = ob.name
        tag(ob, asset_id=self.asset_id, component_id=f"{self.asset_id}/{cid}", kind=kind, runtime=True)
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
        if ob.parent is None:
            ob.parent = self.root
        if rot is not None:
            ob.rotation_euler = rot
        link(ob, self.col)
        self.objects.append(ob)
        return ob

    def box(self, name, w, d, h, loc, mat, *, bevel=0.0, kind=DEFAULT_KIND, rot=None, uv=0.05):
        ob = box(name, w, d, h, loc, self.mat(mat), self.root, bevel=bevel, uv=uv)
        return self.adopt(ob, name, kind, rot=rot)

    def cyl(self, name, r, h, loc, mat, *, segs=28, kind=DEFAULT_KIND, rot=None):
        ob = cyl(name, r, h, loc, self.mat(mat), self.root, segs=segs)
        return self.adopt(ob, name, kind, rot=rot)

    def cone(self, name, r, h, loc, mat, *, segs=20, kind=DEFAULT_KIND, rot=None):
        ob = cone(name, r, h, loc, self.mat(mat), self.root, segs=segs)
        return self.adopt(ob, name, kind, rot=rot)

    def ico(self, name, r, loc, mat, *, subdiv=2, kind=DEFAULT_KIND):
        ob = ico(name, r, loc, self.mat(mat), self.root, subdiv=subdiv)
        return self.adopt(ob, name, kind)

    def prism(self, name, outline, h, loc, mat, *, kind=DEFAULT_KIND, rot=None):
        ob = prism(name, outline, h, loc, self.mat(mat), self.root)
        return self.adopt(ob, name, kind, rot=rot)


def _mat_value(mat) -> float:
    """Approximate lightness (max linear channel) of a generated material."""
    try:
        img_nodes = [n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
        b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        if img_nodes:
            img = img_nodes[0].image
            px = img.pixels[: 4 * 16]
            vals = [max(px[i], px[i + 1], px[i + 2]) for i in range(0, len(px), 4)]
            return sum(vals) / max(1, len(vals))
        c = b.inputs["Base Color"].default_value
        return max(c[0], c[1], c[2])
    except Exception:
        return 0.5


def remove_asset(asset_id: str) -> int:
    n = 0
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == asset_id:
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data is not None and data.users == 0:
                try:
                    if isinstance(data, bpy.types.Mesh):
                        bpy.data.meshes.remove(data)
                except Exception:
                    pass
            n += 1
    return n


def measure_local_bbox(asset_id: str, root) -> dict[str, Any]:
    root_inv = root.matrix_world.inverted()
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []
    count = 0
    meshes = 0
    for o in bpy.data.objects:
        if o.get("asw_assetId") != asset_id:
            continue
        count += 1
        if o.type != "MESH":
            continue
        meshes += 1
        for corner in o.bound_box:
            loc = root_inv @ (o.matrix_world @ Vector(corner))
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)
    if not xs:
        return {"assetId": asset_id, "objects": count, "meshes": 0, "localMeters": {"w": 0, "d": 0, "h": 0, "z0": 0}}
    return {
        "assetId": asset_id,
        "objects": count,
        "meshes": meshes,
        "localMeters": {
            "w": round(max(xs) - min(xs), 3),
            "d": round(max(ys) - min(ys), 3),
            "h": round(max(zs) - min(zs), 3),
            "z0": round(min(zs), 3),
            "minX": round(min(xs), 3),
            "maxX": round(max(xs), 3),
            "minY": round(min(ys), 3),
            "maxY": round(max(ys), 3),
        },
    }


def _library_targets():
    scene = bpy.context.scene.collection
    lib_empty = bpy.data.objects.get(LIBRARY_EMPTY)
    if lib_empty is None:
        raise RuntimeError(f"{LIBRARY_EMPTY} empty missing — open agentspace-world-multitask.blend")
    lib_col = bpy.data.collections.get(LIBRARY_EMPTY) or ensure_collection(LIBRARY_EMPTY, scene)
    bcol = bpy.data.collections.get(BUILDINGS_COLLECTION) or ensure_collection(BUILDINGS_COLLECTION, lib_col)
    return lib_empty, bcol


def build_from_spec(profile: BrandProfile, spec: GeneratedBuildingSpec, *, logo_path: str | None = None) -> dict[str, Any]:
    from .archetypes import ARCHETYPES  # local import keeps module graph acyclic

    archetype = ARCHETYPES.get(spec.recipe)
    if archetype is None:
        raise ValueError(f"unknown siliconcity archetype: {spec.recipe} (have {sorted(ARCHETYPES)})")

    remove_asset(spec.asset_id)
    lib_empty, bcol = _library_targets()

    root = bpy.data.objects.new(spec.asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 10
    root.parent = lib_empty
    root.location = spec.root_local
    bpy.context.scene.collection.objects.link(root)
    tag(root, asset_id=spec.asset_id, component_id=f"{spec.asset_id}/root", kind="library_root", runtime=False)
    root["asw_staging"] = 1
    root["asw_library"] = 1
    root["asw_libraryRoot"] = 1
    root["asw_companyId"] = profile.company_id
    root["asw_archetype"] = spec.recipe
    link(root, bcol)

    slug = profile.slug
    mats = ensure_brand_mats(slug, spec.mat_defs)
    lpath = logo_path or profile.logo.asset_path or spec.brand.logo.asset_path
    logo_mat = logo_material(slug, lpath)

    seed = deterministic_seed(profile.company_id, spec.asset_id)
    ctx = Ctx(
        asset_id=spec.asset_id,
        profile=profile,
        brand=spec.brand,
        spec=spec,
        seed=seed,
        rng=ParamRNG(seed),
        scale=float(spec.scale),
        W=float(spec.footprint_w),
        D=float(spec.footprint_d),
        site_z=float(spec.site_z),
        root=root,
        col=bcol,
        mats=mats,
        logo_mat=logo_mat,
        params=dict(spec.recipe_params or {}),
    )
    archetype(ctx)

    interior = assert_no_interior_kinds(spec.asset_id)
    if not interior["ok"]:
        raise RuntimeError(f"interior geometry forbidden: {interior['interiorComponents'][:6]}")

    report = measure_local_bbox(spec.asset_id, root)
    fp = validate_footprint(report["localMeters"], spec)
    report["footprintValidation"] = {
        "ok": fp["ok"],
        "issues": fp["issues"],
        "measured": fp["measured"],
        "bounds": (
            {"max_w": fp["bounds"].max_w, "max_d": fp["bounds"].max_d, "plot_id": fp["bounds"].plot_id}
            if fp.get("bounds")
            else None
        ),
    }
    if not fp["ok"]:
        raise RuntimeError(f"plot footprint validation failed: {fp['issues']}")

    report.update(
        {
            "archetype": spec.recipe,
            "tier": spec.recipe_params.get("tier"),
            "companyId": profile.company_id,
            "companyName": profile.company_name,
            "wordmark": profile.wordmark(),
            "logo": {"path": lpath, "textured": logo_mat is not None},
            "logoComplements": ctx.anchors.get("logoComplements", []),
            "uniquenessKey": spec.recipe_params.get("uniquenessKey"),
            "styleParams": {
                k: spec.recipe_params.get(k)
                for k in (
                    "storey_count",
                    "wing_offset_x",
                    "wing_offset_y",
                    "roof_module",
                    "entrance_side",
                    "window_cols",
                    "window_density",
                    "prop_layout",
                    "sculpture_count",
                    "logo_mode",
                    "asymmetry",
                    "motion_accent",
                )
            },
            "rootLocal": list(spec.root_local),
            "scale": spec.scale,
            "anchors": {k: list(v) if isinstance(v, (tuple, list)) else v for k, v in ctx.anchors.items()},
            "styleFlags": spec.recipe_params.get("flags", []),
        }
    )
    return report


def build_from_profile(
    profile: BrandProfile,
    *,
    asset_id: str | None = None,
    root_local: tuple[float, float, float] = (260.0, 200.0, 0.0),
    plot_grid: dict[str, float] | None = None,
    tier: str | None = None,
    scale: float | None = None,
    footprint: tuple[float, float] | None = None,
    logo_path: str | None = None,
) -> dict[str, Any]:
    """Public entry — tier defaults + brand-derived params, then build."""
    spec = build_spec_from_profile(
        profile,
        asset_id=asset_id,
        root_local=root_local,
        plot_grid=plot_grid,
        scale=scale,
        footprint=footprint,
        tier=tier,
    )
    return build_from_spec(profile, spec, logo_path=logo_path)


def deg(v: float) -> float:
    return math.radians(v)
