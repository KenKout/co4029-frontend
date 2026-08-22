import { BookOpen, Boxes, Settings2, Users } from "lucide-react";
import type { TabKey } from "./types";

/**
 * Tab order for the detail screen. Kept as data (rather than a branch chain in
 * the tab bar) so adding a tab never touches render logic.
 */
export const TAB_DEFS: { key: TabKey; icon: typeof BookOpen }[] = [
  { key: "general", icon: Settings2 },
  { key: "programs", icon: Boxes },
  { key: "courses", icon: BookOpen },
  { key: "students", icon: Users },
];
