// Re-download the reference photographs listed in reference/sources.json into reference/images/.
// They are third-party copyrighted images, so they are git-ignored and kept for local study only.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(await readFile(join(root, 'reference/sources.json'), 'utf8'));
await mkdir(join(root, 'reference/images'), { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
for (const { file, url, page } of list) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: new URL(page).origin + '/' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(join(root, 'reference/images', file), Buffer.from(await res.arrayBuffer()));
    console.log('ok  ', file);
  } catch (e) {
    console.log('FAIL', file, e.message);
  }
}
