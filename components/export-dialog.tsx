'use client';

import { Download, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { exportDimensions, validSize } from '@/lib/export-math';
import { lowResolution, renderExport, saveFile, type ExportOptions } from '@/lib/export';
import type { Design, Project } from '@/lib/types';
import { RangeField } from './photo-controls';
import { Button, Dialog, Notice } from './site';
import { Field } from './wizard';

const dpis = [[72,'Pratinjau digital'],[100,'Draf format besar'],[150,'Cetak format besar'],[300,'Resolusi tinggi']] as const;
export function ExportDialog({design,project,onClose}: {design:Design;project:Project;onClose:()=>void}) {
  const [options,setOptions] = useState<ExportOptions>(() => ({format:'png',dpi:72,size:design.size,bleed:0,quality:.95,transparent:false}));
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [lastFile,setLastFile] = useState('');
  const output = exportDimensions(options.size,options.dpi,options.bleed);
  const allowed = validSize(options.size) && output.supported && options.bleed>=0 && options.bleed<=25;
  const warnings = allowed ? [...new Set(lowResolution(design,project,options))] : [];
  const distorted = Math.abs((options.size.width/options.size.height)/(design.size.width/design.size.height)-1)>.02;
  const change = (patch:Partial<ExportOptions>) => {setOptions(previous => ({...previous,...patch}));setLastFile('');setError('');};
  async function download() {
    setBusy(true);setError('');
    try {
      const blob=await renderExport(design,project,options);
      const name=project.name.trim().replace(/[^\p{L}\p{N} _-]+/gu,'').slice(0,90) || 'akhirnya';
      const extension=options.format==='jpeg'?'jpg':options.format;
      saveFile(blob,`${name}-${options.dpi}dpi.${extension}`);
      setLastFile(`Satu langkah lebih dekat menuju wisuda! File siap (${(blob.size/1024/1024).toLocaleString('id-ID',{maximumFractionDigits:2})} MB).`);
    } catch (error) {
      setError(error instanceof Error?error.message:'Ekspor gagal. Gunakan DPI yang lebih rendah.');
    } finally {setBusy(false);}
  }
  return <Dialog title="Siap Cetak!" onClose={busy?()=>{}:onClose}>
    <div className="export-form">
      <div className="field-grid"><Field label="Format file"><select value={options.format} onChange={event=>change({format:event.target.value as ExportOptions['format']})}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="pdf">PDF</option></select></Field>
      <Field label="Resolusi"><select value={dpis.some(([dpi])=>dpi===options.dpi)?options.dpi:'custom'} onChange={event=>change({dpi:+event.target.value})}>{dpis.map(([dpi,label]) => <option key={dpi} value={dpi}>{dpi} DPI — {label}</option>)}{!dpis.some(([dpi])=>dpi===options.dpi) && <option value="custom">{options.dpi} DPI</option>}</select></Field>
      <Field label="Lebar (cm)" type="number" value={options.size.width || ''} onChange={value=>change({size:{...options.size,width:+value}})}/><Field label="Tinggi (cm)" type="number" value={options.size.height || ''} onChange={value=>change({size:{...options.size,height:+value}})}/><Field label="Bleed per sisi (mm)" type="number" value={options.bleed} onChange={value=>change({bleed:+value})}/></div>
      {options.format==='png'?<label className="check-field"><input type="checkbox" checked={options.transparent} onChange={event=>change({transparent:event.target.checked})}/> Latar transparan (dekorasi tetap terlihat)</label>:<RangeField label="Kualitas gambar" min={50} max={100} value={Math.round(options.quality*100)} onChange={value=>change({quality:value/100})}/>}
      <div className="export-summary"><div><span>Ukuran akhir termasuk bleed</span><b>{(output.widthMm/10).toLocaleString('id-ID')} × {(output.heightMm/10).toLocaleString('id-ID')} cm</b></div><div><span>Dimensi gambar</span><b>{output.width.toLocaleString('id-ID')} × {output.height.toLocaleString('id-ID')} px</b></div><div><span>Format dan resolusi</span><b>{options.format.toUpperCase()} · {options.dpi} DPI</b></div><div><span>Estimasi file</span><b>~{(output.width*output.height*(options.format==='png'?1.35:.30)/1024/1024).toLocaleString('id-ID',{maximumFractionDigits:1})} MB</b></div></div>
      {!allowed && <div className="export-warning"><TriangleAlert size={16}/><div>{!validSize(options.size) || options.bleed<0 || options.bleed>25?'Periksa ukuran banner dan bleed (0–25 mm).':`Ukuran ini melampaui batas kanvas browser. DPI maksimum yang diperkirakan adalah ${output.maxDpi}.`}{validSize(options.size) && !output.supported && output.maxDpi>0 && <Button variant="ghost" onClick={()=>change({dpi:output.maxDpi})}>Gunakan {output.maxDpi} DPI</Button>}</div></div>}
      {distorted && <div className="export-warning"><TriangleAlert size={16}/>Perubahan rasio akan meregangkan desain. Untuk menyusun ulang desain, ubah ukuran di wizard.</div>}
      {warnings.length>0 && <div className="export-warning"><TriangleAlert size={16}/>Resolusi foto mungkin kurang pada DPI ini: {warnings.join(', ')}.</div>}
      {options.format==='pdf' && <p className="field-help">PDF satu halaman menggunakan dimensi fisik yang dipilih dan menyematkan hasil banner sebagai gambar.</p>}
    </div>
    {error && <Notice error>{error}</Notice>}{lastFile && <Notice>{lastFile}</Notice>}
    <div className="dialog-actions"><Button onClick={onClose} disabled={busy}>Tutup</Button><Button variant="primary" onClick={()=>void download()} disabled={busy||!allowed}>{busy?<LoaderCircle size={17} className="spin"/>:<Download size={17}/>} {busy?'Merender banner…':'Unduh banner'}</Button></div>
  </Dialog>;
}
