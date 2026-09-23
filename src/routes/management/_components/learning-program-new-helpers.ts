export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface ProgramFacultyOption {
  id: string;
}

export interface ProgramDraftFields {
  name: string;
  slug: string;
  facultyId: string;
}

export function readInputValue(
  input: HTMLInputElement | null,
  fallback: string,
): string {
  return input?.value ?? fallback;
}

/** Resolve values at submit time rather than trusting a stale intermediate UI state. */
export function resolveProgramDraftFields(input: {
  name: string;
  slug: string;
  facultyId: string;
  defaultFacultyId?: string | null;
  faculties?: readonly ProgramFacultyOption[];
}): ProgramDraftFields {
  const name = input.name.trim();
  const slug = input.slug.trim() || slugify(name);
  const facultyId =
    input.facultyId.trim() ||
    input.defaultFacultyId?.trim() ||
    (input.faculties?.length === 1 ? input.faculties[0].id : "");

  return { name, slug, facultyId };
}
