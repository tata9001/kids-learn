import type { DailyReview } from "../domain/types";

export function ReviewPanel({ review }: { review: DailyReview }) {
  return (
    <section className="reviewPanel">
      <h2>今日复盘</h2>
      <div className="reviewGrid">
        <div>
          <strong>{review.completedTaskIds.length}</strong>
          <span>完成任务</span>
        </div>
        <div>
          <strong>{review.focusMinutes}</strong>
          <span>专注分钟</span>
        </div>
        <div>
          <strong>{review.restCount}</strong>
          <span>休息次数</span>
        </div>
        <div>
          <strong>{review.pendingConfirmationIds.length}</strong>
          <span>待确认</span>
        </div>
      </div>
      <p className="suggestion">{review.communicationSuggestion}</p>
    </section>
  );
}
