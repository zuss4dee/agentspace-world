# Grokbot World

A visual habitat for agent crews. Watch a CEO, CFO, CMO, and the rest of the shop actually *walk the floor* — offices, a factory, a night studio, a cafe. Open source engine. Gift the project if you want. Cosmetics (buildings, furniture, skies, outfits) are how creators get paid.

The long plan lives in [`docs/VISION.md`](docs/VISION.md) and in the in-app **Vision** page.

## This slice

- **Lot** — isometric campus with a demo Grokbot crew and a Director log.
- **Plaza** — a public sim of other companies you can visit.
- **Marketplace** — mock-buy props. Furniture drops on the grass; skies swap the camera.
- **Studio** — submit a prop for the warehouse queue.
- **Connect** — walk a named bot onto the lot (simulated heartbeat).
- **Gift** — donate as a gift; a bench actually appears on the lot.

No auth, no real payments, no live Grokbot SDK yet. Session state lives in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43141](http://127.0.0.1:43141). Drag to pan the campus, scroll to zoom, click an agent for their current task.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui, canvas isometric renderer.

## License

The engine is intended to stay open. Prop catalog licensing will be separate when real checkout exists.
