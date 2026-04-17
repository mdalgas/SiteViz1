import * as THREE from 'three';
import { usePlayback } from '../stores/playbackStore';

export function SiteBoundary() {
  const siteSize = usePlayback(s => s.siteData.site.sizeMeters);
  const half = siteSize / 2;
  const H = Math.max(2.5, siteSize * 0.006); // fence height scales slightly with site

  // Build corner marker pillars
  const corners: [number, number][] = [
    [-half, -half], [half, -half], [half, half], [-half, half],
  ];

  // Edges as line segments for boundary outline
  const edgePoints = [
    new THREE.Vector3(-half, H / 2, -half),
    new THREE.Vector3( half, H / 2, -half),
    new THREE.Vector3( half, H / 2,  half),
    new THREE.Vector3(-half, H / 2,  half),
    new THREE.Vector3(-half, H / 2, -half),
  ];

  return (
    <group>
      {/* Corner pillars */}
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, H / 2, z]} castShadow>
          <boxGeometry args={[1.2, H, 1.2]} />
          <meshStandardMaterial color="#e65c00" roughness={0.7} />
        </mesh>
      ))}

      {/* Boundary fence rails along all four edges */}
      {[
        // North
        { from: [-half, -half] as [number,number], to: [half, -half] as [number,number] },
        // South
        { from: [-half,  half] as [number,number], to: [half,  half] as [number,number] },
        // East
        { from: [half, -half] as [number,number],  to: [half,   half] as [number,number] },
        // West
        { from: [-half, -half] as [number,number], to: [-half,  half] as [number,number] },
      ].map(({ from, to }, i) => {
        const mx = (from[0] + to[0]) / 2;
        const mz = (from[1] + to[1]) / 2;
        const len = Math.sqrt((to[0]-from[0])**2 + (to[1]-from[1])**2);
        const angle = Math.atan2(to[0]-from[0], to[1]-from[1]);
        return (
          <mesh key={i} position={[mx, H * 0.6, mz]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.3, 0.3, len]} />
            <meshStandardMaterial color="#9b7c4e" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Site name sign at south edge */}
      <mesh position={[0, H + 3, half + 1]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[Math.min(60, siteSize * 0.15), Math.min(8, siteSize * 0.02)]} />
        <meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
