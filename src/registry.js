// Viewer-side registry: each family's index.js (models, cameras, tours, connections) merged with its
// meta.js. See src/families/README.md for the contract.
import { FAMILIES, VIEWS } from './catalog.js';

const modules = import.meta.glob('./families/*/index.js', { eager: true, import: 'default' });

export const FAMILY_DEFS = Object.fromEntries(FAMILIES.map((f) => {
  const mod = modules[`./families/${f.id}/index.js`] || { views: {} };
  return [f.id, { ...f, ...mod, views: mod.views }];
}));

/** view id -> { ...meta, ...index view, family } */
export const VIEW_DEFS = Object.fromEntries(Object.entries(VIEWS)
  .filter(([k, v]) => FAMILY_DEFS[v.family].views?.[k])
  .map(([k, v]) => [k, { ...v, ...FAMILY_DEFS[v.family].views[k] }]));

/** floorplan looks from every family: key -> () => ({ marked, floorplan }) */
export const LOOKS = Object.assign({}, ...Object.values(FAMILY_DEFS).map((f) => f.looks || {}));
