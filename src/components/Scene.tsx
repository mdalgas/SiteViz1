import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GroundPlane } from './GroundPlane';
import { SiteBoundary } from './SiteBoundary';
import { Asset3D } from './Asset3D';
import { TrailLayer } from './TrailLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { useFocusController } from '../hooks/useFocusController';
import { useClockStore } from '../stores/clockStore';
import { useDatasetStore } from '../stores/datasetStore';
import { useUiStore } from '../stores/uiStore';
import { tickPlayback, resetPlayback } from '../stores/playbackTick';

/** Drives the playback clock inside the Canvas RAF */
function PlaybackClock() {
  useFrame((_, delta) => tickPlayback(delta));
  return null;
}

/**
 * Owns the single gl.render() call per frame.
 *
 * Frame-loop contract (see README):
 *   priority 0  — Asset3D writes livePoseRegistry (default useFrame)
 *   priority 1  — FocusedCameraController reads registry, adjusts camera
 *   priority 2  — RenderRoot: renders scene
 *
 * Rule: any useFrame with priority > 0 disables R3F auto-render, so *exactly*
 * one component in the tree must call gl.render at the highest priority. This
 * is that component. Do not add useFrame(..., n) with n >= 2.
 */
function RenderRoot() {
  const { gl, scene, camera } = useThree();
  useFrame(() => gl.render(scene, camera), 2);
  return null;
}

/** Thin wrapper so the hook can live inside <Canvas>. */
function FocusController({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  useFocusController({ controlsRef });
  return null;
}

/** Repositions camera when siteData changes */
function CameraRig() {
  const siteSize = useDatasetStore(s => s.siteData.site.sizeMeters);
  const { camera } = useThree();

  useEffect(() => {
    const h = siteSize * 0.65;
    const d = siteSize * 0.88;
    camera.position.set(0, h, d);
    (camera as THREE.PerspectiveCamera).near = Math.max(1, siteSize / 500);
    (camera as THREE.PerspectiveCamera).far = siteSize * 20;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, siteSize]);

  return null;
}

/** Keyboard shortcuts */
function KeyboardShortcuts() {
  const playing    = useClockStore(s => s.playing);
  const speed      = useClockStore(s => s.speed);
  const setPlaying = useClockStore(s => s.setPlaying);
  const setSpeed   = useClockStore(s => s.setSpeed);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
      if (e.code === 'KeyR') resetPlayback();
      if (e.code === 'BracketRight') setSpeed(Math.min(speed * 3, 9000));
      if (e.code === 'BracketLeft')  setSpeed(Math.max(speed / 3, 60));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, speed, setPlaying, setSpeed]);

  return null;
}

export function Scene() {
  const siteData = useDatasetStore(s => s.siteData);
  const mode = useUiStore(s => s.mode);
  const focusedAssetId = useUiStore(s => s.focusedAssetId);
  const assets = siteData.assets;
  const siteSize = siteData.site.sizeMeters;
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const showTrails  = mode === 'trails' || mode === 'both';
  const showHeatmap = mode === 'heatmap' || mode === 'both';

  const shadowHalf = siteSize * 0.6;
  const lightPos   = siteSize * 0.7;

  return (
    <Canvas
      shadows
      camera={{ position: [0, siteSize * 0.65, siteSize * 0.88], fov: 50, near: 1, far: siteSize * 20 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1f17'); // matches outer boundary ground colour
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      }}
    >
      <CameraRig />
      <KeyboardShortcuts />
      <PlaybackClock />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#c0d8ff" />
      <directionalLight
        position={[lightPos, lightPos * 1.5, lightPos * 0.75]}
        intensity={1.8}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={siteSize * 4}
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
      />
      <hemisphereLight args={['#294066', '#1a2d10', 0.6]} />

      {/* Sky */}
      <Sky sunPosition={[80, 30, 60]} turbidity={6} rayleigh={0.5} />
      <Stars radius={siteSize * 8} depth={siteSize * 2} count={2000} factor={3} fade />

      {/* Scene objects */}
      <Suspense fallback={null}>
        <GroundPlane />
        <SiteBoundary />

        {showHeatmap && <HeatmapLayer assets={assets} />}
        {showTrails  && <TrailLayer   assets={assets} />}

        {assets.map(asset => (
          <Asset3D key={asset.id} asset={asset} showLabel={true} />
        ))}
      </Suspense>

      <FocusController controlsRef={controlsRef} />
      <RenderRoot />

      {/* Camera — disabled while an asset is focused so FocusedCameraController
          has sole control; re-enabled on release from the focused asset's orbit position */}
      <OrbitControls
        ref={controlsRef}
        enabled={!focusedAssetId}
        target={[0, 0, 0]}
        minDistance={30}
        maxDistance={siteSize * 5}
        maxPolarAngle={Math.PI / 2.05}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
