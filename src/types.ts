export type AssetState = 'off' | 'idle' | 'moving' | 'working';

export interface Snapshot {
  t: number;        // seconds from session start
  x: number;        // local X (meters)
  z: number;        // local Z (meters)
  heading: number;  // degrees, 0 = north (+Z), clockwise
  state: AssetState;
  speed?: number;   // km/h (optional, for display)
}

export interface Asset {
  id: string;
  modelKey: string; // key into MODEL_PATHS
  label: string;
  color: string;    // hex, used for trail / heatmap
  snapshots: Snapshot[];
}

export interface SiteData {
  site: { name: string; sizeMeters: number; centerLat?: number; centerLon?: number };
  timeRange: { start: string; end: string; durationSeconds: number };
  assets: Asset[];
}

export interface SiteEvent {
  t: number;
  type: 'arrive' | 'depart';
  assetId: string;
  label: string;
  modelKey: string;
  color: string;
  durationHours?: number;
  activeWorkPercent?: number;
}

export type VisualizationMode = 'trails' | 'heatmap' | 'both';
