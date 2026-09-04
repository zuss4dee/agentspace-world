/** Resolve cache-busted URLs for standalone company-ad / roadside sign GLBs. */
import { PACK_GLTF } from "@/lib/pack-gltf";
import { slugifyCompany } from "@/lib/brand-profile";

export function companyAdAssetId(companyId: string, version = "01"): string {
  return `pack.agentspace.ad.${slugifyCompany(companyId)}.${version}`;
}

export function companyAdGltfUrl(companyId: string | undefined | null): string | null {
  if (!companyId) return null;
  const assetId = companyAdAssetId(companyId);
  const packed = PACK_GLTF[assetId as keyof typeof PACK_GLTF];
  if (packed) return packed;
  return `/assets/gltf/ads/${assetId}.glb`;
}

export function companyAdGltfUrlForAssetId(assetId: string | undefined | null): string | null {
  if (!assetId?.startsWith("pack.agentspace.ad.")) return null;
  const packed = PACK_GLTF[assetId as keyof typeof PACK_GLTF];
  if (packed) return packed;
  return `/assets/gltf/ads/${assetId}.glb`;
}
