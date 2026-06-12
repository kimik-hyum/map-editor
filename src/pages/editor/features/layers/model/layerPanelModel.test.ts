import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorScene,
  type EditorFeature,
  type EditorLayer,
} from "@/pages/editor/types/editorTypes";
import { createLayerPanelViewModel, getNextLayerVisibility } from "./layerPanelModel";

function createFeature(overrides: Partial<EditorFeature> = {}): EditorFeature {
  return {
    id: "feature",
    name: "feature",
    geometryKind: GeometryKind.Polygon,
    feature: {
      type: "Feature",
      id: "feature",
      geometry: {
        type: "Polygon",
        coordinates: [],
      },
      properties: {},
    },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
    ...overrides,
  };
}

// 1레이어 = 1도형 구조의 내부 레이어를 만듭니다.
function createFeatureLayer(
  overrides: Partial<EditorLayer> = {},
  feature: EditorFeature = createFeature(),
): EditorLayer {
  return {
    id: `layer-${feature.id}`,
    name: feature.name ?? feature.id,
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
    features: [feature],
    ...overrides,
  };
}

function createScene(layers: EditorLayer[]): EditorScene {
  return {
    version: 1,
    layers,
  };
}

describe("createLayerPanelViewModel", () => {
  it("쌓임 값 높은 순(위→아래)으로 행을 나열하고 순위 라벨을 붙인다", () => {
    const scene = createScene([
      createFeatureLayer(
        {
          view: {
            visibility: VisibilityState.Visible,
            opacity: 1,
            zIndex: 10,
            labelVisible: true,
          },
        },
        createFeature({ id: "bottom", name: "아래" }),
      ),
      createFeatureLayer(
        {
          view: {
            visibility: VisibilityState.Visible,
            opacity: 1,
            zIndex: 40,
            labelVisible: true,
          },
        },
        createFeature({ id: "top", name: "위" }),
      ),
    ]);

    const viewModel = createLayerPanelViewModel(scene);

    expect(viewModel.rows.map((row) => row.id)).toEqual(["top", "bottom"]);
    expect(viewModel.rows[0]).toMatchObject({
      name: "위",
      canMoveUp: false,
      canMoveDown: true,
    });
    expect(viewModel.featureCount).toBe(2);
  });

  it("런타임 선택(selectedFeatureIds)을 행 isSelected로 반영한다", () => {
    const scene = createScene([
      createFeatureLayer({}, createFeature({ id: "a" })),
      createFeatureLayer(
        {
          view: {
            visibility: VisibilityState.Visible,
            opacity: 1,
            zIndex: 20,
            labelVisible: true,
          },
        },
        createFeature({ id: "b" }),
      ),
    ]);

    const viewModel = createLayerPanelViewModel(scene, ["b"]);

    expect(viewModel.rows.map((row) => [row.id, row.isSelected])).toEqual([
      ["b", true],
      ["a", false],
    ]);
  });

  it("잠긴 레이어의 도형은 잠금 배지 상태를 가진다", () => {
    const scene = createScene([
      createFeatureLayer(
        {
          roles: [LayerRole.Reference],
          behavior: {
            lock: LockState.Locked,
            editability: EditabilityState.Readonly,
            selectable: true,
            deletable: false,
            draggable: false,
          },
        },
        createFeature({ id: "ref" }),
      ),
    ]);

    const viewModel = createLayerPanelViewModel(scene);

    expect(viewModel.rows[0].isLocked).toBe(true);
  });

  it("표시 상태를 행에 반영한다(숨김·흐림)", () => {
    const scene = createScene([
      createFeatureLayer(
        {
          view: {
            visibility: VisibilityState.Hidden,
            opacity: 1,
            zIndex: 10,
            labelVisible: true,
          },
        },
        createFeature({ id: "hidden" }),
      ),
      createFeatureLayer(
        {
          view: {
            visibility: VisibilityState.Dimmed,
            opacity: 1,
            zIndex: 20,
            labelVisible: true,
          },
        },
        createFeature({ id: "dimmed" }),
      ),
    ]);

    const viewModel = createLayerPanelViewModel(scene);
    const hidden = viewModel.rows.find((row) => row.id === "hidden");
    const dimmed = viewModel.rows.find((row) => row.id === "dimmed");

    expect(hidden).toMatchObject({ isVisible: false, isDimmed: false });
    expect(dimmed).toMatchObject({ isVisible: true, isDimmed: true });
  });

  it("이름이 없으면 라벨 속성, 그것도 없으면 id를 쓴다", () => {
    const labeled = createFeature({
      id: "labeled",
      name: undefined,
      feature: {
        type: "Feature",
        id: "labeled",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { label: "라벨" },
      },
    });
    const bare = createFeature({
      id: "bare",
      name: undefined,
      feature: {
        type: "Feature",
        id: "bare",
        geometry: { type: "Polygon", coordinates: [] },
        properties: {},
      },
    });
    const scene = createScene([
      createFeatureLayer({ name: "labeled" }, labeled),
      createFeatureLayer(
        {
          name: "bare",
          view: {
            visibility: VisibilityState.Visible,
            opacity: 1,
            zIndex: 20,
            labelVisible: true,
          },
        },
        bare,
      ),
    ]);

    const viewModel = createLayerPanelViewModel(scene);

    // bare가 더 높은 쌓임 값(20)이라 위에 온다.
    expect(viewModel.rows.map((row) => row.name)).toEqual(["bare", "라벨"]);
  });

  it("scene이 없으면 준비 안 됨 상태를 돌려준다", () => {
    const viewModel = createLayerPanelViewModel(null);
    expect(viewModel).toMatchObject({ isReady: false, isEmpty: true, rows: [] });
  });
});

describe("getNextLayerVisibility", () => {
  it("보이는(또는 흐린) 도형을 숨긴다", () => {
    expect(getNextLayerVisibility(VisibilityState.Visible)).toBe(
      VisibilityState.Hidden,
    );
    expect(getNextLayerVisibility(VisibilityState.Dimmed)).toBe(VisibilityState.Hidden);
  });

  it("숨긴 도형을 다시 표시한다", () => {
    expect(getNextLayerVisibility(VisibilityState.Hidden)).toBe(
      VisibilityState.Visible,
    );
  });
});
