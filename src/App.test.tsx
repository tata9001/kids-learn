import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { StudyProvider } from "./state/useStudyStore";

function renderApp() {
  return render(
    <StudyProvider>
      <App />
    </StudyProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("App shell", () => {
  it("lets users enter child and parent modes", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "孩子模式" }));
    expect(screen.getByText("今日任务")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "回到首页" }));
    await user.click(screen.getByRole("button", { name: "家长模式" }));
    expect(screen.getByText("今日计划")).toBeInTheDocument();
  });
});

it("lets a child start focus, use stuck help, and complete a task", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.type(screen.getByLabelText("任务名称"), "语文练习");
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  await user.click(screen.getByRole("button", { name: "回到首页" }));
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "开始 语文练习" }));

  expect(screen.getByText("专注中")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "我卡住了" }));
  expect(screen.getByText("先做 5 分钟")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "完成本轮专注" }));
  expect(screen.getByText("今日任务")).toBeInTheDocument();
});
