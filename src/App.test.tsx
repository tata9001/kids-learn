import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { StudyProvider } from "./state/useStudyStore";
import { createDefaultState } from "./domain/defaultState";
import { STORAGE_KEY } from "./storage/localStore";

class MockSpeechSynthesisUtterance {
  lang = "";
  pitch = 1;
  rate = 1;
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;

  constructor(text: string) {
    this.text = text;
  }
}

function renderApp() {
  return render(
    <StudyProvider>
      <App />
    </StudyProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: undefined
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: undefined
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
  expect(screen.getByText("使用 AI 语音时，小猫声音由 AI 生成，不是真人声音。")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "摸摸小猫" }));

  expect(screen.getAllByText(/喵/).length).toBeGreaterThan(0);
});

it("lets children name the kitten and hear a local coach line", async () => {
  const user = userEvent.setup();
  const view = renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.clear(screen.getByLabelText("小猫名字"));
  await user.type(screen.getByLabelText("小猫名字"), "豆豆");
  await user.click(within(dialog).getByRole("button", { name: "保存小猫名字" }));

  expect(within(dialog).getByRole("heading", { name: "豆豆 · 奶糖小猫" })).toBeInTheDocument();
  expect(within(dialog).getByText(/以后我就叫豆豆/)).toBeInTheDocument();

  await user.click(within(dialog).getByRole("button", { name: "小猫说一句" }));
  expect(within(dialog).getByText(/豆豆想说/)).toBeInTheDocument();

  view.unmount();
  renderApp();
  expect(screen.getByRole("heading", { name: "豆豆 · 奶糖小猫" })).toBeInTheDocument();
});

it("speaks kitten lines with local browser voice when asked", async () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel, speak }
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: MockSpeechSynthesisUtterance
  });
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "小猫说一句" }));

  expect(cancel).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledTimes(1);
  expect(speak.mock.calls[0][0]).toMatchObject({
    text: "小奶糖想说：我们先做最小的一步，好不好？",
    lang: "zh-CN"
  });
});

it("lets children return the kitten to its default name", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.clear(screen.getByLabelText("小猫名字"));
  await user.type(screen.getByLabelText("小猫名字"), "豆豆");
  await user.click(within(dialog).getByRole("button", { name: "保存小猫名字" }));
  await user.click(within(dialog).getByRole("button", { name: "恢复默认名字" }));

  expect(within(dialog).getByRole("heading", { name: "小奶糖 · 奶糖小猫" })).toBeInTheDocument();
  expect(within(dialog).getByText(/回到小奶糖这个名字/)).toBeInTheDocument();
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

  await user.click(screen.getByRole("button", { name: "取下当前装饰" }));

  expect(screen.getAllByText(/未穿戴/).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "穿上 粉色蝴蝶结" })).toBeInTheDocument();
});

it("lets children use 学习陪伴 prompts in the kitten panel", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });

  expect(within(dialog).getByRole("heading", { name: "学习陪伴" })).toBeInTheDocument();

  await user.click(within(dialog).getByRole("button", { name: "我卡住了" }));
  expect(within(dialog).getByText(/先圈出题目/)).toBeInTheDocument();

  await user.type(within(dialog).getByLabelText("想和小猫说什么"), "我不想写");
  await user.click(within(dialog).getByRole("button", { name: "告诉小猫" }));

  expect(within(dialog).getByText(/作业本打开/)).toBeInTheDocument();
});

it("uses AI companion replies for kitten study chat when configured", async () => {
  vi.stubEnv("VITE_KITTEN_VOICE_API_URL", "https://voice.example.com/kitten-speech");
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/kitten-chat")) {
      return new Response(
        JSON.stringify({
          text: "我听见你有点烦，也真的卡住了。先圈出关键词，我陪你看第一步。",
          emotion: "coach",
          nextAction: "圈出关键词",
          shouldAskAdult: false,
          source: "ai"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(new Blob(["mp3"], { type: "audio/mpeg" }), { headers: { "Content-Type": "audio/mpeg" } });
  });
  vi.stubGlobal("fetch", fetcher);
  const play = vi.fn(async () => undefined);
  vi.stubGlobal(
    "Audio",
    class {
      play = play;
    }
  );
  URL.createObjectURL = vi.fn(() => "blob:kitten-voice");
  URL.revokeObjectURL = vi.fn();
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.type(within(dialog).getByLabelText("想和小猫说什么"), "我不会这道题，我有点烦");
  await user.click(within(dialog).getByRole("button", { name: "告诉小猫" }));

  expect(await within(dialog).findByText(/我听见你有点烦/)).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledWith("https://voice.example.com/kitten-chat", expect.any(Object));
  expect(fetcher).toHaveBeenCalledWith("https://voice.example.com/kitten-speech", expect.any(Object));
});

it("keeps text input usable when microphone permission is denied", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => Promise.reject(new DOMException("denied", "NotAllowedError"))) }
  });
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.click(within(dialog).getByRole("button", { name: "和小猫说话" }));

  expect(await within(dialog).findByText("麦克风没有打开，也可以打字告诉小猫。")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("想和小猫说什么")).toBeInTheDocument();
});

it("transcribes voice, gets an AI reply, stores memory candidates, and speaks", async () => {
  vi.stubEnv("VITE_KITTEN_VOICE_API_URL", "https://voice.example.com/kitten-speech");
  const stopTrack = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream)) }
  });
  class MockMediaRecorder {
    state: "inactive" | "recording" = "inactive";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["voice".repeat(80)], { type: "audio/webm" }) } as BlobEvent);
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/kitten-transcribe")) {
      return new Response(JSON.stringify({ text: "我不会这道题，我有点烦" }), { headers: { "Content-Type": "application/json" } });
    }
    if (String(input).endsWith("/kitten-chat")) {
      return new Response(
        JSON.stringify({
          text: "小雨，我听见你有点烦了。我们先圈出关键词。",
          emotion: "care",
          nextAction: "圈出关键词",
          shouldAskAdult: false,
          memoryCandidates: [{ kind: "learning", text: "小雨做题烦时适合先圈关键词。", confidence: 0.8 }],
          source: "ai"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(new Blob(["mp3"], { type: "audio/mpeg" }), { headers: { "Content-Type": "audio/mpeg" } });
  });
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn(async () => undefined);
    }
  );
  URL.createObjectURL = vi.fn(() => "blob:kitten-voice");
  URL.revokeObjectURL = vi.fn();

  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.click(within(dialog).getByRole("button", { name: "和小猫说话" }));
  await user.click(await within(dialog).findByRole("button", { name: "说完了" }));

  expect(await within(dialog).findByText(/你刚才说：我不会这道题/)).toBeInTheDocument();
  expect(await within(dialog).findByText(/小雨，我听见你有点烦/)).toBeInTheDocument();
  expect(await within(dialog).findByText("小猫想记住 1 条新发现")).toBeInTheDocument();
  expect(stopTrack).toHaveBeenCalled();
});

it("lets parents approve and delete kitten memories", async () => {
  const state = createDefaultState();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      pendingKittenMemoryCandidates: [
        {
          id: "candidate-1",
          kind: "learning",
          text: "小雨数学口算容易烦。",
          confidence: 0.82,
          createdAt: "2026-05-16T08:00:00+08:00",
          status: "pending-parent"
        }
      ],
      approvedKittenMemories: [
        {
          id: "memory-1",
          kind: "preference",
          text: "小雨喜欢粉色小猫装饰。",
          createdAt: "2026-05-15T08:00:00+08:00",
          approvedAt: "2026-05-15T08:05:00+08:00",
          source: "parent"
        }
      ]
    })
  );
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  expect(screen.getByRole("heading", { name: "小猫记忆" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "确认 小雨数学口算容易烦。" }));
  expect(screen.getByText("已确认记忆")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "删除 小雨数学口算容易烦。" }));
  expect(screen.queryByText("小雨数学口算容易烦。")).not.toBeInTheDocument();
});
