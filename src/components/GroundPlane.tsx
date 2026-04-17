import { usePlayback } from '../stores/playbackStore';

export function GroundPlane() {
  const siteSize = usePlayback(s => s.siteData.site.sizeMeters);
  const gridDivisions = Math.min(32, Math.max(8, Math.round(siteSize / 20)));

  return (
    <group>
      {/* Outer dark surround — large enough to reach the visual horizon at any
          camera angle. siteSize*15 stays well inside the far plane (siteSize*20).
          Pushed back with polygonOffset so the green base always wins above it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} >
        <planeGeometry args={[siteSize * 15, siteSize * 15]} />
        <meshStandardMaterial
          color="#1a1f17"
          roughness={1}
          polygonOffset
          polygonOffsetFactor={4}
          polygonOffsetUnits={4}
        />
      </mesh>

      {/* Base green ground — same Y, polygonOffset pulls it toward camera
          so it always renders on top of the dark surround. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow >
        <planeGeometry args={[siteSize, siteSize]} />
        <meshStandardMaterial
          color="#3d4a35"
          roughness={0.95}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={2}
          polygonOffsetUnits={2}
        />
      </mesh>

      {/* Grid overlay — raised enough to clear both planes without fighting. */}
      <gridHelper
        args={[siteSize, gridDivisions, '#5a6b52', '#4a5941']}
        position={[0, 0.3, 0]}
      />
    </group>
  );
}
