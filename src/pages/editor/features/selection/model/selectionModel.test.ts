import { describe, expect, it } from "vitest";
import { getChangedSelectionIds } from "./selectionModel";

describe("getChangedSelectionIds", () => {
  it("선택 추가와 해제를 대칭차로 반환한다", () => {
    const previous = new Set(["a", "b"]);
    const next = new Set(["b", "c"]);

    expect(getChangedSelectionIds(previous, next)).toEqual(["a", "c"]);
  });

  it("선택 집합이 같으면 빈 배열을 반환한다", () => {
    const previous = new Set(["a", "b"]);
    const next = new Set(["a", "b"]);

    expect(getChangedSelectionIds(previous, next)).toEqual([]);
  });
});
