import { create } from 'zustand';
import type { SiteEvent, VisualizationMode } from '../types';

interface UiState {
  mode: VisualizationMode;
  focusedAssetId: string | null;
  activeToasts: SiteEvent[];

  setMode: (m: VisualizationMode) => void;
  setFocusedAsset: (id: string | null) => void;
  dismissToast: (t: number, id: string) => void;
  pushToasts: (events: SiteEvent[]) => void;
  clearToasts: () => void;
}

const MAX_TOASTS = 6;

export const useUiStore = create<UiState>((set) => ({
  mode: 'trails',
  focusedAssetId: null,
  activeToasts: [],

  setMode: (mode) => set({ mode }),
  setFocusedAsset: (focusedAssetId) => set({ focusedAssetId }),
  dismissToast: (t, id) =>
    set(s => ({ activeToasts: s.activeToasts.filter(e => !(e.t === t && e.assetId === id)) })),
  pushToasts: (events) =>
    set(s => ({ activeToasts: [...s.activeToasts, ...events].slice(-MAX_TOASTS) })),
  clearToasts: () => set({ activeToasts: [] }),
}));
