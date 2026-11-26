import { generateInBrowser } from './layout';
import { newGraduate, newProject } from './types';

export async function demoProject() {
  const project = newProject();
  project.name = 'Akhirnya Lulus — Wisuda Informatika';
  project.headline = 'Menuju Puncak Sarjana';
  project.theme = 'adventure';
  project.size = {width:60,height:160};
  project.university = 'Universitas Nusantara';
  project.faculty = 'Fakultas Teknik';
  project.major = 'Informatika';
  project.year = '2026';
  project.tagline = 'From deadlines to degrees.';
  project.graduates = [
    ['Raka Pratama','raka',440,700],
    ['Nadia Putri','nadia',360,640],
    ['Tiara Maheswari','tiara',350,680],
    ['Faris Akbar','faris',380,700],
  ].map(([name,asset,width,height]) => ({...newGraduate(),name:String(name),degree:'S.Kom.',original:{src:`/demo/${asset}.webp`,width:Number(width),height:Number(height)}}));
  project.designs = await generateInBrowser(project);
  project.selected = project.designs[0]?.id ?? '';
  project.step = 4;
  return project;
}
