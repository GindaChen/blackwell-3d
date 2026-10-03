# Maxwell Tesla M40: design note (2026-10-03)

**In a few words:** the M40 (`?view=m40`) is the K80 card builder with one GM200 instead of two GK210s and a PLX switch.

See `docs/2026-10-03-kepler-design.md` for the shared builder, coordinates, airflow and the table of sourced versus
estimated facts. Specific to Maxwell:

- `src/families/maxwell/m40.js` holds the layout spec. The GPU is at x = -46. Six core VRM phases sit in two columns
  to its right and six memory/aux phases along the top edge (estimates). There is an EPS 8-pin and a 2-pin
  power-brake header at the far end.
- `src/families/maxwell/silicon.js` draws the GM200 floorplan: 6 GPCs of 4 SMM, the L2 between the GPC rows,
  6 x 64-bit GDDR5 PHYs on three edges, and PCIe on the bottom edge.
- 12 GB (2015) and 24 GB (2016) boards both have 24 chips. The model assumes both use the same layout.
  The sticker reads 12 GB.
- Sources: `src/families/maxwell/SOURCES.md`.
