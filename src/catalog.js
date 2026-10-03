// Every model the site can show, grouped into families (one folder each under src/families/, see
// src/families/README.md). Only the light meta.js files are loaded here, so the home page stays small.

const metas = Object.values(import.meta.glob('./families/*/meta.js', { eager: true, import: 'default' }));

export const FAMILIES = metas.sort((a, b) => a.order - b.order);

export const VIEWS = Object.fromEntries(FAMILIES.flatMap((f) => Object.entries(f.views).map(([k, v]) => [k, { ...v, family: f.id }])));

export const familyOf = (view) => FAMILIES.find((f) => f.id === VIEWS[view]?.family);
export const viewsOf = (family) => Object.keys(VIEWS).filter((k) => VIEWS[k].family === family);
