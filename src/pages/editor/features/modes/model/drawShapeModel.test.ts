import { describe, expect, it } from "vitest";
import { GeometryKind } from "@/pages/editor/types/editorTypes";
import { drawShapeOptions } from "./drawShapeModel";

describe("drawShapeOptions", () => {
  it("폴리곤·패스·마커 세 도형을 한 번씩 포함한다", () => {
    const ids = drawShapeOptions.map((option) => option.id);

    expect(ids.length).toBe(3);
    expect(new Set(ids)).toEqual(
      new Set([GeometryKind.Polygon, GeometryKind.Path, GeometryKind.Point]),
    );
  });

  it("각 도형은 라벨과 설명을 가진다", () => {
    for (const option of drawShapeOptions) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});
