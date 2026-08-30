"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/components/world/world-store";
import {
  GRID,
  LOT_BUILDINGS,
  TERRAIN,
  TREES,
  districtAt,
} from "@/lib/campus";
import { catalogById } from "@/lib/catalog";
import type { Agent, Building, MapId, PlacedProp, TileKind } from "@/lib/types";
import { roleLabel } from "@/lib/playbooks";

const TW = 40;
const TH = 20;

function iso(x: number, y: number) {
  return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
}

function tileColor(kind: TileKind, even: boolean): string {
  switch (kind) {
    case "road":
      return even ? "#6b6560" : "#5c5752";
    case "water":
      return even ? "#4d8fb5" : "#3d7a9e";
    case "sand":
      return even ? "#d4c49a" : "#c4b48a";
    case "plaza":
      return even ? "#c4b49a" : "#b8a88c";
    case "park":
      return even ? "#4f8a48" : "#3f7340";
    case "dirt":
      return even ? "#8a6a48" : "#7a5c3c";
    default:
      return even ? "#5a9a52" : "#4d8a48";
  }
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string) {
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
) {
  const tr0 = P(x + w, y, 0);
  const br0 = P(x + w, y + d, 0);
  const bl0 = P(x, y + d, 0);
  const tl1 = P(x, y, h);
  const tr1 = P(x + w, y, h);
  const br1 = P(x + w, y + d, h);
  const bl1 = P(x, y + d, h);
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
}

function windows(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, cols: number, rows: number) {
  const tr0 = P(x + w, y, 0);
  const br0 = P(x + w, y + d, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (c + 0.65) / (cols + 0.3);
      const wx = tr0.sx + (br0.sx - tr0.sx) * t;
      const wy = tr0.sy + (br0.sy - tr0.sy) * t - h * (0.28 + r * 0.22);
      ctx.fillStyle = r % 2 === 0 ? "rgba(255, 228, 160, 0.8)" : "rgba(180, 210, 230, 0.55)";
      ctx.fillRect(wx - 2, wy - 3.5, 4, 6);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = iso(x, y);
  ctx.fillStyle = "rgba(30,20,10,0.25)";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy + 4, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c4030";
  ctx.fillRect(p.sx - 1.4, p.sy - 10, 2.8, 12);
  ctx.fillStyle = "#2f7a3a";
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy - 28);
  ctx.lineTo(p.sx + 12, p.sy - 8);
  ctx.lineTo(p.sx - 12, p.sy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3d9a4a";
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy - 34);
  ctx.lineTo(p.sx + 9, p.sy - 16);
  ctx.lineTo(p.sx - 9, p.sy - 16);
  ctx.closePath();
  ctx.fill();
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, scale: number) {
  const { origin: o, size: s, height: h } = b;
  if (b.style === "factory") {
    const spans = Math.max(2, Math.floor(s.x / 2));
    for (let i = 0; i < spans; i++) {
      const ww = s.x / spans;
      drawBox(ctx, o.x + i * ww, o.y, ww, s.y, h * (0.7 + (i % 2) * 0.12), b.roof, b.wall, b.wallDark);
    }
    windows(ctx, o.x, o.y, s.x, s.y, h, Math.floor(s.x * 1.6), 1);
  } else if (b.style === "hq") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    drawBox(ctx, o.x + 1.5, o.y + 1, 2, 1.5, h + 22, b.accent, b.wall, b.wallDark);
    const tip = P(o.x + 2.5, o.y + 1.7, h + 38);
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tip.sx, tip.sy + 16);
    ctx.lineTo(tip.sx, tip.sy);
    ctx.stroke();
    windows(ctx, o.x, o.y, s.x, s.y, h, 5, 3);
  } else if (b.style === "house") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.72, b.roof, b.wall, b.wallDark);
    const ridge = P(o.x + s.x / 2, o.y + s.y / 2, h + 14);
    const l = P(o.x, o.y, h * 0.72);
    const r = P(o.x + s.x, o.y, h * 0.72);
    const f = P(o.x + s.x, o.y + s.y, h * 0.72);
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
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.72, 2, 1);
  } else if (b.style === "cafe") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    const aw = P(o.x + s.x, o.y + s.y * 0.15, 14);
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.ellipse(aw.sx, aw.sy, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    windows(ctx, o.x, o.y, s.x, s.y, h, 3, 1);
  } else if (b.style === "data") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h, 2, 4);
    const top = P(o.x + s.x / 2, o.y + 0.4, h + 8);
    ctx.fillStyle = b.accent;
    ctx.fillRect(top.sx - 3, top.sy - 6, 6, 6);
  } else if (b.style === "station") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.55, b.roof, b.wall, b.wallDark);
    const canopy = P(o.x + s.x / 2, o.y + s.y, 18);
    ctx.fillStyle = "rgba(20,24,30,0.45)";
    ctx.beginPath();
    ctx.ellipse(canopy.sx, canopy.sy, 40, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.55, 4, 1);
  } else if (b.style === "lab") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 2);
    const stack = P(o.x + 0.6, o.y + 0.4, h + 16);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(stack.sx - 2, stack.sy, 4, 16);
  } else if (b.style === "warehouse") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h * 0.7, b.roof, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h * 0.7, 3, 1);
  } else if (b.style === "studio" || b.style === "gallery") {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h, 4, 2);
  } else {
    drawBox(ctx, o.x, o.y, s.x, s.y, h, b.roof, b.wall, b.wallDark);
    windows(ctx, o.x, o.y, s.x, s.y, h, Math.max(3, Math.floor(s.x)), 2);
  }

  if (scale >= 0.55) {
    const label = iso(o.x + s.x / 2, o.y + s.y / 2);
    ctx.fillStyle = "rgba(12,12,14,0.62)";
    const w = Math.min(120, 18 + b.name.length * 6);
    ctx.beginPath();
    ctx.roundRect(label.sx - w / 2, label.sy - h - 16, w, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f4efe4";
    ctx.font = "600 9px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.name, label.sx, label.sy - h - 7);
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, agent: Agent, selected: boolean, scale: number) {
  const p = iso(agent.x, agent.y);
  const s = Math.max(0.45, Math.min(1.1, scale));
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(20, 12, 8, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.ellipse(0, -2, 5.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (scale > 0.85) {
    ctx.fillStyle = "#1a1410";
    ctx.beginPath();
    ctx.arc(-1.6, -3, 0.7, 0, Math.PI * 2);
    ctx.arc(1.6, -3, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (selected) {
    ctx.strokeStyle = "#ed712e";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 3.4, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (scale >= 1.15 || selected) {
    ctx.fillStyle = "rgba(12,12,14,0.72)";
    ctx.beginPath();
    ctx.roundRect(p.sx - 28, p.sy - 22, 56, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#f3efe6";
    ctx.font = "600 8px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${agent.name} · ${roleLabel(agent.role)}`, p.sx, p.sy - 14);
  }
}

function drawProp(ctx: CanvasRenderingContext2D, prop: PlacedProp, scale: number) {
  if (scale < 0.7) return;
  const item = catalogById(prop.catalogId);
  if (!item) return;
  const p = iso(prop.x, prop.y);
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.roundRect(p.sx - 6, p.sy - 8, 12, 10, 2);
  ctx.fill();
}

function drawSpeech(ctx: CanvasRenderingContext2D, agent: Agent, scale: number) {
  if (scale < 1.35) return;
  const line = agent.speech || (agent.status === "walking" ? "" : agent.thought);
  if (!line) return;
  const p = iso(agent.x, agent.y);
  const text = line.slice(0, 36) + (line.length > 36 ? "…" : "");
  ctx.font = "10px ui-sans-serif";
  const w = Math.min(180, ctx.measureText(text).width + 12);
  ctx.fillStyle = "rgba(255,246,236,0.94)";
  ctx.beginPath();
  ctx.roundRect(p.sx - w / 2, p.sy - 36, w, 16, 6);
  ctx.fill();
  ctx.fillStyle = "#3a2418";
  ctx.textAlign = "center";
  ctx.fillText(text, p.sx, p.sy - 25);
}

type Props = {
  mapId: MapId;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
};

export function WorldCanvas({ mapId, selectedAgentId, onSelectAgent }: Props) {
  const { liveRef, cameraFocus, followAgent, cameraScale } = useWorld();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    camX: 0,
    camY: 0,
    scale: 0.36,
    drag: false,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    selectedAgentId,
    mapId,
    followAgent: false,
  });

  useEffect(() => {
    state.current.selectedAgentId = selectedAgentId;
    state.current.mapId = mapId;
    state.current.followAgent = followAgent;
  }, [selectedAgentId, mapId, followAgent]);

  useEffect(() => {
    if (cameraScale) state.current.scale = cameraScale;
  }, [cameraScale]);

  useEffect(() => {
    if (!cameraFocus) return;
    const p = iso(cameraFocus.x, cameraFocus.y);
    state.current.camX = -p.sx * state.current.scale;
    state.current.camY = 30 - p.sy * state.current.scale;
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
      sky.addColorStop(0.38, "#c5dce8");
      sky.addColorStop(1, "#7fa86a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      if (state.current.followAgent && state.current.selectedAgentId) {
        const ag = snapshot.agents.find((a) => a.id === state.current.selectedAgentId);
        if (ag) {
          const p = iso(ag.x, ag.y);
          const wantX = -p.sx * state.current.scale;
          const wantY = 40 - p.sy * state.current.scale;
          state.current.camX += (wantX - state.current.camX) * 0.08;
          state.current.camY += (wantY - state.current.camY) * 0.08;
        }
      }

      const originX = w / 2 + state.current.camX;
      const originY = h * 0.12 + state.current.camY;
      const scale = state.current.scale;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);

      const pad = 4;
      const inv = (sx: number, sy: number) => {
        const X = sx / (TW / 2);
        const Y = sy / (TH / 2);
        return { x: (X + Y) / 2, y: (Y - X) / 2 };
      };
      const corners = [
        inv((-originX) / scale, (-originY) / scale),
        inv((w - originX) / scale, (-originY) / scale),
        inv((-originX) / scale, (h - originY) / scale),
        inv((w - originX) / scale, (h - originY) / scale),
      ];
      const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x)) - pad));
      const maxX = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.x)) + pad));
      const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y)) - pad));
      const maxY = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.y)) + pad));

      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const kind = TERRAIN[y]![x]!;
          drawTile(ctx, x, y, tileColor(kind, (x + y) % 2 === 0));
        }
      }

      for (const tree of TREES) {
        if (tree.x < minX || tree.x > maxX || tree.y < minY || tree.y > maxY) continue;
        drawTree(ctx, tree.x, tree.y);
      }

      const buildings = [...LOT_BUILDINGS].sort((a, b) => a.origin.x + a.origin.y - (b.origin.x + b.origin.y));
      for (const b of buildings) {
        if (b.origin.x > maxX || b.origin.y > maxY || b.origin.x + b.size.x < minX || b.origin.y + b.size.y < minY) continue;
        drawBuilding(ctx, b, scale);
      }

      for (const prop of snapshot.props) {
        if (prop.mapId !== "lot") continue;
        drawProp(ctx, prop, scale);
      }

      const agents = [...snapshot.agents].filter((a) => a.mapId === "lot").sort((a, b) => a.x + a.y - (b.x + b.y));
      for (const agent of agents) drawSlime(ctx, agent, agent.id === state.current.selectedAgentId, scale);
      for (const agent of agents) drawSpeech(ctx, agent, scale);

      ctx.restore();

      if (scale < 0.55) {
        ctx.fillStyle = "rgba(12,12,14,0.45)";
        ctx.font = "600 11px ui-sans-serif";
        ctx.textAlign = "left";
        const seen = new Set<string>();
        for (const b of LOT_BUILDINGS) {
          const d = districtAt(b.origin.x, b.origin.y);
          if (!d || seen.has(d.id)) continue;
          seen.add(d.id);
          const p = iso(d.origin.x + d.size.x / 2, d.origin.y + d.size.y / 2);
          const sx = originX + p.sx * scale;
          const sy = originY + p.sy * scale;
          if (sx < 80 || sy < 40 || sx > w - 40) continue;
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
      state.current.camX += e.clientX - state.current.lx;
      state.current.camY += e.clientY - state.current.ly;
      state.current.lx = e.clientX;
      state.current.ly = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - state.current.sx, e.clientY - state.current.sy) > 6;
      state.current.drag = false;
      if (moved) return;
      const rect = canvas.getBoundingClientRect();
      const originX = canvas.clientWidth / 2 + state.current.camX;
      const originY = canvas.clientHeight * 0.12 + state.current.camY;
      const scale = state.current.scale;
      const lx = (e.clientX - rect.left - originX) / scale;
      const ly = (e.clientY - rect.top - originY) / scale;
      let best: Agent | null = null;
      let bestD = 14 / scale;
      for (const agent of liveRef.current.agents.filter((a) => a.mapId === "lot")) {
        const p = iso(agent.x, agent.y);
        const d = Math.hypot(p.sx - lx, p.sy - ly);
        if (d < bestD) {
          bestD = d;
          best = agent;
        }
      }
      onSelectAgent(best?.id ?? null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const old = state.current.scale;
      const next = Math.min(2.6, Math.max(0.22, old * (e.deltaY > 0 ? 0.92 : 1.08)));
      const k = next / old;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight * 0.12;
      state.current.camX = mx - cx - (mx - cx - state.current.camX) * k;
      state.current.camY = my - cy - (my - cy - state.current.camY) * k;
      state.current.scale = next;
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
  }, [onSelectAgent, liveRef]);

  return (
    <canvas
      ref={ref}
      className="size-full cursor-grab touch-none active:cursor-grabbing"
      aria-label="Northshore campus"
    />
  );
}

export type { Building };
