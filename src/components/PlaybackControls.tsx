import { usePlayback } from '../stores/playbackStore';
import type { VisualizationMode } from '../types';

const SPEEDS = [60, 300, 1000, 3000, 9000];

function formatTime(seconds: number, startISO: string, durationSeconds: number): string {
  const base = new Date(startISO).getTime();
  const d = new Date(base + seconds * 1000);
  if (durationSeconds > 3600 * 24) {
    // Multi-day: show "Tue 08 Apr 14:30"
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function PlaybackControls() {
  const { t, playing, speed, duration, mode, siteData, setT, setPlaying, setSpeed, setMode, reset } = usePlayback();
  const progress = t / duration;
  const startISO = siteData.timeRange.start;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setT(p * duration);
  };

  const modeOptions: { value: VisualizationMode; label: string }[] = [
    { value: 'trails',  label: 'Trails' },
    { value: 'heatmap', label: 'Heatmap' },
    { value: 'both',    label: 'Both' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-2 px-4 py-3"
      style={{ background: 'rgba(8,10,16,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Scrubber */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-mono w-24 shrink-0">
          {formatTime(0, startISO, duration)}
        </span>

        <div
          className="relative flex-1 h-2 rounded-full cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={handleScrub}
        >
          {/* Filled track */}
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: '#f59e0b', transition: 'width 0.05s' }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white"
            style={{ left: `calc(${progress * 100}% - 7px)`, background: '#f59e0b' }}
          />
        </div>

        <span className="text-xs text-gray-500 font-mono w-24 shrink-0 text-right">
          {formatTime(duration, startISO, duration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="text-gray-400 hover:text-white transition-colors text-lg w-7 h-7 flex items-center justify-center"
            title="Reset"
          >
            ⏮
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold text-lg transition-transform hover:scale-110"
            style={{ background: '#f59e0b' }}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Current time */}
        <div className="font-mono text-sm text-white">
          {formatTime(t, startISO, duration)}
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
              style={{
                background: speed === s ? '#f59e0b' : 'rgba(255,255,255,0.07)',
                color: speed === s ? '#000' : '#9ca3af',
              }}
            >
              {s >= 1000 ? `${s/1000}k` : s}×
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-md p-0.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          {modeOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setMode(o.value)}
              className="px-2.5 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: mode === o.value ? 'rgba(245,158,11,0.2)' : 'transparent',
                color: mode === o.value ? '#f59e0b' : '#6b7280',
                border: mode === o.value ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
