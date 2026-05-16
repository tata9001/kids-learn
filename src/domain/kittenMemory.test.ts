import { describe, expect, it } from "vitest";
import { createDefaultState } from "./defaultState";
import {
  addKittenMemoryCandidates,
  approveKittenMemoryCandidate,
  clearKittenMemories,
  deleteKittenMemory,
  rejectKittenMemoryCandidate,
  updateChildCompanionProfile
} from "./kittenMemory";

describe("kitten memory", () => {
  it("updates child companion profile without losing study state", () => {
    const state = createDefaultState();
    const next = updateChildCompanionProfile(state, {
      nickname: "小雨",
      gradeBand: "lower-primary",
      preferredAddress: "小雨",
      encouragementStyle: "先鼓励再给一步"
    });

    expect(next.tasks).toBe(state.tasks);
    expect(next.childCompanionProfile).toMatchObject({
      nickname: "小雨",
      gradeBand: "lower-primary",
      preferredAddress: "小雨",
      encouragementStyle: "先鼓励再给一步"
    });
  });

  it("adds safe pending memory candidates and filters sensitive candidates", () => {
    const next = addKittenMemoryCandidates(
      createDefaultState(),
      [
        { kind: "learning", text: "小雨做数学口算时容易着急，先圈关键词会更稳。", confidence: 0.84 },
        { kind: "profile", text: "小雨的电话是 13800138000。", confidence: 0.9 }
      ],
      "2026-05-15T09:00:00+08:00"
    );

    expect(next.pendingKittenMemoryCandidates).toHaveLength(1);
    expect(next.pendingKittenMemoryCandidates[0]).toMatchObject({
      kind: "learning",
      status: "pending-parent",
      text: "小雨做数学口算时容易着急，先圈关键词会更稳。"
    });
  });

  it("truncates memory text to 80 Unicode characters", () => {
    const longText = Array.from({ length: 90 }, (_, index) => (index % 2 === 0 ? "猫" : "花")).join("");
    const next = addKittenMemoryCandidates(
      createDefaultState(),
      [{ kind: "preference", text: longText, confidence: 0.8 }],
      "2026-05-15T09:00:00+08:00"
    );

    expect(Array.from(next.pendingKittenMemoryCandidates[0].text)).toHaveLength(80);
    expect(next.pendingKittenMemoryCandidates[0].text).toBe(Array.from(longText).slice(0, 80).join(""));
  });

  it("clamps memory candidate confidence into the 0 to 1 range", () => {
    const next = addKittenMemoryCandidates(
      createDefaultState(),
      [
        { kind: "learning", text: "小雨看到应用题会先画线。", confidence: -0.5 },
        { kind: "emotion", text: "小雨听到肯定后会更愿意继续。", confidence: 1.5 },
        { kind: "profile", text: "小雨喜欢先做简单题热身。", confidence: Number.NaN }
      ],
      "2026-05-15T09:00:00+08:00"
    );

    expect(next.pendingKittenMemoryCandidates.map((candidate) => candidate.confidence)).toEqual([0, 1, 0]);
  });

  it("keeps only the last 20 pending memory candidates", () => {
    const candidates = Array.from({ length: 25 }, (_, index) => ({
      kind: "learning" as const,
      text: `小雨第 ${index + 1} 条学习观察。`,
      confidence: 0.75
    }));

    const next = addKittenMemoryCandidates(createDefaultState(), candidates, "2026-05-15T09:00:00+08:00");

    expect(next.pendingKittenMemoryCandidates).toHaveLength(20);
    expect(next.pendingKittenMemoryCandidates[0].text).toBe("小雨第 6 条学习观察。");
    expect(next.pendingKittenMemoryCandidates.at(-1)?.text).toBe("小雨第 25 条学习观察。");
  });

  it("keeps only the last 30 approved memories", () => {
    let state = createDefaultState();

    for (let index = 1; index <= 35; index += 1) {
      state = addKittenMemoryCandidates(
        state,
        [{ kind: "learning", text: `小雨第 ${index} 条已确认观察。`, confidence: 0.8 }],
        "2026-05-15T09:00:00+08:00"
      );
      const candidateId = state.pendingKittenMemoryCandidates[0].id;
      state = approveKittenMemoryCandidate(
        state,
        candidateId,
        `小雨第 ${index} 条已确认观察。`,
        "2026-05-15T09:05:00+08:00"
      );
    }

    expect(state.approvedKittenMemories).toHaveLength(30);
    expect(state.approvedKittenMemories[0].text).toBe("小雨第 6 条已确认观察。");
    expect(state.approvedKittenMemories.at(-1)?.text).toBe("小雨第 35 条已确认观察。");
  });

  it("filters the full sensitive memory term list and 11-digit phone numbers", () => {
    const sensitiveTexts = [
      "小雨的电话需要记下来。",
      "小雨的手机号需要记下来。",
      "小雨的住址需要记下来。",
      "小雨的地址需要记下来。",
      "小雨的身份证需要记下来。",
      "小雨的学校全名需要记下来。",
      "小雨的医院需要记下来。",
      "小雨的诊断需要记下来。",
      "小雨说不要告诉别人这件事。",
      "小雨的号码是 13800138000。"
    ];

    const next = addKittenMemoryCandidates(
      createDefaultState(),
      sensitiveTexts.map((text) => ({ kind: "profile" as const, text, confidence: 0.9 })),
      "2026-05-15T09:00:00+08:00"
    );

    expect(next.pendingKittenMemoryCandidates).toHaveLength(0);
  });

  it("lets parents approve, reject, delete, and clear memories", () => {
    const withCandidates = addKittenMemoryCandidates(
      createDefaultState(),
      [{ kind: "preference", text: "小雨喜欢粉色蝴蝶结。", confidence: 0.82 }],
      "2026-05-15T09:00:00+08:00"
    );
    const candidateId = withCandidates.pendingKittenMemoryCandidates[0].id;
    const approved = approveKittenMemoryCandidate(
      withCandidates,
      candidateId,
      "小雨喜欢粉色蝴蝶结。",
      "2026-05-15T09:05:00+08:00"
    );

    expect(approved.pendingKittenMemoryCandidates).toHaveLength(0);
    expect(approved.approvedKittenMemories).toHaveLength(1);

    const deleted = deleteKittenMemory(approved, approved.approvedKittenMemories[0].id);
    expect(deleted.approvedKittenMemories).toHaveLength(0);

    const rejected = rejectKittenMemoryCandidate(withCandidates, candidateId);
    expect(rejected.pendingKittenMemoryCandidates).toHaveLength(0);

    const cleared = clearKittenMemories(approved);
    expect(cleared.approvedKittenMemories).toHaveLength(0);
    expect(cleared.pendingKittenMemoryCandidates).toHaveLength(0);
  });

  it("keeps pending candidates when parent approval text is empty or sensitive", () => {
    const withEmptyCandidate = addKittenMemoryCandidates(
      createDefaultState(),
      [{ kind: "learning", text: "小雨做口算前先深呼吸会更稳。", confidence: 0.82 }],
      "2026-05-15T09:00:00+08:00"
    );
    const emptyCandidateId = withEmptyCandidate.pendingKittenMemoryCandidates[0].id;

    const emptyApproval = approveKittenMemoryCandidate(
      withEmptyCandidate,
      emptyCandidateId,
      "   ",
      "2026-05-15T09:05:00+08:00"
    );

    expect(emptyApproval.pendingKittenMemoryCandidates).toEqual(withEmptyCandidate.pendingKittenMemoryCandidates);
    expect(emptyApproval.approvedKittenMemories).toHaveLength(0);

    const withSensitiveCandidate = addKittenMemoryCandidates(
      createDefaultState(),
      [{ kind: "profile", text: "小雨喜欢先做简单题热身。", confidence: 0.82 }],
      "2026-05-15T09:00:00+08:00"
    );
    const sensitiveCandidateId = withSensitiveCandidate.pendingKittenMemoryCandidates[0].id;

    const sensitiveApproval = approveKittenMemoryCandidate(
      withSensitiveCandidate,
      sensitiveCandidateId,
      "小雨电话是 13800138000",
      "2026-05-15T09:05:00+08:00"
    );

    expect(sensitiveApproval.pendingKittenMemoryCandidates).toEqual(withSensitiveCandidate.pendingKittenMemoryCandidates);
    expect(sensitiveApproval.approvedKittenMemories).toHaveLength(0);
  });
});
