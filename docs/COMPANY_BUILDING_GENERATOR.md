# Company building generator

The Blender asset library is the authoritative source for company HQs. The
runtime only loads the resulting GLB through the existing `BuildingsLayer`.
Generated objects are tagged with `asw_assetId`, `asw_componentId`,
`asw_kind`, and `asw_runtimeExport`; interiors are never authored.

## Pipeline (plot → envelope → grammar → brand)

1. **Plot envelope** — `resolve_envelope()` maps lot tier + grid → footprint bounds
2. **Grammar selection** — deterministic from `sha256(companyId + assetId + plotId + attemptN)` with industry/personality weight bias
3. **Procedural recipe** — one of 10 grammars (`tower_campus`, `hybrid`, …); never pick a finished building and recolour
4. **Uniqueness** — structural fingerprint registered in `scripts/blender/data/structural-registry.json`; near-duplicates rejected (up to 12 retries)
5. **Brand materials** — colours applied after structure via `derive_mat_defs()`
6. **Composition** — library sculptures + secondary logo anchors (`facade`, `entrance`, `roof`)
7. **Publish** — explicit GLB export + TS registry sync

Echt (`pack.agentspace.building.echt.02`) remains the frozen regression reference (`preset: echt_v1`).

## Generate building

```bash
# Fast contract tests; does not require Blender
npm run building:test

# Build into the Blender asset library without publishing
npm run building:generate -- --company stripe --preview

# Build + export GLB + sync measured meters
npm run building:generate -- --company stripe --publish

# Build from onboarding JSON
npm run building:generate -- --company acme --spec specs/acme.json --preview

# Procedural test batch (12 industry-diverse brands, library only)
python3 scripts/blender/build_procedural_test_batch.py --export
```

Built-in company ids: `stripe`, `openai`, `notion`, `figma`, `linear`,
`anthropic`, and `demo-a` through `demo-e`. Supply an official logo via
`public/assets/brands/{id}/logo.svg` (see **Logo ingest** below) or the
generator uses an explicit wordmark fallback.

## Logo ingest

Official assets only — no scraping, no AI logos.

```bash
# Persist logo + manifest (human-selected official asset)
npm run brand:resolve -- --company echt --logo ./path/to/logo.svg \
  --source-url https://example.com/brand/logo.svg

# Export standalone 3D logo GLB (SVG curves preferred)
npm run logo:build -- --company echt --publish
```

Output: `public/assets/gltf/logos/pack.agentspace.logo.{companyId}.01.glb`

Logos on buildings use named anchors: `facade.logo_anchor`, `entrance.logo_anchor`,
`roof.logo_anchor`. The composition pass adds secondary placements when an official
asset is supplied.

## Publish building

```bash
# Live Blender MCP session (claim → build → publish)
npm run blender:build-company -- --brand scripts/blender/brands/nova.json

# Export an existing library root + sync runtime registries
npm run blender:publish -- --asset pack.agentspace.building.echt.02
```

Publish updates `pack-gltf.ts`, `building-meters.ts`, `building-asset-meta.ts`,
and `asset-registry.ts`. It never overwrites the master world GLB.

## Animated landmarks (runtime)

Every occupied company plot gets an outdoor R3F `AnimatedBrandMarker` beside the
building shell. Placement is plot-aware (frontage bias + building footprint).
Owners may override pose via the logo placement editor (`logoPose` on profile).

Click landmark or building hit proxy → `CompanyProfileCard` / `BusinessAdView`.

## Onboarding JSON

```json
{
  "companyId": "acme",
  "companyName": "Acme",
  "website": "https://acme.example",
  "industry": "technology",
  "personality": ["precise", "playful"],
  "brandColours": ["#2563EB", "#F97316"],
  "logo": {
    "wordmark": "ACME",
    "assetPath": "public/assets/brands/acme/logo.svg",
    "sourceUrl": "https://acme.example/brand/logo.svg",
    "fetchedAt": "2026-09-01T00:00:00Z"
  },
  "building": {
    "recipe": "auto",
    "plotGrid": { "x": 0, "y": 0, "w": 6, "h": 5 },
    "detailDensity": "HIGH"
  }
}
```

Only explicitly supplied SVG/PNG/JPG files are accepted as official logos.
The generator records SHA-256, format, aspect ratio, source URL, and fetch
time in a sidecar `manifest.json`. If the asset is missing or invalid, the
wordmark is used and the report marks it as a fallback; no logo is invented.

## Families

The recipe registry contains `TOWER_CAMPUS`, `STACKED_VOLUMES`,
`STEPPED_TERRACE`, `BRIDGE_COMPLEX`, `COURTYARD_BLOCK`, `PAVILION`,
`ASYMMETRIC_CAMPUS`, `SCULPTURE_HQ`, `VERTICAL_LANDMARK`, and `HYBRID`.
Recipe selection is deterministic from `sha256(companyId + assetId + plotId)`
and industry/personality only biases the weights.

## Validation

Generation fails (does not publish) when:

- Footprint exceeds plot envelope or max height
- Duplicate component IDs
- Interior geometry tagged on building assets
- Official logo supplied but no logo anchors/meshes placed
- Invalid `pack.agentspace.building.*` asset id

Structural uniqueness is enforced separately via `structural-registry.json`.
