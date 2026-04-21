import { useDatasetStore } from '../stores/datasetStore';

const DATASETS = [
  { file: 'titan-export.json',     label: 'Titan',     sub: 'Aalborg · 9 days · 4 assets' },
  { file: 'frankfurt-export.json', label: 'Frankfurt', sub: 'Region · 14 days · 8 assets' },
  { file: 'drammen-export.json',   label: 'Drammen',   sub: '3 days' },
];

export function DatasetSwitcher() {
  const currentDataset  = useDatasetStore(s => s.currentDataset);
  const loadingDataset  = useDatasetStore(s => s.loadingDataset);
  const loadDataset     = useDatasetStore(s => s.loadDataset);

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1 rounded-xl p-1"
      style={{
        background: 'rgba(8,10,16,0.90)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {DATASETS.map(ds => {
        const active = currentDataset === ds.file;
        return (
          <button
            key={ds.file}
            onClick={() => !active && !loadingDataset && loadDataset(ds.file)}
            disabled={loadingDataset}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: active ? 'rgba(59,130,246,0.25)' : 'transparent',
              border: `1px solid ${active ? 'rgba(59,130,246,0.5)' : 'transparent'}`,
              color: active ? '#93c5fd' : '#64748b',
              cursor: active || loadingDataset ? 'default' : 'pointer',
            }}
          >
            <div className="font-bold">{ds.label}</div>
            <div style={{ color: active ? '#60a5fa80' : '#475569', fontSize: '0.65rem' }}>{ds.sub}</div>
          </button>
        );
      })}
      {loadingDataset && (
        <div className="flex items-center px-2" style={{ color: '#60a5fa' }}>
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
