import type { Metadata } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/playfair-display';
import '@fontsource/anton';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import './globals.css';

const title = 'Akhirnya! — Bikin Banner Wisuda Otomatis';
const description = 'Bikin banner wisuda bareng teman secara otomatis. Upload foto, masukkan nama, pilih desain favorit, dan download banner siap cetak. Tanpa ribet desain!';

export const metadata: Metadata = {
  applicationName: 'Akhirnya!',
  title: { default:title, template:'%s | Akhirnya!' },
  description,
  openGraph: { siteName:'Akhirnya!', title, description, type:'website', locale:'id_ID' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
