import { Workspace } from '@/components/workspace';

export const metadata = { title:'Studio Banner' };
export default async function StudioPage({params}: {params:Promise<{id:string}>}) {
  return <Workspace id={(await params).id}/>;
}
