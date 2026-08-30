"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/components/world/world-store";
import { GRID, LOT_BUILDINGS, TERRAIN, buildingAt, districtAt } from "@/lib/campus";
import { SCENERY } from "@/lib/scenery";
import { catalogById } from "@/lib/catalog";
import type { Agent, Building, BuildingStyle, MapId, PlacedProp, Scenery, TileKind } from "@/lib/types";
import { roleLabel } from "@/lib/playbooks";

const TW = 40;
const TH = 20;

function iso(x: number, y: number) {
  return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
}

function toGrid(sx: number, sy: number) {
  const X = sx / (TW / 2);
  const Y = sy / (TH / 2);
  return { x: (X + Y) / 2, y: (Y - X) / 2 };
}

function tileColor(kind: TileKind, even: boolean, x: number, y: number): string {
  const district = districtAt(x, y)?.id;
  switch (kind) {
    case "road":
      return even ? "#6e6862" : "#5a554f";
    case "sidewalk":
      return even ? "#cfc6b6" : "#c0b6a6";
    case "water":
      return even ? "#4c92bc" : "#3a7aa4";
    case "sand":
      return even ? "#d8c8a0" : "#cbb890";
    case "plaza":
      return even ? "#cbb89a" : "#bba888";
    case "park":
      return even ? "#4e8f46" : "#3d7640";
    case "lot":
      return even ? "#b8a078" : "#a89068";
    case "dirt":
      return even ? "#8a6a48" : "#7a5c3c";
    default:
      if (district === "industrial" || district === "yards") return even ? "#7a8a4e" : "#6a7a42";
      if (district === "corporate" || district === "civic") return even ? "#5c9a62" : "#4e8a54";
      if (district === "creative") return even ? "#62aa58" : "#529648";
      if (district === "research" || district === "labs") return even ? "#5a9a72" : "#4c8a64";
      return even ? "#5aa052" : "#4d8e48";
  }
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, stroke?: string) {
  const a = iso(x, y);
  const b = iso(x + 1, y);
  const c = iso(x + 1, y + 1);
  const d = iso(x, y + 1);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(d.sx, d.sy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

function P(gx: number, gy: number, z: number) {
  const t = iso(gx, gy);
  return { sx: t.sx, sy: t.sy - z };
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
  opts?: { trim?: string },
) {
  const tr0 = P(x + w, y, 0);
  const br0 = P(x + w, y + d, 0);
  const bl0 = P(x, y + d, 0);
  const tl1 = P(x, y, h);
  const tr1 = P(x + w, y, h);
  const br1 = P(x + w, y + d, h);
  const bl1 = P(x, y + d, h);
  const shadow = iso(x + w * 0.55, y + d * 0.55);
  ctx.fillStyle = "rgba(20,16,10,0.22)";
  ctx.beginPath();
  ctx.ellipse(shadow.sx + 6, shadow.sy + 8, w * 11, d * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bl0.sx, bl0.sy);
  ctx.lineTo(br0.sx, br0.sy);
  ctx.lineTo(br1.sx, br1.sy);
  ctx.lineTo(bl1.sx, bl1.sy);
  ctx.closePath();
  ctx.fillStyle = wallDark;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tr0.sx, tr0.sy);
  ctx.lineTo(br0.sx, br0.sy);
  ctx.lineTo(br1.sx, br1.sy);
  ctx.lineTo(tr1.sx, tr1.sy);
  ctx.closePath();
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tl1.sx, tl1.sy);
  ctx.lineTo(tr1.sx, tr1.sy);
  ctx.lineTo(br1.sx, br1.sy);
  ctx.lineTo(bl1.sx, bl1.sy);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  if (opts?.trim) {
    ctx.strokeStyle = opts.trim;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

function windows(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  cols: number,
  rows: number,
  lit = true,
) {
  const tr0 = P(x + w, y, 0);
  const br0 = P(x + w, y + d, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (c + 0.65) / (cols + 0.3);
      const wx = tr0.sx + (br0.sx - tr0.sx) * t;
      const wy = tr0.sy + (br0.sy - tr0.sy) * t - h * (0.22 + r * (0.55 / Math.max(1, rows)));
      ctx.fillStyle = lit && (c + r) % 3 !== 1 ? "rgba(255, 220, 140, 0.88)" : "rgba(160, 200, 220, 0.45)";
      ctx.fillRect(wx - 2.2, wy - 3.8, 4.4, 6.4);
    }
  }
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, accent: string) {
  const p = P(x + w * 0.72, y + d, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(p.sx - 3, p.sy - 10, 6, 12);
  ctx.fillStyle = "rgba(20,16,12,0.55)";
  ctx.fillRect(p.sx - 2, p.sy - 8, 4, 10);
}

function signage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, text: string, accent: string) {
  const p = P(x + w * 0.55, y + d * 0.08, h + 2);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(p.sx - text.length * 2.4, p.sy - 8, text.length * 4.8, 10, 2);
  ctx.fill();
  ctx.fillStyle = "#fffaf0";
  ctx.font = "700 7px ui-sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, p.sx, p.sy - 1);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, maple: boolean) {
  const p = iso(x, y);
  ctx.fillStyle = "rgba(30,20,10,0.22)";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy + 4, maple ? 9 : 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3c28";
  ctx.fillRect(p.sx - 1.3, p.sy - 10, 2.6, 12);
  ctx.fillStyle = maple ? "#2f7a38" : "#245c34";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy - 18, maple ? 12 : 9, maple ? 11 : 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = maple ? "#4aaa4a" : "#347a44";
  ctx.beginPath();
  ctx.ellipse(p.sx - 2, p.sy - 22, maple ? 8 : 6, maple ? 7 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawScenery(ctx: CanvasRenderingContext2D, s: Scenery, scale: number) {
  const p = iso(s.x, s.y);
  if (s.kind === "tree") {
    drawTree(ctx, s.x, s.y, s.assetId.includes("maple"));
    return;
  }
  if (s.kind === "lamp") {
    ctx.fillStyle = "rgba(20,16,10,0.2)";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + 2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3f46";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx, p.sy - 18);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 214, 140, 0.9)";
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 20, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (scale > 0.7) {
      ctx.fillStyle = "rgba(255, 210, 120, 0.12)";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy + 2, 14, 8, 0, 0, Math.PI * 2);
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
    ctx.fillStyle = "rgba(20,16,10,0.25)";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + 3, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.color ?? "#c45c4a";
    ctx.beginPath();
    ctx.roundRect(p.sx - 7, p.sy - 6, 14, 8, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180,210,230,0.7)";
    ctx.fillRect(p.sx - 3, p.sy - 5, 6, 3);
    return;
  }
  if (s.kind === "fence") {
    ctx.strokeStyle = "#8a7a60";
    ctx.lineWidth = 1.4;
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
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "rgba(90, 70, 40, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    if (scale >= 0.55) {
      ctx.fillStyle = "rgba(90,70,40,0.72)";
      ctx.font = "600 8px ui-sans-serif";
      ctx.textAlign = "center";
      const m = iso(s.x + w / 2, s.y + h / 2);
      ctx.fillText("PLOT", m.sx, m.sy);
    }
    return;
  }
  if (s.kind === "sign" && scale >= 0.5) {
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(p.sx - 1, p.sy - 10, 2, 10);
    ctx.fillStyle = "#ed712e";
    ctx.fillRect(p.sx - 8, p.sy - 18, 16, 9);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, scale: number, selected: boolean) {
  const { origin: o, size: s, height: h } = b;
  const style: BuildingStyle = b.style;
  const trim = selected ? "#ed712e" : "rgba(255,255,255,0.18)";

  if (style === "factory") {
    const spans = Math.max(2, Math.floor(s.x / 2));
    for (let i = 0; i < spans; i++) {
      const ww = s.x / spans;
      drawBox(ctx, o.x + i * ww, o.y, ww, s.y, h * (0.68 + (i % 2) * 0.16), b.roof, b.wall, b.wallDark, { trim });
    }
    windows(ctx, o.x, o.y, s.x, s.y, h, Math.floor(s.x * 1.5), 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "hq") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    drawBox(ctx, o.x + 1.4, o.y + 0.9, 2.2, 1.6, h + 24, b.accent, b.wall, b.wallDark);
    const tip = P(o.x + 2.5, o.y + 1.7, h + 40);
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tip.sx, tip.sy + 16);
    ctx.lineTo(tip.sx, tip.sy);
    ctx.stroke();
    windows(ctx, o.x, o.y, s.x, s.y, h, 5, 4);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "hotel") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.55, b.roof, b.wall, b.wallDark, { trim });
    drawBox(ctx, o.x + 0.6, o.y + 0.5, s.x - 1.2, s.y - 1, h * 0.82, b.roof, b.wall, b.wallDark);
    drawBox(ctx, o.x + 1.2, o.y + 0.9, s.x - 2.4, s.y - 1.8, h, b.accent, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.55, 5, 2);
    windows(ctx, o.x + 0.6, o.y + 0.5, s.x - 1.2, s.y - 1, h * 0.82, 4, 2);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "apartment") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    windows(ctx, o.x, o.y, s.x, s.y, h, 3, 5);
    for (let i = 0; i < 3; i++) {
      const bal = P(o.x + s.x, o.y + 0.4 + i * 1.2, h * (0.25 + i * 0.18));
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(bal.sx - 8, bal.sy, 10, 3);
    }
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "house") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.7, b.roof, b.wall, b.wallDark, { trim });
    const ridge = P(o.x + s.x / 2, o.y + s.y / 2, h + 16);
    const l = P(o.x, o.y, h * 0.7);
    const r = P(o.x + s.x, o.y, h * 0.7);
    const f = P(o.x + s.x, o.y + s.y, h * 0.7);
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
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.7, 2, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "cafe" || style === "restaurant") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    const aw = P(o.x + s.x, o.y + s.y * 0.12, 12);
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.ellipse(aw.sx, aw.sy, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (style === "restaurant") {
      drawBox(ctx, o.x + s.x * 0.15, o.y + s.y, s.x * 0.7, 0.8, 8, "#d4c4a8", "#e8dcc8", "#b8a888");
    }
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "retail") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    const glass = P(o.x + s.x, o.y + s.y * 0.35, 10);
    ctx.fillStyle = "rgba(160, 210, 230, 0.55)";
    ctx.fillRect(glass.sx - 10, glass.sy - 12, 16, 14);
    windows(ctx, o.x, o.y, s.x, s.y, h, 3, 2);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "data") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    windows(ctx, o.x, o.y, s.x, s.y, h, 2, 5, false);
    const top = P(o.x + s.x / 2, o.y + 0.4, h + 10);
    ctx.fillStyle = b.accent;
    ctx.fillRect(top.sx - 3, top.sy - 8, 6, 8);
  } else if (style === "station") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.5, b.roof, b.wall, b.wallDark, { trim });
    const canopy = P(o.x + s.x / 2, o.y + s.y, 16);
    ctx.fillStyle = "rgba(20,24,30,0.5)";
    ctx.beginPath();
    ctx.ellipse(canopy.sx, canopy.sy, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.5, 5, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "lab") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    drawBox(ctx, o.x + s.x * 0.65, o.y - 0.15, s.x * 0.4, s.y * 0.55, h + 14, "#e8f0f8", b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 2);
    const stack = P(o.x + 0.55, o.y + 0.35, h + 18);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(stack.sx - 2, stack.sy, 4, 18);
  } else if (style === "conference") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.72, b.roof, b.wall, b.wallDark, { trim });
    drawBox(ctx, o.x + 1.8, o.y + 0.8, 2.4, 2.2, h + 10, "#dceaf4", "#c5d8e8", "#7a92a8");
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.72, 6, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "workshop") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    const ridge = P(o.x + s.x / 2, o.y, h + 12);
    const l = P(o.x, o.y, h);
    const r = P(o.x + s.x, o.y, h);
    ctx.beginPath();
    ctx.moveTo(l.sx, l.sy);
    ctx.lineTo(ridge.sx, ridge.sy);
    ctx.lineTo(r.sx, r.sy);
    ctx.closePath();
    ctx.fillStyle = b.roof;
    ctx.fill();
    const stack = P(o.x + 0.5, o.y + 0.4, h + 22);
    ctx.fillStyle = "#6b5340";
    ctx.fillRect(stack.sx - 3, stack.sy, 6, 20);
    windows(ctx, o.x, o.y, s.x, s.y, h, 2, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "warehouse") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.68, b.roof, b.wall, b.wallDark, { trim });
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.68, 2, 1, false);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "pavilion") {
    for (const [dx, dy] of [
      [0.25, 0.25],
      [s.x - 0.4, 0.25],
      [0.25, s.y - 0.4],
      [s.x - 0.4, s.y - 0.4],
    ] as const) {
      drawBox(ctx, o.x + dx, o.y + dy, 0.28, 0.28, h * 0.7, b.roof, b.wall, b.wallDark);
    }
    drawBox(ctx, o.x, o.y, s.x, s.y, 10, b.roof, b.wall, b.wallDark, { trim });
    const roof = P(o.x + s.x / 2, o.y + s.y / 2, h);
    ctx.fillStyle = b.roof;
    ctx.beginPath();
    ctx.ellipse(roof.sx, roof.sy, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "studio" || style === "gallery") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    if (style === "gallery") {
      for (let i = 0; i < 3; i++) {
        drawBox(ctx, o.x + 0.3 + i * 1.2, o.y - 0.05, 1, s.y * 0.4, h + 8, "#e8eef4", b.wall, b.wallDark);
      }
    } else {
      const lean = P(o.x, o.y, h + 14);
      const r = P(o.x + s.x, o.y, h);
      ctx.beginPath();
      ctx.moveTo(lean.sx, lean.sy);
      ctx.lineTo(r.sx, r.sy);
      ctx.lineTo(P(o.x + s.x, o.y + 0.2, h).sx, P(o.x + s.x, o.y + 0.2, h).sy);
      ctx.fillStyle = b.roof;
      ctx.fill();
    }
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 2);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else if (style === "hall") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    const ped = P(o.x + s.x / 2, o.y, h + 10);
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.moveTo(ped.sx, ped.sy - 8);
    ctx.lineTo(ped.sx + 10, ped.sy + 6);
    ctx.lineTo(ped.sx - 10, ped.sy + 6);
    ctx.closePath();
    ctx.fill();
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 1);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  } else {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark, { trim });
    windows(ctx, o.x, o.y, s.x, s.y, h, Math.max(3, Math.floor(s.x)), 2);
    door(ctx, o.x, o.y, s.x, s.y, b.accent);
  }

  if (b.sign && scale >= 0.62) signage(ctx, o.x, o.y, s.x, s.y, h, b.sign, b.accent);

  if (scale >= 0.72) {
    const label = iso(o.x + s.x / 2, o.y + s.y / 2);
    ctx.fillStyle = selected ? "rgba(237,113,46,0.9)" : "rgba(12,12,14,0.58)";
    const w = Math.min(130, 16 + b.name.length * 6);
    ctx.beginPath();
    ctx.roundRect(label.sx - w / 2, label.sy - h - 18, w, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f4efe4";
    ctx.font = "600 9px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.name, label.sx, label.sy - h - 9);
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, agent: Agent, selected: boolean, scale: number) {
  const p = iso(agent.x, agent.y);
  const s = Math.max(0.22, Math.min(0.62, 0.32 + scale * 0.18));
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(20, 12, 8, 0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 4.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.ellipse(0, -1.6, 4.4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (scale > 1.05) {
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
  if (scale >= 1.35 || selected) {
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

function drawProp(ctx: CanvasRenderingContext2D, prop: PlacedProp, scale: number) {
  if (scale < 0.55) return;
  const item = catalogById(prop.catalogId);
  if (!item) return;
  const p = iso(prop.x, prop.y);
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.roundRect(p.sx - 5, p.sy - 7, 10, 9, 2);
  ctx.fill();
}

function drawSpeech(ctx: CanvasRenderingContext2D, agent: Agent, scale: number, selected: boolean) {
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

type Props = {
  mapId: MapId;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
};

export function WorldCanvas({ mapId, selectedAgentId, onSelectAgent }: Props) {
  const { liveRef, cameraFocus, followAgent, cameraScale, selectedBuildingId, selectBuilding, focusBuilding } = useWorld();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    camX: 0,
    camY: 0,
    scale: 0.22,
    tCamX: 0,
    tCamY: 0,
    tScale: 0.22,
    drag: false,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    selectedAgentId,
    selectedBuildingId: null as string | null,
    mapId,
    followAgent: false,
  });

  useEffect(() => {
    state.current.selectedAgentId = selectedAgentId;
    state.current.selectedBuildingId = selectedBuildingId;
    state.current.mapId = mapId;
    state.current.followAgent = followAgent;
  }, [selectedAgentId, selectedBuildingId, mapId, followAgent]);

  useEffect(() => {
    if (cameraScale) state.current.tScale = cameraScale;
  }, [cameraScale]);

  useEffect(() => {
    if (!cameraFocus) return;
    const p = iso(cameraFocus.x, cameraFocus.y);
    const sc = state.current.tScale;
    state.current.tCamX = -p.sx * sc;
    state.current.tCamY = 24 - p.sy * sc;
  }, [cameraFocus]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 800;
      const h = parent?.clientHeight ?? 600;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let raf = 0;
    const paint = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const snapshot = liveRef.current;
      const rain = snapshot.environmentId === "rain-lot";
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#8ec8ea");
      sky.addColorStop(0.42, "#c5dce8");
      sky.addColorStop(1, "#6f9e62");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      if (state.current.followAgent && state.current.selectedAgentId) {
        const ag = snapshot.agents.find((a) => a.id === state.current.selectedAgentId);
        if (ag) {
          const p = iso(ag.x, ag.y);
          state.current.tCamX = -p.sx * state.current.scale;
          state.current.tCamY = 40 - p.sy * state.current.scale;
        }
      }

      if (!state.current.drag) {
        state.current.camX += (state.current.tCamX - state.current.camX) * 0.1;
        state.current.camY += (state.current.tCamY - state.current.camY) * 0.1;
        state.current.scale += (state.current.tScale - state.current.scale) * 0.1;
      }

      const originX = w / 2 + state.current.camX;
      const originY = h * 0.1 + state.current.camY;
      const scale = state.current.scale;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);

      const pad = 5;
      const inv = (sx: number, sy: number) => toGrid(sx, sy);
      const corners = [
        inv(-originX / scale, -originY / scale),
        inv((w - originX) / scale, -originY / scale),
        inv(-originX / scale, (h - originY) / scale),
        inv((w - originX) / scale, (h - originY) / scale),
      ];
      const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x)) - pad));
      const maxX = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.x)) + pad));
      const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y)) - pad));
      const maxY = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.y)) + pad));

      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const kind = TERRAIN[y]![x]!;
          drawTile(ctx, x, y, tileColor(kind, (x + y) % 2 === 0, x, y), kind === "road" ? "rgba(40,36,32,0.18)" : undefined);
          if (kind === "road" && x % 2 === y % 2) {
            const a = iso(x + 0.42, y + 0.42);
            ctx.fillStyle = "rgba(232, 210, 140, 0.28)";
            ctx.fillRect(a.sx - 1, a.sy - 1, 2, 2);
          }
        }
      }

      const scenery = SCENERY.filter(
        (s) => s.x >= minX - 2 && s.x <= maxX + 2 && s.y >= minY - 2 && s.y <= maxY + 2,
      ).sort((a, b) => a.x + a.y - (b.x + b.y));

      const buildings = [...LOT_BUILDINGS].sort((a, b) => a.origin.x + a.origin.y - (b.origin.x + b.origin.y));
      const agents = [...snapshot.agents].filter((a) => a.mapId === "lot").sort((a, b) => a.x + a.y - (b.x + b.y));

      type Layer = { z: number; draw: () => void };
      const layers: Layer[] = [];
      for (const s of scenery) layers.push({ z: s.x + s.y, draw: () => drawScenery(ctx, s, scale) });
      for (const b of buildings) {
        if (b.origin.x > maxX || b.origin.y > maxY || b.origin.x + b.size.x < minX || b.origin.y + b.size.y < minY) continue;
        layers.push({
          z: b.origin.x + b.origin.y + b.size.x * 0.35,
          draw: () => drawBuilding(ctx, b, scale, b.id === state.current.selectedBuildingId),
        });
      }
      for (const prop of snapshot.props) {
        if (prop.mapId !== "lot") continue;
        layers.push({ z: prop.x + prop.y, draw: () => drawProp(ctx, prop, scale) });
      }
      for (const agent of agents) {
        layers.push({ z: agent.x + agent.y + 0.4, draw: () => drawSlime(ctx, agent, agent.id === state.current.selectedAgentId, scale) });
      }
      layers.sort((a, b) => a.z - b.z);
      for (const layer of layers) layer.draw();
      for (const agent of agents) drawSpeech(ctx, agent, scale, agent.id === state.current.selectedAgentId);

      ctx.restore();

      if (scale < 0.5) {
        ctx.fillStyle = "rgba(12,12,14,0.5)";
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

      if (rain) {
        ctx.strokeStyle = "rgba(180,210,230,0.28)";
        for (let i = 0; i < 80; i++) {
          const x = (i * 97 + performance.now() / 8) % w;
          const y = (i * 53 + performance.now() / 3) % h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 4, y + 12);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const onDown = (e: PointerEvent) => {
      state.current.drag = true;
      state.current.lx = e.clientX;
      state.current.ly = e.clientY;
      state.current.sx = e.clientX;
      state.current.sy = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!state.current.drag) return;
      const dx = e.clientX - state.current.lx;
      const dy = e.clientY - state.current.ly;
      state.current.camX += dx;
      state.current.camY += dy;
      state.current.tCamX += dx;
      state.current.tCamY += dy;
      state.current.lx = e.clientX;
      state.current.ly = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - state.current.sx, e.clientY - state.current.sy) > 6;
      state.current.drag = false;
      if (moved) return;
      const rect = canvas.getBoundingClientRect();
      const originX = canvas.clientWidth / 2 + state.current.camX;
      const originY = canvas.clientHeight * 0.1 + state.current.camY;
      const scale = state.current.scale;
      const lx = (e.clientX - rect.left - originX) / scale;
      const ly = (e.clientY - rect.top - originY) / scale;
      let best: Agent | null = null;
      let bestD = 10 / scale;
      for (const agent of liveRef.current.agents.filter((a) => a.mapId === "lot")) {
        const p = iso(agent.x, agent.y);
        const d = Math.hypot(p.sx - lx, p.sy - ly);
        if (d < bestD) {
          bestD = d;
          best = agent;
        }
      }
      if (best) {
        onSelectAgent(best.id);
        return;
      }
      const g = toGrid(lx, ly);
      const b = buildingAt(LOT_BUILDINGS, g.x, g.y);
      if (b) {
        selectBuilding(b.id);
        focusBuilding(b.id);
        onSelectAgent(null);
        return;
      }
      onSelectAgent(null);
      selectBuilding(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const old = state.current.scale;
      const next = Math.min(2.8, Math.max(0.14, old * (e.deltaY > 0 ? 0.9 : 1.1)));
      const k = next / old;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight * 0.1;
      const camX = mx - cx - (mx - cx - state.current.camX) * k;
      const camY = my - cy - (my - cy - state.current.camY) * k;
      state.current.camX = camX;
      state.current.camY = camY;
      state.current.tCamX = camX;
      state.current.tCamY = camY;
      state.current.scale = next;
      state.current.tScale = next;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onSelectAgent, liveRef, selectBuilding, focusBuilding]);

  return <canvas ref={ref} className="size-full cursor-grab touch-none active:cursor-grabbing" aria-label="Northshore" />;
}

export type { Building };
