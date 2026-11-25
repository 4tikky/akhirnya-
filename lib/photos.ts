import type { Adjustments, Face, Graduate, Photo } from './types';

export const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const photoLimit = 20 * 1024 * 1024;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    image.src = src;
  });
}

export async function readPhoto(file: File): Promise<Photo> {
  if (!photoTypes.includes(file.type) || file.size > photoLimit || !file.size) throw new Error('Gunakan JPG, PNG, atau WebP, maksimal 20 MB per foto.');
  const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137,80,78,71,13,10,26,10].every((byte,index) => bytes[index] === byte);
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!(jpeg || png || webp)) throw new Error('Isi file bukan gambar JPG, PNG, atau WebP.');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width*height > 100_000_000) throw new Error('Dimensi gambar tidak didukung (maksimal 100 megapiksel).');
    const src = await new Promise<string>((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsDataURL(file);
    });
    return { src,width,height };
  } finally { URL.revokeObjectURL(url); }
}

export function filterStyle(a: Adjustments, mono = false) {
  return `brightness(${1+a.brightness/140+a.exposure/180}) contrast(${1+a.contrast/110}) saturate(${1+a.saturation/100}) sepia(${Math.max(0,a.warmth)/235}) hue-rotate(${Math.min(0,a.warmth)*.22}deg) grayscale(${mono ? 1 : a.grayscale/100})`;
}

export function activePhoto(person: Graduate) {
  return (person.useCutout && person.processed) || person.original;
}

export function portraitCrop(photo: Photo, ratio: number, face?: Face, crop?: Face): Face {
  if (crop) {
    const regionWidth = crop.w*photo.width, regionHeight = crop.h*photo.height;
    const h = Math.min(regionHeight,regionWidth/ratio), w = h*ratio;
    return {x:crop.x*photo.width+(regionWidth-w)/2,y:crop.y*photo.height+(regionHeight-h)/2,w,h};
  }
  const {width,height} = photo;
  const natural = Math.min(height,width/ratio);
  const preferred = face ? Math.min(natural, Math.max(face.h*height*3.35, face.w*width*2.7/ratio, natural*.45)) : natural;
  const w = preferred * ratio;
  const centerX = (face ? face.x + face.w/2 : .5) * width;
  const top = face ? (face.y+face.h/2)*height-preferred*.34 : (height-preferred)*.30;
  return { x:Math.max(0, Math.min(width-w,centerX-w/2)),y:Math.max(0,Math.min(height-preferred,top)),w,h:preferred };
}

function sharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const pixels = ctx.getImageData(0,0,width,height);
  const old = new Uint8ClampedArray(pixels.data);
  const level = amount / 500;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const offset = (y * width + x) * 4;
      if (!old[offset+3] || [offset-4,offset+4,offset-width*4,offset+width*4].some(neighbor => old[neighbor+3] < 240)) continue;
      for (let channel = 0; channel < 3; channel++) {
        const pos = offset + channel;
        pixels.data[pos] = old[pos] + level*(old[pos]*4-old[pos-4]-old[pos+4]-old[pos-width*4]-old[pos+width*4]);
      }
    }
  }
  ctx.putImageData(pixels,0,0);
}

const portraits = new Map<string, Promise<string>>();
let photoCache = new WeakMap<Photo, number>();
let photoIndex = 0;

export function releasePortraitCache() {
  portraits.clear();
  photoCache = new WeakMap();
}

export function renderPortrait(person: Graduate, ratio: number, mono: boolean) {
  const photo = activePhoto(person);
  if (!photo) return;
  if (!photoCache.has(photo)) photoCache.set(photo,++photoIndex);
  const key = JSON.stringify([photoCache.get(photo),ratio.toFixed(3),mono,person.crop,person.face,person.adjustments]);
  const cached = portraits.get(key);
  if (cached) return cached;
  const task = (async () => {
    const source = await loadImage(photo.src);
    const crop = portraitCrop(photo,ratio,person.face,person.crop);
    const scale = Math.min(1,1800/Math.max(crop.w,crop.h));
    const target = document.createElement('canvas');
    target.width = Math.max(1,Math.round(crop.w*scale));
    target.height = Math.max(1,Math.round(crop.h*scale));
    const ctx = target.getContext('2d', { willReadFrequently: person.adjustments.sharpness > 0 });
    if (!ctx) throw new Error('Pemrosesan kanvas tidak tersedia.');
    ctx.filter = filterStyle(person.adjustments,mono);
    ctx.drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,target.width,target.height);
    sharpen(ctx,target.width,target.height,person.adjustments.sharpness);
    return target.toDataURL(person.useCutout && person.processed || photo.src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', .94);
  })();
  if (portraits.size >= 36) {
    const oldest = portraits.keys().next().value;
    if (oldest) portraits.delete(oldest);
  }
  portraits.set(key,task);
  void task.catch(() => portraits.delete(key));
  return task;
}
