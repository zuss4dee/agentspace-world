# Building visual style — Apple 3D Maps / premium toy-city

Procedural company buildings in the Blender asset library must read like **Apple Maps Detailed City Experience** at night: simplified iconic silhouettes, matte surfaces, and bold emissive lighting — not archviz photorealism.

Visual target references live in the repo conversation assets (Liberty Island, Empire State, Marina Bay Sands). Generator entry point: `scripts/blender/build_test_buildings.py`.

## Geometry language

| Principle | Do | Avoid |
|-----------|----|-------|
| Silhouette | Tiered setbacks, curved wishbone legs, sky bridges, spires, offset caps | Single rectangular extruded boxes |
| Massing | 2–4 connected volumes with visible hierarchy (podium → tower → crown) | Flat façades with no depth |
| Edges | Soft bevels (0.2–0.4 m), chunky readable forms | Razor-sharp CAD corners, micro-detail |
| Façade depth | Vertical fin/groove accents, recessed niches, projecting bays | Flat curtain walls with tiny mullions |
| Site | Matte teal ground, blob trees (sphere canopy + stick trunk), simple pavers | Photoreal grass, individual leaf meshes |

**Recipe families** (`building_recipes_procedural.py`): bridge_complex, tower_campus, stepped_terrace, courtyard_block, pavilion, stacked_volumes, asymmetric_campus — each must produce a **recognizable toy landmark**, not a generic office block.

## Materials

- **Matte body**: dark navy / blue-grey, roughness 0.55–0.75, minimal albedo variation (≤ 0.02).
- **Tower body**: pale blue-grey (Marina Bay / Empire State tower tone).
- **No image textures** on building shells — solid PBR albedo + roughness only.
- **Emissive glow bands**: horizontal warm yellow/white strips at tier crowns and roof edges — **not** per-window grids.
- **Glow slots / squares**: large warm emissive rectangles scattered on façades (night activity read).
- **Uplight accent**: soft purple emissive in tower clefts and recessed vertical channels.
- **Glass mat slot**: use for emissive window slots; keep transmission low in export.

Night-mode friendly: bodies stay dark; lighting comes from emissive geometry.

## Color palette (night diorama)

| Role | Approx RGB | Notes |
|------|------------|-------|
| Body / charcoal | `(0.14, 0.16, 0.22)` | Main mass, surrounding city blocks |
| Tower pale | `(0.52, 0.58, 0.68)` | Featured tower faces |
| Warm stone | `(0.72, 0.58, 0.48)` | Pedestals, secondary masses |
| Glow band | `(1.0, 0.94, 0.78)` emit ~5 | Horizontal crown lighting |
| Glow slot | `(1.0, 0.82, 0.48)` emit ~4 | Window slots / scattered squares |
| Uplight purple | `(0.48, 0.32, 0.72)` emit ~0.35 | Cleft / groove accent |
| Land teal | `(0.16, 0.36, 0.38)` | Site grass / plaza surround |
| Blob tree | `(0.12, 0.32, 0.28)` | Rounded canopy blobs |

Brand tints may shift hue; keep value contrast and emissive hierarchy.

## Lighting feel

- Design for **night viewing**: emissive elements carry the read.
- Horizontal bands at setback transitions (Empire State crown pattern).
- Vertical groove/fin rhythm on tall faces.
- Optional purple uplight in split-tower clefts (Marina Bay Sands).
- Torch / spire / beacon emissive caps on landmarks.

## Silhouette rules

1. Every building needs **one hero read** at city scale (spire, bridge, stepped crown, cantilever shelf, or pod stack).
2. Height variation within a campus: tallest mass ≤ 2× shortest wing.
3. Setbacks every 3–6 floors on towers (procedural tiers).
4. Roof caps: slab + lip, wedge, dome, or spire — never flat untrimmed boxes on landmarks.

## What to avoid

- Photoreal materials, brick/concrete photo textures, weathering noise
- Tiny repetitive window grids (use glow bands + scattered slots)
- Logos or AI-generated brand marks (wordmark block letters only; official logo textures are Phase 2)
- Box-only massing with no setbacks, bridges, or caps
- Modifying frozen Echt (`pack.agentspace.building.echt.02`, preset `echt_v1`)
- Adding preview buildings to `WORLD_BUILDINGS` or publishing without review

## Inspection

```bash
blender --background scripts/blender/agentspace-world-multitask.blend \
  --python scripts/blender/build_test_buildings.py
```

Open `agentspace-world-multitask.blend` → collection `Agentspace_Asset_Library` → `Buildings`. Preview pads: row Y=24 and Y=110 (Echt stays at X=180, Y=24). Use Material Preview or Rendered shading with dark world background to judge night read.
