"""Build Echt architecture in the locked world blend and export the building GLB."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.echt_building import build_echt_building
from agentspace.echt_building_canonical import build_echt_canonical
from agentspace.export_runtime import export_runtime_building, verify_placement
from agentspace.validate_world import validate
from agentspace.contract import load_contract


if __name__ == "__main__":
    building = build_echt_building()
    report = verify_placement(building)
    path = export_runtime_building(building)
    world = validate(load_contract())
    print("PLACEMENT", report)
    print("GLB", path)
    print("WORLD_VALIDATE", world["ok"], world["errors"][:8])
    if not report["originOk"] or not report["footprintOk"]:
        raise SystemExit("ECHT PLACEMENT FAILED")
    print("ECHT_EXPORT_OK")
