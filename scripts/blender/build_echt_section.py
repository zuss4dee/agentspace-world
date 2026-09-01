"""Deprecated for STEP 1. Base world only — see build_world.py."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("build_world.py")), run_name="__main__")
