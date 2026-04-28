import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StudyProvider, useStudyStore } from "./useStudyStore";

function Probe() {
  const { state, actions } = useStudyStore();
  return (
    <div>
      <p>{state.mode}</p>
      <p>{Object.keys(state.tasks).length}</p>
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
});
