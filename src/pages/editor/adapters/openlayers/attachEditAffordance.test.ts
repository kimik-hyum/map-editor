import { describe, expect, it } from "vitest";
import { EditAffordanceKind } from "@/pages/editor/types/editorTypes";
import { decideAffordance } from "./attachEditAffordance";

describe("decideAffordance", () => {
  it("정점이 허용오차 안이면 삭제", () => {
    expect(decideAffordance(5, 100, 10)).toBe(EditAffordanceKind.Delete);
  });

  it("정점은 멀고 외곽선이 가까우면 추가", () => {
    expect(decideAffordance(50, 5, 10)).toBe(EditAffordanceKind.Insert);
  });

  it("정점·외곽선이 모두 가까우면 정점(삭제) 우선", () => {
    expect(decideAffordance(8, 3, 10)).toBe(EditAffordanceKind.Delete);
  });

  it("둘 다 멀면 null", () => {
    expect(decideAffordance(50, 40, 10)).toBeNull();
  });
});
