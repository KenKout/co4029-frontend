import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ToggleSwitch from "./ToggleSwitch";
import { CHANNEL_IDS } from "./constants";
import type { PreferenceMatrixController } from "./types";

export default function PreferenceMatrixTable({
  controller,
}: {
  controller: PreferenceMatrixController;
}) {
  const { t } = useTranslation();
  const { matrix, isPatching, onToggle } = controller;

  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-m3-surface-container-low">
            <TableHead>{t("settings_notifications.category_col")}</TableHead>
            {CHANNEL_IDS.map((ch) => (
              <TableHead key={ch} className="text-center w-32">
                {t(`settings_notifications.channel.${ch}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-4 font-medium text-m3-on-surface">
                {row.label}
              </TableCell>
              {row.cells.map((cell) => (
                <TableCell key={cell.channel} className="py-4 text-center">
                  <div className="inline-flex">
                    <ToggleSwitch
                      checked={cell.enabled}
                      disabled={isPatching}
                      onChange={(next) => onToggle(row.id, cell.channel, next)}
                      ariaLabel={`${row.label} – ${t(
                        `settings_notifications.channel.${cell.channel}`,
                      )}`}
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
