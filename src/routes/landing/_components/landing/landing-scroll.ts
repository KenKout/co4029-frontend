import type { MouseEvent } from "react";

let activeScrollFrame: number | undefined;

export function scrollToLandingAnchor(event: MouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute("href");
  if (!href?.startsWith("#")) return;
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return;
  event.preventDefault();

  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const start = window.scrollY;
  const navOffset = 64;
  const destination = Math.max(
    0,
    target.getBoundingClientRect().top + start - navOffset,
  );
  const distance = destination - start;
  history.pushState(null, "", href);
  if (activeScrollFrame !== undefined) cancelAnimationFrame(activeScrollFrame);

  if (reduceMotion || Math.abs(distance) < 2) {
    window.scrollTo(0, destination);
    return;
  }

  const duration = Math.min(720, Math.max(420, Math.abs(distance) * 0.32));
  const startedAt = performance.now();
  const easeInOutCubic = (progress: number) =>
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const animate = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));
    if (progress < 1) activeScrollFrame = requestAnimationFrame(animate);
    else activeScrollFrame = undefined;
  };
  activeScrollFrame = requestAnimationFrame(animate);
}
