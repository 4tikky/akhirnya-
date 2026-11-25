'use client';

import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Crop, FileText, ImagePlus, Layers3, LoaderCircle, LockKeyhole, Plus, Ruler, ScanFace, Trash2, Upload, UsersRound } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { validSize, presets } from '@/lib/export-math';
import { generateInBrowser } from '@/lib/layout';
import { activePhoto, readPhoto } from '@/lib/photos';
import { processPhoto } from '@/lib/process';
import { useStudio } from '@/lib/studio-store';
import { headlines, themes } from '@/lib/themes';
import { newGraduate, type Graduate, type Project, type Size } from '@/lib/types';
import { BannerArt } from './artwork';
import { PhotoControls } from './photo-controls';
import { Button, IconButton, Notice, StepActions } from './site';

const steps = [
  {title:'Informasi Banner', icon:FileText, description:'Tentukan judul dan informasi wisudamu.'},
  {title:'Ukuran Banner', icon:Ruler, description:'Pilih ukuran cetak atau masukkan dimensi sendiri.'},
  {title:'Wisudawan', icon:UsersRound, description:'Tambahkan foto dan nama 1–20 wisudawan.'},
  {title:'Gaya Desain', icon:Layers3, description:'Pilih gaya untuk membuat tiga variasi desain.'},
];

export function Field({label,value,onChange,maxLength,placeholder,type='text',children}: {label:string;value?:string|number;onChange?:(value:string)=>void;maxLength?:number;placeholder?:string;type?:string;children?:ReactNode}) {
  return <label className="field"><span>{label}</span>{children ?? <input type={type} value={value??''} onChange={event => onChange?.(event.target.value)} placeholder={placeholder} maxLength={maxLength}/>}</label>;
}

export function Wizard({project}: {project:Project}) {
  const update = useStudio(store => store.update);
  const save = useStudio(store => store.save);
  const [error,setError] = useState('');
  const [custom,setCustom] = useState(false);
  const [dims,setDims] = useState<{width:string;height:string}>();
  const [busy,setBusy] = useState(false);
  const [uploadBusy,setUploadBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const {step} = project;
  const current = steps[step];
  const go = (next: number) => { setError(''); update({step:next}); void save(); window.scrollTo({top:0}); };
  async function next() {
    setError('');
    if (step === 0 && (!project.name.trim() || !project.headline.trim())) return setError('Isi nama proyek dan judul banner untuk melanjutkan.');
    if (step === 1 && !validSize(project.size)) return setError('Masukkan ukuran 10–1.000 cm dengan rasio lebar banding tinggi antara 0,5 dan 6.');
    if (step === 2 && (!project.graduates.length || project.graduates.some(person => !person.name.trim() || !person.original))) return setError('Isi nama dan unggah satu foto untuk setiap wisudawan.');
    if (step === 3) {
      const seed = project.designs.length ? project.seed+1 : project.seed;
      setBusy(true);
      const designs = await generateInBrowser({...project,seed}).finally(()=>setBusy(false));
      if (designs.length < 3) return setError('Tiga desain belum dapat disusun. Coba ukuran yang lebih lebar atau perpendek judul.');
      update({designs,seed,selected:designs[0].id,thumbnail:undefined});
    }
    go(step+1);
  }
  async function uploadLogo(file?:File) {
    if (!file) return;
    setBusy(true);setError('');
    try {update({logo:await readPhoto(file)});} catch(error){setError((error as Error).message);} finally {setBusy(false);}
  }
  const dimensionInputs = dims ?? {width:String(project.size.width),height:String(project.size.height)};
  const chooseSize = (size: Size) => { setDims(undefined);setCustom(false);update({size}); };
  const showCustom = custom || !presets.some(size => size.width===project.size.width && size.height===project.size.height);
  return <main className="studio-inner wizard">
    <Link href="/projects" className="text-link wizard-back"><ArrowLeft size={15}/> Proyek Saya</Link>
    <div className="wizard-layout">
      <aside className="wizard-aside"><h2>Pembuatan banner</h2><ol className="wizard-steps">{steps.map((item,index) => <li key={item.title}><button disabled={index>step} onClick={() => go(index)} aria-current={step===index?'step':undefined}><span className="wizard-step-icon">{index<step?<Check size={17}/>:<item.icon size={18}/>}</span><span><b>{item.title}</b><small>{index<step?'Selesai':index===step?`Langkah ${index+1} dari 4`:`Langkah ${index+1}`}</small></span></button></li>)}</ol><div className="aside-note"><LockKeyhole size={19}/><p>Foto dan proyek tetap tersimpan di browser ini.</p></div></aside>
      <div className="wizard-main">
        <div className="wizard-heading"><span className="kicker"><current.icon size={16}/> LANGKAH {step+1} / 4</span><h1>{current.title}</h1><p>{current.description}</p></div>
        {step===0 && <div className="wizard-panel">
          <div className="field-grid"><Field label="Nama proyek *" value={project.name} maxLength={120} onChange={name=>update({name})} placeholder="Contoh: Wisuda Informatika"/><Field label="Judul banner *" value={project.headline} maxLength={150} onChange={headline=>update({headline})} placeholder="Contoh: The Final Chapter"/></div>
          <div className="suggestions"><b>Ide judul</b><div>{headlines.map(title => <button className={title===project.headline?'active':''} key={title} onClick={() => update({headline:title})}>{title}</button>)}</div></div>
          <div className="field-grid"><Field label="Universitas" value={project.university} maxLength={140} onChange={university=>update({university})} placeholder="Nama universitas"/><Field label="Fakultas" value={project.faculty} maxLength={100} onChange={faculty=>update({faculty})} placeholder="Nama fakultas"/><Field label="Program studi" value={project.major} maxLength={100} onChange={major=>update({major})} placeholder="Nama program studi"/><Field label="Tahun kelulusan" value={project.year} onChange={year=>update({year})} maxLength={8}/><Field label="Tanggal wisuda" type="date" value={project.date} onChange={date=>update({date})}/><Field label="Tagline" value={project.tagline} maxLength={160} onChange={tagline=>update({tagline})} placeholder="Contoh: Kenangan yang tidak akan pudar"/></div>
          <div className="logo-field"><input hidden type="file" accept="image/jpeg,image/png,image/webp" ref={logoInput} onChange={event => {void uploadLogo(event.target.files?.[0]);event.target.value='';}}/>{project.logo && <img src={project.logo.src} alt="Logo kampus"/>}<Button disabled={busy} onClick={() => logoInput.current?.click()}><Upload size={16}/>{project.logo?'Ganti logo kampus':'Unggah logo kampus'}</Button>{project.logo && <IconButton label="Hapus logo" onClick={() => update({logo:undefined})}><Trash2 size={16}/></IconButton>}</div>
        </div>}
        {step===1 && <div className="wizard-panel">
          <div className="size-grid">{presets.map(size => <button key={size.width+'x'+size.height} className={'size-choice '+(!showCustom && size.width===project.size.width&&size.height===project.size.height?'active':'')} onClick={() => chooseSize(size)}><span style={{aspectRatio:size.width/size.height}}/>{size.width} × {size.height} cm</button>)}<button className={'size-choice '+(showCustom?'active':'')} onClick={() => setCustom(true)}><Ruler size={23}/> Ukuran custom</button></div>
          {showCustom && <div className="field-grid">{(['width','height'] as const).map(key => <Field key={key} label={key==='width'?'Lebar (cm)':'Tinggi (cm)'} value={dimensionInputs[key]} type="number" onChange={value => { const next={...dimensionInputs,[key]:value};setDims(next);if (validSize({width:+next.width,height:+next.height})) update({size:{width:+next.width,height:+next.height}}); }} />)}</div>}
          <div className="size-preview"><div style={{width:`min(86%, ${180*project.size.width/project.size.height}px)`,aspectRatio:project.size.width/project.size.height}}><Ruler size={21}/><b>{project.size.width} × {project.size.height} cm</b></div></div>
        </div>}
        {step===2 && <Graduates project={project} onError={setError} onUploadBusy={setUploadBusy}/>}
        {step===3 && <div className="theme-grid">{themes.map(theme => <button key={theme.id} className={'theme-choice '+(theme.id===project.theme?'active':'')} aria-pressed={theme.id===project.theme} onClick={() => update({theme:theme.id})}><BannerArt id={theme.id}/><div><b>{theme.name}</b>{theme.id===project.theme && <Check size={17}/>}<p>{theme.description}</p></div></button>)}</div>}
        {error && <Notice error>{error}</Notice>}
        <StepActions onBack={step>0?() => go(step-1):undefined} onNext={() => void next()} next={step===3?'Buat 3 variasi desain':'Lanjutkan'} disabled={busy || uploadBusy || (step===1 && !!dims && !validSize({width:+dims.width,height:+dims.height})) || (step===2 && project.graduates.some(person => person.status==='processing'))}/>
      </div>
    </div>
  </main>;
}

function Graduates({project,onError,onUploadBusy}: {project:Project;onError:(value:string)=>void;onUploadBusy:(value:boolean)=>void}) {
  const update = useStudio(store=>store.update);
  const files = useRef<HTMLInputElement>(null);
  const [drag,setDrag] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [processing,setProcessing] = useState(false);
  const [stages,setStages] = useState<Record<string,string>>({});
  const [edit,setEdit] = useState<string>();
  const [replace,setReplace] = useState<string>();
  const [extra,setExtra] = useState<string>();
  const replaceInput = useRef<HTMLInputElement>(null);
  const {graduates} = project;
  const person = graduates.find(item=>item.id===edit);
  const patch = (id:string,change:Partial<Graduate>) => update(value => ({...value,graduates:value.graduates.map(current=>current.id===id?{...current,...change}:current)}));
  const reorder = (index:number,offset:number) => update(value => {
    const graduates = [...value.graduates];
    [graduates[index],graduates[index+offset]] = [graduates[index+offset],graduates[index]];
    return {...value,graduates};
  });

  async function handleFiles(selected?:FileList | null, target?:string) {
    if (!selected?.length || uploading) return;
    onError('');setUploading(true);onUploadBusy(true);
    const problems:string[] = [];
    try {
      if (target) {
        const original = await readPhoto(selected[0]);
        patch(target,{original,status:'idle',processed:undefined,face:undefined,crop:undefined,error:undefined,useCutout:true});
        return;
      }
      const available = 20-graduates.filter(item=>item.original).length;
      if (selected.length>available) problems.push('Maksimal 20 foto. File tambahan tidak dimasukkan.');
      for (const file of Array.from(selected).slice(0,available)) {
        try {
          const original=await readPhoto(file);
          const name=file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').slice(0,140);
          update(value => {
            const blank=value.graduates.findIndex(item=>!item.original);
            if (blank>=0) return {...value,graduates:value.graduates.map((item,index)=>index===blank?{...item,original,name:item.name || name}:item)};
            return value.graduates.length<20 ? {...value,graduates:[...value.graduates,{...newGraduate(),original,name}]} : value;
          });
        } catch (error) { problems.push(file.name+': '+(error as Error).message); }
      }
    } catch(error){problems.push((error as Error).message);}
    finally {setUploading(false);onUploadBusy(false);if(problems.length) onError(problems.join(' '));}
  }

  async function runPhotos(items: Graduate[]) {
    if (processing) return;
    setProcessing(true);
    onError('');
    const jobs = items.filter((item):item is Graduate & {original:NonNullable<Graduate['original']>}=>!!item.original);
    for (const item of jobs) { patch(item.id,{status:'processing',error:undefined}); }
    try {
      for (const {id,original} of jobs) {
        setStages(previous=>({...previous,[id]:'Mendeteksi wajah'}));
        try {
          const result=await processPhoto(original,stage=>setStages(previous=>({...previous,[id]:stage})));
          update(value => ({...value,graduates:value.graduates.map(current => current.id===id && current.original===original ? {...current,
            face:result.face,processed:result.processed,useCutout:!!result.processed,status:result.error?'error':'ready',error:result.error||result.warning
          }:current)}));
        } catch { patch(id,{status:'error',error:'Pemrosesan foto gagal. Foto asli tetap dapat digunakan.',useCutout:false}); }
      }
    } finally {setProcessing(false);}
  }
  function onUpload(event:ChangeEvent<HTMLInputElement>, target?:string) { void handleFiles(event.target.files,target);event.target.value=''; }
  return <div className="wizard-panel graduate-panel">
    <input type="file" hidden multiple ref={files} accept="image/jpeg,image/png,image/webp" onChange={event=>onUpload(event)}/>
    <input type="file" hidden ref={replaceInput} accept="image/jpeg,image/png,image/webp" onChange={event=>onUpload(event,replace)}/>
    <button type="button" className={`dropzone ${drag?'active':''}`} disabled={uploading || processing || graduates.filter(item=>item.original).length>=20} onClick={()=>files.current?.click()} onDragOver={event=>{event.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={event=>{event.preventDefault();setDrag(false);void handleFiles(event.dataTransfer.files);}}>
      {uploading?<LoaderCircle className="spin" size={24}/>:<Upload size={24}/>}<b>{uploading?'Membaca foto…':'Masukin foto pas lagi cakep-cakepnya.'}</b><span>Tarik ke sini atau klik · JPG, PNG, WebP · maks. 20 MB</span>
    </button>
    <div className="graduate-toolbar"><h3>{graduates.length} / 20 wisudawan</h3><div className="wrap-actions"><Button disabled={processing || uploading || !graduates.some(item=>item.original && item.status!=='ready')} onClick={()=>void runPhotos(graduates.filter(item=>item.status!=='ready'))}><ScanFace size={17}/> {processing?'Lagi rapihin foto kalian…':'Proses semua foto'}</Button><Button disabled={graduates.length>=20 || uploading || processing} onClick={()=>update(value=>({...value,graduates:[...value.graduates,newGraduate()]}))}><Plus size={17}/> Tambah</Button></div></div>
    {graduates.map((item,index) => {
      const photo=activePhoto(item);
      return <article key={item.id} className="graduate-card">
        <div className="graduate-photo checker">{photo?<img src={photo.src} alt={`Foto ${item.name || index+1}`}/>:<ImagePlus size={24}/>}</div>
        <div className="graduate-fields">
          <div className="field-grid"><Field label={`Nama wisudawan ${index+1} *`} value={item.name} maxLength={140} onChange={name=>patch(item.id,{name})}/><Field label="Gelar" value={item.degree} maxLength={60} onChange={degree=>patch(item.id,{degree})} placeholder="S.Kom."/></div>
          <div className="graduate-buttons">
            <Button variant="ghost" disabled={processing || uploading} onClick={()=>{setReplace(item.id);replaceInput.current?.click();}}>{photo?'Ganti foto':'Unggah foto'}</Button>
            {photo && <><Button variant="ghost" onClick={()=>setEdit(item.id)}><Crop size={14}/> Atur foto</Button><Button variant="ghost" disabled={processing} onClick={()=>void runPhotos([item])}>{item.status==='ready' || item.status==='error'?'Proses ulang':'Hapus latar'}</Button><IconButton label={`Hapus foto ${item.name || index+1}`} disabled={processing} onClick={()=>patch(item.id,{original:undefined,processed:undefined,face:undefined,crop:undefined,status:'idle',error:undefined})}><Trash2 size={14}/></IconButton></>}
            <Button variant="ghost" aria-expanded={extra===item.id} onClick={()=>setExtra(extra===item.id?undefined:item.id)}>Detail <ChevronDown size={14}/></Button>
          </div>
          {extra===item.id && <div className="field-grid"><Field label="Nama panggilan" value={item.nickname} maxLength={80} onChange={nickname=>patch(item.id,{nickname})}/><Field label="Kutipan singkat" value={item.quote} maxLength={150} onChange={quote=>patch(item.id,{quote})}/></div>}
          {item.processed && <label className="check-field"><input type="checkbox" checked={item.useCutout} onChange={event=>patch(item.id,{useCutout:event.target.checked})}/> Gunakan foto tanpa latar</label>}
          {item.status==='processing' && <p className="photo-status" role="status"><LoaderCircle size={14} className="spin"/>{stages[item.id]||'Dalam antrean'}</p>}
          {item.error && <p className={`photo-status ${item.status==='error'?'error-text':''}`}>{item.error}</p>}
        </div>
        <div className="graduate-reorder"><IconButton label="Geser ke atas" disabled={index===0} onClick={()=>reorder(index,-1)}><ArrowUp size={15}/></IconButton><IconButton label="Geser ke bawah" disabled={index===graduates.length-1} onClick={()=>reorder(index,1)}><ArrowDown size={15}/></IconButton><IconButton label={`Hapus wisudawan ${index+1}`} disabled={processing} onClick={()=>update(value=>({...value,graduates:value.graduates.filter(person=>person.id!==item.id)}))}><Trash2 size={15}/></IconButton></div>
      </article>;
    })}
    {person && <PhotoControls graduate={person} onClose={()=>setEdit(undefined)} onApply={change=>patch(person.id,change)}/>}
  </div>;
}
