import { describe, expect, it, vi } from "vitest";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import { fetchBoundaryOperationGeometry } from "./boundaryOriginalSource";

const original: PolygonalGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1.1, 0.5],
      [1, 1],
      [0, 0],
    ],
  ],
};

describe("boundary original source", () => {
  it("실제 적용은 원본을 검증하고 취소된 응답은 적용하지 않는다", async () => {
    const source = {
      scope: "test",
      getCachedGeometry: () => undefined,
      fetchGeometry: vi.fn().mockResolvedValue(original),
    };
    const controller = new AbortController();
    expect(
      await fetchBoundaryOperationGeometry(source, "a", controller.signal),
    ).toEqual(original);
    controller.abort();
    await expect(
      fetchBoundaryOperationGeometry(source, "a", controller.signal),
    ).rejects.toThrow();
    source.fetchGeometry.mockResolvedValue({ type: "Polygon", coordinates: [] });
    await expect(
      fetchBoundaryOperationGeometry(source, "a", new AbortController().signal),
    ).rejects.toThrow("좌표");
  });
});
