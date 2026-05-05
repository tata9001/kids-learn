import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { StudyProvider } from "./state/useStudyStore";
import { createDefaultState } from "./domain/defaultState";
import { STORAGE_KEY } from "./storage/localStore";

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

it("lets parents configure tasks, confirm completion, and reset data", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.clear(screen.getByLabelText("任务名称"));
  await user.type(screen.getByLabelText("任务名称"), "阅读");
  await user.selectOptions(screen.getByLabelText("任务类型"), "reading");
  await user.click(screen.getByLabelText("不需要家长确认"));
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  expect(screen.getByRole("heading", { name: "阅读" })).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("专注时长"), "10");
  expect(screen.getAllByText("10 分钟").length).toBeGreaterThan(0);

  expect(screen.getByRole("button", { name: "导出数据" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "清空数据" })).toBeInTheDocument();
});

it("lets parents edit and delete not-started tasks", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.type(screen.getByLabelText("任务名称"), "阅读");
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  await user.click(screen.getByRole("button", { name: "编辑 阅读" }));
  await user.clear(screen.getByLabelText("编辑任务名称"));
  await user.type(screen.getByLabelText("编辑任务名称"), "新阅读");
  await user.click(screen.getByRole("button", { name: "保存任务" }));

  expect(screen.getByRole("heading", { name: "新阅读" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "删除 新阅读" }));
  expect(screen.queryByRole("heading", { name: "新阅读" })).not.toBeInTheDocument();
});

it("lets children add completion details and parents confirm with a comment", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.type(screen.getByLabelText("任务名称"), "阅读");
  await user.selectOptions(screen.getByLabelText("任务类型"), "reading");
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  await user.click(screen.getByRole("button", { name: "回到首页" }));
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "完成 阅读" }));
  await user.type(screen.getByLabelText("完成说明"), "读完第一章");
  await user.selectOptions(screen.getByLabelText("困难程度"), "a-little");
  await user.type(screen.getByLabelText("实际阅读分钟"), "18");
  await user.type(screen.getByLabelText("书名"), "小猫数学");
  await user.click(screen.getByRole("button", { name: "提交完成" }));

  await user.click(screen.getByRole("button", { name: "回到首页" }));
  await user.click(screen.getByRole("button", { name: "家长模式" }));
  expect(screen.getByText("读完第一章")).toBeInTheDocument();
  expect(screen.getByText("18 分钟 · 小猫数学")).toBeInTheDocument();

  await user.type(screen.getByLabelText("确认评语 阅读"), "很认真");
  await user.click(screen.getByRole("button", { name: "确认 阅读" }));
  expect(screen.getByText("很认真")).toBeInTheDocument();
});

it("generates matching weekly recurring tasks and shows pet progress", async () => {
  const state = createDefaultState(new Date("2026-05-01T08:00:00+08:00"));
  const currentWeekday = new Date().getDay();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      recurringTaskTemplates: {
        "template-1": {
          id: "template-1",
          name: "周六整理",
          type: "organization",
          estimatedFocusBlocks: 1,
          completionStandard: "整理书桌",
          requiresConfirmation: false,
          recurrence: "weekly",
          weekdays: [currentWeekday],
          paused: false,
          createdAt: "2026-05-01T08:00:00+08:00",
          generatedDateKeys: []
        }
      }
    })
  );
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));

  expect(screen.getByRole("heading", { name: "周六整理" })).toBeInTheDocument();
  expect(screen.getByText(/经验 0\/40/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "完成 周六整理" }));
  await user.click(screen.getByRole("button", { name: "提交完成" }));
  expect(screen.getByText(/经验 20\/40/)).toBeInTheDocument();
  expect(screen.getByText(/完成一个任务/)).toBeInTheDocument();
});

it("shows a kitten gallery with growth stages and stat meanings", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "查看小猫图鉴" }));

  expect(screen.getByRole("heading", { name: "小猫图鉴" })).toBeInTheDocument();
  expect(screen.getByText("奶糖小猫")).toBeInTheDocument();
  expect(screen.getByText("铃铛小猫")).toBeInTheDocument();
  expect(screen.getByText("云朵小猫")).toBeInTheDocument();
  expect(screen.getByText("星星小猫")).toBeInTheDocument();
  expect(screen.getByText("冠军小猫")).toBeInTheDocument();
  expect(screen.getAllByText(/等级 \d+/)).toHaveLength(14);
  expect(screen.getByText("能量")).toBeInTheDocument();
  expect(screen.getByText("经验")).toBeInTheDocument();
  expect(screen.getByText("连续")).toBeInTheDocument();
  expect(screen.getByText("小鱼干")).toBeInTheDocument();
  expect(screen.getByText("收藏")).toBeInTheDocument();
});

it("opens a fullscreen kitten interaction panel from the kitten", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));

  expect(screen.getByRole("dialog", { name: "小猫互动" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "摸摸小猫" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "喂小鱼干" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "陪它玩一会儿" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "摸摸小猫" }));

  expect(screen.getAllByText(/喵/).length).toBeGreaterThan(0);
});

it("lets children buy and wear kitten decorations in the interaction panel", async () => {
  const state = createDefaultState();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      pet: {
        ...state.pet,
        careItems: 3
      }
    })
  );
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));

  expect(screen.getByRole("heading", { name: "装饰小猫" })).toBeInTheDocument();
  expect(screen.getByText("粉色蝴蝶结")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "兑换 粉色蝴蝶结，2 小鱼干" }));

  expect(screen.getByText(/已穿上/)).toBeInTheDocument();
  expect(screen.getAllByText(/小鱼干 1/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/粉色蝴蝶结/).length).toBeGreaterThan(0);
});
