import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Asset } from '../types';
import { useClockStore } from '../stores/clockStore';
import { trailPointsUpTo } from '../utils/interpolate';

interface TrailLayerProps {
  assets: Asset[];
}

export function TrailLayer({ assets }: TrailLayerProps) {
  const t = useClockStore(s => s.t);

  return (
    <>
      {assets.map(asset => (
        <AssetTrail key={asset.id} asset={asset} t={t} />
      ))}
    </>
  );
}

function AssetTrail({ asset, t }: { asset: Asset; t: number }) {
  const points = useMemo(
    () => trailPointsUpTo(asset.snapshots, t),
    [asset.snapshots, t]
  );

  if (points.length < 2) return null;

  // drei <Line> accepts [x,y,z] tuples directly — no need to wrap in Vector3
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
