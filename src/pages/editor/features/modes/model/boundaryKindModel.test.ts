import { describe, expect, it } from "vitest";
import { BoundaryKind, boundaryKindLabels } from "@/pages/editor/types/editorTypes";
import { boundaryKindOptions } from "./boundaryKindModel";

describe("boundaryKindOptions", () => {
  it("모든 BoundaryKind를 한 번씩 포함한다", () => {
    const ids = boundaryKindOptions.map((option) => option.id);

    expect(ids.length).toBe(Object.values(BoundaryKind).length);
    expect(new Set(ids)).toEqual(new Set(Object.values(BoundaryKind)));
  });

  it("라벨은 boundaryKindLabels를 단일 출처로 사용한다", () => {
    for (const option of boundaryKindOptions) {
      expect(option.label).toBe(boundaryKindLabels[option.id]);
    }
  });
});
