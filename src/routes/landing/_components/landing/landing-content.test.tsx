import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoriesSection from "./CategoriesSection";
import FeaturedCoursesSection from "./FeaturedCoursesSection";
import StatsSection from "./StatsSection";
import TestimonialSection from "./TestimonialSection";

describe("public landing content", () => {
  it("explains the governed learning model without unverified social proof", () => {
    render(
      <>
        <StatsSection />
        <CategoriesSection />
        <FeaturedCoursesSection />
        <TestimonialSection />
      </>,
    );

    expect(
      screen.getByRole("heading", {
        name: "One learning system, from strategy to mastery",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "From trusted materials to learning evidence",
      }),
    ).toBeInTheDocument();
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
});
