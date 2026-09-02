"""Chunky toy block font — any company wordmark as bevel-free bar glyphs.

Glyphs are 5×7 bitmaps merged into axis-aligned rectangles so each letter is a
handful of boxes (city-scale readable, cheap to export). Unit glyph space:
width 0.72, height 1.0 — matches the legacy E/C/H/T vector glyphs used by Echt.

bpy-free so it can be unit-tested outside Blender.
"""
from __future__ import annotations

GLYPH_W = 0.72
GLYPH_H = 1.0
_COLS = 5
_ROWS = 7

# Row 0 is the top of the glyph. '#' = filled.
_BITMAP: dict[str, tuple[str, ...]] = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "B": ("11110", "10001", "10001", "11110", "10001", "10001", "11110"),
    "C": ("01111", "10000", "10000", "10000", "10000", "10000", "01111"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "G": ("01111", "10000", "10000", "10111", "10001", "10001", "01111"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "J": ("11111", "00010", "00010", "00010", "00010", "10010", "01110"),
    "K": ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "Q": ("01110", "10001", "10001", "10001", "10101", "10010", "01101"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "V": ("10001", "10001", "10001", "10001", "10001", "01010", "00100"),
    "W": ("10001", "10001", "10001", "10101", "10101", "10101", "01010"),
    "X": ("10001", "10001", "01010", "00100", "01010", "10001", "10001"),
    "Y": ("10001", "10001", "01010", "00100", "00100", "00100", "00100"),
    "Z": ("11111", "00001", "00010", "00100", "01000", "10000", "11111"),
    "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    "3": ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    "4": ("10001", "10001", "10001", "11111", "00001", "00001", "00001"),
    "5": ("11111", "10000", "10000", "11110", "00001", "00001", "11110"),
    "6": ("01111", "10000", "10000", "11110", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00001", "11110"),
    "&": ("01100", "10010", "10100", "01000", "10101", "10010", "01101"),
    "-": ("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    ".": ("00000", "00000", "00000", "00000", "00000", "01100", "01100"),
    "'": ("01100", "01100", "00100", "00000", "00000", "00000", "00000"),
    "+": ("00000", "00100", "00100", "11111", "00100", "00100", "00000"),
}

# Legacy vector glyphs — exact shapes Echt shipped with. Kept so the frozen
# echt_v1 preset produces identical geometry.
LEGACY_T = 0.2
LEGACY_GLYPHS: dict[str, tuple[tuple[float, float, float, float], ...]] = {
    "E": ((0, 0, LEGACY_T, 1.0), (0, 0.85, 0.72, LEGACY_T), (0, 0.42, 0.58, LEGACY_T), (0, 0, 0.72, LEGACY_T)),
    "C": ((0, 0, LEGACY_T, 1.0), (0, 0.85, 0.72, LEGACY_T), (0, 0, 0.72, LEGACY_T)),
    "H": ((0, 0, LEGACY_T, 1.0), (0.56, 0, LEGACY_T, 1.0), (0, 0.42, 0.72, LEGACY_T)),
    "T": ((0, 0.85, 0.78, LEGACY_T), (0.31, 0, LEGACY_T, 1.0)),
}


def _greedy_rects(cells: set[tuple[int, int]]) -> list[tuple[int, int, int, int]]:
    pending = set(cells)
    rects: list[tuple[int, int, int, int]] = []
    while pending:
        x, y = min(pending)
        w = 1
        while (x + w, y) in pending:
            w += 1
        h = 1
        while all((x + dx, y + h) in pending for dx in range(w)):
            h += 1
        for dx in range(w):
            for dy in range(h):
                pending.discard((x + dx, y + dy))
        rects.append((x, y, w, h))
    return rects


_RECT_CACHE: dict[str, tuple[tuple[float, float, float, float], ...]] = {}


def glyph_rects(ch: str) -> tuple[tuple[float, float, float, float], ...]:
    """Rectangles (lx, lz, lw, lh) in unit glyph space for one character."""
    ch = ch.upper()
    if ch in _RECT_CACHE:
        return _RECT_CACHE[ch]
    rows = _BITMAP.get(ch)
    if rows is None:
        return ()
    cells: set[tuple[int, int]] = set()
    for r, line in enumerate(rows):
        for c, bit in enumerate(line):
            if bit == "1":
                # bitmap row 0 is top → z row index = ROWS-1-r (z up)
                cells.add((c, _ROWS - 1 - r))
    px_w = GLYPH_W / _COLS
    px_h = GLYPH_H / _ROWS
    rects = tuple(
        (x * px_w, y * px_h, w * px_w, h * px_h) for (x, y, w, h) in _greedy_rects(cells)
    )
    _RECT_CACHE[ch] = rects
    return rects


def glyph_advance(ch: str) -> float:
    ch = ch.upper()
    if ch == " ":
        return GLYPH_W * 0.55
    if ch in {".", "'"}:
        return GLYPH_W * 0.45
    if ch == "I":
        return GLYPH_W * 0.85
    return GLYPH_W


def supports(text: str) -> bool:
    return all(c.upper() in _BITMAP or c == " " for c in text)


def legacy_supports(text: str) -> bool:
    return bool(text) and all(c in LEGACY_GLYPHS for c in text)


def sanitize_wordmark(text: str, *, max_len: int = 12) -> str:
    """Uppercase, drop unsupported glyphs, collapse spaces, clamp length."""
    out: list[str] = []
    for c in text.upper():
        if c in _BITMAP or c == " ":
            out.append(c)
    s = " ".join("".join(out).split())
    return s[:max_len].strip()


def wordmark_width(text: str, *, s: float = 1.0, gap: float = 0.14) -> float:
    """Total advance width of a rendered wordmark (scaled)."""
    total = 0.0
    for ch in text:
        total += glyph_advance(ch) * s + gap
    return max(0.0, total - gap)
