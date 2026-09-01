# Company building generator

The Blender asset library is the authoritative source for company HQs. The
runtime only loads the resulting GLB through the existing `BuildingsLayer`.
Generated objects are tagged with `asw_assetId`, `asw_componentId`,
`asw_kind`, and `asw_runtimeExport`; interiors are never authored.

## Generate

```bash
# Fast contract tests; does not require Blender
npm run building:test

# Build into the Blender asset library without publishing
npm run building:generate -- --company stripe --preview

# Build a supplied onboarding JSON
npm run building:generate -- --company acme --spec specs/acme.json --preview
```

The built-in company ids are `stripe`, `openai`, `notion`, `figma`, `linear`,
`anthropic`, and `demo-a` through `demo-e`. Built-in entries intentionally have
no logo file: they use a clearly reported wordmark fallback until an official
asset is supplied.

An onboarding JSON may contain:

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
wordmark is used and the report marks it as a fallback; no logo is generated.

## Families

The recipe registry contains `TOWER_CAMPUS`, `STACKED_VOLUMES`,
`STEPPED_TERRACE`, `BRIDGE_COMPLEX`, `COURTYARD_BLOCK`, `PAVILION`,
`ASYMMETRIC_CAMPUS`, `SCULPTURE_HQ`, `VERTICAL_LANDMARK`, and `HYBRID`.
Recipe selection is deterministic from `sha256(companyId + ":" + assetId)` and
industry/personality only biases the weights.

`npm run blender:publish -- --asset <assetId>` remains the guarded publish
step. It exports the selected pack GLB, updates the cache-busted runtime URL,
syncs measured `building-meters.ts` and `building-asset-meta.ts`, and rebuilds
`asset-registry.ts`. It never overwrites the master world GLB.