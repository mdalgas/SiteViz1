import type { Snapshot, AssetState } from '../types';

export interface InterpolatedPose {
  x: number;
  z: number;
  heading: number;
  state: AssetState;
  speed: number; // m/s, for wheel rotation
}

function shortestAngleDelta(from: number, to: number): number {
  let d = ((to - from) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function interpolatePose(snapshots: Snapshot[], t: number): InterpolatedPose | null {
  if (!snapshots.length) return null;

  const first = snapshots[0];
  const last  = snapshots[snapshots.length - 1];

  // Asset is off-site before arrival and after departure. Callers that want to
  // read the first/last pose (e.g. heatmap backfill) should do so explicitly
  // against snapshots[0]/snapshots[N-1] rather than calling this with an out-
  // of-range t.
  if (t < first.t) return null;
  if (t > last.t) return null;
  if (t === first.t) {
    return { x: first.x, z: first.z, heading: first.heading, state: first.state, speed: 0 };
  }
  if (t === last.t) {
    return { x: last.x, z: last.z, heading: last.heading, state: last.state, speed: 0 };
  }

  // Binary search for the surrounding pair
  let lo = 0, hi = snapshots.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].t <= t) lo = mid; else hi = mid;
  }

  const a = snapshots[lo];
  const b = snapshots[hi];
  const p = (t - a.t) / (b.t - a.t);

  const x = lerp(a.x, b.x, p);
  const z = lerp(a.z, b.z, p);
  const heading = (a.heading + shortestAngleDelta(a.heading, b.heading) * p + 360) % 360;

  const dx = b.x - a.x, dz = b.z - a.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const dt = (b.t - a.t) || 1;
  const speed = dist / dt;

  return { x, z, heading, state: a.state, speed };
}

/** Returns all snapshots up to time t (for trail rendering) */
export function trailPointsUpTo(snapshots: Snapshot[], t: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (const s of snapshots) {
    if (s.t > t) break;
    pts.push([s.x, 0.8, s.z]);
  }
  return pts;
}
