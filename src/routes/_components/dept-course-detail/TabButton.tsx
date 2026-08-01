export function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? "bg-m3-primary text-white"
          : "bg-surface-muted text-text-muted hover:bg-surface-elev"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
            active ? "bg-white/20" : "bg-surface-elev"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
