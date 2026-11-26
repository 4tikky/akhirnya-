import type { Color } from '../types';

export type Art = (colors: Color, seed: number) => string;
type Transform = {x:number;y:number;scale?:number;rotate?:number};

export const path = (d:string, fill:string, stroke?:string, weight=1.35) =>
  `<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`;
export const rect = (x:number,y:number,w:number,h:number,fill:string,r=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
export const oval = (x:number,y:number,rx:number,ry:number,fill:string) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
export const group = (art:string,{x,y,scale=1,rotate=0}:Transform) => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">${art}</g>`;
export const fade = (art:string,opacity:number) => `<g opacity="${opacity}">${art}</g>`;
export const line = (d:string,ink:string,weight=1) => path(d,'none',ink,weight);
export const paperEdge = 'M2 5 12 3 22 5 31 2 40 4 49 2 59 4 70 2 82 4 95 3 97 13 95 25 98 36 95 47 97 58 95 65 98 78 96 87 98 96 89 97 78 95 68 97 55 95 44 98 32 95 22 98 11 96 3 98 4 87 2 76 4 64 1 52 4 41 2 29 4 18Z';

export function noise(seed:number,count:number, draw:(x:number,y:number,index:number)=>string) {
  let state=seed>>>0;
  function next() {state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296*100;}
  return Array.from({length:count},(_,i)=>draw(next(),next(),i)).join('');
}

export const spark = (x:number,y:number,scale:number,fill:string) => group(path('M0-9 2-2 9 0 2 2 0 9-2 2-9 0-2-2Z',fill),{x,y,scale});
export const cloud: Art = ({soft,ink}) => path('M12 66C1 67 0 48 12 42 16 39 20 40 23 41c3-19 25-27 36-12 14-11 32 0 31 13 15 3 14 25-2 26Z',soft,ink,1.2)+line('M16 74h58m-45 7h20',ink,1.3);

export const grit: Art = ({ink},seed) => fade(noise(seed,100,(x,y,i)=>oval(x,y,i%4===0?.32:.14,.09,ink)),.23);
export const contour: Art = ({ink},seed) => fade(Array.from({length:11},(_,i)=>{
  const y=i*9+(seed%7);
  return line(`M-4 ${y}C17 ${y-13} 14 ${y+12} 37 ${y+5}S54 ${y-13} 71 ${y-6} 86 ${y+11} 104 ${y-1}`,ink,.4);
}).join(''),.19);

const alpineSky: Art = ({accent,soft,ink},seed) => {
  const sun=seed%2===0 ? 74 : 26;
  return oval(sun,32,15,14,accent)+fade(oval(sun,32,19,18,'none')+line(`M${sun-21} 32a21 20 0 1 0 42 0 21 20 0 1 0-42 0Z`,ink,.45),.47)+
    fade(noise(seed,44,(x,y)=>oval(x,y,.19,.13,ink)),.35)+
    fade(group(path('M0 7C4-1 16-1 20 6c7-5 16 1 17 5H0Z',soft),{x:4,y:35}),.85)+
    fade(group(path('M0 9C8-2 20 0 24 8c10-3 20 0 22 6H0Z',soft),{x:55,y:52}),.8)+
    line('M2 19h22m-7 5h13m50-12h12m-18 5h15',soft,1.1);
};

const ridge: Art = ({ink,accent,soft},seed) => {
  const peak=seed%2===0?53:36;
  return path(`M0 77 13 54 21 58 ${peak} 13 68 52 74 45 100 68V100H0Z`,soft)+
    path(`M${peak} 13l7 16 1 10 7 13 6-7 26 23v32H36l18-19 7-17Z`,accent)+
    path(`M31 44 ${peak} 13l9 24-6 1-4 7-5-5-6 7-5-4Z`,'#fff2cc')+
    path('M0 78 11 71 25 75 37 65 52 79 65 72 84 83 100 74V100H0Z',ink)+
    fade(line('M1 86l24-7 12 4 15-1 17 5 26-7M26 59 53 13m-2 53 7-21 4 2 10 11',soft,.65),.82);
};

const fir: Art = ({ink,accent,soft}) => path('M49 5 71 32 61 31 79 53 67 54 88 80 58 79V96H41V80H10l23-27H21l18-22H31Z',ink)+line('M49 26v59m1-39 12-8m-13 20-16-8m17 22 21-10',soft,1)+oval(7,86,4,2,accent)+oval(92,89,4,3,accent);
const forest: Art = (c,seed) => path('M0 71q20-17 43-9 22 14 57-3v41H0Z',c.ink)+Array.from({length:9},(_,i)=>group(fir(c,seed),{x:i*12-7,y:50+(i%3)*7,scale:.16+(i%5)*.055})).join('')+
  fade(line('M0 89q22-17 48-5t52-6M0 93q27-14 53-5t47-7',c.soft,.8),.72);
const route: Art = ({soft,accent,ink},seed) => {
  const track=seed%2===0?'M18 96C17 84 79 87 80 74S15 65 19 52 80 41 78 31 24 22 39 4':'M81 98C78 88 16 86 19 74S82 65 79 52 20 39 25 28 76 17 56 3';
  return `<path d="${track}" fill="none" stroke="${ink}" stroke-opacity=".32" stroke-width="1.7"/><path d="${track}" fill="none" stroke="${soft}" stroke-width=".72" stroke-dasharray="1.3 1.5"/>`+
    [12,33,55,80,94].map((y,i)=>oval([58,22,52,80,25][i],y,1.25,.7,accent)).join('');
};
const compass: Art = ({ink,soft,accent}) => path('M50 2 62 8 77 8 83 21 96 30 93 45 99 58 88 70 84 85 69 88 56 99 42 93 25 95 16 81 4 72 8 56 1 41 12 30 16 14 33 12Z',soft,ink,2.4)+
  oval(50,50,32,32,accent)+line('M50 19v62M19 50h62M28 28l44 44m0-44L28 72',ink,1)+path('m67 31-13 26-23 13 10-26Z',ink,soft,1.2)+oval(50,50,3,3,soft);
const trailSign: Art = ({accent,ink,soft}) => path('M44 23h10v69l-6 5-4-5Z',ink)+path('m8 19 72-5 16 11-13 16-72 6Z',accent,ink,2)+path('m94 50-70-1-19 14 16 13 73-1Z',soft,ink,2)+
  line('M30 29h43l-6-5m6 5-6 5M68 62H31l6-5m-6 5 6 5',ink,2.7)+line('M39 94h20',ink,2);
const tent: Art = ({soft,ink,accent}) => path('M2 84 49 17 98 84 56 93Z',accent,ink,2.2)+path('M49 17 56 93 98 84Z',soft,ink,2)+
  path('M47 32 22 84 52 90Z',ink)+path('M42 59 33 83 47 86Z',soft)+line('m8 88-4 8m86-12 6 10M46 13l5 10',ink,1.7);

const pages: Art = ({soft,bg,ink,accent},seed) => {
  const sheet=path(paperEdge,'#fff6e3',ink,.55);
  const ruled=Array.from({length:22},(_,i)=>line(`M4 ${8+4*i}h93`,accent,.25)).join('');
  return path(paperEdge,soft)+group(sheet,{x:4,y:2,scale:.94,rotate:seed%2===0?2:-2})+
    path('M12 0H100V100H12V97L10 95 12 92 10 89 12 86 10 83 12 80 10 77 12 74 10 71 12 68 10 65 12 62 10 59 12 56 10 53 12 50 10 47 12 44 10 41 12 38 10 35 12 32 10 29 12 26 10 23 12 20 10 17 12 14 10 11 12 8 10 5Z',bg)+
    fade(ruled+line('M21 0v100',accent,.52),.26)+fade(noise(seed,55,(x,y)=>oval(x,y,.13,.09,ink)),.22);
};
const rings: Art = ({ink,soft},seed) => Array.from({length:10},(_,i)=>{
  const y=5+i*9.9;
  return oval(74,y+1,12,2,ink)+line(`M75 ${y}C72 ${y-2.5} 12 ${y-2.6} 9 ${y-.8} 5 ${y+1.3} 32 ${y+2.2} 76 ${y+.8}`,ink,1.12)+line(`M9 ${y-.6}q20-1.5 57-.4`,soft,.38);
}).join('');
const tape: Art = ({soft,ink,accent},seed) => path('M3 16 12 14 3 24 10 29 3 37 11 44 3 52 10 58 3 66 11 72 3 81 13 87 94 83 87 73 96 64 89 57 97 50 90 42 97 35 90 27 97 17 81 12Z',accent)+
  fade(Array.from({length:7},(_,i)=>line(`M9 ${22+i*10}q40 -7 82 -2`,soft,2.4)).join(''),.72)+fade(line('M14 20 86 17m-71 63 70-3',ink,1.2),.52);
const paperClip: Art = ({ink,accent}) => line('M49 86 75 30C88-1 58-11 45 17L17 77C8 99 30 108 42 85l26-55C74 16 62 12 55 25L31 74',ink,7)+line('M49 86 75 30C88-1 58-11 45 17L17 77C8 99 30 108 42 85l26-55C74 16 62 12 55 25L31 74',accent,3);
const doodle: Art = ({ink,accent}) => line('M7 76q18-41 41-7c13 24-31 25-15-4S73 43 85 20m-14 3 18-8-3 19',ink,3)+spark(47,17,.93,accent)+spark(19,26,.64,accent)+path('M14 48C-1 34 12 29 18 38c10-8 19 1 12 7l-12 9Z',accent);

const gingham: Art = ({bg,soft,accent}) => rect(0,0,100,100,bg)+Array.from({length:13},(_,i)=>fade(rect(i*8,0,4,100,accent)+rect(0,i*8,100,4,accent),.255)).join('')+
  Array.from({length:12},(_,i)=>fade(line(`M${i*8+1} 0v100M0 ${i*8+1}h100`,soft,.5),.6)).join('');
const scallop: Art = ({soft,ink}) => path('M1 18q5-16 13-5 5-14 13-3 8-13 15-2 7-14 15-2 8-10 16 1 8-9 15 3 11-2 11 10v63q-4 15-14 7-8 13-16 3-8 13-16 4-8 10-16-1-8 11-16-1-8 8-14-3-10 3-10-10Z',soft,ink,.45);
const plate: Art = ({soft,ink,accent}) => oval(50,51,48,44,ink)+oval(50,50,47,43,soft)+oval(50,50,43,39,accent)+oval(50,50,41,37,'#fff6e2')+oval(50,50,34,30,soft)+
  fade(Array.from({length:18},(_,i)=>spark(50+Math.cos(i*.35)*38,50+Math.sin(i*.35)*34,.16,ink)).join(''),.71);
const croissant: Art = ({ink,accent,soft}) => path('M3 58q5-13 14-19 7-20 27-21 13-12 28 6 17 0 21 19 12 13 4 33-8 17-20 4l2-12Q55 55 27 74L25 85C12 98 1 82 3 58Z',accent,ink,2.1)+
  path('M17 39q20 0 28 18-11-2-20 17l-11-9Zm27-21q16 12 20 38l-15 1q-7-20-22-22Zm28 6q13 6 18 22l-9 21-13-8q8-11-6-32Z',soft)+line('M28 39q9 4 12 12m12-26q8 12 10 23m17-11 6 11M9 65l10 7',ink,1.5);
const citrus: Art = ({soft,accent,ink}) => path('M11 54c-4-18 12-32 27-33 15-7 40 0 48 24 11 21-4 44-22 47C43 100 19 86 11 54Z',accent,ink,2)+oval(49,58,33,31,soft)+
  path('M49 58 29 36Q41 27 54 29Zm1 0 10-28q13 2 19 18Zm0 2 30-6q3 15-7 24ZM48 61l20 20q-11 12-26 8Zm-3 0-9 27Q20 80 19 64Zm0-4-26 1q-1-13 7-19Z',accent)+
  path('M48 22Q42 3 63 7C60-1 85-1 93 4 85 22 73 23 55 22Z',ink)+line('M51 19q18-11 35-14',soft,1.1);
const berries: Art = ({soft,accent,ink}) => {
  const berry=path('M14 30q-3-10 13-12 10-13 21 0 14 2 11 17C53 55 37 72 25 62Z',accent,ink,1.45)+
    path('M21 21 20 11l10 4 4-11 6 10 11-4-2 12-12-3-3 9-6-8Z',ink)+
    [[28,32],[40,29],[46,40],[31,45],[37,55]].map(([x,y])=>oval(x,y,1,1.7,soft)).join('');
  return group(berry,{x:42,y:27,rotate:21,scale:.85})+group(berry,{x:8,y:17,rotate:-11,scale:1.13});
};
const utensils: Art = ({ink,accent,soft}) => path('M17 8h4v23h4V7h4v24h4V8h4v24q0 11-8 13l4 42q-4 12-13 4l4-47q-8-3-8-13Zm37 31C47 6 80-10 88 13c5 16-1 34-14 38l5 42q-6 9-13 0l3-43q-9-2-15-11Z',accent,ink,2.1)+line('M61 29q2-16 10-18m-1 80 2-29',soft,2.4);
const basket: Art = ({ink,soft,accent}) => line('M24 52C19 2 80 1 77 52',ink,7)+line('M24 52C19 2 80 1 77 52',accent,3)+
  path('M10 46h80l-11 45H21Z',accent,ink,2.1)+path('M6 44q40-6 89-1l-3 10H9Z',soft,ink,2)+
  fade(Array.from({length:5},(_,i)=>line(`M${19+i*14} 53l${3-i} 34`,ink,1.4)+line(`M${14+i} ${58+i*6}h${72-i*2}`,ink,1.2)).join(''),.8);
const checkedRibbon: Art = ({accent,ink,soft}) => path('M1 18 16 16V8H85v8l14 3-7 23 7 27-14-3v22H16V68L1 70 7 43Z',ink)+path('M17 12h67v71H17Z',accent)+
  fade(line('M21 16h59v63H21Zm-8 6L5 25m9 36-9 3m81-43 8 4m-8 35 8 4',soft,1.1),.8);

export const flagshipArt = {
  grit, contour, cloud, 'alpine-sky':alpineSky, ridge, fir, forest, route, compass, 'trail-sign':trailSign, tent,
  pages, rings, tape, 'paper-clip':paperClip, doodle, gingham, scallop, plate, croissant, citrus, berries, utensils, basket, ribbon:checkedRibbon,
};
