"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { distFromScale, h, MAX_VIEW_DIST, MIN_VIEW_DIST, OVERVIEW_DIST, TILE, ZOOM_IN, ZOOM_OUT, wx, wz } from "@/lib/coords";
import { cameraPanLimits } from "@/lib/world-sections";

const keys = new Set<string>();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _sph = new THREE.Spherical();
const GROUND_Y = h(0.62);

function maxOrbitPhi(radius: number, targetY: number, minY: number) {
  const cos = THREE.MathUtils.clamp((minY - targetY) / Math.max(radius, h(0.25)), -0.999, 0.999);
  return Math.min(Math.PI / 2 - 0.05, Math.acos(cos));
}

function orbitCamera(camera: THREE.Camera, target: THREE.Vector3, dx: number, dy: number, minY = GROUND_Y) {
  _dir.copy(camera.position).sub(target);
  if (_dir.lengthSq() < 0.001) _dir.set(h(0.4), h(12), h(0.4));
  _sph.setFromVector3(_dir);
  _sph.theta -= dx;
  const ceiling = maxOrbitPhi(_sph.radius, target.y, minY);
  _sph.phi = THREE.MathUtils.clamp(_sph.phi + dy, 0.08, ceiling);
  _sph.makeSafe();
  camera.position.copy(target).add(_dir.setFromSpherical(_sph));
  if (camera.position.y < minY) camera.position.y = minY;
  camera.up.set(0, 1, 0);
}

function keepAboveGround(camera: THREE.Camera, minY: number) {
  if (camera.position.y < minY) camera.position.y = minY;
}

export function ExplorerCamera() {
  const {
    cameraFocus,
    cameraScale,
    followAgent,
    selectedAgentId,
    liveRef,
    interiorId,
    cameraTick,
    setFollowAgent,
    mapOverview,
    setMapOverview,
    topView,
    setTopView,
    zoomPulse,
  } = useWorld();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const target = useRef(new THREE.Vector3(wx(28.5), h(0.2), wz(8)));
  const applyDist = useRef(true);
  const lastTick = useRef(cameraTick);
  const dragging = useRef(false);
  const orbiting = useRef(false);
  const shiftHeld = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const followRef = useRef(followAgent);
  followRef.current = followAgent;
  const overviewRef = useRef(mapOverview);
  overviewRef.current = mapOverview;
  const topRef = useRef(topView);
  topRef.current = topView;
  const wasTop = useRef(false);
  const lastZoom = useRef(0);

  const dolly = (factor: number) => {
    applyDist.current = false;
    const dist = camera.position.distanceTo(target.current);
    const cap = overviewRef.current ? OVERVIEW_DIST : MAX_VIEW_DIST;
    const next = THREE.MathUtils.clamp(dist * factor, MIN_VIEW_DIST, cap);
    if (overviewRef.current && next <= MAX_VIEW_DIST + h(0.4)) setMapOverview(false);
    if (topRef.current && !orbiting.current) {
      const height = THREE.MathUtils.clamp(dist * factor, MIN_VIEW_DIST, cap);
      camera.position.set(target.current.x, height, target.current.z);
      return;
    }
    _dir.copy(camera.position).sub(target.current);
    if (_dir.lengthSq() < 1e-6) _dir.set(h(12), h(14), h(12));
    _dir.normalize().multiplyScalar(next);
    camera.position.copy(target.current).add(_dir);
    keepAboveGround(camera, GROUND_Y);
  };
  const dollyRef = useRef(dolly);
  dollyRef.current = dolly;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeld.current = true;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keys.add(k);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        shiftHeld.current = false;
        if (!dragging.current) orbiting.current = false;
      }
      keys.delete(e.key.toLowerCase());
    };
    const blur = () => {
      shiftHeld.current = false;
      keys.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const beginOrbit = () => {
      orbiting.current = true;
      applyDist.current = false;
      if (topRef.current) {
        wasTop.current = false;
        setTopView(false);
        const t = target.current;
        if (Math.abs(camera.position.x - t.x) + Math.abs(camera.position.z - t.z) < h(0.35)) {
          camera.position.x = t.x + h(0.45);
          camera.position.z = t.z + h(0.45);
        }
        camera.up.set(0, 1, 0);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      applyDist.current = false;
      if (followRef.current) setFollowAgent(false);
      if (e.shiftKey) beginOrbit();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      if (e.shiftKey || orbiting.current) {
        if (!orbiting.current) beginOrbit();
        orbitCamera(camera, target.current, dx * 0.0055, dy * 0.0042);
        return;
      }
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
      orbiting.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dollyRef.current(e.deltaY > 0 ? ZOOM_OUT : ZOOM_IN);
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
  }, [camera, gl, setFollowAgent, setMapOverview, setTopView]);

  useFrame((_, dt) => {
    const t = target.current;
    if (zoomPulse.id !== lastZoom.current) {
      lastZoom.current = zoomPulse.id;
      if (zoomPulse.id > 0) dolly(zoomPulse.inward ? ZOOM_IN : ZOOM_OUT);
    }

    if (cameraTick !== lastTick.current) {
      lastTick.current = cameraTick;
      applyDist.current = true;
      orbiting.current = false;
    }

    if (followAgent && selectedAgentId && !dragging.current) {
      const a = liveRef.current.agents.find((ag) => ag.id === selectedAgentId);
      if (a) {
        const k = Math.min(1, dt * 5);
        t.x += (wx(a.x) - t.x) * k;
        t.z += (wz(a.y) - t.z) * k;
      }
    } else if (applyDist.current && cameraFocus && !dragging.current && !orbiting.current) {
      const k = Math.min(1, dt * 4.2);
      t.x += (wx(cameraFocus.x) - t.x) * k;
      t.z += (wz(cameraFocus.y) - t.z) * k;
    }

    const turn = 1.55 * dt;
    if (shiftHeld.current && !interiorId) {
      if (keys.has("arrowleft") || keys.has("a")) {
        beginFrameOrbit(-turn, 0);
      }
      if (keys.has("arrowright") || keys.has("d")) {
        beginFrameOrbit(turn, 0);
      }
      if (keys.has("arrowup") || keys.has("w")) {
        beginFrameOrbit(0, -turn * 0.75);
      }
      if (keys.has("arrowdown") || keys.has("s")) {
        beginFrameOrbit(0, turn * 0.75);
      }
    } else {
      const pan = (48 / 1.2) * TILE * dt;
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
    }

    t.y = interiorId ? h(1.15) : h(0.2);

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

    const wantH = interiorId ? h(7.2) : mapOverview ? OVERVIEW_DIST : distFromScale(cameraScale);
    const overhead = topRef.current && !interiorId && !orbiting.current;

    if (overhead && !wasTop.current) {
      camera.position.set(t.x, t.y + wantH, t.z);
      wasTop.current = true;
      applyDist.current = false;
    } else if (!overhead && wasTop.current && !orbiting.current) {
      _dir.set(h(12), h(14), h(12)).normalize().multiplyScalar(wantH);
      camera.position.copy(t).add(_dir);
      wasTop.current = false;
      applyDist.current = true;
    }

    if (orbiting.current) {
      camera.up.set(0, 1, 0);
    } else if (overhead) {
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
        if (_dir.lengthSq() < 0.001 || Math.abs(_dir.x) + Math.abs(_dir.z) < h(0.35)) {
          _dir.set(h(12), h(14), h(12));
        }
        _dir.normalize().multiplyScalar(next);
        camera.position.copy(t).add(_dir);
        if (!interiorId && Math.abs(wantH - next) < h(0.35)) applyDist.current = false;
      }

      if (!interiorId) {
        const cap = mapOverview ? OVERVIEW_DIST : MAX_VIEW_DIST;
        const d = camera.position.distanceTo(t);
        const capped = THREE.MathUtils.clamp(d, MIN_VIEW_DIST, cap);
        if (Math.abs(capped - d) > h(0.04)) {
          _dir.copy(camera.position).sub(t);
          if (_dir.lengthSq() < 0.001) _dir.set(h(12), h(14), h(12));
          _dir.normalize().multiplyScalar(capped);
          camera.position.copy(t).add(_dir);
        }
      }
    }

    const fog = scene.fog;
    if (fog instanceof THREE.Fog) {
      if (mapOverview || (topRef.current && !interiorId)) {
        fog.near = h(34);
        fog.far = h(420);
      } else {
        const d = camera.position.distanceTo(t);
        fog.near = Math.max(h(14), d * 0.7);
        fog.far = Math.max(h(220), d * 2.15);
      }
    }

    if (!interiorId) keepAboveGround(camera, GROUND_Y);
    else keepAboveGround(camera, h(0.35));

    camera.lookAt(t);

    function beginFrameOrbit(dx: number, dy: number) {
      orbiting.current = true;
      applyDist.current = false;
      if (topRef.current) {
        wasTop.current = false;
        setTopView(false);
        if (Math.abs(camera.position.x - t.x) + Math.abs(camera.position.z - t.z) < h(0.35)) {
          camera.position.x = t.x + h(0.45);
          camera.position.z = t.z + h(0.45);
        }
      }
      orbitCamera(camera, t, dx, dy, interiorId ? h(0.35) : GROUND_Y);
    }
  });

  return null;
}
