import { beforeEach, describe, expect, it } from "vitest";
import {
  BoundaryKind,
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type DeepReadonly,
  type EditorPolygonInputGeometry,
  type EditorScene,
  type GeoJsonGeometry,
} from "../types/editorTypes";
import { HISTORY_LIMIT, useEditorStore } from "./editorStore";

describe("editorStore - 경계 종류", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
  });

  it("기본 경계 종류는 행정동이다", () => {
    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.AdminDong);
  });

  it("setActiveBoundaryKind로 경계 종류를 바꾼다", () => {
    useEditorStore.getState().setActiveBoundaryKind(BoundaryKind.PostalCode);

    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.PostalCode);
  });

  it("resetScene은 경계 종류를 기본값으로 되돌린다", () => {
    useEditorStore.getState().setActiveBoundaryKind(BoundaryKind.LegalDong);
    useEditorStore.getState().resetScene();

    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.AdminDong);
  });
});

describe("editorStore - 그리기 도형", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
  });

  it("기본 그리기 도형은 폴리곤이다", () => {
    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Polygon);
  });

  it("setActiveDrawShape로 도형을 바꾼다", () => {
    useEditorStore.getState().setActiveDrawShape(GeometryKind.Point);

    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Point);
  });

  it("resetScene은 그리기 도형을 기본값으로 되돌린다", () => {
    useEditorStore.getState().setActiveDrawShape(GeometryKind.Path);
    useEditorStore.getState().resetScene();

    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Polygon);
  });
});

function polygon(coordinates: [number, number][][]): GeoJsonGeometry {
  return { type: "Polygon", coordinates };
}

const GEOMETRY_A = polygon([
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ],
]);
const GEOMETRY_B = polygon([
  [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 0],
  ],
]);

function sampleScene(geometry: GeoJsonGeometry): EditorScene {
  return {
    version: 1,
    layers: [
      {
        id: "layer-1",
        name: "레이어",
        roles: [LayerRole.Editable],
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
        features: [
          {
            id: "feature-1",
            name: "도형",
            geometryKind: GeometryKind.Polygon,
            feature: {
              type: "Feature",
              id: "feature-1",
              geometry,
              properties: {},
            },
            state: {
              selection: SelectionState.None,
              lifecycle: FeatureLifecycle.Clean,
              validation: ValidationState.Valid,
              issues: [],
            },
          },
        ],
      },
    ],
  };
}

function currentGeometry(): DeepReadonly<GeoJsonGeometry> | undefined {
  return useEditorStore.getState().scene?.layers[0]?.features[0]?.feature.geometry;
}

describe("editorStore - 편집 히스토리", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleScene(GEOMETRY_A));
  });

  it("씬을 로드하면 히스토리가 비어 있고 dirty가 아니다", () => {
    const state = useEditorStore.getState();

    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.dirty).toBe(false);
  });

  it("geometry 편집은 past에 스냅샷을 쌓고 dirty가 된다", () => {
    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_B);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(0);
    expect(state.dirty).toBe(true);
    expect(currentGeometry()).toEqual(GEOMETRY_B);
  });

  it("undo는 이전 geometry로 되돌리고 baseline까지 가면 dirty가 해제된다", () => {
    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_B);
    useEditorStore.getState().undo();

    const state = useEditorStore.getState();
    expect(currentGeometry()).toEqual(GEOMETRY_A);
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(1);
    expect(state.dirty).toBe(false);
  });

  it("redo는 되돌린 편집을 다시 적용한다", () => {
    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_B);
    useEditorStore.getState().undo();
    useEditorStore.getState().redo();

    const state = useEditorStore.getState();
    expect(currentGeometry()).toEqual(GEOMETRY_B);
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(0);
  });

  it("가시성 변경은 히스토리에 쌓이지 않는다(silent)", () => {
    useEditorStore.getState().updateLayerView("layer-1", {
      visibility: VisibilityState.Hidden,
    });

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });

  it("undo 후 새 편집은 future(다시하기)를 비운다", () => {
    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_B);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().future).toHaveLength(1);

    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_B);
    expect(useEditorStore.getState().future).toHaveLength(0);
  });

  it("존재하지 않는 feature 편집은 히스토리에 쌓이지 않는다", () => {
    useEditorStore.getState().updateFeatureGeometry("ghost", GEOMETRY_B);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.dirty).toBe(false);
  });

  it("동일 geometry 편집은 히스토리에 쌓이지 않는다", () => {
    useEditorStore.getState().updateFeatureGeometry("feature-1", GEOMETRY_A);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.dirty).toBe(false);
  });

  it("동일 값 가시성 설정은 dirty를 만들지 않는다", () => {
    useEditorStore.getState().updateLayerView("layer-1", {
      visibility: VisibilityState.Visible,
    });

    expect(useEditorStore.getState().dirty).toBe(false);
  });

  it("뷰가 없는 도형에 기본 가시성을 설정해도 dirty가 되지 않는다", () => {
    // 샘플 도형은 view가 없으므로 기본값(visible)과 같은 설정은 변화가 없어야 한다.
    useEditorStore.getState().updateFeatureView("feature-1", {
      visibility: VisibilityState.Visible,
    });

    expect(useEditorStore.getState().dirty).toBe(false);
  });

  it("HISTORY_LIMIT를 초과하면 가장 오래된 스냅샷을 버린다", () => {
    for (let size = 1; size <= HISTORY_LIMIT + 5; size += 1) {
      useEditorStore.getState().updateFeatureGeometry(
        "feature-1",
        polygon([
          [
            [0, 0],
            [size, 0],
            [size, size],
            [0, 0],
          ],
        ]),
      );
    }

    expect(useEditorStore.getState().past).toHaveLength(HISTORY_LIMIT);
  });

  // reconcileSelection(사라진 피처 선택 정리)은 delete/create 액션(#11·#12)이 생기면 테스트를 추가한다.
});

describe("editorStore - 도형 추가(붙여넣기)", () => {
  // 붙여넣기는 폴리곤 입력을 받는다. 테스트 helper의 GEOMETRY_B(Polygon)를 입력 도형으로 쓴다.
  const inputGeometry = GEOMETRY_B as EditorPolygonInputGeometry;

  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleScene(GEOMETRY_A));
  });

  it("새 도형을 추가하고 past 스냅샷을 쌓으며 dirty가 된다", () => {
    useEditorStore.getState().addFeatures([{ geometry: inputGeometry }]);

    const state = useEditorStore.getState();
    expect(state.scene?.layers).toHaveLength(2);
    expect(state.past).toHaveLength(1);
    expect(state.dirty).toBe(true);
  });

  it("추가된 도형을 곧바로 선택 상태로 만든다", () => {
    useEditorStore.getState().addFeatures([{ geometry: inputGeometry }]);

    const state = useEditorStore.getState();
    const addedId = state.scene?.layers[1]?.features[0]?.id;
    expect(state.selectedFeatureIds).toEqual([addedId]);
  });

  it("추가된 도형은 Created lifecycle이다", () => {
    useEditorStore.getState().addFeatures([{ geometry: inputGeometry }]);

    const added = useEditorStore.getState().scene?.layers[1]?.features[0];
    expect(added?.state.lifecycle).toBe(FeatureLifecycle.Created);
  });

  it("undo 한 번이면 추가가 함께 취소된다", () => {
    useEditorStore.getState().addFeatures([{ geometry: inputGeometry }]);
    useEditorStore.getState().undo();

    const state = useEditorStore.getState();
    expect(state.scene?.layers).toHaveLength(1);
    expect(state.dirty).toBe(false);
  });

  it("빈 입력은 아무것도 바꾸지 않는다(no-op)", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().addFeatures([]);

    expect(useEditorStore.getState().scene).toBe(before);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });
});

describe("editorStore - 스냅샷 불변성(타입)", () => {
  it("scene 스냅샷과 히스토리 스택 타입은 readonly다(컴파일 타임 잠금)", () => {
    type Store = ReturnType<typeof useEditorStore.getState>;
    type SceneSnapshot = NonNullable<Store["scene"]>;

    // 두 타입이 정확히 같은지(readonly 수식자까지) 구분하는 표준 트릭.
    type Equals<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;
    // 특정 키가 readonly인지 검출한다. readonly 객체 속성은 mutable에도 assignable이라
    // `extends`만으로는 못 잠그므로 키 단위로 검출한다.
    type IsReadonlyKey<T, K extends keyof T> = Equals<Pick<T, K>, Readonly<Pick<T, K>>>;

    // scene의 스칼라 속성이 readonly여야 한다. mutable로 되돌리면 false가 되어 아래 대입이 실패한다.
    type AssertSceneReadonly =
      IsReadonlyKey<SceneSnapshot, "version"> extends true
        ? true
        : "scene 속성이 mutable로 노출됨";
    // past/future 배열 컨테이너도 readonly여야 스택을 외부에서 훼손할 수 없다(ReadonlyArray는 강제됨).
    type AssertPastReadonly = readonly DeepReadonly<EditorScene>[] extends Store["past"]
      ? true
      : "past가 mutable 배열로 노출됨";
    type AssertFutureReadonly =
      readonly DeepReadonly<EditorScene>[] extends Store["future"]
        ? true
        : "future가 mutable 배열로 노출됨";

    const assertScene: AssertSceneReadonly = true;
    const assertPast: AssertPastReadonly = true;
    const assertFuture: AssertFutureReadonly = true;

    expect([assertScene, assertPast, assertFuture]).toEqual([true, true, true]);
  });
});

describe("editorStore - 도형 포커스 요청", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
  });

  it("요청마다 번호가 증가해 같은 도형 연속 요청도 구분된다", () => {
    useEditorStore.getState().requestFeatureFocus("a");
    const first = useEditorStore.getState().featureFocusRequest;
    useEditorStore.getState().requestFeatureFocus("a");
    const second = useEditorStore.getState().featureFocusRequest;

    expect(first).toMatchObject({ featureId: "a", requestId: 1 });
    expect(second).toMatchObject({ featureId: "a", requestId: 2 });
  });

  it("resetScene은 포커스 요청을 비운다", () => {
    useEditorStore.getState().requestFeatureFocus("a");
    useEditorStore.getState().resetScene();

    expect(useEditorStore.getState().featureFocusRequest).toBeNull();
  });

  it("처리한 요청 번호를 소비하면 요청이 비워진다", () => {
    useEditorStore.getState().requestFeatureFocus("a");
    const request = useEditorStore.getState().featureFocusRequest;

    useEditorStore.getState().consumeFeatureFocusRequest(request?.requestId ?? 0);

    expect(useEditorStore.getState().featureFocusRequest).toBeNull();
  });

  it("처리 중 새 요청이 들어왔으면 이전 번호 소비는 무시된다", () => {
    useEditorStore.getState().requestFeatureFocus("a");
    const stale = useEditorStore.getState().featureFocusRequest;
    useEditorStore.getState().requestFeatureFocus("b");

    useEditorStore.getState().consumeFeatureFocusRequest(stale?.requestId ?? 0);

    expect(useEditorStore.getState().featureFocusRequest).toMatchObject({
      featureId: "b",
    });
  });
});

describe("editorStore - 도형 잠금 토글", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleScene(GEOMETRY_A));
  });

  it("잠그면 권한과 역할이 읽기 전용·참고로 함께 바뀐다", () => {
    useEditorStore.getState().setLayerLocked("layer-1", true);

    const layer = useEditorStore.getState().scene?.layers[0];
    expect(layer?.behavior.lock).toBe(LockState.Locked);
    expect(layer?.behavior.editability).toBe(EditabilityState.Readonly);
    expect(layer?.behavior.deletable).toBe(false);
    expect(layer?.roles).toEqual([LayerRole.Reference]);
  });

  it("해제하면 편집 가능 권한·역할로 되돌아간다", () => {
    useEditorStore.getState().setLayerLocked("layer-1", true);
    useEditorStore.getState().setLayerLocked("layer-1", false);

    const layer = useEditorStore.getState().scene?.layers[0];
    expect(layer?.behavior.lock).toBe(LockState.Unlocked);
    expect(layer?.behavior.editability).toBe(EditabilityState.Editable);
    expect(layer?.roles).toEqual([LayerRole.Editable]);
  });

  it("같은 상태로의 토글은 아무것도 바꾸지 않는다", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().setLayerLocked("layer-1", false);

    expect(useEditorStore.getState().scene).toBe(before);
  });

  it("잠금 토글은 히스토리에 쌓이지 않는다(silent)", () => {
    const pastBefore = useEditorStore.getState().past.length;
    useEditorStore.getState().setLayerLocked("layer-1", true);

    expect(useEditorStore.getState().past.length).toBe(pastBefore);
  });

  it("선택 상태는 잠금 토글에 영향받지 않는다", () => {
    useEditorStore.getState().setSelectedFeatureIds(["feature-1"]);
    useEditorStore.getState().setLayerLocked("layer-1", true);

    expect(useEditorStore.getState().selectedFeatureIds).toEqual(["feature-1"]);
  });
});

// 1레이어 = 1도형 평탄 스택: 두 레이어 각각에 도형 하나씩 둔 씬.
function sampleTwoFeatureScene(): EditorScene {
  const baseLayer = sampleScene(GEOMETRY_A).layers[0];
  return {
    version: 1,
    layers: [
      baseLayer,
      {
        ...baseLayer,
        id: "layer-2",
        name: "레이어 2",
        view: { ...baseLayer.view, zIndex: 20 },
        features: [
          {
            ...baseLayer.features[0],
            id: "feature-2",
            name: "도형 2",
            feature: {
              ...baseLayer.features[0].feature,
              id: "feature-2",
              geometry: GEOMETRY_A,
            },
          },
        ],
      },
    ],
  };
}

function geometryOf(featureId: string): DeepReadonly<GeoJsonGeometry> | undefined {
  const scene = useEditorStore.getState().scene;
  for (const layer of scene?.layers ?? []) {
    for (const feature of layer.features) {
      if (feature.id === featureId) {
        return feature.feature.geometry;
      }
    }
  }
  return undefined;
}

describe("editorStore - 다중 이동 배치 커밋", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleTwoFeatureScene());
  });

  it("여러 피처를 한 스냅샷(=undo 1단계)으로 묶어 커밋한다", () => {
    useEditorStore.getState().updateFeaturesGeometry([
      { featureId: "feature-1", geometry: GEOMETRY_B },
      { featureId: "feature-2", geometry: GEOMETRY_B },
    ]);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.dirty).toBe(true);
    expect(geometryOf("feature-1")).toEqual(GEOMETRY_B);
    expect(geometryOf("feature-2")).toEqual(GEOMETRY_B);
  });

  it("undo 한 번이면 묶인 피처가 모두 함께 복원된다", () => {
    useEditorStore.getState().updateFeaturesGeometry([
      { featureId: "feature-1", geometry: GEOMETRY_B },
      { featureId: "feature-2", geometry: GEOMETRY_B },
    ]);
    useEditorStore.getState().undo();

    expect(geometryOf("feature-1")).toEqual(GEOMETRY_A);
    expect(geometryOf("feature-2")).toEqual(GEOMETRY_A);
    expect(useEditorStore.getState().past).toHaveLength(0);
    expect(useEditorStore.getState().dirty).toBe(false);
  });

  it("실제로 바뀐 피처가 없으면 히스토리·dirty를 만들지 않는다", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().updateFeaturesGeometry([
      { featureId: "feature-1", geometry: GEOMETRY_A },
      { featureId: "feature-2", geometry: GEOMETRY_A },
    ]);

    const state = useEditorStore.getState();
    expect(state.scene).toBe(before);
    expect(state.past).toHaveLength(0);
    expect(state.dirty).toBe(false);
  });

  it("일부만 실제로 바뀌어도 한 스냅샷으로 쌓인다", () => {
    useEditorStore.getState().updateFeaturesGeometry([
      { featureId: "feature-1", geometry: GEOMETRY_B },
      { featureId: "feature-2", geometry: GEOMETRY_A },
    ]);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(geometryOf("feature-1")).toEqual(GEOMETRY_B);
    expect(geometryOf("feature-2")).toEqual(GEOMETRY_A);
  });

  it("빈 묶음은 아무것도 바꾸지 않는다(no-op)", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().updateFeaturesGeometry([]);

    expect(useEditorStore.getState().scene).toBe(before);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });
});

describe("editorStore - 쌓임 값 일괄 갱신", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleScene(GEOMETRY_A));
  });

  it("여러 레이어의 쌓임 값을 한 번에 바꾼다", () => {
    useEditorStore.getState().updateLayerZIndexes([{ layerId: "layer-1", zIndex: 70 }]);

    expect(useEditorStore.getState().scene?.layers[0]?.view.zIndex).toBe(70);
  });

  it("같은 값이면 아무것도 바꾸지 않는다", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().updateLayerZIndexes([{ layerId: "layer-1", zIndex: 10 }]);

    expect(useEditorStore.getState().scene).toBe(before);
  });

  it("쌓임 값 갱신은 히스토리에 쌓이지 않는다(silent)", () => {
    const pastBefore = useEditorStore.getState().past.length;
    useEditorStore.getState().updateLayerZIndexes([{ layerId: "layer-1", zIndex: 70 }]);

    expect(useEditorStore.getState().past.length).toBe(pastBefore);
  });
});

const MULTI_POLYGON: GeoJsonGeometry = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
    [
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 5],
      ],
    ],
  ],
};

function layerIds(): string[] {
  return useEditorStore.getState().scene?.layers.map((layer) => layer.id) ?? [];
}

function geometryKindOf(featureId: string): string | undefined {
  for (const layer of useEditorStore.getState().scene?.layers ?? []) {
    for (const feature of layer.features) {
      if (feature.id === featureId) {
        return feature.geometryKind;
      }
    }
  }
  return undefined;
}

describe("editorStore - 병합/제거", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
    useEditorStore.getState().setScene(sampleTwoFeatureScene());
  });

  it("병합은 target을 결과로 바꾸고 other 피처/레이어를 제거한다(undo 1단계)", () => {
    useEditorStore.getState().mergeFeatures("feature-1", "feature-2", GEOMETRY_B);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.dirty).toBe(true);
    expect(layerIds()).toEqual(["layer-1"]); // other(layer-2) 드롭
    expect(geometryOf("feature-1")).toEqual(GEOMETRY_B);
    expect(geometryOf("feature-2")).toBeUndefined();
  });

  it("병합 결과가 MultiPolygon이면 geometryKind와 layer.geometryKinds가 함께 갱신된다", () => {
    useEditorStore.getState().mergeFeatures("feature-1", "feature-2", MULTI_POLYGON);

    expect(geometryKindOf("feature-1")).toBe("multiPolygon");
    expect(useEditorStore.getState().scene?.layers[0]?.geometryKinds).toEqual([
      "multiPolygon",
    ]);
  });

  it("병합 후 undo 한 번이면 other 피처와 레이어가 함께 복원된다", () => {
    useEditorStore.getState().mergeFeatures("feature-1", "feature-2", GEOMETRY_B);
    useEditorStore.getState().undo();

    expect(layerIds()).toEqual(["layer-1", "layer-2"]);
    expect(geometryOf("feature-1")).toEqual(GEOMETRY_A);
    expect(geometryOf("feature-2")).toEqual(GEOMETRY_A);
  });

  it("선택된 other가 병합으로 사라지면 선택에서 정리된다", () => {
    useEditorStore.getState().setSelectedFeatureIds(["feature-1", "feature-2"]);
    useEditorStore.getState().mergeFeatures("feature-1", "feature-2", GEOMETRY_B);

    expect(useEditorStore.getState().selectedFeatureIds).toEqual(["feature-1"]);
  });

  it("target/other 중 하나라도 없으면 아무것도 바꾸지 않는다(no-op)", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().mergeFeatures("feature-1", "ghost", GEOMETRY_B);

    expect(useEditorStore.getState().scene).toBe(before);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });

  it("제거는 결과 geometry로 target을 교체한다(cutter는 store가 모름, undo 1단계)", () => {
    useEditorStore.getState().subtractFeature("feature-1", GEOMETRY_B);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(geometryOf("feature-1")).toEqual(GEOMETRY_B);
    expect(layerIds()).toEqual(["layer-1", "layer-2"]); // 레이어 보존
  });

  it("제거 결과가 비면(null) target 피처와 레이어가 삭제되고 선택이 정리된다", () => {
    useEditorStore.getState().setSelectedFeatureIds(["feature-1"]);
    useEditorStore.getState().subtractFeature("feature-1", null);

    const state = useEditorStore.getState();
    expect(state.past).toHaveLength(1);
    expect(layerIds()).toEqual(["layer-2"]);
    expect(geometryOf("feature-1")).toBeUndefined();
    expect(state.selectedFeatureIds).toEqual([]);
  });

  it("없는 target 제거는 아무것도 바꾸지 않는다(no-op)", () => {
    const before = useEditorStore.getState().scene;
    useEditorStore.getState().subtractFeature("ghost", GEOMETRY_B);

    expect(useEditorStore.getState().scene).toBe(before);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });

  it("제거 결과가 기존 geometry와 같으면 히스토리를 만들지 않는다(겹침 없는 difference 등)", () => {
    const before = useEditorStore.getState().scene;
    // feature-1은 GEOMETRY_A. 같은 값으로 호출하면 실제 변화가 없어 no-op이어야 한다.
    useEditorStore.getState().subtractFeature("feature-1", GEOMETRY_A);

    expect(useEditorStore.getState().scene).toBe(before);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });
});
