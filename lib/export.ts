import { StaticCanvas } from 'fabric';
import { brandName } from './brand';
import { populate, portraitImage } from './canvas';
import { exportDimensions } from './export-math';
import { activePhoto, portraitCrop } from './photos';
import type { Design, Project, Size } from './types';

export type ExportOptions = { format: 'png' | 'jpeg' | 'pdf'; dpi: number; size: Size; bleed: number; quality: number; transparent: boolean };

function pngChunk(type: string, data: Uint8Array) {
  const chunk = new Uint8Array(12+data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0,data.length);
  chunk.set(new TextEncoder().encode(type),4);
  chunk.set(data,8);
  let crc = -1;
  for (const byte of chunk.subarray(4,-4)) {
    crc ^= byte;
    for (let step=0;step<8;step++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  view.setUint32(chunk.length-4,(crc ^ -1) >>> 0);
  return chunk;
}

function pngMetadata(bytes: Uint8Array, dpi: number) {
  const pixelsPerMeter = Math.round(dpi/.0254);
  const density = new Uint8Array(9);
  const view = new DataView(density.buffer);
  view.setUint32(0,pixelsPerMeter);
  view.setUint32(4,pixelsPerMeter);
  density[8] = 1;
  const chunk = pngChunk('pHYs',density);
  const software = pngChunk('tEXt',new TextEncoder().encode(`Software\0${brandName}`));
  const headerEnd = 33;
  let offset = headerEnd;
  const input = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const chunks: Uint8Array<ArrayBuffer>[] = [Uint8Array.from(bytes.subarray(0,headerEnd)),chunk,software];
  while (offset+12 <= bytes.length) {
    const next = offset + 12 + input.getUint32(offset);
    if (input.getUint32(offset+4) !== 0x70485973) chunks.push(Uint8Array.from(bytes.subarray(offset,next)));
    offset = next;
  }
  return new Blob(chunks,{type:'image/png'});
}

export async function setRasterDpi(blob: Blob, dpi: number) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/png') return pngMetadata(bytes,dpi);
  const comment = new TextEncoder().encode(brandName);
  const marker = Uint8Array.of(255,254,0,comment.length+2);
  // Canvas JPEG output normally starts with a JFIF APP0 density header.
  if (String.fromCharCode(...bytes.slice(6,10)) === 'JFIF') {
    const view = new DataView(bytes.buffer);
    bytes[13] = 1;
    view.setUint16(14,dpi);
    view.setUint16(16,dpi);
    const endOfHeader = 4 + view.getUint16(4);
    return new Blob([bytes.subarray(0,endOfHeader),marker,comment,bytes.subarray(endOfHeader)],{type:blob.type});
  }
  const header = Uint8Array.of(255,224,0,16,74,70,73,70,0,1,1,1,0,0,0,0,0,0);
  const density = new DataView(header.buffer);
  density.setUint16(12,dpi);
  density.setUint16(14,dpi);
  return new Blob([bytes.subarray(0,2),header,marker,comment,bytes.subarray(2)],{type:blob.type});
}

export function saveFile(blob: Blob, filename: string) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url),30_000);
}

function toBlob(canvas: HTMLCanvasElement, format: string, quality: number) {
  return new Promise<Blob>((resolve,reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob); else reject(new Error('Browser tidak dapat mengekspor resolusi ini. Kurangi DPI dan coba lagi.'));
  },format,quality));
}

export function lowResolution(design: Design, project: Project, options: ExportOptions) {
  const output = exportDimensions(options.size,options.dpi);
  const sx = output.width/design.dimensions.width;
  const sy = output.height/design.dimensions.height;
  if (Array.isArray(design.canvas?.objects)) {
    const names = new Set<string>();
    const inspect = (items: unknown[], xScale: number, yScale: number) => {
      for (const object of items) {
        if (!object || typeof object !== 'object') continue;
        const props = object as Record<string,unknown>;
        if (props.visible === false || props.opacity === 0) continue;
        const x = xScale * (typeof props.scaleX === 'number' ? Math.abs(props.scaleX) : 1);
        const y = yScale * (typeof props.scaleY === 'number' ? Math.abs(props.scaleY) : 1);
        if (Array.isArray(props.objects)) inspect(props.objects,x,y);
        if (typeof props.type === 'string' && props.type.toLowerCase() === 'image' && (x > 1.01 || y > 1.01)) {
          names.add(typeof props.label === 'string' && props.label ? props.label : 'Foto di kanvas');
        }
      }
    };
    inspect(design.canvas.objects,sx,sy);
    return [...names];
  }
  return design.nodes.flatMap(node => {
    if (node.kind !== 'portrait') return [];
    const person = project.graduates.find(item => item.id === node.graduateId);
    const photo = person && activePhoto(person);
    if (!person || !photo) return [];
    const crop = portraitCrop(photo,node.w/node.h,person.face,person.crop);
    const scale = Math.min(1,1800/Math.max(crop.w,crop.h));
    return crop.w*scale < node.w*sx || crop.h*scale < node.h*sy ? [person.name] : [];
  });
}

export async function renderExport(design: Design, project: Project, options: ExportOptions) {
  const {dpi,size,bleed,format,quality,transparent} = options;
  const output = exportDimensions(size,dpi,bleed);
  if (!output.supported) throw new Error(`Dimensi melebihi batas browser. Gunakan maksimal sekitar ${output.maxDpi} DPI.`);
  const canvas = new StaticCanvas(document.createElement('canvas'),{...design.dimensions,enableRetinaScaling:false,renderOnAddRemove:false});
  try {
    await populate(canvas,design,project);
    for (const object of canvas.getObjects()) {
      const image = portraitImage(object);
      if (image) image.set({objectCaching:false});
    }
    if (transparent && format === 'png') canvas.backgroundColor = '';
    const bg = String(canvas.backgroundColor || (format === 'png' ? 'transparent' : '#ffffff'));
    const trimmed = exportDimensions(size,dpi);
    const scaleX = trimmed.width/design.dimensions.width;
    const scaleY = trimmed.height/design.dimensions.height;
    canvas.backgroundColor = '';
    canvas.setDimensions({width:output.width,height:output.height});
    canvas.setViewportTransform([scaleX,0,0,scaleY,(output.width-trimmed.width)/2,(output.height-trimmed.height)/2]);
    canvas.renderAll();
    const element = canvas.getElement();
    const ctx = element.getContext('2d');
    if (ctx && bg !== 'transparent') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,output.width,output.height);
      ctx.restore();
    }
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const image = await toBlob(element,'image/jpeg',quality);
      const userUnit = Math.max(1,Math.ceil(Math.max(output.widthMm,output.heightMm)/5080));
      const width = output.widthMm/userUnit, height = output.heightMm/userUnit;
      const pdf = new jsPDF({orientation:output.width>=output.height?'landscape':'portrait',unit:'mm',format:[width,height],userUnit,precision:8,compress:true});
      pdf.setProperties({title:project.name || brandName,creator:brandName});
      pdf.addImage(new Uint8Array(await image.arrayBuffer()),'JPEG',0,0,width,height);
      return pdf.output('blob');
    }
    return setRasterDpi(await toBlob(element,`image/${format}`,quality),dpi);
  } finally {
    await canvas.dispose();
  }
}
