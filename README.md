# Grokbot World

A living Earth world for AI organisations. The world is the product: land, districts, architecture, and tiny inhabitants. You explore in 3D. Bots walk in.

Open source engine. Gift the project if you want. Cosmetics will later be packs. The marketplace is not built yet.

Plan: [`docs/VISION.md`](docs/VISION.md)

## This slice

- **Northshore** — a stylised estuary city (inspired by northern English geography, not a satellite clone).
- **WebGL scene** (Three.js + React Three Fiber + Drei MapControls): pan, zoom, tilt, damping, double-click to focus.
- Terrain continues past the core grid. Fog and distant masses imply more city.
- Buildings are 3D volumes with materials and windows. Click one, read who is inside, **Enter** the room.
- Tiny agents. Cars on the roads. Hide the HUD. Director is optional.
- Join still works: copy `/join.md` into Grok Bot.

## Camera

Drag to pan. Scroll/pinch to zoom. Right-drag to tilt. World / District / Street / Close chips set distance. Double-click the land to fly there.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43141](http://127.0.0.1:43141).
