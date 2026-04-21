/**
 * Bridges clockStore.advance() with the event/toast side effect so clockStore
 * stays a leaf (no cross-store imports). Called once per frame from the R3F
 * playback clock.
 */
import { useClockStore } from './clockStore';
import { useDatasetStore } from './datasetStore';
import { useUiStore } from './uiStore';

export function tickPlayback(delta: number) {
  const clock = useClockStore.getState();
  if (!clock.playing) return;

  const prevT = clock.t;
  clock.advance(delta);
  const nextT = useClockStore.getState().t;
  if (nextT === prevT) return;

  const events = useDatasetStore.getState().events;
  const fired = events.filter(e => e.t > prevT && e.t <= nextT);
  if (fired.length) useUiStore.getState().pushToasts(fired);
}

export function resetPlayback() {
  useClockStore.getState().reset();
  useUiStore.getState().clearToasts();
}
