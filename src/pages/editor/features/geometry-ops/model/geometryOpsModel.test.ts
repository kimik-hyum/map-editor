import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorFeature,
  type EditorLayer,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import {
  buildGeometryOpMarkerInputs,
  deriveGeometryOpTargets,
} from "./geometryOpsModel";

function square(x0: number, y0: number, x1: number, y1: number): PolygonalGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

const PATH: GeoJsonGeometry = {
  type: "LineString",
  coordinates: [
    [0, 0],
    [1, 1],
  ],
};

function feature(id: string, geometry: GeoJsonGeometry): EditorFeature {
  return {
    id,
    name: id,
    geometryKind:
      geometry.type === "LineString" ? GeometryKind.Path : GeometryKind.Polygon,
    feature: { type: "Feature", id, geometry },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
  };
}

function layer(
  id: string,
  features: EditorFeature[],
  overrides: Partial<EditorLayer> = {},
): EditorLayer {
  return {
    id,
    name: id,
    roles: [],
    geometryKinds: [GeometryKind.Polygon],
    view: {
      visibility: VisibilityState.Visible,
      opacity: 1,
      zIndex: 10,
      labelVisible: true,
    },
    behavior: {
      lock: LockState.Unlocked,
      editability: EditabilityState.Editable,
      selectable: true,
      deletable: true,
      draggable: true,
    },
    features,
    ...overrides,
  };
}

// 1레이어 = 1도형 평탄 스택으로 씬을 구성합니다.
function scene(layers: EditorLayer[]): EditorScene {
  return { version: 1, layers };
}

const LOCKED_OVERRIDE: Partial<EditorLayer> = {
  behavior: {
    lock: LockState.Locked,
    editability: EditabilityState.Readonly,
    selectable: true,
    deletable: false,
    draggable: false,
  },
};

const HIDDEN_OVERRIDE: Partial<EditorLayer> = {
  view: {
    visibility: VisibilityState.Hidden,
    opacity: 1,
    zIndex: 10,
    labelVisible: true,
  },
};

describe("deriveGeometryOpTargets", () => {
  it("폴리곤 1개 선택: 다른 폴리곤은 병합 후보, 겹치는 것만 제거 후보", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]), // a와 겹침
      layer("layer-c", [feature("c", square(10, 10, 12, 12))]), // a와 떨어짐
    ]);

    const result = deriveGeometryOpTargets(s, new Set(["a"]));
    expect(result.targetId).toBe("a");
    expect(result.mergeCandidateIds.sort()).toEqual(["b", "c"]); // 떨어진 것도 병합 후보
    expect(result.subtractCandidateIds).toEqual(["b"]); // 겹치는 것만 제거 후보
  });

  it("선택이 2개 이상이면 비어 있다(단일 선택 기반 기능)", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]),
    ]);
    expect(deriveGeometryOpTargets(s, new Set(["a", "b"])).targetId).toBeNull();
  });

  it("target이 폴리곤이 아니면(path) 비어 있다", () => {
    const s = scene([
      layer("layer-a", [feature("a", PATH)]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]),
    ]);
    expect(deriveGeometryOpTargets(s, new Set(["a"])).targetId).toBeNull();
  });

  it("잠긴/숨긴/비폴리곤 도형은 후보에서 제외된다", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-locked", [feature("locked", square(1, 1, 3, 3))], LOCKED_OVERRIDE),
      layer("layer-hidden", [feature("hidden", square(1, 1, 3, 3))], HIDDEN_OVERRIDE),
      layer("layer-path", [feature("path", PATH)]),
      layer("layer-d", [feature("d", square(1, 1, 3, 3))]), // 겹치는 유효 후보
    ]);

    const result = deriveGeometryOpTargets(s, new Set(["a"]));
    expect(result.mergeCandidateIds).toEqual(["d"]);
    expect(result.subtractCandidateIds).toEqual(["d"]);
  });

  it("scene에 없는 id를 선택하면 비어 있다", () => {
    const s = scene([layer("layer-a", [feature("a", square(0, 0, 2, 2))])]);
    expect(deriveGeometryOpTargets(s, new Set(["missing"])).targetId).toBeNull();
  });

  it("visibleFeatureIds(화면 안 집합)를 주면 그 밖의 후보는 제외된다", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]), // a와 겹침(화면 안)
      layer("layer-c", [feature("c", square(1, 1, 3, 3))]), // a와 겹침이지만 화면 밖
    ]);
    // a, b만 화면 안 → c는 겹쳐도 후보에서 빠진다.
    const result = deriveGeometryOpTargets(s, new Set(["a"]), new Set(["a", "b"]));
    expect(result.mergeCandidateIds).toEqual(["b"]);
    expect(result.subtractCandidateIds).toEqual(["b"]);
  });

  it("visibleFeatureIds 생략 시 viewport 제한 없이 전체에서 후보를 찾는다", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]),
    ]);
    expect(deriveGeometryOpTargets(s, new Set(["a"])).mergeCandidateIds).toEqual(["b"]);
  });

  it("도형별 숨김(feature.view=Hidden)은 후보에서 제외된다", () => {
    const hidden: EditorFeature = {
      ...feature("hidden", square(1, 1, 3, 3)),
      view: { visibility: VisibilityState.Hidden },
    };
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-hidden", [hidden]),
      layer("layer-d", [feature("d", square(1, 1, 3, 3))]),
    ]);
    const result = deriveGeometryOpTargets(s, new Set(["a"]));
    expect(result.mergeCandidateIds).toEqual(["d"]);
    expect(result.subtractCandidateIds).toEqual(["d"]);
  });

  it("선택한 target이 도형별 숨김이면 비어 있다", () => {
    const hiddenTarget: EditorFeature = {
      ...feature("a", square(0, 0, 2, 2)),
      view: { visibility: VisibilityState.Hidden },
    };
    const s = scene([
      layer("layer-a", [hiddenTarget]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]),
    ]);
    expect(deriveGeometryOpTargets(s, new Set(["a"])).targetId).toBeNull();
  });

  it("병합 후보가 없으면(다른 폴리곤 없음) 두 목록 모두 비어 있다", () => {
    const s = scene([layer("layer-a", [feature("a", square(0, 0, 2, 2))])]);
    const result = deriveGeometryOpTargets(s, new Set(["a"]));
    expect(result.targetId).toBe("a");
    expect(result.mergeCandidateIds).toEqual([]);
    expect(result.subtractCandidateIds).toEqual([]);
  });
});

describe("buildGeometryOpMarkerInputs", () => {
  it("후보마다 표시명과 겹침 여부를 담아 만든다", () => {
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-b", [feature("b", square(1, 1, 3, 3))]), // a와 겹침
      layer("layer-c", [feature("c", square(10, 10, 12, 12))]), // a와 떨어짐
    ]);
    const targets = deriveGeometryOpTargets(s, new Set(["a"]));
    const inputs = buildGeometryOpMarkerInputs(s, targets);

    expect(inputs.map((input) => input.featureId).sort()).toEqual(["b", "c"]);
    const byId = new Map(inputs.map((input) => [input.featureId, input]));
    expect(byId.get("b")?.canSubtract).toBe(true); // 겹침 → 제거 가능
    expect(byId.get("c")?.canSubtract).toBe(false); // 떨어짐 → 병합만
    expect(byId.get("b")?.name).toBe("b"); // 이름을 칩 윗행에 표시
  });

  it("이름 없는 후보는 id로 폴백해 식별자가 사라지지 않는다", () => {
    const nameless: EditorFeature = {
      ...feature("feature-4", square(1, 1, 3, 3)),
      name: undefined,
    };
    const s = scene([
      layer("layer-a", [feature("a", square(0, 0, 2, 2))]),
      layer("layer-4", [nameless]),
    ]);
    const targets = deriveGeometryOpTargets(s, new Set(["a"]));
    const inputs = buildGeometryOpMarkerInputs(s, targets);

    expect(inputs.find((input) => input.featureId === "feature-4")?.name).toBe(
      "feature-4",
    );
  });

  it("후보가 없으면 빈 배열이다", () => {
    const s = scene([layer("layer-a", [feature("a", square(0, 0, 2, 2))])]);
    const targets = deriveGeometryOpTargets(s, new Set(["a"]));
    expect(buildGeometryOpMarkerInputs(s, targets)).toEqual([]);
  });
});
