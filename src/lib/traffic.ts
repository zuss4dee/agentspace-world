import { GRID, ROAD_XS, ROAD_YS, TERRAIN } from "./campus";
import { hitsSaleLot } from "./plots";

export type PathPoint = { x: number; y: number };

export type RoadPath = {
  axis: "x" | "y";
  lane: number;
  pts: PathPoint[];
  length: number;
};

/** Carriageway width in tiles — clearly wider than the sidewalk strip. */
export const CARRIAGE_TILES = 0.76;
export const WALK_TILES = 0.17;
export const CURB_TILES = 0.026;
export const CARRIAGE_HALF = CARRIAGE_TILES / 2;
/** Sidewalk center, just outside the curb. */
export const WALK_OFF = CARRIAGE_HALF + WALK_TILES / 2;
export const CURB_OFF = CARRIAGE_HALF;

/** Road tile that is actually painted as street — not water, not a sale pad. */
export function isDriveTile(ix: number, iy: number) {
  if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) return false;
  if (TERRAIN[iy]![ix] !== "road") return false;
  if (hitsSaleLot(ix + 0.5, iy + 0.5, 0.08)) return false;
  return true;
}

function collectSegments(axis: "x" | "y", lane: number, offset: number): RoadPath[] {
  const paths: RoadPath[] = [];
  let run: number | null = null;
  const flush = (end: number) => {
    if (run == null) return;
    if (end - run < 3) {
      run = null;
      return;
    }
    const pts: PathPoint[] = [];
    for (let i = run; i <= end; i++) {
      if (axis === "y") pts.push({ x: lane + 0.5 + offset, y: i + 0.5 });
      else pts.push({ x: i + 0.5, y: lane + 0.5 + offset });
    }
    paths.push({ axis, lane, pts, length: Math.max(0.01, pts.length - 1) });
    run = null;
  };
  for (let i = 0; i < GRID; i++) {
    const ok = axis === "y" ? isDriveTile(lane, i) : isDriveTile(i, lane);
    if (ok) {
      if (run == null) run = i;
    } else {
      flush(i - 1);
    }
  }
  flush(GRID - 1);
  return paths;
}

const PALETTE = ["#c45c4a", "#4d7cbe", "#ece7dc", "#e3b341", "#3d8b6e", "#8b6bc6", "#334155", "#d9574a"];

export type TrafficRoute = RoadPath & {
  phase: number;
  speed: number;
  color: string;
};

export function makeTrafficRoutes(): TrafficRoute[] {
  const routes: TrafficRoute[] = [];
  let n = 0;
  const pushLane = (axis: "x" | "y", lane: number) => {
    const segs = collectSegments(axis, lane, n % 2 === 0 ? -0.16 : 0.16);
    for (const seg of segs) {
      if (seg.length < 5) continue;
      routes.push({
        ...seg,
        phase: (n * 0.17) % 1,
        speed: 0.28 + (n % 5) * 0.04,
        color: PALETTE[n % PALETTE.length]!,
      });
      n++;
    }
  };
  for (const rx of ROAD_XS) pushLane("y", rx);
  for (const ry of ROAD_YS) pushLane("x", ry);
  return routes;
}

export function pointOnPath(path: RoadPath, dist: number) {
  const d = ((dist % path.length) + path.length) % path.length;
  const i = Math.min(path.pts.length - 2, Math.floor(d));
  const f = d - i;
  const a = path.pts[i]!;
  const b = path.pts[i + 1]!;
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  const heading = Math.atan2(b.x - a.x, b.y - a.y);
  return { x, y, heading };
}

function nearestLane(v: number, lanes: number[]) {
  let best = lanes[0]!;
  let bestD = 1e9;
  for (const l of lanes) {
    const t = Math.abs(v - (l + 0.5));
    if (t < bestD) {
      bestD = t;
      best = l;
    }
  }
  return best;
}

function nearestDriveAlong(axis: "x" | "y", lane: number, along: number) {
  let best = Math.max(0, Math.min(GRID - 1, Math.floor(along)));
  let bestD = 1e9;
  for (let i = 0; i < GRID; i++) {
    const ok = axis === "y" ? isDriveTile(lane, i) : isDriveTile(i, lane);
    if (!ok) continue;
    const d = Math.abs(along - (i + 0.5));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best + 0.5;
}

/** Snap to the center of the nearest driveable road tile. Cars only. */
export function snapToDriveway(x: number, y: number) {
  let best = { x: ROAD_XS[1]! + 0.5, y: y };
  let bestD = 1e9;
  for (const rx of ROAD_XS) {
    for (let iy = 0; iy < GRID; iy++) {
      if (!isDriveTile(rx, iy)) continue;
      const d = Math.hypot(x - (rx + 0.5), y - (iy + 0.5));
      if (d < bestD) {
        bestD = d;
        best = { x: rx + 0.5, y: iy + 0.5 };
      }
    }
  }
  for (const ry of ROAD_YS) {
    for (let ix = 0; ix < GRID; ix++) {
      if (!isDriveTile(ix, ry)) continue;
      const d = Math.hypot(x - (ix + 0.5), y - (ry + 0.5));
      if (d < bestD) {
        bestD = d;
        best = { x: ix + 0.5, y: ry + 0.5 };
      }
    }
  }
  return best;
}

type WalkSnap = PathPoint & { axis: "x" | "y"; lane: number; side: 1 | -1 };

/** Nearest sidewalk: offset from the carriageway, on the lot side the agent is already on. */
export function snapToWalk(x: number, y: number): WalkSnap {
  const rx = nearestLane(x, ROAD_XS);
  const ry = nearestLane(y, ROAD_YS);
  const sideX: 1 | -1 = x >= rx + 0.5 ? 1 : -1;
  const sideY: 1 | -1 = y >= ry + 0.5 ? 1 : -1;
  const ns: WalkSnap = {
    x: rx + 0.5 + sideX * WALK_OFF,
    y: nearestDriveAlong("y", rx, y),
    axis: "y",
    lane: rx,
    side: sideX,
  };
  const ew: WalkSnap = {
    x: nearestDriveAlong("x", ry, x),
    y: ry + 0.5 + sideY * WALK_OFF,
    axis: "x",
    lane: ry,
    side: sideY,
  };
  const dNS = Math.hypot(x - ns.x, y - ns.y);
  const dEW = Math.hypot(x - ew.x, y - ew.y);
  return dNS <= dEW ? ns : ew;
}

function collapse(pts: PathPoint[]): PathPoint[] {
  const out: PathPoint[] = [];
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.08) continue;
    out.push(p);
  }
  return out;
}

function nearestCrossY(y: number) {
  return nearestLane(y, ROAD_YS);
}

function nearestCrossX(x: number) {
  return nearestLane(x, ROAD_XS);
}

/**
 * Pedestrian route: sidewalks along the block, asphalt only at an intersection crosswalk.
 * Cars keep using `roadCorners`.
 */
export function walkCorners(from: PathPoint, to: PathPoint): PathPoint[] {
  const a = snapToWalk(from.x, from.y);
  const b = snapToWalk(to.x, to.y);
  if (Math.hypot(a.x - b.x, a.y - b.y) < 0.12) return collapse([a, b]);

  if (a.axis === b.axis && a.lane === b.lane && a.side === b.side) {
    return collapse([a, b]);
  }

  if (a.axis === "y" && b.axis === "y" && a.lane === b.lane && a.side !== b.side) {
    const ry = nearestCrossY((a.y + b.y) / 2);
    const cy = ry + 0.5 + ((a.y + b.y) / 2 >= ry + 0.5 ? 1 : -1) * WALK_OFF;
    return collapse([a, { x: a.x, y: cy }, { x: b.x, y: cy }, b]);
  }

  if (a.axis === "x" && b.axis === "x" && a.lane === b.lane && a.side !== b.side) {
    const rx = nearestCrossX((a.x + b.x) / 2);
    const cx = rx + 0.5 + ((a.x + b.x) / 2 >= rx + 0.5 ? 1 : -1) * WALK_OFF;
    return collapse([a, { x: cx, y: a.y }, { x: cx, y: b.y }, b]);
  }

  if (a.axis === "y" && b.axis === "y") {
    const ry = nearestCrossY((a.y + b.y) / 2);
    const cy = ry + 0.5 + WALK_OFF;
    return collapse([a, { x: a.x, y: cy }, { x: b.x, y: cy }, b]);
  }

  if (a.axis === "x" && b.axis === "x") {
    const rx = nearestCrossX((a.x + b.x) / 2);
    const cx = rx + 0.5 + WALK_OFF;
    return collapse([a, { x: cx, y: a.y }, { x: cx, y: b.y }, b]);
  }

  if (a.axis === "y" && b.axis === "x") {
    return collapse([a, { x: a.x, y: b.y }, b]);
  }
  return collapse([a, { x: b.x, y: a.y }, b]);
}

/** Walk the grid: along one road, then the crossing, then the other — no diagonals over lots. */
export function roadCorners(from: PathPoint, to: PathPoint): PathPoint[] {
  const a = snapToDriveway(from.x, from.y);
  const b = snapToDriveway(to.x, to.y);
  if (Math.abs(a.x - b.x) < 0.6 || Math.abs(a.y - b.y) < 0.6) return [a, b];
  const crossV = { x: a.x, y: b.y };
  const ix = Math.floor(crossV.x);
  const iy = Math.floor(crossV.y);
  if (isDriveTile(ix, iy) || TERRAIN[iy]?.[ix] === "road") return [a, { x: a.x, y: b.y }, b];
  return [a, { x: b.x, y: a.y }, b];
}
