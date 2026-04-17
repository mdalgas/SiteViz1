import type { AssetState } from '../types';

const STATE_COLORS: Record<AssetState, string> = {
  working: 'rgba(239,68,68,0.55)',    // red — high intensity
  moving:  'rgba(59,130,246,0.40)',   // blue — travel paths
  idle:    'rgba(234,179,8,0.30)',    // yellow — idle dwell
  off:     'rgba(100,116,139,0.10)',  // slate — very faint
};

const STATE_RADIUS: Record<AssetState, number> = {
  working: 16,
  moving:  11,
  idle:     9,
  off:      5,
};

export class HeatmapCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private siteSize: number;
  private res: number;
  dirty = true;

  constructor(siteSize: number, resolution = 512) {
    this.siteSize = siteSize;
    this.res = resolution;
    this.canvas = document.createElement('canvas');
    this.canvas.width = resolution;
    this.canvas.height = resolution;
    this.ctx = this.canvas.getContext('2d')!;
  }

  private toPixel(worldCoord: number): number {
    // world: -siteSize/2 .. siteSize/2 → pixel: 0..res
    return ((worldCoord + this.siteSize / 2) / this.siteSize) * this.res;
  }

  paint(worldX: number, worldZ: number, state: AssetState) {
    const px = this.toPixel(worldX);
    // CanvasTexture has flipY=true by default, which already inverts canvas Y → UV Y.
    // No manual flip needed: toPixel(worldZ) maps Z=-80(north)→py=0(canvas top)→UV top→world north ✓
    const py = this.toPixel(worldZ);
    const r = STATE_RADIUS[state];
    const grad = this.ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, STATE_COLORS[state]);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(px, py, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.dirty = true;
  }

  reset() {
    this.ctx.clearRect(0, 0, this.res, this.res);
    this.dirty = true;
  }
}
