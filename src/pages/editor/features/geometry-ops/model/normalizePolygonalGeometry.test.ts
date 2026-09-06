import { describe, expect, it } from "vitest";
import type {
  EditorCoordinate,
  PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import { normalizePolygonalGeometry } from "./normalizePolygonalGeometry";

const outer: EditorCoordinate[] = [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 0],
];
const collapsed: EditorCoordinate[] = [
  [1, 0.5],
  [1, 0.5],
  [1.1, 0.6],
  [1, 0.5],
];
const tinyHole: EditorCoordinate[] = [
  [1, 0.5],
  [1, 0.500000001],
  [1.000000001, 0.5],
  [1, 0.5],
];

describe("normalizePolygonalGeometry", () => {
  it("면을 만들 수 없는 내부 ring만 제거하고 입력을 변경하지 않는다", () => {
    const input: PolygonalGeometry = {
      type: "Polygon",
      coordinates: [outer, collapsed, tinyHole],
    };
    const before = structuredClone(input);
    expect(normalizePolygonalGeometry(input)).toEqual({
      type: "Polygon",
      coordinates: [outer, tinyHole],
    });
    expect(input).toEqual(before);
  });

  it("MultiPolygon의 작은 섬, 구멍, 좌표 순서와 타입을 보존한다", () => {
    const input: PolygonalGeometry = {
      type: "MultiPolygon",
      coordinates: [[outer, collapsed, tinyHole], [tinyHole]],
    };
    expect(normalizePolygonalGeometry(input)).toEqual({
      type: "MultiPolygon",
      coordinates: [[outer, tinyHole], [tinyHole]],
    });
  });

  it("열린 정상 ring을 닫되 좌표를 스냅하거나 단순화하지 않는다", () => {
    expect(
      normalizePolygonalGeometry({
        type: "Polygon",
        coordinates: [outer.slice(0, -1)],
      }),
    ).toEqual({ type: "Polygon", coordinates: [outer] });
  });

  it.each<PolygonalGeometry>([
    { type: "Polygon", coordinates: [] },
    { type: "MultiPolygon", coordinates: [] },
    { type: "Polygon", coordinates: [collapsed] },
    { type: "MultiPolygon", coordinates: [[outer], [collapsed]] },
  ])("무효 외곽선이나 빈 geometry를 조용히 삭제하지 않고 실패한다: %j", (input) => {
    expect(normalizePolygonalGeometry(input)).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 181])(
    "잘못된 내부 좌표도 자동 삭제로 숨기지 않는다: %s",
    (x) => {
      expect(
        normalizePolygonalGeometry({
          type: "Polygon",
          coordinates: [
            outer,
            [
              [x, 0],
              [x, 0],
            ],
          ],
        }),
      ).toBeNull();
    },
  );
});
