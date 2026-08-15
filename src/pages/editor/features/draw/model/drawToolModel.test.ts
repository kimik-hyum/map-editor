import { describe, expect, it } from "vitest";
import { GeometryKind } from "@/pages/editor/types/editorTypes";
import { resolveDrawHint, resolveDrawKeyboardIntent } from "./drawToolModel";

describe("resolveDrawHint", () => {
  it("도형과 스케치 상태에 맞는 완료 방법을 안내한다", () => {
    expect(resolveDrawHint(GeometryKind.Point, false)).toContain("마커");
    expect(resolveDrawHint(GeometryKind.Path, true)).toContain("Enter");
    expect(resolveDrawHint(GeometryKind.Polygon, true)).toContain("시작점");
  });
});

describe("resolveDrawKeyboardIntent", () => {
  const drawingPath = {
    shape: GeometryKind.Path,
    isDrawing: true,
    canFinish: true,
    confirmationOpen: false,
  } as const;

  it("진행 중인 스케치의 Escape는 취소 확인을 요청한다", () => {
    expect(resolveDrawKeyboardIntent({ ...drawingPath, key: "Escape" })).toBe("cancel");
  });

  it("완성 가능한 Path의 Enter만 즉시 완료한다", () => {
    expect(resolveDrawKeyboardIntent({ ...drawingPath, key: "Enter" })).toBe("finish");
    expect(
      resolveDrawKeyboardIntent({
        ...drawingPath,
        shape: GeometryKind.Polygon,
        key: "Enter",
      }),
    ).toBeNull();
    expect(
      resolveDrawKeyboardIntent({ ...drawingPath, canFinish: false, key: "Enter" }),
    ).toBeNull();
  });

  it("스케치가 없거나 확인 모달이 열려 있으면 동작하지 않는다", () => {
    expect(
      resolveDrawKeyboardIntent({ ...drawingPath, isDrawing: false, key: "Escape" }),
    ).toBeNull();
    expect(
      resolveDrawKeyboardIntent({
        ...drawingPath,
        confirmationOpen: true,
        key: "Escape",
      }),
    ).toBeNull();
  });
});
