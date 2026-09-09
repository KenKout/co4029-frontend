/**
 * Fallback copy for the start/resume dialog, extracted from
 * `StartInterviewDialog` to keep the component's branch count inside the
 * complexity cap. Kept in step with `course_interview.start_dialog` /
 * `resume_dialog` / `fullscreen.enter_and_*` in the locale files — these are
 * the values used when a translation is missing, so copy that drifts here
 * ships to whoever hits that path.
 */
export function resolveStartDialogCopy(
  isResume: boolean,
  isVietnamese: boolean,
): { title: string; description: string; cancel: string; confirm: string } {
  if (isVietnamese) {
    return {
      title: isResume ? "Tiếp tục lượt làm trước?" : "Bạn chắc chắn muốn bắt đầu?",
      description: isResume
        ? "Bạn sẽ vào toàn màn hình và quay lại lượt đang chạy. Nếu đồng hồ chấm điểm đã bắt đầu, nó vẫn tiếp tục chạy trong lúc bạn xác nhận."
        : "Bạn sẽ vào toàn màn hình. Sẽ có bước chuẩn bị trước — đồng hồ chấm điểm chỉ bắt đầu khi bạn xác nhận sẵn sàng.",
      cancel: "Quay lại",
      confirm: isResume
        ? "Vào toàn màn hình và tiếp tục"
        : "Vào toàn màn hình và bắt đầu",
    };
  }
  return {
    title: isResume ? "Resume your attempt?" : "Ready to start?",
    description: isResume
      ? "You will enter fullscreen and return to the running attempt. If the graded timer has started, it keeps running while you confirm."
      : "You will enter fullscreen first. Setup comes after — the graded timer starts only when you confirm you are ready.",
    cancel: "Back",
    confirm: isResume
      ? "Enter fullscreen and resume"
      : "Enter fullscreen and start",
  };
}
