/**
 * Material hub — the teacher-side upload / processing / knowledge-graph surface
 * for one lesson.
 *
 * This module is a facade. It has no component of its own: it is a collection of
 * independently mounted pieces (the upload form, the live processing card, the
 * material history card and its version panel, the delete confirm, the compact
 * knowledge-graph card, and the restore list), and two modules import from here.
 * The public surface is therefore kept byte-compatible while every
 * implementation lives in `./material-hub/*`:
 *
 *  - lookup tables → `./material-hub/constants`
 *  - pure helpers  → `./material-hub/helpers`
 *  - one component per file, PascalCase
 *  - stateful clusters → `./material-hub/use-*`
 *
 * Each re-export names its file explicitly (never the bare directory) so this
 * sibling `.tsx` keeps resolving unambiguously.
 */

export {
  MATERIAL_TYPE_ICON,
  MATERIAL_TYPE_OPTIONS,
  PROC_STATUS,
} from "./material-hub/constants";
export {
  detectMaterialType,
  formatBytes,
  isLikelyCorsError,
  materialIcon,
  sha256Hex,
} from "./material-hub/helpers";
export { KnowledgeGraphPreview } from "./material-hub/KnowledgeGraphPreview";
export { MaterialCard } from "./material-hub/MaterialCard";
export { MaterialDeleteButton } from "./material-hub/MaterialDeleteButton";
export { MaterialVersionsPanel } from "./material-hub/MaterialVersionsPanel";
export { ProcessingStatusCard } from "./material-hub/ProcessingStatusCard";
export { ProgressBar } from "./material-hub/ProgressBar";
export { RecentlyDeletedSection } from "./material-hub/RecentlyDeletedSection";
export { SelectedFileForm } from "./material-hub/SelectedFileForm";
