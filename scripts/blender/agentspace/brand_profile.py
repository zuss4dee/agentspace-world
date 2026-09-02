"""Brand profile contract — website-derived brand facts → building parameters.

bpy-free so it can be unit-tested outside Blender. Consumed by
`agentspace.siliconcity.builder` (Silicon City daylight toy-diorama archetypes).

JSON contract (camelCase, everything optional except companyId/companyName):

    {
      "companyId": "acme", "companyName": "Acme Robotics", "website": "https://…",
      "tier": "enterprise" | "smb" | "startup",
      "logo": {"wordmark": "ACME", "assetPath": "/abs/logo.png", "imageUrl": "https://…/logo.png"},
      "primaryColours": ["#ff6a00", …], "secondaryColours": ["#1f2937", …],
      "typography": {"display": "Inter", "body": "Inter"},
      "visualStyle": "free text", "industry": "robotics",
      "personality": ["bold", "playful"],
      "styleKeywords": ["minimal", "dark", "playful", "tech", "industrial", "luxury", "creative",
                        "finance", "warm", "light", …],
      "avatars": ["https://…", …],
      "animations": {"hasMotion": true, "keyframes": 12, "libraries": ["framer-motion"]}
    }
"""
from __future__ import annotations

import colorsys
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec
from .toy_font import sanitize_wordmark

RGB = tuple[float, float, float]

TIERS = ("enterprise", "smb", "startup")

# Tier → archetype id + "bigger than the Silicon City screenshot" defaults.
TIER_DEFAULTS: dict[str, dict[str, Any]] = {
    "enterprise": {
        "archetype": "enterprise_hq",
        "plot_tiles": (8, 6),
        "footprint": (54.0, 38.0),
        "scale": 1.8,
    },
    "smb": {
        "archetype": "smb_block",
        "plot_tiles": (4, 3),
        "footprint": (26.0, 18.0),
        "scale": 1.4,
    },
    "startup": {
        "archetype": "startup_loft",
        "plot_tiles": (6, 4),
        "footprint": (40.0, 28.0),
        "scale": 1.6,
    },
}

ARCHETYPE_IDS = tuple(v["archetype"] for v in TIER_DEFAULTS.values())

DARK_KEYWORDS = {"dark", "night", "luxury", "noir", "black", "premium-dark"}
WARM_KEYWORDS = {"warm", "light", "friendly", "organic", "bakery", "cafe", "food", "craft"}
PLAYFUL_KEYWORDS = {"playful", "fun", "creative", "quirky", "bold", "colorful", "colourful", "toy"}
MINIMAL_KEYWORDS = {"minimal", "clean", "corporate", "serious", "formal", "precise"}
TECH_KEYWORDS = {"tech", "ai", "software", "saas", "developer", "data", "cloud", "robotics", "hardware"}
FINANCE_KEYWORDS = {"finance", "bank", "capital", "fintech", "insurance", "wealth", "legal", "law"}
INDUSTRIAL_KEYWORDS = {"industrial", "manufacturing", "logistics", "warehouse", "hardware", "robotics", "energy"}
CREATIVE_KEYWORDS = {"creative", "design", "studio", "agency", "media", "art", "fashion", "games", "gaming"}
HEALTH_KEYWORDS = {"health", "clinic", "dental", "medical", "wellness", "care", "pharma"}


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class BrandLogo:
    wordmark: str = ""
    asset_path: str | None = None
    image_url: str | None = None


@dataclass
class BrandTypography:
    display: str = ""
    body: str = ""


@dataclass
class BrandAnimations:
    has_motion: bool = False
    keyframes: int = 0
    libraries: list[str] = field(default_factory=list)


@dataclass
class BrandProfile:
    company_id: str
    company_name: str
    website: str = ""
    tier: str = "smb"
    logo: BrandLogo = field(default_factory=BrandLogo)
    primary_colours: list[str] = field(default_factory=list)
    secondary_colours: list[str] = field(default_factory=list)
    typography: BrandTypography = field(default_factory=BrandTypography)
    visual_style: str = ""
    industry: str = ""
    personality: list[str] = field(default_factory=list)
    style_keywords: list[str] = field(default_factory=list)
    avatars: list[str] = field(default_factory=list)
    animations: BrandAnimations = field(default_factory=BrandAnimations)

    # -- derived helpers -----------------------------------------------------

    @property
    def slug(self) -> str:
        return slugify(self.company_id or self.company_name)

    def keyword_bag(self) -> set[str]:
        """Lower-cased tokens from styleKeywords + personality + industry + visualStyle."""
        bag: set[str] = set()
        for k in self.style_keywords + self.personality:
            bag.update(_tokens(k))
        bag.update(_tokens(self.industry))
        bag.update(_tokens(self.visual_style))
        return bag

    def wordmark(self, *, max_len: int = 10) -> str:
        raw = self.logo.wordmark or _first_word(self.company_name)
        wm = sanitize_wordmark(raw, max_len=max_len)
        if not wm:
            wm = sanitize_wordmark(_first_word(self.company_name), max_len=max_len)
        return wm or "HQ"

    def initial(self) -> str:
        wm = self.wordmark()
        for ch in wm:
            if ch.isalnum():
                return ch
        return "A"


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or "company"


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", (text or "").lower()) if t}


def _first_word(name: str) -> str:
    for w in re.split(r"[\s\-_/&+]+", name or ""):
        if w:
            return w
    return name or ""


def _as_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, str):
        return [v]
    return [str(x) for x in v if x is not None]


def brand_profile_from_dict(d: dict[str, Any]) -> BrandProfile:
    if "companyId" not in d and "companyName" not in d:
        raise ValueError("brand profile requires companyId and companyName")
    company_name = str(d.get("companyName") or d.get("companyId"))
    company_id = str(d.get("companyId") or slugify(company_name))

    logo_d = d.get("logo") or {}
    logo = BrandLogo(
        wordmark=str(logo_d.get("wordmark") or ""),
        asset_path=logo_d.get("assetPath") or None,
        image_url=logo_d.get("imageUrl") or None,
    )
    typo_d = d.get("typography") or {}
    typo = BrandTypography(display=str(typo_d.get("display") or ""), body=str(typo_d.get("body") or ""))
    anim_d = d.get("animations") or {}
    anim = BrandAnimations(
        has_motion=bool(anim_d.get("hasMotion", False)),
        keyframes=int(anim_d.get("keyframes") or 0),
        libraries=_as_list(anim_d.get("libraries")),
    )
    tier = str(d.get("tier") or "smb").lower()
    if tier not in TIERS:
        tier = "smb"

    return BrandProfile(
        company_id=company_id,
        company_name=company_name,
        website=str(d.get("website") or ""),
        tier=tier,
        logo=logo,
        primary_colours=[c for c in _as_list(d.get("primaryColours")) if parse_hex(c)],
        secondary_colours=[c for c in _as_list(d.get("secondaryColours")) if parse_hex(c)],
        typography=typo,
        visual_style=str(d.get("visualStyle") or ""),
        industry=str(d.get("industry") or ""),
        personality=_as_list(d.get("personality")),
        style_keywords=_as_list(d.get("styleKeywords")),
        avatars=_as_list(d.get("avatars")),
        animations=anim,
    )


def load_brand_profile(path: str | Path) -> BrandProfile:
    with Path(path).open() as f:
        return brand_profile_from_dict(json.load(f))


def to_brand_spec(profile: BrandProfile) -> BrandSpec:
    return BrandSpec(
        company_id=profile.company_id,
        company_name=profile.company_name,
        primary_colours=list(profile.primary_colours),
        secondary_colours=list(profile.secondary_colours),
        visual_style=profile.visual_style,
        architectural_direction=f"siliconcity {archetype_for_tier(profile.tier)}",
        signage_direction="wordmark block letters + official logo plaque (roof + facade)",
        logo=BrandLogoSpec(wordmark=profile.wordmark(), asset_path=profile.logo.asset_path),
    )


# ---------------------------------------------------------------------------
# Colour maths (sRGB hex → linear RGB for Blender)
# ---------------------------------------------------------------------------


def parse_hex(text: str) -> RGB | None:
    """'#rgb' / '#rrggbb' / 'rrggbb' → sRGB floats 0..1 (None if invalid)."""
    if not text:
        return None
    s = text.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) == 8:
        s = s[:6]
    if len(s) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", s):
        return None
    return tuple(int(s[i : i + 2], 16) / 255.0 for i in (0, 2, 4))  # type: ignore[return-value]


def srgb_to_linear(c: RGB) -> RGB:
    def f(v: float) -> float:
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    return (f(c[0]), f(c[1]), f(c[2]))


def linear_to_srgb(c: RGB) -> RGB:
    def f(v: float) -> float:
        v = max(0.0, min(1.0, v))
        return v * 12.92 if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055

    return (f(c[0]), f(c[1]), f(c[2]))


def hex_to_linear(text: str) -> RGB | None:
    c = parse_hex(text)
    return srgb_to_linear(c) if c else None


def _hsv(c: RGB) -> tuple[float, float, float]:
    return colorsys.rgb_to_hsv(*c)


def saturation(c: RGB) -> float:
    return _hsv(c)[1]


def value(c: RGB) -> float:
    return _hsv(c)[2]


def hue_deg(c: RGB) -> float:
    return _hsv(c)[0] * 360.0


def hue_distance(a: RGB, b: RGB) -> float:
    d = abs(hue_deg(a) - hue_deg(b)) % 360.0
    return min(d, 360.0 - d)


def rotate_hue(c: RGB, degrees: float) -> RGB:
    h, s, v = _hsv(c)
    return colorsys.hsv_to_rgb(((h + degrees / 360.0) % 1.0), s, v)


def with_sv(c: RGB, *, s: float | None = None, v: float | None = None) -> RGB:
    h, s0, v0 = _hsv(c)
    return colorsys.hsv_to_rgb(h, s0 if s is None else s, v0 if v is None else v)


def mix(a: RGB, b: RGB, t: float) -> RGB:
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))  # type: ignore[return-value]


def tint_toward_hue(base: RGB, hue_src: RGB, amount: float) -> RGB:
    """Push `base` toward the hue of hue_src while keeping its lightness (sRGB space)."""
    h, _, _ = _hsv(hue_src)
    _, s, v = _hsv(base)
    target = colorsys.hsv_to_rgb(h, max(s, 0.55), v)
    return mix(base, target, amount)


def clamp_value(c: RGB, *, lo: float = 0.0, hi: float = 1.0) -> RGB:
    h, s, v = _hsv(c)
    return colorsys.hsv_to_rgb(h, s, max(lo, min(hi, v)))


def _round3(c: RGB) -> RGB:
    return (round(c[0], 4), round(c[1], 4), round(c[2], 4))


# ---------------------------------------------------------------------------
# Palette derivation
# ---------------------------------------------------------------------------

_FALLBACK_BRAND = "#5b5bd6"  # Silicon-City indigo when a site gives no colours


def pick_brand_colours(profile: BrandProfile) -> tuple[RGB, RGB]:
    """(brand, accent) in *sRGB* space.

    brand  = most saturated primary colour (full saturation, never muddy);
    accent = next most saturated of primary+secondary with a distinct hue,
             else brand hue rotated ~40°.
    """
    prim = [parse_hex(c) for c in profile.primary_colours]
    prim = [c for c in prim if c]
    sec = [parse_hex(c) for c in profile.secondary_colours]
    sec = [c for c in sec if c]

    def usable(c: RGB) -> bool:
        return saturation(c) > 0.12 and 0.08 < value(c) < 0.98

    candidates = [c for c in prim if usable(c)] or [c for c in prim + sec if usable(c)]
    if not candidates:
        brand = parse_hex(_FALLBACK_BRAND)
    else:
        brand = max(candidates, key=lambda c: saturation(c) * 0.75 + value(c) * 0.25)
    assert brand is not None
    # Saturated toy body: lift weak saturation, keep value readable.
    h, s, v = _hsv(brand)
    brand = colorsys.hsv_to_rgb(h, max(s, 0.55), max(0.3, min(v, 0.95)))

    others = [c for c in prim + sec if usable(c) and hue_distance(c, brand) > 22.0]
    if others:
        accent = max(others, key=lambda c: saturation(c))
        h, s, v = _hsv(accent)
        accent = colorsys.hsv_to_rgb(h, max(s, 0.5), max(0.35, min(v, 0.96)))
    else:
        accent = rotate_hue(brand, 40.0)
        accent = with_sv(accent, s=max(saturation(accent), 0.55), v=min(0.96, value(accent) * 1.1 + 0.05))
    return brand, accent


def is_dark_style(profile: BrandProfile) -> bool:
    return bool(profile.keyword_bag() & DARK_KEYWORDS)


def is_warm_style(profile: BrandProfile) -> bool:
    return bool(profile.keyword_bag() & WARM_KEYWORDS)


def derive_mat_defs(profile: BrandProfile) -> dict[str, dict[str, Any]]:
    """Slot-keyed material defs (LINEAR RGB) for `pbr_library.ensure_mats`.

    Silicon City daylight toy diorama: saturated brand bodies, white trim, dark
    window frames, non-emissive tinted glass, fresh lawn + light pavers. Glow is
    only for small accents (awning strip / sign backlight).
    """
    brand_s, accent_s = pick_brand_colours(profile)
    dark = is_dark_style(profile)
    warm = is_warm_style(profile)

    if dark:
        cream_s: RGB = tint_toward_hue((0.19, 0.20, 0.25), brand_s, 0.12)
        cream_dark_s: RGB = tint_toward_hue((0.13, 0.14, 0.18), brand_s, 0.12)
        roof_s: RGB = tint_toward_hue((0.24, 0.25, 0.29), brand_s, 0.10)
    else:
        cream_s = (0.93, 0.92, 0.90)
        cream_dark_s = tint_toward_hue((0.80, 0.78, 0.74), brand_s, 0.06)
        roof_s = tint_toward_hue((0.74, 0.74, 0.72), brand_s, 0.08)

    charcoal_s: RGB = tint_toward_hue((0.15, 0.16, 0.18), brand_s, 0.10)
    fin_s: RGB = tint_toward_hue((0.20, 0.21, 0.24), brand_s, 0.10)
    glass_s: RGB = tint_toward_hue((0.30, 0.38, 0.48), brand_s, 0.12)
    glow_s: RGB = (1.0, 0.92, 0.72)
    sign_s: RGB = mix((0.97, 0.97, 0.96), accent_s, 0.06)
    grass_s: RGB = (0.36, 0.62, 0.30) if not dark else (0.30, 0.52, 0.28)
    paver_s: RGB = (0.83, 0.81, 0.76)
    canopy_s: RGB = (0.30, 0.55, 0.28) if not warm else (0.34, 0.58, 0.26)
    bark_s: RGB = (0.36, 0.24, 0.14)
    solar_s: RGB = (0.12, 0.18, 0.36)
    metal_s: RGB = (0.62, 0.64, 0.66)
    rubber_s: RGB = (0.08, 0.08, 0.09)

    # Accent masses must never sink below ~0.12 value (still reads in shade / night).
    brand_l = clamp_value(srgb_to_linear(brand_s), lo=0.12)
    accent_l = clamp_value(srgb_to_linear(accent_s), lo=0.12)

    def alb(c: RGB, rough: float, var: float = 0.012, **extra: Any) -> dict[str, Any]:
        out: dict[str, Any] = {"kind": "albedo", "color": _round3(srgb_to_linear(c)), "rough": rough, "var": var}
        out.update(extra)
        return out

    return {
        "cream": alb(cream_s, 0.48),
        "cream_dark": alb(cream_dark_s, 0.55),
        "brand": {"kind": "albedo", "color": _round3(brand_l), "rough": 0.38, "var": 0.01},
        "coral": {"kind": "albedo", "color": _round3(accent_l), "rough": 0.40, "var": 0.01},
        "charcoal": alb(charcoal_s, 0.45),
        "fin": alb(fin_s, 0.45),
        "glass": alb(glass_s, 0.08, 0.006, metal=0.22, emit=0.10),
        "roof": alb(roof_s, 0.62, 0.015),
        "grass": alb(grass_s, 0.85, 0.03),
        "paver": alb(paver_s, 0.62, 0.02),
        "canopy": alb(canopy_s, 0.78, 0.035),
        "bark": alb(bark_s, 0.8, 0.03),
        "sign": {"kind": "emit", "color": _round3(srgb_to_linear(sign_s)), "emit": 0.28},
        "glow": {"kind": "emit", "color": _round3(srgb_to_linear(glow_s)), "emit": 1.1},
        "solar": alb(solar_s, 0.14, 0.006, metal=0.35),
        "metal": alb(metal_s, 0.38, 0.01, metal=0.6),
        "rubber": alb(rubber_s, 0.7, 0.01),
    }


# ---------------------------------------------------------------------------
# Style params
# ---------------------------------------------------------------------------


def style_params(profile: BrandProfile) -> dict[str, Any]:
    """Map keywords / personality / industry / animations → archetype params."""
    bag = profile.keyword_bag()
    playful = bool(bag & PLAYFUL_KEYWORDS)
    minimal = bool(bag & MINIMAL_KEYWORDS)
    tech = bool(bag & TECH_KEYWORDS)
    finance = bool(bag & FINANCE_KEYWORDS)
    industrial = bool(bag & INDUSTRIAL_KEYWORDS)
    creative = bool(bag & CREATIVE_KEYWORDS)
    health = bool(bag & HEALTH_KEYWORDS)
    warm = bool(bag & WARM_KEYWORDS)

    roundness = 0.32
    if minimal or finance:
        roundness = 0.22
    if playful or creative or warm:
        roundness = 0.45 if playful else 0.40

    glass_bias = 0.5
    if tech or finance:
        glass_bias += 0.15
    if industrial:
        glass_bias += 0.05
    if warm or health:
        glass_bias -= 0.08
    if minimal:
        glass_bias += 0.05
    glass_bias = max(0.35, min(0.75, glass_bias))

    if tech:
        facade_style = "fins"
    elif finance:
        facade_style = "band"
    elif creative or playful:
        facade_style = "mixed"
    elif industrial:
        facade_style = "slots"
    else:
        facade_style = "band"

    skew = 0.15
    if creative:
        skew += 0.45
    if playful:
        skew += 0.35
    if finance or minimal:
        skew -= 0.1
    skew = max(0.0, min(1.0, skew))

    prop_density = 0.7
    if playful or creative or warm:
        prop_density = 0.95
    if minimal or finance:
        prop_density = 0.55
    if industrial:
        prop_density = max(prop_density, 0.85)

    if finance:
        composition_profile = "formal_plaza"
    elif creative or playful:
        composition_profile = "street_buzz"
    elif tech:
        composition_profile = "landmark_roof"
    else:
        composition_profile = "forecourt"

    motion_accent = bool(profile.animations.has_motion or profile.animations.keyframes > 0)
    avatar_count = min(3, len(profile.avatars))

    sign_scale = 1.0
    if playful or creative:
        sign_scale = 1.15
    if minimal:
        sign_scale = 0.9

    if finance or minimal:
        tower_style = "setback"
    else:
        tower_style = "stacked_rotated"
    corner_style = "rotunda" if (playful or warm or health) else "accent_tower"
    roof_style = "barrel" if not industrial else "sawtooth"
    if playful or creative:
        roof_style = "barrel"

    return {
        "roundness": round(roundness, 3),
        "glass_bias": round(glass_bias, 3),
        "facade_style": facade_style,
        "skew": round(skew, 3),
        "prop_density": round(prop_density, 3),
        "composition_profile": composition_profile,
        "motion_accent": motion_accent,
        "avatar_count": avatar_count,
        "sign_scale": sign_scale,
        "symmetry": 1.0 if (finance or minimal) else (0.35 if (creative or playful) else 0.7),
        "tower_style": tower_style,
        "corner_style": corner_style,
        "roof_style": roof_style,
        "dark": is_dark_style(profile),
        "warm": warm,
        "flags": sorted(
            k
            for k, v in {
                "playful": playful,
                "minimal": minimal,
                "tech": tech,
                "finance": finance,
                "industrial": industrial,
                "creative": creative,
                "health": health,
                "warm": warm,
            }.items()
            if v
        ),
    }


# ---------------------------------------------------------------------------
# Spec assembly
# ---------------------------------------------------------------------------


def archetype_for_tier(tier: str) -> str:
    return TIER_DEFAULTS.get(tier, TIER_DEFAULTS["smb"])["archetype"]


def default_asset_id(profile: BrandProfile) -> str:
    return f"pack.agentspace.building.{profile.slug}.01"


def build_spec_from_profile(
    profile: BrandProfile,
    *,
    asset_id: str | None = None,
    root_local: tuple[float, float, float] = (260.0, 200.0, 0.0),
    plot_grid: dict[str, float] | None = None,
    scale: float | None = None,
    footprint: tuple[float, float] | None = None,
    tier: str | None = None,
) -> GeneratedBuildingSpec:
    """Tier defaults + brand-derived params → GeneratedBuildingSpec (bpy-free)."""
    tier = tier or profile.tier
    if tier not in TIER_DEFAULTS:
        tier = "smb"
    defaults = TIER_DEFAULTS[tier]
    fw, fd = footprint or defaults["footprint"]
    if plot_grid is None:
        tw, th = defaults["plot_tiles"]
        plot_grid = {"x": 0, "y": 0, "w": tw, "h": th}
    params = style_params(profile)
    params["tier"] = tier
    params["wordmark"] = profile.wordmark()
    params["initial"] = profile.initial()
    return GeneratedBuildingSpec(
        asset_id=asset_id or default_asset_id(profile),
        building_id=f"{profile.slug}-{tier}",
        parcel_id=f"plot-{profile.slug}",
        brand=to_brand_spec(profile),
        recipe=defaults["archetype"],
        root_local=root_local,
        scale=float(scale if scale is not None else defaults["scale"]),
        footprint_w=float(fw),
        footprint_d=float(fd),
        site_z=0.3,
        roof_kind="flat",
        glass_ratio=float(params["glass_bias"]),
        mat_defs=derive_mat_defs(profile),
        recipe_params=params,
        plot_grid=plot_grid,
        runtime_export_kinds=[
            "structure",
            "facade",
            "window",
            "door",
            "roof",
            "canopy",
            "signage",
            "brand",
            "site",
            "landscape",
            "prop",
        ],
    )
