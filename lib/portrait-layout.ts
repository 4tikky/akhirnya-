import type { Theme } from './themes';
import type { Bounds, Color, DesignNode, PortraitStrategy, Project, ShapeNode, Size, TextNode } from './types';

type Role = 'title' | 'body' | 'name';
export type AddLayoutText = (value: string, bounds: Bounds, role: Role, size: number, align?: TextNode['align'], graduateId?: string) => void;

type Composition = {
  lead?: 'first' | 'last';
  stack?: boolean;
  spread: number;
  offset: number;
  panel: 'rule' | 'block' | 'paper' | 'none';
};

const compositions: Record<PortraitStrategy,Composition> = {
  'portrait-centered': {stack:true,spread:.88,offset:0,panel:'none'},
  'portrait-stack': {stack:true,spread:.80,offset:.19,panel:'rule'},
  'portrait-editorial': {lead:'last',spread:1,offset:.11,panel:'rule'},
  'portrait-collage': {lead:'last',spread:.95,offset:.19,panel:'paper'},
  'portrait-staggered': {stack:true,spread:.92,offset:.34,panel:'block'},
  'portrait-hero': {lead:'first',spread:.94,offset:0,panel:'none'},
  'portrait-blocks': {lead:'last',spread:.91,offset:0,panel:'block'},
  'portrait-newspaper': {lead:'first',spread:1,offset:0,panel:'rule'},
  'portrait-cinematic': {lead:'first',spread:.98,offset:.1,panel:'none'},
};

function portraitBands(count: number, composition: Composition, ratio: number) {
  if (count===1) return [{count:1,weight:1}];
  const stacked = composition.stack && count <= (ratio < .32 ? 5 : 3);
  const columns = stacked ? 1 : ratio >= .57 && count >= 11 ? 3 : 2;
  const hasLead = !!composition.lead;
  const total = count - Number(hasLead);
  const bandCount = Math.ceil(total/columns);
  const bands = Array.from({length:bandCount},(_,index)=>({
    count:Math.floor(total/bandCount)+Number(index < total%bandCount),
    weight:1,
  }));
  if (!hasLead) return bands;
  const hero = {count:1,weight:count<=7 ? 1.73 : 1.4};
  return composition.lead==='first' ? [hero,...bands] : [...bands,hero];
}

export function addPortraitComposition(
  nodes: DesignNode[], project: Project, theme: Theme, palette: Color, size: Size,
  strategy: PortraitStrategy, addText: AddLayoutText, random: () => number,
) {
  const {width,height} = size;
  const composition = compositions[strategy];
  const margin = width*(theme.id==='elegant' ? .105 : .078);
  const column = width-2*margin;
  const leftTitle = strategy==='portrait-newspaper' || strategy==='portrait-editorial' || strategy==='portrait-collage';
  const align = leftTitle ? 'left' : 'center';
  const addShape = (shape: ShapeNode['shape'], x: number, y: number, w: number, h: number, fill: string, stroke?: string, opacity?: number) =>
    nodes.push({kind:'shape',shape,x,y,w,h,fill,stroke,opacity});
  const rule = (y: number, color = palette.accent) => addShape('rect',margin,y,column,Math.max(1,width*.004),color);
  const caption = [project.university,project.faculty,project.major].filter(Boolean).join('  /  ');
  const details = [project.tagline,project.date,project.year].filter(Boolean).join('  •  ');
  const insetTop = width*.068;
  const logo = project.logo ? width*.1 : 0;
  const headerH = width*.15;
  const titleY = insetTop + headerH + width*.04;
  const titleH = Math.min(height*.195,width*.44);
  const titleEnd = titleY+titleH;
  const footerH = width*.16;
  const footerY = height-insetTop-footerH;
  const photoTop = titleEnd + width*.07;
  const photoBottom = footerY - width*.063;
  const header = {x:margin + (logo ? logo+width*.025 : 0),y:insetTop,w:column-(logo ? logo+width*.025 : 0),h:headerH};
  const title = {x:margin,y:titleY,w:column,h:titleH};

  switch (theme.texture) {
    case 'paper':
      rule(titleY-width*.018,palette.ink);
      rule(titleEnd+width*.025,palette.ink);
      rule(titleEnd+width*.036,palette.ink);
      break;
    case 'grid':
      addShape('rect',margin-width*.02,titleY-width*.015,column+width*.04,titleH+width*.033,palette.soft,palette.accent);
      addShape('rect',margin,footerY-width*.03,column,width*.012,palette.accent);
      break;
    case 'dots':
      addShape('bubble',margin-width*.03,titleY,column+width*.06,titleH,palette.soft);
      addShape('star',width*.83,titleY-width*.037,width*.077,width*.077,palette.accent);
      break;
    case 'film':
      const bloom = Math.min(photoBottom-photoTop,width*1.32);
      addShape('ellipse',width*.056,photoTop+width*.01,width*.888,bloom,palette.soft,undefined,.34);
      addShape('ellipse',width*.17,photoTop+width*.13,width*.66,bloom*.76,palette.accent,undefined,.10);
      rule(titleEnd+width*.025);
      break;
    case 'border':
      addShape('diamond',width*.48,titleEnd+width*.015,width*.04,width*.04,palette.accent);
      break;
    case 'burst':
      addShape('bubble',margin-width*.02,titleY,column+width*.04,titleH,palette.soft,palette.accent);
      break;
  }

  if (project.logo) nodes.push({kind:'logo',x:margin,y:insetTop+(headerH-logo)/2,w:logo,h:logo});
  addText(caption || theme.kicker,header,'body',width*.039,align);
  addText(project.headline,title,'title',width*(theme.id==='cinematic' ? .20 : .17),align);
  rule(footerY-width*.025);
  addText(details || 'SELAMAT WISUDA!',{x:margin,y:footerY,w:column,h:footerH},'body',width*.04);

  const bands = portraitBands(project.graduates.length,composition,width/height);
  const track = (photoBottom-photoTop)/bands.reduce((sum,band)=>sum+band.weight,0);
  let y = photoTop;
  let index = 0;
  for (const [row,band] of bands.entries()) {
    const bandH = track*band.weight;
    const usableWidth = column*composition.spread;
    const cellW = usableWidth/band.count;
    const rowX = (width-usableWidth)/2;
    for (let col=0;col<band.count;col++,index++) {
      const person = project.graduates[index];
      const longName = person.name.length+person.degree.length>85;
      const labelH = Math.min(cellW*(longName ? .44 : .24),bandH*(longName ? .37 : .21));
      const quoteH = person.quote && !longName && project.graduates.length<=5 ? Math.min(cellW*.13,bandH*.10) : 0;
      const side = (row+col)%2 ? -1 : 1;
      const cellX = rowX+cellW*col;
      const shift = band.count===1 ? side*composition.offset : 0;
      const horizontalPad = cellW*(band.count===1 ? .04 : .074);
      const contentW = cellW-horizontalPad*2;
      const availableH = bandH-labelH-quoteH-bandH*.16;
      const photoW = Math.min(contentW*(1-Math.abs(shift)),availableH*(band.count===1 ? 1.10 : 1.04));
      const photoH = Math.min(availableH,photoW*(band.weight>1 || project.graduates.length===1 ? 1.27 : 1.16));
      const center = cellX+cellW/2+(contentW-photoW)*shift*.57;
      const stackH = photoH+labelH+quoteH+bandH*.045;
      const bias = band.count>1 ? side*bandH*composition.offset*.11 : 0;
      const top = y+(bandH-stackH)/2+bias;
      const labelW = Math.min(contentW,2*(center-cellX),2*(cellX+cellW-center));
      const labelY = top+photoH+bandH*.045;
      const rotation = strategy==='portrait-collage' ? side*(1+random()*.6) : 0;
      const photoX = center-photoW/2;
      const trim = Math.min(width*.02,bandH*.025);

      if (composition.panel==='paper') {
        addShape('rect',photoX-trim,top-trim,photoW+2*trim,photoH+2*trim,palette.soft);
        addShape('rect',photoX+photoW*.37,top-trim,photoW*.26,trim*.85,palette.accent);
      } else if (composition.panel==='block') {
        addShape('rect',photoX-trim,top+trim,photoW+2*trim,photoH,palette.soft);
      } else if (composition.panel==='rule') {
        addShape('rect',center-labelW/2,labelY-trim*.40,labelW,trim*.18,palette.accent);
      }
      nodes.push({
        kind:'portrait',x:photoX,y:top,w:photoW,h:photoH,graduateId:person.id,rotation,
        frame:theme.portrait==='mono' ? palette.ink : theme.portrait==='frame' ? palette.soft : 'transparent',
        monochrome:theme.portrait==='mono',
      });
      addText([person.name,person.degree].filter(Boolean).join(', '),{x:center-labelW/2,y:labelY,w:labelW,h:labelH},'name',Math.min(cellW*.093,labelH*.61),'center',person.id);
      if (quoteH) addText(person.quote,{x:center-labelW/2,y:labelY+labelH,w:labelW,h:quoteH},'body',Math.min(cellW*.046,quoteH*.60));
    }
    y += bandH;
  }
}
