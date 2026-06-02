import { describe, expect, it } from "vitest";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { collectVisibleVertexCoords } from "./createVertexOverlay";

// 순수 함수만 검증하므로 최소 형태의 scene을 구성해 캐스팅한다.
const scene = {
  layers: [
    {
      id: "layer-1",
      features: [
        {
          id: "poly1",
          feature: {
            geometry: {
              type: "Polygon",
              // 마지막 좌표는 시작과 동일(닫힌 링) → 핸들에서 제외되어야 한다.
              coordinates: [
                [
                  [0, 0],
                  [0, 2],
                  [2, 2],
                  [2, 0],
                  [0, 0],
                ],
              ],
            },
          },
        },
        {
          id: "pt1",
          feature: { geometry: { type: "Point", coordinates: [10, 10] } },
        },
      ],
    },
  ],
} as unknown as EditorScene;

const wideBox = {
  minZoom: 12,
  zoom: 14,
  lonLatExtent: [-1, -1, 11, 11] as [number, number, number, number],
};

describe("collectVisibleVertexCoords", () => {
  it("줌이 minZoom 미만이면 빈 배열(LOD)", () => {
    const result = collectVisibleVertexCoords(scene, new Set(["poly1"]), {
      ...wideBox,
      zoom: 10,
    });
    expect(result).toEqual([]);
  });

  it("선택된 폴리곤의 정점만(닫힌 링 중복 제외) 반환", () => {
    const result = collectVisibleVertexCoords(scene, new Set(["poly1"]), wideBox);
    expect(result).toEqual([
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ]);
  });

  it("선택되지 않은 피처는 제외", () => {
    const result = collectVisibleVertexCoords(scene, new Set(["pt1"]), wideBox);
    expect(result).toEqual([[10, 10]]);
  });

  it("화면 범위 밖 정점은 컬링", () => {
    const result = collectVisibleVertexCoords(scene, new Set(["poly1"]), {
      ...wideBox,
      // [0,0]만 포함하는 좁은 범위.
      lonLatExtent: [-1, -1, 1, 1],
    });
    expect(result).toEqual([[0, 0]]);
  });

  it("선택이 없으면 빈 배열", () => {
    const result = collectVisibleVertexCoords(scene, new Set(), wideBox);
    expect(result).toEqual([]);
  });
});
