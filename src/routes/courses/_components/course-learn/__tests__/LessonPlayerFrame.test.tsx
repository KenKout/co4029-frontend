import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import type { LessonPublic } from "@/lib/api/types";
import { LessonVideoPlayer } from "../LessonPlayerFrame";

const { useStreamUrl, useLessonEngagementTracker } = vi.hoisted(() => ({
  useStreamUrl: vi.fn(),
  useLessonEngagementTracker: vi.fn(),
}));

vi.mock("@/lib/api/hooks/materials", () => ({ useStreamUrl }));
vi.mock("@/lib/hooks/useLessonEngagementTracker", () => ({
  useLessonEngagementTracker,
}));
vi.mock("@vidstack/react", () => ({
  MediaPlayer: ({
    src,
    children,
  }: {
    src: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="media-player" data-src={src}>
      {children}
    </div>
  ),
  MediaProvider: () => null,
}));
vi.mock("@vidstack/react/player/layouts/default", () => ({
  DefaultVideoLayout: () => null,
  defaultLayoutIcons: {},
}));

const lesson = {
  id: "lesson-1",
  primary_material_id: "material-1",
} as LessonPublic;

describe("LessonVideoPlayer", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("renders the signed stream in an interactive media player", () => {
    useStreamUrl.mockReturnValue({
      isLoading: false,
      data: {
        url: "https://media.example/video.mp4",
        material_version_id: "v1",
      },
    });

    render(
      <LessonVideoPlayer
        lesson={lesson}
        courseId="course-1"
        containerRef={createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId("media-player")).toHaveAttribute(
      "data-src",
      "https://media.example/video.mp4",
    );
    expect(useStreamUrl).toHaveBeenCalledWith("material-1");
    expect(useLessonEngagementTracker).toHaveBeenCalledWith({
      materialVersionId: "v1",
      lessonId: "lesson-1",
      courseId: "course-1",
    });
  });

  it("shows a clear unavailable state when no stream can be resolved", () => {
    useStreamUrl.mockReturnValue({ isLoading: false, data: undefined });

    render(
      <LessonVideoPlayer
        lesson={lesson}
        courseId="course-1"
        containerRef={createRef<HTMLDivElement>()}
      />,
    );

    expect(
      screen.getByText("This video is not available right now."),
    ).toBeVisible();
  });
});
