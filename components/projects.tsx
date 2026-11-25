'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Copy, Download, FolderOpen, ImagePlus, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { brandId,defaultProjectName } from '@/lib/brand';
import { demoProject } from '@/lib/demo';
import { saveFile } from '@/lib/export';
import { duplicateProject, exportProject, normalizeProject, parseProject, projects } from '@/lib/storage';
import { themes } from '@/lib/themes';
import { newProject, type Project } from '@/lib/types';
import { BannerArt } from './artwork';
import { Button, Dialog, Footer, Header, IconButton, Notice } from './site';

export function CreateProject() {
  const router = useRouter();
  const [error,setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const project = newProject();
    const query = new URLSearchParams(window.location.search);
    project.theme = themes.find(theme => theme.id === query.get('style'))?.id ?? project.theme;
    void projects.put(project).then(() => router.replace('/studio/'+project.id), () => setError('Penyimpanan browser tidak tersedia. Periksa izin penyimpanan lalu coba lagi.'));
  },[router]);
  return <><Header/><main className="site-inner section"><h1 className="page-title">Buat banner</h1>{error ? <Notice error>{error}</Notice> : <p role="status">Membuka proyek baru…</p>}</main></>;
}

export function ProjectList() {
  const router = useRouter();
  const [items,setItems] = useState<Project[]>();
  const [error,setError] = useState('');
  const [action,setAction] = useState<{kind:'rename'|'delete'; project:Project}>();
  const [name,setName] = useState('');
  const [busy,setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const refresh = () => projects.list().then(setItems, () => setError('Proyek lokal tidak dapat dibaca.'));
  useEffect(() => { void refresh(); },[]);
  async function run(task:()=>Promise<void>) {
    setError(''); setBusy(true);
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : 'Proyek tidak dapat disimpan.'); }
    finally { setBusy(false); }
  }
  async function importFile(source?: File) {
    if (!source) return;
    await run(async () => {
      if (source.size > 150*1024*1024) throw new Error('Ukuran file proyek melebihi 150 MB.');
      const imported = normalizeProject(parseProject(await source.text()));
      const project = duplicateProject(imported,'');
      await projects.put(project);
      router.push('/studio/'+project.id);
    });
  }

  return <><Header/><main className="site-inner section projects-page"><div className="section-head gallery-head"><div><span className="kicker"><FolderOpen size={16}/> PENYIMPANAN LOKAL</span><h1>Proyek <em>Saya.</em></h1><p>Proyek dan foto tersimpan di browser ini. Unduh file proyek untuk membuat salinan atau memindahkannya ke perangkat lain.</p></div><div className="wrap-actions"><Button onClick={() => file.current?.click()} disabled={busy}><Upload size={17}/> Impor proyek</Button><Link href="/create" className="btn btn-primary"><Plus size={17}/> Buat banner</Link></div></div>
  <input ref={file} type="file" accept=".akhirnya,.gradify,.json,application/json" hidden onChange={event => { void importFile(event.target.files?.[0]);event.target.value=''; }}/>
  {error && <Notice error>{error}</Notice>}
  {items && !items.length && <div className="empty-projects"><span className="step-icon"><ImagePlus size={24}/></span><h2>Belum ada banner nih. Kapan kita mulai?</h2><p>Buat banner sendiri atau buka contoh untuk mencoba studio.</p><div className="wrap-actions"><Link href="/create" className="btn btn-primary">Mulai dari nol <ArrowUpRight size={17}/></Link><Button onClick={() => void run(async () => {const demo=await demoProject();await projects.put(demo);router.push('/studio/'+demo.id);})} disabled={busy}><Sparkles size={17}/> Buka proyek contoh</Button></div></div>}
  {items && items.length > 0 && <><div className="inspiration-grid">{items.map(item => <article className="inspiration-card project-card" key={item.id}><Link className="project-thumb" href={'/studio/'+item.id}>{item.thumbnail?<img src={item.thumbnail} alt="Pratinjau proyek"/>:<BannerArt id={item.theme}/>}</Link><div className="project-meta"><Link href={'/studio/'+item.id}><h2>{item.name || defaultProjectName}</h2></Link><p>{item.graduates.length} wisudawan · {new Intl.DateTimeFormat('id-ID',{dateStyle:'medium'}).format(item.updatedAt)}</p><div className="wrap-actions">
    <IconButton label="Ubah nama proyek" onClick={() => {setName(item.name);setAction({kind:'rename',project:item});}}><Pencil size={15}/></IconButton>
    <IconButton label="Duplikat proyek" disabled={busy} onClick={() => void run(async () => {await projects.put(duplicateProject(item));await refresh();})}><Copy size={15}/></IconButton>
    <IconButton label="Unduh file proyek" onClick={() => {try { const backup = new Blob([exportProject(item)],{type:'application/json'}); if (backup.size > 150*1024*1024) throw new Error(); saveFile(backup,(item.name||brandId)+'.'+brandId); } catch {setError('File cadangan terlalu besar. Gunakan foto yang lebih kecil untuk membuat cadangan.');}}}><Download size={15}/></IconButton>
    <IconButton label="Hapus proyek" onClick={() => setAction({kind:'delete',project:item})}><Trash2 size={15}/></IconButton>
  </div></div></article>)}</div><Button className="demo-action" disabled={busy} onClick={() => void run(async () => {const demo=await demoProject();await projects.put(demo);router.push('/studio/'+demo.id);})}><Sparkles size={17}/> Buka proyek contoh</Button></>}
  {action && <Dialog title={action.kind==='rename'?'Ubah nama proyek':'Hapus proyek?'} onClose={() => setAction(undefined)}>
    {action.kind==='rename'?<label className="field"><span>Nama proyek</span><input value={name} onChange={event => setName(event.target.value)} maxLength={120}/></label>:<p>“{action.project.name || defaultProjectName}” dan fotonya akan dihapus dari browser ini.</p>}
    <div className="dialog-actions"><Button onClick={() => setAction(undefined)}>Batal</Button><Button variant={action.kind==='rename'?'primary':'danger'} disabled={busy || (action.kind==='rename'&&!name.trim())} onClick={() => void run(async () => {if (action.kind==='rename') await projects.put({...action.project,name:name.trim(),updatedAt:Date.now()}); else await projects.remove(action.project.id);setAction(undefined);await refresh();})}>{action.kind==='rename'?'Simpan':'Hapus proyek'}</Button></div>
  </Dialog>}
  </main><Footer/></>;
}
