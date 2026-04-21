import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Asset } from '../types';
import { useClockStore } from '../stores/clockStore';
import { useDatasetStore } from '../stores/datasetStore';
import { HeatmapCanvas } from '../utils/heatmapCanvas';
import { interpolatePose } from '../utils/interpolate';

const INTERVAL = 120;

interface HeatmapLayerProps {
  assets: Asset[];
}

export function HeatmapLayer({ assets }: HeatmapLayerProps) {
  const t        = useClockStore(s => s.t);
  const siteSize = useDatasetStore(s => s.siteData.site.sizeMeters);
  const lastPaintedT = useRef(-1); // -1 so first startStep = 0; avoids -Infinity loop

  const { heatmap, texture } = useMemo(() => {
    const hm = new HeatmapCanvas(siteSize, 512);
    const tex = new THREE.CanvasTexture(hm.canvas);
    return { heatmap: hm, texture: tex };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSize]);

  // When dataset switches (siteSize changes), reset paint cursor
  useEffect(() => {
    lastPaintedT.current = -1;
    heatmap.reset();
  }, [heatmap]);

  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!matRef.current) return;

    // If scrubbed backward, reset and repaint from zero
    if (t < lastPaintedT.current - INTERVAL) {
      heatmap.reset();
      lastPaintedT.current = -1;
    }

    const startStep = Math.ceil((lastPaintedT.current + 1) / INTERVAL) * INTERVAL;
    const endStep   = Math.floor(t / INTERVAL) * INTERVAL;

    if (endStep >= startStep) {
      for (let step = startStep; step <= endStep; step += INTERVAL) {
        for (const asset of assets) {
          const pose = interpolatePose(asset.snapshots, step);
          if (pose) heatmap.paint(pose.x, pose.z, pose.state);
        }
      }
      lastPaintedT.current = endStep;
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
      <planeGeometry args={[siteSize, siteSize]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
