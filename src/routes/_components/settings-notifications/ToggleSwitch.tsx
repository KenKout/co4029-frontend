import { Button } from "@/components/ui/button";
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
    <Button variant="ghost"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-m3-primary" : "bg-m3-surface-container-high"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-surface-elev shadow-editorial transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </Button>
  );
}
