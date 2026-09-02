import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stayed unchanged for `ms` — for search inputs
 * whose change handler refetches an API query on every keystroke.
 */
export function useDebouncedValue<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}