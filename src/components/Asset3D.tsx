import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset, AssetState } from '../types';
import { interpolatePose } from '../utils/interpolate';
import { useClockStore } from '../stores/clockStore';
import { assetPositionRegistry } from '../utils/assetPositionRegistry';

const MODEL_PATHS: Record<string, string> = {
  car_06:     '/models/Car_06.glb',
  car_13:     '/models/Car_13.glb',
  car_16:     '/models/Car_16.glb',
  car_19:     '/models/Car_19.glb',
  futuristic: '/models/Futuristic_Car_1.glb',
};

// Preload all models
Object.values(MODEL_PATHS).forEach(p => useGLTF.preload(p));

const STATE_EMISSIVE: Record<AssetState, THREE.Color> = {
  working: new THREE.Color(0.4, 0.1, 0.0),
  moving:  new THREE.Color(0.0, 0.08, 0.25),
  idle:    new THREE.Color(0.15, 0.12, 0.0),
  off:     new THREE.Color(0.0, 0.0, 0.0),
};

interface Asset3DProps {
  asset: Asset;
  showLabel: boolean;
}

export function Asset3D({ asset, showLabel }: Asset3DProps) {
  const t = useClockStore(s => s.t);
  const path = MODEL_PATHS[asset.modelKey] ?? MODEL_PATHS['car_06'];
  const { scene } = useGLTF(path);

  // Clone scene so each instance is independent
  const clone = useMemo(() => scene.clone(true), [scene]);

  // Find wheel nodes
  const wheels = useMemo(() => {
    const found: THREE.Object3D[] = [];
    clone.traverse(node => { if (node.name.includes('Wheel')) found.push(node); });
    return found;
  }, [clone]);

  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const bobRef = useRef(Math.random() * Math.PI * 2); // phase offset
  const wheelRotRef = useRef(0);
  const lastEmissiveState = useRef<AssetState | null>(null);

  // Collect all meshes for emissive updates
  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    clone.traverse(n => { if ((n as THREE.Mesh).isMesh) meshes.push(n as THREE.Mesh); });
    meshesRef.current = meshes;
  }, [clone]);

  // Remove from position registry when unmounted
  useEffect(() => () => assetPositionRegistry.remove(asset.id), [asset.id]);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const pose = interpolatePose(asset.snapshots, t);
    if (!pose) { group.visible = false; return; }

    group.visible = true;
    group.position.set(pose.x, 0, pose.z);
    assetPositionRegistry.set(asset.id, pose.x, pose.z);

    // Smooth heading rotation (shortest path)
    const targetY = -THREE.MathUtils.degToRad(pose.heading);
    const currentY = group.rotation.y;
    const delta180 = THREE.MathUtils.euclideanModulo(targetY - currentY + Math.PI, Math.PI * 2) - Math.PI;
    group.rotation.y += delta180 * Math.min(delta * 5, 1);

    const state = pose.state;

    // Idle / working bob
    if (state === 'idle' || state === 'working') {
      bobRef.current += delta * (state === 'working' ? 3.5 : 1.5);
      const bobAmt = state === 'working' ? 0.06 : 0.02;
      clone.position.y = Math.sin(bobRef.current) * bobAmt;
    } else {
      clone.position.y = 0;
    }

    // Wheel rotation from speed
    if (state === 'moving') {
      wheelRotRef.current += pose.speed * delta * 1.2;
      wheels.forEach(w => { w.rotation.x = wheelRotRef.current; });
    }

    // Emissive tint — skip copy() when state hasn't changed
    if (state !== lastEmissiveState.current) {
      lastEmissiveState.current = state;
      const emissive = STATE_EMISSIVE[state];
      meshesRef.current.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.emissive) mat.emissive.copy(emissive);
      });
    }
  });

  // Compute pose for render (needed for mount + label state). O(log n) binary search —
  // negligible; don't gate rendering on a useFrame-written ref (creates mount deadlock).
  const pose = interpolatePose(asset.snapshots, t);
  if (!pose) return null;

  return (
    <group ref={groupRef}>
      <primitive object={clone} scale={[5, 5, 5]} />

      {/* State indicator ring on ground — large enough to see from overview */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}>
        <ringGeometry args={[7, 10, 32]} />
        <meshBasicMaterial color={asset.color} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {/* Pulse disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, 0]}>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial color={asset.color} transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {showLabel && (
        <Html
          position={[0, 12, 0]}
          center
          distanceFactor={200}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-2 py-1 rounded text-xs font-bold whitespace-nowrap select-none"
            style={{
              background: 'rgba(10,12,20,0.82)',
              border: `1px solid ${asset.color}`,
              color: asset.color,
              fontFamily: 'monospace',
              boxShadow: `0 0 8px ${asset.color}55`,
            }}
          >
            {asset.label}
            <span className="ml-1 opacity-70">
              {pose?.state === 'working' ? '⚙' : pose?.state === 'moving' ? '▶' : pose?.state === 'idle' ? '◉' : '■'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
