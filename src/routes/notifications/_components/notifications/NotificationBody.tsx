import { useTranslation } from "react-i18next";

import { parseNotificationBody } from "@/lib/notifications/deep-link";

const SNIPPET_LIMIT = 200;

function snippet(body: string): string {
  if (body.length <= SNIPPET_LIMIT) return body;
  return `${body.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}

export function NotificationBody({
  body,
  expanded,
  onLinkNavigate,
}: {
  body: string;
  expanded: boolean;
  onLinkNavigate: (url: string) => void;
}) {
  const { t } = useTranslation();
  const text = expanded ? body : snippet(body);
  const segments = parseNotificationBody(text);
  if (segments.length === 0) return null;
  return (
    <p
      className={`text-sm text-m3-on-surface-variant whitespace-pre-line ${
        expanded ? "" : "line-clamp-3"
      }`}
    >
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <a
            key={i}
            href={seg.url}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLinkNavigate(seg.url);
            }}
            className="text-m3-primary underline underline-offset-2 hover:text-m3-secondary"
            aria-label={t("notifications.open_link")}
          >
            {seg.label}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  );
}
