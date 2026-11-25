import { Canvas, Ellipse, FabricImage, FabricObject, Group, Polygon, Rect, StaticCanvas, Textbox } from 'fabric';
import { loadDesignFonts } from './design-fonts';
import type { Design, DesignNode, Project, ShapeNode } from './types';
import { renderPortrait } from './photos';

export type GradObject = FabricObject & { gradId?: string; label?: string; decorative?: boolean; locked?: boolean };
FabricObject.customProperties = [...new Set([...FabricObject.customProperties,'gradId','label','decorative','locked','selectable','evented','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','hasControls'])];

export function makeShape(node: ShapeNode) {
  const {x,y,w,h,fill,stroke,rotation,shape} = node;
  const style = {left:x,top:y,fill,stroke,strokeWidth:stroke ? 2 : 0,angle:rotation ?? 0,objectCaching:false};
  if (shape === 'ellipse') return new Ellipse({...style,rx:w/2,ry:h/2});
  if (shape === 'rect' || shape === 'bubble') return new Rect({...style,width:w,height:h,rx:shape === 'bubble' ? w*.22 : 0,ry:shape === 'bubble' ? h*.22 : 0});
  const points = shape === 'diamond' ? [{x:w/2,y:0},{x:w,y:h/2},{x:w/2,y:h},{x:0,y:h/2}] :
    Array.from({length:8},(_,i) => {
      const angle = i*Math.PI/4-Math.PI/2, radius = i%2 ? .16 : .5;
      return {x:w*(.5+Math.cos(angle)*radius),y:h*(.5+Math.sin(angle)*radius)};
    });
  return new Polygon(points,style);
}

async function makeObject(node: DesignNode, project: Project): Promise<GradObject | undefined> {
  if (node.kind === 'shape') {
    const shape: GradObject = makeShape(node);
    shape.set({ evented:false, selectable:false });
    shape.decorative = true;
    shape.label = 'Dekorasi';
    return shape;
  }
  if (node.kind === 'text') {
    const text: GradObject = new Textbox(node.text,{left:node.x,top:node.y,width:node.w,fontFamily:node.font,fontWeight:node.weight,fontSize:node.fontSize,fill:node.color,textAlign:node.align,lineHeight:1.12,splitByGrapheme:true,charSpacing:node.spacing ?? 0,objectCaching:false});
    text.label = node.text.replaceAll('\n',' ');
    text.gradId = node.graduateId;
    text.top = node.y + Math.max(0,(node.h - text.height)/2);
    return text;
  }
  if (node.kind === 'logo' && project.logo) {
    const logo = await FabricImage.fromURL(project.logo.src);
    logo.scale(Math.min(node.w/logo.width,node.h/logo.height));
    logo.set({left:node.x,top:node.y});
    (logo as GradObject).label = 'Logo kampus';
    return logo;
  }
  if (node.kind !== 'portrait') return;
  const person = project.graduates.find(item => item.id === node.graduateId);
  if (!person) return;
  const src = await renderPortrait(person,node.w/node.h,!!node.monochrome);
  if (!src) throw new Error(`Foto ${person.name} belum tersedia.`);
  const image: GradObject = await FabricImage.fromURL(src);
  const frame = node.frame === 'transparent' ? 0 : Math.min(node.w,node.h)*.018;
  image.set({left:node.x+frame,top:node.y+frame,scaleX:(node.w-frame*2)/image.width,scaleY:(node.h-frame*2)/image.height,angle:node.rotation,objectCaching:false});
  image.label = person.name;
  image.gradId = person.id;
  if (!frame) return image;
  const border: GradObject = new Rect({left:node.x,top:node.y,width:node.w,height:node.h,fill:node.frame,strokeWidth:0,angle:node.rotation,selectable:false,evented:false});
  border.label = 'Bingkai foto';
  border.decorative = true;
  const group: GradObject = new Group([border,image],{objectCaching:false});
  group.label = person.name;
  group.gradId = person.id;
  return group;
}

export async function populate(canvas: Canvas | StaticCanvas, design: Design, project: Project) {
  await loadDesignFonts();
  if (design.canvas) return void await canvas.loadFromJSON(design.canvas);
  const objects = await Promise.all(design.nodes.map(node => makeObject(node,project)));
  canvas.clear();
  canvas.backgroundColor = design.palette.bg;
  canvas.add(...objects.filter((node): node is GradObject => !!node));
  canvas.requestRenderAll();
}

export async function previewDesign(design: Design, project: Project, width = 720) {
  const canvas = new StaticCanvas(document.createElement('canvas'),{width:design.dimensions.width,height:design.dimensions.height,enableRetinaScaling:false,renderOnAddRemove:false});
  try {
    await populate(canvas,design,project);
    return canvas.toDataURL({format:'jpeg',quality:.87,multiplier:width/design.dimensions.width});
  } finally { await canvas.dispose(); }
}

export function serializeCanvas(canvas: Canvas | StaticCanvas) {
  return canvas.toObject(['gradId','label','decorative','locked','selectable','evented','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','hasControls']) as Record<string,unknown>;
}

export function portraitImage(object?: FabricObject): FabricImage | undefined {
  if (object instanceof FabricImage) return object;
  if (object instanceof Group && (object as GradObject).gradId) return object.getObjects().find((item): item is FabricImage => item instanceof FabricImage);
}
