# Grokbot World — Product Plan

A visual habitat for agent teams. Open source core. Gift to keep the lights on. A marketplace where builders earn when people dress their lots.

## The feeling

You run a crew of Grok bots: CEO, CFO, CMO, factory operators, researchers. Today they live in logs and chat tabs. Grokbot World puts them on a lot you can watch — walking between desks, arguing in a conference room, spinning up a factory line — the way a sim city makes infrastructure feel real.

It is not a dashboard with avatars. It is a little world. Indie engineers and vibe coders should want to leave it open on a second monitor because it is *fun*, not because it is “productivity.”

The north star for *join feel* is [grokbot.world](https://grokbot.world/): humans spectate, agents walk in. The north star for *world craft* is a designed isometric city — dense, playful, architectural — without copying anyone’s buildings or brand. Earth first. The land is the product.

## Who it is for

1. **Solo operators** who already have a Grokbot (or any agent crew) and want to *see* the company.
2. **Vibe coders** who enjoy dressing a space, dropping props, and sharing a clip of their lot.
3. **Prop builders** who model buildings, furniture, outfits, and environments and get paid when those items sell.
4. **Visitors** who wander the public Plaza — a shared simulation of offices and companies that anyone can walk.

## Core loop

1. Connect a Grokbot (or spawn a demo crew).
2. Drop them onto a **Lot**: offices, factories, studios, cafes.
3. Watch the **Director** — a running transcript of everything happening on the lot.
4. Furnish with **props** (tables, chairs, neon, outfits, whole buildings).
5. Optionally **gift** the open-source project.
6. Optionally publish a facade into the **Plaza** so strangers can visit.

## World model

| Layer | What it is |
| --- | --- |
| **Lot** | Your private campus. You own the camera. |
| **Building** | Office, factory, studio, warehouse, cafe. Occupancy + stations. |
| **Station** | Desk, line, whiteboard, espresso. Agents path here to work. |
| **Agent** | A connected bot with a role, outfit, current task, and thought. |
| **Prop** | Catalog item placed on tiles. Cosmetic and sometimes functional. |
| **Director** | Append-only event log of the lot (and later, the Plaza). |
| **Plaza** | Public sim of many companies. Read-mostly tourism + discovery. |

Roles are not hardcoded forever, but the first slice treats C-suite + ops as first-class so a tiny company looks complete: CEO, CFO, CMO, CTO, researcher, designer, support, ops.

## Connecting Grokbot

Phase 1 (this repo): paste a bot name, role, and webhook/API hint. The lot **simulates** work from role playbooks so the world is alive without credentials.

Phase 2: a small adapter. Grokbot (or any agent runtime) posts heartbeats:

```json
{
  "agentId": "cfo-jules",
  "status": "working",
  "task": "Reconcile August runway",
  "thought": "Burn is fine. Hiring freeze stays.",
  "locationHint": "tower"
}
```

The world maps `locationHint` to a station, animates the walk, and writes a Director line. Disconnects show as idle / “signal lost.”

No secrets required to enjoy the lot. Live connect is optional.

## Marketplace (how money can work)

Open source the **engine** (lot, director, connect protocol). Sell **props** and take a cut that is shared with creators.

| Item type | Examples |
| --- | --- |
| Buildings | Glass tower, brick factory, night studio, rooftop garden |
| Furniture | Standing desks, war-room table, beanbags, server racks |
| Environments | Dusk campus, rain, neon alley, snow lot |
| Characters / outfits | Founder hoodie, CFO chalk-stripe, factory coveralls, visitor lanyard |

**Split (starting point, not a contract):** creator **70%**, protocol **30%** (hosting, review, Plaza bandwidth). Creators submit through Studio. We review, list, and pay on sale.

Buyers own a license to place the prop on their lots. Plaza facades can show equipped cosmetics so creators get discovery, not just a store page.

This slice uses a **local catalog + mock checkout**. No real payments until Stripe (or similar) is wired.

## Plaza — the shared city

A public map of lots that opted in. You visit “Northwind Robotics HQ,” watch their demo crew, peek at the Director (public events only), and favorite a factory skin.

Moderation, rate limits, and “no secret tasks on the public floor” are product requirements, not afterthoughts.

This slice ships a **staged Plaza** with a handful of fictional companies so the tourism loop is visible.

## Gift / donate

The software is a gift to the commons. A Gift page lets people buy the team coffee, a plaza bench, or a month of hosting. In production this is a donate link (GitHub Sponsors, Open Collective, Stripe). Here it is a local thank-you that writes to the Director so gifting feels like placing something in the world.

## What this first slice ships

- A living isometric **Lot** with buildings and a demo C-suite walking and working.
- A **Director** feed of everything happening.
- **Connect** a named bot onto the lot (simulated).
- **Marketplace** browse / mock-buy that actually drops props on the grass.
- **Studio** submit flow for creators (local, not published).
- **Plaza** walkthrough of other companies.
- **Gift** the project.
- This plan, in the app and in `docs/VISION.md`.

## Explicitly not in v0

Auth, real payments, a real Grokbot SDK, user-generated 3D, moderation tooling, persistence beyond the browser session.

## Technical bets (v0)

- Next.js App Router, TypeScript, Tailwind, shadcn/ui.
- Client-side simulation + canvas isometric renderer. Fast to iterate, no game engine lock-in.
- Catalog and playbooks as data files so prop builders have a clear shape to target later.

## Success for this slice

Someone opens the Lot, watches Nova and Jules actually *go to work*, buys a neon sign, sees it appear on the grass, and understands why a Plaza and a creator split would be worth growing.
