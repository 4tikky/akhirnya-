import type { Color } from '../types';
import { flagshipArt, cloud, fade, group, line, noise, oval, paperEdge, path, rect, spark, type Art } from './vectors';

const pixel = (map:string[],color:string) => map.map((row,y)=>[...row].map((cell,x)=>cell==='x'?rect(10+x*10,10+y*10,10,10,color):'').join('')).join('');
const arcade: Art = ({accent,ink,soft},seed) =>
  path('M0 25 24 0h76v76l-24 24H0Z',soft)+fade(Array.from({length:12},(_,i)=>line(`M0 ${i*9}h100M${i*9} 0v100`,accent,.42)).join(''),.45)+
  path('M0 70 31 69 45 58 70 59 82 45h18v55H0Z',ink)+
  fade(line('M0 72h33l14-11h24l12-15h17M0 78h28l19-12h24l13-15h16',accent,.74),.64)+fade(noise(seed,22,(x,y)=>rect(x,y,.7,.7,accent)),.8);
const trophy: Art = ({accent,soft,ink}) => pixel(['.xxxxxx.','xxxxxxxx','x.xxxx.x','x.xxxx.x','.xxxxxx.','...xx...','..xxxx..','.xxxxxx.'],ink)+
  group(pixel(['.xxxxxx.','xxxxxxxx','x.xxxx.x','x.xxxx.x','.xxxxxx.','...xx...','..xxxx..','.xxxxxx.'],accent),{x:-1,y:-2,scale:.97})+spark(50,28,.65,soft);
const progress: Art = ({accent,ink,soft},seed) => path('M1 24 10 5h82l8 19v46l-9 17H9L1 69Z',ink)+
  path('M4 26 13 13h76l8 13v41L89 78H11L4 67Z',soft)+
  Array.from({length:8},(_,i)=>rect(13+i*9.3,29,7,32,i<6+seed%3?accent:ink,1)).join('');
const city: Art = (c,seed) => path('M0 58 16 27 35 58 55 33 68 54 81 31 100 59V100H0Z',c.soft)+fade(group(cloud(c,seed),{x:2,y:-2,scale:.45}),.78)+
  path('M0 76q20-9 32-3 17 6 34-6 21-7 34 1v32H0Z',c.accent)+
  [4,23,72,87].map((x,i)=>rect(x,64-(i%2)*7,11,29,c.bg,1.7)+path(`M${x-1} ${64-(i%2)*7}l6-10 8 10Z`,c.ink)+rect(x+4,72-(i%2)*7,4,6,c.soft,1)).join('')+
  spark(81,22,1,c.accent)+spark(63,10,.6,c.ink);
const character: Art = ({accent,soft,ink}) => path('M28 19q22-12 44 0l16 11 9 24-14 6-8-14 3 42H22l3-42-8 14-14-6 9-24Z',accent,ink,2.5)+
  path('M33 18l17 12 17-12 7 70H25Z',ink)+path('M29 88H47l-1 7q-18 7-22 1Zm42 0H53l1 7q18 7 22 1Z',ink)+
  line('M43 32l7 46 14-46M15 33l9 13m60-13-9 13',soft,2.2)+path('m49 52 13-13 9 9-13 13Z',soft,ink,1.4);
const profile: Art = ({soft,ink,accent}) => path('M3 7 13 1H91l7 7v83l-8 8H11l-8-9Z',soft,ink,1.2)+
  path('M8 24 29 4h20L8 42Zm0 28L60 4h9L8 65Zm83-3-42 47H35l56-64Z',accent)+rect(9,10,82,80,'none')+
  line('M10 18V10h12m68 8v-8H78M11 86v6h14m65-12v12H75',ink,.8);
const barcode: Art = ({ink,soft}) => rect(1,12,98,78,soft,3)+Array.from({length:23},(_,i)=>rect(6+i*3.8,23,i%4===0?2.4:.95,43,ink)).join('')+
  line('M8 76h16m3 0h5m4 0h9m4 0h14m5 0h17',ink,.85);
const editorial: Art = ({ink,soft,bg},seed) => path(paperEdge,bg,ink,.55)+
  fade(Array.from({length:18},(_,i)=>line(`M8 ${18+i*4.15}h${20+(i%4)*2}m${8-(i%4)*2} 0h21m8 0h27`,ink,i%4===0?.58:.3)).join(''),.38)+
  line('M5 7h90m-90 5h90M33 14v78m30 0V14M5 93h90',ink,.45)+fade(noise(seed,42,(x,y)=>oval(x,y,.16,.10,soft)),.7);
const rose: Art = ({accent,ink,soft}) => {
  const petal = path('M50 53C9 45 19 9 40 13q23 1 16 38Z',accent,ink,1.05);
  return [0,72,144,216,288].map(rotate=>`<g transform="rotate(${rotate} 49 49)">${petal}</g>`).join('')+oval(49,49,12,11,soft)+line('M45 44l.1 4m8-4v4m-9 5q5 4 10-1',ink,1.4);
};
const vines: Art = (c,seed) => line('M7 97Q86 97 81 41 78 19 93 4M8 4Q25 39 11 72',c.ink,1.2)+
  [[81,17,22],[70,41,28],[58,70,24],[2,17,19],[0,57,18],[22,77,24]].map(([x,y,s])=>group(rose(c,seed),{x,y,scale:s/100})).join('')+
  path('M80 67q-15-16 7-19-3 14-7 19ZM12 43Q-1 35 1 27q11 4 11 16ZM57 92q7-14 20-8-9 8-20 8Z',c.ink);
const bow: Art = ({ink,accent,soft}) => path('M44 45Q9 8 6 40-2 69 44 62L25 93l18-10 8-18 10 23 21 7-25-35q47 9 38-24-7-32-39 9Z',accent,ink,2)+
  rect(43,40,15,23,soft,5)+line('M13 41q12-4 25 9m26-2q11-14 25-10M19 54l15-3m31 1 19 2',ink,1.65);
const cinema: Art = ({soft,accent,ink},seed) => {
  const moon=seed%2 ? 33 : 68;
  return fade(oval(moon,28,18,18,accent),.62)+fade(oval(moon,28,24,22,accent),.16)+
    path('M0 64 16 60 32 43 47 57 64 37 82 57 100 47v53H0Z',soft)+
    path('M0 85q25-30 46-15 17 9 36-7l18 5v32H0Z',ink)+
    fade(noise(seed,75,(x,y,i)=>oval(x,y,i%3===0?.29:.16,.16,accent)),.51)+
    fade(line('M0 78q32-14 48-3t52-9M0 82q32-14 48-3t52-9',accent,.56),.33);
};
const filmstrip: Art = ({ink,soft,accent}) => rect(0,5,100,90,ink,2)+rect(6,26,88,48,soft)+
  Array.from({length:9},(_,i)=>rect(5+10.5*i,10,5,9,accent,1)+rect(5+10.5*i,81,5,9,accent,1)).join('');
const playground: Art = ({ink,soft,accent},seed) => fade(noise(seed,67,(x,y)=>line(`M${x.toFixed(2)} ${y.toFixed(2)}l1-1`,ink,.45)),.36)+
  path('M0 83q15-8 33-3t36-2q19-8 31-5v27H0Z',soft)+
  line('M12 82 27 53 38 82M20 65h14m-18 9h20m-12-17c25 6 8 18 36 21m15 5 6-33 13 4 1 28m-15-27 10 2m-4 2v13',ink,1.28)+
  path('M26 51q2-13 16-13l-4 12Z',accent)+spark(73,29,.9,accent)+spark(14,23,.75,accent);
const kite: Art = ({ink,soft,accent}) => path('M6 50 49 8l45 31-37 39Z',accent,ink,1.6)+path('M49 8 44 44 94 39 57 78Z',soft,ink,.9)+line('M6 50 94 39M49 8l8 70q10 15-18 11L21 98',ink,1.5)+path('m47 84-7-4-1 9 12 3Zm-12 5-8-5 1 11 10 1Z',accent);

const secondaryArt = {arcade,trophy,progress,city,character,profile,barcode,editorial,rose,vines,bow,cinema,filmstrip,playground,kite};
export const assetLibrary = {...flagshipArt,...secondaryArt} satisfies Record<string, Art>;
export type AssetId = keyof typeof assetLibrary;
export const assetIds = Object.keys(assetLibrary) as [AssetId,...AssetId[]];

export function assetSvg(id: AssetId, colors: Color, seed: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="transparent"/>${assetLibrary[id](colors,seed)}</svg>`;
}
