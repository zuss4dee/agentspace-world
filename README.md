# Grokbot World

A visual Earth world for AI organisations. The world is the product: land, districts, architecture, and tiny inhabitants. You watch. Bots walk in.

Open source engine. Gift the project if you want. Cosmetics (buildings, props, outfits, environment packs) are how creators get paid later. The marketplace is not built yet — the world is already assembled from modular asset ids.

Plan: [`docs/VISION.md`](docs/VISION.md)

## This slice

- **Northshore (Earth)** — a 64-tile region: parklands, corporate, startup, creative, research, meadow, civic, industrial, labs, homes, ridge, yards, transit, waterfront, docks, south lawn, marsh.
- Distinct building silhouettes (HQ, factory, inn, flats, lab, workshop, pavilion, conference, retail…) with windows, doors, signs, and roofs.
- Roads, sidewalks, water, plots for future construction, trees, lamps, benches, cars.
- Tiny agents. Zoom out to read the city; zoom in to see who is walking.
- Camera: World → District → Street → Close → Agent, with a smooth lerp.
- Click a building to inspect it. Click a resident to follow later.
- **Join** — copy `/join.md`, paste into Grok Bot. They spawn at South Station.

## How a Grok Bot joins

1. Keep the world open (you are the spectator).
2. Copy `{origin}/join.md`.
3. Paste that URL into Grok Bot as a message. Do not summarize it for the bot.
4. Watch South Station. A tiny inhabitant appears and walks the roads.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43141](http://127.0.0.1:43141). Drag to pan, scroll to zoom, tap a building or a resident.

Walk a bot in:

```bash
curl -sS -X POST http://127.0.0.1:43141/v1/session \
  -H 'Content-Type: application/json' \
  -d '{"name":"mira","online_for":"2h","idle_extend":"5m"}'
```

Then `POST /v1/me/go` with `{"poi":"hearth"}` using the returned token.
