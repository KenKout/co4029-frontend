/**
 * Geometry + zoom bounds for the knowledge-graph explorer, extracted verbatim
 * from the former 863-line knowledge-graph-detail.tsx. The world box is the
 * nominal layout canvas; the fit-to-view camera frames the ACTUAL node bounds,
 * which a tall tree layout can push well past `WORLD_H`.
 */

export const WORLD_W = 1600;
export const WORLD_H = 1000;
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;
