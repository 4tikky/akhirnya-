import type { ArtNode, Color, DesignNode, Size, TextNode } from '../types';
import type { SceneVariant } from './catalog';

function luminance(hex: string) {
  const values = hex.slice(1).match(/.{2}/g) ?? [];
  return values.reduce((total,value,index)=>{
    const c=Number.parseInt(value,16)/255;
    return total+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];
  },0);
}

function contrast(first:string,second:string) {
  const a=luminance(first), b=luminance(second);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

export function scoreScene(nodes:DesignNode[],dimensions:Size,variant:SceneVariant,palette:Color) {
  const art=nodes.filter((node):node is ArtNode=>node.kind==='art');
  const roles=new Set(art.map(node=>node.layer));
  if (!art.some(node=>node.asset===variant.back && node.layer==='background') ||
      !art.some(node=>node.layer==='environment') ||
      !art.some(node=>node.layer==='sticker') ||
      !art.some(node=>node.layer==='foreground'||node.layer==='texture')) return -1;

  const people=nodes.filter(node=>node.kind==='portrait');
  const names=nodes.filter((node):node is TextNode=>node.kind==='text'&&!!node.graduateId);
  const text=nodes.filter((node):node is TextNode=>node.kind==='text'&&!node.graduateId);
  const headline=text.reduce((largest,node)=>Math.max(largest,node.fontSize),0);
  const typicalName=names.reduce((sum,node)=>sum+node.fontSize,0)/Math.max(1,names.length);
  if (!people.length || !names.length || headline<typicalName || people.some(photo=>photo.presentation!==variant.treatment)) return -1;
  const canvasArea=dimensions.width*dimensions.height;
  const imageArea=people.reduce((sum,node)=>sum+node.w*node.h,0)/canvasArea;
  const accents=art.filter(node=>node.layer==='sticker');
  const accentArea=accents.reduce((sum,node)=>sum+node.w*node.h,0)/canvasArea;
  const half=dimensions.width/2;
  const xBalance=accents.reduce((sum,node)=>sum+node.x+node.w/2-half,0)/Math.max(1,accents.length);
  const contrastScore=Math.min(1,contrast(palette.ink,palette.bg)/7);
  const rhythm=Math.min(1,Math.max(0,(headline/typicalName-1)/2));
  const space=1-Math.min(1,Math.abs(imageArea-.24)*2);
  const decor=1-Math.min(1,Math.abs(xBalance)/half+Math.max(0,accentArea-.12)*4);
  return Math.min(7,roles.size)*.9 + rhythm*5 + contrastScore*4 + space*7 + decor*6;
}
