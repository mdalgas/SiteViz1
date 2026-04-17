import { Scene } from './components/Scene';
import { PlaybackControls } from './components/PlaybackControls';
import { EventToastContainer } from './components/EventToast';
import { AssetList } from './components/AssetList';
import { DatasetSwitcher } from './components/DatasetSwitcher';
import { usePlayback } from './stores/playbackStore';

function TopBar() {
  const { siteData } = usePlayback();
  const { name } = siteData.site;
  const { start, end } = siteData.timeRange;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 h-12"
      style={{ background: 'rgba(8,10,16,0.92)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded" style={{ background: '#f59e0b' }} />
        <span className="font-bold text-white text-sm tracking-wide">{name}</span>
        <span className="text-gray-500 text-xs hidden sm:block">
          {fmt(start)} → {fmt(end)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.07)', color: '#6b7280' }}>Space</kbd>
        <span>play/pause</span>
        <span className="ml-2">
          <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.07)', color: '#6b7280' }}>[ ]</kbd>
          <span className="ml-1">speed</span>
        </span>
        <span className="ml-2">
          <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.07)', color: '#6b7280' }}>R</kbd>
          <span className="ml-1">reset</span>
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="w-full h-screen overflow-hidden" style={{ background: '#0a0e16' }}>
      <TopBar />
      {/* Fixed inset so R3F canvas always has pixel-perfect dimensions */}
      <div style={{ position: 'fixed', top: 48, bottom: 80, left: 0, right: 0 }}>
        <Scene />
      </div>
      <DatasetSwitcher />
      <AssetList />
      <PlaybackControls />
      <EventToastContainer />
    </div>
  );
}
