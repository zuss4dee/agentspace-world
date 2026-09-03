"""Brand profile contract — website-derived brand facts → building parameters.

bpy-free so it can be unit-tested outside Blender. Consumed by
`agentspace.siliconcity.builder` (Silicon City daylight toy-diorama archetypes).

Uniqueness contract (hard):
  Same companyId (+ asset_id) → identical massing / materials / logo placement
  (ParamRNG seeded via deterministic_seed). Different companyId → different
  within-family silhouette even at the same tier — never recreate another
  company's building.

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
import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec
from .param_rng import ParamRNG, deterministic_seed
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


def _resolve_brand_logo_path(company_id: str, asset_path: str | None) -> str | None:
    if asset_path:
        path = Path(asset_path).expanduser()
        if path.is_file():
            return str(path)
    repo = Path(__file__).resolve().parents[3]
    brand_dir = repo / "public" / "assets" / "brands" / company_id
    for ext in (".svg", ".png", ".jpg", ".jpeg"):
        candidate = brand_dir / f"logo{ext}"
        if candidate.is_file():
            return str(candidate)
    return asset_path


def to_brand_spec(profile: BrandProfile) -> BrandSpec:
    return BrandSpec(
        company_id=profile.company_id,
        company_name=profile.company_name,
        primary_colours=list(profile.primary_colours),
        secondary_colours=list(profile.secondary_colours),
        industry=profile.industry,
        personality=list(profile.personality),
        visual_style=profile.visual_style,
        architectural_direction=f"procedural grammar (tier={profile.tier})",
        signage_direction="facade sign + brand materials after structure",
        logo=BrandLogoSpec(
            wordmark=profile.wordmark(),
            asset_path=_resolve_brand_logo_path(profile.company_id, profile.logo.asset_path),
            source_url=profile.logo.image_url,
        ),
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
    # Silicon City toy bodies: punch saturation so Slack/Stripe/YC-style brands read at city scale.
    h, s, v = _hsv(brand)
    brand = colorsys.hsv_to_rgb(h, max(s, 0.72), max(0.38, min(v, 0.92)))

    others = [c for c in prim + sec if usable(c) and hue_distance(c, brand) > 22.0]
    if others:
        accent = max(others, key=lambda c: saturation(c))
        h, s, v = _hsv(accent)
        accent = colorsys.hsv_to_rgb(h, max(s, 0.68), max(0.40, min(v, 0.94)))
    else:
        accent = rotate_hue(brand, 40.0)
        accent = with_sv(accent, s=max(saturation(accent), 0.70), v=min(0.94, value(accent) * 1.12 + 0.06))
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
        cream_s = (0.88, 0.84, 0.78)
        cream_dark_s = tint_toward_hue((0.72, 0.68, 0.62), brand_s, 0.08)
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
# Style params + within-family uniqueness
# ---------------------------------------------------------------------------

# Roof modules available within each tier family (archetype still picks family).
ROOF_MODULES_BY_TIER = {
    "enterprise": ("flat", "parapet", "helipad", "pitch"),
    "smb": ("flat", "parapet", "pitch", "barrel"),
    "startup": ("barrel", "flat", "parapet", "pitch"),
}

ENTRANCE_SIDES = ("front", "left", "right")
LOGO_MODES = ("plaza_totem", "facade_blade", "roof_deck", "dual_plaque_totem")


def uniqueness_key(
    company_id: str,
    tier: str,
    style: dict[str, Any],
    mat_defs: dict[str, dict[str, Any]] | None = None,
) -> str:
    """Stable fingerprint of companyId + tier + massing/style slots + colour slots.

    Printed in ASW_BUILD_JSON / build reports so operators can confirm two
    companies never share a silhouette fingerprint.
    """
    colour_slots = {}
    if mat_defs:
        for slot in ("brand", "coral", "cream", "sign"):
            d = mat_defs.get(slot) or {}
            colour_slots[slot] = d.get("color")
    payload = {
        "companyId": company_id,
        "tier": tier,
        "storey_count": style.get("storey_count"),
        "wing_offset_x": style.get("wing_offset_x"),
        "wing_offset_y": style.get("wing_offset_y"),
        "roof_module": style.get("roof_module"),
        "entrance_side": style.get("entrance_side"),
        "window_cols": style.get("window_cols"),
        "window_density": style.get("window_density"),
        "prop_layout": style.get("prop_layout"),
        "sculpture_count": style.get("sculpture_count"),
        "logo_mode": style.get("logo_mode"),
        "asymmetry": style.get("asymmetry"),
        "skew": style.get("skew"),
        "facade_style": style.get("facade_style"),
        "tower_style": style.get("tower_style"),
        "corner_style": style.get("corner_style"),
        "motion_accent": style.get("motion_accent"),
        "colours": colour_slots,
    }
    raw = json.dumps(payload, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def _logo_mode_for_tier(tier: str, rng: ParamRNG, bag: set[str]) -> str:
    """Pick a 3D logo placement that complements the building.

    retail/smb → plaza totem; enterprise → facade blade (+ roof plaque);
    startup → roof deck sculpture. Always prefer dual when logo/wordmark exists
    (handled by archetypes placing roof plaque + plaza/entrance mark).
    """
    retail = bool(bag & {"retail", "shop", "store", "food", "cafe", "bakery", "restaurant"})
    if tier == "smb" or retail:
        return rng.weighted_choice(
            "logo_mode",
            ["plaza_totem", "dual_plaque_totem", "facade_blade"],
            [2.4, 1.6, 0.6],
        )
    if tier == "enterprise":
        return rng.weighted_choice(
            "logo_mode",
            ["facade_blade", "dual_plaque_totem", "roof_deck"],
            [2.2, 1.8, 0.5],
        )
    # startup
    return rng.weighted_choice(
        "logo_mode",
        ["roof_deck", "dual_plaque_totem", "plaza_totem"],
        [2.2, 1.5, 0.8],
    )


def unique_massing_params(profile: BrandProfile, rng: ParamRNG, *, tier: str) -> dict[str, Any]:
    """Within-family silhouette knobs seeded from companyId — never collide across companies."""
    bag = profile.keyword_bag()
    playful = bool(bag & PLAYFUL_KEYWORDS)
    creative = bool(bag & CREATIVE_KEYWORDS)
    minimal = bool(bag & MINIMAL_KEYWORDS)
    finance = bool(bag & FINANCE_KEYWORDS)

    if tier == "enterprise":
        storey_count = rng.randint("storeys", 4, 7)
        wing_ox = round(rng.uniform("wing_ox", -2.4, 2.4), 3)
        wing_oy = round(rng.uniform("wing_oy", -1.8, 1.8), 3)
        window_cols = rng.randint("win_cols", 3, 5)
        window_density = round(rng.uniform("win_dens", 0.55, 0.95), 3)
    elif tier == "startup":
        storey_count = rng.randint("storeys", 2, 4)
        wing_ox = round(rng.uniform("wing_ox", -3.2, 3.2), 3)
        wing_oy = round(rng.uniform("wing_oy", -2.4, 2.4), 3)
        window_cols = rng.randint("win_cols", 3, 6)
        window_density = round(rng.uniform("win_dens", 0.5, 0.92), 3)
    else:  # smb
        storey_count = rng.randint("storeys", 2, 3)
        wing_ox = round(rng.uniform("wing_ox", -1.6, 1.6), 3)
        wing_oy = round(rng.uniform("wing_oy", -1.2, 1.2), 3)
        window_cols = rng.randint("win_cols", 3, 5)
        window_density = round(rng.uniform("win_dens", 0.48, 0.88), 3)

    roofs = list(ROOF_MODULES_BY_TIER.get(tier, ROOF_MODULES_BY_TIER["smb"]))
    # Bias roof from style keywords / existing roof_style preference
    if "industrial" in bag and "sawtooth" not in roofs:
        roofs = roofs + ["pitch"]
    roof_module = rng.choice("roof_module", roofs)

    entrance_weights = [2.6, 0.7, 0.7]  # front biased
    if creative or playful:
        entrance_weights = [1.6, 1.2, 1.0]
    if finance or minimal:
        entrance_weights = [3.2, 0.4, 0.4]
    entrance_side = rng.weighted_choice("entrance_side", list(ENTRANCE_SIDES), entrance_weights)

    prop_layout = rng.weighted_choice(
        "prop_layout",
        ["sparse", "balanced", "crowded", "landmark"],
        [0.7, 1.6, 1.2, 0.9],
    )

    # Avatars → plaza/roof sculptures; animations → motion accent (already in style_params).
    sculpture_count = min(4, max(len(profile.avatars), rng.randint("sculpt_base", 0, 2)))
    if creative or playful:
        sculpture_count = min(4, sculpture_count + 1)

    asymmetry = round(rng.uniform("asymmetry", 0.05, 0.95), 3)
    if creative or playful:
        asymmetry = max(asymmetry, 0.45)
    if finance or minimal:
        asymmetry = min(asymmetry, 0.35)

    logo_mode = _logo_mode_for_tier(tier, rng, bag)
    # Prefer dual complement whenever a logo image or wordmark exists.
    if profile.logo.asset_path or profile.logo.image_url or profile.wordmark():
        if logo_mode in ("plaza_totem", "facade_blade", "roof_deck") and rng.uniform("logo_dual", 0.0, 1.0) > 0.35:
            logo_mode = "dual_plaque_totem"

    return {
        "storey_count": storey_count,
        "wing_offset_x": wing_ox,
        "wing_offset_y": wing_oy,
        "roof_module": roof_module,
        "entrance_side": entrance_side,
        "window_cols": window_cols,
        "window_density": window_density,
        "prop_layout": prop_layout,
        "sculpture_count": sculpture_count,
        "asymmetry": asymmetry,
        "logo_mode": logo_mode,
    }


def style_params(profile: BrandProfile, *, rng: ParamRNG | None = None) -> dict[str, Any]:
    """Map keywords / personality / industry / animations → archetype params.

    When `rng` is provided (seeded from companyId+asset_id), also expands
    within-family uniqueness knobs so two companies at the same tier never
    share a silhouette.
    """
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

    params: dict[str, Any] = {
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

    if rng is not None:
        tier = profile.tier if profile.tier in TIERS else "smb"
        unique = unique_massing_params(profile, rng, tier=tier)
        params.update(unique)
        # Fold asymmetry into skew so existing archetype math picks it up.
        params["skew"] = round(min(1.0, max(0.0, params["skew"] + (unique["asymmetry"] - 0.5) * 0.35)), 3)
        # Sculpture count supersedes avatar_count when larger.
        params["avatar_count"] = max(avatar_count, unique["sculpture_count"])
        # Align legacy roof_style with roof_module when compatible.
        rm = unique["roof_module"]
        if rm == "barrel":
            params["roof_style"] = "barrel"
        elif rm == "pitch":
            params["roof_style"] = "sawtooth" if industrial else "pitch"
        # Prop density from layout
        layout = unique["prop_layout"]
        if layout == "sparse":
            params["prop_density"] = min(params["prop_density"], 0.45)
        elif layout == "crowded":
            params["prop_density"] = max(params["prop_density"], 0.9)
        elif layout == "landmark":
            params["prop_density"] = max(params["prop_density"], 0.75)

    return params


# ---------------------------------------------------------------------------
# Grammar style params (procedural recipes — not siliconcity archetypes)
# ---------------------------------------------------------------------------

GENERATION_VERSION = 1
MAX_UNIQUENESS_ATTEMPTS = 12


def grammar_style_params(profile: BrandProfile, rng: ParamRNG) -> dict[str, Any]:
    """Brand/personality bias → knobs consumed by building_recipes_procedural."""
    base = style_params(profile, rng=None)
    bag = profile.keyword_bag()
    playful = bool(bag & PLAYFUL_KEYWORDS)
    creative = bool(bag & CREATIVE_KEYWORDS)
    finance = bool(bag & FINANCE_KEYWORDS)
    tech = bool(bag & TECH_KEYWORDS)

    composition = base.get("composition_profile") or "plaza_sculpture"
    if composition in ("formal_plaza", "forecourt"):
        composition = "signage_corner" if finance else "plaza_sculpture"

    detail = base.get("detail_density")
    if not detail:
        pd = float(base.get("prop_density", 0.7))
        detail = "VERY_HIGH" if pd > 0.9 else "HIGH" if pd > 0.75 else "MEDIUM" if pd > 0.55 else "LOW"

    tower_style = base.get("tower_style", "setback")
    if tech and rng.uniform("tower.tech", 0, 1) > 0.4:
        tower_style = rng.choice("tower_style", ["cylinder", "cantilever", "wishbone"])
    elif creative:
        tower_style = rng.choice("tower_style", ["cantilever", "wishbone", "setback"])

    hybrid_mode = None
    if creative or playful:
        hybrid_mode = rng.weighted_choice("hybrid.mode", ["tower", "sculpture", "terrace"], [1.2, 1.0, 0.8])
    elif finance:
        hybrid_mode = "tower"

    return {
        "composition_profile": composition,
        "detail_density": detail,
        "tower_style": tower_style,
        "glass_bias": base["glass_bias"],
        "asymmetry": round(rng.uniform("asym", 0.15, 0.92 if creative else 0.75), 3),
        "prop_density": base["prop_density"],
        "hybrid_mode": hybrid_mode,
        "landmark_style": rng.choice("landmark.style", ["wishbone", "cylinder"]) if tech else None,
        "flags": base.get("flags", []),
    }


# ---------------------------------------------------------------------------
# Spec assembly — plot envelope → grammar → uniqueness → brand
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
    plot_id: str | None = None,
    generation_version: int = GENERATION_VERSION,
) -> GeneratedBuildingSpec:
    """Plot envelope → architectural grammar → uniqueness → brand materials.

    Replaces the legacy tier→fixed-archetype (enterprise_hq/smb_block/startup_loft)
    path. Same companyId+plotId+generationVersion rebuilds identically; collisions
    advance seed via attemptN until a unique structural fingerprint is found.
    """
    from .plot_envelope import grammar_weights_for_envelope, resolve_envelope
    from .param_rng import generate_recipe_params, select_recipe_for_envelope
    from .uniqueness_registry import register_fingerprint, structural_fingerprint

    tier = tier or profile.tier
    if tier not in TIERS:
        tier = "smb"
    pid = plot_id or f"plot-{profile.slug}"
    envelope = resolve_envelope(
        plot_id=pid,
        tier=tier,
        plot_grid=plot_grid,
        footprint=footprint,
        scale=scale,
    )
    aid = asset_id or default_asset_id(profile)
    env_weights = grammar_weights_for_envelope(envelope)

    recipe = ""
    params: dict[str, Any] = {}
    fingerprint = ""
    seed = 0

    for attempt in range(MAX_UNIQUENESS_ATTEMPTS):
        seed_key = f"{profile.company_id}+{pid}+{aid}"
        if attempt:
            seed_key += f":attempt{attempt}"
        seed = deterministic_seed(seed_key, aid)
        rng = ParamRNG(seed)
        recipe = select_recipe_for_envelope(rng, profile, env_weights)
        params = generate_recipe_params(rng, recipe, w=envelope.footprint_w, d=envelope.footprint_d)
        params.update({k: v for k, v in grammar_style_params(profile, rng).items() if v is not None})
        params["tier"] = tier
        params["wordmark"] = profile.wordmark()
        params["generation_version"] = generation_version
        params["seed"] = seed
        if recipe == "hybrid" and not params.get("hybrid_mode"):
            params["hybrid_mode"] = rng.choice("hybrid.mode", ["tower", "sculpture", "terrace"])

        fingerprint = structural_fingerprint(recipe, params)
        if register_fingerprint(
            fingerprint,
            company_id=profile.company_id,
            plot_id=pid,
            asset_id=aid,
            recipe=recipe,
            attempt=attempt,
        ):
            break
    else:
        raise RuntimeError(
            f"no unique structure after {MAX_UNIQUENESS_ATTEMPTS} attempts "
            f"for {profile.company_id} on {pid}"
        )

    params["uniquenessKey"] = fingerprint
    params["structuralFingerprint"] = fingerprint

    # Brand colours + logo AFTER structure is fixed
    mat_defs = derive_mat_defs(profile)

    return GeneratedBuildingSpec(
        asset_id=aid,
        building_id=f"{profile.slug}-{tier}",
        parcel_id=pid,
        brand=to_brand_spec(profile),
        recipe=recipe,
        root_local=root_local,
        scale=envelope.scale,
        footprint_w=envelope.footprint_w,
        footprint_d=envelope.footprint_d,
        site_z=0.34,
        max_height=envelope.max_height,
        roof_kind=str(params.get("roof_module") or "membrane"),
        glass_ratio=float(params.get("glass_bias", 0.5)),
        mat_defs=mat_defs,
        recipe_params=params,
        plot_grid=envelope.plot_grid,
        detail_density=str(params.get("detail_density") or "HIGH").upper(),
        runtime_export_kinds=[
            "building",
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
