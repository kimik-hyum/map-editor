import { describe, expect, it } from "vitest";
import { resolveHistoryShortcut } from "./historyShortcuts";

// 텍스트 입력 가드(input/textarea)는 런타임/e2e에서 확인합니다. 여기서는 키 조합 해석만 검증합니다.
const base = {
  key: "z",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  target: null,
};

describe("resolveHistoryShortcut", () => {
  it("Cmd/Ctrl+Z는 undo로 해석한다", () => {
    expect(resolveHistoryShortcut({ ...base, metaKey: true })).toBe("undo");
    expect(resolveHistoryShortcut({ ...base, ctrlKey: true })).toBe("undo");
  });

  it("Cmd/Ctrl+Shift+Z는 redo로 해석한다", () => {
    expect(resolveHistoryShortcut({ ...base, metaKey: true, shiftKey: true })).toBe(
      "redo",
    );
  });

  it("Ctrl+Y는 redo로 해석한다", () => {
    expect(resolveHistoryShortcut({ ...base, key: "y", ctrlKey: true })).toBe("redo");
  });

  it("수식 키가 없으면 무시한다", () => {
    expect(resolveHistoryShortcut({ ...base })).toBeNull();
  });

  it("다른 키는 무시한다", () => {
    expect(resolveHistoryShortcut({ ...base, key: "a", metaKey: true })).toBeNull();
  });
});
