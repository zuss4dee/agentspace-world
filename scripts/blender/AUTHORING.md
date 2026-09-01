# Agentspace authoring pipeline

STEP 1 = Planning map (complete)

STEP 1b = Environment life + materials + asset library (current)

- Do not rebuild the world. Do not move land, roads, lots, or ocean.
- Asset library lives in collection `Agentspace_Asset_Library` at (-6000, -6000, 0).
- Library and test pads are never part of the runtime world GLB.
- Zero buildings.

```
# Additive phase (keeps the existing .blend world):
blender --background scripts/blender/agentspace-world.blend --python scripts/blender/build_phase_life.py
```

Pack GLBs write to `public/assets/gltf/{characters,vehicles,street,props,environment}/`.
The habitat still loads `public/assets/gltf/agentspace-world.glb`.

## Company buildings (procedural preview)

Visual target: [docs/BUILDING_VISUAL_STYLE.md](../docs/BUILDING_VISUAL_STYLE.md) — Apple 3D Maps / premium toy-city aesthetic.

Regenerate preview pads (no publish):

```
blender --background scripts/blender/agentspace-world-multitask.blend \
  --python scripts/blender/build_test_buildings.py
```

STEP 2 = Rebuild one selected district

STEP 3 = Build one company's architecture

## Commands

```
npx --yes tsx scripts/blender/dump-world-contract.ts
```

Build the Blender scene (no GLB export):

```
# Blender MCP execute_blender_code, or:
blender --background --python scripts/blender/build_world.py
```

## Small assets (Tesla is the template)

Create or edit in Blender (`Agentspace_Asset_Library`) →
`npm run blender:publish -- --asset pack.agentspace.vehicle.car.tesla.sedan.01` →
GLB at `public/assets/gltf/vehicles/<assetId>.glb` →
same `assetId` upserted in `src/lib/pack-gltf.ts` and `src/lib/asset-registry.ts` →
R3F loads `PACK_GLTF[assetId]` (`vehicle-gltf.tsx`) → website shows Blender geometry.

Traffic, routes, and spawning stay in R3F (`src/lib/traffic.ts`). Republishing the same
assetId overwrites that GLB and registry row; it does not add a second car.

## Publish (Track B)

The website never talks to Blender. Cursor / `npm run blender:publish` talks to the
Blender MCP addon (`127.0.0.1:9876`), exports GLBs, then the Next app loads static files.

```
npm run blender:publish -- --asset pack.agentspace.vehicle.car.tesla.sedan.01
npm run blender:publish -- --asset pack.agentspace.hydrant.city.01
npm run blender:publish -- --changed
npm run blender:publish -- --world --world-name agentspace-world-published.glb
```

Never overwrites `agentspace-world.blend` or `agentspace-world.glb`.
Does not re-export the whole city unless `--world` is passed.

```
blender --background scripts/blender/agentspace-world.blend --python scripts/blender/export_world.py
```

The exporter writes `public/assets/gltf/agentspace-world.glb` and re-saves the
Blender master file. Keep any future optimization pass on a duplicate GLB; do
not decimate or overwrite the `.blend` master.
