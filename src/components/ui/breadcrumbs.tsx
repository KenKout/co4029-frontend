import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export type BreadcrumbItem = {
  label: string;
  to?: string;
  params?: Record<string, string>;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={t("common.breadcrumb_aria")}
      data-slot="breadcrumbs"
      className="mb-4 flex flex-wrap items-center gap-2 text-sm text-m3-on-surface-variant"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${i}-${item.label}`}>
            {i > 0 ? (
              <ChevronRight
                className="size-4 text-m3-outline"
                aria-hidden="true"
              />
            ) : null}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                params={item.params ?? {}}
                className="rounded-md px-1 hover:text-m3-primary focus-visible:outline-2 focus-visible:outline-m3-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={
                  isLast
                    ? "font-medium text-m3-on-surface"
                    : "text-m3-on-surface-variant"
                }
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
