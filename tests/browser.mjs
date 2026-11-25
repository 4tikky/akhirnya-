import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.AKHIRNYA_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});

async function storedProject(page) {
  const id = new URL(page.url()).pathname.split('/').at(-1);
  return page.evaluate(async id => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('akhirnya-projects');
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
    try {
      return await new Promise((resolve,reject) => {
        const request = db.transaction('projects').objectStore('projects').get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
    } finally { db.close(); }
  },id);
}

async function download(page) {
  const [result] = await Promise.all([
    page.waitForEvent('download', { timeout: 75_000 }),
    page.getByRole('button',{name:'Unduh banner',exact:true}).click(),
  ]);
  assert.equal(await result.failure(),null);
  const path = await result.path();
  assert(path);
  return readFile(path);
}

async function openSizeStep(page) {
  await page.getByRole('link',{name:'Bikin Banner Sekarang'}).first().click();
  await page.getByLabel('Nama proyek *').fill('Wisuda Bersama');
  await page.getByLabel('Universitas').fill('Universitas Nusantara');
  await page.getByRole('button',{name:'Lanjutkan'}).click();
}

async function create(page, sizePreset) {
  await openSizeStep(page);
  await page.getByRole('button',{name:sizePreset,exact:true}).click();
  await page.getByRole('button',{name:'Lanjutkan'}).click();
}

async function checkAspect(locator, ratio) {
  const bounds = await locator.boundingBox();
  assert(bounds && bounds.height>0);
  assert(Math.abs(bounds.width/bounds.height-ratio)<.008,`aspect ratio ${bounds.width}/${bounds.height}`);
}

async function waitForSaved(page, check, timeout = 15000) {
  const until=Date.now()+timeout;
  while(Date.now()<until) {
    const value=await storedProject(page);
    if(check(value)) return value;
    await new Promise(resolve=>setTimeout(resolve,180));
  }
  throw new Error('Perubahan tidak ditemukan dalam IndexedDB.');
}

try {
  const page = await browser.newPage({viewport:{width:1440,height:950},acceptDownloads:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console', message=>{
    if (message.type()==='warning' && /Akhirnya!:/.test(message.text())) console.log(message.text());
  });
  await page.goto(base);
  await page.getByRole('heading',{name:/Akhirnya lulus. Akhirnya bikin banner!/}).waitFor();
  assert.equal(await page.title(),'Akhirnya! — Bikin Banner Wisuda Otomatis');
  await page.getByRole('button',{name:'Contoh berikutnya'}).click();
  await page.getByRole('img',{name:'Contoh banner Mission Passed'}).first().waitFor();
  await create(page,'300 × 150 cm');
  await page.locator('input[type=file][multiple]').setInputFiles(['public/demo/raka.webp','public/demo/nadia.webp']);
  await page.getByLabel('Nama wisudawan 1 *').fill('Raka Pratama');
  await page.getByLabel('Nama wisudawan 2 *').fill('Nadia Putri');
  await page.getByLabel('Gelar',{exact:true}).first().fill('S.Kom.');
  await page.getByRole('button',{name:'Proses semua foto'}).click();
  const photos=await waitForSaved(page,item=>item?.graduates.length===2&&item.graduates.every(person=>['ready','error'].includes(person.status)),45000);
  assert(photos.graduates.every(person=>person.status==='ready' && person.processed && person.face),JSON.stringify(photos.graduates.map(({name,status,error,face})=>({name,status,error,face}))));
  if(process.env.AKHIRNYA_SAVE_SAMPLE) await writeFile('public/demo/raka-cutout.png',Buffer.from(photos.graduates[0].processed.src.split(',')[1],'base64'));
  console.log('Dua unggahan berhasil disegmentasi dan wajah terdeteksi.');
  await page.getByRole('button',{name:'Lanjutkan'}).click();
  await page.getByRole('button',{name:/Mission Passed/}).click();
  await page.getByRole('button',{name:'Buat 3 variasi desain'}).click();
  await page.getByRole('img',{name:'Pratinjau desain Mission Passed'}).nth(2).waitFor({timeout:30000});
  assert.equal(await page.getByRole('img',{name:'Pratinjau desain Mission Passed'}).count(),3);
  await page.getByRole('checkbox',{name:'Bandingkan variasi 1'}).check();
  await page.getByRole('checkbox',{name:'Bandingkan variasi 2'}).check();
  await page.getByRole('button',{name:'Bandingkan (2)'}).click();
  await page.getByRole('dialog',{name:'Bandingkan desain'}).waitFor();
  await page.getByRole('button',{name:'Tutup',exact:true}).click();
  await page.getByRole('button',{name:'Jadikan favorit'}).first().click();
  await page.getByRole('button',{name:'Coba vibes lain'}).click();
  await page.getByRole('button',{name:'Edit desain'}).nth(3).waitFor();
  await page.getByRole('button',{name:'Edit desain'}).first().click();
  await page.getByRole('button',{name:'Simpan dulu (Ctrl+S)'}).waitFor();
  await page.getByRole('button',{name:'Teks',exact:true}).click();
  await page.getByRole('button',{name:'Tambah judul'}).click();
  await page.getByLabel('Isi teks').fill('Judul teruji');
  await page.getByRole('button',{name:'Urungkan (Ctrl+Z)'}).click();
  await page.getByRole('button',{name:'Judul baru',exact:true}).waitFor();
  await page.getByRole('button',{name:'Ulangi (Ctrl+Shift+Z)'}).click();
  await page.getByRole('button',{name:'Judul teruji',exact:true}).waitFor();
  await page.getByRole('button',{name:'Simpan dulu (Ctrl+S)'}).click();
  await waitForSaved(page,item=>item?.designs.some(design=>design.canvas?.objects.some(object=>object.text==='Judul teruji')));
  await page.reload();
  await page.getByRole('button',{name:'Judul teruji',exact:true}).waitFor();
  if(process.env.AKHIRNYA_SHOTS) await page.screenshot({path:'/tmp/akhirnya-editor.png'});
  console.log('Tiga variasi, favorit, bandingkan, regenerasi, edit, undo/redo, simpan, dan muat ulang berhasil.');

  await page.getByRole('button',{name:'Siap Cetak!',exact:true}).click();
  await page.getByLabel('Resolusi').selectOption('100');
  await page.getByText(/Ukuran ini melampaui batas kanvas browser/).waitFor();
  await page.getByLabel('Lebar (cm)').fill('200');
  await page.getByLabel('Tinggi (cm)').fill('100');
  const png = await download(page);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),7874);
  assert.equal(png.readUInt32BE(20),3937);
  assert.equal(png.subarray(37,41).toString(),'pHYs');
  assert.equal(png.readUInt32BE(41),3937);
  assert(png.includes(Buffer.from('Software\0Akhirnya!')));
  await page.getByLabel('Lebar (cm)').fill('20');
  await page.getByLabel('Tinggi (cm)').fill('10');
  await page.getByLabel('Bleed per sisi (mm)').fill('5');
  await page.getByLabel('Format file').selectOption('jpeg');
  const jpeg=await download(page);
  assert.equal(jpeg.readUInt16BE(0),0xffd8);
  assert(jpeg.length>5000);
  assert.equal(jpeg.subarray(6,10).toString(),'JFIF');
  assert.equal(jpeg[13],1);
  assert.equal(jpeg.readUInt16BE(14),100);
  assert(jpeg.includes(Buffer.from('Akhirnya!')));
  await page.getByLabel('Format file').selectOption('pdf');
  const pdf=await download(page);
  const mediaBox=pdf.toString('latin1').match(/\/MediaBox\s*\[0\s+0\s+([\d.]+)\s+([\d.]+)\]/);
  assert(mediaBox);
  assert(pdf.includes(Buffer.from('/Creator (Akhirnya!)')));
  assert(Math.abs(Number(mediaBox[1])*25.4/72-210)<.001);
  assert(Math.abs(Number(mediaBox[2])*25.4/72-110)<.001);
  await page.getByRole('button',{name:'Tutup',exact:true}).last().click();
  console.log('PNG 100 DPI, JPEG, dan MediaBox PDF 210 × 110 mm terverifikasi.');

  await page.getByRole('link',{name:'Akhirnya! — Beranda'}).click();
  await page.getByRole('link',{name:'Proyek Saya',exact:true}).first().click();
  const backupPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Unduh file proyek'}).first().click();
  const path=await (await backupPromise).path();
  assert(path);
  const backup = await readFile(path);
  assert.equal(JSON.parse(backup).format,'akhirnya');
  if(process.env.AKHIRNYA_SHOTS) await writeFile('/tmp/akhirnya-backup.akhirnya',backup);
  await page.locator('input[type=file]').setInputFiles({name:'backup.akhirnya',mimeType:'application/json',buffer:backup});
  await Promise.race([
    page.getByRole('button',{name:'Judul teruji',exact:true}).waitFor(),
    page.locator('.notice-error').filter({hasText:/proyek|penyimpanan/i}).innerText().then(message=>{throw new Error(message);}),
  ]);
  assert.deepEqual(errors,[]);
  console.log('File proyek yang diekspor berhasil diimpor kembali beserta editannya.');

  const migration = await browser.newPage();
  await migration.goto(base);
  const oldProject = JSON.parse(backup).project;
  await migration.evaluate(async project => {
    const db = await new Promise((resolve,reject)=>{
      const request = indexedDB.open('gradify-projects',1);
      request.onupgradeneeded = () => request.result.createObjectStore('projects',{keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve,reject)=>{
      const transaction = db.transaction('projects','readwrite');
      transaction.objectStore('projects').put(project);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  },oldProject);
  await migration.goto(base+'/studio/'+oldProject.id);
  await migration.getByRole('button',{name:'Judul teruji',exact:true}).waitFor();
  assert.equal((await storedProject(migration)).id,oldProject.id);
  console.log('Migrasi IndexedDB mempertahankan proyek dan desain yang sudah diedit.');

  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.route('**/models/**',route=>route.abort());
  await fallback.goto(base);
  assert.equal(await fallback.evaluate(()=>document.documentElement.scrollWidth),390);
  assert(await fallback.evaluate(()=>document.querySelector('.hero-visual').getBoundingClientRect().top >= document.querySelector('.hero-copy').getBoundingClientRect().bottom));
  await create(fallback,'200 × 100 cm');
  await fallback.locator('input[type=file][multiple]').setInputFiles('public/demo/raka.webp');
  await fallback.getByRole('button',{name:'Hapus latar',exact:true}).click();
  await fallback.getByText('Latar tidak dapat dihapus. Foto asli tetap dapat digunakan.',{exact:true}).waitFor();
  await fallback.getByRole('button',{name:'Lanjutkan'}).click();
  await fallback.getByRole('button',{name:'Buat 3 variasi desain'}).click();
  await fallback.getByRole('img',{name:'Pratinjau desain Vintage Newspaper'}).nth(2).waitFor();
  console.log('Alur mobile tetap menghasilkan tiga variasi ketika pemuatan model diblokir.');

  const edges=await browser.newPage();
  await edges.goto(base);
  await create(edges,'400 × 100 cm');
  const grey=await edges.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=24;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#96a8ba';
    ctx.fillRect(0,0,24,24);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await edges.locator('input[type=file][multiple]').setInputFiles([
    {name:'foto kelompok.webp',mimeType:'image/webp',buffer:await readFile('public/graduates.webp')},
    {name:'tanpa wajah.png',mimeType:'image/png',buffer:Buffer.from(grey,'base64')},
  ]);
  await edges.getByRole('button',{name:'Proses semua foto'}).click();
  const edgeProject=await waitForSaved(edges,item=>item?.graduates.length===2&&item.graduates.every(person=>['ready','error'].includes(person.status)),45000);
  const [group,blank]=edgeProject.graduates;
  assert(group.face);
  assert.match(group.error ?? '',/Beberapa wajah/);
  assert.equal(blank.face,undefined);
  assert(blank.original);
  await edges.getByRole('button',{name:'Lanjutkan'}).click();
  await edges.getByRole('button',{name:'Buat 3 variasi desain'}).click();
  await edges.getByRole('img',{name:'Pratinjau desain Vintage Newspaper'}).nth(2).waitFor();
  await edges.getByRole('button',{name:'Unduh variasi 1'}).click();
  await edges.getByText(/Resolusi foto mungkin kurang pada DPI ini/).waitFor();
  console.log('Foto lanskap dengan beberapa wajah dan foto kecil tanpa wajah menghasilkan fallback dan peringatan yang tepat.');
  for (const {width,height,count,custom,style} of [
    {width:60,height:160,count:3,custom:true,style:'Vintage Newspaper'},
    {width:80,height:180,count:5,custom:false,style:'Cinematic Poster'},
  ]) {
    const stand = await browser.newPage({viewport:{width:1360,height:920},acceptDownloads:true});
    await stand.goto(base);
    await openSizeStep(stand);
    const presets = stand.getByRole('region',{name:'Stand Banner / Vertikal'});
    await presets.getByText('Cocok untuk banner wisuda berdiri.').waitFor();
    for (const label of ['60 × 160 cm','80 × 180 cm','85 × 200 cm','100 × 200 cm']) {
      await presets.getByRole('button',{name:label,exact:true}).waitFor();
    }
    const sizeLabel = `${width} × ${height} cm`;
    if (custom) {
      await stand.getByRole('button',{name:'Ukuran custom'}).click();
      await stand.getByLabel('Lebar (cm)').fill('67.5');
      await stand.getByLabel('Tinggi (cm)').fill('175.25');
      await stand.locator('.size-preview').getByText('67,5 × 175,25 cm',{exact:true}).waitFor();
      await checkAspect(stand.locator('.size-preview-shape'),67.5/175.25);
      await stand.getByLabel('Lebar (cm)').fill(String(width));
      await stand.getByLabel('Tinggi (cm)').fill(String(height));
      assert.equal(await stand.getByLabel('Tinggi (cm)').inputValue(),String(height));
    } else {
      await presets.getByRole('button',{name:sizeLabel,exact:true}).click();
    }
    await stand.locator('.size-preview').getByText(sizeLabel,{exact:true}).waitFor();
    await checkAspect(stand.locator('.size-preview-shape'),width/height);
    await stand.getByRole('button',{name:'Lanjutkan'}).click();
    const images=['raka','nadia','tiara','faris','raka'].slice(0,count).map(name=>`public/demo/${name}.webp`);
    await stand.locator('input[type=file][multiple]').setInputFiles(images);
    await stand.getByLabel(`Nama wisudawan ${count} *`).waitFor();
    await stand.getByRole('button',{name:'Lanjutkan'}).click();
    await stand.getByRole('button',{name:new RegExp(style)}).click();
    await checkAspect(stand.getByRole('img',{name:`Contoh stand banner ${style}`}),width/height);
    await stand.getByRole('button',{name:'Buat 3 variasi desain'}).click();
    const previews = stand.getByRole('img',{name:`Pratinjau desain ${style}`});
    await previews.nth(2).waitFor();
    const natural = await previews.first().evaluate(img=>img.naturalWidth/img.naturalHeight);
    assert(Math.abs(natural-width/height)<.002);
    await checkAspect(stand.locator('.design-preview').first(),width/height);
    const saved = await waitForSaved(stand,project=>project?.step===4);
    assert.deepEqual(saved.size,{width,height});
    assert(saved.designs.every(design=>design.strategy.startsWith('portrait-')&&design.size.width===width&&design.size.height===height));
    assert(saved.designs.every(design=>design.nodes.filter(node=>node.kind==='portrait').length===count));
    if (style==='Cinematic Poster') {
      const areas=saved.designs[0].nodes.filter(node=>node.kind==='portrait').map(photo=>photo.w*photo.h);
      assert(Math.max(...areas)>1.5*Math.min(...areas));
    }
    await stand.getByRole('button',{name:'Edit desain'}).first().click();
    await stand.locator('.canvas-size').getByText(sizeLabel,{exact:true}).waitFor();
    await stand.getByRole('button',{name:'Siap Cetak!',exact:true}).waitFor();
    await checkAspect(stand.locator('.artboard-outline'),width/height);
    if(process.env.AKHIRNYA_SHOTS) await stand.screenshot({path:`/tmp/akhirnya-stand-${width}.png`});
    await stand.getByRole('button',{name:'Siap Cetak!',exact:true}).click();
    const dialog = stand.getByRole('dialog',{name:'Siap Cetak!'});
    assert.equal(await dialog.getByLabel('Lebar (cm)').inputValue(),String(width));
    assert.equal(await dialog.getByLabel('Tinggi (cm)').inputValue(),String(height));
    await dialog.getByText(sizeLabel,{exact:true}).waitFor();
    if (custom) {
      const png = await download(stand);
      assert.equal(png.readUInt32BE(16),1701);
      assert.equal(png.readUInt32BE(20),4535);
    } else {
      await dialog.getByLabel('Format file').selectOption('pdf');
      const pdf = await download(stand);
      const mediaBox=pdf.toString('latin1').match(/\/MediaBox\s*\[0\s+0\s+([\d.]+)\s+([\d.]+)\]/);
      assert(mediaBox);
      assert(Math.abs(Number(mediaBox[1])*25.4/72-800)<.001);
      assert(Math.abs(Number(mediaBox[2])*25.4/72-1800)<.001);
    }
    console.log(`Stand banner ${sizeLabel} dengan ${count} wisudawan terverifikasi dari wizard hingga ekspor.`);
    await stand.close();
  }
} finally {await browser.close();}
