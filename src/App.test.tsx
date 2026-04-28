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

describe("App shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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
