import { useTranslation } from "react-i18next";
import ToggleSwitch from "./ToggleSwitch";
import type { PreferenceMatrixController } from "./types";

export default function PreferenceMatrixList({
  controller,
}: {
  controller: PreferenceMatrixController;
}) {
  const { t } = useTranslation();
  const { matrix, isPatching, onToggle } = controller;

  return (
    <div className="sm:hidden divide-y divide-m3-outline-variant/40">
      {matrix.map((row) => (
        <div key={row.id} className="p-4 space-y-3">
          <p className="text-sm font-semibold text-m3-on-surface">
            {row.label}
          </p>
          <div className="space-y-2">
            {row.cells.map((cell) => {
              const channelLabel = t(
                `settings_notifications.channel.${cell.channel}`,
              );
              return (
                <div
                  key={cell.channel}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-m3-on-surface-variant">
                    {channelLabel}
                  </span>
                  <ToggleSwitch
                    checked={cell.enabled}
                    disabled={isPatching}
                    onChange={(next) => onToggle(row.id, cell.channel, next)}
                    ariaLabel={`${row.label} – ${channelLabel}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
