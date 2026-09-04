"""Plot → architectural graph → Silicon City vocabulary.

The live generator must compose with the same primitives that produced the
gallery Spark/Nova/Orbit/Loft/Forge/Corner buildings. Grammar recipe IDs stay
stable for uniqueness; they map onto those families instead of stacked boxes.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .param_rng import ParamRNG

# Grammar recipe (spec.recipe) → Silicon City family. stacked_volumes is never a builder.
GRAMMAR_TO_ARCHETYPE: dict[str, str] = {
    "courtyard_block": "courtyard_campus",
    "tower_campus": "enterprise_hq",
    "pavilion": "startup_loft",
    "stepped_terrace": "low_rise_strip",
    "bridge_complex": "courtyard_campus",
    "stacked_volumes": "startup_loft",
    "asymmetric_campus": "enterprise_hq",
    "sculpture_hq": "startup_loft",
    "vertical_landmark": "industrial_hall",
    "hybrid": "courtyard_campus",
}

PLOT_FAMILY_ARCHETYPE: dict[str, str] = {
    "compact": "smb_block",
    "wide_shallow": "low_rise_strip",
    "narrow_deep": "industrial_hall",
    "campus_square": "courtyard_campus",
    "headquarters": "enterprise_hq",
}

FALLBACK_ARCHETYPES = (
    "startup_loft",
    "smb_block",
    "courtyard_campus",
    "enterprise_hq",
    "low_rise_strip",
    "industrial_hall",
)

# Occupancy of the buildable envelope (site lawn still fills the plot).
OCCUPANCY_BY_FAMILY: dict[str, tuple[float, float]] = {
    "compact": (0.78, 0.88),
    "wide_shallow": (0.74, 0.86),
    "narrow_deep": (0.72, 0.84),
    "campus_square": (0.70, 0.82),
    "headquarters": (0.74, 0.88),
}


@dataclass(frozen=True)
class MassingPlan:
    grammar: str
    archetype: str
    plot_family: str
    occupancy: float
    purpose: tuple[str, ...]


# Grammar is a bias. Plot family is the constraint — never pick a deep HQ for a shallow lot.
COMPATIBLE_ARCHETYPES: dict[str, tuple[str, ...]] = {
    "compact": ("smb_block",),
    "wide_shallow": ("low_rise_strip", "startup_loft"),
    "narrow_deep": ("industrial_hall", "startup_loft"),
    "campus_square": ("courtyard_campus", "enterprise_hq", "startup_loft"),
    "headquarters": ("enterprise_hq", "startup_loft", "smb_block", "courtyard_campus"),
}


def archetype_for_grammar(recipe: str, plot_family: str | None = None) -> str:
    """Never return a stacked-box builder. Plot family constrains which families fit."""
    preferred = GRAMMAR_TO_ARCHETYPE.get(recipe, "smb_block")
    if recipe == "hybrid" and plot_family:
        preferred = PLOT_FAMILY_ARCHETYPE.get(plot_family, preferred)
    if recipe == "stacked_volumes":
        preferred = PLOT_FAMILY_ARCHETYPE.get(plot_family, "startup_loft") if plot_family else "startup_loft"
    if plot_family:
        allowed = COMPATIBLE_ARCHETYPES.get(plot_family, FALLBACK_ARCHETYPES)
        if preferred in allowed:
            return preferred
        return PLOT_FAMILY_ARCHETYPE.get(plot_family, allowed[0])
    return preferred


def occupancy_for_plot(rng: ParamRNG, plot_family: str) -> float:
    lo, hi = OCCUPANCY_BY_FAMILY.get(plot_family, (0.74, 0.86))
    return round(rng.uniform("occupy", lo, hi), 3)


def plan_massing(recipe: str, *, plot_family: str, rng: ParamRNG) -> MassingPlan:
    archetype = archetype_for_grammar(recipe, plot_family)
    purposes = {
        "smb_block": ("main_mass", "corner_tower", "entrance_portal", "roof_deck"),
        "enterprise_hq": ("street_wing", "side_wing", "tower", "entrance_portal", "plaza"),
        "startup_loft": ("studio", "vault", "cantilever", "plaza"),
        "courtyard_campus": ("north_wing", "east_wing", "west_wing", "courtyard", "gate"),
        "low_rise_strip": ("street_front", "rear_wing", "entrance_portal", "plaza"),
        "industrial_hall": ("office_head", "hall", "loading", "yard"),
    }.get(archetype, ("main_mass", "secondary_wing", "entrance_portal"))
    return MassingPlan(
        grammar=recipe,
        archetype=archetype,
        plot_family=plot_family,
        occupancy=occupancy_for_plot(rng, plot_family),
        purpose=purposes,
    )


@dataclass
class _SignProfile:
    company_id: str
    company_name: str

    def wordmark(self, *, max_len: int = 10) -> str:
        raw = (self.company_name or "HQ").strip()
        return (raw[:max_len] if raw else "HQ").upper()

    def initial(self) -> str:
        w = self.wordmark()
        return w[0] if w else "H"


def compose_quality_building(ctx: Any, brand: Any, *, archetype: str | None = None) -> dict[str, Any]:
    """Dress the live BuildingContext with Silicon City gallery vocabulary."""
    from .siliconcity.archetypes import ARCHETYPES
    from .siliconcity.builder import Ctx
    from .siliconcity.materials import logo_material

    plot_family = str(ctx.params.get("plot_family") or "headquarters")
    rng = ParamRNG(int(ctx.seed))
    plan = plan_massing(ctx.spec.recipe, plot_family=plot_family, rng=rng)
    arch = archetype or plan.archetype
    fn = ARCHETYPES.get(arch)
    if fn is None:
        raise ValueError(f"unknown siliconcity family: {arch}")

    occupy = plan.occupancy
    logo_path = getattr(getattr(brand, "logo", None), "asset_path", None)
    sc = Ctx(
        asset_id=ctx.asset_id,
        profile=_SignProfile(brand.company_id, brand.company_name),
        brand=brand,
        spec=ctx.spec,
        seed=ctx.seed,
        rng=rng,
        scale=ctx.scale,
        W=float(ctx.W),
        D=float(ctx.D),
        site_z=ctx.site_z,
        root=ctx.root,
        col=ctx.col,
        mats=ctx.mats,
        logo_mat=logo_material(brand.company_id, logo_path),
        params=dict(ctx.params),
        anchors=ctx.anchors,
    )
    # Lawn/sidewalk should cover the plot, not only the occupied mass.
    sc.params["_plot_w"] = ctx.W
    sc.params["_plot_d"] = ctx.D
    fn(sc)
    ctx.anchors.update(sc.anchors)
    ctx.params["siliconcity_archetype"] = arch
    ctx.params["massing_purpose"] = list(plan.purpose)
    ctx.params["occupancy"] = occupy
    if ctx.root is not None:
        ctx.root["asw_archetype"] = arch
        ctx.root["asw_vocabulary"] = "siliconcity"
        ctx.root["asw_grammar"] = ctx.spec.recipe
    return {
        "ok": True,
        "archetype": arch,
        "grammar": ctx.spec.recipe,
        "occupancy": occupy,
        "purpose": list(plan.purpose),
        "objects": len(sc.objects),
    }
