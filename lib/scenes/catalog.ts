import type { AssetId } from './assets';
import type { Color, PortraitStyle, ThemeId } from '../types';

type Layout = 'trail' | 'feature' | 'scattered' | 'folio' | 'paired' | 'supper';
type Title = 'outlined' | 'serif' | 'handwritten' | 'ribbon' | 'display';
export type SceneVariant = {
  name: string; arrangement: Layout; treatment: PortraitStyle; title: Title;
  back: AssetId; motif: AssetId; stickers: readonly AssetId[];
};

type Collection = {
  theme: ThemeId;
  palettes: readonly Color[];
  texture: AssetId;
  variants: readonly [SceneVariant,SceneVariant,SceneVariant];
};

const recipe = (name:string, arrangement:Layout, treatment:PortraitStyle, title:Title, back:AssetId, motif:AssetId, ...stickers:AssetId[]): SceneVariant =>
  ({name,arrangement,treatment,title,back,motif,stickers});

export const collections: Collection[] = [
  {theme:'adventure',texture:'contour',palettes:[
    {bg:'#f3dca4',ink:'#173d35',accent:'#bf542c',soft:'#7d9e70'},
    {bg:'#a9c4bd',ink:'#163d40',accent:'#f2a340',soft:'#66978a'},
    {bg:'#f1c4a2',ink:'#3c292e',accent:'#a24648',soft:'#986771'},
  ],variants:[
    recipe('Jalur Menuju Puncak','trail','sticker','outlined','alpine-sky','route','compass','trail-sign','fir','tent'),
    recipe('Ekspedisi Awan','feature','arch','serif','ridge','cloud','cloud','compass','fir','tent'),
    recipe('Camp Terakhir','scattered','torn','ribbon','contour','forest','tent','trail-sign','compass','fir'),
  ]},
  {theme:'scrapbook',texture:'grit',palettes:[
    {bg:'#fff2d8',ink:'#3b2950',accent:'#cf789e',soft:'#d7c8e9'},
    {bg:'#e4edf0',ink:'#30354f',accent:'#7c83c5',soft:'#fbdbc2'},
    {bg:'#f4dae5',ink:'#472f45',accent:'#b7577f',soft:'#e4e2b8'},
  ],variants:[
    recipe('Binder Kenangan','folio','polaroid','handwritten','pages','rings','tape','paper-clip','doodle','tape'),
    recipe('Halaman Terakhir','feature','torn','serif','editorial','pages','paper-clip','doodle','tape','paper-clip'),
    recipe('Kolase Setelah Kelas','scattered','organic','outlined','contour','rings','doodle','tape','paper-clip','doodle'),
  ]},
  {theme:'picnic',texture:'grit',palettes:[
    {bg:'#f8dfb0',ink:'#522627',accent:'#be473e',soft:'#fff2d5'},
    {bg:'#f6c7aa',ink:'#4c3130',accent:'#bd5c35',soft:'#fbefd0'},
    {bg:'#e1ecc4',ink:'#294736',accent:'#ca6654',soft:'#fff1c9'},
  ],variants:[
    recipe('Piknik Setelah Sidang','paired','circle','outlined','gingham','scallop','berries','utensils','citrus','basket'),
    recipe('Meja Menu Spesial','supper','organic','ribbon','scallop','plate','croissant','berries','basket','utensils'),
    recipe('Keranjang Bekal Sarjana','trail','sticker','handwritten','gingham','ribbon','basket','citrus','croissant','berries'),
  ]},
  {theme:'chibi',texture:'grit',palettes:[
    {bg:'#fee5dd',ink:'#543759',accent:'#b64f78',soft:'#f7bb59'},
    {bg:'#e5e6ff',ink:'#38436a',accent:'#6859b5',soft:'#f6d68e'},
    {bg:'#e6efc7',ink:'#334637',accent:'#bd6263',soft:'#f7ceb4'},
  ],variants:[
    recipe('Kota Mini Wisuda','trail','character','outlined','city','cloud','cloud','doodle','rose','kite'),
    recipe('Taman Teman Satu Angkatan','paired','organic','handwritten','vines','city','bow','rose','cloud','kite'),
    recipe('Awan Kelulusan','feature','character','ribbon','alpine-sky','cloud','doodle','cloud','rose','bow'),
  ]},
  {theme:'gaming',texture:'grit',palettes:[
    {bg:'#20243e',ink:'#f5f0da',accent:'#c4ec65',soft:'#3b4b70'},
    {bg:'#33224d',ink:'#fff1ff',accent:'#f2a7ef',soft:'#65407b'},
    {bg:'#1b3738',ink:'#e2ffed',accent:'#77e4bc',soft:'#3b6863'},
  ],variants:[
    recipe('Mission Passed','feature','profile','display','arcade','progress','trophy','progress','barcode','trophy'),
    recipe('Inventory Sarjana','folio','sticker','outlined','contour','arcade','barcode','trophy','progress','trophy'),
    recipe('Boss Terakhir','trail','arch','ribbon','arcade','profile','progress','barcode','trophy','progress'),
  ]},
  {theme:'photocard',texture:'contour',palettes:[
    {bg:'#e9eafb',ink:'#272e51',accent:'#8464bb',soft:'#c9dbe7'},
    {bg:'#e9f0d9',ink:'#283d42',accent:'#618c87',soft:'#e3cdd8'},
    {bg:'#f9e3db',ink:'#493344',accent:'#a25884',soft:'#dfd7f2'},
  ],variants:[
    recipe('Kartu Angkatan','folio','profile','display','editorial','profile','barcode','profile','barcode','compass'),
    recipe('Edisi Holografik','scattered','polaroid','outlined','contour','profile','tape','barcode','profile','paper-clip'),
    recipe('Arsip Wisudawan','feature','profile','serif','pages','barcode','compass','barcode','paper-clip','profile'),
  ]},
  {theme:'newspaper',texture:'grit',palettes:[
    {bg:'#efe5ca',ink:'#292518',accent:'#942e32',soft:'#d8c7a3'},
    {bg:'#e6ead6',ink:'#27382f',accent:'#456045',soft:'#c4cdb7'},
    {bg:'#f1e1d4',ink:'#3b2928',accent:'#994b58',soft:'#dcc4bb'},
  ],variants:[
    recipe('Edisi Utama','feature','cover','serif','editorial','ribbon','compass','paper-clip','barcode','compass'),
    recipe('Arsip Kampus','folio','torn','display','pages','editorial','paper-clip','barcode','tape','compass'),
    recipe('Sampul Angkatan','scattered','sticker','outlined','editorial','filmstrip','barcode','compass','paper-clip','tape'),
  ]},
  {theme:'floral',texture:'grit',palettes:[
    {bg:'#f9e4e3',ink:'#552f48',accent:'#c45c85',soft:'#e5e8b2'},
    {bg:'#e8e7f9',ink:'#403457',accent:'#8e64aa',soft:'#f1c9dc'},
    {bg:'#f6ebca',ink:'#4e3730',accent:'#bf725e',soft:'#d6dfb2'},
  ],variants:[
    recipe('Buket Angkatan','paired','circle','handwritten','vines','scallop','rose','bow','rose','bow'),
    recipe('Taman Kelulusan','trail','organic','outlined','vines','cloud','bow','rose','vines','doodle'),
    recipe('Pita Terakhir','feature','arch','ribbon','scallop','vines','rose','bow','rose','compass'),
  ]},
  {theme:'cinematic',texture:'grit',palettes:[
    {bg:'#151e2b',ink:'#fff0d0',accent:'#e7ad64',soft:'#555d71'},
    {bg:'#25192d',ink:'#fff0de',accent:'#ed9298',soft:'#634557'},
    {bg:'#101f25',ink:'#edf9ee',accent:'#96d9cd',soft:'#426565'},
  ],variants:[
    recipe('Adegan Terakhir','feature','cover','display','cinema','filmstrip','filmstrip','compass','filmstrip','compass'),
    recipe('Malam Perdana','trail','sticker','outlined','alpine-sky','cinema','filmstrip','barcode','compass','filmstrip'),
    recipe('Kredit Angkatan','folio','arch','serif','cinema','progress','compass','filmstrip','barcode','filmstrip'),
  ]},
  {theme:'nostalgia',texture:'grit',palettes:[
    {bg:'#f8e9c2',ink:'#493b44',accent:'#b85755',soft:'#b9d2aa'},
    {bg:'#e3e8ce',ink:'#333f58',accent:'#7a70a7',soft:'#f2c6a9'},
    {bg:'#e6ebf6',ink:'#3d3550',accent:'#bb7270',soft:'#d2d6ae'},
  ],variants:[
    recipe('Dari Taman Bermain','trail','torn','handwritten','playground','pages','kite','doodle','tape','rose'),
    recipe('Koleksi Foto Lama','folio','polaroid','serif','pages','playground','paper-clip','doodle','kite','tape'),
    recipe('Layangan Masa Kecil','feature','sticker','outlined','alpine-sky','playground','kite','cloud','doodle','tape'),
  ]},
];

export const collectionFor = (theme:ThemeId) => collections.find(item=>item.theme===theme);
