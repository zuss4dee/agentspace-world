"""Build the startup-district environment in the existing Agentspace blend. No buildings."""
from __future__ import annotations

import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.env_district import X0, X1, Y0, Y1, build_env, world_aabb
from agentspace.export_env import env_report, export_env
from agentspace.validate_world import validate


if __name__ == "__main__":
    env, contract = build_env()
    report = validate(contract)
    path = export_env()
    blend = ROOT / "agentspace-world.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    xmin, ymin, xmax, ymax = world_aabb()
    print("ENV_BOUNDS_GRID", X0, Y0, X1, Y1)
    print("ENV_BOUNDS_WORLD", xmin, ymin, xmax, ymax)
    print("ENV_EXPORT", path, path.stat().st_size)
    print("ENV_REPORT", env_report())
    print("VALIDATE", report)
    print("BLEND", blend)
    if not report["ok"]:
        raise SystemExit("WORLD CONTRACT VALIDATION FAILED")
    print("ENV_DISTRICT_OK")
