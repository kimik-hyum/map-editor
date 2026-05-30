import { describe, expect, it } from "vitest";
import {
  createLayerPanelViewModel,
  getNextFeatureVisibility,
  getNextLayerVisibility,
} from "./layerPanelModel";
import { editorDefaultTheme } from "../../../theme/editorTheme";
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
} from "../../../types/editorTypes";

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

function createLayer(overrides: Partial<EditorLayer> = {}): EditorLayer {
  const features = overrides.features ?? [createFeature()];

  return {
    id: "layer",
    name: "layer",
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
    features,
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
  it("레이어를 zIndex 높은 순서로 시각화한다", () => {
    const scene = createScene([
      createLayer({
        id: "bottom",
        name: "아래",
        view: {
          visibility: VisibilityState.Visible,
          opacity: 1,
          zIndex: 10,
          labelVisible: true,
        },
      }),
      createLayer({
        id: "top",
        name: "위",
        view: {
          visibility: VisibilityState.Visible,
          opacity: 1,
          zIndex: 40,
          labelVisible: true,
        },
      }),
    ]);

    const viewModel = createLayerPanelViewModel(scene, "top");

    expect(viewModel.layers.map((layer) => layer.id)).toEqual(["top", "bottom"]);
    expect(viewModel.layers[0]).toMatchObject({
      isActive: true,
      orderLabel: "#1",
    });
  });

  it("레이어 역할과 도형 종류 라벨을 공통 enum 라벨로 표시한다", () => {
    const feature = createFeature({
      id: "path-feature",
      name: "주행 경로",
      geometryKind: GeometryKind.Path,
    });
    const layer = createLayer({
      id: "reference-layer",
      roles: [LayerRole.Reference],
      features: [feature],
    });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0].roleLabels).toEqual(["참고"]);
    expect(viewModel.layers[0].features[0]).toMatchObject({
      name: "주행 경로",
      geometryKindLabel: "패스",
      isVisible: true,
      visibility: VisibilityState.Visible,
    });
  });

  it("도형별 visibility를 표시한다", () => {
    const feature = createFeature({
      view: {
        visibility: VisibilityState.Hidden,
      },
    });
    const layer = createLayer({ features: [feature] });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0].features[0]).toMatchObject({
      isVisible: false,
      visibility: VisibilityState.Hidden,
    });
  });

  it("상위 레이어가 숨김이면 하위 도형도 유효 숨김 + 토글 비활성으로 표시한다", () => {
    const feature = createFeature(); // 도형 자체는 Visible
    const layer = createLayer({
      view: {
        visibility: VisibilityState.Hidden,
        opacity: 1,
        zIndex: 10,
        labelVisible: true,
      },
      features: [feature],
    });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0].features[0]).toMatchObject({
      visibility: VisibilityState.Visible, // 도형 자체 상태는 보존
      isVisible: false, // 레이어 숨김 → 유효 숨김
      isToggleDisabled: true,
    });
  });

  it("도형 이름이 없으면 GeoJSON label 속성을 이름으로 사용한다", () => {
    const feature = createFeature({
      name: undefined,
      feature: {
        type: "Feature",
        id: "geojson-id",
        geometry: {
          type: "Polygon",
          coordinates: [],
        },
        properties: {
          label: "속성 이름",
        },
      },
    });
    const layer = createLayer({ features: [feature] });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0].features[0].name).toBe("속성 이름");
  });

  it("패널 점 색상은 지도와 같은 style resolver 결과를 사용한다", () => {
    const warningFeature = createFeature({
      state: {
        selection: SelectionState.None,
        lifecycle: FeatureLifecycle.Clean,
        validation: ValidationState.Warning,
        issues: [],
      },
    });
    const layer = createLayer({
      roles: [LayerRole.Background],
      features: [warningFeature],
    });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0].features[0].accentColor).toBe(
      editorDefaultTheme.polygon.warning.strokeColor,
    );
  });

  it("dimmed 레이어 opacity는 지도와 같은 effective opacity로 표시한다", () => {
    const layer = createLayer({
      view: {
        visibility: VisibilityState.Dimmed,
        opacity: 1,
        zIndex: 10,
        labelVisible: true,
      },
    });

    const viewModel = createLayerPanelViewModel(createScene([layer]), null);

    expect(viewModel.layers[0]).toMatchObject({
      isDimmed: true,
      opacity: 0.5,
      visibility: VisibilityState.Dimmed,
    });
  });

  it("눈 아이콘 토글은 보이는 도형을 숨긴다", () => {
    expect(getNextFeatureVisibility(VisibilityState.Visible)).toBe(
      VisibilityState.Hidden,
    );
    expect(getNextFeatureVisibility(VisibilityState.Dimmed)).toBe(
      VisibilityState.Hidden,
    );
  });

  it("눈 아이콘 토글은 숨긴 도형을 다시 표시한다", () => {
    expect(getNextFeatureVisibility(VisibilityState.Hidden)).toBe(
      VisibilityState.Visible,
    );
  });
});

describe("getNextLayerVisibility", () => {
  it("보이는(또는 흐린) 레이어를 숨긴다", () => {
    expect(getNextLayerVisibility(VisibilityState.Visible)).toBe(
      VisibilityState.Hidden,
    );
    expect(getNextLayerVisibility(VisibilityState.Dimmed)).toBe(VisibilityState.Hidden);
  });

  it("숨긴 레이어를 다시 표시한다", () => {
    expect(getNextLayerVisibility(VisibilityState.Hidden)).toBe(
      VisibilityState.Visible,
    );
  });
});
