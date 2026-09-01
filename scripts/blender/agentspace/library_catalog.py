"""Reusable decoration vocabulary — maps composition slots to existing library assets."""
from __future__ import annotations

from typing import TypedDict

# Existing pack.agentspace.* roots in Agentspace_Asset_Library (do not duplicate meshes).
LIBRARY_ASSETS: dict[str, str] = {
    "bench": "pack.agentspace.bench.city.01",
    "bollard": "pack.agentspace.bollard.city.01",
    "bin": "pack.agentspace.bin.city.01",
    "barrier": "pack.agentspace.barrier.crowd.01",
    "bus_shelter": "pack.agentspace.busstop.shelter.01",
    "hydrant": "pack.agentspace.hydrant.city.01",
    "parking_meter": "pack.agentspace.parking.meter.01",
    "bike": "pack.agentspace.vehicle.bike.01",
    "billboard": "pack.agentspace.billboard.frame.01",
    "poster": "pack.agentspace.poster.frame.01",
    "sign_post": "pack.agentspace.sign.post.01",
    "sign_parking": "pack.agentspace.sign.parking.01",
    "street_sign": "pack.agentspace.street.sign.standard.01",
    "streetlight_modern": "pack.agentspace.streetlight.modern.01",
    "streetlight_park": "pack.agentspace.streetlight.park.01",
    "streetlight_ped": "pack.agentspace.streetlight.pedestrian.01",
    "traffic_light": "pack.agentspace.trafficlight.standard.01",
}


class SlotSpec(TypedDict):
    library: tuple[str, ...]
    procedural: tuple[str, ...]


# Composition slots → candidate assets (library instancing + existing procedural vocabulary).
DECORATION_SLOTS: dict[str, SlotSpec] = {
    "rooftop_sculpture": {
        "library": ("billboard", "traffic_light", "poster"),
        "procedural": ("hero_rings", "orb_stack"),
    },
    "entrance_sculpture": {
        "library": ("bus_shelter", "poster", "billboard"),
        "procedural": ("hero_rings", "orb_stack"),
    },
    "company_landmark": {
        "library": ("billboard", "traffic_light"),
        "procedural": ("hero_rings",),
    },
    "facade_prop": {
        "library": ("sign_post", "poster", "street_sign"),
        "procedural": (),
    },
    "corner_prop": {
        "library": ("streetlight_modern", "bollard", "streetlight_park"),
        "procedural": (),
    },
    "landscape_prop": {
        "library": ("streetlight_park", "streetlight_ped", "hydrant"),
        "procedural": ("tree", "planter"),
    },
    "street_prop": {
        "library": ("bench", "bollard", "bike", "parking_meter", "bin"),
        "procedural": ("bench", "lamp"),
    },
    "roof_detail": {
        "library": ("traffic_light", "streetlight_ped", "sign_post"),
        "procedural": ("antenna", "spire"),
    },
}


def resolve_library_id(key: str) -> str:
    return LIBRARY_ASSETS[key]
