import { GRID, ROAD_XS, ROAD_YS, TERRAIN } from "./campus";
import { hitsSaleLot } from "./plots";

export type PathPoint = { x: number; y: number };

export type RoadPath = {
  axis: "x" | "y";
  lane: number;
  pts: PathPoint[];
  length: number;
};

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

/** Snap to the center of the nearest driveable road tile. */
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
