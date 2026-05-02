import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StudyProvider, useStudyStore } from "./useStudyStore";

function Probe() {
  const { state, actions } = useStudyStore();
  const task = Object.values(state.tasks)[0];
  const template = Object.values(state.recurringTaskTemplates)[0];
  return (
    <div>
      <p>{state.mode}</p>
      <p>{Object.keys(state.tasks).length}</p>
      <p>{Object.keys(state.recurringTaskTemplates).length}</p>
      <p>{task?.name ?? "no-task"}</p>
      <p>{task?.status ?? "no-status"}</p>
      <p>{task?.completionDetails?.childNote ?? "no-note"}</p>
      <p>{task?.parentComment ?? "no-comment"}</p>
      <p>{template?.paused ? "paused" : "not-paused"}</p>
      <button onClick={() => actions.setMode("parent")}>家长</button>
      <button
        onClick={() =>
          actions.addTask({
            name: "阅读",
            type: "reading",
            estimatedFocusBlocks: 1,
            completionStandard: "读 15 分钟",
            requiresConfirmation: false
          })
        }
      >
        加任务
      </button>
      <button onClick={() => task && actions.updateTask(task.id, { name: "新阅读" })}>改任务</button>
      <button onClick={() => task && actions.markComplete(task.id, { childNote: "读完了" })}>完成任务</button>
      <button onClick={() => task && actions.confirm(task.id, "很认真")}>确认任务</button>
      <button onClick={() => task && actions.cancelTask(task.id)}>取消任务</button>
      <button onClick={() => task && actions.archiveTask(task.id)}>归档任务</button>
      <button onClick={() => task && actions.deleteTask(task.id)}>删任务</button>
      <button
        onClick={() =>
          actions.addRecurringTask({
            name: "每日练字",
            type: "handwriting",
            estimatedFocusBlocks: 1,
            completionStandard: "写一页",
            requiresConfirmation: true,
            recurrence: "daily"
          })
        }
      >
        加重复
      </button>
      <button onClick={() => template && actions.pauseRecurringTask(template.id)}>暂停重复</button>
    </div>
  );
}

describe("StudyProvider", () => {
  it("exposes state and actions", async () => {
    const user = userEvent.setup();
    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>
    );

    await user.click(screen.getByRole("button", { name: "家长" }));
    expect(screen.getByText("parent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加任务" }));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("exposes task management and recurrence actions", async () => {
    const user = userEvent.setup();
    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>
    );

    await user.click(screen.getByRole("button", { name: "加任务" }));
    await user.click(screen.getByRole("button", { name: "改任务" }));
    expect(screen.getByText("新阅读")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "完成任务" }));
    expect(screen.getByText("读完了")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加重复" }));
    expect(screen.getAllByText("1")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "暂停重复" }));
    expect(screen.getByText("paused")).toBeInTheDocument();
  });
});
