'use client';

import { ActiveSelection, Canvas, FabricImage, Group, Textbox, filters, type FabricObject } from 'fabric';
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowUp, ArrowUpToLine, Check, Copy, Crop, Download, Eye, EyeOff, Grid2X2, Group as GroupIcon, Hand, Image, ImagePlus, Layers3, LoaderCircle, Lock, Maximize2, MousePointer2, Palette, Plus, Redo2, Save, Shapes, Trash2, Type, Undo2, Ungroup, Unlock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { makeShape, populate, portraitImage, previewDesign, serializeCanvas, type GradObject } from '@/lib/canvas';
import { designFonts } from '@/lib/design-fonts';
import { generateInBrowser } from '@/lib/layout';
import { activePhoto, readPhoto } from '@/lib/photos';
import { useStudio } from '@/lib/studio-store';
import { getTheme, themes } from '@/lib/themes';
import type { Design, Project, ShapeNode, ThemeId } from '@/lib/types';
import { BannerArt } from './artwork';
import { ExportDialog } from './export-dialog';
import { RangeField } from './photo-controls';
import { DesignPreview } from './results';
import { Brand, Button, Dialog, IconButton, Notice } from './site';
import { Field } from './wizard';

const tabs = [
  {id:'photos',label:'Foto',icon:Image},{id:'text',label:'Teks',icon:Type},{id:'themes',label:'Templat',icon:Layers3},
  {id:'elements',label:'Elemen',icon:Shapes},{id:'backgrounds',label:'Latar',icon:Grid2X2},{id:'colors',label:'Palet',icon:Palette},
] as const;
type Tab = typeof tabs[number]['id'];
type Snapshot = Record<string,unknown>;
const fontFamilies = [...Object.values(designFonts),'Arial','Arial Black','Courier New','Georgia','Impact','Tahoma','Times New Roman','Trebuchet MS','Verdana'];
const decorations: {shape:ShapeNode['shape'];label:string;symbol:string}[] = [
  {shape:'rect',label:'Persegi',symbol:'▪'},{shape:'ellipse',label:'Lingkaran',symbol:'●'},{shape:'star',label:'Bintang',symbol:'✦'},
  {shape:'diamond',label:'Berlian',symbol:'◆'},{shape:'bubble',label:'Kotak lengkung',symbol:'▰'},
];

function useEditor(design: Design, project: Project) {
  const canvasElement=useRef<HTMLCanvasElement>(null);
  const stage=useRef<HTMLDivElement>(null);
  const instance=useRef<Canvas>(null);
  const view=useRef({zoom:1,offsetX:0,offsetY:0,pan:false,space:false,snap:true});
  const history=useRef<{items:Snapshot[];cursor:number}>({items:[],cursor:0});
  const [version,refresh]=useState(0);
  const [zoom,setZoom]=useState(1);
  const [snap,setSnap]=useState(true);
  const [pan,setPan]=useState(false);
  const [loading,setLoadingState]=useState(true);
  const busy=useRef(true);
  const setLoading=(value:boolean)=>{busy.current=value;setLoadingState(value);};
  const [error,setError]=useState('');
  const [guides,setGuides]=useState<{x?:number;y?:number}>({});
  const [safe,setSafe]=useState<boolean>(false);
  const [canvasFrame,setCanvasFrame]=useState({left:0,top:0,width:0,height:0});
  const update=useStudio(store=>store.update);
  const save=useStudio(store=>store.save);
  const status=useStudio(store=>store.status);
  const applyViewport=()=>{
    const canvas=instance.current, host=stage.current;
    if (!canvas||!host) return;
    const {width,height}=design.dimensions;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    const base=Math.min(Math.max(1,w-38)/width,Math.max(1,h-40)/height);
    const {zoom,offsetX,offsetY}=view.current;
    const scale=base*zoom;
    const left=(w-width*scale)/2+offsetX,top=(h-height*scale)/2+offsetY;
    if (canvas.width!==w || canvas.height!==h) canvas.setDimensions({width:w,height:h});
    canvas.clipPath = makeShape({kind:'shape',shape:'rect',x:0,y:0,w:width,h:height,fill:'#fff'});
    canvas.setViewportTransform([scale,0,0,scale,left,top]);
    setCanvasFrame({left,top,width:width*scale,height:height*scale});
    canvas.requestRenderAll();
  };
  function snapshot(canvas:Canvas) {
    const active=canvas.getActiveObject();
    if (!(active instanceof ActiveSelection)) {
      const state=serializeCanvas(canvas);
      delete state.clipPath;
      return state;
    }
    const selected=active.getObjects();
    canvas.discardActiveObject();
    const state=serializeCanvas(canvas);
    delete state.clipPath;
    canvas.setActiveObject(new ActiveSelection(selected,{canvas}));
    return state;
  }
  function persist(state:Snapshot) {
    update(value=>({...value,designs:value.designs.map(item=>item.id===design.id?{...item,canvas:state}:item)}));
  }
  function checkpoint() {
    const canvas=instance.current;
    if (!canvas) return;
    const stored=snapshot(canvas);
    const items=[...history.current.items.slice(0,history.current.cursor+1),stored].slice(-20);
    history.current={items,cursor:items.length-1};
    persist(stored);
    refresh(x=>x+1);
    canvas.requestRenderAll();
  }
  async function moveHistory(offset:number) {
    const canvas=instance.current;
    if (!canvas || busy.current) return;
    const current=history.current;
    const index=current.cursor+offset;
    if (!current.items[index]) return;
    setLoading(true);
    try {
      canvas.discardActiveObject();
      await canvas.loadFromJSON(current.items[index]);
      current.cursor=index;
      persist(current.items[index]);
      applyViewport();
    } catch {setError('Riwayat desain tidak dapat dibuka.');}
    finally{setLoading(false);refresh(x=>x+1);}
  }
  function setMagnification(value:number) {
    view.current.zoom=value;
    if (value===1) {view.current.offsetX=0;view.current.offsetY=0;}
    setZoom(value);
    applyViewport();
  }
  function togglePan() {
    const canvas=instance.current;
    view.current.pan=!view.current.pan;
    setPan(view.current.pan);
    if (canvas) canvas.defaultCursor=view.current.pan?'grab':'default';
  }
  function erase() {
    const canvas=instance.current;
    if (!canvas) return;
    const objects=canvas.getActiveObjects().filter(item=>!(item as GradObject).locked);
    if (!objects.length) return;
    canvas.discardActiveObject();
    canvas.remove(...objects);
    checkpoint();
  }
  async function duplicate() {
    const canvas=instance.current;
    if (!canvas) return;
    const copied=await Promise.all(canvas.getActiveObjects().map(async object=>{
      const copy=await object.clone() as GradObject;
      const bounds=object.getBoundingRect();
      copy.set({left:bounds.left+18,top:bounds.top+18,selectable:true,evented:true,visible:true});
      copy.locked=false;
      return copy;
    }));
    if (!copied.length) return;
    canvas.discardActiveObject();
    canvas.add(...copied);
    canvas.setActiveObject(copied.length===1?copied[0]:new ActiveSelection(copied,{canvas}));
    checkpoint();
  }

  useEffect(()=>{
    if (!canvasElement.current || !stage.current) return;
    const el=canvasElement.current, host=stage.current;
    setLoading(true);
    const canvas=new Canvas(el,{preserveObjectStacking:true,selection:true,enableRetinaScaling:true,uniformScaling:true,backgroundVpt:true});
    instance.current=canvas;
    let mounted=true;
    let drag:{x:number;y:number}|undefined;
    let started=false;
    const redraw=()=>refresh(x=>x+1);
    const observer=new ResizeObserver(applyViewport);
    observer.observe(host);
    canvas.on('selection:created',redraw);
    canvas.on('selection:updated',redraw);
    canvas.on('selection:cleared',redraw);
    canvas.on('object:modified',()=>{if(started)checkpoint();setGuides({});});
    canvas.on('text:changed',redraw);
    canvas.on('text:editing:exited',()=>{if(started)checkpoint();});
    canvas.on('mouse:down:before',event=>{
      if ((!view.current.pan && !view.current.space) || !('clientX' in event.e)) return;
      canvas.discardActiveObject();
      canvas.skipTargetFind=true;canvas.selection=false;
      drag={x:event.e.clientX,y:event.e.clientY};
      canvas.setCursor('grabbing');
    });
    canvas.on('mouse:move',event=>{
      if (!drag || !('clientX' in event.e)) return;
      view.current.offsetX+=event.e.clientX-drag.x;
      view.current.offsetY+=event.e.clientY-drag.y;
      drag={x:event.e.clientX,y:event.e.clientY};
      applyViewport();
    });
    canvas.on('mouse:up',()=>{
      if (drag) {drag=undefined;canvas.skipTargetFind=false;canvas.selection=true;canvas.setCursor(view.current.pan?'grab':'default');}
      setGuides({});
    });
    canvas.on('mouse:wheel',event=>{
      if (!(event.e.ctrlKey || event.e.metaKey)) return;
      event.e.preventDefault();
      setMagnification(Math.min(3,Math.max(.25,view.current.zoom*(event.e.deltaY<0?1.15:.87))));
    });
    canvas.on('object:moving',event=>{
      const object=event.target;
      if (!object || !view.current.snap || drag) return;
      const {width,height}=design.dimensions;
      const box=object.getBoundingRect();
      const x=box.left+box.width/2,y=box.top+box.height/2;
      const targetX=Math.abs(x-width/2)<12?width/2:Math.round(x/10)*10;
      const targetY=Math.abs(y-height/2)<12?height/2:Math.round(y/10)*10;
      object.set({left:object.left+targetX-x,top:object.top+targetY-y});
      object.setCoords();
      const [scale,,, ,offsetX,offsetY]=canvas.viewportTransform;
      setGuides({x:targetX===width/2?targetX*scale+offsetX:undefined,y:targetY===height/2?targetY*scale+offsetY:undefined});
    });
    void populate(canvas,design,project).then(()=>{
      if (!mounted) return;
      history.current={items:[snapshot(canvas)],cursor:0};
      applyViewport();setLoading(false);started=true;redraw();
    },()=>{if(mounted){setLoading(false);setError('Desain tidak dapat dibuka di kanvas.');}});
    function keydown(event:KeyboardEvent) {
      if (!started || busy.current) return;
      const target=event.target;
      if (target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(target.tagName)||target.isContentEditable) || (canvas.getActiveObject() as Textbox|undefined)?.isEditing) return;
      const modifier=event.metaKey||event.ctrlKey;
      const key=event.key.toLowerCase();
      if (modifier && ['z','y','s','d'].includes(key)) {
        event.preventDefault();
        if (key==='s') {persist(snapshot(canvas));void save();}
        else if (key==='d') void duplicate();
        else if (key==='y'||event.shiftKey) void moveHistory(1);
        else void moveHistory(-1);
      } else if (key==='delete'||key==='backspace') {if(canvas.getActiveObject()){event.preventDefault();erase();}}
      else if (key===' ') {event.preventDefault();view.current.space=true;canvas.setCursor('grab');}
      else if (['arrowleft','arrowright','arrowup','arrowdown'].includes(key)) {
        const object=canvas.getActiveObject() as GradObject|undefined;
        if (!object||object.locked) return;
        event.preventDefault();
        const delta=event.shiftKey?10:1;
        object.set({left:object.left+(key==='arrowleft'?-delta:key==='arrowright'?delta:0),top:object.top+(key==='arrowup'?-delta:key==='arrowdown'?delta:0)});
        object.setCoords();checkpoint();
      }
    }
    const keyup=(event:KeyboardEvent)=>{if(event.key===' '){view.current.space=false;canvas.setCursor(view.current.pan?'grab':'default');}};
    window.addEventListener('keydown',keydown);
    window.addEventListener('keyup',keyup);
    return ()=>{
      mounted=false;started=false;instance.current=null;observer.disconnect();
      window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);
      void canvas.dispose();
    };
    // Editor interactions retain the initial canvas and the project/design IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[design.id]);

  return {canvasElement,stage,instance,history,version,checkpoint,moveHistory,erase,duplicate,loading,setLoading,error,setError,zoom,setMagnification,pan,togglePan,snap,toggleSnap:()=>{view.current.snap=!view.current.snap;setSnap(view.current.snap);},safe,setSafe,guides,canvasFrame,applyViewport,status,save,snapshot};
}

export function Editor({design,project}: {design:Design;project:Project}) {
  const editor=useEditor(design,project);
  const [tab,setTab]=useState<Tab>('photos');
  const [preview,setPreview]=useState<Design>();
  const [exporting,setExporting]=useState<Design>();
  const [template,setTemplate]=useState<ThemeId>();
  const [sidebar,setSidebar]=useState(true);
  const [properties,setProperties]=useState(true);
  const [layerFocus,setLayerFocus]=useState<FabricObject>();
  const [notice,setNotice]=useState('');
  const [crop,setCrop]=useState<{image:FabricImage;value:number}>();
  const [replace,setReplace]=useState<FabricImage>();
  const [replacing,setReplacing]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const update=useStudio(store=>store.update);
  const {instance,checkpoint}=editor;
  const canvas=instance.current;
  const selection=(canvas?.getActiveObject() ?? (layerFocus && canvas?.getObjects().includes(layerFocus) ? layerFocus : undefined)) as GradObject|undefined;
  const selectedText=selection instanceof Textbox?selection:undefined;
  const selectedImage=portraitImage(selection);
  const selectedColor=typeof selection?.fill==='string'&&/^#[0-9a-f]{6}$/i.test(selection.fill)?selection.fill:'#2e2638';
  const canvasState=()=>canvas ? {...design,canvas:editor.snapshot(canvas)} : design;
  const execute= (task:(canvas:Canvas)=>void)=>{
    if (!canvas || editor.loading) return;
    task(canvas);
    checkpoint();
  };
  const change=(patch:Record<string,unknown>)=>{
    if (!selection || selection.locked) return;
    execute(()=>{selection.set(patch);selection.setCoords();});
  };
  function setColor(value:string) {
    if (selection && !selectedImage && !selection.locked) change({fill:value}); else execute(canvas=>{canvas.backgroundColor=value;});
  }
  function addText(text:string,large=false) {
    execute(canvas=>{
      const item=new Textbox(text,{left:design.dimensions.width*.16,top:design.dimensions.height*.18,width:design.dimensions.width*.55,fontSize:large?48:26,fill:design.palette.ink,fontFamily:large?'Georgia':'Arial',fontWeight:large?'700':'400',objectCaching:false});
      canvas.add(item);
      canvas.setActiveObject(item);
      setLayerFocus(undefined);
    });
  }
  function addElement(shape:ShapeNode['shape']) {
    execute(canvas=>{
      const object=makeShape({kind:'shape',shape,x:design.dimensions.width*.4,y:design.dimensions.height*.3,w:85,h:70,fill:design.palette.accent});
      canvas.add(object);canvas.setActiveObject(object);setLayerFocus(undefined);
    });
  }
  async function addPhoto(src:string,label:string) {
    if (!canvas || editor.loading) return;
    try {
      const image=await FabricImage.fromURL(src);
      image.scale(Math.min(design.dimensions.height*.52/image.height,design.dimensions.width*.46/image.width,1));
      image.set({left:design.dimensions.width*.23,top:design.dimensions.height*.19,objectCaching:false});
      (image as GradObject).label=label;
      canvas.add(image);canvas.setActiveObject(image);setLayerFocus(undefined);checkpoint();
    } catch {editor.setError('Foto gagal ditambahkan ke kanvas.');}
  }
  async function photoFile(file?:File) {
    if (!file) return;
    setReplacing(true);editor.setError('');
    try {
      const photo=await readPhoto(file);
      if (replace) {
        const {width,height}=replace.getScaledWidth()?{width:replace.getScaledWidth(),height:replace.getScaledHeight()}:{width:160,height:160};
        await replace.setSrc(photo.src);
        replace.set({cropX:0,cropY:0,scaleX:width/replace.width,scaleY:height/replace.height});
        replace.setCoords();selection?.set('dirty',true);checkpoint();
      } else await addPhoto(photo.src,file.name);
    } catch (error) {editor.setError(error instanceof Error?error.message:'Foto tidak dapat dimuat.');}
    finally {setReplacing(false);setReplace(undefined);}
  }
  async function applyTemplate() {
    if (!canvas || !template) return;
    const [replacement]=await generateInBrowser({...project,theme:template});
    if (!replacement) {editor.setError('Templat tidak dapat diterapkan.');return;}
    editor.setLoading(true);setTemplate(undefined);
    try {
      canvas.discardActiveObject();setLayerFocus(undefined);
      await populate(canvas,replacement,project);editor.applyViewport();checkpoint();
    } catch {editor.setError('Templat tidak dapat diterapkan.');}
    finally {editor.setLoading(false);}
  }
  function layerAction(action:'up'|'down'|'top'|'bottom'|'lock'|'hide'|'delete') {
    if (!selection) return;
    execute(canvas=>{
      if (action==='up') canvas.bringObjectForward(selection);
      if (action==='down') canvas.sendObjectBackwards(selection);
      if (action==='top') canvas.bringObjectToFront(selection);
      if (action==='bottom') canvas.sendObjectToBack(selection);
      if (action==='delete'&&!selection.locked) {canvas.discardActiveObject();canvas.remove(selection);setLayerFocus(undefined);}
      if (action==='hide') {
        selection.set('visible',!selection.visible);
        if (!selection.visible) {setLayerFocus(selection);canvas.discardActiveObject();}
      }
      if (action==='lock') {
        const locked=!selection.locked;
        selection.locked=locked;
        selection.set({selectable:!locked,evented:!locked,lockMovementX:locked,lockMovementY:locked,lockRotation:locked,lockScalingX:locked,lockScalingY:locked,hasControls:!locked});
        setLayerFocus(selection);
        if (locked) canvas.discardActiveObject();
        else if (selection.visible) canvas.setActiveObject(selection);
      }
    });
  }
  function groupSelection(ungroup=false) {
    execute(canvas=>{
      if (ungroup && selection instanceof Group && !(selection instanceof ActiveSelection) && !(selection as GradObject).gradId) {
        const items=selection.removeAll();
        canvas.discardActiveObject();canvas.remove(selection);canvas.add(...items);
        canvas.setActiveObject(new ActiveSelection(items,{canvas}));
      } else if (selection instanceof ActiveSelection) {
        const items=selection.getObjects();
        canvas.discardActiveObject();canvas.remove(...items);
        const group=new Group(items,{objectCaching:false}) as GradObject;
        group.label='Grup';canvas.add(group);canvas.setActiveObject(group);
      }
    });
  }
  function filterImage(type:'brightness'|'contrast'|'saturation'|'grayscale',value:number) {
    if (!selectedImage || selection?.locked) return;
    const constructors={brightness:filters.Brightness,contrast:filters.Contrast,saturation:filters.Saturation,grayscale:filters.Grayscale};
    const name=constructors[type].type;
    const existing=selectedImage.filters.filter(item=>item.type!==name);
    if (value) {
      if (type==='brightness') existing.push(new filters.Brightness({brightness:value/100}));
      if (type==='contrast') existing.push(new filters.Contrast({contrast:value/100}));
      if (type==='saturation') existing.push(new filters.Saturation({saturation:value/100}));
      if (type==='grayscale') existing.push(new filters.Grayscale());
    }
    selectedImage.filters=existing;
    selectedImage.applyFilters();
    selection?.set('dirty',true);
    checkpoint();
  }
  function applyCrop() {
    if (!crop) return;
    const {image,value}=crop;
    const source=image.getElement();
    const naturalWidth='naturalWidth' in source ? source.naturalWidth : source.width;
    const naturalHeight='naturalHeight' in source ? source.naturalHeight : source.height;
    const width=naturalWidth*(1-value/100),height=naturalHeight*(1-value/100);
    if (!width || !height) return;
    image.set({cropX:(naturalWidth-width)/2,cropY:(naturalHeight-height)/2,scaleX:image.getScaledWidth()/width,scaleY:image.getScaledHeight()/height,width,height});
    selection?.set('dirty',true);checkpoint();setCrop(undefined);
  }
  async function saveNow() {
    if (!canvas || editor.loading) return;
    const selected=canvasState();
    update(value=>({...value,designs:value.designs.map(item=>item.id===selected.id?selected:item)}));
    await editor.save();
    if (useStudio.getState().status==='error') return;
    setNotice('Desain tersimpan di browser ini.');
    const src=await previewDesign(selected,project,620).catch(()=>undefined);
    if (src && useStudio.getState().project?.id===project.id) {update({thumbnail:src});await editor.save();}
  }
  const layerObjects=(canvas?.getObjects() ?? []).filter(item=>!(item as GradObject).decorative).slice().reverse();
  const stageDecor=editor.canvasFrame;
  return <div className="editor-shell">
    <header className="editor-toolbar"><div className="toolbar-group toolbar-brand"><Brand small/><IconButton label="Kembali ke hasil" onClick={()=>{update({step:4});void editor.save();}}><ArrowLeft size={17}/></IconButton><div className="editor-name"><input aria-label="Nama proyek" maxLength={120} value={project.name} onChange={event=>update({name:event.target.value})}/><span>{editor.status==='saving'?'Menyimpan…':editor.status==='error'?'Gagal disimpan':'Tersimpan lokal'}</span></div></div>
      <div className="toolbar-group toolbar-history"><IconButton label="Urungkan (Ctrl+Z)" disabled={editor.loading||editor.history.current.cursor<=0} onClick={()=>void editor.moveHistory(-1)}><Undo2 size={18}/></IconButton><IconButton label="Ulangi (Ctrl+Shift+Z)" disabled={editor.loading||editor.history.current.cursor>=editor.history.current.items.length-1} onClick={()=>void editor.moveHistory(1)}><Redo2 size={18}/></IconButton><IconButton label="Simpan dulu (Ctrl+S)" disabled={editor.loading} onClick={()=>void saveNow()}><Save size={17}/></IconButton></div>
      <div className="toolbar-group toolbar-export"><IconButton label="Pratinjau desain" disabled={editor.loading} onClick={()=>setPreview(canvasState())}><Maximize2 size={17}/></IconButton><Button variant="primary" disabled={editor.loading} onClick={()=>setExporting(canvasState())}><Download size={17}/> Siap Cetak!</Button></div>
    </header>
    {editor.error&&<Notice error>{editor.error}</Notice>}
    {notice&&<div className="editor-notice"><Notice>{notice}</Notice><Button variant="ghost" onClick={()=>setNotice('')}>Tutup</Button></div>}
    <div className={`editor-layout ${sidebar?'':'sidebar-collapsed'} ${properties?'':'properties-collapsed'}`}>
      <aside className="editor-left">
        <nav className="editor-tabs" aria-label="Alat studio">{tabs.map(item=><button key={item.id} title={item.label} aria-pressed={tab===item.id&&sidebar} onClick={()=>{if(tab===item.id)setSidebar(!sidebar);else {setTab(item.id);setSidebar(true);}}}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
        {sidebar&&<div className="editor-library"><h2>{tabs.find(item=>item.id===tab)?.label}</h2>
          {tab==='photos'&&<><div className="asset-grid">{project.graduates.map(person=>{const photo=activePhoto(person);return photo&&<button key={person.id} title={person.name} onClick={()=>void addPhoto(photo.src,person.name)}><img src={photo.src} alt={person.name}/></button>;})}</div><Button disabled={replacing} onClick={()=>{setReplace(undefined);fileInput.current?.click();}}><ImagePlus size={16}/> Tambah foto</Button></>}
          {tab==='text'&&<div className="editor-stack"><Button onClick={()=>addText('Judul baru',true)}><Plus size={16}/> Tambah judul</Button><Button onClick={()=>addText('Tulis teks di sini')}><Plus size={16}/> Tambah teks</Button></div>}
          {tab==='themes'&&<div className="editor-stack">{themes.map(theme=><button key={theme.id} onClick={()=>setTemplate(theme.id)} className="template-thumb"><BannerArt id={theme.id}/><span>{theme.name}</span></button>)}</div>}
          {tab==='elements'&&<div className="element-grid">{decorations.map(item=><button key={item.shape} title={item.label} aria-label={item.label} onClick={()=>addElement(item.shape)}>{item.symbol}</button>)}</div>}
          {tab==='backgrounds'&&<><ColorField label="Warna latar" value={typeof canvas?.backgroundColor==='string'&&canvas.backgroundColor.startsWith('#')?canvas.backgroundColor:design.palette.bg} onChange={value=>execute(canvas=>{canvas.backgroundColor=value;})}/><div className="swatches">{['#eee5cf','#ffffff','#f6d6e9','#19232a','#181939','#eae7de','#ffda58','#a893db'].map(color=><button key={color} style={{background:color}} aria-label={`Latar ${color}`} title={color} onClick={()=>execute(canvas=>{canvas.backgroundColor=color;})}/>)}</div></>}
          {tab==='colors'&&<div className="editor-stack">{getTheme(design.theme).palettes.map((palette,index)=><div key={palette.bg}><h3>Palet {index+1}</h3><div className="swatches">{Object.values(palette).map(color=><button key={color} style={{background:color}} aria-label={`Terapkan warna ${color}`} title={color} onClick={()=>setColor(color)}/>)}</div></div>)}</div>}
        </div>}
      </aside>
      <section className="editor-middle" aria-label="Area kanvas">
        <div className="canvas-stage" ref={editor.stage}><canvas ref={editor.canvasElement}/>{editor.loading&&<div className="stage-loading" role="status"><LoaderCircle size={22} className="spin"/> Memuat kanvas…</div>}
          {editor.safe&&<div className="safe-guide" style={{left:stageDecor.left+stageDecor.width*.04,top:stageDecor.top+stageDecor.height*.06,width:stageDecor.width*.92,height:stageDecor.height*.88}}/>}
          {editor.guides.x!==undefined&&<i className="guide-vertical" style={{left:editor.guides.x}}/>}{editor.guides.y!==undefined&&<i className="guide-horizontal" style={{top:editor.guides.y}}/>}
        </div>
        <div className="canvas-controls"><div className="toolbar-group"><IconButton label={editor.pan?'Kembali ke seleksi':'Geser kanvas'} aria-pressed={editor.pan} onClick={editor.togglePan}>{editor.pan?<MousePointer2 size={17}/>:<Hand size={17}/>}</IconButton><IconButton label="Snap ke grid" aria-pressed={editor.snap} onClick={editor.toggleSnap}><Grid2X2 size={17}/></IconButton><IconButton label="Tampilkan area aman" aria-pressed={editor.safe} onClick={()=>editor.setSafe(!editor.safe)}><Crop size={17}/></IconButton></div><label className="zoom-control">Zoom <select value={editor.zoom} onChange={event=>editor.setMagnification(+event.target.value)}>{[.25,.5,.75,1,1.25,1.5,2,3].includes(editor.zoom)?null:<option value={editor.zoom}>{Math.round(editor.zoom*100)}%</option>}{[.25,.5,.75,1,1.25,1.5,2,3].map(value=><option key={value} value={value}>{value===1?'100% · Pas':Math.round(value*100)+'%'}</option>)}</select></label><IconButton label={properties?'Tutup properti':'Buka properti'} onClick={()=>setProperties(!properties)}><Layers3 size={17}/></IconButton></div>
      </section>
      {properties&&<aside className="editor-properties"><h2>Properti</h2>
        {!selection&&<p>Pilih objek di kanvas atau dari daftar lapisan.</p>}
        {selection&&<>
          <div className="property-section"><div className="layer-buttons">
            <IconButton label="Bawa ke depan" onClick={()=>layerAction('top')}><ArrowUpToLine size={15}/></IconButton><IconButton label="Maju satu lapisan" onClick={()=>layerAction('up')}><ArrowUp size={15}/></IconButton><IconButton label="Mundur satu lapisan" onClick={()=>layerAction('down')}><ArrowDown size={15}/></IconButton><IconButton label="Kirim ke belakang" onClick={()=>layerAction('bottom')}><ArrowDownToLine size={15}/></IconButton>
            <IconButton label="Duplikat objek" disabled={selection.locked||!canvas?.getActiveObject()} onClick={()=>void editor.duplicate()}><Copy size={15}/></IconButton><IconButton label={selection.locked?'Buka kunci objek':'Kunci objek'} onClick={()=>layerAction('lock')}>{selection.locked?<Unlock size={15}/>:<Lock size={15}/>}</IconButton><IconButton label={selection.visible?'Sembunyikan objek':'Tampilkan objek'} onClick={()=>layerAction('hide')}>{selection.visible?<EyeOff size={15}/>:<Eye size={15}/>}</IconButton><IconButton label="Hapus objek" disabled={selection.locked} onClick={()=>selection instanceof ActiveSelection?editor.erase():layerAction('delete')}><Trash2 size={15}/></IconButton>
            <IconButton label="Kelompokkan objek" disabled={!(selection instanceof ActiveSelection)} onClick={()=>groupSelection()}><GroupIcon size={15}/></IconButton><IconButton label="Pisahkan grup" disabled={!(selection instanceof Group)||selection instanceof ActiveSelection||!!(selection as GradObject).gradId} onClick={()=>groupSelection(true)}><Ungroup size={15}/></IconButton>
          </div></div>
          {!selection.locked && !(selection instanceof ActiveSelection)&&<div className="property-section editor-stack">
            {selectedText&&<><Field label="Isi teks"><textarea rows={3} value={selectedText.text} onChange={event=>change({text:event.target.value})}/></Field><Field label="Jenis huruf"><select value={selectedText.fontFamily} onChange={event=>change({fontFamily:event.target.value})}>{fontFamilies.map(font=><option key={font}>{font}</option>)}</select></Field>
              <div className="field-grid"><NumberField label="Ukuran" value={selectedText.fontSize} min={3} max={300} onChange={fontSize=>change({fontSize})}/><Field label="Ketebalan"><select value={String(selectedText.fontWeight)} onChange={event=>change({fontWeight:event.target.value})}>{['400','500','600','700','800','850','900'].map(weight=><option key={weight}>{weight}</option>)}</select></Field></div>
              <ColorField label="Warna teks" value={selectedColor} onChange={fill=>change({fill})}/><Field label="Rata teks"><select value={selectedText.textAlign} onChange={event=>change({textAlign:event.target.value})}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></Field>
              <NumberField label="Jarak huruf" value={selectedText.charSpacing} min={-200} max={600} onChange={charSpacing=>change({charSpacing})}/><NumberField label="Tinggi baris" value={selectedText.lineHeight} min={.7} max={4} step={.1} onChange={lineHeight=>change({lineHeight})}/>
            </>}
            {!selectedText&&!selectedImage&&<><ColorField label="Warna objek" value={selectedColor} onChange={fill=>change({fill})}/><ColorField label="Warna garis" value={typeof selection.stroke==='string'&&selection.stroke.startsWith('#')?selection.stroke:'#30243e'} onChange={stroke=>change({stroke,strokeWidth:selection.strokeWidth||2})}/><NumberField label="Tebal garis" value={selection.strokeWidth} min={0} max={30} onChange={strokeWidth=>change({strokeWidth})}/></>}
            <div className="field-grid"><NumberField label="X" value={selection.left} min={-1200} max={2400} onChange={left=>change({left})}/><NumberField label="Y" value={selection.top} min={-1200} max={2400} onChange={top=>change({top})}/><NumberField label="Lebar" value={selection.getScaledWidth()} min={1} max={2400} onChange={value=>change({scaleX:value/Math.max(1,selection.width)})}/><NumberField label="Tinggi" value={selection.getScaledHeight()} min={1} max={2400} onChange={value=>change({scaleY:value/Math.max(1,selection.height)})}/></div>
            <RangeField label="Rotasi" min={-180} max={180} value={((selection.angle+540)%360)-180} onChange={angle=>change({angle})}/>
            <RangeField label="Opasitas" min={0} max={100} value={Math.round(selection.opacity*100)} onChange={value=>change({opacity:value/100})}/>
            {selectedImage&&<><div className="wrap-actions"><Button onClick={()=>setCrop({image:selectedImage,value:0})}><Crop size={15}/> Potong</Button><Button disabled={replacing} onClick={()=>{setReplace(selectedImage);fileInput.current?.click();}}>Ganti foto</Button></div>{(['brightness','contrast','saturation'] as const).map((key,index)=>{const applied=selectedImage.filters.find(filter=>filter.type.toLowerCase()===key) as unknown as Partial<Record<typeof key,number>>|undefined;return <RangeField key={key} label={['Kecerahan','Kontras','Saturasi'][index]} min={-90} max={90} value={Math.round((applied?.[key]??0)*100)} onChange={value=>filterImage(key,value)}/>;})}<label className="check-field"><input type="checkbox" checked={selectedImage.filters.some(filter=>filter.type==='Grayscale')} onChange={event=>filterImage('grayscale',+event.target.checked)}/> Hitam putih</label></>}
          </div>}
        </>}
        <div className="layers-list"><h2>Lapisan</h2>{layerObjects.map((object,index)=>{const item=object as GradObject;return <button key={index} aria-pressed={selection===item} onClick={()=>{setLayerFocus(item);if(item.visible&&!item.locked)canvas?.setActiveObject(item);else canvas?.discardActiveObject();canvas?.requestRenderAll();}}><span>{item instanceof Textbox?item.text.replaceAll('\n',' '):item.label || item.type}</span>{item.locked?<Lock size={13}/>:!item.visible?<EyeOff size={13}/>:null}</button>;})}</div>
      </aside>}
    </div>
    <input hidden ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{void photoFile(event.target.files?.[0]);event.target.value='';}}/>
    {preview&&<Dialog title="Pratinjau banner" wide onClose={()=>setPreview(undefined)}><DesignPreview design={preview} project={project} width={1100}/><div className="dialog-actions"><Button variant="primary" onClick={()=>{setPreview(undefined);setExporting(preview);}}><Download size={17}/> Siap Cetak!</Button></div></Dialog>}
    {exporting&&<ExportDialog design={exporting} project={project} onClose={()=>setExporting(undefined)}/>}
    {template&&<Dialog title="Terapkan templat" onClose={()=>setTemplate(undefined)}><p>Templat menyusun ulang desain dari foto dan teks proyek. Gunakan Urungkan untuk kembali ke susunan sebelumnya.</p><div className="dialog-actions"><Button onClick={()=>setTemplate(undefined)}>Batal</Button><Button variant="primary" onClick={()=>void applyTemplate()}><Check size={17}/> Terapkan</Button></div></Dialog>}
    {crop&&<Dialog title="Potong foto" onClose={()=>setCrop(undefined)}><p>Potong tepi foto dari tengah. Ukuran bingkai di kanvas tetap sama.</p><RangeField label="Potongan" min={0} max={75} value={crop.value} onChange={value=>setCrop({...crop,value})}/><div className="dialog-actions"><Button onClick={()=>setCrop(undefined)}>Batal</Button><Button variant="primary" onClick={applyCrop}>Terapkan</Button></div></Dialog>}
  </div>;
}

function NumberField({label,value,min,max,step=1,onChange}: {label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}) {
  return <Field label={label}><input type="number" min={min} max={max} step={step} value={Math.round(value*100)/100} onChange={event=>{const next=event.target.valueAsNumber;if(Number.isFinite(next)&&next>=min&&next<=max)onChange(next);}}/></Field>;
}
function ColorField({label,value,onChange}: {label:string;value:string;onChange:(value:string)=>void}) {
  return <label className="color-field"><span>{label}</span><input type="color" value={value} onChange={event=>onChange(event.target.value)}/></label>;
}
