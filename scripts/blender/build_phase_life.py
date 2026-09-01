"""Phase: environment life + materials + asset library. Does NOT rebuild the world."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.apply_env_materials import apply_env_materials
from agentspace.asset_library import LIBRARY_ORIGIN, build_asset_library
from agentspace.env_life import add_env_life
from agentspace.export_pack import export_pack_assets
from agentspace.validate_world import validate
from agentspace.contract import load_contract
from export_world import export_world

WATCH = ("Agentspace_World", "TerrainCampus", "OceanWest", "Road_local_0")


def fingerprint():
    out = {}
    for name in WATCH:
        ob = bpy.data.objects.get(name)
        if ob:
            t = ob.matrix_world.translation
            out[name] = [round(t.x, 5), round(t.y, 5), round(t.z, 5)]
    return out


if __name__ == "__main__":
    before = fingerprint()
    lib = build_asset_library()
    mats = apply_env_materials()
    life = add_env_life()
    after = fingerprint()
    drifted = {k: {"before": before[k], "after": after[k]} for k in before if before.get(k) != after.get(k)}
    if drifted:
        raise SystemExit(f"WORLD GEOMETRY DRIFTED: {drifted}")
    contract = load_contract()
    report = validate(contract)
    packs = export_pack_assets()
    world_path = export_world(ROOT.parent.parent / "public" / "assets" / "gltf" / "agentspace-world-phase-life.glb")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "agentspace-world-phase-life.blend"))
    print(
        json.dumps(
            {
                "library": lib,
                "libraryOrigin": list(LIBRARY_ORIGIN),
                "materialsAssigned": mats,
                "life": life,
                "fingerprint": after,
                "validation": report,
                "packs": packs,
                "worldGlb": str(world_path),
                "worldBytes": world_path.stat().st_size,
            },
            indent=2,
            default=str,
        )
    )
    if not report["ok"]:
        raise SystemExit("WORLD CONTRACT VALIDATION FAILED")
    print("PHASE_LIFE_OK")
