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
