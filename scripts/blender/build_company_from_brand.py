"""Build a Silicon City company building from a brand JSON profile.

Usage (Blender background or MCP):
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_company_from_brand.py -- \\
    --brand scripts/blender/brands/nova.json \\
    --root-local 260,200,0

Env overrides:
  ASW_BRAND_JSON=/path/to/brand.json
  ASW_ROOT_LOCAL=260,200,0
  ASW_ASSET_ID=pack.agentspace.building.nova.01
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.brand_profile import load_brand_profile
from agentspace.siliconcity.builder import build_from_profile

MARKER = "ASW_BUILD_JSON:"
LEGACY_MARKER = "ASW_SILICONCITY_JSON:"


def _parse_xyz(text: str) -> tuple[float, float, float]:
    parts = [float(p.strip()) for p in text.split(",")]
    if len(parts) != 3:
        raise ValueError(f"expected x,y,z got {text!r}")
    return parts[0], parts[1], parts[2]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", default=os.environ.get("ASW_BRAND_JSON", ""))
    ap.add_argument("--root-local", default=os.environ.get("ASW_ROOT_LOCAL", "260,200,0"))
    ap.add_argument("--asset-id", default=os.environ.get("ASW_ASSET_ID") or None)
    ap.add_argument("--tier", default=os.environ.get("ASW_TIER") or None)
    args, _ = ap.parse_known_args(sys.argv[1:])

    brand_path = args.brand
    if not brand_path:
        raise SystemExit("pass --brand path/to/brand.json (or ASW_BRAND_JSON)")

    profile = load_brand_profile(brand_path)
    report = build_from_profile(
        profile,
        asset_id=args.asset_id,
        root_local=_parse_xyz(args.root_local),
        tier=args.tier,
    )
    payload = json.dumps(report, default=str)
    print(MARKER + payload)
    print(LEGACY_MARKER + payload)
    print(
        "BUILD_OK",
        report.get("assetId"),
        report.get("archetype"),
        report.get("uniquenessKey"),
        report.get("rootLocal"),
    )


if __name__ == "__main__":
    main()
