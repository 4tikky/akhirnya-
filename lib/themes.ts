import { designFonts } from './design-fonts';
import type { Color, LandscapeStrategy, PortraitStrategy, ThemeId } from './types';

export type Theme = {
  id: ThemeId; name: string; description: string; demo: string; kicker: string; palettes: Color[];
  headline: string; body: string; weight: string; layout: LandscapeStrategy[]; standLayout: PortraitStrategy[]; texture: 'paper' | 'grid' | 'dots' | 'film' | 'border' | 'burst';
  portrait: 'mono' | 'frame' | 'plain'; margin: number; count: [number, number]; preferredRatio: [number, number];
};

export const themes: Theme[] = [
  { id:'newspaper', name:'Vintage Newspaper', description:'Tata letak editorial, kertas krem, dan potret hitam putih.', demo:'THE FINAL CHAPTER', kicker:'THE GRADUATION TIMES', headline:designFonts.serif, body:'Courier New', weight:'900', layout:['editorial','symmetry','pyramid','rows'], standLayout:['portrait-newspaper','portrait-editorial','portrait-stack'], texture:'paper', portrait:'mono', margin:.033, count:[1,20], preferredRatio:[1.3,4], palettes:[
    {bg:'#eee5cf',ink:'#282118',accent:'#a0342b',soft:'#d9ccb0'},{bg:'#eee8d8',ink:'#23332c',accent:'#35604c',soft:'#d5dace'},{bg:'#f2e3d5',ink:'#382629',accent:'#8e4355',soft:'#e0c2bf'}
  ] },
  { id:'gaming', name:'Mission Passed', description:'Warna kontras, grid arcade, dan lencana pencapaian.', demo:'MISSION PASSED', kicker:'ACHIEVEMENT UNLOCKED', headline:designFonts.geometric, body:'Courier New', weight:'700', layout:['staggered','hero','pyramid','rows'], standLayout:['portrait-staggered','portrait-stack','portrait-hero'], texture:'grid', portrait:'frame', margin:.032, count:[1,20], preferredRatio:[1.5,5], palettes:[
    {bg:'#181939',ink:'#f4f2ff',accent:'#b5ff57',soft:'#31375d'},{bg:'#241445',ink:'#ffffff',accent:'#fd93f5',soft:'#492b72'},{bg:'#102831',ink:'#e5fff9',accent:'#50efd0',soft:'#1c4950'}
  ] },
  { id:'scrapbook', name:'Y2K Scrapbook', description:'Polaroid, bintang, dan kolase bernuansa pastel.', demo:'SCHOOL’S OUT!', kicker:'GOOD TIMES FOREVER', headline:designFonts.studio, body:designFonts.geometric, weight:'850', layout:['collage','staggered','hero','rows'], standLayout:['portrait-collage','portrait-staggered','portrait-blocks'], texture:'dots', portrait:'frame', margin:.04, count:[1,20], preferredRatio:[1,3.5], palettes:[
    {bg:'#f6d6e9',ink:'#48286d',accent:'#843bd1',soft:'#fff3bc'},{bg:'#e4e1ff',ink:'#34265a',accent:'#6747c2',soft:'#fbf4ff'},{bg:'#f9dfba',ink:'#4c2745',accent:'#ba3977',soft:'#ffefee'}
  ] },
  { id:'cinematic', name:'Cinematic Poster', description:'Judul film, bingkai dramatis, dan tipografi kredit.', demo:'THE LAST SCENE', kicker:'A CLASS OF 2026 PRODUCTION', headline:designFonts.display, body:designFonts.geometric, weight:'400', layout:['cinematic','pyramid','hero','rows'], standLayout:['portrait-cinematic','portrait-hero','portrait-centered'], texture:'film', portrait:'plain', margin:.037, count:[1,20], preferredRatio:[1.4,4], palettes:[
    {bg:'#19232a',ink:'#fff0c7',accent:'#efb05a',soft:'#624b3d'},{bg:'#27172f',ink:'#fff1e1',accent:'#f4868c',soft:'#683b54'},{bg:'#111b2c',ink:'#e7f9ff',accent:'#86ceff',soft:'#344767'}
  ] },
  { id:'elegant', name:'Minimalist Elegant', description:'Tipografi serif, palet netral, dan ruang yang lapang.', demo:'The next chapter', kicker:'COMMENCEMENT CEREMONY', headline:designFonts.serif, body:designFonts.studio, weight:'400', layout:['hero','symmetry','editorial','rows'], standLayout:['portrait-blocks','portrait-centered','portrait-editorial'], texture:'border', portrait:'plain', margin:.057, count:[1,20], preferredRatio:[1,4], palettes:[
    {bg:'#eae7de',ink:'#313e35',accent:'#5c7056',soft:'#d3dcce'},{bg:'#f1e3d9',ink:'#4e3734',accent:'#935b51',soft:'#e1c6bb'},{bg:'#e8dfeb',ink:'#493c4c',accent:'#76587d',soft:'#d8c8dc'}
  ] },
  { id:'meme', name:'Funny & Meme', description:'Balon kata, warna cerah, dan humor wisuda.', demo:'AKHIRNYA LULUS!', kicker:'TUGAS SELESAI • DRAMA BERLANJUT', headline:designFonts.display, body:designFonts.studio, weight:'400', layout:['collage','staggered','pyramid','rows'], standLayout:['portrait-stack','portrait-collage','portrait-staggered'], texture:'burst', portrait:'frame', margin:.041, count:[1,20], preferredRatio:[1.2,4], palettes:[
    {bg:'#ffda58',ink:'#25204a',accent:'#6236b3',soft:'#ff985f'},{bg:'#ffb9a7',ink:'#412d6c',accent:'#6f38b3',soft:'#fff174'},{bg:'#c5ee8b',ink:'#243d36',accent:'#4f3f8f',soft:'#fff29f'}
  ] },
];

export const getTheme = (id: ThemeId) => themes.find(theme => theme.id === id) ?? themes[0];
export const headlines = ['Finally, S.Kom!', 'The Final Chapter', 'Mission Passed: Graduation', 'We Survived!', 'Resmi Menjadi Pengangguran Terpelajar', 'Sarjana Jalur Begadang', 'From Deadline to Degree', 'Satu Gelar, Sejuta Drama'];
