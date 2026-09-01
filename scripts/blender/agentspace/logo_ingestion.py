"""Official logo validation and placement.

This module never creates or redraws a logo. It only consumes an explicitly
supplied SVG/PNG/JPG asset and records its provenance for publish validation.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

import bpy

from .geom import link
from .registry import tag

SUPPORTED_FORMATS = {".svg", ".png", ".jpg", ".jpeg"}


def _svg_aspect(raw: str) -> float | None:
    viewbox = re.search(r"""viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)""", raw, re.I)
    if viewbox:
        w, h = float(viewbox.group(1)), float(viewbox.group(2))
        return w / h if h else None
    width = re.search(r"""width\s*=\s*["']\s*([\d.]+)""", raw, re.I)
    height = re.search(r"""height\s*=\s*["']\s*([\d.]+)""", raw, re.I)
    if width and height and float(height.group(1)):
        return float(width.group(1)) / float(height.group(1))
    return None


def inspect_logo(logo) -> dict:
    path_value = getattr(logo, "asset_path", None) if logo else None
    if not path_value:
        return {"available": False, "fallback": True, "reason": "no official asset supplied"}
    path = Path(path_value).expanduser()
    suffix = path.suffix.lower()
    if not path.is_file():
        return {"available": False, "fallback": True, "path": str(path), "reason": "asset does not exist"}
    if suffix not in SUPPORTED_FORMATS:
        return {"available": False, "fallback": True, "path": str(path), "reason": f"unsupported format: {suffix}"}
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    aspect = None
    if suffix == ".svg":
        aspect = _svg_aspect(raw.decode("utf-8", errors="replace"))
    else:
        try:
            image = bpy.data.images.load(str(path), check_existing=True)
            if image.size[1]:
                aspect = image.size[0] / image.size[1]
        except Exception as exc:
            return {"available": False, "fallback": True, "path": str(path), "reason": str(exc)}
    if not aspect or aspect <= 0:
        return {"available": False, "fallback": True, "path": str(path), "reason": "could not determine aspect ratio"}
    return {
        "available": True,
        "fallback": False,
        "path": str(path),
        "format": suffix[1:],
        "sha256": digest,
        "aspectRatio": round(aspect, 6),
        "sourceUrl": getattr(logo, "source_url", None),
        "fetchedAt": getattr(logo, "fetched_at", None),
    }


def _image_material(path: Path, material_name: str):
    image = bpy.data.images.load(str(path), check_existing=True)
    mat = bpy.data.materials.get(material_name) or bpy.data.materials.new(material_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    if "Alpha" in tex.outputs and "Alpha" in shader.inputs:
        links.new(tex.outputs["Alpha"], shader.inputs["Alpha"])
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    mat["asw_logoMaterial"] = 1
    mat["asw_logoPath"] = str(path)
    mat["asw_logoSha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    return mat


def write_logo_manifest(logo, info: dict, company_id: str | None = None) -> str | None:
    """Write provenance beside an explicitly supplied official asset."""
    if not info.get("available"):
        return None
    path = Path(info["path"])
    manifest = path.parent / "manifest.json"
    payload = {
        "companyId": company_id or path.parent.name,
        "sourceUrl": info.get("sourceUrl") or "",
        "fetchedAt": info.get("fetchedAt") or "",
        "sha256": info["sha256"],
        "format": info["format"],
        "aspectRatio": info["aspectRatio"],
    }
    manifest.write_text(__import__("json").dumps(payload, indent=2) + "\n")
    return str(manifest)


def _import_svg(path: Path, prefix, parent, col, asset_id, info, x, y, z, width):
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=str(path))
    imported = [ob for ob in bpy.data.objects if ob not in before]
    if not imported:
        raise RuntimeError("SVG importer produced no objects")
    min_x = min(ob.bound_box[i][0] for ob in imported for i in range(8))
    max_x = max(ob.bound_box[i][0] for ob in imported for i in range(8))
    raw_width = max(0.001, max_x - min_x)
    scale = width / raw_width
    for i, ob in enumerate(imported):
        ob.parent = parent
        ob.location = (x, y, z)
        ob.rotation_euler.x = 1.57079632679
        ob.scale = (scale, scale, scale)
        tag(
            ob,
            asset_id=asset_id or str(parent.get("asw_assetId") or ""),
            component_id=f"{prefix}.official_logo.{i}",
            kind="brand_logo",
            runtime=True,
        )
        ob["asw_logoOfficial"] = 1
        ob["asw_logoFormat"] = "svg"
        ob["asw_logoSourceUrl"] = info.get("sourceUrl") or ""
        ob["asw_logoSha256"] = info["sha256"]
        ob["asw_logoAspectRatio"] = info["aspectRatio"]
        link(ob, col)
    return len(imported)


def apply_logo_surface(part, prefix, logo, x, y, z, parent, col, *, width=3.0, depth=0.12, asset_id=""):
    """Place an official logo on a physical sign surface.

    SVGs are first attempted as image-backed surfaces; if Blender cannot load
    the format, callers receive a structured fallback rather than a fake logo.
    """
    info = inspect_logo(logo)
    if not info.get("available"):
        return info
    path = Path(info["path"])
    try:
        if path.suffix.lower() == ".svg":
            count = _import_svg(path, prefix, parent, col, asset_id, info, x, y, z, width)
            return {**info, "placed": True, "componentId": f"{prefix}.official_logo.0", "objects": count}
        mat = _image_material(path, f"asw.logo.{asset_id or 'company'}.{prefix}")
        height = width / float(info["aspectRatio"])
        ob = part(
            f"{prefix}.official_logo",
            width,
            depth,
            height,
            (x, y, z),
            mat,
            parent,
            col,
            f"{prefix}.official_logo",
            bevel=0.02,
        )
        ob["asw_logoOfficial"] = 1
        ob["asw_logoFormat"] = info["format"]
        ob["asw_logoSourceUrl"] = info.get("sourceUrl") or ""
        ob["asw_logoSha256"] = info["sha256"]
        ob["asw_logoAspectRatio"] = info["aspectRatio"]
        return {**info, "placed": True, "componentId": ob.get("asw_componentId")}
    except Exception as exc:
        # Do not invent a replacement. The caller may use the supplied
        # wordmark and report that it is a fallback.
        return {**info, "available": False, "fallback": True, "placed": False, "reason": str(exc)}