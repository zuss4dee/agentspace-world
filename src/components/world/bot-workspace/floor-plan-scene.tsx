"use client";

import { useMemo } from "react";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  floorDimensions,
  layoutWorkstations,
  type WorkspaceBot,
} from "@/lib/bot-workspace";
import { roleLabel } from "@/lib/playbooks";
import { CrewmateMarker } from "@/components/world/gl/crewmate-marker";

function TopDownCamera({ floorW, floorD }: { floorW: number; floorD: number }) {
  const zoom = Math.max(floorW, floorD) * 9;
  return (
    <OrthographicCamera makeDefault position={[0, 14, 0.001]} zoom={zoom} near={0.1} far={80} up={[0, 0, -1]} />
  );
}

function AmongUsFloor({ width, depth }: { width: number; depth: number }) {
  const tile = 1.2;
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(depth / tile);
  const tiles = useMemo(() => {
    const out: { x: number; z: number; tint: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -width / 2 + tile / 2 + c * tile;
        const z = -depth / 2 + tile / 2 + r * tile;
        out.push({ x, z, tint: (r + c) % 2 });
      }
    }
    return out;
  }, [cols, rows, width, depth]);

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[width + 0.6, depth + 0.6]} />
        <meshBasicMaterial color="#2a3140" />
      </mesh>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0.008, t.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[tile - 0.06, tile - 0.06]} />
          <meshBasicMaterial color={t.tint ? "#c9d4e3" : "#b8c5d8"} />
        </mesh>
      ))}
    </>
  );
}

function Desk({ x, z, rotation }: { x: number; z: number; rotation: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.08, 0.18]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.05, 0.62]} />
        <meshBasicMaterial color="#5a4638" />
      </mesh>
      <mesh position={[0, 0.1, -0.02]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.52, 0.34]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.28, 0.09, 0.22]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.28, 0.28]} />
        <meshBasicMaterial color="#475569" />
      </mesh>
    </group>
  );
}

function WorkspaceCrewmate({
  bot,
  station,
  selected,
  onSelect,
}: {
  bot: WorkspaceBot;
  station: { x: number; z: number; rotation: number };
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <group
      position={[station.x, 0, station.z + 0.38]}
      rotation={[0, station.rotation + Math.PI, 0]}
    >
      <CrewmateMarker
        color={bot.color}
        selected={selected}
        live={bot.live}
        name={bot.name}
        subtitle={`${roleLabel(bot.role)} · ${bot.status}`}
        scale={0.95}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(bot.id);
        }}
      />
    </group>
  );
}

export function FloorPlanScene({
  bots,
  selectedId,
  onSelect,
}: {
  bots: WorkspaceBot[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { width, depth } = floorDimensions(bots.length);
  const stations = useMemo(() => layoutWorkstations(bots), [bots]);
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const wallH = 0.18;

  return (
    <>
      <color attach="background" args={["#0f131a"]} />
      <ambientLight intensity={1} />
      <TopDownCamera floorW={width} floorD={depth} />
      <OrbitControls
        makeDefault
        enableRotate={false}
        enablePan
        enableZoom
        minZoom={Math.max(width, depth) * 5}
        maxZoom={Math.max(width, depth) * 16}
        target={[0, 0, 0]}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
      <group onClick={() => onSelect(null)}>
        <AmongUsFloor width={width} depth={depth} />
      </group>
      <mesh position={[0, wallH / 2, -depth / 2]}>
        <boxGeometry args={[width, wallH, 0.12]} />
        <meshBasicMaterial color="#1f2633" />
      </mesh>
      <mesh position={[0, wallH / 2, depth / 2]}>
        <boxGeometry args={[width, wallH, 0.12]} />
        <meshBasicMaterial color="#1f2633" />
      </mesh>
      <mesh position={[-width / 2, wallH / 2, 0]}>
        <boxGeometry args={[0.12, wallH, depth]} />
        <meshBasicMaterial color="#1f2633" />
      </mesh>
      <mesh position={[width / 2, wallH / 2, 0]}>
        <boxGeometry args={[0.12, wallH, depth]} />
        <meshBasicMaterial color="#1f2633" />
      </mesh>
      {stations.map((s) => (
        <Desk key={s.id} x={s.x} z={s.z} rotation={s.rotation} />
      ))}
      {bots.map((bot) => {
        const station = stationById.get(bot.id);
        if (!station) return null;
        return (
          <WorkspaceCrewmate
            key={bot.id}
            bot={bot}
            station={station}
            selected={selectedId === bot.id}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
}
