#!/usr/bin/env python3
"""
Process raw Trackunit GPS pages into drammen-export.json.

Usage:
  python3 scripts/process_drammen.py page1a.txt page1b.txt [page2a.txt ...]

Each .txt file is the raw JSON saved by the Trackunit MCP tool-results.
The script merges all pages, deduplicates, converts coords → local XZ,
infers state (moving / idle), and writes public/data/drammen-export.json.

Coordinate transform (same as Titan/Frankfurt):
  SCALE = 0.1  (1 Three.js unit = 10 real metres)
  x = (lon - centLon) * cos(centLat°) * 111320 * SCALE
  z = -(lat - centLat) * 111000 * SCALE

State inference:
  Speed between consecutive GPS points:
    > MOVING_THRESHOLD m/s  → 'moving'
    otherwise               → 'idle'
  Gap > GAP_THRESHOLD seconds between points → no snapshot (asset off-site)
"""

import json, math, sys, os
from pathlib import Path
from datetime import datetime, timezone

# ── Tuning constants ──────────────────────────────────────────────────────────
SCALE            = 0.1     # 1 unit = 10 m
MOVING_THRESHOLD = 0.5     # m/s  → 'moving'
GAP_THRESHOLD    = 7200    # 2 h  → break in presence (off-site gap)
SITE_NAME        = 'Drammen'
START_ISO        = '2026-04-13T00:00:00Z'
END_ISO          = '2026-04-16T00:00:00Z'

# Model assignment by asset type keyword (extend as needed)
MODEL_MAP = {
    'crane':      'car_19',
    'excavator':  'car_16',
    'loader':     'car_13',
    'telehandler':'car_16',
    'lift':       'car_06',
    'awp':        'car_06',
    'boom':       'car_06',
    'scissor':    'car_06',
    'utv':        'futuristic',
    'vehicle':    'futuristic',
}
DEFAULT_MODEL = 'car_06'

COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b',
          '#a855f7','#14b8a6','#f97316','#ec4899']

# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine_dist(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def ts_to_epoch(ts: str) -> int:
    """ISO 8601 → unix seconds (integer)."""
    return int(datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp())

def load_pages(*files):
    """Load all MCP result files and merge edges per alias."""
    merged: dict[str, list[dict]] = {}
    meta: dict[str, dict] = {}  # alias → {name, type, brand, model}

    for path in files:
        with open(path) as f:
            outer = json.load(f)
        text = outer[0]['text']
        data = json.loads(text)

        for alias, asset in data.items():
            edges = asset['locations']['historical']['edges']
            if alias not in merged:
                merged[alias] = []
                meta[alias] = {
                    'name':  asset.get('name', alias),
                    'type':  asset.get('type', ''),
                    'brand': asset.get('brand', ''),
                    'model': asset.get('model', ''),
                }
            merged[alias].extend(edges)

    # Deduplicate and sort each asset's points by timestamp
    for alias in merged:
        seen = {}
        for e in merged[alias]:
            ts = e['node']['timestamp']
            if ts not in seen:
                seen[ts] = e
        merged[alias] = sorted(seen.values(), key=lambda e: e['node']['timestamp'])

    return merged, meta

def pick_model(asset_type: str) -> str:
    t = (asset_type or '').lower()
    for kw, model in MODEL_MAP.items():
        if kw in t:
            return model
    return DEFAULT_MODEL

def build_label(name: str, brand: str, model: str, asset_type: str) -> str:
    """Build 'NAME · Brand Model' or 'NAME · Type' label."""
    parts = [p for p in [brand, model] if p]
    if parts:
        return f"{name} · {' '.join(parts)}"
    if asset_type:
        return f"{name} · {asset_type}"
    return name

def coords_to_xy(lat, lon, cent_lat, cent_lon):
    x =  (lon - cent_lon) * math.cos(math.radians(cent_lat)) * 111320 * SCALE
    z = -(lat - cent_lat) * 111000 * SCALE
    return x, z

def infer_snapshots(edges, cent_lat, cent_lon):
    """Convert raw GPS edges into Snapshot objects with state/speed."""
    points = []
    for e in edges:
        n = e['node']
        lat = n['coordinates']['latitude']
        lon = n['coordinates']['longitude']
        t   = ts_to_epoch(n['timestamp'])
        x, z = coords_to_xy(lat, lon, cent_lat, cent_lon)
        points.append({'t': t, 'lat': lat, 'lon': lon, 'x': x, 'z': z})

    snapshots = []
    epoch_start = ts_to_epoch(START_ISO)

    for i, p in enumerate(points):
        rel_t = p['t'] - epoch_start

        if i == 0:
            speed = 0.0
            state = 'idle'
        else:
            prev = points[i - 1]
            dt   = max(1, p['t'] - prev['t'])
            dist = haversine_dist(prev['lat'], prev['lon'], p['lat'], p['lon'])
            speed = dist / dt

            # Gap check — if previous point was too long ago, skip (handled by absence)
            if p['t'] - prev['t'] > GAP_THRESHOLD:
                # Don't add a snapshot; the interpolator will treat this as off-site
                continue

            state = 'moving' if speed > MOVING_THRESHOLD else 'idle'

        snapshots.append({
            't':       rel_t,
            'x':       round(p['x'], 2),
            'z':       round(p['z'], 2),
            'heading': 0,
            'speed':   round(speed, 2),
            'state':   state,
        })

    return snapshots

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    files = sys.argv[1:]
    if not files:
        print("Usage: python3 scripts/process_drammen.py <page1.txt> [page2.txt ...]")
        sys.exit(1)

    print(f"Loading {len(files)} page file(s)…")
    merged, meta = load_pages(*files)
    print(f"  Found {len(merged)} assets: {list(merged.keys())}")

    # Compute centroid from all GPS points
    all_lats, all_lons = [], []
    for alias, edges in merged.items():
        for e in edges:
            all_lats.append(e['node']['coordinates']['latitude'])
            all_lons.append(e['node']['coordinates']['longitude'])

    cent_lat = sum(all_lats) / len(all_lats)
    cent_lon = sum(all_lons) / len(all_lons)
    print(f"  Centroid: lat={cent_lat:.4f}, lon={cent_lon:.4f}")

    # Compute local-space bounding box to determine siteSize
    all_x, all_z = [], []
    for alias, edges in merged.items():
        for e in edges:
            lat = e['node']['coordinates']['latitude']
            lon = e['node']['coordinates']['longitude']
            x, z = coords_to_xy(lat, lon, cent_lat, cent_lon)
            all_x.append(x)
            all_z.append(z)

    span_x = max(all_x) - min(all_x)
    span_z = max(all_z) - min(all_z)
    site_size = round(max(span_x, span_z) * 1.4)  # 40% padding
    print(f"  Data span: {span_x:.0f} × {span_z:.0f} units → siteSize={site_size}")

    epoch_start = ts_to_epoch(START_ISO)
    epoch_end   = ts_to_epoch(END_ISO)
    duration    = epoch_end - epoch_start

    assets = []
    for i, (alias, edges) in enumerate(merged.items()):
        m = meta[alias]
        snaps = infer_snapshots(edges, cent_lat, cent_lon)
        if not snaps:
            print(f"  ⚠ {alias}: no usable snapshots, skipping")
            continue

        label     = build_label(m['name'], m['brand'], m['model'], m['type'])
        model_key = pick_model(m['type'])
        color     = COLORS[i % len(COLORS)]

        assets.append({
            'id':        alias,
            'label':     label,
            'modelKey':  model_key,
            'color':     color,
            'snapshots': snaps,
        })
        print(f"  ✓ {alias}: {len(snaps)} snapshots  label='{label}'")

    output = {
        'site': {
            'name':       SITE_NAME,
            'sizeMeters': site_size,
        },
        'timeRange': {
            'start':           START_ISO,
            'end':             END_ISO,
            'durationSeconds': duration,
        },
        'assets': assets,
    }

    out_path = Path(__file__).parent.parent / 'public' / 'data' / 'drammen-export.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    kb = out_path.stat().st_size / 1024
    print(f"\n✅ Written {out_path}  ({kb:.1f} KB, {len(assets)} assets)")

if __name__ == '__main__':
    main()
