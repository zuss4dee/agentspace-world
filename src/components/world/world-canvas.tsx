"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/components/world/world-store";
import { GRID, LOT_BUILDINGS, buildingAt } from "@/lib/campus";
import { SCENERY } from "@/lib/scenery";
import type { Agent, Building, MapId } from "@/lib/types";
import {
  drawBuilding,
  drawDistrictHints,
  drawProp,
  drawRoads,
  drawScenery,
  drawSlime,
  drawSpeech,
  drawTerrain,
  drawTraffic,
  drawWaterDetail,
  drawWorldShadows,
  iso,
  toGrid,
} from "@/components/world/iso-draw";

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
    const paint = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const snapshot = liveRef.current;
      const rain = snapshot.environmentId === "rain-lot";
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#7eb8e4");
      sky.addColorStop(0.28, "#b9d6ea");
      sky.addColorStop(0.55, "#cfe0c4");
      sky.addColorStop(1, "#6a9a58");
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
        state.current.camX += (state.current.tCamX - state.current.camX) * 0.08;
        state.current.camY += (state.current.tCamY - state.current.camY) * 0.08;
        state.current.scale += (state.current.tScale - state.current.scale) * 0.08;
      }

      const originX = w / 2 + state.current.camX;
      const originY = h * 0.1 + state.current.camY;
      const scale = state.current.scale;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);

      const pad = 5;
      const corners = [
        toGrid(-originX / scale, -originY / scale),
        toGrid((w - originX) / scale, -originY / scale),
        toGrid(-originX / scale, (h - originY) / scale),
        toGrid((w - originX) / scale, (h - originY) / scale),
      ];
      const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x)) - pad));
      const maxX = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.x)) + pad));
      const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y)) - pad));
      const maxY = Math.min(GRID, Math.ceil(Math.max(...corners.map((c) => c.y)) + pad));

      drawTerrain(ctx, minX, maxX, minY, maxY, now);
      drawWaterDetail(ctx, minX, maxX, minY, maxY, now);
      drawRoads(ctx, minX, maxX, minY, maxY);

      const scenery = SCENERY.filter(
        (s) => s.x >= minX - 2 && s.x <= maxX + 2 && s.y >= minY - 2 && s.y <= maxY + 2,
      );
      drawWorldShadows(ctx, scenery);
      drawTraffic(ctx, now);

      const buildings = LOT_BUILDINGS.filter(
        (b) => !(b.origin.x > maxX || b.origin.y > maxY || b.origin.x + b.size.x < minX || b.origin.y + b.size.y < minY),
      );
      const agents = snapshot.agents.filter((a) => a.mapId === "lot");

      type Layer = { z: number; draw: () => void };
      const layers: Layer[] = [];
      for (const s of scenery) layers.push({ z: s.x + s.y, draw: () => drawScenery(ctx, s, scale, now) });
      for (const b of buildings) {
        layers.push({
          z: b.origin.x + b.origin.y + b.size.x * 0.35,
          draw: () => drawBuilding(ctx, b, scale, b.id === state.current.selectedBuildingId, now),
        });
      }
      for (const prop of snapshot.props) {
        if (prop.mapId !== "lot") continue;
        layers.push({ z: prop.x + prop.y, draw: () => drawProp(ctx, prop, scale) });
      }
      for (const agent of agents) {
        layers.push({
          z: agent.x + agent.y + 0.45,
          draw: () => drawSlime(ctx, agent, agent.id === state.current.selectedAgentId, scale),
        });
      }
      layers.sort((a, b) => a.z - b.z);
      for (const layer of layers) layer.draw();
      for (const agent of agents) drawSpeech(ctx, agent, scale, agent.id === state.current.selectedAgentId);

      ctx.restore();

      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.2, w * 0.5, h * 0.45, h * 0.85);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(20, 30, 24, 0.16)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      drawDistrictHints(ctx, originX, originY, scale, w, h);

      if (rain) {
        ctx.strokeStyle = "rgba(180,210,230,0.28)";
        for (let i = 0; i < 80; i++) {
          const x = (i * 97 + now / 8) % w;
          const y = (i * 53 + now / 3) % h;
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
