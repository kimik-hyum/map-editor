import { describe, expect, it } from "vitest";
import { GeometryKind } from "@/pages/editor/types/editorTypes";
import { resolveDrawHint } from "./drawToolModel";

describe("resolveDrawHint", () => {
  it("도형과 스케치 상태에 맞는 완료 방법을 안내한다", () => {
    expect(resolveDrawHint(GeometryKind.Point, false)).toContain("마커");
    expect(resolveDrawHint(GeometryKind.Path, true)).toContain("완료 버튼");
    expect(resolveDrawHint(GeometryKind.Polygon, true)).toContain("시작점");
  });
});
