import type { Snapshot, AssetState } from '../types';

export interface AssetStats {
  onSiteSeconds: number;                      // effectiveT − first.t
  stateTotals: Record<AssetState, number>;    // accumulated seconds per state
  statePercents: Record<AssetState, number>;  // 0-100, sums to 100
  phase: 'not_yet' | 'on_site' | 'departed';
}

const STATES: AssetState[] = ['working', 'moving', 'idle', 'off'];

function emptyRecord(): Record<AssetState, number> {
  return { working: 0, moving: 0, idle: 0, off: 0 };
}

export function computeAssetStats(snapshots: Snapshot[], t: number): AssetStats {
  const zero = (): AssetStats => ({
    onSiteSeconds: 0,
    stateTotals: emptyRecord(),
    statePercents: emptyRecord(),
    phase: 'not_yet',
  });

  if (!snapshots.length) return zero();

  const first = snapshots[0];
  const last  = snapshots[snapshots.length - 1];

  if (t < first.t) return zero();

  const phase: AssetStats['phase'] = t > last.t ? 'departed' : 'on_site';
  const effectiveT = Math.min(t, last.t);
  const totals = emptyRecord();

  // Walk consecutive snapshot pairs, credit a.state for [a.t, min(b.t, effectiveT)]
  for (let i = 0; i < snapshots.length - 1; i++) {
    const a = snapshots[i];
    if (a.t >= effectiveT) break;
    const b = snapshots[i + 1];
    const segEnd = Math.min(b.t, effectiveT);
    totals[a.state] += segEnd - a.t;
  }

  const onSiteSeconds = effectiveT - first.t;

  // Compute percents — give remainder to last non-zero state to guarantee sum=100
  const percents = emptyRecord();
  if (onSiteSeconds > 0) {
    const active = STATES.filter(s => totals[s] > 0);
    let remaining = 100;
    active.forEach((s, i) => {
      if (i === active.length - 1) {
        percents[s] = remaining;
      } else {
        const p = Math.round((totals[s] / onSiteSeconds) * 100);
        percents[s] = p;
        remaining -= p;
      }
    });
  }

  return { onSiteSeconds, stateTotals: totals, statePercents: percents, phase };
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}
