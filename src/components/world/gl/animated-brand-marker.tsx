"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { h } from "@/lib/coords";
import {
  BRAND_MARKER_BASE_ASSET_ID,
  METERS_TO_PX,
  type BrandMarkerConfig,
  type BrandMarkerVariant,
} from "@/lib/brand-marker";
import { logoGltfUrlForCompanyId } from "@/lib/logo-gltf";
import { companyAdGltfUrl, companyAdGltfUrlForAssetId } from "@/lib/company-ad";
import { PACK_GLTF } from "@/lib/pack-gltf";

function hexColor(hex: string, fallback = "#6a8a4a") {
  const c = new THREE.Color(hex || fallback);
  return c;
}

function useLogoTexture(url: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!url) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let cancelled = false;
    loader.load(
      url,
      (t) => {
        if (cancelled) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        const img = t.image as HTMLImageElement | undefined;
        if (img?.width && img?.height) setAspect(img.width / img.height);
        setTex(t);
      },
      undefined,
      () => {
        if (!cancelled) setTex(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { tex, aspect };
}

type MarkerAnimProps = {
  variant: BrandMarkerVariant;
  primary: THREE.Color;
  accent: THREE.Color;
  hovered: boolean;
  logoAspect: number;
  logoTex: THREE.Texture | null;
  markerScale: number;
};

function LogoPlane({
  aspect,
  tex,
  emissiveIntensity,
  size = 1,
}: {
  aspect: number;
  tex: THREE.Texture | null;
  emissiveIntensity: number;
  size?: number;
}) {
  const maxW = h(1.35 * size);
  const maxH = h(0.98 * size);
  let w = maxW;
  let hh = maxH;
  if (aspect >= 1) hh = w / aspect;
  else w = hh * aspect;
  return (
    <mesh castShadow>
      <planeGeometry args={[w, hh]} />
      <meshStandardMaterial
        map={tex ?? undefined}
        color={tex ? "#ffffff" : "#e8eee4"}
        emissive={tex ? "#ffffff" : "#6a8a4a"}
        emissiveIntensity={tex ? emissiveIntensity * 0.28 : emissiveIntensity * 0.45}
        roughness={0.38}
        metalness={0.04}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ProceduralMarkerBody({
  variant,
  primary,
  accent,
  hovered,
  logoAspect,
  logoTex,
  markerScale,
}: MarkerAnimProps) {
  const root = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const logo = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.5 + Math.sin(t * 1.6) * 0.5;
    const hoverBoost = hovered ? 1.18 : 1;
    if (glow.current) glow.current.emissiveIntensity = (0.25 + pulse * 0.35) * hoverBoost;
    if (logo.current) {
      const bob = Math.sin(t * 1.2) * h(0.04);
      logo.current.position.y = logoBaseY(variant) + bob * (variant === "floating_logo" ? 2.2 : 0.35);
      if (variant === "floating_logo") logo.current.rotation.y = Math.sin(t * 0.45) * 0.12;
      if (variant === "rotating_sculpture") logo.current.rotation.y = t * 0.35;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.55;
      ring.current.rotation.x = Math.sin(t * 0.7) * 0.25 + 0.4;
    }
    if (orbit.current) orbit.current.rotation.y = t * 0.9;
    if (root.current && variant === "vertical_monument") {
      root.current.rotation.z = Math.sin(t * 0.55) * 0.018;
    }
    if (root.current && hovered) {
      const s = 1 + Math.sin(t * 3.2) * 0.012;
      root.current.scale.setScalar(s);
    } else if (root.current) {
      root.current.scale.setScalar(1);
    }
  });

  const emissiveIntensity = hovered ? 1.05 : 0.72;
  const s = markerScale;

  return (
    <group ref={root} scale={[s, s, s]}>
      {/* Pedestal / base */}
      {(variant === "logo_pedestal" ||
        variant === "vertical_monument" ||
        variant === "illuminated_sign" ||
        variant === "stacked_sculpture") && (
        <mesh position={[0, h(0.12), 0]} castShadow receiveShadow>
          <cylinderGeometry args={[h(0.38), h(0.44), h(0.24), 20]} />
          <meshStandardMaterial color={primary} roughness={0.62} metalness={0.08} />
        </mesh>
      )}

      {variant === "stacked_sculpture" && (
        <>
          <mesh position={[0, h(0.38), 0]} castShadow>
            <boxGeometry args={[h(0.34), h(0.22), h(0.34)]} />
            <meshStandardMaterial color={accent} roughness={0.5} />
          </mesh>
          <mesh position={[0, h(0.56), 0]} castShadow>
            <boxGeometry args={[h(0.26), h(0.16), h(0.26)]} />
            <meshStandardMaterial color={primary} roughness={0.55} />
          </mesh>
        </>
      )}

      {variant === "vertical_monument" && (
        <mesh position={[0, h(0.62), 0]} castShadow>
          <boxGeometry args={[h(0.18), h(1.05), h(0.18)]} />
          <meshStandardMaterial color={primary} roughness={0.58} />
        </mesh>
      )}

      {variant === "illuminated_sign" && (
        <>
          <mesh position={[0, h(0.62), 0]} castShadow>
            <boxGeometry args={[h(0.92), h(0.68), h(0.12)]} />
            <meshStandardMaterial color="#0f1211" roughness={0.55} metalness={0.12} />
          </mesh>
          <mesh position={[0, h(0.62), h(0.04)]} castShadow>
            <boxGeometry args={[h(0.82), h(0.58), h(0.1)]} />
            <meshStandardMaterial
              ref={glow}
              color={accent}
              emissive={accent}
              emissiveIntensity={emissiveIntensity}
              roughness={0.32}
            />
          </mesh>
        </>
      )}

      {variant === "rotating_sculpture" && (
        <mesh position={[0, h(0.14), 0]} castShadow receiveShadow>
          <cylinderGeometry args={[h(0.5), h(0.55), h(0.12), 24]} />
          <meshStandardMaterial color={primary} roughness={0.65} />
        </mesh>
      )}

      {(variant === "orbiting_logo" || variant === "floating_logo") && (
        <mesh position={[0, h(0.08), 0]} receiveShadow>
          <cylinderGeometry args={[h(0.08), h(0.08), h(0.02), 16]} />
          <meshStandardMaterial color="#3a3f38" roughness={0.8} />
        </mesh>
      )}

      {/* Orbiting ring */}
      {(variant === "orbiting_logo" || variant === "rotating_sculpture") && (
        <group ref={orbit} position={[0, h(0.55), 0]}>
          <mesh ref={ring}>
            <torusGeometry args={[h(0.42), h(0.025), 10, 32]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} roughness={0.35} />
          </mesh>
        </group>
      )}

      {/* Logo */}
      <group ref={logo} position={[0, logoBaseY(variant), variant === "illuminated_sign" ? h(0.02) : 0]}>
        <LogoPlane aspect={logoAspect} tex={logoTex} emissiveIntensity={emissiveIntensity} size={1.08} />
      </group>

      {/* Ground emissive ring */}
      <mesh position={[0, h(0.02), 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[h(0.38), h(0.48), 32]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.28 + (hovered ? 0.42 : 0.18)}
          transparent
          opacity={0.78}
        />
      </mesh>
    </group>
  );
}

function logoBaseY(variant: BrandMarkerVariant) {
  switch (variant) {
    case "floating_logo":
      return h(1.12);
    case "vertical_monument":
      return h(1.38);
    case "illuminated_sign":
      return h(0.72);
    case "stacked_sculpture":
      return h(0.82);
    case "orbiting_logo":
      return h(0.82);
    default:
      return h(0.56);
  }
}

function GltfMarkerBody({
  variant,
  primary,
  accent,
  hovered,
  logoAspect,
  logoTex,
  markerScale,
}: MarkerAnimProps) {
  const url = PACK_GLTF[BRAND_MARKER_BASE_ASSET_ID as keyof typeof PACK_GLTF];
  const { scene } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const logoAnchor = useRef<THREE.Object3D | null>(null);
  const ringAnchor = useRef<THREE.Object3D | null>(null);

  const gltfClone = useMemo(() => {
    let logoAnchorObj: THREE.Object3D | null = null;
    let ringAnchorObj: THREE.Object3D | null = null;
    const c = scene.clone(true);
    c.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const n = obj.name.toLowerCase();
      if (n.includes("logo") && n.includes("anchor")) logoAnchorObj = obj;
      if (n.includes("ring") && n.includes("anchor")) ringAnchorObj = obj;
      if (n.includes("base") || n.includes("pedestal")) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = mats.map((m) => {
          const copy = m.clone() as THREE.MeshStandardMaterial;
          copy.color.copy(primary);
          return copy;
        });
        if (!Array.isArray(mesh.material)) mesh.material = (mesh.material as THREE.Material[])[0]!;
      }
      if (n.includes("accent") || n.includes("emit")) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = mats.map((m) => {
          const copy = m.clone() as THREE.MeshStandardMaterial;
          copy.color.copy(accent);
          copy.emissive.copy(accent);
          copy.emissiveIntensity = 0.4;
          return copy;
        });
        if (!Array.isArray(mesh.material)) mesh.material = (mesh.material as THREE.Material[])[0]!;
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    if (!box.isEmpty()) {
      c.position.y -= box.min.y;
    }
    return { mesh: c, logoAnchor: logoAnchorObj, ringAnchor: ringAnchorObj };
  }, [scene, primary, accent]);

  useEffect(() => {
    logoAnchor.current = gltfClone.logoAnchor;
    ringAnchor.current = gltfClone.ringAnchor;
  }, [gltfClone]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.5 + Math.sin(t * 1.6) * 0.5;
    const logo = logoAnchor.current;
    const ring = ringAnchor.current;
    if (logo) {
      logo.position.y = Math.sin(t * 1.2) * h(0.035) * (variant === "floating_logo" ? 2 : 1);
      if (variant === "rotating_sculpture") logo.rotation.y = t * 0.35;
    }
    if (ring) {
      ring.rotation.z = t * 0.55;
    }
    if (root.current && hovered) {
      root.current.scale.setScalar(1 + Math.sin(t * 3.2) * 0.012);
    }
    gltfClone.mesh.traverse((obj: THREE.Object3D) => {
      if (!obj.name.toLowerCase().includes("emit")) return;
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat?.emissive) mat.emissiveIntensity = (0.2 + pulse * 0.3) * (hovered ? 1.2 : 1);
    });
  });

  return (
    <group ref={root} scale={[METERS_TO_PX * markerScale, METERS_TO_PX * markerScale, METERS_TO_PX * markerScale]}>
      <primitive object={gltfClone.mesh} />
      <group position={[0, 0.55, 0]}>
        <LogoPlane aspect={logoAspect} tex={logoTex} emissiveIntensity={hovered ? 0.95 : 0.62} size={1.08} />
      </group>
    </group>
  );
}

function LogoGltfMesh({ companyId, size = 1 }: { companyId: string; size?: number }) {
  const url = logoGltfUrlForCompanyId(companyId);
  if (!url) return null;
  return <LogoGltfMeshInner url={url} size={size} />;
}

function LogoGltfMeshInner({ url, size }: { url: string; size: number }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      c.position.sub(center);
      const maxDim = Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, 0.001);
      const target = h(0.95 * size);
      c.scale.setScalar(target / maxDim);
    }
    return c;
  }, [scene, size]);
  return <primitive object={clone} />;
}

function findNamed(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found) return;
    if (obj.name === name || obj.name.endsWith(name)) found = obj;
  });
  return found;
}

function CompanyAdGltfBody({
  url,
  hovered,
  markerScale,
}: {
  url: string;
  hovered: boolean;
  markerScale: number;
}) {
  const { scene } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    if (!box.isEmpty()) c.position.y -= box.min.y;
    return c;
  }, [scene]);

  const adRoot = useRef<THREE.Object3D | null>(null);
  const logo = useRef<THREE.Object3D | null>(null);
  const glow = useRef<THREE.Object3D | null>(null);
  const accent = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    adRoot.current = findNamed(clone, "CompanyAdRoot");
    logo.current = findNamed(clone, "CompanyLogo");
    glow.current = findNamed(clone, "CompanyAdGlow");
    accent.current = findNamed(clone, "CompanyAdAccent");
  }, [clone]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.5 + Math.sin(t * 1.35) * 0.5;
    if (adRoot.current) adRoot.current.position.y = Math.sin(t * 1.05) * h(0.028);
    if (logo.current) logo.current.position.y = Math.sin(t * 1.05) * h(0.012);
    if (accent.current) accent.current.rotation.z = t * 0.28;
    if (glow.current) {
      glow.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if (std.emissive) std.emissiveIntensity = (0.32 + pulse * 0.38) * (hovered ? 1.25 : 1);
        }
      });
    }
    if (root.current) root.current.scale.setScalar(hovered ? 1 + Math.sin(t * 3.2) * 0.01 : 1);
  });

  return (
    <group ref={root} scale={[METERS_TO_PX * markerScale, METERS_TO_PX * markerScale, METERS_TO_PX * markerScale]}>
      <primitive object={clone} />
    </group>
  );
}

function CompanyAdOrFallback(props: MarkerAnimProps & { adUrl: string | null; fallback: ReactNode }) {
  const [available, setAvailable] = useState<boolean | null>(props.adUrl ? null : false);
  useEffect(() => {
    if (!props.adUrl) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    fetch(props.adUrl, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setAvailable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.adUrl]);
  if (!props.adUrl || available === false) return <>{props.fallback}</>;
  if (available === null) return <>{props.fallback}</>;
  return (
    <Suspense fallback={props.fallback}>
      <CompanyAdGltfBody url={props.adUrl} hovered={props.hovered} markerScale={props.markerScale} />
    </Suspense>
  );
}

function MarkerVisual(props: MarkerAnimProps & { companyId: string; logoGltfUrl: string | null; adUrl: string | null }) {
  const hasGlb = BRAND_MARKER_BASE_ASSET_ID in PACK_GLTF;
  const useLogoGltf = Boolean(props.logoGltfUrl);
  const fallback = hasGlb ? (
    <Suspense fallback={<ProceduralMarkerBody {...props} />}>
      <GltfMarkerBody {...props} />
      {useLogoGltf ? (
        <Suspense fallback={null}>
          <group position={[0, logoBaseY(props.variant), 0]}>
            <LogoGltfMesh companyId={props.companyId} size={1.08} />
          </group>
        </Suspense>
      ) : null}
    </Suspense>
  ) : (
    <ProceduralMarkerBody {...props} />
  );
  return <CompanyAdOrFallback {...props} adUrl={props.adUrl} fallback={fallback} />;
}

export type AnimatedBrandMarkerProps = {
  config: BrandMarkerConfig;
  onSelect: (targetId: string) => void;
  /** When false, the marker is visual-only (no click/hover hit volume). */
  interactive?: boolean;
};

export function AnimatedBrandMarker({ config, onSelect, interactive = true }: AnimatedBrandMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const primary = useMemo(() => hexColor(config.colours[0] ?? "#6a8a4a"), [config.colours]);
  const accent = useMemo(() => hexColor(config.colours[1] ?? config.colours[0] ?? "#c8cfc2"), [config.colours]);
  const { tex, aspect } = useLogoTexture(config.logoUrl ?? "");
  const logoGltfUrl = logoGltfUrlForCompanyId(config.companyId);
  const adUrl = companyAdGltfUrlForAssetId(config.companyAdAssetId) ?? companyAdGltfUrl(config.companyId);
  const { placement } = config;
  const markerScale = config.scale ?? 1;

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(config.targetId);
    },
    [config.targetId, onSelect],
  );

  return (
    <group
      position={[placement.x, placement.y, placement.z]}
      rotation={[0, placement.rotationY, 0]}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setHovered(false);
              document.body.style.cursor = "";
            }
          : undefined
      }
      onClick={interactive ? onClick : undefined}
    >
      <MarkerVisual
        variant={config.variant}
        primary={primary}
        accent={accent}
        hovered={hovered}
        logoAspect={aspect}
        logoTex={tex}
        markerScale={markerScale}
        companyId={config.companyId}
        logoGltfUrl={logoGltfUrl}
        adUrl={adUrl}
      />
      {/* Invisible hit volume — generous for street-level clicks */}
      {interactive ? (
        <mesh position={[0, h(0.72 * markerScale), 0]}>
          <boxGeometry args={[h(1.65 * markerScale), h(1.85 * markerScale), h(1.65 * markerScale)]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {hovered ? (
        <pointLight position={[0, h(0.9 * markerScale), h(0.35 * markerScale)]} intensity={0.85} distance={h(3.2 * markerScale)} color={accent.getHexString()} />
      ) : null}
    </group>
  );
}

if (BRAND_MARKER_BASE_ASSET_ID in PACK_GLTF) {
  useGLTF.preload(String(PACK_GLTF[BRAND_MARKER_BASE_ASSET_ID as keyof typeof PACK_GLTF]));
}
