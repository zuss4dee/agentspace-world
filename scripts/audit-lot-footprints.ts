import { CITY_PLOTS } from "../src/lib/plots";
import { gltfUrlForAssetId } from "../src/lib/building-gltf";
import {
  auditOccupiedBuildings,
  authoredBuildingPlacement,
  isOccupiedPlot,
  isPublicRightOfWay,
  lotBuildingFootprint,
  rectHitsRightOfWay,
} from "../src/lib/lot-footprint";
import { WORLD_BUILDINGS } from "../src/lib/campus";

const occupiedAudit = auditOccupiedBuildings();
const empty = CITY_PLOTS.filter((p) => !isOccupiedPlot(p) && p.kind === "sale");
const occupiedPlots = CITY_PLOTS.filter((p) => isOccupiedPlot(p));

const authored = WORLD_BUILDINGS.filter((b) => gltfUrlForAssetId(b.assetId));
const placementFails = authored.filter((b) => {
  const place = authoredBuildingPlacement(b);
  if (!place) return true;
  const fp = lotBuildingFootprint({ x: b.origin.x, y: b.origin.y, w: b.size.x, h: b.size.y });
  return !fp || rectHitsRightOfWay(fp.tiles.x, fp.tiles.y, fp.tiles.w, fp.tiles.h);
});

const rowInLot = occupiedAudit.issues.filter((i) => i.kind === "row-in-lot");
const unconstrained = occupiedAudit.issues.filter((i) => i.kind === "unconstrained-hits-row");
const constrainedFail = occupiedAudit.issues.filter(
  (i) => i.kind === "constrained-hits-row" || i.kind === "no-private-footprint",
);
const neighbor = occupiedAudit.issues.filter((i) => i.kind === "neighbor-overlap");
const uniqueLotsWithRow = new Set(rowInLot.map((i) => i.id));

let emptyWithRowTiles = 0;
for (const p of empty) {
  let hit = false;
  for (let iy = p.y; iy < p.y + p.h && !hit; iy++) {
    for (let ix = p.x; ix < p.x + p.w; ix++) {
      if (isPublicRightOfWay(ix, iy)) {
        hit = true;
        break;
      }
    }
  }
  if (hit) emptyWithRowTiles++;
}

const report = {
  occupiedBuildings: occupiedAudit.occupied,
  occupiedPlots: occupiedPlots.length,
  emptySalePlots: empty.length,
  lotsWhoseStoredRectIncludesRightOfWay: uniqueLotsWithRow.size,
  unconstrainedFootprintHits: unconstrained.length,
  neighborOverlaps: neighbor.length,
  constrainedFailures: constrainedFail.length,
  authoredBuildings: authored.length,
  authoredPlacementFails: placementFails.map((b) => b.id),
  emptySalePlotsTouchingRow: emptyWithRowTiles,
  issues: occupiedAudit.issues,
};

console.log(JSON.stringify(report, null, 2));
if (constrainedFail.length || neighbor.length || placementFails.length) process.exit(1);
