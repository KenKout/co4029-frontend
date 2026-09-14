import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "../../landing";
import i18n from "@/i18n";

async function renderLanding() {
  await i18n.changeLanguage("en");
  const root = createRootRoute();
  const index = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: LandingPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });
}

describe("public landing content", () => {
  it("offers a public sample and honest sign-in destinations without unverified social proof", async () => {
    await renderLanding();
    const sample = screen.getByRole("link", { name: "See a sample workflow" });
    expect(sample).toHaveAttribute("href", "#sample-workflow");
    expect(document.getElementById("sample-workflow")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", {
      name: "Sign in to explore",
    })) {
      expect(link).toHaveAttribute("href", "/courses");
    }
    expect(screen.getByText("Illustrative example")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "AI supports academic judgment. It does not replace it.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Faculty & program leaders")).toBeInTheDocument();
    expect(screen.getByText("Instructors")).toBeInTheDocument();
    expect(screen.getByText("Learners")).toBeInTheDocument();

    expect(screen.queryByText("500k+")).not.toBeInTheDocument();
    expect(screen.queryByText("James Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("2,400+ Courses")).not.toBeInTheDocument();
  });

  it("updates the sample evidence when a visitor changes steps", async () => {
    await renderLanding();
    const panel = screen.getByRole("region", {
      name: "Selected workflow step",
    });
    expect(
      within(panel).getByText("A lesson you already teach"),
    ).toBeInTheDocument();
    const review = screen.getByRole("button", { name: /Review the structure/ });
    fireEvent.click(review);
    expect(review).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByText(/Review checkpoint/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Find the next step/ }));
    expect(review).toHaveAttribute("aria-pressed", "false");
    expect(
      within(panel).getByText(/Next practice: distinguish a primary key/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Start with materials/ }),
    );
    expect(
      within(panel).getByText("A lesson you already teach"),
    ).toBeInTheDocument();
  });

  it("switches all landing content between English and Vietnamese", async () => {
    await renderLanding();
    fireEvent.click(screen.getAllByRole("button", { name: "VI" })[0]);
    expect(
      await screen.findByText("Tài liệu môn học của bạn."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lộ trình học tập rõ ràng hơn."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quyết định rõ ràng hơn cho mọi người."),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("vi");
    fireEvent.click(screen.getAllByRole("button", { name: "EN" })[0]);
    expect(
      await screen.findByText("Clearer decisions for everyone involved."),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("jumps immediately when reduced motion is requested", async () => {
    await renderLanding();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    fireEvent.click(
      screen.getByRole("link", { name: "See a sample workflow" }),
    );
    expect(window.location.hash).toBe("#sample-workflow");
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockRestore();
  });

  it("opens mobile navigation and closes it on Escape or a section choice", async () => {
    await renderLanding();
    const menu = document.getElementById("landing-mobile-menu")!;
    expect(menu).toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(menu).not.toHaveAttribute("hidden");
    fireEvent.keyDown(within(menu).getByRole("link", { name: "FAQ" }), {
      key: "Escape",
    });
    expect(menu).toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(within(menu).getByRole("link", { name: "FAQ" }));
    expect(menu).toHaveAttribute("hidden");
    expect(document.getElementById("faq")).toBeInTheDocument();
  });
});
