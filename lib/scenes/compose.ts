import { designFonts } from '../design-fonts';
import type { ArtNode, Bounds, Color, DesignNode, PortraitNode, Project, Size, TextNode, ThemeId } from '../types';
import type { AssetId } from './assets';
import type { SceneVariant } from './catalog';

type Role = 'title' | 'body' | 'name';
export type SceneText = (value:string,bounds:Bounds,role:Role,size:number,style?:Partial<TextNode>)=>void;

function distribution(count:number,columns:number) {
  const rows=Math.ceil(count/columns);
  return Array.from({length:rows},(_,i)=>Math.floor(count/rows)+Number(i<count%rows));
}

function bands(count:number,ratio:number,arrangement:SceneVariant['arrangement']) {
  if (count===1) return [1];
  if (ratio>2.4) return distribution(count,count<=12?count:Math.ceil(count/2));
  if (ratio>1) return distribution(count,count<=5?count:Math.ceil(count/2));
  const columns=count>=9 && ratio>=.31 || ratio>.61 && count>=8?3:2;
  if (columns===3 && ['trail','scattered'].includes(arrangement) && count>=9) {
    const sequence:number[]=[];
    let remaining=count;
    while (remaining>3) {
      const take=sequence.length%2 && remaining!==4 ? 2:3;
      sequence.push(take);
      remaining-=take;
    }
    if (remaining===1) {
      sequence[sequence.length-1]--;
      remaining++;
    }
    return [...sequence,remaining];
  }
  if (count<=4 && arrangement==='trail' && ratio<.55) return Array.from({length:count},()=>1);
  if (count<=7 && arrangement==='feature') return [1,...distribution(count-1,columns)];
  if (count>=3 && count<=7 && arrangement==='supper') return [...distribution(count-1,columns),1];
  if (count===3 && ['scattered','folio'].includes(arrangement)) return [2,1];
  return distribution(count,columns);
}

type Surface = { theme:ThemeId; dimensions:Size; palette:Color; seed:number; variant:SceneVariant; texture:AssetId };
export function composeScene(nodes:DesignNode[],project:Project,surface:Surface,text:SceneText) {
  const {theme,dimensions:{width:w,height:h},palette,seed,variant,texture}=surface;
  const tall = w<h;
  const ratio = w/h;
  const u = Math.min(w,h);
  const count = project.graduates.length;
  const dark = theme==='cinematic'||theme==='gaming';
  const cream = '#fff4db';
  const margin = Math.min(w*.10,u*.10);
  const content = w-margin*2;
  const layerOrder = {texture:0,background:1,environment:2,frame:3,foreground:4,sticker:5,typography:6};
  const art = (asset:AssetId,layer:ArtNode['layer'],x:number,y:number,width:number,height:number,label:string,opacity=1,rotation=0) => {
    const size={x,y,w:width,h:height};
    nodes.push({kind:'art',asset,layer,label,palette,seed:seed+layerOrder[layer],...size,opacity,rotation});
  };

  const headerH = tall ? Math.min(w*.135,h*.065) : h*.065;
  const sideRail=ratio>=1.6 && ['feature','folio','trail'].includes(variant.arrangement);
  const titleY = tall ? Math.min(w*.225,h*.102) : h*(sideRail?.185:.112);
  const titleH = tall ? Math.min(w*.50,h*.103) : h*(sideRail?.43:.205);
  const socialY = titleY+titleH+u*.021;
  const socialH = u*.052;
  const floor = h-Math.min(tall?w*.34:h*.18,h*.17);
  const photoTop = sideRail ? h*.10 : socialY+socialH+u*(tall?.08:.023);
  const photoBottom = floor-u*.036;
  const footerY = floor+u*.039;
  const footerH = Math.min(h-footerY-u*.036,u*(tall?.22:.125));
  const institution = [project.university,project.faculty,project.major].filter(Boolean).join('  /  ');
  const year = [project.tagline,project.date,project.year].filter(Boolean).join('  •  ');

  art(texture,'texture',0,0,w,h,'Tekstur cetak',theme==='adventure'?.8:.58);
  if (theme==='adventure') {
    art(variant.back,'background',0,0,w,tall?h*.40:h*.72,'Edisi lanskap ekspedisi',.69);
    art('ridge','background',0,h*(tall?.155:.10),w,h*(tall?.845:.9),'Punggung gunung dan salju',variant.back==='ridge'?.64:.90);
    art(variant.motif,'environment',w*.05,photoTop-u*.058,w*.90,photoBottom-photoTop+u*.09,variant.name,.82);
    art('forest','foreground',0,floor-u*.07,w,h-floor+u*.07,'Siluet hutan di kaki gunung',1);
  } else if (theme==='scrapbook'||theme==='nostalgia') {
    art(variant.back,'background',w*.018,h*.014,w*.964,h*.966,'Lembaran album',.88);
    if (variant.back!=='pages') art('pages','environment',w*.054,h*.05,w*.913,h*.89,'Kertas catatan',.62);
    art(variant.motif,'environment',w*.008,h*.044,variant.motif==='rings'?w*.08:w*.18,h*.88,'Tepi binder dan arsip',variant.motif==='rings'?1:.55);
    art('tape','foreground',w*.63,floor-u*.013,w*.26,u*.057,'Washi tape bawah',.88,-5);
  } else if (theme==='picnic') {
    art(variant.back,'background',0,0,w,h,'Taplak meja piknik',.91);
    art(variant.motif==='scallop'?'scallop':variant.arrangement==='supper'?'gingham':'scallop','environment',margin*.52,h*.032,w-margin*1.04,h*.929,'Alas saji bergelombang',variant.arrangement==='supper'?1:.91);
    if (variant.arrangement==='supper') art('plate','environment',w*.11,photoTop-u*.03,w*.78,photoBottom-photoTop,'Piring piknik',.47);
    art('gingham','foreground',0,floor+u*.008,w,h-floor-u*.008,'Kotak-kotak taplak bawah',.7);
  } else {
    art(variant.back,'background',0,0,w,h,`Latar ${variant.name}`,dark?.66:.8);
    art(variant.motif,'environment',w*.035,h*.14,w*.93,h*.69,'Ilustrasi suasana',dark?.22:.37);
    if (theme==='gaming') art('progress','foreground',w*.18,floor-u*.056,w*.64,u*.049,'Indikator misi selesai');
    if (theme==='cinematic') art('filmstrip','foreground',0,floor-u*.028,w,h-floor+u*.028,'Bingkai negatif film',.51);
    if (theme==='chibi') art('city','foreground',0,floor-u*.10,w,h-floor+u*.10,'Kota mini di kaki banner',.72);
    if (theme==='photocard') art('barcode','foreground',w*.72,floor+u*.02,w*.20,u*.037,'Barcode edisi angkatan',.82);
  }

  const stickerSize = Math.min(w*(tall?.16:.088),h*.14);
  const flip = seed%2===0;
  const anchors = [
    {x:flip?w-stickerSize*1.03:stickerSize*.065,y:titleY-u*.041,size:stickerSize*.91},
    {x:flip?stickerSize*.045:w-stickerSize*1.05,y:photoTop-u*.033,size:stickerSize*.70},
    {x:flip?w-stickerSize:stickerSize*.025,y:photoBottom-stickerSize*.88,size:stickerSize*.91},
    {x:flip?stickerSize*.045:w-stickerSize*.94,y:floor+u*.015,size:stickerSize*.92},
  ];
  variant.stickers.forEach((asset,index)=>{
    const {x,y,size}=anchors[index];
    art(asset,'sticker',x,Math.max(0,y),size,Math.min(size,h-y),'Stiker · '+asset,1,index%2 ? 4 : -3);
  });

  const headlineX=margin+(tall?u*.025:0);
  const headlineW=sideRail ? w*.283 : w-headlineX*2;
  const left=sideRail || variant.arrangement==='folio' || variant.title==='serif';
  if (variant.title==='ribbon') art('ribbon','typography',headlineX-u*.012,titleY-u*.018,headlineW+u*.024,titleH+u*.036,'Pita judul',.94);
  if (theme==='newspaper') {
    art('editorial','typography',margin,Math.max(0,socialY-u*.004),sideRail?headlineW:content,socialH+u*.014,'Potongan kolom editorial',.40);
  }
  const shortArc=tall && variant.title==='handwritten' && project.headline.length<=16 && theme!=='scrapbook';
  const headline: Partial<TextNode> = {
    align: left ? 'left':'center', color: dark?palette.accent:palette.ink,
    font:variant.title==='handwritten'?designFonts.hand:variant.title==='serif'?designFonts.serif:variant.title==='outlined'?'Bricolage Grotesque Variable':designFonts.display,
    weight:variant.title==='serif'?'900':variant.title==='handwritten'?'700':variant.title==='outlined'?'850':'400',
  };
  if (variant.title==='outlined') Object.assign(headline,{stroke:dark?palette.ink:cream,strokeWidth:u*.009,shadow:dark?palette.bg:palette.accent});
  if (variant.title==='ribbon') Object.assign(headline,{color:cream,stroke:'#452831',strokeWidth:u*.011});
  if (variant.title==='handwritten') Object.assign(headline,{rotation:shortArc?0:tall?-2.5:-1,color:palette.ink,stroke:cream,strokeWidth:u*.010,curve:shortArc?u*.04:undefined});
  if (variant.title==='serif' && theme==='scrapbook') headline.italic=true;

  const crest = project.logo ? Math.min(u*.083,headerH) : 0;
  if (project.logo) nodes.push({kind:'logo',x:margin,y:u*.032,w:crest,h:crest});
  const headerY=u*.032;
  const headerX=margin+(crest?crest+u*.021:0);
  text(institution || 'PERAYAAN WISUDA', {x:headerX,y:headerY,w:sideRail?headlineW-(headerX-margin):w-headerX-margin,h:headerH},'body',u*.031,{
    color:palette.ink,weight:'800',align:left?'left':'center',stroke:dark?palette.bg:cream,strokeWidth:u*.002,
  });
  const titleSize=shortArc?Math.min(u*.18,headlineW/(Math.max(1,project.headline.length)*.54)):u*(tall?(variant.title==='handwritten'?.205:.18):.23);
  text(project.headline,{x:headlineX,y:titleY,w:headlineW,h:titleH},'title',titleSize,headline);
  text(variant.name.toLocaleUpperCase('id-ID'),{x:margin,y:socialY,w:sideRail?headlineW:content,h:socialH},'body',u*.033,{
    color:palette.ink,weight:'800',stroke:dark?palette.bg:cream,strokeWidth:u*.004,
    curve:tall && variant.arrangement==='trail'?u*.024:undefined,
  });
  text(year || 'SELAMAT WISUDA!',{x:margin*1.10,y:footerY,w:w-margin*2.2,h:footerH},'body',u*(tall?.040:.044),{
    color:theme==='adventure'?cream:palette.ink,weight:'800',stroke:theme==='adventure'?palette.ink:dark?palette.bg:cream,strokeWidth:u*.003,
  });

  const rows = bands(count,ratio,variant.arrangement);
  const hasLongNames = project.graduates.some(person=>person.name.length+person.degree.length>75);
  const weights = rows.map((columns,index)=>{
    if (rows.length===1) return 1;
    const featurePosition = variant.arrangement==='supper' ? rows.length-1 : 0;
    return columns===1 && count<=7 && index===featurePosition && ['feature','supper'].includes(variant.arrangement) ? 1.34 : 1;
  });
  const naturalRow = (photoBottom-photoTop)/weights.reduce((sum,n)=>sum+n,0);
  const dense=count>7;
  const photosX=sideRail?w*.33:margin;
  const photosWidth=sideRail?w-photosX-margin:content;
  let rowTop = photoTop;
  let n=0;
  rows.forEach((columns,row)=>{
    const rowH=naturalRow*weights[row];
    const widthLimit = photosWidth*(tall ? (variant.arrangement==='folio'?.94:1) : .99);
    const unit=widthLimit/columns;
    for (let col=0;col<columns;col++,n++) {
      const graduate=project.graduates[n];
      const side=(row+col+(flip?0:1))%2===0 ? 1:-1;
      const alignedX=photosX+(photosWidth-widthLimit)/2+(col+.5)*unit;
      const wiggle=variant.arrangement==='trail'?.115:variant.arrangement==='scattered'?.085:variant.arrangement==='folio'?.04:0;
      const nameH=Math.min(unit*(hasLongNames?.55:.30),rowH*(hasLongNames?.37:dense?.263:.22));
      const labelGap=rowH*.045;
      const availableH=rowH-nameH-labelGap-rowH*(hasLongNames?.075:.13);
      const isTallPhoto = ['sticker','profile','arch','cover','character'].includes(variant.treatment);
      const photoW=Math.min(unit*(columns===1?.66:.83),availableH*(isTallPhoto?.92:1.20));
      const photoH=Math.min(availableH,photoW*(isTallPhoto?1.27:1.02));
      const freeX=Math.min(w*.26,Math.max(0,(unit-photoW)/2-unit*.04));
      const offsetX=columns===1 && rows.length>1 ? side*freeX*wiggle*3.6 : side*unit*wiggle*.21;
      const center=alignedX+offsetX;
      const photoTop=rowTop+(rowH-photoH-labelGap-nameH)/2+side*rowH*(columns>1 ? wiggle*.16 : 0);
      const variantRotation=variant.arrangement==='scattered'||variant.treatment==='polaroid'||variant.treatment==='torn';
      const rotate=variantRotation?side*(dense ? .62:1.75):0;
      const presentation:PortraitNode['presentation'] = variant.treatment;
      const photoBox={x:center-photoW/2,y:photoTop,w:photoW,h:photoH};
      const labelW=Math.min(unit*.94, (unit*.5-Math.abs(offsetX))*2, Math.max(photoW*1.22,unit*(hasLongNames||dense?.88:.69)));
      const label={x:center-labelW/2,y:photoTop+photoH+labelGap,w:labelW,h:nameH};
      const matte=theme==='gaming'?palette.soft:cream;

      if (theme==='picnic' && ['circle','organic'].includes(variant.treatment) && !dense) {
        const framePad=photoW*.075;
        art('plate','frame',photoBox.x-framePad,photoBox.y-framePad,photoW+2*framePad,photoH+2*framePad,'Piring · '+graduate.name);
      }
      if (variant.treatment==='profile') {
        art('profile','frame',label.x-u*.009,photoTop-u*.012,label.w+u*.018,photoH+nameH+labelGap+u*.02,'Kartu · '+graduate.name);
      }
      nodes.push({
        kind:'portrait',graduateId:graduate.id,rotation:rotate,frame:palette.accent,matte,
        outline:theme==='gaming'?palette.accent:cream,monochrome:theme==='newspaper' && variant.treatment!=='sticker',presentation,...photoBox,
      });
      if (theme==='scrapbook' && !dense) {
        art('tape','sticker',photoBox.x+photoBox.w*.26,photoTop-u*.017,photoW*.48,u*.035,'Washi tape · '+graduate.name,.82,side*6);
      }
      if (theme==='adventure' && variant.arrangement==='trail' && !dense && columns===1) {
        art('compass','environment',center+side*photoW*.61-u*.054,photoTop+photoH*.38,u*.108,u*.108,'Titik perhentian',.92);
      }
      if (variant.treatment!=='profile') {
        nodes.push({kind:'shape',shape:tall?'bubble':'rect',x:label.x,y:label.y,w:label.w,h:label.h,fill:dark?palette.bg:cream,opacity:.91});
      }
      text([graduate.name,graduate.degree].filter(Boolean).join(', '),label,'name',Math.min(u*(dense?.038:.052),nameH*.58),{
        graduateId:graduate.id,weight:'800',color:palette.ink,
        stroke:variant.treatment==='profile' && dark?palette.bg:undefined,strokeWidth:variant.treatment==='profile' && dark?u*.003:undefined,
      });
    }
    rowTop+=rowH;
  });
}
