import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Link mode renders router <Link>s; stub the router so the strip can be tested
// without a full RouterProvider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => (
    <a href={to} data-params={JSON.stringify(params ?? {})} {...rest}>
      {children}
    </a>
  ),
}));

import { Tabs } from "../tabs";

const TABS = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta", count: 7 },
  { key: "c", label: "Gamma", count: 0 },
];

describe("Tabs", () => {
  describe("state mode", () => {
    it("renders real tab semantics with the active tab selected", () => {
      render(<Tabs tabs={TABS} value="b" onChange={() => {}} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(3);
      expect(tabs[1].getAttribute("aria-selected")).toBe("true");
      expect(tabs[0].getAttribute("aria-selected")).toBe("false");
      // roving tabIndex: only the active tab is in the tab order
      expect(tabs[1].getAttribute("tabindex")).toBe("0");
      expect(tabs[0].getAttribute("tabindex")).toBe("-1");
    });

    it("calls onChange with the clicked key", () => {
      const onChange = vi.fn();
      render(<Tabs tabs={TABS} value="a" onChange={onChange} />);
      fireEvent.click(screen.getByText("Gamma"));
      expect(onChange).toHaveBeenCalledWith("c");
    });

    it("renders counts when given, including a real zero", () => {
      render(<Tabs tabs={TABS} value="a" onChange={() => {}} />);
      screen.getByText("7");
      // 0 is a meaningful count and must render, unlike `undefined`
      screen.getByText("0");
    });

    it("omits the badge entirely when count is undefined", () => {
      render(
        <Tabs
          tabs={[{ key: "a", label: "Alpha" }]}
          value="a"
          onChange={() => {}}
        />,
      );
      expect(screen.getAllByRole("tab")[0].textContent).toBe("Alpha");
    });
  });

  describe("variants", () => {
    it("outlined uses the underline indicator on a shared bottom rule", () => {
      const { container } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} variant="outlined" />,
      );
      expect(container.querySelector('[role="tablist"]')!.className).toContain(
        "border-b",
      );
      expect(screen.getAllByRole("tab")[0].className).toContain(
        "border-m3-primary",
      );
    });

    it("contained uses a filled pill inside a bordered track (SectionSwitcher look)", () => {
      const { container } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} variant="contained" />,
      );
      const list = container.querySelector('[role="tablist"]')!;
      expect(list.className).toContain("border-border");
      expect(list.className).toContain("p-1");
      expect(screen.getAllByRole("tab")[0].className).toContain("bg-primary");
    });

    it("defaults to outlined", () => {
      render(<Tabs tabs={TABS} value="a" onChange={() => {}} />);
      expect(screen.getAllByRole("tab")[0].className).toContain("border-b-2");
    });
  });

  describe("link mode", () => {
    it("renders anchors (not buttons) so navigation stays right/middle-clickable", () => {
      const { container } = render(
        <Tabs
          tabs={TABS}
          value="b"
          linkTo={(key) => ({ to: `/x/${key}`, params: { id: "1" } })}
        />,
      );
      expect(container.querySelectorAll("a").length).toBe(3);
      expect(screen.queryAllByRole("tab").length).toBe(0);
    });

    it("marks the active link with aria-current=page", () => {
      const { container } = render(
        <Tabs tabs={TABS} value="b" linkTo={(key) => ({ to: `/x/${key}` })} />,
      );
      const anchors = Array.from(container.querySelectorAll("a"));
      expect(anchors[1].getAttribute("aria-current")).toBe("page");
      expect(anchors[0].getAttribute("aria-current")).toBeNull();
    });

    it("passes the mapped route + params through to each link", () => {
      const { container } = render(
        <Tabs
          tabs={TABS}
          value="a"
          linkTo={(key) => ({
            to: `/course/${key}`,
            params: { courseId: "c1" },
          })}
        />,
      );
      const first = container.querySelector("a")!;
      expect(first.getAttribute("href")).toBe("/course/a");
      expect(first.getAttribute("data-params")).toContain("c1");
    });
  });

  describe("sticky", () => {
    it("is plain and in-flow when sticky is not set", () => {
      const { container } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} />,
      );
      expect(container.querySelector(".sticky")).toBeNull();
    });

    it("wraps in a top-16 z-20 pin when sticky", () => {
      const { container } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} sticky />,
      );
      const pin = container.querySelector(".sticky")!;
      expect(pin).not.toBeNull();
      // top-16 clears ContentTopBar; z-20 is the in-<main> ceiling per AGENTS.md
      expect(pin.className).toContain("top-16");
      expect(pin.className).toContain("z-20");
    });

    it("only paints a solid background once actually stuck", () => {
      const { container: loose } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} sticky stuck={false} />,
      );
      expect(loose.querySelector(".sticky")!.className).not.toContain(
        "backdrop-blur-md",
      );
      const { container: pinned } = render(
        <Tabs tabs={TABS} value="a" onChange={() => {}} sticky stuck />,
      );
      // transparent-when-pinned would let content scroll through the strip
      expect(pinned.querySelector(".sticky")!.className).toContain(
        "backdrop-blur-md",
      );
    });
  });
});
