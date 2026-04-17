import { create } from 'zustand';
import type { SiteData, SiteEvent, VisualizationMode } from '../types';
import { generateSampleData } from '../data/generateSampleData';

function buildEvents(data: SiteData): SiteEvent[] {
  const events: SiteEvent[] = [];
  for (const asset of data.assets) {
    const snaps = asset.snapshots;
    if (!snaps.length) continue;

    const firstT = snaps[0].t;
    const lastT  = snaps[snaps.length - 1].t;

    events.push({ t: firstT, type: 'arrive', assetId: asset.id, label: asset.label, modelKey: asset.modelKey, color: asset.color });

    // Calculate work stats for depart event
    const workSnaps = snaps.filter(s => s.state === 'working').length;
    const activePercent = Math.round((workSnaps / snaps.length) * 100);
    const durationHours = parseFloat(((lastT - firstT) / 3600).toFixed(1));

    events.push({ t: lastT, type: 'depart', assetId: asset.id, label: asset.label, modelKey: asset.modelKey, color: asset.color, durationHours, activeWorkPercent: activePercent });
  }
  return events.sort((a, b) => a.t - b.t);
}

interface PlaybackState {
  // Data
  siteData: SiteData;
  events: SiteEvent[];
  currentDataset: string;
  loadingDataset: boolean;

  // Playback
  t: number;
  playing: boolean;
  speed: number;
  duration: number;

  // Visualization
  mode: VisualizationMode;

  // Active events (fired during playback)
  activeToasts: SiteEvent[];

  // Actions
  setT: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setMode: (m: VisualizationMode) => void;
  tick: (delta: number) => void;
  reset: () => void;
  dismissToast: (t: number, id: string) => void;
  loadDataset: (filename: string) => void;
}

const initialData = generateSampleData();
const initialEvents = buildEvents(initialData);

function applyDataset(data: SiteData, filename: string) {
  const events = buildEvents(data);
  usePlayback.setState({
    siteData: data,
    events,
    duration: data.timeRange.durationSeconds,
    t: 0,
    playing: false,
    activeToasts: [],
    currentDataset: filename,
    loadingDataset: false,
  });
}

export const usePlayback = create<PlaybackState>((set, get) => ({
  siteData: initialData,
  events: initialEvents,
  currentDataset: 'sample',
  loadingDataset: false,
  t: 0,
  playing: false,
  speed: 10,
  duration: initialData.timeRange.durationSeconds,
  mode: 'trails',
  activeToasts: [],

  setT: (t) => {
    const { duration } = get();
    set({ t: Math.max(0, Math.min(duration, t)) });
  },
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),
  dismissToast: (t, id) =>
    set(s => ({ activeToasts: s.activeToasts.filter(e => !(e.t === t && e.assetId === id)) })),

  tick: (delta) => {
    const { t, speed, duration, events, activeToasts } = get();
    if (t >= duration) { set({ playing: false }); return; }

    const nextT = Math.min(t + delta * speed, duration);

    // Fire events that fall in [t, nextT)
    const fired = events.filter(e => e.t > t && e.t <= nextT);
    if (fired.length) {
      set({ t: nextT, activeToasts: [...activeToasts, ...fired].slice(-6) });
    } else {
      set({ t: nextT }); // leave activeToasts untouched — avoids notifying toast subscribers every frame
    }
  },

  reset: () => set({ t: 0, playing: false, activeToasts: [] }),

  loadDataset: (filename) => {
    set({ loadingDataset: true, playing: false });
    fetch(`/data/${filename}`)
      .then(r => r.json())
      .then((data: SiteData) => applyDataset(data, filename))
      .catch(err => {
        console.warn(`Failed to load ${filename}:`, err);
        set({ loadingDataset: false });
      });
  },
}));

// ── Load Titan data by default ───────────────────────────────────────────────
fetch('/data/titan-export.json')
  .then(r => r.json())
  .then((data: SiteData) => applyDataset(data, 'titan-export.json'))
  .catch(err => console.warn('Titan data not found, using sample data:', err));
