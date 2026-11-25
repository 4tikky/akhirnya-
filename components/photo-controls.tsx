'use client';

import { useState } from 'react';
import { filterStyle, portraitCrop } from '@/lib/photos';
import { defaults, type Adjustments, type Face, type Graduate } from '@/lib/types';
import { Button, Dialog } from './site';

const sliders: [keyof Adjustments,string,number,number][] = [
  ['brightness','Kecerahan',-80,80],['contrast','Kontras',-80,80],['saturation','Saturasi',-100,100],
  ['warmth','Suhu warna',-100,100],['grayscale','Hitam putih',0,100],['exposure','Eksposur',-80,80],['sharpness','Ketajaman',0,100],
];

export function RangeField({label,value,min,max,step=1,onChange}: {label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}) {
  return <label className="range-field"><span>{label}<output>{Math.round(value*100)/100}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={event => onChange(+event.target.value)}/></label>;
}

export function PhotoControls({graduate,onClose,onApply}: {graduate:Graduate;onClose:()=>void;onApply:(update:Partial<Graduate>)=>void}) {
  const [settings,setSettings] = useState(graduate.adjustments);
  const [manual,setManual] = useState<Face | undefined>(graduate.crop);
  const [original,setOriginal] = useState(!graduate.useCutout);
  const photo = original ? graduate.original : (graduate.processed || graduate.original);
  if (!photo) return;
  const auto = portraitCrop(photo,.86,graduate.face);
  const crop = manual ?? {x:auto.x/photo.width,y:auto.y/photo.height,w:auto.w/photo.width,h:auto.h/photo.height};
  function zoom(value:number) {
    const w = Math.min(1, .86 * photo!.height/photo!.width) / value;
    const h = Math.min(1, photo!.width/(.86*photo!.height)) / value;
    setManual({ x:Math.max(0,Math.min(1-w,crop.x+(crop.w-w)/2)),y:Math.max(0,Math.min(1-h,crop.y+(crop.h-h)/2)),w,h });
  }
  return <Dialog title={`Atur foto ${graduate.name || 'wisudawan'}`} onClose={onClose} wide>
    <div className="photo-dialog-grid">
      <div>
        <div className="crop-preview checker" style={manual?{aspectRatio:(crop.w*photo.width)/(crop.h*photo.height)}:undefined}>
          <img src={photo.src} alt="Pratinjau potongan" style={{width:`${100/crop.w}%`,height:`${100/crop.h}%`,left:`${-crop.x/crop.w*100}%`,top:`${-crop.y/crop.h*100}%`,filter:filterStyle(settings),maxWidth:'none'}}/>
        </div>
        {graduate.processed && <div className="segmented photo-switch"><button aria-pressed={original} onClick={() => setOriginal(true)}>Asli</button><button aria-pressed={!original} onClick={() => setOriginal(false)}>Hasil</button></div>}
        <RangeField label="Zoom potongan" value={Math.min(5,Math.min(1,.86*photo.height/photo.width)/crop.w)} min={1} max={5} step={.05} onChange={zoom}/>
        <RangeField label="Geser horizontal" value={crop.x} min={0} max={Math.max(.0001,1-crop.w)} step={.005} onChange={x=>setManual({...crop,x:Math.min(x,1-crop.w)})}/>
        <RangeField label="Geser vertikal" value={crop.y} min={0} max={Math.max(.0001,1-crop.h)} step={.005} onChange={y=>setManual({...crop,y:Math.min(y,1-crop.h)})}/>
        <Button variant="ghost" onClick={() => setManual(undefined)}>Gunakan potongan otomatis</Button>
      </div>
      <div><h3>Penyesuaian foto</h3>{sliders.map(([key,label,min,max]) => <RangeField key={key} label={label} value={settings[key]} min={min} max={max} onChange={value=>setSettings({...settings,[key]:value})}/>)}<Button variant="ghost" onClick={() => setSettings({...defaults})}>Atur ulang penyesuaian</Button></div>
    </div>
    <div className="dialog-actions"><Button onClick={onClose}>Batal</Button><Button variant="primary" onClick={() => {onApply({adjustments:settings,crop:manual});onClose();}}>Terapkan</Button></div>
  </Dialog>;
}
