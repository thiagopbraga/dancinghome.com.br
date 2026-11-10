// Copia o wasm do MediaPipe e baixa os modelos lite e full para public/mediapipe/.
import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'mediapipe');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const base = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker';
const models = [
  ['pose_landmarker_lite.task', `${base}/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`],
  ['pose_landmarker_full.task', `${base}/pose_landmarker_full/float16/latest/pose_landmarker_full.task`],
];

async function exists(path) {
  try {
    return (await stat(path)).size > 100_000;
  } catch {
    return false;
  }
}

async function download(url, file, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    if (attempt >= 4) throw new Error(`Não consegui baixar ${url}: ${err.message}`, { cause: err });
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    await download(url, file, attempt + 1);
  }
}

await mkdir(join(dest, 'wasm'), { recursive: true });
await cp(wasmSrc, join(dest, 'wasm'), { recursive: true });
console.log('wasm copiado para public/mediapipe/wasm');
for (const [name, url] of models) {
  const file = join(dest, name);
  if (await exists(file)) {
    console.log(`${name} já existe`);
    continue;
  }
  console.log(`baixando ${name}...`);
  await download(url, file);
  console.log(`${name} pronto`);
}
