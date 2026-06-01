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
    // mutable로 되돌리면 단언 타입이 문자열이 되어 아래 대입이 타입 검사에서 실패한다.
    type AssertSceneReadonly =
      DeepReadonly<EditorScene> extends SceneSnapshot
        ? true
        : "scene 스냅샷이 mutable로 노출됨";
    // 요소뿐 아니라 past/future 배열 컨테이너도 readonly여야 스택을 외부에서 훼손할 수 없다.
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
