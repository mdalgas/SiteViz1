import type { SiteData, SiteEvent } from '../types';

export function buildEvents(data: SiteData): SiteEvent[] {
  const events: SiteEvent[] = [];
  for (const asset of data.assets) {
    const snaps = asset.snapshots;
    if (!snaps.length) continue;

    const firstT = snaps[0].t;
    const lastT  = snaps[snaps.length - 1].t;

    events.push({ t: firstT, type: 'arrive', assetId: asset.id, label: asset.label, modelKey: asset.modelKey, color: asset.color });

    const workSnaps = snaps.filter(s => s.state === 'working').length;
    const activePercent = Math.round((workSnaps / snaps.length) * 100);
    const durationHours = parseFloat(((lastT - firstT) / 3600).toFixed(1));

    events.push({ t: lastT, type: 'depart', assetId: asset.id, label: asset.label, modelKey: asset.modelKey, color: asset.color, durationHours, activeWorkPercent: activePercent });
  }
  return events.sort((a, b) => a.t - b.t);
}
