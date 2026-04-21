/**
 * useFocusController — camera fly-in + orbit + drag-aware auto-rotation for
 * the currently focused asset. Mount once inside <Canvas>.
 *
 * Frame-loop contract:
 *   Runs at priority 1 — reads livePoseRegistry written by Asset3D at priority 0.
 *   Does NOT render (RenderRoot at priority 2 owns gl.render).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useUiStore } from '../stores/uiStore';
import { assetPositionRegistry } from '../utils/assetPositionRegistry';
import { scratchVec3A, scratchVec3B } from '../utils/scratch';

const ORBIT_RADIUS = 65;
const ORBIT_HEIGHT = 35;
const ORBIT_SPEED  = 0.25;
const FLY_LERP     = 0.05;
const TARGET_LERP  = 0.12;
const DRAG_PX      = 5;

interface Options {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export function useFocusController({ controlsRef }: Options) {
  const { camera, gl } = useThree();
  const focusedAssetId  = useUiStore(s => s.focusedAssetId);
  const setFocusedAsset = useUiStore(s => s.setFocusedAsset);

  const orbitAngle  = useRef(0);
  const trackTarget = useRef(new THREE.Vector3());
  const isDragging  = useRef(false);
  const isFlying    = useRef(false);

  // Initialise orbit state when focus changes.
  const prevFocusId = useRef<string | null>(null);
  useEffect(() => {
    if (focusedAssetId === prevFocusId.current) return;
    prevFocusId.current = focusedAssetId;
    if (!focusedAssetId) return;

    const pos = assetPositionRegistry.get(focusedAssetId);
    const targetX = pos?.x ?? 0;
    const targetZ = pos?.z ?? 0;

    trackTarget.current.set(targetX, 0, targetZ);
    orbitAngle.current = Math.atan2(
      camera.position.x - targetX,
      camera.position.z - targetZ,
    );
    isFlying.current = true;
  }, [focusedAssetId, camera]);

  // Canvas pointer listeners: track drag, release focus on plain click.
  // Uses gl.domElement (the R3F canvas) rather than querySelector so multiple
  // canvases in the document wouldn't cross-wire.
  useEffect(() => {
    const canvas = gl.domElement;
    let downX = 0, downY = 0;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      isDragging.current = false;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_PX && useUiStore.getState().focusedAssetId) {
        setFocusedAsset(null);
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [gl, setFocusedAsset]);

  useFrame((_, delta) => {
    if (!focusedAssetId) return;

    const pos = assetPositionRegistry.get(focusedAssetId);
    if (!pos) return;

    // 1. Lerp orbit centre toward live asset position
    scratchVec3A.set(pos.x, 0, pos.z);
    trackTarget.current.lerp(scratchVec3A, TARGET_LERP);

    // 2. Advance orbit angle when not dragging
    if (!isDragging.current) {
      orbitAngle.current += ORBIT_SPEED * delta;
    }

    // 3. Compute orbit camera position
    const angle = orbitAngle.current;
    scratchVec3B.set(
      trackTarget.current.x + Math.sin(angle) * ORBIT_RADIUS,
      trackTarget.current.y + ORBIT_HEIGHT,
      trackTarget.current.z + Math.cos(angle) * ORBIT_RADIUS,
    );

    // 4. Fly camera toward orbit position
    camera.position.lerp(scratchVec3B, FLY_LERP);

    // Keep OrbitControls' internal target in sync so it doesn't fight on release.
    // TODO: disentangle from OrbitControls entirely (see review item 13).
    if (controlsRef.current) {
      controlsRef.current.target.lerp(trackTarget.current, TARGET_LERP);
    }

    camera.lookAt(trackTarget.current);

    if (isFlying.current && camera.position.distanceTo(scratchVec3B) < 2) {
      isFlying.current = false;
    }
  }, 1);
}
