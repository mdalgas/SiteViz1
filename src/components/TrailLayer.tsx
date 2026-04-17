import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '../types';
import { usePlayback } from '../stores/playbackStore';
import { trailPointsUpTo } from '../utils/interpolate';

interface TrailLayerProps {
  assets: Asset[];
}

export function TrailLayer({ assets }: TrailLayerProps) {
  const { t } = usePlayback();

  return (
    <>
      {assets.map(asset => (
        <AssetTrail key={asset.id} asset={asset} t={t} />
      ))}
    </>
  );
}

function AssetTrail({ asset, t }: { asset: Asset; t: number }) {
  const rawPoints = useMemo(
    () => trailPointsUpTo(asset.snapshots, t),
    [asset.snapshots, t]
  );

  if (rawPoints.length < 2) return null;

  const points = rawPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));

  return (
    <Line
      points={points}
      color={asset.color}
      lineWidth={1.5}
      transparent
      opacity={0.7}
    />
  );
}
