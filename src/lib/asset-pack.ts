import type { BuildingStyle } from "./types";

/** Illustrated pack generated from the Northshore concept. Own identity, Earth city. */
export const PACK_CATALOG = "/assets/pack/northshore-building-catalog.png";
export const PACK_TOKENS = "/assets/pack/agent-tokens.png";
export const PACK_VEHICLES = "/assets/pack/iso-vehicles.png";
export const PACK_PARK = "/assets/pack/iso-park.png";

export const ISO_BY_STYLE: Partial<Record<BuildingStyle, string>> = {
  hq: "/assets/pack/iso-hq.png",
  office: "/assets/pack/iso-hq.png",
  lab: "/assets/pack/iso-lab.png",
  conference: "/assets/pack/iso-lab.png",
  factory: "/assets/pack/iso-factory.png",
  workshop: "/assets/pack/iso-factory.png",
  studio: "/assets/pack/iso-studio.png",
  gallery: "/assets/pack/iso-studio.png",
  data: "/assets/pack/iso-data.png",
  cafe: "/assets/pack/iso-cafe.png",
  restaurant: "/assets/pack/iso-cafe.png",
  retail: "/assets/pack/iso-cafe.png",
  apartment: "/assets/pack/iso-apartment.png",
  hotel: "/assets/pack/iso-hotel.png",
  warehouse: "/assets/pack/iso-warehouse.png",
  station: "/assets/pack/iso-warehouse.png",
  hall: "/assets/pack/iso-hall.png",
  pavilion: "/assets/pack/iso-park.png",
  house: "/assets/pack/iso-house.png",
  shop: "/assets/pack/iso-cafe.png",
};

export function isoForStyle(style: BuildingStyle) {
  return ISO_BY_STYLE[style] ?? "/assets/pack/iso-house.png";
}
