import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// Dev only: the viewer can POST a rendered JPEG to /__thumb/<view> to refresh the home page's card
// image (public/thumbs/<view>.jpg). See `__app.saveThumb()` in src/main.js.
const thumbWriter = {
  name: 'thumb-writer',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__thumb/', (req, res) => {
      const name = req.url.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '');
      if (req.method !== 'POST' || !name) { res.statusCode = 400; return res.end(); }
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        mkdirSync(resolve(root, 'public/thumbs'), { recursive: true });
        writeFileSync(resolve(root, `public/thumbs/${name}.jpg`), Buffer.concat(chunks));
        res.end('ok');
      });
    });
  },
};

// Two pages: the chip gallery (index.html) and the 3D viewer (viewer.html?view=...).
export default defineConfig({
  plugins: [thumbWriter],
  // saving a card image must not full-reload every open viewer tab
  server: { watch: { ignored: ['**/public/thumbs/**'] } },
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        viewer: resolve(root, 'viewer.html'),
      },
    },
  },
});
