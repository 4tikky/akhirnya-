import { customDesignSpec, type CustomDesignSpec } from './ai-design';
import { aspectClass, validSize } from './banner-size';
import { addPortraitComposition, type AddLayoutText } from './portrait-layout';
import { loadDesignFonts } from './design-fonts';
import { activePhoto, portraitCrop } from './photos';
import { getTheme } from './themes';
import { isPortraitStrategy, type Bounds, type Color, type Design, type DesignNode, type Project, type ShapeNode, type Size, type Strategy, type TextNode } from './types';

export type Measure = (text: string, font: string, size: number, weight: string) => number;
const estimate: Measure = (text, _, size) => [...text].reduce((width, char) => width + (/[MW@]/.test(char) ? .9 : /[il., ]/.test(char) ? .3 : .64), 0) * size;

function wrap(value: string, width: number, measure: (text: string) => number) {
  const lines: string[] = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const combined = line ? line + ' ' + word : word;
      if (measure(combined) <= width) { line = combined; continue; }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (line && measure(line + char) > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

function textNode(value: string, bounds: Bounds, font: string, weight: string, color: string, size: number, measure: Measure, align: TextNode['align'] = 'center'): TextNode {
  let lines;
  do {
    lines = wrap(value.trim(), bounds.w - 2, text => measure(text, font, size, weight));
    if (lines.length * size * 1.2 <= bounds.h) break;
    size *= .91;
  } while (size > .5);
  return { ...bounds, kind:'text', text:lines.join('\n'), font, weight, color, fontSize:size, align };
}

function random(seed: number) {
  let result = seed >>> 0;
  return () => {
    result = (Math.imul(result, 1664525) + 1013904223) >>> 0;
    return result / 4294967296;
  };
}

export function canvasSize(size: Size): Size {
  const longest = Math.max(size.width,size.height);
  if (aspectClass(size)==='portrait') {
    const ratio = size.width/size.height;
    return ratio >= .2 ? {width:1200*ratio,height:1200} : {width:240,height:240/ratio};
  }
  return {width:1200*(size.width/longest),height:1200*(size.height/longest)};
}

function decorations(texture: string, width: number, height: number, palette: Color, rng: () => number, portrait: boolean) {
  const nodes: ShapeNode[] = [];
  const add = (shape: ShapeNode['shape'], x: number, y: number, w: number, h: number, fill: string, stroke?: string, rotation?: number) =>
    nodes.push({ kind:'shape', shape, x, y, w, h, fill, stroke, rotation });
  if (texture === 'grid' || texture === 'paper' || texture === 'dots') {
    const interval = texture === 'grid' ? 45 : texture === 'paper' ? 21 : 36;
    if (texture === 'grid') {
      for (let x = interval; x < width; x += interval) add('rect',x,0,1,height,palette.soft);
      for (let y = interval; y < height; y += interval) add('rect',0,y,width,1,palette.soft);
    } else {
      for (let i = 0; i < 75; i++) {
        const w = (texture === 'paper' ? 1 : 3) + rng() * 5;
        add('ellipse',rng() * (width-w),rng() * (height-w),w,texture === 'paper' ? 1 : w,palette.soft);
      }
    }
  }
  if ((texture === 'film' && !portrait) || texture === 'burst') {
    const side = Math.min(width,height)*.88;
    add(texture === 'film' ? 'ellipse' : 'diamond', (width-side)/2,(height-side)/2,side,side,palette.soft);
    add('ellipse',10,10,side*.44,side*.44,palette.soft);
  }
  const border = Math.min(width,height) * .025;
  add('rect',border,border,width-border*2,height-border*2,'transparent',palette.accent);
  if (texture === 'paper' || texture === 'border' || texture === 'film') add('rect',border*1.35,border*1.35,width-border*2.7,height-border*2.7,'transparent',palette.soft);
  if (['dots','burst','grid'].includes(texture)) {
    for (const [x,y] of [[.045,.10],[.90,.10],[.045,.77],[.90,.77]]) {
      const side = Math.min(width,height)*(.04+rng()*.045);
      add(texture === 'burst' ? 'bubble' : 'star', x*width,y*height,side,side,palette.accent,undefined,rng()*24-12);
    }
  }
  return nodes;
}

function distribute(total: number, rows: number, strategy: Strategy) {
  const counts = Array.from({length:rows},(_, index) => Math.floor(total/rows) + (index < total % rows ? 1 : 0));
  if (strategy === 'pyramid') counts.sort((a,b) => a-b);
  return counts;
}

function rowCount(total: number, area: Bounds, strategy: Strategy, square: boolean) {
  if (total === 1) return 1;
  const forced = (strategy === 'rows' || square) && total > 2 ? 2 : 1;
  const minimum = total > 8 ? 2 : forced;
  let best = { rows:minimum, value:0 };
  for (let rows=minimum; rows<=Math.min(6,total); rows++) {
    const w = area.w / Math.ceil(total/rows);
    const h = area.h / rows;
    const fit = Math.min(w*.95,h*.72) * (1 - (rows-1)*.031);
    if (fit > best.value) best = { rows, value:fit };
  }
  return best.rows;
}

function footprint(node: DesignNode): Bounds {
  if (node.kind !== 'portrait' || !node.rotation) return node;
  const angle = node.rotation * Math.PI/180;
  const dx = node.w*Math.cos(angle), dy = node.w*Math.sin(angle);
  const ex = -node.h*Math.sin(angle), ey = node.h*Math.cos(angle);
  return {x:node.x+Math.min(0,dx,ex,dx+ex),y:node.y+Math.min(0,dy,ey,dy+ey),w:Math.abs(dx)+Math.abs(ex),h:Math.abs(dy)+Math.abs(ey)};
}

const inside = (a: Bounds, size: Size) => a.x >= -.01 && a.y >= -.01 && a.x+a.w <= size.width+.01 && a.y+a.h <= size.height+.01;
const overlap = (a: Bounds, b: Bounds) => a.x < b.x+b.w-.4 && b.x < a.x+a.w-.4 && a.y < b.y+b.h-.4 && b.y < a.y+a.h-.4;
export const scoreWeights = { readability: 30, area: 21, balance: 12, consistency: 10, alignment: 10, spacing: 9, faceVisibility: 8 };

export function scoreLayout(nodes: DesignNode[], size: Size, project: Project, weights = scoreWeights, strategy?: Strategy) {
  if (strategy && isPortraitStrategy(strategy)!==(aspectClass(project.size)==='portrait')) return -1;
  const content = nodes.filter(node => node.kind !== 'shape');
  const footprints = content.map(footprint);
  const portraits = nodes.filter(node => node.kind === 'portrait');
  if (portraits.length !== project.graduates.length ||
      new Set(portraits.map(node => node.graduateId)).size !== portraits.length ||
      project.graduates.some(graduate => !portraits.some(node => node.graduateId === graduate.id)) ||
      content.some((node,i) => !inside(footprints[i],size) || (node.kind === 'text' && node.fontSize < 2) || footprints.slice(i+1).some(other => overlap(footprints[i],other)))) return -1;
  const text = content.filter(node => node.kind === 'text');
  const names = text.filter(node => node.graduateId);
  if (names.length !== portraits.length || portraits.some(portrait => !names.some(name => name.graduateId===portrait.graduateId))) return -1;
  const readability = Math.min(1, Math.min(...text.map(node => node.fontSize)) / (Math.min(size.height,size.width)*.022));
  const area = portraits.reduce((sum,node) => sum + node.w*node.h,0) / (size.width*size.height);
  const average = portraits.reduce((sum,node) => sum+node.x+node.w/2,0)/portraits.length;
  const scale = Math.min(...portraits.map(node => node.h)) / Math.max(...portraits.map(node => node.h));
  const alignment = 1 - portraits.reduce((sum,node) => sum+Math.abs(node.rotation)/15,0)/portraits.length;
  const spacing = Math.min(1, Math.min(...portraits.map(node => Math.min(node.x, size.width-node.x-node.w, node.y,size.height-node.y-node.h))) / (Math.min(size.width,size.height)*.045));
  const faceVisibility = portraits.reduce((sum,node) => {
    const person = project.graduates.find(graduate => graduate.id === node.graduateId);
    const face = person?.face;
    const photo = person && activePhoto(person);
    if (!photo || !face) return sum+.9;
    const crop = portraitCrop(photo,node.w/node.h,face,person.crop);
    const visibleWidth = Math.max(0,Math.min(crop.x+crop.w,(face.x+face.w)*photo.width)-Math.max(crop.x,face.x*photo.width));
    const visibleHeight = Math.max(0,Math.min(crop.y+crop.h,(face.y+face.h)*photo.height)-Math.max(crop.y,face.y*photo.height));
    return sum + Math.min(1,(visibleWidth*visibleHeight)/(face.w*photo.width*face.h*photo.height));
  },0)/portraits.length;
  return weights.readability*readability + weights.area*Math.min(1,area*2.4) + weights.balance*(1-2*Math.abs(average/size.width-.5)) +
    weights.consistency*scale + weights.alignment*alignment + weights.spacing*spacing + weights.faceVisibility*faceVisibility;
}

export function generateFromSpec(project: Project, specification: unknown, measure: Measure = estimate) {
  const spec = customDesignSpec.parse(specification);
  return generateDesigns({...project,theme:spec.theme,headline:spec.headline},measure,spec);
}

export function generateDesigns(project: Project, measure: Measure = estimate, spec?: CustomDesignSpec): Design[] {
  if (!validSize(project.size) || !project.graduates.length || project.graduates.length > 20) return [];
  const theme = getTheme(project.theme);
  const dimensions = canvasSize(project.size);
  const {width,height} = dimensions;
  const short = Math.min(width,height);
  const margin = theme.margin * short + 12;
  const orientation = aspectClass(project.size);
  const portrait = orientation==='portrait';
  const themeStrategies: Strategy[] = portrait ? theme.standLayout : [...theme.layout,'symmetry','rows'];
  const override = spec && isPortraitStrategy(spec.layout)===portrait ? [spec.layout] : [];
  const layoutOptions = [...new Set([...override,...themeStrategies])];
  const palettes = spec ? [{bg:spec.palette[0],ink:spec.palette[1],accent:spec.palette[2],soft:spec.palette[3]},...theme.palettes] : theme.palettes;
  const candidates: Design[] = [];
  for (let paletteIndex=0; paletteIndex<palettes.length; paletteIndex++) {
    for (const [layoutIndex,strategy] of layoutOptions.entries()) {
      const seed = project.seed*977 + paletteIndex*179 + layoutIndex*17 + 161;
      const rng = random(seed);
      const palette = palettes[(paletteIndex + (spec ? 0 : project.seed)) % palettes.length];
      const nodes: DesignNode[] = decorations(theme.texture,width,height,palette,rng,portrait);
      const titleColor = ['gaming','cinematic'].includes(theme.id) ? palette.accent : palette.ink;
      const addText: AddLayoutText = (value,bounds,role,size,align='center',graduateId) => {
        if (!value) return;
        nodes.push({...textNode(value,bounds,role === 'title' ? theme.headline : theme.body,role === 'title' ? theme.weight : role === 'name' ? '700' : '500',role === 'title' ? titleColor : palette.ink,size,measure,align),graduateId});
      };
      if (isPortraitStrategy(strategy)) {
        addPortraitComposition(nodes,project,theme,palette,dimensions,strategy,addText,rng);
      } else {
        const sideTitle = ['editorial','hero'].includes(strategy) && width/height >= 1.3 && project.graduates.length <= (theme.id === 'newspaper' ? 6 : 4);
        const titleBelow = !sideTitle && theme.id === 'cinematic' && strategy !== 'rows';
        const kickerH = Math.max(12,short*.052);
        const footerH = Math.max(12,short*.057);
        const titleH = sideTitle ? (height-margin*2)*.55 : short*(theme.id === 'cinematic' ? .19 : .17);
        const caption = [project.university, project.faculty, project.major].filter(Boolean).join('  /  ');
        const details = [project.tagline, project.date, project.year].filter(Boolean).join('  •  ');
        const titleWidth = sideTitle ? (width-margin*3)*.37 : width-margin*2;
        const titleY = sideTitle ? (height-titleH)/2 : titleBelow ? height-margin-footerH-titleH : margin+kickerH;
        const logoSize = project.logo ? Math.min(33,kickerH*.9) : 0;
        if (project.logo) nodes.push({kind:'logo', x:margin,y:margin,w:logoSize,h:logoSize});
        addText(caption || theme.kicker, {x:margin+logoSize+(logoSize ? 5 : 0), y:sideTitle ? titleY-kickerH : margin,w:titleWidth-logoSize-(logoSize ? 5 : 0),h:kickerH},'body',kickerH*.48,sideTitle ? 'left':'center');
        addText(project.headline, {x:margin,y:titleY,w:titleWidth,h:titleH},'title',short*(sideTitle ? .135 : .15),sideTitle ? 'left':'center');
        addText(details || 'SELAMAT WISUDA!', {x:margin,y:height-margin-footerH,w:width-margin*2,h:footerH},'body',footerH*.51);
        const top = sideTitle || titleBelow ? margin+kickerH : margin+kickerH+titleH+short*.016;
        const left = sideTitle ? margin*1.75+titleWidth : margin;
        const area = { x:left,y:top,w:width-left-margin,h:(titleBelow ? titleY : height-margin-footerH)-top-short*.012 };
        const counts = distribute(project.graduates.length,rowCount(project.graduates.length,area,strategy,orientation==='square'),strategy);
        const rowHeight = area.h/counts.length;
        const longLabels = project.graduates.some(person => person.name.length+person.degree.length>85);
        let index = 0;
        for (const [row,count] of counts.entries()) {
          const widthLimit = area.w / Math.max(...counts);
          const cellWidth = Math.min(widthLimit, rowHeight*(longLabels ? 2.3 : count <= 2 && counts.length === 1 ? 1.44 : 1.22));
          const rowX = area.x + (area.w-cellWidth*count)/2;
          for (let col=0; col<count; col++,index++) {
            const person = project.graduates[index];
            const x = rowX+cellWidth*col;
            const y = area.y+rowHeight*row;
            const offset = ['pyramid','cinematic'].includes(strategy) ? Math.abs(col-(count-1)/2)/Math.max(1,count-1)*.20 : ['staggered','collage'].includes(strategy) ? (col%2)*.09 : 0;
            const emphasis = strategy === 'cinematic' && offset === 0 ? .99 : .95;
            const nameTop = longLabels ? .69 : .776;
            const nameH = rowHeight*(longLabels ? .30 : person.quote ? .22 : .18);
            const portraitH = rowHeight*((longLabels ? .61 : strategy === 'collage' ? .68 : .72)-offset);
            const treatment = theme.portrait;
            const portraitW = Math.min(cellWidth*.84*emphasis, person.original && person.original.width/person.original.height > 1.15 ? portraitH*1.28 : portraitH*.99);
            nodes.push({kind:'portrait', x:x+(cellWidth-portraitW)/2, y:y+rowHeight*(.032+offset),w:portraitW,h:portraitH,
              graduateId:person.id, rotation:strategy === 'collage' ? (col%2 ? 1 : -1)*(1+rng()*1.2) : 0,
              frame:treatment === 'frame' ? palette.soft : treatment === 'mono' ? palette.ink : 'transparent',monochrome:treatment === 'mono'});
            addText([person.name,person.degree].filter(Boolean).join(', '),{x:x+cellWidth*.036,y:y+rowHeight*nameTop,w:cellWidth*.928,h:nameH},'name',Math.min(short*.035,rowHeight*.118),'center',person.id);
            if (person.quote && counts.length < 3 && !longLabels) {
              const last = nodes.at(-1);
              if (last?.kind === 'text') last.h = rowHeight*.13;
              addText(person.quote,{x:x+cellWidth*.035,y:y+rowHeight*.917,w:cellWidth*.93,h:rowHeight*.077},'body',rowHeight*.05);
              if (last?.kind === 'text' && last.text.split('\n').length*last.fontSize*1.2 > last.h) last.fontSize = last.h/(last.text.split('\n').length*1.2);
            }
          }
        }
      }
      const score = scoreLayout(nodes,dimensions,project,scoreWeights,strategy);
      const styleIndex = themeStrategies.indexOf(strategy);
      const stylePriority = portrait && styleIndex >= 0 ? Math.max(0,12-6*styleIndex) : 0;
      if (score >= 0) candidates.push({ id:`${project.id}-${seed}`,theme:theme.id,seed,strategy,dimensions,size:project.size,palette,label:theme.name,score:score+stylePriority+(spec ? (strategy===spec.layout ? 8 : 0)+(paletteIndex===0 ? 18 : 0) : 0),nodes });
    }
  }
  const best: Design[] = [];
  const sorted = candidates.sort((a,b) => b.score-a.score);
  while (best.length < 3 && sorted.length) {
    let index = sorted.findIndex(design => best.every(other => other.strategy !== design.strategy && other.palette.bg !== design.palette.bg));
    if (index < 0) index = sorted.findIndex(design => best.every(other => other.palette.bg !== design.palette.bg));
    best.push(sorted.splice(Math.max(0,index),1)[0]);
  }
  return best;
}

export async function generateInBrowser(project: Project) {
  await loadDesignFonts();
  return generateDesigns(project,browserMeasure());
}

export function browserMeasure(): Measure {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return estimate;
  return (text,font,size,weight) => {
    ctx.font = `${weight} ${size}px "${font}"`;
    return ctx.measureText(text).width;
  };
}
