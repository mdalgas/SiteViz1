import { create } from 'zustand';

interface ClockState {
  t: number;
  playing: boolean;
  speed: number;
  duration: number;

  setT: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  /** Advance t by `delta` seconds of wall time, scaled by `speed`. No event/toast side effects. */
  advance: (delta: number) => void;
  /** Reset playhead to zero and pause. */
  reset: () => void;
  /** Called by datasetStore when a new dataset is applied. */
  applyDuration: (duration: number) => void;
}

export const useClockStore = create<ClockState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 10,
  duration: 0,

  setT: (t) => {
    const { duration } = get();
    set({ t: Math.max(0, Math.min(duration, t)) });
  },
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),

  advance: (delta) => {
    const { t, speed, duration } = get();
    if (t >= duration) { set({ playing: false }); return; }
    set({ t: Math.min(t + delta * speed, duration) });
  },

  reset: () => set({ t: 0, playing: false }),

  applyDuration: (duration) => set({ duration, t: 0, playing: false }),
}));
