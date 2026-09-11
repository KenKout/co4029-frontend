import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import LandingPage from "../../landing";

async function renderLanding() {
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
