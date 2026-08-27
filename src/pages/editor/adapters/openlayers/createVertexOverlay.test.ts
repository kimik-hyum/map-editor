import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  type EditorScene,
  type GeoJsonGeometry,
  LockState,
  VisibilityState,
} from "@/pages/editor/types/editorTypes";
import {
  buildProjectedVertices,
  decimateProjectedVertices,
  type ProjectedVertex,
  projectSelectedVertices,
} from "./createVertexOverlay";

// 테스트에서는 투영 없이 경위도를 그대로 x/y로 쓴다(순수 수학만 검증).
const identity = (lon: number, lat: number): [number, number] => [lon, lat];

describe("buildProjectedVertices", () => {
  it("닫힌 폴리곤 링은 중복 닫힘 좌표를 빼고, 첫 정점만 mandatory", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    } as GeoJsonGeometry;

    const result = buildProjectedVertices(geometry, identity);

    expect(result).toHaveLength(4);
    expect(result[0].mandatory).toBe(true);
    expect(result.slice(1).every((vertex) => !vertex.mandatory)).toBe(true);
    // 직각 코너라 모든 정점의 turnScore가 0보다 큼.
    expect(result.every((vertex) => vertex.turnScore > 0)).toBe(true);
  });

  it("라인은 양 끝점이 mandatory, 일직선 중간점은 turnScore 0", () => {
    const geometry = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [5, 0],
        [10, 0],
      ],
    } as GeoJsonGeometry;

    const result = buildProjectedVertices(geometry, identity);

    expect(result).toHaveLength(3);
    expect(result[0].mandatory).toBe(true);
    expect(result[2].mandatory).toBe(true);
    expect(result[1].mandatory).toBe(false);
    expect(result[1].turnScore).toBeCloseTo(0);
  });
});

function vertex(
  partial: Partial<ProjectedVertex> & { index: number },
): ProjectedVertex {
  return { x: 0, y: 0, mandatory: false, turnScore: 0, ...partial };
}

describe("decimateProjectedVertices", () => {
  it("같은 셀에서는 turnScore가 큰 정점을 대표로 남긴다", () => {
    const vertices = [
      vertex({ index: 1, x: 1, y: 1, turnScore: 0.2 }),
      vertex({ index: 2, x: 2, y: 2, turnScore: 0.9 }),
    ];
    const result = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(2);
  });

  it("필수점은 항상 유지하고, 같은 셀의 더 날카로운 비필수점도 함께 남긴다", () => {
    const vertices = [
      vertex({ index: 0, x: 1, y: 1, mandatory: true }),
      vertex({ index: 1, x: 2, y: 2, turnScore: 0.9 }),
    ];
    const result = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    // 코너 손실을 막기 위해 필수점(0)과 셀 대표(1)가 모두 남는다.
    expect(result.map((v) => v.index).sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it("줌아웃(아주 큰 셀)이어도 비지 않고 필수점이 포함된다", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, mandatory: true }),
      vertex({ index: 1, x: 10, y: 10, turnScore: 0.5 }),
      vertex({ index: 2, x: 20, y: 20, turnScore: 0.7 }),
    ];
    const result = decimateProjectedVertices(vertices, {
      cellSize: 1_000_000,
      maxCount: 100,
    });
    // 한 셀에 다 들어가도 필수점(0) + 셀 대표(최고 turnScore=2)가 남는다(빈 배열 아님).
    expect(result.map((v) => v.index).sort((a, b) => a - b)).toEqual([0, 2]);
  });

  it("상한을 넘으면 셀을 키워 더 솎는다", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, turnScore: 0.1 }),
      vertex({ index: 1, x: 100, y: 0, turnScore: 0.2 }),
      vertex({ index: 2, x: 0, y: 100, turnScore: 0.3 }),
      vertex({ index: 3, x: 100, y: 100, turnScore: 0.4 }),
    ];
    const all = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    expect(all).toHaveLength(4);

    const capped = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 1 });
    expect(capped).toHaveLength(1);
  });

  it("필수점이 상한보다 많으면 필수점은 그대로 둔다(못 줄임)", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, mandatory: true }),
      vertex({ index: 1, x: 100, y: 0, mandatory: true }),
      vertex({ index: 2, x: 0, y: 100, mandatory: true }),
    ];
    const result = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 1 });
    expect(result).toHaveLength(3);
  });

  it("cellSize가 유한하지 않거나 0 이하면 전체를 반환한다", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, turnScore: 0.5 }),
      vertex({ index: 1, x: 1, y: 1, turnScore: 0.5 }),
    ];
    expect(
      decimateProjectedVertices(vertices, { cellSize: 0, maxCount: 1 }),
    ).toHaveLength(2);
    expect(
      decimateProjectedVertices(vertices, { cellSize: Number.NaN, maxCount: 1 }),
    ).toHaveLength(2);
  });
});

function triangle(id: string, featureHidden = false) {
  return {
    id,
    feature: {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
    ...(featureHidden ? { view: { visibility: VisibilityState.Hidden } } : {}),
  };
}

describe("projectSelectedVertices", () => {
  const editableBehavior = {
    editability: EditabilityState.Editable,
    lock: LockState.Unlocked,
  };
  // 보이는 편집 레이어(선택 피처 + 미선택 피처), 숨긴 레이어, 보이는 레이어의 숨긴 피처,
  // 읽기 전용 레이어(선택돼도 핸들 제외).
  const scene = {
    layers: [
      {
        id: "visible",
        view: { visibility: VisibilityState.Visible },
        behavior: editableBehavior,
        features: [triangle("selected-visible"), triangle("not-selected")],
      },
      {
        id: "hidden-layer",
        view: { visibility: VisibilityState.Hidden },
        behavior: editableBehavior,
        features: [triangle("selected-in-hidden-layer")],
      },
      {
        id: "visible-2",
        view: { visibility: VisibilityState.Visible },
        behavior: editableBehavior,
        features: [triangle("selected-hidden-feature", true)],
      },
      {
        id: "readonly-layer",
        view: { visibility: VisibilityState.Visible },
        behavior: { editability: EditabilityState.Readonly, lock: LockState.Locked },
        features: [triangle("selected-readonly")],
      },
    ],
  } as unknown as EditorScene;

  it("선택 + 보이는 편집 레이어 + 보이는 피처만 정점을 만든다", () => {
    const selected = new Set([
      "selected-visible",
      "selected-in-hidden-layer",
      "selected-hidden-feature",
      "selected-readonly",
    ]);
    const result = projectSelectedVertices(scene, selected);
    // 삼각형(닫힘 좌표 제외) 3정점만: 나머지는 미선택/숨긴 레이어/숨긴 피처/읽기 전용 레이어로 제외.
    expect(result).toHaveLength(3);
  });

  it("읽기 전용 레이어의 피처는 선택돼도 핸들 정점을 만들지 않는다(하이라이트 전용)", () => {
    const result = projectSelectedVertices(scene, new Set(["selected-readonly"]));
    expect(result).toEqual([]);
  });

  it("선택이 없으면 빈 배열", () => {
    expect(projectSelectedVertices(scene, new Set())).toEqual([]);
  });
});
