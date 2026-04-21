import { create } from 'zustand';
import type { SiteData, SiteEvent } from '../types';
import { generateSampleData } from '../data/generateSampleData';
import { buildEvents } from '../utils/buildEvents';
import { useClockStore } from './clockStore';
import { useUiStore } from './uiStore';

interface DatasetState {
  siteData: SiteData;
  events: SiteEvent[];
  currentDataset: string;
  loadingDataset: boolean;

  loadDataset: (filename: string) => void;
}

const initialData = generateSampleData();
const initialEvents = buildEvents(initialData);

function applyDataset(data: SiteData, filename: string) {
  useDatasetStore.setState({
    siteData: data,
    events: buildEvents(data),
    currentDataset: filename,
    loadingDataset: false,
  });
  useClockStore.getState().applyDuration(data.timeRange.durationSeconds);
  useUiStore.setState({ focusedAssetId: null, activeToasts: [] });
}

export const useDatasetStore = create<DatasetState>((set) => ({
  siteData: initialData,
  events: initialEvents,
  currentDataset: 'sample',
  loadingDataset: false,

  loadDataset: (filename) => {
    set({ loadingDataset: true });
    useClockStore.getState().setPlaying(false);
    fetch(`/data/${filename}`)
      .then(r => r.json())
      .then((data: SiteData) => applyDataset(data, filename))
      .catch(err => {
        console.warn(`Failed to load ${filename}:`, err);
        set({ loadingDataset: false });
      });
  },
}));

// Seed clock duration from initial (sample) data, then fetch Titan in background.
useClockStore.getState().applyDuration(initialData.timeRange.durationSeconds);

fetch('/data/titan-export.json')
  .then(r => r.json())
  .then((data: SiteData) => applyDataset(data, 'titan-export.json'))
  .catch(err => console.warn('Titan data not found, using sample data:', err));
