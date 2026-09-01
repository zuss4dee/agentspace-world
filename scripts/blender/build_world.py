"""STEP 1 Blender world builder — base layout, zero buildings."""
from __future__ import annotations

import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.world import COL_NAMES, build_world
from agentspace.validate_world import validate


if __name__ == "__main__":
    root, contract = build_world()
    report = validate(contract)
    blend = ROOT / "agentspace-world.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    print("WORLD_ORIGIN", list(root.location))
    print("COLLECTIONS", COL_NAMES)
    print("VALIDATE", report)
    print("BLEND", blend)
    if not report["ok"]:
        raise SystemExit("WORLD CONTRACT VALIDATION FAILED")
    print("STEP1_OK")
