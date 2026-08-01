import type { MaterialUploadInit } from "@/lib/api/types";

/**
 * Shared types for the material hub, extracted from the former 1422-line
 * material-hub.tsx so the upload hook, the form fields and the knowledge-graph
 * preview layers can agree on one definition instead of re-declaring the same
 * inline shapes.
 */

/** Where a single-file upload currently is in its init → complete sequence. */
export type UploadPhase =
  | "idle"
  | "init"
  | "hashing"
  | "uploading"
  | "completing";

/** The metadata the teacher edits before the upload starts. */
export interface UploadFormState {
  title: string;
  material_type: MaterialUploadInit["material_type"];
  ai_processing_enabled: boolean;
  visible_to_students: boolean;
}

/**
 * What every field of the upload form needs: the shared form state, its setter
 * and the disable-while-busy flag. Passed as one object so each field keeps the
 * exact `setForm` updater it had when the form was a single 320-line function.
 */
export interface UploadFieldProps {
  form: UploadFormState;
  setForm: React.Dispatch<React.SetStateAction<UploadFormState>>;
  uploading: boolean;
}

/** Laid-out position + radius of one concept node in the compact KG preview. */
export interface KgNodePosition {
  x: number;
  y: number;
  r: number;
}

/** Which relation an edge encodes — drives its colour, dash and arrowhead. */
export type KgEdgeVariant = "prereq" | "related";

/** Whether an edge touches the hovered node (bright) or not (muted). */
export type KgEdgeState = "active" | "idle";
