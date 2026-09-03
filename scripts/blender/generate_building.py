"""CLI for deterministic company HQ generation.

Examples:
  npm run building:generate -- --company stripe --preview
  npm run building:generate -- --company openai --spec specs/openai.json

The script authors into the existing Blender asset library only. It never
adds objects to WORLD_BUILDINGS; publishing is an explicit second phase.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.company_building import build_company_building
from agentspace.company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec
from agentspace.export_pack import export_pack_asset

MARKER = "ASW_GENERATE_JSON:"

BUILT_IN_COMPANIES = {
    "stripe": ("Stripe", ["#635BFF", "#00D4FF"], ["#F6F9FC"], "technology", ["precise", "direct"]),
    "openai": ("OpenAI", ["#10A37F", "#202123"], ["#E8F5F0"], "AI research", ["futuristic", "curious"]),
    "notion": ("Notion", ["#111111", "#FFFFFF"], ["#F7F6F2"], "software", ["editorial", "calm"]),
    "figma": ("Figma", ["#F24E1E", "#A259FF"], ["#1ABCFE", "#0ACF83"], "creative software", ["playful", "creative"]),
    "linear": ("Linear", ["#5E6AD2", "#8B5CF6"], ["#EDEBFF"], "software", ["precise", "focused"]),
    "anthropic": ("Anthropic", ["#D97757", "#1F2937"], ["#F4E4D8"], "AI research", ["thoughtful", "formal"]),
    "demo-a": ("Company A", ["#3B82F6"], ["#BFDBFE"], "technology", ["precise"]),
    "demo-b": ("Company B", ["#F97316"], ["#FED7AA"], "creative", ["playful"]),
    "demo-c": ("Company C", ["#10B981"], ["#A7F3D0"], "community", ["open"]),
    "demo-d": ("Company D", ["#8B5CF6"], ["#DDD6FE"], "technology", ["bold"]),
    "demo-e": ("Company E", ["#EC4899"], ["#FBCFE8"], "creative", ["expressive"]),
}


def _slug(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "-" for ch in value.lower()).strip("-")


def _resolve_logo_path(company_id: str, logo_raw: dict) -> str | None:
    explicit = logo_raw.get("assetPath") or logo_raw.get("asset_path")
    if explicit:
        path = Path(str(explicit)).expanduser()
        return str(path) if path.is_file() else str(explicit)
    repo = ROOT.parent.parent
    brand_dir = repo / "public" / "assets" / "brands" / _slug(company_id)
    for ext in (".svg", ".png", ".jpg", ".jpeg"):
        candidate = brand_dir / f"logo{ext}"
        if candidate.is_file():
            return str(candidate)
    return None


def _read_input(company: str, spec_path: str | None) -> dict:
    if spec_path:
        return json.loads(Path(spec_path).expanduser().read_text())
    return {"companyId": company}


def _make_specs(raw: dict, company: str):
    company_id = _slug(str(raw.get("companyId") or company))
    built_in = BUILT_IN_COMPANIES.get(company_id, (company_id.replace("-", " ").title(), ["#3B82F6"], ["#DBEAFE"], "technology", []))
    name, primary, secondary, industry, personality = built_in
    brand_raw = raw.get("brand") if isinstance(raw.get("brand"), dict) else raw
    logo_raw = brand_raw.get("logo") if isinstance(brand_raw.get("logo"), dict) else {}
    logo_path = _resolve_logo_path(company_id, logo_raw)
    brand = BrandSpec(
        company_id=company_id,
        company_name=str(brand_raw.get("companyName") or name),
        website=str(brand_raw.get("website") or ""),
        industry=str(brand_raw.get("industry") or industry),
        personality=list(brand_raw.get("personality") or personality),
        primary_colours=list(brand_raw.get("brandColours") or brand_raw.get("primaryColours") or primary),
        secondary_colours=list(brand_raw.get("secondaryColours") or secondary),
        visual_style=str(brand_raw.get("visualStyle") or ""),
        architectural_direction=str(brand_raw.get("architecturalDirection") or ""),
        signage_direction=str(brand_raw.get("signageDirection") or ""),
        logo=BrandLogoSpec(
            wordmark=str(logo_raw.get("wordmark") or brand_raw.get("companyName") or name),
            asset_path=logo_path,
            source_url=logo_raw.get("sourceUrl") or logo_raw.get("source_url"),
            fetched_at=logo_raw.get("fetchedAt") or logo_raw.get("fetched_at"),
            sha256=logo_raw.get("sha256"),
            format=logo_raw.get("format"),
        ),
    )
    building_raw = raw.get("building") if isinstance(raw.get("building"), dict) else raw
    asset_id = str(building_raw.get("assetId") or f"pack.agentspace.building.{company_id}.01")
    grid = building_raw.get("plotGrid") or {"x": 0, "y": 0, "w": 6, "h": 5}
    footprint = building_raw.get("footprint") or {}
    spec = GeneratedBuildingSpec(
        asset_id=asset_id,
        building_id=str(building_raw.get("buildingId") or company_id),
        parcel_id=str(building_raw.get("parcelId") or building_raw.get("plotId") or f"generated-{company_id}"),
        brand=brand,
        recipe=str(building_raw.get("recipe") or "auto"),
        root_local=tuple(building_raw.get("rootLocal") or (240.0, 24.0, 0.0)),
        scale=float(building_raw.get("scale") or 1.0),
        footprint_w=float(building_raw.get("footprintW") or footprint.get("w") or 42.0),
        footprint_d=float(building_raw.get("footprintD") or footprint.get("d") or 30.0),
        site_z=float(building_raw.get("siteZ") or 0.34),
        max_height=float(building_raw["maxHeight"]) if building_raw.get("maxHeight") is not None else None,
        mat_defs=dict(building_raw.get("matDefs") or {}),
        recipe_params=dict(building_raw.get("recipeParams") or {}),
        plot_grid={k: float(v) for k, v in grid.items()},
        detail_density=str(building_raw.get("detailDensity") or "HIGH").upper(),
        runtime_export_kinds=list(building_raw.get("runtimeExportKinds") or [
            "structure", "facade", "window", "door", "roof", "canopy",
            "signage", "brand", "site", "landscape",
        ]),
    )
    return brand, spec


def _sync_metadata(repo_root: Path, report: dict, spec: GeneratedBuildingSpec) -> None:
    meters = report.get("localMeters") or {}
    if not meters.get("w") or not meters.get("d"):
        return
    payload = {
        "assetId": spec.asset_id,
        "localMeters": {"w": meters["w"], "d": meters["d"], "h": meters.get("h", 0)},
        "buildingId": spec.building_id,
        "brandId": spec.brand.company_id,
    }
    script = repo_root / "scripts/sync-building-meters.ts"
    try:
        subprocess.run(
            ["npx", "--yes", "tsx", str(script)],
            cwd=repo_root,
            input=json.dumps(payload),
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"metadata sync skipped: {exc}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a deterministic Agentspace company HQ")
    parser.add_argument("--company", required=True, help="company id or built-in demo id")
    parser.add_argument("--spec", help="JSON company/building spec")
    parser.add_argument("--plot", "--plot-id", dest="plot_id", help="live plot id used as generation parcel")
    parser.add_argument("--plot-grid", dest="plot_grid", help="x,y,w,h tile envelope")
    parser.add_argument("--website", help="company website used for brand lookup")
    parser.add_argument("--preview", action="store_true", help="build into the library without publishing")
    parser.add_argument("--publish", action="store_true", help="export the generated pack and sync measured metadata")
    args = parser.parse_args()
    if args.preview and args.publish:
        parser.error("--preview and --publish are mutually exclusive")

    raw = _read_input(args.company, args.spec)
    if args.website:
        raw["website"] = args.website
    if args.plot_id:
        raw["parcelId"] = args.plot_id
        raw["plotId"] = args.plot_id
    if args.plot_grid:
        parts = [float(p.strip()) for p in args.plot_grid.split(",")]
        if len(parts) != 4:
            parser.error("--plot-grid expects x,y,w,h")
        raw["plotGrid"] = {"x": parts[0], "y": parts[1], "w": parts[2], "h": parts[3]}
    brand, spec = _make_specs(raw, args.company)
    report = build_company_building(brand, spec)
    output = {"companyId": brand.company_id, "assetId": spec.asset_id, "preview": args.preview, "report": report}
    if args.publish:
        exported = export_pack_asset(spec.asset_id)
        output["export"] = exported
        _sync_metadata(ROOT.parent.parent, exported, spec)
    print(MARKER + json.dumps(output, default=str))
    print("BUILD_OK", spec.asset_id, report["recipe"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())