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
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#6e564c";
    ctx.fillRect(0, 0, w, h);
    const bh = 8;
    const bw = 18;
    for (let y = 0, row = 0; y < h; y += bh, row++) {
      ctx.fillStyle = "rgba(42,34,30,0.45)";
      ctx.fillRect(0, y + bh - 1, w, 1);
      const ox = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const n = (x * 13 + y * 7 + row * 3) % 11;
        ctx.fillStyle = n < 3 ? "#8a6a58" : n < 7 ? "#7a5e4e" : "#6a5246";
        ctx.fillRect(x + ox + 1, y + 1, bw - 2, bh - 2);
        ctx.fillStyle = "rgba(255,240,220,0.06)";
        ctx.fillRect(x + ox + 2, y + 1, bw - 6, 1);
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
    ctx.fillStyle = "#3e3c38";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const n = (i * 19) % 89;
      ctx.fillStyle = `rgba(${58 + (n % 14)},${56 + (n % 10)},${50},0.14)`;
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

export function makeMetalMap() {
  return canvasTex(64, 96, (ctx, w, h) => {
    ctx.fillStyle = "#6a7078";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? "#7a8088" : "#5e646c";
      ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = "rgba(20,20,22,0.25)";
      ctx.fillRect(x + 6, 0, 1, h);
    }
  });
}

export function makeGrassMap() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#4a6438";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const n = (i * 17) % 91;
      ctx.fillStyle = n % 4 === 0 ? "#5a7840" : n % 4 === 1 ? "#3c5c32" : n % 4 === 2 ? "#4e6c38" : "#628448";
      ctx.fillRect((i * 13) % w, (i * 29) % h, 1 + (n % 2), 2 + (n % 3));
    }
  });
}

let cached: {
  brick: THREE.CanvasTexture;
  concrete: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  metal: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
} | null = null;

export function useCityMaps() {
  return useMemo(() => {
    if (!cached) {
      cached = {
        brick: makeBrickMap(),
        concrete: makeConcreteMap(),
        asphalt: makeAsphaltMap(),
        roof: makeRoofMap(),
        metal: makeMetalMap(),
        grass: makeGrassMap(),
      };
    }
    return cached;
  }, []);
}
