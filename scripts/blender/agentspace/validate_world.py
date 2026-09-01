"""Compare Blender scene against world_contract.json. Fails on coordinate drift."""
from __future__ import annotations

from collections import Counter

import bpy
from mathutils import Vector

from .contract import world_xy
from .registry import list_components
from .world import COL_NAMES

FORBIDDEN_KINDS = {
    "building",
    "facade",
    "window",
    "door",
    "roof",
    "canopy",
    "interior",
    "context",
    "massing",
}
FORBIDDEN_NAME_BITS = (
    "ServiceBar",
    "Massing_",
    "EchtStudio",
    "SignECHT",
    "HallNorth",
    "SouthGlass",
)

ALLOWED_ARCH_ASSETS = {"pack.northshore.building.studio.loft"}
REQUIRED_IXN = {
    "intersection.standard",
    "intersection.arterial",
    "intersection.corner",
    "intersection.t",
}
REQUIRED_LIGHTS = {
    "street_light.local",
    "street_light.arterial",
    "street_light.park",
    "street_light.pedestrian",
}
REQUIRED_VEG = {
    "tree.small",
    "tree.medium",
    "tree.large",
    "tree.canopy",
    "tree.street",
    "tree.park",
    "shrub",
    "hedge",
    "planting_bed",
    "grass_zone",
}
REQUIRED_PARKS = {"park.pocket", "park.neighbourhood", "park.large", "park.linear", "plaza"}
TL_DIRS = {"north", "south", "east", "west"}


def validate(contract: dict) -> dict:
    bpy.context.view_layer.update()
    tile = contract["tile"]
    grid = contract["grid"]
    errors: list[str] = []
    comps = list_components()
    kinds = {c["kind"] for c in comps if c.get("assetId") not in ALLOWED_ARCH_ASSETS}
    if kinds & FORBIDDEN_KINDS:
        errors.append(f"forbidden kinds present: {sorted(kinds & FORBIDDEN_KINDS)}")
    for ob in bpy.data.objects:
        if any(bit in ob.name for bit in FORBIDDEN_NAME_BITS):
            errors.append(f"building object still in scene: {ob.name}")
        if ob.get("asw_kind") in FORBIDDEN_KINDS and ob.get("asw_assetId") not in ALLOWED_ARCH_ASSETS:
            errors.append(f"building component {ob.name} kind={ob.get('asw_kind')}")
        if "asw_price" in ob:
            errors.append(f"price baked into Blender object {ob.name}")

    missing_cols = [n for n in COL_NAMES if n not in bpy.data.collections]
    if missing_cols:
        errors.append(f"missing collections: {missing_cols}")
    if bpy.data.collections.get("Agentspace_World") is None:
        errors.append("missing Agentspace_World collection")

    if abs(contract["worldSpan"] - grid * tile) > 1e-6:
        errors.append("worldSpan != grid * tile")
    origin = bpy.data.objects.get("Agentspace_World")
    if origin is None:
        errors.append("missing Agentspace_World root")
    elif Vector(origin.location).length > 1e-4:
        errors.append(f"world origin drifted: {list(origin.location)}")

    lot_objs = {ob.get("asw_lotId"): ob for ob in bpy.data.objects if ob.get("asw_kind") == "lot" and ob.get("asw_lotId")}
    missing = 0
    drifted = 0
    for p in contract["lots"]:
        ob = lot_objs.get(p["id"])
        if ob is None:
            missing += 1
            continue
        exp = (p["world"]["x"], p["world"]["y"], 0.12)
        got = ob.matrix_world.translation
        if max(abs(got.x - exp[0]), abs(got.y - exp[1])) > 0.05:
            drifted += 1
            if drifted <= 5:
                errors.append(f"lot {p['id']} pos {[got.x, got.y]} != {exp[:2]}")
        gw = ob.get("asw_gridSizeX")
        gh = ob.get("asw_gridSizeY")
        if gw is not None and abs(float(gw) - p["grid"]["w"]) > 1e-4:
            errors.append(f"lot {p['id']} width {gw} != {p['grid']['w']}")
        if gh is not None and abs(float(gh) - p["grid"]['h']) > 1e-4:
            errors.append(f"lot {p['id']} depth {gh} != {p['grid']['h']}")
        for key in ("asw_parcelId", "asw_parcelType", "asw_area", "asw_gridX", "asw_gridY", "asw_shape", "asw_zone", "asw_frontage", "asw_roadAccess", "asw_cornerLot", "asw_sizeClass", "asw_marketTier"):
            if key not in ob:
                errors.append(f"lot {p['id']} missing {key}")
                break
    if missing:
        errors.append(f"{missing} lots missing from Blender")
    if len(lot_objs) != len(contract["lots"]):
        errors.append(f"lot count {len(lot_objs)} != {len(contract['lots'])}")

    roads = [c for c in comps if c["kind"] == "road"]
    if len(roads) < len(contract["roadXs"]) + len(contract["roadYs"]):
        errors.append(f"too few road components: {len(roads)}")

    sample_x, sample_y = world_xy(contract["roadXs"][0] + 0.5, 0.5, grid, tile)
    if abs(sample_x - (contract["roadXs"][0] + 0.5 - grid / 2) * tile) > 1e-6:
        errors.append("wx conversion drifted")

    ixn = {str(ob.get("asw_intersectionType")) for ob in bpy.data.objects if ob.get("asw_intersectionType")}
    if not REQUIRED_IXN <= ixn:
        errors.append(f"missing intersection types: {sorted(REQUIRED_IXN - ixn)}")

    tl_ids = [
        str(ob.get("asw_componentId"))
        for ob in bpy.data.objects
        if ob.get("asw_trafficLightId")
        and not ob.get("asw_signal")
        and not str(ob.get("asw_componentId", "")).endswith(("/pole", "/arm"))
        and not str(ob.get("asw_assetId", "")).startswith("pack.agentspace")
    ]
    if not tl_ids:
        errors.append("no traffic_light component IDs")
    else:
        bad = [cid for cid in tl_ids if not cid.startswith("traffic_light/intersection/") or cid.rsplit("/", 1)[-1] not in TL_DIRS]
        if bad[:3]:
            errors.append(f"traffic_light IDs not compass-named: {bad[:3]}")

    lights = {str(ob.get("asw_lightType")) for ob in bpy.data.objects if ob.get("asw_lightType")}
    if not REQUIRED_LIGHTS <= lights:
        errors.append(f"missing street_light types: {sorted(REQUIRED_LIGHTS - lights)}")

    parks = {str(ob.get("asw_parkScale")) for ob in bpy.data.objects if ob.get("asw_parkScale")}
    if not REQUIRED_PARKS <= parks:
        errors.append(f"missing park scales: {sorted(REQUIRED_PARKS - parks)}")

    veg = set()
    for ob in bpy.data.objects:
        cid = str(ob.get("asw_componentId", ""))
        for k in REQUIRED_VEG:
            if f"/{k}/" in cid or cid.endswith("/" + k) or k in str(ob.get("asw_vegKind", "")):
                veg.add(k)
    if not REQUIRED_VEG <= veg:
        errors.append(f"missing vegetation kinds: {sorted(REQUIRED_VEG - veg)}")

    building_meshes = [
        o.name
        for o in bpy.data.objects
        if o.type == "MESH"
        and o.get("asw_kind") in FORBIDDEN_KINDS
        and o.get("asw_assetId") not in ALLOWED_ARCH_ASSETS
    ]
    land_preview = sum(1 for o in bpy.data.objects if o.name.startswith("LandPreview_"))
    if land_preview > 80:
        errors.append(f"land preview too dense ({land_preview} meshes); marketplace must stay a locator")

    if "Agentspace_Asset_Library" not in bpy.data.collections:
        errors.append("missing Agentspace_Asset_Library collection")
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library")
    if lib_col:
        leaked = [
            o.name
            for o in lib_col.all_objects
            if o.get("asw_assetId") == "agentspace.world" and o.get("asw_runtimeExport") == 1
        ]
        if leaked:
            errors.append(f"library objects tagged for world export: {leaked[:5]}")

    cid_counts = Counter(
        str(o.get("asw_componentId"))
        for o in bpy.data.objects
        if o.get("asw_componentId") and str(o.get("asw_assetId", "")).startswith("pack.agentspace")
    )
    dup = sorted(c for c, n in cid_counts.items() if n > 1)
    if dup:
        errors.append(f"duplicate pack component IDs: {dup[:8]}")

    aids = [str(o.get("asw_assetId")) for o in bpy.data.objects if o.get("asw_libraryRoot")]
    if len(aids) != len(set(aids)):
        errors.append("duplicate library root assetIds")

    if any(o.get("asw_kind") in FORBIDDEN_KINDS and not str(o.get("asw_assetId", "")).startswith("pack.northshore.building") for o in bpy.data.objects if o.type == "MESH"):
        pass

    ocean = bpy.data.objects.get("OceanWest")
    if ocean is None:
        errors.append("OceanWest missing")
    else:
        # Geometry must stay west of the campus, not on the origin.
        if ocean.matrix_world.translation.x > -200:
            errors.append(f"OceanWest moved: {list(ocean.matrix_world.translation)}")

    return {
        "ok": not errors and not building_meshes,
        "errors": errors,
        "lotsExpected": len(contract["lots"]),
        "lotsFound": len(lot_objs),
        "roadComponents": len(roads),
        "collections": COL_NAMES,
        "intersectionTypes": sorted(ixn),
        "streetLightTypes": sorted(lights),
        "parkScales": sorted(parks),
        "vegetationKinds": sorted(veg),
        "trafficLights": len(tl_ids),
        "landPreviewCells": land_preview,
        "grid": grid,
        "tile": tile,
        "origin": [0, 0, 0],
        "yUpExportConvention": True,
        "buildingMeshes": building_meshes,
    }
