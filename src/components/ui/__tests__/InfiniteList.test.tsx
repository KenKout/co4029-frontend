import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InfiniteList } from "@/components/ui/InfiniteList";

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];

  callback: ObserverCallback;
  observed: Element[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {
    this.observed = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(isIntersecting: boolean): void {
    const entries = this.observed.map(
      (target) =>
        ({
          isIntersecting,
          target,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        }) as IntersectionObserverEntry,
    );
    this.callback(entries);
  }
}

describe("InfiniteList", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders items via renderItem", () => {
    const items = [
      { id: "a", label: "Apple" },
      { id: "b", label: "Banana" },
    ];

    render(
      <InfiniteList
        items={items}
        hasNextPage={false}
        fetchNextPage={() => {}}
        isFetchingNextPage={false}
        renderItem={(item) => <span>{item.label}</span>}
        keyOf={(item) => item.id}
      />,
    );

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("calls fetchNextPage when sentinel becomes visible", () => {
    const fetchNextPage = vi.fn();

    render(
      <InfiniteList
        items={[{ id: "a" }]}
        hasNextPage={true}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={false}
        renderItem={(item) => <span>{item.id}</span>}
        keyOf={(item) => item.id}
      />,
    );

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.observed).toHaveLength(1);

    observer.trigger(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    observer.trigger(false);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
