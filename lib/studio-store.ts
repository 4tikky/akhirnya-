'use client';

import { create } from 'zustand';
import { projects } from './storage';
import type { Project } from './types';

type Update = Partial<Project> | ((value: Project) => Project);
type StudioStore = {
  project?: Project;
  status: 'saved' | 'saving' | 'error';
  open: (project: Project) => void;
  update: (update: Update) => void;
  save: () => Promise<void>;
};
let pending: ReturnType<typeof setTimeout> | undefined;
let writes = Promise.resolve();

export const useStudio = create<StudioStore>((set,get) => ({
  status:'saved',
  open(project) {
    clearTimeout(pending);
    set({project,status:'saved'});
  },
  update(change) {
    const project = get().project;
    if (!project) return;
    const updated = {...(typeof change === 'function' ? change(project) : {...project,...change}),updatedAt:Date.now()};
    set({project:updated,status:'saving'});
    clearTimeout(pending);
    pending = setTimeout(() => { void get().save(); },260);
  },
  async save() {
    clearTimeout(pending);
    const project = get().project;
    if (!project) return;
    const write = writes.then(() => projects.put(project));
    writes = write.catch(() => {});
    try {
      await write;
      if (get().project === project) set({status:'saved'});
    } catch {
      if (get().project === project) set({status:'error'});
    }
  },
}));
