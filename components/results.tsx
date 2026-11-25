'use client';

import { ArrowLeft, ArrowRight, Columns2, Download, Heart, ImageOff, Layers3, Maximize2, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { previewDesign } from '@/lib/canvas';
import { generateInBrowser } from '@/lib/layout';
import { useStudio } from '@/lib/studio-store';
import type { Design, Project, Strategy } from '@/lib/types';
import { ExportDialog } from './export-dialog';
import { Button, Dialog, IconButton, Notice } from './site';

const labels: Record<Strategy,string> = {
  symmetry:'Simetris',pyramid:'Piramida',staggered:'Bertingkat',editorial:'Editorial',collage:'Kolase',cinematic:'Sinematik',rows:'Multibaris',hero:'Fokus utama',
};

export function DesignPreview({design,project,width=720,onReady}: {design:Design;project:Project;width?:number;onReady?:(src:string)=>void}) {
  const [result,setResult]=useState<{key:Design;src?:string;error?:boolean}>();
  const {graduates,logo}=project;
  useEffect(()=>{
    let skip=false;
    void previewDesign(design,{...project,graduates,logo},width).then(src=>{
      if (!skip) {setResult({key:design,src});onReady?.(src);}
    },()=>{if (!skip) setResult({key:design,error:true});});
    return ()=>{skip=true;};
    // Only visual project fields affect an already generated design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[design,graduates,logo,width]);
  return <div className="design-preview" style={{aspectRatio:design.dimensions.width/design.dimensions.height}}>
    {result?.key===design && result.src ? <img alt={`Pratinjau desain ${design.label}`} src={result.src}/> : result?.key===design && result.error ? <span><ImageOff size={22}/> Pratinjau tidak dapat ditampilkan</span> : <span role="status"><Layers3 size={23}/> Merender pratinjau…</span>}
  </div>;
}

export function Results({project}: {project:Project}) {
  const update=useStudio(store=>store.update);
  const save=useStudio(store=>store.save);
  const [preview,setPreview]=useState<Design>();
  const [exporting,setExporting]=useState<Design>();
  const [compare,setCompare]=useState<string[]>([]);
  const [comparing,setComparing]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState(false);
  const [generating,setGenerating]=useState(false);
  const designs=filter?project.designs.filter(item=>item.favorite):project.designs;
  function edit(design:Design) {update({selected:design.id,step:5});void save();window.scrollTo({top:0});}
  async function regenerate() {
    setGenerating(true);
    const seed=project.seed+1;
    const generated=await generateInBrowser({...project,seed}).finally(()=>setGenerating(false));
    if (generated.length<3) {setError('Variasi baru belum dapat disusun. Periksa judul, ukuran, dan foto.');return;}
    const keep=project.designs.filter(design=>design.favorite||design.canvas).slice(0,12);
    setError('');setCompare([]);setFilter(false);update({designs:[...generated,...keep],seed,selected:generated[0].id,thumbnail:undefined});void save();
  }
  return <main className="studio-inner results-page"><Button variant="ghost" onClick={()=>{update({step:3});void save();}}><ArrowLeft size={17}/> Kembali ke gaya</Button>
    <div className="section-head gallery-head"><div><span className="kicker"><Sparkles size={16}/> HASIL DESAIN</span><h1>Akhirnya <em>jadi!</em></h1><p>{project.name} · {project.graduates.length} wisudawan · {project.size.width} × {project.size.height} cm</p></div><Button variant="primary" onClick={()=>void regenerate()} disabled={generating}><RefreshCw size={17}/> {generating?'Lagi nyusun kenangan jadi karya…':'Coba vibes lain'}</Button></div>
    {error && <Notice error>{error}</Notice>}
    <div className="result-controls"><div className="segmented"><button aria-pressed={!filter} onClick={()=>setFilter(false)}>Semua desain</button><button aria-pressed={filter} onClick={()=>setFilter(true)}>Favorit</button></div><Button onClick={()=>setComparing(true)} disabled={compare.length<2}><Columns2 size={17}/> Bandingkan ({compare.length})</Button></div>
    {!designs.length && <div className="empty-projects">Belum ada desain favorit.</div>}
    <div className="results-grid">{designs.map((design,index)=><article className="result-card" key={design.id}>
      <button className="result-image-btn" aria-label={`Perbesar variasi ${index+1}`} onClick={()=>setPreview(design)}><DesignPreview design={design} project={project} onReady={index===0&&!filter&&!project.thumbnail?src=>{if (useStudio.getState().project?.designs[0]?.id===design.id) update({thumbnail:src});}:undefined}/><span><Maximize2 size={17}/></span></button>
      <div className="result-info"><div><span className="kicker">{labels[design.strategy]}</span><h2>{design.label}</h2></div><IconButton label={design.favorite?'Hapus dari favorit':'Jadikan favorit'} aria-pressed={!!design.favorite} onClick={()=>update(value=>({...value,designs:value.designs.map(item=>item.id===design.id?{...item,favorite:!item.favorite}:item)}))}><Heart size={18} fill={design.favorite?'currentColor':'none'}/></IconButton></div>
      <div className="result-actions"><label className="check-field"><input type="checkbox" aria-label={`Bandingkan variasi ${index+1}`} checked={compare.includes(design.id)} disabled={compare.length>=3&&!compare.includes(design.id)} onChange={event=>setCompare(current=>event.target.checked?[...current,design.id]:current.filter(id=>id!==design.id))}/> Bandingkan</label><IconButton label={`Unduh variasi ${index+1}`} onClick={()=>setExporting(design)}><Download size={16}/></IconButton><Button onClick={()=>edit(design)}><Pencil size={15}/> Edit desain</Button></div>
    </article>)}</div>
    {preview && <Dialog title={preview.label} wide onClose={()=>setPreview(undefined)}><DesignPreview design={preview} project={project} width={1100}/><div className="dialog-actions"><Button onClick={()=>{setPreview(undefined);setExporting(preview);}}><Download size={17}/> Unduh</Button><Button variant="primary" onClick={()=>edit(preview)}>Edit di studio <ArrowRight size={17}/></Button></div></Dialog>}
    {comparing && <Dialog title="Bandingkan desain" wide onClose={()=>setComparing(false)}><div className="compare-grid">{project.designs.filter(design=>compare.includes(design.id)).map(design=><div key={design.id}><DesignPreview design={design} project={project}/><h3>{labels[design.strategy]}</h3><Button onClick={()=>edit(design)}><Pencil size={15}/> Edit desain</Button></div>)}</div></Dialog>}
    {exporting&&<ExportDialog design={exporting} project={project} onClose={()=>setExporting(undefined)}/>}
  </main>;
}
