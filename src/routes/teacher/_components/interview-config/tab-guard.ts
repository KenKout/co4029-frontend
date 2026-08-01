/**
 * The unsaved-changes guard around a tab switch on the interview-config page.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). A plain factory rather than a hook: the page still owns
 * `activeTab`, `pendingTab` and the dirty flag, so this adds no hook slots and
 * the guard keeps registering at exactly the same point in the page's lifecycle.
 *
 * Leaving Settings with unsaved edits is not destructive (panels stay mounted, so
 * the draft survives), but it is easy to forget and then lose the work on a later
 * reload. Intercepting the tab switch asks once: save now, or carry on and save
 * later. The pending tab is remembered so either answer lands the teacher where
 * they were going.
 */

import type { TabId } from "@/lib/interview/config-draft";

export interface TabGuard {
  requestTabChange: (next: TabId) => void;
  discardSaveAndSwitch: () => void;
  saveAndSwitch: () => Promise<void>;
}

export function createTabGuard({
  activeTab,
  setActiveTab,
  pendingTab,
  setPendingTab,
  settingsDirty,
  saveSettings,
}: {
  activeTab: TabId;
  setActiveTab: (next: TabId) => void;
  pendingTab: TabId | null;
  setPendingTab: (next: TabId | null) => void;
  settingsDirty: boolean;
  saveSettings: () => Promise<boolean>;
}): TabGuard {
  function requestTabChange(next: TabId) {
    if (next === activeTab) return;
    if (activeTab === "settings" && settingsDirty) {
      setPendingTab(next);
      return;
    }
    setActiveTab(next);
  }

  /** "Later" — keep the unsaved draft and switch anyway. */
  function discardSaveAndSwitch() {
    const next = pendingTab;
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  /** "Save now" — persist first, and only switch if the save succeeded. */
  async function saveAndSwitch() {
    const next = pendingTab;
    const ok = await saveSettings();
    if (!ok) return; // stay put with the dialog open so the error is actionable
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  return { requestTabChange, discardSaveAndSwitch, saveAndSwitch };
}
