/** Resolve cache-busted URLs for standalone official logo GLBs. */
import { PACK_GLTF } from "@/lib/pack-gltf";

export function logoAssetIdForCompany(companyId: string, version = "01"): string {
  const slug = companyId
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `pack.agentspace.logo.${slug}.${version}`;
}

export function logoGltfUrlForCompanyId(companyId: string): string | null {
  const assetId = logoAssetIdForCompany(companyId);
  const packed = PACK_GLTF[assetId as keyof typeof PACK_GLTF];
  if (packed) return packed;
  return `/assets/gltf/logos/${assetId}.glb`;
}

export function logoGltfUrlForAssetId(assetId: string): string | null {
  if (!assetId.startsWith("pack.agentspace.logo.")) return null;
  const packed = PACK_GLTF[assetId as keyof typeof PACK_GLTF];
  if (packed) return packed;
  return `/assets/gltf/logos/${assetId}.glb`;
}
