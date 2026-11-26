import { Ellipse, FabricImage, Group, Path, Rect, Shadow, loadSVGFromString, type FabricObject } from 'fabric';
import { hasCharacterFace, renderPortrait } from './photos';
import { assetSvg } from './scenes/assets';
import { paperEdge } from './scenes/vectors';
import type { ArtNode, Bounds, Graduate, PortraitNode, PortraitStyle } from './types';

const masks: Partial<Record<PortraitStyle,string>> = {
  organic:'M9 25C22 3 38 3 57 7c21 2 42 8 42 32 2 20-1 36-13 52-26 10-61 10-78-12C-2 66 0 39 9 25Z',
  arch:'M1 99V48a49 48 0 0 1 98 0v51Z',
  torn:paperEdge,
};
const clipMask = (style:PortraitStyle,w:number,h:number,center=false) => {
  const properties={originX:center?'center':'left',originY:center?'center':'top',strokeWidth:0,objectCaching:false} as const;
  if (style==='circle') return new Ellipse({...properties,rx:w/2,ry:h/2});
  if (!masks[style]) return new Rect({...properties,width:w,height:h,rx:Math.min(w,h)*.055,ry:Math.min(w,h)*.055});
  const shape=new Path(masks[style]!,properties);
  shape.set({scaleX:w/shape.width,scaleY:h/shape.height});
  return shape;
};

export async function sceneAsset(node:ArtNode) {
  const {objects}=await loadSVGFromString(assetSvg(node.asset,node.palette,node.seed));
  const vector=objects.filter((object):object is FabricObject=>!!object);
  if (!vector.length) throw new Error('Ilustrasi tidak dapat dibuka.');
  const asset=new Group(vector,{left:node.x,top:node.y,originX:'left',originY:'top',angle:node.rotation??0,opacity:node.opacity??1,objectCaching:false});
  asset.set({scaleX:node.w/asset.width,scaleY:node.h/asset.height});
  return asset;
}

function imageBox(image:FabricImage,box:Bounds,angle=0) {
  image.set({left:box.x,top:box.y,scaleX:box.w/image.width,scaleY:box.h/image.height,angle,objectCaching:false});
}

function contourImage(image:FabricImage, color:string, box:Bounds) {
  const width=image.width,height=image.height;
  const canvas=document.createElement('canvas');
  const pad=Math.max(1,Math.round(Math.min(width,height)*.035));
  canvas.width=width+pad*2;
  canvas.height=height+pad*2;
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  const source=image.getElement();
  for (let angle=0;angle<Math.PI*2;angle+=Math.PI/8) {
    ctx.drawImage(source,pad+Math.cos(angle)*pad*.9,pad+Math.sin(angle)*pad*.9);
  }
  ctx.globalCompositeOperation='source-in';
  ctx.fillStyle=color;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Serialize a local raster so the outline survives project save and reopen.
  const scaleX=box.w/width,scaleY=box.h/height;
  return {src:canvas.toDataURL('image/png'),x:box.x-pad*scaleX,y:box.y-pad*scaleY,w:canvas.width*scaleX,h:canvas.height*scaleY};
}

export async function scenePortrait(node:PortraitNode,graduate:Graduate) {
  const requested=node.presentation!;
  const character=requested==='character' && hasCharacterFace(graduate);
  const sticker=requested==='sticker' && !!(graduate.processed && graduate.useCutout);
  const presentation=requested==='character'||requested==='sticker' ? 'organic' : requested;
  const border=Math.min(node.w,node.h)*.045;
  const bottom=presentation==='polaroid'?border*1.8:border;
  const opening={x:node.x+border,y:node.y+border,w:node.w-border*2,h:node.h-border-bottom};
  const faceSize=Math.min(node.w*.67,node.h*.56);
  const face={x:node.x+(node.w-faceSize)/2,y:node.y+border,w:faceSize,h:faceSize};
  const visible=character?face:sticker?node:opening;
  const src=await renderPortrait(graduate,visible.w/visible.h,!!node.monochrome,character,true);
  if (!src) throw new Error(`Foto ${graduate.name} belum tersedia.`);
  const image=await FabricImage.fromURL(src);
  imageBox(image,visible);
  const items:FabricObject[]=[];

  if (character) {
    items.push(await sceneAsset({
      kind:'art',asset:'character',layer:'frame',label:'Tubuh ilustrasi',seed:0,x:node.x+node.w*.07,y:node.y+node.h*.43,w:node.w*.86,h:node.h*.57,
      palette:{bg:node.matte??'#fff5e4',ink:'#3c2944',accent:node.frame,soft:node.outline??'#fff5e4'},
    }));
    const disk=clipMask('circle',face.w+border,face.h+border);
    disk.set({left:face.x-border/2,top:face.y-border/2,fill:node.outline??'#fff4db'});
    items.push(disk);
    image.clipPath=clipMask('circle',image.width,image.height,true);
  } else if (sticker) {
    const contour=contourImage(image,node.outline??'#ffffff',node);
    if (contour) {
      const silhouette=await FabricImage.fromURL(contour.src);
      imageBox(silhouette,contour);
      Object.assign(silhouette,{label:'Kontur potret'});
      items.push(silhouette);
    }
  } else {
    const backing=clipMask(presentation,node.w,node.h);
    backing.set({left:node.x,top:node.y,fill:node.matte??'#fff4df',
      shadow:new Shadow({color:'#38292857',offsetX:border*.45,offsetY:border*.60,blur:border*.75})});
    items.push(backing);
    const edge=clipMask(presentation,opening.w+border*.46,opening.h+border*.46);
    edge.set({left:opening.x-border*.23,top:opening.y-border*.23,fill:node.frame});
    items.push(edge);
    image.clipPath=clipMask(presentation,image.width,image.height,true);
  }
  Object.assign(image,{gradId:graduate.id,label:graduate.name});
  return new Group([...items,image],{angle:node.rotation,objectCaching:false});
}
