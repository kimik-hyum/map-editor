import { describe, expect, it } from "vitest";
import { createLayerPanelViewModel } from "./layerPanelModel";
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
  type EditorDocument,
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

function createDocument(layers: EditorLayer[]): EditorDocument {
  return {
    version: 1,
    layers,
  };
}

describe("createLayerPanelViewModel", () => {
  it("레이어를 zIndex 높은 순서로 시각화한다", () => {
    const document = createDocument([
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

    const viewModel = createLayerPanelViewModel(document, "top");

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
      roles: [LayerRole.Readonly, LayerRole.Reference],
      features: [feature],
    });

    const viewModel = createLayerPanelViewModel(createDocument([layer]), null);

    expect(viewModel.layers[0].roleLabels).toEqual(["읽기", "참고"]);
    expect(viewModel.layers[0].features[0]).toMatchObject({
      name: "주행 경로",
      geometryKindLabel: "패스",
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

    const viewModel = createLayerPanelViewModel(createDocument([layer]), null);

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

    const viewModel = createLayerPanelViewModel(createDocument([layer]), null);

    expect(viewModel.layers[0].features[0].accentColor).toBe(
      editorDefaultTheme.polygon.warning.strokeColor,
    );
  });
});
