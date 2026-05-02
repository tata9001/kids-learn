import { CheckCircle2, Play } from "lucide-react";
import type { Task } from "../domain/types";

const TYPE_LABELS: Record<Task["type"], string> = {
  homework: "作业",
  reading: "阅读",
  handwriting: "练字",
  organization: "整理"
};

const STATUS_LABELS: Record<Task["status"], string> = {
  "not-started": "待开始",
  focusing: "专注中",
  "child-marked-complete": "已标记",
  "waiting-confirmation": "待确认",
  completed: "已完成",
  "needs-adjustment": "再调整",
  canceled: "已取消",
  archived: "已归档"
};

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onComplete?: () => void;
}

export function TaskCard({ task, onStart, onComplete }: TaskCardProps) {
  const canAct = task.status !== "completed" && task.status !== "waiting-confirmation" && task.status !== "canceled" && task.status !== "archived";
  const readingDetail =
    task.completionDetails?.actualReadingMinutes || task.completionDetails?.bookName
      ? `${task.completionDetails.actualReadingMinutes ?? 0} 分钟${task.completionDetails.bookName ? ` · ${task.completionDetails.bookName}` : ""}`
      : undefined;

  return (
    <article className="taskCard">
      <div>
        <p className="taskMeta">
          {TYPE_LABELS[task.type]} · {task.estimatedFocusBlocks} 个专注块
        </p>
        <h3>{task.name}</h3>
        <p>{task.completionStandard}</p>
        {task.recurringTemplateId && <p className="taskDetail">重复任务</p>}
        {task.completionDetails?.childNote && <p className="taskDetail">{task.completionDetails.childNote}</p>}
        {readingDetail && <p className="taskDetail">{readingDetail}</p>}
        {task.parentComment && <p className="taskDetail">{task.parentComment}</p>}
        <span className="statusPill">{STATUS_LABELS[task.status]}</span>
      </div>
      <div className="taskActions">
        {onStart && canAct && (
          <button className="iconButton" aria-label={`开始 ${task.name}`} onClick={onStart}>
            <Play aria-hidden="true" />
          </button>
        )}
        {onComplete && canAct && (
          <button className="iconButton" aria-label={`完成 ${task.name}`} onClick={onComplete}>
            <CheckCircle2 aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
