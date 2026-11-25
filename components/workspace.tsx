'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { releasePortraitCache } from '@/lib/photos';
import { normalizeProject, projects } from '@/lib/storage';
import { useStudio } from '@/lib/studio-store';
import { Header, Notice } from './site';
import { Wizard } from './wizard';

const Results = dynamic(() => import('./results').then(module=>module.Results),{ssr:false});
const Editor = dynamic(() => import('./editor').then(module=>module.Editor),{ssr:false});

export function Workspace({id}: {id:string}) {
  const project=useStudio(store=>store.project);
  const open=useStudio(store=>store.open);
  const save=useStudio(store=>store.save);
  const status=useStudio(store=>store.status);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    void projects.get(id).then(item=>{
      if (cancelled) return;
      if (item) open(normalizeProject(item)); else setError('Proyek ini tidak ditemukan di browser.');
    },()=>{if (!cancelled) setError('Penyimpanan lokal tidak dapat dibuka.');});
    const flush=()=>{void save();};
    window.addEventListener('pagehide',flush);
    const onHidden=()=>{if(document.visibilityState==='hidden') flush();};
    document.addEventListener('visibilitychange',onHidden);
    return ()=>{cancelled=true;window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onHidden);if (useStudio.getState().project?.id===id) flush();releasePortraitCache();};
  },[id,open,save]);
  if (!project || project.id!==id) return <><Header/><main className="site-inner section">{error?<><Notice error>{error}</Notice><Link className="text-link" href="/projects">Kembali ke Proyek Saya</Link></>:<p role="status" className="wrap-actions"><LoaderCircle size={18} className="spin"/> Membuka proyek lokal…</p>}</main></>;
  const selected=project.designs.find(design=>design.id===project.selected);
  return <>{project.step!==5 && <Header/>}{status==='error' && <div className="studio-inner"><Notice error>Penyimpanan otomatis gagal. Periksa kapasitas penyimpanan browser.</Notice></div>}{project.step<4?<Wizard project={project}/>:project.step===5&&selected?<Editor project={project} design={selected}/>:<Results project={project}/>}</>;
}
