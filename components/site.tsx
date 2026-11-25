'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Brand({ small = false }: {small?:boolean}) {
  return <Link href="/" className={small?'brand brand-small':'brand'} aria-label="Akhirnya! — Beranda"><img className="brand-wordmark" src="/brand/wordmark.svg" alt=""/><img className="brand-compact" src="/icon.svg" alt=""/></Link>;
}

export function Header() {
  const [open,setOpen] = useState(false);
  return <header className="site-header"><div className="site-inner nav-row">
    <Brand/>
    <nav className={open?'main-nav open':'main-nav'} aria-label="Navigasi utama">
      <Link href="/#cara-kerja" onClick={() => setOpen(false)}>Cara Kerja</Link>
      <Link href="/#inspirasi" onClick={() => setOpen(false)}>Inspirasi</Link>
      <Link href="/#faq" onClick={() => setOpen(false)}>FAQ</Link>
      <Link className="mobile-projects" href="/projects" onClick={() => setOpen(false)}>Proyek Saya</Link>
    </nav>
    <div className="nav-actions"><Link href="/projects" className="nav-projects">Proyek Saya</Link><Link href="/create" className="btn btn-primary btn-nav">Bikin Banner <ArrowUpRight size={17}/></Link>
      <button className="icon-btn menu-toggle" onClick={() => setOpen(!open)} aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open}>{open?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
  </div></header>;
}

export function Footer() {
  return <footer className="footer"><div className="site-inner footer-main"><div><Brand/><p>Dibuat untuk mereka yang akhirnya sampai di garis finish, dan siap memulai cerita baru.</p></div><nav aria-label="Tautan footer"><Link href="/#inspirasi">Inspirasi</Link><Link href="/#faq">FAQ</Link><Link href="/projects">Proyek Saya</Link></nav></div><div className="site-inner footer-bottom"><span>© {new Date().getFullYear()} Akhirnya!</span><span>Perjuangan panjang, bikin banner gampang.</span></div></footer>;
}

export function Button({ children, variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'primary'|'secondary'|'ghost'|'danger'}) {
  return <button type="button" className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {label:string}) {
  return <button type="button" className={'icon-btn '+className} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Dialog({ title, children, onClose, wide = false }: {title:string;children:ReactNode;onClose:() => void;wide?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => { element?.close(); };
  },[]);
  return <dialog ref={ref} className={`dialog ${wide?'dialog-wide':''}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><div className="dialog-head"><h2>{title}</h2><IconButton label="Tutup" onClick={onClose} autoFocus><X size={21}/></IconButton></div>{children}</dialog>;
}

export function StepActions({ onBack, onNext, next = 'Lanjutkan', disabled }: {onBack?:()=>void;onNext:()=>void;next?:string;disabled?:boolean}) {
  return <div className="step-actions">{onBack?<Button onClick={onBack}><ArrowLeft size={17}/> Kembali</Button>:<span/>}<Button variant="primary" onClick={onNext} disabled={disabled}>{next} <ArrowRight size={18}/></Button></div>;
}

export function Faq({ questions }: {questions:[string,string][]}) {
  return <div className="faq-list">{questions.map(([question,answer]) => <details key={question}><summary>{question}<ChevronDown size={20}/></summary><p>{answer}</p></details>)}</div>;
}

export function Notice({ children, error = false }: {children: ReactNode;error?:boolean}) {
  return <p role={error?'alert':'status'} className={`notice ${error?'notice-error':''}`}>{!error && <Check size={15}/>} {children}</p>;
}
