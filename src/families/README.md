# Hardware families

Each folder in `src/families/` is one family of hardware, such as NVIDIA Hopper or Apple silicon. The site finds
families automatically through `import.meta.glob`, so adding one means **adding a folder, with no edits to shared
files**.

```
src/families/<family>/
  meta.js     light metadata, loaded by the home page (no three.js imports!)
  index.js    models, cameras, tours, connections, loaded by the viewer
  ...         your assemblies/parts/textures/tours, any file names you like
```

## meta.js

```js
export default {
  id: 'hopper',                 // folder name
  name: 'NVIDIA Hopper',        // section heading on the home page
  accent: '#4fb3a9',            // one accent colour for the family (buttons, tags, tour highlights)
  order: 30,                    // home page order (lower first): rubin 10, blackwell 20, hopper 30, ampere 40,
                                //   volta 50, pascal 55, kepler 60, rtx 70, apple 90
  blurb: 'One sentence for the home page section.',
  views: {                      // key order = nav order; keys are global ?view= ids, so make them unique
    h100: {
      title: 'H100 SXM5',       // viewer heading
      long: 'H100 SXM', short: 'SXM',   // nav button labels (desktop / phone)
      blurb: 'One sentence for the card.',
      stats: ['80 GB HBM3', '3.35 TB/s', '700 W'],  // 2-3 short chips on the card
    },
  },
};
```

## index.js

```js
import { buildH100 } from './sxm5.js';
import { H100_STEPS } from './tours.js';

export default {
  views: {
    h100: {
      build: (ctx) => buildH100(),   // returns a THREE.Object3D in millimetres (y up, +z = front)
      offset: [0, 0, 0],             // mm, applied to a wrapper (never mutate the model; others may clone it)
      scale: 0.1,                    // scene units per mm (default 0.1; use 0.3 for a ~6 cm package)
      cams: {                        // scene units (after scale); hero is the default camera
        hero: { pos: [27, 33, 40], target: [0, 0, 1.5] },
        top: { pos: [0, 62, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 14, 52], target: [0, 0, 2] },
        close: { pos: [9, 9, -2], target: [3, 0, -9] },
      },
      stage: { shadow: 30, far: 220, key: 1, floor: -12 }, // optional: shadow half-size, shadow far, key-light distance x, floor y (scene units)
      toggles: ['lids', 'cooling', 'floorplan'],            // display options that apply (also 'shell')
      tour: H100_STEPS,                                     // guided tour, see src/tour/steps.js
    },
  },
  connections: { /* id -> { role, links } ; see src/annotations/connections.js */ },
  buses: { nvlink: { name: 'NVLink 4', color: '#38d5ff' } }, // optional overrides/additions to BUSES
  looks: { 'hopper-die': () => ({ marked, floorplan }) },    // optional: floorplan-toggle materials
};
```

### Build context (`ctx`)

- `ctx.model(viewId)` returns a clone of another view's model with the explode slider at 0 (the model is built if needed).
  For example, a server view can reuse the GPU board view.

### Runtime hooks: name things, don't import main.js

| Toggle | How it works |
|---|---|
| `lids` | Objects **named** `gpu-lid` are shown or hidden. Objects named `gpu-coldplate-lift` move up 2.6 mm when lids are on. |
| `cooling` | Objects named `cooling` are shown or hidden (heatsinks, cold plates, fans, shrouds). |
| `shell` | Objects named `shell` are shown or hidden (enclosures, card shrouds). |
| `floorplan` | Meshes with `userData.looks = '<key>'` swap between `looks[key]().marked` and `.floorplan`. Store the key, not the materials, because userData is JSON-copied on clone. Prefix keys with your family id. |
| explode | `explode(obj, x, y, z)` from `src/lib/util.js` (offset in the parent's space, mm). |
| hover | `tagPart(obj, id, label, info)`; `id` must have an entry in your `connections`, or in the global table. |

Call `optimize(root)` (`src/lib/optimize.js`) at the end of a build: it merges meshes inside each tagged, exploded
or named boundary. Add any new runtime names to `PROTECTED_NAMES` there. That is the only shared edit allowed, and
the reviewer does it.

### Connections and buses

Your `connections` are looked up first while your family is on screen, then the global table in
`src/annotations/connections.js`. That lets you reuse shared ids (`mlcc`, `power-stage`, `resistor`, ...) or override
them. Ids only need to be unique within your family. `buses` override or extend the bus legend while your family is
on screen; for example, Hopper renames `nvlink` to "NVLink 4".

### Reuse

Shared helpers are read-only, so import them and don't edit them:
- `src/parts/` (chips, board parts, materials)
- `src/textures/` (pcb, silicon, surfaces)
- `src/assemblies/` (tray helpers such as `fan`, `finnedHeatsink`, `cable`, `coldPlate`, `frontPanel`; the superchip `Placer`)
- `src/lib/`

If you need a variant, copy it into your folder.

## Checks the reviewer runs

1. Every tour flow and tag resolves (`__app.tour.stats` per flow).
2. Every hoverable part id has a connection entry, and entries with links resolve at least one.
3. No console errors; `npm run build` passes.
4. A render of each view looks right: camera framing, scale, nothing floating or intersecting.
5. Facts are cited in `reference/SOURCES.md` and the family's design note in `docs/`.
