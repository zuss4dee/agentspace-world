"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { distFromScale, MAX_VIEW_DIST, MIN_VIEW_DIST, OVERVIEW_DIST, wx, wz } from "@/lib/coords";
import { cameraPanLimits } from "@/lib/world-sections";

const keys = new Set<string>();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function ExplorerCamera() {
  const { cameraFocus, cameraScale, followAgent, selectedAgentId, liveRef, interiorId, cameraTick, setFollowAgent, mapOverview, setMapOverview, topView } =
    useWorld();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const target = useRef(new THREE.Vector3(wx(28.5), 0.2, wz(8)));
  const applyDist = useRef(true);
  const lastTick = useRef(cameraTick);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const followRef = useRef(followAgent);
  followRef.current = followAgent;
  const overviewRef = useRef(mapOverview);
  overviewRef.current = mapOverview;
  const topRef = useRef(topView);
  topRef.current = topView;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keys.add(k);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      applyDist.current = false;
      if (followRef.current) setFollowAgent(false);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      const dist = camera.position.distanceTo(target.current);
      const speed = dist * 0.0024;
      if (topRef.current) {
        const panX = -dx * speed;
        const panZ = dy * speed;
        target.current.x += panX;
        target.current.z += panZ;
        camera.position.x += panX;
        camera.position.z += panZ;
        return;
      }
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
      _forward.normalize();
      _right.crossVectors(_forward, _up).normalize();
      const panX = -dx * speed;
      const panZ = dy * speed;
      _right.multiplyScalar(panX);
      _forward.multiplyScalar(panZ);
      target.current.add(_right).add(_forward);
      camera.position.add(_right).add(_forward);
    };
    const onUp = () => {
      dragging.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyDist.current = false;
      const dist = camera.position.distanceTo(target.current);
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const cap = overviewRef.current ? OVERVIEW_DIST : MAX_VIEW_DIST;
      const next = THREE.MathUtils.clamp(dist * factor, MIN_VIEW_DIST, cap);
      if (overviewRef.current && next <= MAX_VIEW_DIST + 0.4) setMapOverview(false);
      if (topRef.current) {
        const height = THREE.MathUtils.clamp(dist * factor, MIN_VIEW_DIST, cap);
        camera.position.set(target.current.x, height, target.current.z);
        return;
      }
      _dir.copy(camera.position).sub(target.current);
      if (_dir.lengthSq() < 1e-6) _dir.set(12, 14, 12);
      _dir.normalize().multiplyScalar(next);
      camera.position.copy(target.current).add(_dir);
    };
    const onContext = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
    };
  }, [camera, gl, setFollowAgent, setMapOverview]);

  useFrame((_, dt) => {
    const t = target.current;
    if (cameraTick !== lastTick.current) {
      lastTick.current = cameraTick;
      applyDist.current = true;
    }

    if (followAgent && selectedAgentId && !dragging.current) {
      const a = liveRef.current.agents.find((ag) => ag.id === selectedAgentId);
      if (a) {
        const k = Math.min(1, dt * 5);
        t.x += (wx(a.x) - t.x) * k;
        t.z += (wz(a.y) - t.z) * k;
      }
    } else if (applyDist.current && cameraFocus && !dragging.current) {
      const k = Math.min(1, dt * 4.2);
      t.x += (wx(cameraFocus.x) - t.x) * k;
      t.z += (wz(cameraFocus.y) - t.z) * k;
    }

    const pan = 48 * dt;
    if (topRef.current && !interiorId) {
      if (keys.has("w") || keys.has("arrowup")) {
        t.z -= pan;
        camera.position.z -= pan;
      }
      if (keys.has("s") || keys.has("arrowdown")) {
        t.z += pan;
        camera.position.z += pan;
      }
      if (keys.has("d") || keys.has("arrowright")) {
        t.x += pan;
        camera.position.x += pan;
      }
      if (keys.has("a") || keys.has("arrowleft")) {
        t.x -= pan;
        camera.position.x -= pan;
      }
    } else {
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
      _forward.normalize();
      _right.crossVectors(_forward, _up).normalize();
      if (keys.has("w") || keys.has("arrowup")) {
        t.addScaledVector(_forward, pan);
        camera.position.addScaledVector(_forward, pan);
      }
      if (keys.has("s") || keys.has("arrowdown")) {
        t.addScaledVector(_forward, -pan);
        camera.position.addScaledVector(_forward, -pan);
      }
      if (keys.has("d") || keys.has("arrowright")) {
        t.addScaledVector(_right, pan);
        camera.position.addScaledVector(_right, pan);
      }
      if (keys.has("a") || keys.has("arrowleft")) {
        t.addScaledVector(_right, -pan);
        camera.position.addScaledVector(_right, -pan);
      }
    }

    t.y = interiorId ? 1.15 : 0.2;

    if (!interiorId) {
      const d = camera.position.distanceTo(t);
      const lim = cameraPanLimits(d, mapOverview);
      const nx = THREE.MathUtils.clamp(t.x, lim.minX, lim.maxX);
      const nz = THREE.MathUtils.clamp(t.z, lim.minZ, lim.maxZ);
      const dx = nx - t.x;
      const dz = nz - t.z;
      t.x = nx;
      t.z = nz;
      camera.position.x += dx;
      camera.position.z += dz;
    }

    const wantH = interiorId ? 7.2 : mapOverview ? OVERVIEW_DIST : distFromScale(cameraScale);

    if (topRef.current && !interiorId) {
      camera.up.set(0, 0, -1);
      const k = dragging.current ? 1 : Math.min(1, dt * 8);
      camera.position.x += (t.x - camera.position.x) * k;
      camera.position.z += (t.z - camera.position.z) * k;
      const yWant = t.y + wantH;
      camera.position.y += (yWant - camera.position.y) * k;
      const cap = mapOverview ? OVERVIEW_DIST : MAX_VIEW_DIST;
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, t.y + MIN_VIEW_DIST, t.y + cap);
    } else {
      camera.up.set(0, 1, 0);
      if ((applyDist.current || interiorId) && !dragging.current) {
        const current = camera.position.distanceTo(t);
        const next = current + (wantH - current) * Math.min(1, dt * 3.2);
        _dir.copy(camera.position).sub(t);
        if (_dir.lengthSq() < 0.001 || Math.abs(_dir.x) + Math.abs(_dir.z) < 0.35) {
          _dir.set(12, 14, 12);
        }
        _dir.normalize().multiplyScalar(next);
        camera.position.copy(t).add(_dir);
        if (!interiorId && Math.abs(wantH - next) < 0.35) applyDist.current = false;
      }

      if (!interiorId) {
        const cap = mapOverview ? OVERVIEW_DIST : MAX_VIEW_DIST;
        const d = camera.position.distanceTo(t);
        const capped = THREE.MathUtils.clamp(d, MIN_VIEW_DIST, cap);
        if (Math.abs(capped - d) > 0.04) {
          _dir.copy(camera.position).sub(t);
          if (_dir.lengthSq() < 0.001) _dir.set(12, 14, 12);
          _dir.normalize().multiplyScalar(capped);
          camera.position.copy(t).add(_dir);
        }
      }
    }

    const fog = scene.fog;
    if (fog instanceof THREE.Fog) {
      if (mapOverview || (topRef.current && !interiorId)) {
        fog.near = 34;
        fog.far = 108;
      } else {
        fog.near = 16;
        fog.far = 38;
      }
    }

    camera.lookAt(t);
  });

  return null;
}
