import type { FaceDetection as FaceDetectionModel } from '@mediapipe/face_detection';
import type { SelfieSegmentation as SelfieModel } from '@mediapipe/selfie_segmentation';
import type { Face, Photo } from './types';
import { loadImage } from './photos';

type Result = { processed?: Photo; face?: Face; warning?: string; error?: string };
type Message = {id:string;blob?:Blob;width:number;height:number;error?:string};
let worker: Worker | undefined;
let detector: FaceDetectionModel | undefined;
let segmenter: SelfieModel | undefined;
let queue = Promise.resolve();

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Hasil pemrosesan tidak dapat dibaca.'));
    reader.readAsDataURL(blob);
  });
}

function script(path:string) {
  return new Promise<void>((resolve,reject) => {
    const tag = document.createElement('script');
    tag.src = path;
    tag.addEventListener('load',() => resolve(),{once:true});
    tag.addEventListener('error',() => {tag.remove();reject(new Error('Model foto tidak dapat dimuat.'));},{once:true});
    document.head.append(tag);
  });
}

function overlap(first: Face, second: Face) {
  const width = Math.max(0,Math.min(first.x+first.w,second.x+second.w)-Math.max(first.x,second.x));
  const height = Math.max(0,Math.min(first.y+first.h,second.y+second.h)-Math.max(first.y,second.y));
  return width*height/Math.min(first.w*first.h,second.w*second.h);
}

async function detect(image: HTMLCanvasElement) {
  if (!detector) {
    const root = '/models/face_detection/';
    const globals = window as typeof window & {FaceDetection?:typeof FaceDetectionModel};
    if (!globals.FaceDetection) await script(root+'face_detection.js');
    if (!globals.FaceDetection) throw new Error('Detektor wajah tidak tersedia.');
    detector = new globals.FaceDetection({locateFile:file => root+file});
    detector.setOptions({model:'short',minDetectionConfidence:.5});
  }
  const model = detector;
  const candidates: Face[] = [];
  async function scan(surface:HTMLCanvasElement, region:Face) {
    model.onResults(({detections}) => {
      for (const {boundingBox:box} of detections) {
        if (!box.width || !box.height) continue;
        candidates.push({
          x:region.x+(box.xCenter-box.width/2)*region.w,
          y:region.y+(box.yCenter-box.height/2)*region.h,
          w:box.width*region.w,
          h:box.height*region.h,
        });
      }
    });
    await model.send({image:surface});
  }
  await scan(image,{x:0,y:0,w:1,h:1});
  // Small faces in group photos are easier for BlazeFace to see on overlapping tiles.
  if (image.width>image.height*1.15 && image.width>=400) {
    const tile=document.createElement('canvas');
    tile.width=Math.round(image.width*.48);
    tile.height=Math.round(image.height*.65);
    const ctx=tile.getContext('2d');
    if (ctx) for (const y of [0,.35]) for (const x of [0,.26,.52]) {
      ctx.drawImage(image,x*image.width,y*image.height,tile.width,tile.height,0,0,tile.width,tile.height);
      await scan(tile,{x,y,w:tile.width/image.width,h:tile.height/image.height});
    }
  }
  const faces: Face[] = [];
  for (const face of candidates.sort((a,b) => b.w*b.h-a.w*a.h)) {
    if (!faces.some(known => overlap(known,face)>.43)) faces.push(face);
  }
  return {face:faces[0],multiple:faces.length>1};
}

async function inferMask(image: HTMLCanvasElement) {
  if (!segmenter) {
    const root = '/models/selfie_segmentation/';
    const globals = window as typeof window & {SelfieSegmentation?:typeof SelfieModel};
    if (!globals.SelfieSegmentation) await script(root+'selfie_segmentation.js');
    if (!globals.SelfieSegmentation) throw new Error('Model segmentasi tidak tersedia.');
    segmenter = new globals.SelfieSegmentation({locateFile:file => root+file});
  }
  segmenter.setOptions({modelSelection:image.width>=image.height?1:0});
  let mask: ImageBitmap | undefined;
  segmenter.onResults(async result => { mask = await createImageBitmap(result.segmentationMask); });
  await segmenter.send({image});
  if (!mask) throw new Error('Model tidak menghasilkan masker.');
  return mask;
}

async function composite(input: HTMLCanvasElement, mask: ImageBitmap): Promise<Photo> {
  const image = await createImageBitmap(input);
  worker ??= new Worker('/models/photo-worker.js');
  const current = worker;
  return new Promise((resolve,reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timeout);
      current.removeEventListener('message', onMessage);
      current.removeEventListener('error', onError);
    };
    const onError = () => {
      cleanup();
      if (worker === current) { worker.terminate(); worker = undefined; }
      reject(new Error('Worker pemrosesan lokal tidak tersedia.'));
    };
    const timeout = setTimeout(onError,30_000);
    const onMessage = async (event: MessageEvent<Message>) => {
      const data = event.data;
      if (data.id !== id) return;
      cleanup();
      try {
        if (!data.blob) throw new Error(data.error || 'Latar tidak dapat dihapus.');
        resolve({src:await toDataUrl(data.blob),width:data.width,height:data.height});
      } catch (error) { reject(error); }
    };
    current.addEventListener('message', onMessage);
    current.addEventListener('error', onError);
    try { current.postMessage({id,image,mask},[image,mask]); } catch { image.close();mask.close();onError(); }
  });
}

async function analyze(photo:Photo,onProgress:(message:string)=>void): Promise<Result> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return {error:'Browser ini tidak mendukung pemrosesan lokal. Foto asli tetap dapat digunakan.'};
  }
  const input = document.createElement('canvas');
  const ratio = Math.min(1,1800/Math.max(photo.width,photo.height));
  input.width = Math.max(1,Math.round(photo.width*ratio));
  input.height = Math.max(1,Math.round(photo.height*ratio));
  const ctx = input.getContext('2d');
  if (!ctx) return {error:'Kanvas browser tidak tersedia.'};
  ctx.drawImage(await loadImage(photo.src),0,0,input.width,input.height);
  let face: Face | undefined, multiple = false;
  try { ({face,multiple} = await detect(input)); }
  catch(error) { console.warn('Deteksi wajah Akhirnya!:',error);detector=undefined; }
  onProgress('Menghapus latar');
  try {
    const processed = await composite(input,await inferMask(input));
    const warning = multiple ? 'Beberapa wajah terdeteksi. Periksa hasil potong.' : !face ? 'Wajah tidak terdeteksi. Atur potongan secara manual bila perlu.' : undefined;
    return {processed,face,warning};
  } catch(error) {
    console.warn('Segmentasi Akhirnya!:',error);
    return {face,error:'Latar tidak dapat dihapus. Foto asli tetap dapat digunakan.'};
  }
}

export function processPhoto(photo: Photo, onProgress: (message: string) => void) {
  const task = queue.then(() => analyze(photo,onProgress));
  queue = task.then(() => {},() => {});
  return task;
}
