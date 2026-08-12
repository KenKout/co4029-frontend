import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Mobile sidebar drawer state. The drawer is closed by default and the
 * hamburger (ContentTopBar) opens it; navigation closes it again.
 */
export function useMobileNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  return { mobileNavOpen, setMobileNavOpen };
}
