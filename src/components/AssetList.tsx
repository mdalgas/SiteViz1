import { useMemo } from 'react';
import { usePlayback } from '../stores/playbackStore';
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

/** Split "EVAL-RENTAL-01 · Genie S-45" into name + assetType.
 *  Labels without the separator return assetType = null. */
function splitLabel(label: string): { name: string; assetType: string | null } {
  const idx = label.indexOf(' · ');
  if (idx === -1) return { name: label, assetType: null };
  return { name: label.slice(0, idx), assetType: label.slice(idx + 3) };
}

// ─── Container ────────────────────────────────────────────────────────────────

export function AssetList() {
  const { siteData, t } = usePlayback();
  const bucket = Math.floor(t / 120); // throttle: recompute stats once per 120s slot

  return (
    <div
      className="fixed left-3 top-16 z-10 w-64 rounded-xl flex flex-col"
      style={{
        background: 'rgba(8,10,16,0.90)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxHeight: 'calc(100vh - 5rem)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 shrink-0">
        Assets on site
      </div>

      {/* Scrollable card list */}
      <div className="divide-y divide-white/5 overflow-y-auto">
        {siteData.assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} t={t} bucket={bucket} />
        ))}
      </div>
    </div>
  );
}

// ─── Per-asset card ────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: Asset;
  t: number;
  bucket: number;
}

function AssetCard({ asset, t, bucket }: AssetCardProps) {
  // Live pose — runs every frame to keep state badge current
  const pose = interpolatePose(asset.snapshots, t);
  const onSite = pose !== null && pose.state !== 'off';
  const currentState: AssetState = pose?.state ?? 'off';

  // Throttled stats — recompute once per 120s bucket
  const stats = useMemo(
    () => computeAssetStats(asset.snapshots, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asset.snapshots, bucket],
  );

  const { name, assetType } = splitLabel(asset.label);

  const dotColor  = onSite ? STATE_DOT[currentState] : '#1e293b';
  const dotGlow   = onSite && currentState !== 'off' ? `0 0 6px ${STATE_DOT[currentState]}` : 'none';

  const timeLabel =
    stats.phase === 'not_yet'
      ? 'Not on site yet'
      : `On site: ${formatDuration(stats.onSiteSeconds)}`;

  const showBar = stats.phase !== 'not_yet' && stats.onSiteSeconds > 0;

  return (
    <div
      className="px-3 py-2.5 transition-opacity"
      style={{ opacity: stats.phase === 'not_yet' ? 0.45 : 1 }}
    >
      {/* Row 1 — dot + name + state badge */}
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

      {/* Row 2 — asset type (only when available) */}
      {assetType && (
        <div className="text-xs ml-4 mb-1" style={{ color: '#64748b' }}>
          {assetType}
        </div>
      )}

      {/* Row 3 — time on site */}
      <div
        className="text-xs ml-4 mb-2"
        style={{ color: stats.phase === 'not_yet' ? '#475569' : '#94a3b8' }}
      >
        {timeLabel}
        {stats.phase === 'departed' && (
          <span className="ml-1" style={{ color: '#475569' }}>(departed)</span>
        )}
      </div>

      {/* Rows 4-5 — state bar + percentages */}
      {showBar && (
        <>
          {/* Segmented bar */}
          <div
            className="ml-4 h-1.5 rounded-full overflow-hidden flex"
            style={{ background: '#1e293b', width: 'calc(100% - 1rem)' }}
          >
            {(['working', 'moving', 'idle'] as const).map(s =>
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

          {/* Percentage labels */}
          <div className="flex gap-2.5 mt-1 ml-4">
            {stats.statePercents.working > 0 && (
              <span className="text-xs" style={{ color: STATE_DOT.working }}>
                ⚙ {stats.statePercents.working}%
              </span>
            )}
            {stats.statePercents.moving > 0 && (
              <span className="text-xs" style={{ color: STATE_DOT.moving }}>
                ▶ {stats.statePercents.moving}%
              </span>
            )}
            {stats.statePercents.idle > 0 && (
              <span className="text-xs" style={{ color: STATE_DOT.idle }}>
                ◉ {stats.statePercents.idle}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
