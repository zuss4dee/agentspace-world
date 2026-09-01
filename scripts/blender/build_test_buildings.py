"""Generate all recipe preview buildings in the Blender asset library (no publish).

Visual target: docs/BUILDING_VISUAL_STYLE.md (Apple 3D Maps / premium toy-city).

Usage:
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_test_buildings.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.company_building import build_company_building
from agentspace.test_buildings import PREVIEW_BUILDINGS, preview_brand, preview_spec

MARKER = "ASW_PREVIEW_JSON:"


if __name__ == "__main__":
    reports = []
    for case in PREVIEW_BUILDINGS:
        brand = preview_brand(case)
        spec = preview_spec(case)
        report = build_company_building(brand, spec)
        report["label"] = case.label
        report["displayName"] = case.display_name
        report["rootLocal"] = list(case.root_local)
        reports.append(report)
        print("PREVIEW_OK", case.display_name, report["localMeters"], report.get("composition", {}).get("plans", 0))

    print(MARKER + json.dumps(reports))
    print("PREVIEW_ALL_OK", len(reports))
