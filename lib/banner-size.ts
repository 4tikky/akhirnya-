import type { Size } from './types';

export const landscapePresets = [{ width: 200, height: 100 }, { width: 300, height: 100 }, { width: 300, height: 150 }, { width: 400, height: 100 }, { width: 400, height: 200 }];
export const standPresets = [{ width: 60, height: 160 }, { width: 80, height: 180 }, { width: 85, height: 200 }, { width: 100, height: 200 }];
export const sizeHelp = 'Masukkan lebar dan tinggi antara 10 dan 1.000 cm. Untuk banner horizontal, lebar maksimal enam kali tinggi.';
export const MAX_LAYOUT_SIDE = 24000;

export function aspectClass({width,height}: Size) {
  return width < height ? 'portrait' : width > height ? 'landscape' : 'square';
}

export function validSize({width,height}: Size) {
  return Number.isFinite(width) && Number.isFinite(height) &&
    width >= 10 && height >= 10 && width <= 1000 && height <= 1000 && width / height <= 6;
}

export function formatSize({width,height}: Size) {
  const format = new Intl.NumberFormat('id-ID',{maximumFractionDigits:20});
  return `${format.format(width)} × ${format.format(height)} cm`;
}
