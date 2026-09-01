"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { h } from "@/lib/coords";

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

export type CrewmateMarkerProps = {
  color: string;
  rotation?: number;
  selected?: boolean;
  live?: boolean;
  name?: string;
  subtitle?: string;
  scale?: number;
  showTag?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
};

/** Top-down Among Us-style crewmate — flat bean body, visor, backpack nub. */
export function CrewmateMarker({
  color,
  rotation = 0,
  selected = false,
  live = false,
  name,
  subtitle,
  scale = 1,
  showTag = true,
  onClick,
}: CrewmateMarkerProps) {
  const s = scale;
  const body = shade(color, live ? 0.02 : -0.04);
  const pack = shade(color, -0.14);

  return (
    <group rotation={[0, rotation, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.012), 0]} onClick={onClick}>
        <circleGeometry args={[0.34 * s, 28]} />
        <meshBasicMaterial color="#000" transparent opacity={0} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.014), 0]}>
        <circleGeometry args={[0.3 * s, 28]} />
        <meshBasicMaterial color="#0c0e12" transparent opacity={0.28} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.038), 0]} scale={[1.1 * s, 0.94 * s, 1]}>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial color="#111" />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.042), 0]} scale={[1.04 * s, 0.9 * s, 1]}>
        <circleGeometry args={[0.23, 32]} />
        <meshBasicMaterial color={body} />
      </mesh>

      <group position={[0, h(0.048), -0.075 * s]}>
        <mesh rotation-x={-Math.PI / 2} scale={[0.56 * s, 0.4 * s, 1]}>
          <circleGeometry args={[0.2, 24]} />
          <meshBasicMaterial color="#132638" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, -0.004]} scale={[0.46 * s, 0.32 * s, 1]}>
          <circleGeometry args={[0.2, 24]} />
          <meshBasicMaterial color="#8fdcff" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0.04 * s, 0, -0.006]} scale={[0.12 * s, 0.08 * s, 1]}>
          <circleGeometry args={[0.2, 12]} />
          <meshBasicMaterial color="#dff7ff" transparent opacity={0.85} />
        </mesh>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.04), 0.11 * s]} scale={[0.38 * s, 0.24 * s, 1]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color={pack} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, h(0.036), 0]}>
        <ringGeometry args={[0.27 * s, 0.31 * s, 32]} />
        <meshBasicMaterial
          color={selected ? "#ffb347" : live ? color : "#64748b"}
          transparent
          opacity={selected ? 0.9 : live ? 0.55 : 0.28}
        />
      </mesh>

      {showTag && name ? (
        <Html position={[0, h(0.55), 0]} center distanceFactor={12} occlude={false} pointerEvents="none">
          <div className="ns-nametag ns-crewmate-tag" data-live={live ? "1" : "0"}>
            <strong>{name}</strong>
            {subtitle ? <em>{subtitle}</em> : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function agentFacingRad(x: number, y: number, targetX: number, targetY: number, fallback = 0) {
  const dx = targetX - x;
  const dy = targetY - y;
  if (Math.abs(dx) + Math.abs(dy) < 0.02) return fallback;
  return Math.atan2(dx, dy);
}
