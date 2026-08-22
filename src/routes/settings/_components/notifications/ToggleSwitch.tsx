import { Switch } from "@/components/ui/switch";

/**
 * Notification preference toggle.
 *
 * Thin adapter over the shared base-ui Switch so the two preference matrix
 * views keep their (checked / disabled / onChange / ariaLabel) call-site
 * contract while rendering the platform's standard switch — previously this
 * was a hand-rolled ghost Button whose white thumb + shadowed track bled
 * into the light background (high-brightness, low-contrast switch) and
 * carried none of the switch keyboard/ARIA semantics.
 */
export default function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
    />
  );
}
