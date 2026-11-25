import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { build } from 'esbuild';

const target = new URL('../public/models/', import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ['selfie_segmentation','face_detection']) {
  const source = new URL(`../node_modules/@mediapipe/${name}/`,import.meta.url);
  const destination = new URL(name+'/',target);
  await mkdir(destination, { recursive: true });
  for (const file of await readdir(source)) {
    if (file.startsWith(name) && /\.(tflite|binarypb|wasm|data|js)$/.test(file)) {
      await copyFile(new URL(file,source),new URL(file,destination));
    }
  }
}
await build({
  entryPoints: [new URL('../workers/photo.ts', import.meta.url).pathname],
  bundle: true, minify: true,
  outfile: new URL('photo-worker.js',target).pathname,
  platform: 'browser', format: 'iife',
});
