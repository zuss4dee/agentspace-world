"""Generate ≥10 procedural test buildings from test-specs/manifest.json.

Authors into the Blender asset library staging grid (not live city plots).
Optionally exports GLBs to public/assets/gltf/buildings/test/ when --export is set.

Usage:
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_procedural_test_batch.py

  blender ... --python scripts/blender/build_procedural_test_batch.py -- --export
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.brand_profile import brand_profile_from_dict, build_spec_from_profile, load_brand_profile
from agentspace.company_building import build_company_building
from agentspace.export_pack import export_pack_asset
from agentspace.uniqueness_registry import list_entries, structural_fingerprint

MANIFEST = ROOT / "test-specs" / "manifest.json"
MARKER = "ASW_TEST_BATCH_JSON:"
TEST_GLB_SUBDIR = "test"


def _load_case(raw: dict) -> tuple[object, dict]:
    if raw.get("brandPath"):
        profile = load_brand_profile(ROOT / raw["brandPath"])
    else:
        profile = brand_profile_from_dict(raw)
    grid = raw.get("plotGrid") or {}
    footprint = raw.get("footprint") or {}
    spec = build_spec_from_profile(
        profile,
        asset_id=raw["assetId"],
        root_local=tuple(raw.get("rootLocal") or (260.0, 200.0, 0.0)),
        plot_grid={k: float(v) for k, v in grid.items()},
        footprint=(float(footprint.get("w", 0)), float(footprint.get("d", 0))) if footprint else None,
        tier=raw.get("tier"),
        plot_id=raw["plotId"],
    )
    if raw.get("maxHeight") is not None:
        spec.max_height = float(raw["maxHeight"])
    return profile, {"label": raw["label"], "spec": spec}


def main() -> int:
    export = "--export" in sys.argv
    cases = json.loads(MANIFEST.read_text())
    if len(cases) < 10:
        raise SystemExit(f"manifest must have ≥10 cases, found {len(cases)}")

    reports = []
    fingerprints: set[str] = set()

    for raw in cases:
        profile, ctx = _load_case(raw)
        spec = ctx["spec"]
        report = build_company_building(spec.brand, spec)
        fp = spec.recipe_params.get("structuralFingerprint") or structural_fingerprint(spec.recipe, spec.recipe_params)
        if fp in fingerprints:
            raise RuntimeError(f"duplicate structural fingerprint in batch: {fp} ({ctx['label']})")
        fingerprints.add(fp)
        row = {
            "label": ctx["label"],
            "companyId": profile.company_id,
            "plotId": spec.parcel_id,
            "assetId": spec.asset_id,
            "grammar": spec.recipe,
            "structuralFingerprint": fp,
            "localMeters": report.get("localMeters"),
            "footprintValidation": report.get("footprintValidation"),
            "rootLocal": list(spec.root_local),
        }
        if export:
            try:
                exported = export_pack_asset(spec.asset_id)
                row["glb"] = exported.get("path")
            except Exception as exc:
                row["exportError"] = str(exc)
        reports.append(row)
        print("TEST_OK", ctx["label"], spec.recipe, fp, report.get("localMeters"))

    summary = {
        "count": len(reports),
        "uniqueFingerprints": len(fingerprints),
        "grammars": sorted({r["grammar"] for r in reports}),
        "registryEntries": len(list_entries()),
        "reports": reports,
    }
    print(MARKER + json.dumps(summary, default=str))
    print("TEST_BATCH_OK", len(reports), len(fingerprints))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
