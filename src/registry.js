// Viewer-side registry: each family's index.js (models, cameras, tours, connections) merged with its
// meta.js. See src/families/README.md for the contract.
//
// Families load independently (dynamic import, allSettled), so a family that fails to load only
// drops out of the viewer instead of breaking it; see LOAD_ERRORS.
import { FAMILIES, VIEWS } from './catalog.js';

const loaders = import.meta.glob('./families/*/index.js', { import: 'default' });

export const FAMILY_DEFS = {};
/** view id -> { ...meta, ...index view, family } */
export const VIEW_DEFS = {};
/** view id -> guided tour steps */
export const TOURS = {};
/** floorplan looks from every family: key -> () => ({ marked, floorplan }) */
export const LOOKS = {};
export const LOAD_ERRORS = {};

export async function loadFamilies() {
  await Promise.all(FAMILIES.map(async (f) => {
    const load = loaders[`./families/${f.id}/index.js`];
    if (!load) return;
    try {
      const mod = await load();
      FAMILY_DEFS[f.id] = { ...f, ...mod, views: mod.views };
      Object.assign(LOOKS, mod.looks || {});
      for (const [k, v] of Object.entries(VIEWS)) {
        const def = v.family === f.id && mod.views?.[k];
        if (!def) continue;
        VIEW_DEFS[k] = { ...v, ...def };
        if (def.tour?.length) TOURS[k] = def.tour;
      }
    } catch (e) {
      LOAD_ERRORS[f.id] = String(e?.stack || e);
      console.error(`family "${f.id}" failed to load`, e);
    }
  }));
}
