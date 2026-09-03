"""CLI — build and export pack.agentspace.logo.* GLB from an official asset.

Examples:
  npm run logo:build -- --company echt
  npm run logo:build -- --company acme --logo public/assets/brands/acme/logo.svg --publish
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.company_building_spec import BrandLogoSpec
from agentspace.logo_export import build_and_export_logo, build_logo_glb, logo_asset_id

MARKER = "ASW_LOGO_JSON:"


def _resolve_logo_path(company_id: str, explicit: str | None) -> Path | None:
    if explicit:
        path = Path(explicit).expanduser()
        return path if path.is_file() else None
    repo = ROOT.parent.parent
    brand_dir = repo / "public" / "assets" / "brands" / company_id
    for ext in (".svg", ".png", ".jpg", ".jpeg"):
        candidate = brand_dir / f"logo{ext}"
        if candidate.is_file():
            return candidate
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Export an official company logo GLB")
    parser.add_argument("--company", required=True, help="company id (echt, stripe, …)")
    parser.add_argument("--logo", help="explicit logo asset path")
    parser.add_argument("--width", type=float, default=2.4, help="logo width in metres")
    parser.add_argument("--preview", action="store_true", help="build into library without exporting GLB")
    parser.add_argument("--publish", action="store_true", help="export GLB to public/assets/gltf/logos/")
    args = parser.parse_args()
    if args.preview and args.publish:
        parser.error("--preview and --publish are mutually exclusive")

    company_id = args.company.lower().strip()
    logo_path = _resolve_logo_path(company_id, args.logo)
    if not logo_path:
        raise SystemExit(f"no official logo asset for {company_id}; run npm run brand:resolve first")

    logo = BrandLogoSpec(
        wordmark=company_id.upper(),
        asset_path=str(logo_path),
        source_url="",
    )
    if args.publish:
        report = build_and_export_logo(logo, company_id=company_id, width=args.width)
    else:
        report = build_logo_glb(logo, company_id=company_id, width=args.width)
        report["preview"] = True

    print(MARKER + json.dumps(report, default=str))
    print("LOGO_OK", report["assetId"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
