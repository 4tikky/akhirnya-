import type { Size } from './types';

export const MAX_PIXELS = 40_000_000;
export const MAX_SIDE = 16384;
export function exportDimensions(size: Size, dpi: number, bleedMm = 0) {
  const cm = { width: size.width + bleedMm / 5, height: size.height + bleedMm / 5 };
  const width = Math.round(cm.width / 2.54 * dpi);
  const height = Math.round(cm.height / 2.54 * dpi);
  const maxDpi = Math.floor(2.54 * Math.min(MAX_SIDE / Math.max(cm.width, cm.height), Math.sqrt(MAX_PIXELS / (cm.width * cm.height))));
  return { width, height, widthMm: cm.width * 10, heightMm: cm.height * 10, maxDpi, supported: width > 0 && height > 0 && Math.max(width,height) <= MAX_SIDE && width * height <= MAX_PIXELS };
}
