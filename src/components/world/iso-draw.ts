import { GRID, LOT_BUILDINGS, ROAD_XS, ROAD_YS, TERRAIN, districtAt, groundZ } from "@/lib/campus";
import { fbm, hash2, mixHex } from "@/lib/noise";
import { TRAFFIC, type TrafficCar } from "@/lib/scenery";
import type { Agent, Building, BuildingStyle, PlacedProp, Scenery, TileKind } from "@/lib/types";
import { catalogById } from "@/lib/catalog";
import { roleLabel } from "@/lib/playbooks";

export const TW = 40;
export const TH = 20;

export function iso(x: number, y: number) {
  return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
}

export function toGrid(sx: number, sy: number) {
  const X = sx / (TW / 2);
  const Y = sy / (TH / 2);
  return { x: (X + Y) / 2, y: (Y - X) / 2 };
}

function P(gx: number, gy: number, z: number) {
  const t = iso(gx, gy);
  return { sx: t.sx, sy: t.sy - z };
}

function diamond(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function groundColor(kind: TileKind, x: number, y: number): string {
  const n = fbm(x * 0.37, y * 0.33);
  const district = districtAt(x, y)?.id;
  switch (kind) {
    case "road":
      return mixHex("#4a4642", "#3a3834", n);
    case "sidewalk":
      return mixHex("#d4cdc0", "#c2b9aa", n);
    case "water":
      return mixHex("#3a86b4", "#245e86", n);
    case "sand":
      return mixHex("#e0d0a8", "#cbb890", n);
    case "plaza":
      return mixHex("#d2c4a8", "#c0b090", n);
    case "park":
      return mixHex("#4c9a4a", "#2f6e38", n);
    case "lot":
      return mixHex("#c4ae86", "#a89068", n);
    case "dirt":
      return mixHex("#9a7048", "#7a5434", n);
    default: {
      let a = "#5eab56";
      let b = "#3d7c40";
      if (district === "industrial" || district === "yards") {
        a = "#7a8c4e";
        b = "#5a6a38";
      } else if (district === "corporate" || district === "civic") {
        a = "#5aa86a";
        b = "#3d7a52";
      } else if (district === "creative") {
        a = "#6bb85a";
        b = "#4a8a40";
      } else if (district === "research" || district === "labs") {
        a = "#58a878";
        b = "#3d7a5e";
      } else if (district === "homes" || district === "ridge") {
        a = "#6aad58";
        b = "#4a8040";
      }
      return mixHex(a, b, n);
    }
  }
}

export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  time: number,
) {
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const kind = TERRAIN[y]![x]!;
      const z00 = groundZ(x, y);
      const z10 = groundZ(x + 1, y);
      const z11 = groundZ(x + 1, y + 1);
      const z01 = groundZ(x, y + 1);
      const a = P(x, y, z00);
      const b = P(x + 1, y, z10);
      const c = P(x + 1, y + 1, z11);
      const d = P(x, y + 1, z01);
      let fill = groundColor(kind, x, y);
      if (kind === "water") {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.0012 + x * 0.4 + y * 0.25);
        fill = mixHex("#2f6f98", "#4ea0c8", pulse * 0.45 + fbm(x, y) * 0.2);
      }
      const south = P(x + 1, y + 1, Math.min(0, z11) - 2);
      const west = P(x, y + 1, Math.min(0, z01) - 2);
      if (kind !== "water" && (z01 > 1.2 || z11 > 1.2)) {
        ctx.beginPath();
        ctx.moveTo(d.sx, d.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.lineTo(south.sx, south.sy);
        ctx.lineTo(west.sx, west.sy);
        ctx.closePath();
        ctx.fillStyle = "rgba(40, 32, 18, 0.22)";
        ctx.fill();
      }
      diamond(ctx, a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, d.sx, d.sy, fill);
    }
  }
}

export function drawRoads(ctx: CanvasRenderingContext2D, minX: number, maxX: number, minY: number, maxY: number) {
  ctx.lineCap = "round";
  for (const rx of ROAD_XS) {
    if (rx < minX - 1 || rx > maxX + 1) continue;
    ctx.strokeStyle = "rgba(236, 214, 150, 0.38)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 9]);
    ctx.beginPath();
    let started = false;
    for (let y = Math.max(0, minY); y < Math.min(GRID, maxY); y++) {
      if (TERRAIN[y]![rx] !== "road") {
        started = false;
        continue;
      }
      const p = P(rx + 0.5, y + 0.5, groundZ(rx, y) + 0.4);
      if (!started) {
        ctx.moveTo(p.sx, p.sy);
        started = true;
      } else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }
  for (const ry of ROAD_YS) {
    if (ry < minY - 1 || ry > maxY + 1) continue;
    ctx.strokeStyle = "rgba(236, 214, 150, 0.38)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 9]);
    ctx.beginPath();
    let started = false;
    for (let x = Math.max(0, minX); x < Math.min(GRID, maxX); x++) {
      if (TERRAIN[ry]![x] !== "road") {
        started = false;
        continue;
      }
      const p = P(x + 0.5, ry + 0.5, groundZ(x, ry) + 0.4);
      if (!started) {
        ctx.moveTo(p.sx, p.sy);
        started = true;
      } else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const rx of ROAD_XS) {
    for (const ry of ROAD_YS) {
      if (rx < minX || rx > maxX || ry < minY || ry > maxY) continue;
      if (TERRAIN[ry]![rx] !== "road") continue;
      const z = groundZ(rx, ry) + 0.5;
      for (let i = 0; i < 5; i++) {
        const a = P(rx + 0.12 + i * 0.16, ry + 0.15, z);
        const b = P(rx + 0.22 + i * 0.16, ry + 0.85, z);
        ctx.strokeStyle = "rgba(245, 240, 230, 0.7)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }
  }
}

export function drawWaterDetail(
  ctx: CanvasRenderingContext2D,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  time: number,
) {
  ctx.strokeStyle = "rgba(210, 236, 255, 0.22)";
  ctx.lineWidth = 1;
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (TERRAIN[y]![x] !== "water") continue;
      if ((x + y) % 3 !== 0) continue;
      const z = groundZ(x, y);
      const wave = Math.sin(time * 0.0018 + x * 0.55 + y * 0.4) * 3;
      const a = P(x + 0.15, y + 0.4, z);
      const b = P(x + 0.85, y + 0.55, z);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy + wave * 0.15);
      ctx.lineTo(b.sx, b.sy - wave * 0.1);
      ctx.stroke();
    }
  }
}

function drawShadowFoot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number) {
  const ox = 0.38 + h * 0.006;
  const oy = 0.22 + h * 0.004;
  const a = iso(x + ox, y + oy);
  const b = iso(x + w + ox, y + oy);
  const c = iso(x + w + ox, y + d + oy);
  const dd = iso(x + ox, y + d + oy);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(dd.sx, dd.sy);
  ctx.closePath();
  ctx.fillStyle = "rgba(18, 12, 8, 0.28)";
  ctx.fill();
}

export function drawWorldShadows(ctx: CanvasRenderingContext2D, scenery: Scenery[]) {
  for (const b of LOT_BUILDINGS) drawShadowFoot(ctx, b.origin.x, b.origin.y, b.size.x, b.size.y, b.height);
  for (const s of scenery) {
    if (s.kind !== "tree") continue;
    const p = iso(s.x, s.y);
    ctx.fillStyle = "rgba(18, 12, 8, 0.2)";
    ctx.beginPath();
    ctx.ellipse(p.sx + 10, p.sy + 6, 11, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

type Mat = "glass" | "brick" | "wood" | "metal" | "concrete" | "stone";

function matFor(style: BuildingStyle): Mat {
  if (style === "hq" || style === "office" || style === "lab" || style === "conference" || style === "data") return "glass";
  if (style === "factory" || style === "workshop") return "brick";
  if (style === "house" || style === "cafe" || style === "restaurant" || style === "pavilion") return "wood";
  if (style === "warehouse" || style === "station") return "metal";
  if (style === "hall" || style === "gallery") return "stone";
  if (style === "hotel" || style === "apartment" || style === "retail" || style === "studio") return "concrete";
  return "concrete";
}

function paintMaterial(ctx: CanvasRenderingContext2D, mat: Mat, wallPath: () => void, x: number, y: number, w: number, d: number, h: number) {
  ctx.save();
  wallPath();
  ctx.clip();
  if (mat === "brick") {
    ctx.strokeStyle = "rgba(80, 40, 28, 0.28)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      const p = P(x + w, y + 0.1, h * (0.12 + i * 0.1));
      const q = P(x + w, y + d - 0.1, h * (0.12 + i * 0.1));
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx, q.sy);
      ctx.stroke();
    }
  } else if (mat === "glass") {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    const a = P(x + w, y + d * 0.15, h * 0.2);
    const b = P(x + w, y + d * 0.28, h * 0.85);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(b.sx + 6, b.sy);
    ctx.lineTo(a.sx + 6, a.sy);
    ctx.fill();
  } else if (mat === "wood") {
    ctx.strokeStyle = "rgba(90, 50, 20, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const u = (i + 0.4) / 5;
      const p = P(x + w, y + d * u, 4);
      const q = P(x + w, y + d * u, h - 4);
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx, q.sy);
      ctx.stroke();
    }
  } else if (mat === "metal") {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const p = P(x + w, y + 0.1, h * (0.2 + i * 0.18));
      const q = P(x + w, y + d - 0.1, h * (0.2 + i * 0.18));
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx, q.sy);
      ctx.stroke();
    }
  } else if (mat === "stone") {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 6; i++) {
      const u = hash2(x + i, y + i);
      const p = P(x + w, y + d * u, h * hash2(y + i, x));
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  roof: string,
  wall: string,
  wallDark: string,
  mat: Mat,
  opts?: { trim?: string },
) {
  const tr0 = P(x + w, y, 0);
  const br0 = P(x + w, y + d, 0);
  const bl0 = P(x, y + d, 0);
  const tl1 = P(x, y, h);
  const tr1 = P(x + w, y, h);
  const br1 = P(x + w, y + d, h);
  const bl1 = P(x, y + d, h);
  const left = () => {
    ctx.beginPath();
    ctx.moveTo(bl0.sx, bl0.sy);
    ctx.lineTo(br0.sx, br0.sy);
    ctx.lineTo(br1.sx, br1.sy);
    ctx.lineTo(bl1.sx, bl1.sy);
    ctx.closePath();
  };
  const right = () => {
    ctx.beginPath();
    ctx.moveTo(tr0.sx, tr0.sy);
    ctx.lineTo(br0.sx, br0.sy);
    ctx.lineTo(br1.sx, br1.sy);
    ctx.lineTo(tr1.sx, tr1.sy);
    ctx.closePath();
  };
  left();
  ctx.fillStyle = wallDark;
  ctx.fill();
  right();
  ctx.fillStyle = wall;
  ctx.fill();
  paintMaterial(ctx, mat, right, x, y, w, d, h);
  ctx.beginPath();
  ctx.moveTo(tl1.sx, tl1.sy);
  ctx.lineTo(tr1.sx, tr1.sy);
  ctx.lineTo(br1.sx, br1.sy);
  ctx.lineTo(bl1.sx, bl1.sy);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.strokeStyle = opts?.trim ?? "rgba(255,255,255,0.16)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

function faceWindows(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  cols: number,
  rows: number,
  lit: boolean,
  time: number,
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = (c + 0.18) / cols;
      const u1 = (c + 0.82) / cols;
      const z0 = h * (0.14 + r * (0.7 / Math.max(1, rows)));
      const z1 = z0 + h * (0.1 / Math.max(1, rows / 2));
      const a = P(x + w, y + u0 * d, z0);
      const b = P(x + w, y + u1 * d, z0);
      const cpt = P(x + w, y + u1 * d, z1);
      const e = P(x + w, y + u0 * d, z1);
      const on = lit && (hash2(x + c, y + r + Math.floor(time / 4000)) > 0.28);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.lineTo(cpt.sx, cpt.sy);
      ctx.lineTo(e.sx, e.sy);
      ctx.closePath();
      ctx.fillStyle = on ? "rgba(255, 214, 130, 0.92)" : "rgba(140, 190, 220, 0.42)";
      ctx.fill();
    }
  }
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, accent: string) {
  const z1 = Math.min(16, h * 0.28);
  const u0 = 0.62;
  const u1 = 0.78;
  const a = P(x + w * 0.02, y + d, 0);
  const b = P(x + w * 0.18, y + d, 0);
  const c = P(x + w * 0.18, y + d, z1);
  const e = P(x + w * 0.02, y + d, z1);
  void u0;
  void u1;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(e.sx, e.sy);
  ctx.closePath();
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = "rgba(20,14,10,0.55)";
  ctx.beginPath();
  ctx.moveTo(a.sx + 2, a.sy - 1);
  ctx.lineTo(b.sx - 2, b.sy - 1);
  ctx.lineTo(c.sx - 2, c.sy + 2);
  ctx.lineTo(e.sx + 2, e.sy + 2);
  ctx.fill();
}

function signage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, text: string, accent: string) {
  const p = P(x + w * 0.55, y + d * 0.06, h + 3);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(p.sx - text.length * 2.6, p.sy - 9, text.length * 5.2, 11, 2);
  ctx.fill();
  ctx.fillStyle = "#fffaf0";
  ctx.font = "700 7px ui-sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, p.sx, p.sy - 1);
}

export function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, scale: number, selected: boolean, time: number) {
  const { origin: o, size: s, height: h } = b;
  const style = b.style;
  const mat = matFor(style);
  const trim = selected ? "#ed712e" : "rgba(255,255,255,0.2)";
  const box = (x: number, y: number, w: number, d: number, hh: number, roof = b.roof, wall = b.wall, dark = b.wallDark) =>
    drawBox(ctx, x, y, w, d, hh, roof, wall, dark, mat, { trim });

  if (style === "factory") {
    const spans = Math.max(2, Math.floor(s.x / 2));
    for (let i = 0; i < spans; i++) {
      const ww = s.x / spans;
      box(o.x + i * ww, o.y, ww, s.y, h * (0.7 + (i % 2) * 0.18));
    }
    drawBox(ctx, o.x + s.x - 0.45, o.y + 0.3, 0.4, 0.4, h + 18, "#6b7280", "#94a3b8", "#475569", "metal");
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, Math.floor(s.x * 1.4), 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "hq") {
    box(o.x, o.y, s.x, s.y, h, "#c5d8ec", "#9eb8d4", "#5c738c");
    box(o.x + 1.3, o.y + 0.8, 2.4, 1.8, h + 26, b.accent, "#b8cce0", "#6a829c");
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 5, 5, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
    const tip = P(o.x + 2.5, o.y + 1.6, h + 42);
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tip.sx, tip.sy + 14);
    ctx.lineTo(tip.sx, tip.sy);
    ctx.stroke();
  } else if (style === "hotel") {
    box(o.x, o.y, s.x, s.y, h * 0.52);
    box(o.x + 0.5, o.y + 0.4, s.x - 1, s.y - 0.8, h * 0.8);
    box(o.x + 1.1, o.y + 0.85, s.x - 2.2, s.y - 1.7, h);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.52, 5, 2, true, time);
    faceWindows(ctx, o.x + 0.5, o.y + 0.4, s.x - 1, s.y - 0.8, h * 0.8, 4, 3, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "apartment") {
    box(o.x, o.y, s.x, s.y, h);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 3, 5, true, time);
    for (let i = 0; i < 4; i++) {
      const z = h * (0.18 + i * 0.16);
      const p = P(o.x + s.x, o.y + 0.35 + i * 0.9, z);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(p.sx - 9, p.sy - 1, 11, 3);
    }
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "house") {
    box(o.x, o.y, s.x, s.y, h * 0.68);
    const ridge = P(o.x + s.x / 2, o.y + s.y / 2, h + 18);
    const l = P(o.x, o.y, h * 0.68);
    const r = P(o.x + s.x, o.y, h * 0.68);
    const f = P(o.x + s.x, o.y + s.y, h * 0.68);
    ctx.beginPath();
    ctx.moveTo(l.sx, l.sy);
    ctx.lineTo(ridge.sx, ridge.sy);
    ctx.lineTo(r.sx, r.sy);
    ctx.closePath();
    ctx.fillStyle = b.roof;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r.sx, r.sy);
    ctx.lineTo(ridge.sx, ridge.sy);
    ctx.lineTo(f.sx, f.sy);
    ctx.closePath();
    ctx.fillStyle = b.wallDark;
    ctx.fill();
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.68, 2, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "cafe" || style === "restaurant") {
    box(o.x, o.y, s.x, s.y, h);
    const aw = P(o.x + s.x, o.y + s.y * 0.12, 13);
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.ellipse(aw.sx, aw.sy, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 2; i++) {
      const t = P(o.x + s.x + 0.35, o.y + 0.6 + i * 0.9, 6);
      ctx.fillStyle = "#f8f1e4";
      ctx.beginPath();
      ctx.ellipse(t.sx, t.sy, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(t.sx, t.sy);
      ctx.lineTo(t.sx, t.sy - 10);
      ctx.stroke();
      ctx.fillStyle = "rgba(237,113,46,0.55)";
      ctx.beginPath();
      ctx.ellipse(t.sx, t.sy - 12, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 4, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "retail") {
    box(o.x, o.y, s.x, s.y, h);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.45, 3, 1, true, time);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 3, 2, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "data") {
    box(o.x, o.y, s.x, s.y, h, "#1e293b", "#334155", "#0f172a");
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 2, 6, false, time);
    const top = P(o.x + s.x / 2, o.y + 0.35, h + 12);
    ctx.fillStyle = b.accent;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time / 400);
    ctx.fillRect(top.sx - 3, top.sy - 8, 6, 8);
    ctx.globalAlpha = 1;
  } else if (style === "station") {
    box(o.x, o.y, s.x, s.y, h * 0.5);
    const canopy = P(o.x + s.x / 2, o.y + s.y, 16);
    ctx.fillStyle = "rgba(20,24,30,0.48)";
    ctx.beginPath();
    ctx.ellipse(canopy.sx, canopy.sy, 44, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.5, 5, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "lab") {
    box(o.x, o.y, s.x, s.y, h, "#e8f0f8", "#d5e4f0", "#8aa3b8");
    box(o.x + s.x * 0.62, o.y - 0.12, s.x * 0.42, s.y * 0.5, h + 16, "#f2f8fc", "#c5d8e8", "#7a92a8");
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 4, 3, true, time);
    const stack = P(o.x + 0.5, o.y + 0.3, h + 20);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(stack.sx - 2, stack.sy, 4, 20);
  } else if (style === "conference") {
    box(o.x, o.y, s.x, s.y, h * 0.7);
    box(o.x + 1.7, o.y + 0.7, 2.6, 2.4, h + 12, "#e4eef6", "#c8dcea", "#7a92a8");
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.7, 6, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "workshop") {
    box(o.x, o.y, s.x, s.y, h);
    const ridge = P(o.x + s.x / 2, o.y, h + 14);
    const l = P(o.x, o.y, h);
    const r = P(o.x + s.x, o.y, h);
    ctx.beginPath();
    ctx.moveTo(l.sx, l.sy);
    ctx.lineTo(ridge.sx, ridge.sy);
    ctx.lineTo(r.sx, r.sy);
    ctx.closePath();
    ctx.fillStyle = b.roof;
    ctx.fill();
    const stack = P(o.x + 0.45, o.y + 0.35, h + 24);
    ctx.fillStyle = "#5c4030";
    ctx.fillRect(stack.sx - 3, stack.sy, 6, 22);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 2, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "warehouse") {
    box(o.x, o.y, s.x, s.y, h * 0.7);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h * 0.7, 2, 1, false, time);
    const bay = P(o.x + s.x, o.y + s.y * 0.45, 8);
    ctx.fillStyle = "rgba(20,16,12,0.55)";
    ctx.fillRect(bay.sx - 8, bay.sy - 12, 12, 16);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "pavilion") {
    for (const [dx, dy] of [
      [0.22, 0.22],
      [s.x - 0.42, 0.22],
      [0.22, s.y - 0.42],
      [s.x - 0.42, s.y - 0.42],
    ] as const) {
      box(o.x + dx, o.y + dy, 0.26, 0.26, h * 0.72);
    }
    const roof = P(o.x + s.x / 2, o.y + s.y / 2, h);
    ctx.fillStyle = b.roof;
    ctx.beginPath();
    ctx.ellipse(roof.sx, roof.sy, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "studio" || style === "gallery") {
    box(o.x, o.y, s.x, s.y, h);
    if (style === "gallery") {
      for (let i = 0; i < 3; i++) box(o.x + 0.25 + i * 1.2, o.y - 0.08, 1, s.y * 0.38, h + 10, "#eef3f8", b.wall, b.wallDark);
    } else {
      const mural = P(o.x + s.x, o.y + s.y * 0.45, h * 0.4);
      ctx.fillStyle = b.accent;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(mural.sx, mural.sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 4, 2, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else if (style === "hall") {
    box(o.x, o.y, s.x, s.y, h);
    const ped = P(o.x + s.x / 2, o.y, h + 12);
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.moveTo(ped.sx, ped.sy - 10);
    ctx.lineTo(ped.sx + 11, ped.sy + 6);
    ctx.lineTo(ped.sx - 11, ped.sy + 6);
    ctx.closePath();
    ctx.fill();
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, 4, 1, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  } else {
    box(o.x, o.y, s.x, s.y, h);
    faceWindows(ctx, o.x, o.y, s.x, s.y, h, Math.max(3, Math.floor(s.x)), 2, true, time);
    door(ctx, o.x, o.y, s.x, s.y, h, b.accent);
  }

  if (b.sign && scale >= 0.58) signage(ctx, o.x, o.y, s.x, s.y, h, b.sign, b.accent);
  if (scale >= 0.78) {
    const label = iso(o.x + s.x / 2, o.y + s.y / 2);
    ctx.fillStyle = selected ? "rgba(237,113,46,0.92)" : "rgba(12,12,14,0.5)";
    const lw = Math.min(130, 16 + b.name.length * 6);
    ctx.beginPath();
    ctx.roundRect(label.sx - lw / 2, label.sy - h - 18, lw, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f4efe4";
    ctx.font = "600 9px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.name, label.sx, label.sy - h - 9);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, s: Scenery, time: number) {
  const p = iso(s.x, s.y);
  const seed = hash2(s.x, s.y);
  const kind = s.assetId.split(".").pop() ?? "oak";
  const size = 0.72 + seed * 0.55;
  const sway = Math.sin(time / 900 + seed * 8) * 1.4;
  ctx.fillStyle = "rgba(18,12,8,0.2)";
  ctx.beginPath();
  ctx.ellipse(p.sx + 8, p.sy + 5, 10 * size, 4.5 * size, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a3224";
  ctx.lineWidth = 2.2 * size;
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy);
  ctx.lineTo(p.sx + sway * 0.2, p.sy - 12 * size);
  ctx.stroke();
  const leaf = kind === "pine" ? "#245c34" : kind === "willow" ? "#5fa85a" : kind === "maple" ? "#3d8a3a" : kind === "cedar" ? "#2a6a40" : "#347a38";
  const hi = mixHex(leaf, "#c6e86a", 0.25);
  ctx.fillStyle = leaf;
  if (kind === "pine") {
    ctx.beginPath();
    ctx.moveTo(p.sx + sway, p.sy - 36 * size);
    ctx.lineTo(p.sx + 11 * size, p.sy - 8 * size);
    ctx.lineTo(p.sx - 11 * size, p.sy - 8 * size);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.moveTo(p.sx + sway, p.sy - 42 * size);
    ctx.lineTo(p.sx + 7 * size, p.sy - 18 * size);
    ctx.lineTo(p.sx - 7 * size, p.sy - 18 * size);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(p.sx + sway, p.sy - 20 * size, (kind === "willow" ? 14 : 11) * size, (kind === "willow" ? 16 : 12) * size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(p.sx + sway - 3, p.sy - 24 * size, 6 * size, 6 * size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawScenery(ctx: CanvasRenderingContext2D, s: Scenery, scale: number, time: number) {
  const p = iso(s.x, s.y);
  if (s.kind === "tree") {
    drawTree(ctx, s, time);
    return;
  }
  if (s.kind === "bush") {
    ctx.fillStyle = "rgba(18,12,8,0.16)";
    ctx.beginPath();
    ctx.ellipse(p.sx + 3, p.sy + 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d7a3a";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy - 4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5aaa4a";
    ctx.beginPath();
    ctx.ellipse(p.sx - 2, p.sy - 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (s.kind === "hedge") {
    ctx.fillStyle = "#2f6a38";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy - 3, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (s.kind === "flower") {
    ctx.fillStyle = "#3d7a38";
    ctx.fillRect(p.sx - 0.6, p.sy - 4, 1.2, 4);
    ctx.fillStyle = s.color ?? "#f472b6";
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (s.kind === "lamp") {
    ctx.fillStyle = "rgba(20,16,10,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + 2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3f46";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx, p.sy - 20);
    ctx.stroke();
    const glow = 0.75 + 0.25 * Math.sin(time / 600 + s.x);
    ctx.fillStyle = `rgba(255, 214, 140, ${0.85 * glow})`;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 22, 3.4, 0, Math.PI * 2);
    ctx.fill();
    if (scale > 0.65) {
      ctx.fillStyle = `rgba(255, 210, 120, ${0.1 * glow})`;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy + 2, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (s.kind === "bench") {
    ctx.fillStyle = "#6b5340";
    ctx.fillRect(p.sx - 7, p.sy - 4, 14, 4);
    ctx.fillStyle = "#3d3228";
    ctx.fillRect(p.sx - 6, p.sy, 3, 4);
    ctx.fillRect(p.sx + 3, p.sy, 3, 4);
    return;
  }
  if (s.kind === "planter") {
    ctx.fillStyle = "#6a5340";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, 6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d7a38";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy - 4, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (s.kind === "car") {
    drawCarSprite(ctx, p.sx, p.sy, s.color ?? "#c45c4a", false);
    return;
  }
  if (s.kind === "fence") {
    ctx.strokeStyle = "#8a7a60";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx + 4, p.sy - 8);
    ctx.stroke();
    return;
  }
  if (s.kind === "plot") {
    const w = s.w ?? 3;
    const h = s.h ?? 3;
    const a = iso(s.x, s.y);
    const b = iso(s.x + w, s.y);
    const c = iso(s.x + w, s.y + h);
    const d = iso(s.x, s.y + h);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(90, 70, 40, 0.45)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    if (scale >= 0.6) {
      ctx.fillStyle = "rgba(90,70,40,0.65)";
      ctx.font = "600 8px ui-sans-serif";
      ctx.textAlign = "center";
      const m = iso(s.x + w / 2, s.y + h / 2);
      ctx.fillText("PLOT", m.sx, m.sy);
    }
    return;
  }
  if (s.kind === "sign" && scale >= 0.48) {
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(p.sx - 1, p.sy - 10, 2, 10);
    ctx.fillStyle = "#ed712e";
    ctx.fillRect(p.sx - 8, p.sy - 18, 16, 9);
  }
}

function drawCarSprite(ctx: CanvasRenderingContext2D, sx: number, sy: number, color: string, moving: boolean) {
  ctx.fillStyle = "rgba(20,16,10,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx + (moving ? 3 : 0), sy + 3, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(sx - 8, sy - 7, 16, 9, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(180,210,230,0.75)";
  ctx.fillRect(sx - 3, sy - 6, 7, 3.5);
}

export function drawTraffic(ctx: CanvasRenderingContext2D, time: number) {
  const t = time / 1000;
  for (const car of TRAFFIC) {
    const pos = trafficPos(car, t);
    if (!pos) continue;
    const p = iso(pos.x, pos.y);
    drawCarSprite(ctx, p.sx, p.sy, car.color, true);
  }
}

function trafficPos(car: TrafficCar, t: number) {
  const u = (t * car.speed + car.phase * GRID) % GRID;
  if (car.axis === "y") {
    const x = car.lane + 0.22;
    const y = u;
    const iy = Math.floor(y);
    if (iy < 0 || iy >= GRID) return null;
    if (TERRAIN[iy]![car.lane] !== "road") return null;
    return { x, y };
  }
  const y = car.lane + 0.22;
  const x = u;
  const ix = Math.floor(x);
  if (ix < 0 || ix >= GRID) return null;
  if (TERRAIN[car.lane]![ix] !== "road") return null;
  return { x, y };
}

export function drawSlime(ctx: CanvasRenderingContext2D, agent: Agent, selected: boolean, scale: number) {
  const p = iso(agent.x, agent.y);
  const s = Math.max(0.2, Math.min(0.58, 0.28 + scale * 0.16));
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(20, 12, 8, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 4.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.ellipse(0, -1.6, 4.4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (scale > 1.1) {
    ctx.fillStyle = "#1a1410";
    ctx.beginPath();
    ctx.arc(-1.3, -2.4, 0.55, 0, Math.PI * 2);
    ctx.arc(1.3, -2.4, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  if (selected) {
    ctx.strokeStyle = "#ed712e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 6, 2.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (scale >= 1.4 || selected) {
    ctx.fillStyle = "rgba(12,12,14,0.72)";
    ctx.beginPath();
    ctx.roundRect(p.sx - 28, p.sy - 18, 56, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#f3efe6";
    ctx.font = "600 8px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${agent.name} · ${roleLabel(agent.role)}`, p.sx, p.sy - 11);
  }
}

export function drawProp(ctx: CanvasRenderingContext2D, prop: PlacedProp, scale: number) {
  if (scale < 0.55) return;
  const item = catalogById(prop.catalogId);
  if (!item) return;
  const p = iso(prop.x, prop.y);
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.roundRect(p.sx - 5, p.sy - 7, 10, 9, 2);
  ctx.fill();
}

export function drawSpeech(ctx: CanvasRenderingContext2D, agent: Agent, scale: number, selected: boolean) {
  if (!selected && scale < 1.85) return;
  const line = agent.speech || (agent.status === "walking" ? "" : agent.thought);
  if (!line) return;
  const p = iso(agent.x, agent.y);
  const text = line.length > 42 ? `${line.slice(0, 42)}…` : line;
  ctx.font = "10px ui-sans-serif";
  const w = Math.min(180, ctx.measureText(text).width + 12);
  ctx.fillStyle = "rgba(255,246,236,0.94)";
  ctx.beginPath();
  ctx.roundRect(p.sx - w / 2, p.sy - 30, w, 15, 6);
  ctx.fill();
  ctx.fillStyle = "#3a2418";
  ctx.textAlign = "center";
  ctx.fillText(text, p.sx, p.sy - 20);
}

export function drawDistrictHints(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  scale: number,
  w: number,
  h: number,
) {
  if (scale >= 0.48) return;
  ctx.fillStyle = "rgba(12,12,14,0.42)";
  ctx.font = "600 11px ui-sans-serif";
  ctx.textAlign = "center";
  const seen = new Set<string>();
  for (const b of LOT_BUILDINGS) {
    const d = districtAt(b.origin.x, b.origin.y);
    if (!d || seen.has(d.id)) continue;
    seen.add(d.id);
    const p = iso(d.origin.x + d.size.x / 2, d.origin.y + d.size.y / 2);
    const sx = originX + p.sx * scale;
    const sy = originY + p.sy * scale;
    if (sx < 40 || sy < 28 || sx > w - 40 || sy > h - 20) continue;
    ctx.fillText(d.label, sx, sy);
  }
}
