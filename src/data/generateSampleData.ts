import type { Asset, SiteData, Snapshot, AssetState } from '../types';

const SITE_SIZE = 160;       // metres, square site
const DURATION = 4 * 3600;   // 4 hours in seconds
const INTERVAL = 120;         // snapshot every 2 min

// Asset roster – 7 vehicles using the 5 city-car models
const ROSTER = [
  { id: 'v1', modelKey: 'car_06',       label: 'Excavator Alpha', color: '#f59e0b', entryT: 0,   exitT: DURATION },
  { id: 'v2', modelKey: 'car_13',       label: 'Dumper Bravo',    color: '#3b82f6', entryT: 300, exitT: DURATION - 600 },
  { id: 'v3', modelKey: 'car_16',       label: 'Roller Charlie',  color: '#10b981', entryT: 0,   exitT: DURATION },
  { id: 'v4', modelKey: 'car_19',       label: 'Crane Delta',     color: '#ef4444', entryT: 600, exitT: DURATION - 300 },
  { id: 'v5', modelKey: 'futuristic',   label: 'Loader Echo',     color: '#8b5cf6', entryT: 0,   exitT: DURATION },
  { id: 'v6', modelKey: 'car_06',       label: 'Compactor Foxtrot',color:'#f97316', entryT: 900, exitT: DURATION - 900 },
  { id: 'v7', modelKey: 'car_13',       label: 'Grader Golf',     color: '#06b6d4', entryT: 1200,exitT: DURATION },
];

// Work zones: centres of activity on the site (coords in local space, origin = centre)
const WORK_ZONES = [
  { x:  45, z:  40 },
  { x: -50, z:  35 },
  { x:  20, z: -50 },
  { x: -30, z: -40 },
  { x:  60, z: -10 },
  { x: -60, z:  10 },
];

// Entry/exit points on the site perimeter (south gate – near camera)
const ENTRY_POINTS = [
  { x: -25, z: 72 },
  { x:   0, z: 72 },
  { x:  25, z: 72 },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rng(seed: number) {
  // Simple seeded PRNG
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function heading(fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX, dz = toZ - fromZ;
  return (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;
}

function generatePath(seed: number, entryT: number, exitT: number): Snapshot[] {
  const rand = rng(seed);
  const snapshots: Snapshot[] = [];
  const entry = ENTRY_POINTS[Math.floor(rand() * ENTRY_POINTS.length)];

  // Pick 4-6 work zones to visit in sequence
  const numZones = 4 + Math.floor(rand() * 3);
  const zones = [...WORK_ZONES].sort(() => rand() - 0.5).slice(0, numZones);
  zones.push({ x: entry.x + (rand() - 0.5) * 20, z: entry.z }); // return to exit

  // Build waypoints: (x, z, arrivalT, dwellDuration, state during dwell)
  const waypoints: { x: number; z: number; arrivalT: number; leaveT: number; travelState: AssetState; dwellState: AssetState }[] = [];
  const activeDuration = exitT - entryT;
  const segDuration = activeDuration / (zones.length + 1);

  let t = entryT;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const travelDur = segDuration * 0.4;
    const dwellDur = segDuration * 0.6;
    waypoints.push({
      x: zone.x, z: zone.z,
      arrivalT: t + travelDur,
      leaveT: t + travelDur + dwellDur,
      travelState: 'moving',
      dwellState: i === zones.length - 1 ? 'idle' : (rand() > 0.3 ? 'working' : 'idle'),
    });
    t += segDuration;
  }

  // Generate snapshots at INTERVAL spacing
  let wpIdx = 0;
  let prevX = entry.x, prevZ = entry.z;

  for (let st = 0; st <= DURATION; st += INTERVAL) {
    if (st < entryT || st > exitT) continue;

    // Find current waypoint
    while (wpIdx < waypoints.length - 1 && st > waypoints[wpIdx].leaveT) wpIdx++;
    const wp = waypoints[Math.min(wpIdx, waypoints.length - 1)];

    let x: number, z: number, state: AssetState;

    if (st < wp.arrivalT) {
      // Travelling toward wp
      const prevWP = wpIdx > 0 ? waypoints[wpIdx - 1] : { x: entry.x, z: entry.z, leaveT: entryT };
      const progress = (st - prevWP.leaveT) / (wp.arrivalT - prevWP.leaveT);
      const p = Math.max(0, Math.min(1, progress));
      x = lerp(prevWP.x, wp.x, p);
      z = lerp(prevWP.z, wp.z, p);
      // Add slight wobble
      x += (rand() - 0.5) * 2;
      z += (rand() - 0.5) * 2;
      state = 'moving';
    } else if (st <= wp.leaveT) {
      // Dwelling – small jitter to simulate working in place
      x = wp.x + (rand() - 0.5) * (wp.dwellState === 'working' ? 5 : 1);
      z = wp.z + (rand() - 0.5) * (wp.dwellState === 'working' ? 5 : 1);
      state = wp.dwellState;
    } else {
      x = wp.x; z = wp.z; state = 'idle';
    }

    // Clamp to site bounds
    const half = SITE_SIZE / 2 - 5;
    x = Math.max(-half, Math.min(half, x));
    z = Math.max(-half, Math.min(half, z));

    const h = snapshots.length > 0
      ? heading(prevX, prevZ, x, z)
      : heading(entry.x, entry.z, x, z);

    snapshots.push({ t: st, x, z, heading: h, state });
    prevX = x; prevZ = z;
  }

  return snapshots;
}

export function generateSampleData(): SiteData {
  const assets: Asset[] = ROSTER.map((r, i) => ({
    id: r.id,
    modelKey: r.modelKey,
    label: r.label,
    color: r.color,
    snapshots: generatePath(i * 31337 + 42, r.entryT, r.exitT),
  }));

  return {
    site: { name: 'Trackunit Demo Site', sizeMeters: SITE_SIZE },
    timeRange: {
      start: '2026-04-15T06:00:00Z',
      end:   '2026-04-15T10:00:00Z',
      durationSeconds: DURATION,
    },
    assets,
  };
}

export { DURATION, INTERVAL, SITE_SIZE };
