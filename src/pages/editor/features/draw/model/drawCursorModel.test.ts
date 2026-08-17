import { describe, expect, it } from "vitest";
import { GeometryKind, type DrawShape } from "@/pages/editor/types/editorTypes";
import { resolveDrawCursor } from "./drawCursorModel";

describe("resolveDrawCursor", () => {
  const cases = [
    [GeometryKind.Polygon, "5 5"],
    [GeometryKind.Path, "5 5"],
    [GeometryKind.Point, "10 23"],
  ] as const satisfies ReadonlyArray<readonly [DrawShape, string]>;

  it.each(cases)("%s에 도구별 커서와 hotspot을 제공한다", (shape, hotspot) => {
    const cursor = resolveDrawCursor(shape);

    expect(cursor).toContain("data:image/svg+xml");
    expect(cursor).toContain(hotspot);
    expect(cursor).toMatch(/, crosshair$/);
  });

  it("폴리곤·패스·마커가 서로 다른 커서를 사용한다", () => {
    expect(new Set(cases.map(([shape]) => resolveDrawCursor(shape))).size).toBe(
      cases.length,
    );
  });
});
