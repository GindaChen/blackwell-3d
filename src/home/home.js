// Home page: one section per hardware family, one card per model. Cards link into the viewer.
import { FAMILIES, VIEWS, viewsOf } from '../catalog.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const root = document.getElementById('families');
for (const fam of FAMILIES) {
  const section = el('section', 'family');
  section.style.setProperty('--accent', fam.accent);
  const head = el('div', 'family-head');
  head.append(el('h2', null, fam.name), el('p', null, fam.blurb));
  const grid = el('div', 'cards');
  for (const k of viewsOf(fam.id)) {
    const v = VIEWS[k];
    const a = el('a', 'card');
    a.href = `viewer.html?view=${k}`;
    const fig = el('div', 'thumb');
    const img = new Image();
    img.src = `thumbs/${k}.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => fig.classList.add('missing');
    fig.append(img);
    const body = el('div', 'card-body');
    body.append(el('h3', null, v.title), el('p', null, v.blurb));
    const stats = el('ul', 'stats');
    for (const s of v.stats) stats.append(el('li', null, s));
    body.append(stats);
    a.append(fig, body);
    grid.append(a);
  }
  section.append(head, grid);
  root.append(section);
}
