import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Admin-only tenant switcher.
 *
 * Platform admins have ``scope_kind='global'`` and no primary organization, so
 * every org-scoped admin surface (detail, memberships, units, domains, runtime
 * settings) is reached by picking a tenant first. This puts that picker in the
 * top bar next to the section switcher: choose an organisation and jump
 * straight to its admin detail page.
 *
 * Scope note: this is NAVIGATION, not an ambient "act as org X" context. It
 * does not rescope other admin views or mutate anything — it moves the admin to
 * the selected tenant's admin pages. A persisted global tenant context would
 * need every admin endpoint to accept and honour an org filter on the backend;
 * that is a much larger change and deliberately out of scope here.
 *
 * Only rendered for holders of ``system.administer`` — no other role has a
 * cross-tenant view to switch within.
 */
export default function TenantSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = useMyPermissions();
  const perms = permissions.data?.permissions ?? [];
  const isAdmin = perms.includes("system.administer");
  const [query, setQuery] = useState("");

  // Load the tenant list only for admins (the hook still runs unconditionally
  // to satisfy the rules of hooks; the request is cheap and admin-gated by the
  // backend anyway). 200 covers every tenant on this deployment without paging.
  const orgs = useOrganizations({ limit: 200 });

  // Current tenant is derived from the URL: /admin/organizations/<uuid>/...
  const activeOrgId = useMemo(() => {
    const m = location.pathname.match(
      /^\/admin\/organizations\/([0-9a-f-]{36})/i,
    );
    return m?.[1] ?? null;
  }, [location.pathname]);

  const items = orgs.items ?? [];
  const activeOrg = items.find((o) => o.id === activeOrgId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!isAdmin) return null;

  const label =
    activeOrg?.name ??
    t("tenant_switcher.all_tenants", { defaultValue: "All tenants" });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-8 text-xs font-semibold text-text-muted hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary max-w-[220px]"
        aria-label={t("tenant_switcher.aria", {
          defaultValue: "Switch tenant",
        })}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-72 rounded-lg bg-card shadow-editorial border border-border p-1.5"
      >
        <div className="relative px-1 pb-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("tenant_switcher.search_placeholder", {
              defaultValue: "Search organisations…",
            })}
            className="w-full rounded-md border border-border bg-surface pl-8 pr-2 h-8 text-xs text-text-strong outline-none focus:border-primary"
            // Keep focus in the field; Radix would otherwise steal it to items.
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {orgs.isLoading ? (
            <p className="px-3 py-2 text-xs text-text-muted">
              {t("tenant_switcher.loading", { defaultValue: "Loading…" })}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-muted">
              {t("tenant_switcher.empty", {
                defaultValue: "No organisations found",
              })}
            </p>
          ) : (
            filtered.map((org) => {
              const isActive = org.id === activeOrgId;
              return (
                <DropdownMenuItem
                  key={org.id}
                  className={cn(
                    "rounded-md px-2.5 py-2 gap-2 cursor-pointer text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft focus:text-primary",
                    isActive && "bg-primary-soft text-primary",
                  )}
                  onClick={() =>
                    void navigate({
                      to: "/admin/organizations/$orgId",
                      params: { orgId: org.id },
                    })
                  }
                >
                  <Building2 className="h-4 w-4 shrink-0 text-m3-on-surface-variant" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {org.name}
                    </span>
                    <span className="block text-[11px] text-text-muted truncate">
                      {org.slug}
                    </span>
                  </span>
                  {isActive && <Check className="h-4 w-4 shrink-0" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
