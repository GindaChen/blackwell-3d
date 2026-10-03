// Guided tours, one per model. Guided mode runs the tour for the model currently on screen.
//
// Step fields
//   title, text        : what the panel says (keep it short)
//   display            : { lids, cooling, floorplan, shell, explode } overrides for this step
//   dir                : camera direction (from the subject towards the camera), auto-framed
//   zoom               : >1 pulls the camera back, <1 pushes in
//   frame              : 'all' frames the whole model instead of just the parts involved
//   tags               : [{ sel, label }] neutral labels on parts worth naming
//   flows              : [{ from, to, via?, pair?, bus, label? }] directional data/power/coolant flows
//
// Selectors (sel / from / to / via entries)
//   { id }                     every visible part with that id
//   { id, side: -1|1 }         only parts left (-1) or right (+1) of the model's centre line
//   { id, nth }                the nth match (sorted rear-to-front, then left-to-right)
//   { id, within: sel }        only parts inside the part matched by `within`
//   { virtual: [x,y,z], label } a point outside the model (model millimetres; +z = front, -z = rear)
//
// pair: how many `to` targets each `from` connects to: 'all' (default) | 'nearest' | n
// Each family's index.js supplies the tour for its views (src/families/README.md); filled by loadFamilies().
export { TOURS } from '../registry.js';
