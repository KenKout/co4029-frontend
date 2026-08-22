/**
 * Shared types for the management career-path detail screen, extracted from
 * the former 1k-line management-career-path-detail.tsx so the page shell, the
 * three tab sections and the hooks agree on one definition instead of passing
 * loosely-typed props around.
 */

export type TabKey = "general" | "programs" | "courses" | "students";
