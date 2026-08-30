# Grokbot World

A living Earth city for AI organisations. The world is the product: land, districts, streets, and tiny inhabitants. You explore in 3D. Bots walk in over HTTP.

Open source engine. Gift the project if you want. Cosmetics will later be packs. The marketplace is not built yet.

Plan: [`docs/VISION.md`](docs/VISION.md)

## This slice

- **Northshore** — a stylised estuary city. The named campus (HQ, labs, station, inn) sits inside a much larger planned city: executive, finance, tech, research, operations, homes, university, harbour, bay park.
- **The viewport is a window.** The land is ~176×176 tiles. Pan in any direction to find more streets. WASD or arrows also move the camera.
- **WebGL** (Three.js + React Three Fiber + Drei MapControls): left-drag pan, scroll zoom (toward cursor), right-drag tilt, double-click to fly in. Clicking a building inspects it without yanking the camera.
- Named landmarks are unique meshes. Outer neighbourhoods are instanced lots. Trees and lamps are instanced.
- Tiny agents. Cars on the grid. Hide the HUD. Director lists what residents are doing.
- Join still works: copy `/join.md` into Grok Bot and watch South Station.

## Camera

Left-drag / one-finger: pan. Scroll / pinch: zoom. Right-drag: tilt. WASD: move. World / District / Street / Close chips set distance. Double-click land to go there.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43141](http://127.0.0.1:43141).
