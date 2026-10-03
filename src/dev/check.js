// Automated review checks, run from the browser console: `await __app.check()` or `await __app.check(['h100'])`.
// For each view: every guided-tour flow and tag must resolve, and every hoverable part id must have a
// connection entry whose links resolve at least once (with every display toggle on).
import { TOURS } from '../tour/steps.js';
import { lookup } from '../annotations/connections.js';

export function createCheck(app) {
  return async function check(viewIds = Object.keys(app.views)) {
    const report = { ok: true, views: {} };
    for (const view of viewIds) {
      const out = { tourMisses: [], noEntry: [], deadLinks: [], parts: 0 };
      app.tour.stop();
      app.setView(view, { instant: true });
      const steps = TOURS[view] || [];
      if (!steps.length) out.tourMisses.push('no tour');
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        const saved = { flows: st.flows, tags: st.tags };
        (saved.flows || []).forEach((f, k) => {
          st.flows = [f]; st.tags = [];
          app.tour.start(i);
          if (!app.tour.stats.flows) out.tourMisses.push(`step ${i + 1} flow ${k}: ${JSON.stringify(f.from)} → ${JSON.stringify(f.to)}`);
        });
        (saved.tags || []).forEach((t) => {
          st.flows = []; st.tags = [t];
          app.tour.start(i);
          if (!app.tour.stats.labels) out.tourMisses.push(`step ${i + 1} tag "${t.label}"`);
        });
        st.flows = saved.flows; st.tags = saved.tags;
      }
      app.tour.stop();
      for (const id of ['lids', 'cooling', 'shell', 'floorplan']) {
        const el = document.getElementById(id);
        if (!el.checked) { el.checked = true; el.dispatchEvent(new Event('change')); }
      }
      const root = app.roots();
      const seen = new Map();
      root.traverse((o) => { const p = o.userData.part; if (p && !seen.has(p.id)) seen.set(p.id, o); });
      out.parts = seen.size;
      for (const [id, o] of seen) {
        const e = lookup(id);
        if (!e) { out.noEntry.push(id); continue; }
        app.annotator.unpin();
        app.annotator.hover(o.isInstancedMesh ? { obj: o, instanceId: 0 } : { obj: o }, root);
        if (e.links.length && !document.querySelectorAll('.c-links li').length) out.deadLinks.push(id);
      }
      app.annotator.unpin();
      if (out.tourMisses.length || out.noEntry.length || out.deadLinks.length) report.ok = false;
      report.views[view] = out;
    }
    return report;
  };
}
