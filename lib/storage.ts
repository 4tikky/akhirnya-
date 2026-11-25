import { openDB, wrap, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import { brandId } from './brand';
import { validSize } from './export-math';
import type { Project } from './types';

interface LegacyDatabase extends DBSchema { projects: { key: string; value: Project }; }
interface ProjectDatabase extends LegacyDatabase { settings: { key: string; value: boolean }; }

const legacyId = 'gradify';
const migrationKey = 'legacy-projects-imported';
let db: ReturnType<typeof connect> | undefined;

function legacyConnection(): Promise<IDBPDatabase<LegacyDatabase> | undefined> {
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open(`${legacyId}-projects`);
    // Abort creation when this browser has never used the previous version.
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onsuccess = () => resolve(wrap(request.result) as IDBPDatabase<LegacyDatabase>);
    request.onerror = () => {
      if (request.error?.name==='AbortError') resolve(undefined);
      else reject(request.error);
    };
  });
}

async function connect() {
  const database = await openDB<ProjectDatabase>(`${brandId}-projects`,1,{upgrade(database){
    database.createObjectStore('projects',{keyPath:'id'});
    database.createObjectStore('settings');
  }});
  try {
    if (await database.get('settings',migrationKey)) return database;
    const legacy = await legacyConnection();
    let previous: Project[] = [];
    if (legacy) {
      try { previous = await legacy.getAll('projects'); }
      finally { legacy.close(); }
    }
    const tx = database.transaction(['projects','settings'],'readwrite');
    const settings = tx.objectStore('settings');
    if (!await settings.get(migrationKey)) {
      const store = tx.objectStore('projects');
      for (const project of previous) {
        if (await store.getKey(project.id) === undefined) await store.add(project);
      }
      await settings.put(true,migrationKey);
    }
    await tx.done;
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

const connection = () => db ??= connect().catch(error => {db=undefined;throw error;});
export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | undefined>;
  put(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}
export const projects: ProjectRepository = {
  async list(){ return (await (await connection()).getAll('projects')).sort((a,b) => b.updatedAt-a.updatedAt); },
  async get(id){ return (await connection()).get('projects',id); },
  async put(project){ await (await connection()).put('projects',project); },
  async remove(id){
    const database = await connection();
    const legacy = await legacyConnection();
    if (legacy) {
      try { await legacy.delete('projects',id); }
      finally { legacy.close(); }
    }
    await database.delete('projects',id);
  },
};

const size = z.object({width:z.number(),height:z.number()}).refine(validSize);
const face = z.object({x:z.number(),y:z.number(),w:z.number().gt(0),h:z.number().gt(0)});
const safeImage = z.string().refine(src => /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(src) || /^\/demo\/[a-z0-9-]+\.(webp|png)$/.test(src));
const photo = z.object({src:safeImage,width:z.number().int().positive(),height:z.number().int().positive()});
const adjustments = z.object({brightness:z.number(),contrast:z.number(),saturation:z.number(),warmth:z.number(),grayscale:z.number(),exposure:z.number(),sharpness:z.number()});
const graduate = z.object({
  id:z.string().uuid(),name:z.string().max(140),degree:z.string().max(60),nickname:z.string().max(80),quote:z.string().max(150),
  original:photo.optional(),processed:photo.optional(),face:face.optional(),crop:face.optional(),useCutout:z.boolean(),adjustments,
  status:z.enum(['idle','processing','ready','error']),error:z.string().optional(),
});
const theme = z.enum(['newspaper','gaming','scrapbook','cinematic','elegant','meme']);
const strategy = z.enum(['symmetry','pyramid','staggered','editorial','collage','cinematic','rows','hero']);
const color = z.string().regex(/^(#[\da-f]{3,8}|transparent)$/i);
const bounds = {x:z.number(),y:z.number(),w:z.number().positive(),h:z.number().positive()};
const node = z.discriminatedUnion('kind',[
  z.object({...bounds,kind:z.literal('text'),text:z.string(),font:z.string(),fontSize:z.number().positive(),weight:z.string(),color,align:z.enum(['left','center','right']),spacing:z.number().optional(),graduateId:z.string().uuid().optional()}),
  z.object({...bounds,kind:z.literal('shape'),shape:z.enum(['rect','ellipse','star','diamond','bubble']),fill:color,stroke:color.optional(),rotation:z.number().optional()}),
  z.object({...bounds,kind:z.literal('portrait'),graduateId:z.string().uuid(),rotation:z.number(),frame:color,monochrome:z.boolean().optional()}),
  z.object({...bounds,kind:z.literal('logo')}),
]);
const allowedTypes = new Set(['rect','ellipse','polygon','textbox','text','i-text','image','group','activeselection','layoutmanager','brightness','contrast','saturation','grayscale','convolute','blendcolor','gamma','composed']);
function safeCanvas(value: unknown, depth=0): boolean {
  if (depth > 18) return false;
  if (Array.isArray(value)) return value.length <= 3000 && value.every(item => safeCanvas(item,depth+1));
  if (!value || typeof value !== 'object') return true;
  return Object.entries(value).every(([key,item]) => {
    if (['__proto__','constructor','prototype','backgroundImage','overlayImage'].includes(key)) return false;
    if (key === 'type') return typeof item === 'string' && allowedTypes.has(item.toLowerCase());
    if (key === 'src') return safeImage.safeParse(item).success;
    return safeCanvas(item,depth+1);
  });
}
const design = z.object({
  id:z.string(),theme,seed:z.number(),strategy,dimensions:z.object({width:z.number().int().min(1).max(1200),height:z.number().int().min(1).max(1200)}),
  size,palette:z.object({bg:color,ink:color,accent:color,soft:color}),label:z.string(),score:z.number(),nodes:z.array(node).max(1500),
  favorite:z.boolean().optional(),canvas:z.record(z.string(),z.unknown()).refine(value => Array.isArray(value.objects) && safeCanvas(value)).optional(),
});
const projectSchema = z.object({
  id:z.string().uuid(),name:z.string().max(120),headline:z.string().max(150),university:z.string().max(140),
  faculty:z.string().max(100),major:z.string().max(100),year:z.string().max(8),date:z.string().max(20),tagline:z.string().max(160),
  logo:photo.optional(),size,graduates:z.array(graduate).max(20),theme,seed:z.number().int().nonnegative(),designs:z.array(design).max(15),
  selected:z.string(),updatedAt:z.number(),thumbnail:safeImage.optional(),step:z.number().int().min(0).max(5),
});

export function exportProject(project: Project) {
  return JSON.stringify({format:brandId,version:1,project});
}
export function parseProject(text: string): Project {
  const envelope = z.object({format:z.enum([brandId,legacyId]),version:z.literal(1),project:projectSchema});
  const result = envelope.safeParse(JSON.parse(text));
  if (!result.success) throw new Error('File proyek Akhirnya! tidak valid atau tidak didukung.');
  const {project} = result.data;
  const graduateIds = new Set(project.graduates.map(grad => grad.id));
  if (graduateIds.size !== project.graduates.length ||
      project.designs.some(item => item.nodes.some(object => object.kind === 'portrait' && !graduateIds.has(object.graduateId)))) {
    throw new Error('Referensi foto dalam file proyek tidak valid.');
  }
  return project;
}

export function duplicateProject(project: Project, suffix = ' — Salinan'): Project {
  const id = crypto.randomUUID();
  const designs = project.designs.map((item,index) => ({...item,id:`${id}-${index}-${item.seed}`}));
  const selected = designs[project.designs.findIndex(item => item.id === project.selected)]?.id ?? '';
  return {...project,id,designs,selected,name:(project.name+suffix).slice(0,120),updatedAt:Date.now()};
}

export function normalizeProject(project: Project): Project {
  return {...project, graduates:project.graduates.map(person => person.status==='processing' ? {...person,status:'idle',error:undefined} : person)};
}
