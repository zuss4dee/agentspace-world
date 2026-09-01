"""Author the Echt parcel site into the locked world blend. No buildings, no GLB."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.site import build_echt_site


if __name__ == "__main__":
    report = build_echt_site()
    print("SITE_OK", report["validate"]["ok"])
    print("NEW", report["newComponents"])
    print("FORBIDDEN", report["forbidden"])
