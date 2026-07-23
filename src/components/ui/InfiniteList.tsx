import { useEffect, useRef } from "react";

export type InfiniteListProps<T> = {
  items: T[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  sentinel?: React.ReactNode;
  empty?: React.ReactNode;
  keyOf?: (item: T, index: number) => React.Key;
  className?: string;
  isLoading?: boolean;
};

function DefaultSentinel({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      data-testid="infinite-list-skeleton"
      className="h-10 w-full animate-pulse rounded-md bg-muted"
    />
  );
}

export function InfiniteList<T>(
  props: InfiniteListProps<T>,
): React.JSX.Element {
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    renderItem,
    sentinel,
    empty,
    keyOf,
    className,
    isLoading = false,
  } = props;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchNextPageRef = useRef(fetchNextPage);
  fetchNextPageRef.current = fetchNextPage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (!hasNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          fetchNextPageRef.current();
        }
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage]);

  if (items.length === 0 && !isLoading && empty !== undefined) {
    return <>{empty}</>;
  }

  const sentinelNode = sentinel ?? (
    <DefaultSentinel visible={isFetchingNextPage || hasNextPage} />
  );

  return (
    <div className={className} data-slot="infinite-list">
      {items.map((item, index) => (
        <div
          key={keyOf ? keyOf(item, index) : index}
          data-slot="infinite-list-item"
        >
          {renderItem(item, index)}
        </div>
      ))}
      <div
        ref={sentinelRef}
        data-testid="infinite-list-sentinel"
        data-slot="infinite-list-sentinel"
      >
        {hasNextPage || isFetchingNextPage ? sentinelNode : null}
      </div>
    </div>
  );
}
