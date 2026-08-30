"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/components/world/world-store";
import { GRID, LOT_BUILDINGS, PLAZA_COMPANIES } from "@/lib/campus";
import { catalogById } from "@/lib/catalog";
import type { Agent, Building, CompanyFacade, MapId, PlacedProp } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/playbooks";

const TW = 56;
const TH = 28;

function iso(x: number, y: number) {
  return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  stroke?: string,
) {
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
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
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
  const p = (gx: number, gy: number, z: number) => {
    const t = iso(gx, gy);
    return { sx: t.sx, sy: t.sy - z };
  };
  const tr0 = p(x + w, y, 0);
  const br0 = p(x + w, y + d, 0);
  const bl0 = p(x, y + d, 0);
  const tl1 = p(x, y, h);
  const tr1 = p(x + w, y, h);
  const br1 = p(x + w, y + d, h);
  const bl1 = p(x, y + d, h);

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
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const windows = Math.max(2, Math.floor(w * 1.4));
  for (let i = 0; i < windows; i++) {
    const t = (i + 0.7) / (windows + 0.4);
    const wx = tr0.sx + (br0.sx - tr0.sx) * t;
    const wy = tr0.sy + (br0.sy - tr0.sy) * t - h * 0.45;
    ctx.fillStyle = "rgba(255, 220, 140, 0.7)";
    ctx.fillRect(wx - 2.5, wy - 4, 5, 7);
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, agent: Agent, selected: boolean) {
  const p = iso(agent.x, agent.y);
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.fillStyle = "rgba(40, 18, 8, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const sit = agent.status === "working" || agent.status === "meeting" || agent.status === "idle";
  const squash = sit ? 1.12 : 1;
  const rise = sit ? 2 : 0;
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  const shape = agent.shape ?? "blob";
  if (shape === "drop") {
    ctx.moveTo(0, -22 + rise);
    ctx.quadraticCurveTo(18, -4, 0, 10 * squash);
    ctx.quadraticCurveTo(-18, -4, 0, -22 + rise);
  } else if (shape === "stadium") {
    ctx.roundRect(-16, -16 + rise, 32, 22 * squash, 12);
  } else if (shape === "cloud") {
    ctx.arc(-8, -4 + rise, 10, 0, Math.PI * 2);
    ctx.arc(8, -4 + rise, 11, 0, Math.PI * 2);
    ctx.arc(0, -12 + rise, 10, 0, Math.PI * 2);
  } else if (shape === "circle") {
    ctx.ellipse(0, -6 + rise, 14, 14 * squash, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, -6 + rise, 16, 13 * squash, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 246, 236, 0.28)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = "#1a1410";
  ctx.beginPath();
  ctx.ellipse(-5, -10 + rise, 2.4, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -10 + rise, 2.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6ec";
  ctx.beginPath();
  ctx.arc(-4.2, -11 + rise, 0.9, 0, Math.PI * 2);
  ctx.arc(5.8, -11 + rise, 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = "#ed712e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 8, 18, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(12, 12, 14, 0.72)";
  ctx.beginPath();
  ctx.roundRect(-34, -40 + rise, 68, 14, 4);
  ctx.fill();
  ctx.fillStyle = "#f3efe6";
  ctx.font = "700 9px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${agent.name} · ${ROLE_LABEL[agent.role]}`, 0, -30 + rise);
  ctx.restore();
}

function drawAgent(ctx: CanvasRenderingContext2D, agent: Agent, selected: boolean) {
  drawSlime(ctx, agent, selected);
}

function drawProp(ctx: CanvasRenderingContext2D, prop: PlacedProp) {
  const item = catalogById(prop.catalogId);
  if (!item) return;
  const p = iso(prop.x, prop.y);
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.roundRect(-10, -12, 20, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#fff8e8";
  ctx.font = "12px ui-sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(item.glyph.slice(0, 2), 0, 0);
  ctx.restore();
}

function drawSpeech(ctx: CanvasRenderingContext2D, agent: Agent) {
  const line = agent.speech || (agent.status === "walking" ? "" : agent.thought);
  if (!line) return;
  const p = iso(agent.x, agent.y);
  const text = line.slice(0, 42) + (line.length > 42 ? "…" : "");
  ctx.save();
  ctx.font = "11px ui-sans-serif, system-ui";
  const w = Math.min(220, ctx.measureText(text).width + 16);
  ctx.fillStyle = "rgba(255, 246, 236, 0.94)";
  ctx.beginPath();
  ctx.roundRect(p.sx - w / 2, p.sy - 72, w, 24, 10);
  ctx.fill();
  ctx.fillStyle = "#3a2418";
  ctx.textAlign = "center";
  ctx.fillText(text, p.sx, p.sy - 56);
  ctx.restore();
}

function hitAgent(agents: Agent[], mx: number, my: number, originX: number, originY: number, scale: number) {
  const lx = (mx - originX) / scale;
  const ly = (my - originY) / scale;
  let best: Agent | null = null;
  let bestD = 28;
  for (const agent of agents) {
    const p = iso(agent.x, agent.y);
    const d = Math.hypot(p.sx - lx, p.sy - 10 - ly);
    if (d < bestD) {
      bestD = d;
      best = agent;
    }
  }
  return best;
}

type Props = {
  mapId: MapId;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
};

export function WorldCanvas({ mapId, selectedAgentId, onSelectAgent }: Props) {
  const { liveRef, cameraFocus } = useWorld();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    camX: 0,
    camY: 0,
    scale: 1,
    drag: false,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    selectedAgentId,
    mapId,
  });

  useEffect(() => {
    state.current.selectedAgentId = selectedAgentId;
    state.current.mapId = mapId;
  }, [selectedAgentId, mapId]);

  useEffect(() => {
    if (!cameraFocus) return;
    const p = iso(cameraFocus.x, cameraFocus.y);
    state.current.camX = -p.sx * state.current.scale;
    state.current.camY = 40 - p.sy * state.current.scale;
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

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#87c5e8");
      g.addColorStop(0.42, "#d6a47c");
      g.addColorStop(1, "#8a4b32");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const originX = w / 2 + state.current.camX;
      const originY = h * 0.16 + state.current.camY;
      const scale = state.current.scale;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);

      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const path = x === 8 || y === 8 || x === 9 || y === 9;
          const even = (x + y) % 2 === 0;
          const floor = even ? "#c4a574" : "#b89564";
          const stone = even ? "#8a7a62" : "#7a6b56";
          drawTile(ctx, x, y, path ? stone : floor, "rgba(90,50,24,0.16)");
        }
      }

      if (state.current.mapId === "lot") {
        const hearth = iso(9, 9);
        const glow = ctx.createRadialGradient(hearth.sx, hearth.sy, 8, hearth.sx, hearth.sy, 90);
        glow.addColorStop(0, "rgba(237, 113, 46, 0.55)");
        glow.addColorStop(1, "rgba(237, 113, 46, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(hearth.sx, hearth.sy, 70, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2418";
        ctx.beginPath();
        ctx.ellipse(hearth.sx, hearth.sy, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ed712e";
        ctx.beginPath();
        ctx.ellipse(hearth.sx, hearth.sy - 6, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(243, 239, 230, 0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(hearth.sx, hearth.sy - 40, 280, 150, 0, Math.PI, 0);
        ctx.stroke();
      }

      const buildings: (Building | CompanyFacade)[] =
        state.current.mapId === "lot" ? LOT_BUILDINGS : PLAZA_COMPANIES;
      const sortedBuildings = [...buildings].sort(
        (a, b) => a.origin.x + a.origin.y - (b.origin.x + b.origin.y),
      );
      for (const b of sortedBuildings) {
        drawBox(
          ctx,
          b.origin.x,
          b.origin.y,
          b.size.x,
          b.size.y,
          b.height,
          b.roof,
          b.wall,
          b.wallDark,
        );
        const label = iso(b.origin.x + b.size.x / 2, b.origin.y + b.size.y / 2);
        ctx.fillStyle = "rgba(12,12,14,0.72)";
        ctx.beginPath();
        ctx.roundRect(label.sx - 52, label.sy - b.height - 18, 104, 16, 6);
        ctx.fill();
        ctx.fillStyle = "#f4efe4";
        ctx.font = "600 10px ui-sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.name, label.sx, label.sy - b.height - 7);
      }

      const mapProps = snapshot.props.filter((p) => p.mapId === state.current.mapId);
      for (const prop of mapProps) drawProp(ctx, prop);

      const mapAgents = [...snapshot.agents]
        .filter((a) => a.mapId === state.current.mapId)
        .sort((a, b) => a.x + a.y - (b.x + b.y));
      for (const agent of mapAgents) {
        drawAgent(ctx, agent, agent.id === state.current.selectedAgentId);
      }
      for (const agent of mapAgents) drawSpeech(ctx, agent);

      ctx.restore();

      if (rain) {
        ctx.strokeStyle = "rgba(180,210,230,0.28)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 70; i++) {
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
      const moved =
        Math.hypot(e.clientX - state.current.sx, e.clientY - state.current.sy) > 6;
      state.current.drag = false;
      if (moved) return;
      const rect = canvas.getBoundingClientRect();
      const originX = canvas.clientWidth / 2 + state.current.camX;
      const originY = canvas.clientHeight * 0.16 + state.current.camY;
      const hit = hitAgent(
        liveRef.current.agents.filter((a) => a.mapId === state.current.mapId),
        e.clientX - rect.left,
        e.clientY - rect.top,
        originX,
        originY,
        state.current.scale,
      );
      onSelectAgent(hit?.id ?? null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.min(1.8, Math.max(0.7, state.current.scale * (e.deltaY > 0 ? 0.94 : 1.06)));
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
      aria-label={mapId === "lot" ? "Your Grokbot lot" : "Public plaza"}
    />
  );
}
