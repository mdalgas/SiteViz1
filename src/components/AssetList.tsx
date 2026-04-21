import { useMemo } from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useClockStore } from '../stores/clockStore';
import { useUiStore } from '../stores/uiStore';
import { interpolatePose } from '../utils/interpolate';
import { computeAssetStats, formatDuration } from '../utils/assetStats';
import type { Asset, AssetState } from '../types';

const STATE_LABEL: Record<AssetState, string> = {
  working: 'Working',
  moving:  'Moving',
  idle:    'Idle',
  off:     'Off',
};

const STATE_DOT: Record<AssetState, string> = {
  working: '#ef4444',
  moving:  '#3b82f6',
  idle:    '#eab308',
  off:     '#475569',
};

const STATE_ICON: Record<AssetState, string> = {
  working: '⚙',
  moving:  '▶',
  idle:    '◉',
  off:     '■',
};

// Bar segments + percent labels iterate these in render order; excludes 'off'
// since off-site time isn't charted.
const ON_SITE_STATES: readonly AssetState[] = ['working', 'moving', 'idle'];

const BUCKET_SECONDS = 120;

/** Split "EVAL-RENTAL-01 · Genie S-45" into name + assetType.
 *  Labels without the separator return assetType = null. */
function splitLabel(label: string): { name: string; assetType: string | null } {
  const idx = label.indexOf(' · ');
  if (idx === -1) return { name: label, assetType: null };
  return { name: label.slice(0, idx), assetType: label.slice(idx + 3) };
}

export function AssetList() {
  const siteData        = useDatasetStore(s => s.siteData);
  const t               = useClockStore(s => s.t);
  const focusedAssetId  = useUiStore(s => s.focusedAssetId);
  const setFocusedAsset = useUiStore(s => s.setFocusedAsset);

  return (
    <div
      data-asset-list=""
      className="fixed left-3 top-16 z-10 w-64 rounded-xl flex flex-col"
      style={{
        background: 'rgba(8,10,16,0.90)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxHeight: 'calc(100vh - 5rem)',
      }}
    >
      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 shrink-0">
        Assets on site
      </div>

      <div className="divide-y divide-white/5 overflow-y-auto">
        {siteData.assets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            t={t}
            isFocused={focusedAssetId === asset.id}
            onFocus={() => setFocusedAsset(focusedAssetId === asset.id ? null : asset.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface AssetCardProps {
  asset: Asset;
  t: number;
  isFocused: boolean;
  onFocus: () => void;
}

function AssetCard({ asset, t, isFocused, onFocus }: AssetCardProps) {
  // Live pose — runs every frame to keep the state badge current
  const pose = interpolatePose(asset.snapshots, t);
  const onSite = pose !== null && pose.state !== 'off';
  const currentState: AssetState = pose?.state ?? 'off';

  // Throttled stats — bucket-indexed so we recompute once per BUCKET_SECONDS.
  // Passing bucket-derived seconds (not live `t`) keeps the memo honest.
  const bucket = Math.floor(t / BUCKET_SECONDS);
  const stats = useMemo(
    () => computeAssetStats(asset.snapshots, bucket * BUCKET_SECONDS),
    [asset.snapshots, bucket],
  );

  const { name, assetType } = splitLabel(asset.label);

  const dotColor = onSite ? STATE_DOT[currentState] : '#1e293b';
  const dotGlow  = onSite ? `0 0 6px ${STATE_DOT[currentState]}` : 'none';

  const timeLabel =
    stats.phase === 'not_yet'
      ? 'Not on site yet'
      : `On site: ${formatDuration(stats.onSiteSeconds)}`;

  const showBar = stats.phase !== 'not_yet' && stats.onSiteSeconds > 0;

  return (
    <div
      onClick={onFocus}
      className="px-3 py-2.5 transition-all cursor-pointer"
      style={{
        opacity:    stats.phase === 'not_yet' ? 0.45 : 1,
        background: isFocused ? `${asset.color}12` : 'transparent',
        boxShadow:  isFocused ? `inset 2px 0 0 ${asset.color}` : 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: dotColor, boxShadow: dotGlow }}
        />
        <span
          className="flex-1 text-xs font-semibold text-white truncate"
          style={{ fontFamily: 'monospace' }}
        >
          {name}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: onSite ? `${STATE_DOT[currentState]}22` : 'transparent',
            color:      onSite ? STATE_DOT[currentState] : '#475569',
            border:     `1px solid ${onSite ? STATE_DOT[currentState] + '44' : 'transparent'}`,
          }}
        >
          {onSite ? STATE_LABEL[currentState] : 'Off site'}
        </span>
      </div>

      {assetType && (
        <div className="text-xs ml-4 mb-1" style={{ color: '#64748b' }}>
          {assetType}
        </div>
      )}

      <div
        className="text-xs ml-4 mb-2"
        style={{ color: stats.phase === 'not_yet' ? '#475569' : '#94a3b8' }}
      >
        {timeLabel}
        {stats.phase === 'departed' && (
          <span className="ml-1" style={{ color: '#475569' }}>(departed)</span>
        )}
      </div>

      {showBar && (
        <>
          <div
            className="ml-4 h-1.5 rounded-full overflow-hidden flex"
            style={{ background: '#1e293b', width: 'calc(100% - 1rem)' }}
          >
            {ON_SITE_STATES.map(s =>
              stats.statePercents[s] > 0 ? (
                <div
                  key={s}
                  style={{
                    width:      `${stats.statePercents[s]}%`,
                    background: STATE_DOT[s],
                    transition: 'width 0.3s ease',
                  }}
                />
              ) : null,
            )}
          </div>

          <div className="flex gap-2.5 mt-1 ml-4">
            {ON_SITE_STATES.map(s =>
              stats.statePercents[s] > 0 ? (
                <span key={s} className="text-xs" style={{ color: STATE_DOT[s] }}>
                  {STATE_ICON[s]} {stats.statePercents[s]}%
                </span>
              ) : null,
            )}
          </div>
        </>
      )}
    </div>
  );
}
