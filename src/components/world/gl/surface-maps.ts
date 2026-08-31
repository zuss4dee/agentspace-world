"use client";

import { useMemo } from "react";
import * as THREE from "three";

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makeBrickMap() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#8c6a58";
    ctx.fillRect(0, 0, w, h);
    const bh = 10;
    const bw = 22;
    for (let y = 0, row = 0; y < h; y += bh, row++) {
      ctx.fillStyle = "#6e5346";
      ctx.fillRect(0, y + bh - 2, w, 2);
      const ox = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        ctx.fillStyle = row % 3 === 0 ? "#a07a62" : "#94705a";
        ctx.fillRect(x + ox + 1, y + 1, bw - 3, bh - 3);
      }
    }
  });
}

export function makeConcreteMap() {
  return canvasTex(96, 96, (ctx, w, h) => {
    ctx.fillStyle = "#b7b3aa";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) {
      const n = (i * 37) % 97;
      ctx.fillStyle = `rgba(80,76,70,${0.04 + (n % 7) * 0.01})`;
      ctx.fillRect((i * 13) % w, (i * 29) % h, 2 + (n % 4), 1);
    }
  });
}

export function makeAsphaltMap() {
  return canvasTex(96, 96, (ctx, w, h) => {
    ctx.fillStyle = "#4a4742";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const n = (i * 19) % 89;
      ctx.fillStyle = `rgba(${70 + (n % 18)},${68 + (n % 12)},${62},0.18)`;
      ctx.fillRect((i * 17) % w, (i * 23) % h, 1 + (n % 3), 1);
    }
  });
}

export function makeRoofMap() {
  return canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#4a4e56";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        ctx.fillStyle = (x + y) % 8 === 0 ? "#555b64" : "#43484f";
        ctx.fillRect(x, y, 3, 3);
      }
    }
  });
}

let cached: { brick: THREE.CanvasTexture; concrete: THREE.CanvasTexture; asphalt: THREE.CanvasTexture; roof: THREE.CanvasTexture } | null = null;

export function useCityMaps() {
  return useMemo(() => {
    if (!cached) {
      cached = {
        brick: makeBrickMap(),
        concrete: makeConcreteMap(),
        asphalt: makeAsphaltMap(),
        roof: makeRoofMap(),
      };
    }
    return cached;
  }, []);
}
