"""64×64 Agentspace world contract — values must match TypeScript campus/coords."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "world_contract.json"
REG_PATH = ROOT / "agentspace-registry.json"
REPO = ROOT.parent.parent
GLTF_DIR = REPO / "public" / "assets" / "gltf"


def load_contract() -> dict:
    with CONTRACT_PATH.open() as f:
        return json.load(f)


def wx(grid_x: float, grid: int = 64, tile: float = 32.0) -> float:
    return (grid_x - grid / 2.0) * tile


def wz(grid_y: float, grid: int = 64, tile: float = 32.0) -> float:
    return (grid_y - grid / 2.0) * tile


def world_xy(grid_x: float, grid_y: float, grid: int = 64, tile: float = 32.0) -> tuple[float, float]:
    """Blender X,Y for a grid point. Z is up. Matches Three.js (wx, wz)."""
    return wx(grid_x, grid, tile), wz(grid_y, grid, tile)


def building_height(campus_h: float, tile: float = 32.0) -> float:
    return max(tile * 0.45, (campus_h / 16.0) * (tile / 1.2))


def lot_center_grid(b: dict) -> tuple[float, float]:
    return b["origin"]["x"] + b["size"]["x"] / 2.0, b["origin"]["y"] + b["size"]["y"] / 2.0


def lot_world_origin(b: dict, grid: int = 64, tile: float = 32.0) -> tuple[float, float, float]:
    cx, cy = lot_center_grid(b)
    x, y = world_xy(cx, cy, grid, tile)
    return x, y, 0.0
