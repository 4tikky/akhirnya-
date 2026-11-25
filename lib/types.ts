import { defaultProjectName } from './brand';

export type ThemeId = 'newspaper' | 'gaming' | 'scrapbook' | 'cinematic' | 'elegant' | 'meme';
export type Strategy = 'symmetry' | 'pyramid' | 'staggered' | 'editorial' | 'collage' | 'cinematic' | 'rows' | 'hero';
export type Face = { x: number; y: number; w: number; h: number };
export type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number; grayscale: number; exposure: number; sharpness: number };
export const defaults: Adjustments = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, grayscale: 0, exposure: 0, sharpness: 0 };
export type Photo = { src: string; width: number; height: number };
export type Graduate = {
  id: string; name: string; degree: string; nickname: string; quote: string;
  original?: Photo; processed?: Photo; face?: Face; useCutout: boolean;
  crop?: Face; adjustments: Adjustments;
  status: 'idle' | 'processing' | 'ready' | 'error'; error?: string;
};
export type Project = {
  id: string; name: string; headline: string; university: string; faculty: string; major: string;
  year: string; date: string; tagline: string; logo?: Photo; size: Size; graduates: Graduate[];
  theme: ThemeId; seed: number; designs: Design[]; selected: string;
  updatedAt: number; thumbnail?: string; step: number;
};
export type Size = { width: number; height: number };
export type Color = { bg: string; ink: string; accent: string; soft: string };
export type Bounds = { x: number; y: number; w: number; h: number };
export type TextNode = Bounds & {
  kind: 'text'; text: string; font: string; fontSize: number; weight: string;
  color: string; align: 'left' | 'center' | 'right'; spacing?: number; graduateId?: string;
};
export type ShapeNode = Bounds & { kind: 'shape'; shape: 'rect' | 'ellipse' | 'star' | 'diamond' | 'bubble'; fill: string; stroke?: string; rotation?: number };
export type PortraitNode = Bounds & { kind: 'portrait'; graduateId: string; rotation: number; frame: string; monochrome?: boolean };
export type PhotoNode = Bounds & { kind: 'logo' };
export type DesignNode = TextNode | ShapeNode | PortraitNode | PhotoNode;
export type Design = {
  id: string; theme: ThemeId; seed: number; strategy: Strategy; dimensions: Size; size: Size;
  palette: Color; label: string; score: number; nodes: DesignNode[];
  favorite?: boolean; canvas?: Record<string, unknown>;
};

export function newGraduate(): Graduate {
  return { id: crypto.randomUUID(), name: '', degree: '', nickname: '', quote: '', useCutout: true, adjustments: { ...defaults }, status: 'idle' };
}

export function newProject(): Project {
  return {
    id: crypto.randomUUID(), name: defaultProjectName, headline: 'The Final Chapter', university: '', faculty: '', major: '',
    year: String(new Date().getFullYear()), date: '', tagline: '', size: { width: 300, height: 150 },
    graduates: [], theme: 'newspaper', seed: 0, designs: [], selected: '', updatedAt: Date.now(), step: 0,
  };
}
