'use client';

import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, ImagePlus, Layers3,  PencilRuler, ScanFace, Sparkle, Sparkles, WandSparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { themes } from '@/lib/themes';
import { BannerArt } from './artwork';
import { Faq, Footer, Header, IconButton } from './site';

const themeLabels = {
  adventure:'EKSPEDISI', scrapbook:'ALBUM',picnic:'KULINER',chibi:'KARTUN',gaming:'GAMING',photocard:'KOLEKSI',
  newspaper:'EDITORIAL',floral:'TAMAN',cinematic:'POSTER FILM',nostalgia:'KENANGAN',elegant:'KLASIK',meme:'HUMOR',
};
const heroThemes = ['newspaper','gaming','adventure','scrapbook','picnic','cinematic'].map(id=>themes.find(theme=>theme.id===id)!);
const steps = [
  {icon:ImagePlus,title:'Kumpulin Foto',text:'Masukkan foto dan nama teman-teman seperjuanganmu.'},
  {icon:Sparkles,title:'Pilih Vibes',text:'Mau aesthetic, elegan, cinematic, atau absurd? Bebas!'},
  {icon:Download,title:'Jadi, deh!',text:'Pilih hasil favorit, edit sesukamu, lalu download.'},
];
const answers: [string,string][] = [
  ['Apakah Akhirnya! gratis?', 'Ya. Kamu bisa membuat, mengedit, dan mengunduh banner tanpa akun atau layanan AI berbayar.'],
  ['Berapa banyak wisudawan dalam satu banner?', 'Satu proyek dapat memuat 1 sampai 20 wisudawan. Tata letak menyesuaikan jumlah foto dan ukuran banner.'],
  ['Apakah foto saya diunggah ke server?', 'Foto diproses di perangkatmu. Proyek dan foto disimpan di browser ini, dan bisa dihapus dari Proyek Saya.'],
  ['Format apa yang bisa saya unduh?', 'Akhirnya! mendukung PNG, JPG, dan PDF. Eksportir menampilkan dimensi hasil dan memperingatkan jika DPI melebihi batas browser atau resolusi foto kurang.'],
  ['Bisa digunakan untuk mencetak banner besar?', 'Bisa. Tentukan ukuran dalam sentimeter dan pilih DPI sesuai kebutuhan percetakan. Hasil akhir juga bergantung pada resolusi foto yang kamu unggah.'],
];

export function Landing() {
  const [slide,setSlide] = useState(0);
  const current = heroThemes[slide];
  const reducedMotion = useReducedMotion();
  const change = (offset:number) => setSlide(value => (value+offset+heroThemes.length)%heroThemes.length);

  return <><Header/><main>
    <section className="hero"><div className="site-inner hero-grid">
      <div className="hero-copy">
        <div className="eyebrow-pill"><Sparkles size={15}/> UNTUK KAMU YANG AKHIRNYA LULUS!</div>
        <h1>Akhirnya lulus.<br/>Akhirnya bikin <em>banner!</em></h1>
        <p>Bertahun-tahun kuliah, berbulan-bulan revisi, masa bikin banner masih harus ribet? Upload foto, masukkan nama teman-temanmu, pilih desain, dan biarkan kami mengurus sisanya.</p>
        <div className="hero-actions"><Link className="btn btn-primary" href="/create"><WandSparkles size={19}/> Bikin Banner Sekarang</Link><Link className="btn btn-secondary" href="#inspirasi">Intip Desainnya <ArrowDown size={17}/></Link></div>
        <div className="hero-note">Tanpa skill desain. Tanpa ribet. Tinggal cetak!</div>
      </div>
      <div className="hero-visual" aria-roledescription="karusel" aria-label="Contoh banner wisuda">
        <div className="visual-backdrop"><Sparkle className="visual-star vs-one" strokeWidth={1.55}/><Sparkle className="visual-star vs-two" strokeWidth={1.5}/><Sparkle className="visual-star vs-three" strokeWidth={1.5}/>
          <svg className="hero-scribble" viewBox="0 0 74 49" aria-hidden="true"><path d="M2 44c18 0 44-9 63-35m-24 7L70 3l-5 25" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="banner-under under-one"/><div className="banner-under under-two"/>
          <motion.div className="hero-art" key={current.id} initial={reducedMotion?false:{opacity:.55,y:6,rotate:-3}} animate={{opacity:1,y:0,rotate:-4}} transition={{duration:reducedMotion?0:.28}}><BannerArt id={current.id}/></motion.div>
          <div className="floating-label"><span/> {current.name}</div>
        </div>
        <div className="carousel-controls"><div className="carousel-dots" aria-label="Pilih contoh">{heroThemes.map((theme,index) => <button key={theme.id} aria-label={theme.name} aria-pressed={slide===index} onClick={() => setSlide(index)} />)}</div><div className="carousel-arrows"><IconButton label="Contoh sebelumnya" onClick={() => change(-1)}><ChevronLeft size={18}/></IconButton><IconButton label="Contoh berikutnya" onClick={() => change(1)}><ChevronRight size={18}/></IconButton></div></div>
      </div>
    </div></section>

    <section className="inspiration section" id="inspirasi"><div className="site-inner">
      <div className="section-head gallery-head"><div><span className="kicker"><Layers3 size={16}/> INSPIRASI DESAIN</span><h2>Setiap angkatan punya <em>ceritanya.</em></h2><p>Temukan desain yang paling menggambarkan perjalanan kalian.</p></div><Link className="btn btn-secondary" href="/gallery">Lihat Semua Gaya <ArrowUpRight size={17}/></Link></div>
      <div className="inspiration-grid">{themes.slice(0,3).map((theme) => <Link href={`/create?style=${theme.id}`} className="inspiration-card" key={theme.id}><div className="art-thumbnail" style={{background:theme.palettes[0].soft}}><BannerArt id={theme.id}/></div><div className="style-card-label"><div><span>{themeLabels[theme.id]}</span><h3>{theme.name}</h3></div><ArrowUpRight size={21}/></div></Link>)}</div>
    </div></section>

    <section className="section steps-section" id="cara-kerja"><div className="site-inner"><div className="section-head centered"><span className="kicker"><Sparkles size={16}/> CARA KERJA</span><h2>Dari foto jadi banner, <em>segampang itu.</em></h2></div><div className="steps-grid">{steps.map((item,index) => <article key={item.title}><span className={`step-icon step-icon-${index}`}><item.icon size={25}/></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
    <BeforeAfter/>
    <section className="product-features" aria-labelledby="fitur"><div className="site-inner"><div className="section-head"><h2 id="fitur">Yang ribet biar <em>skripsi aja.</em></h2></div><div className="feature-strip">
      <article><ScanFace size={22}/><div><h3>Bye-bye background!</h3><p>Hapus latar foto otomatis langsung di perangkatmu.</p></div></article>
      <article><Layers3 size={22}/><div><h3>Tata letak adaptif</h3><p>Susunan menyesuaikan ukuran banner dan jumlah wisudawan.</p></div></article>
      <article><PencilRuler size={22}/><div><h3>Desain bisa disunting</h3><p>Geser potret, ubah teks, dan sesuaikan warna di studio.</p></div></article>
      <article><Download size={22}/><div><h3>Ekspor ukuran cetak</h3><p>Tentukan ukuran fisik dan DPI, lalu unduh sebagai PNG, JPG, atau PDF.</p></div></article>
    </div></div></section>
    <section className="section faq-section" id="faq"><div className="site-inner faq-grid"><div className="section-head"><span className="kicker">FAQ</span><h2>Ada yang ingin<br/> <em>kamu tahu?</em></h2></div><Faq questions={answers}/></div></section>
    <section className="site-inner last-cta"><div><GraduationIcon/><h2>Udah sampai sejauh ini, masa nggak dirayain?</h2><p>Karena setiap perjuangan layak dirayakan.</p><Link href="/create" className="btn btn-primary">Yuk, Bikin Banner! <ArrowRight size={19}/></Link></div></section>
  </main><Footer/></>;
}

function GraduationIcon() { return <Sparkles size={31} strokeWidth={1.65} className="cta-star"/>; }

function BeforeAfter() {
  const [after,setAfter] = useState(true);
  return <section className="section processing-section"><div className="site-inner processing-grid">
    <div className="processing-visual"><div className="processing-demo"><img src={after?'/demo/raka-cutout.png':'/demo/raka.webp'} alt={after?'Contoh potret tanpa latar':'Contoh foto asli'}/></div><div className="segmented"><button aria-pressed={!after} onClick={() => setAfter(false)}>Foto asli</button><button aria-pressed={after} onClick={() => setAfter(true)}>Tanpa latar</button></div></div>
    <div className="section-head"><span className="kicker"><ScanFace size={16}/> PEMROSESAN FOTO</span><h2>Wajahmu tetap <em>wajahmu.</em></h2><p>Akhirnya! menghapus latar dan membantu memosisikan wajah tanpa mengubah identitasmu. Kamu bisa kembali ke foto asli kapan saja.</p><Link className="text-link" href="/create">Coba dengan fotomu <ArrowUpRight size={17}/></Link></div>
  </div></section>;
}

export function Gallery() {
  return <><Header/><main className="site-inner section gallery-page"><Link className="text-link" href="/"><ArrowLeft size={16}/> Beranda</Link><div className="section-head"><span className="kicker"><Layers3 size={16}/> INSPIRASI DESAIN</span><h1>Setiap angkatan punya <em>ceritanya.</em></h1><p>Temukan desain yang paling menggambarkan perjalanan kalian.</p></div><div className="inspiration-grid">{themes.map((theme) => <Link href={`/create?style=${theme.id}`} className="inspiration-card" key={theme.id}><div className="art-thumbnail" style={{background:theme.palettes[0].soft}}><BannerArt id={theme.id}/></div><div className="style-card-label"><div><span>{themeLabels[theme.id]}</span><h3>{theme.name}</h3><p>{theme.description}</p></div><ArrowUpRight size={21}/></div></Link>)}</div></main><Footer/></>;
}
