import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorCoordinate,
  type EditorDocument,
  type EditorFeature,
  type EditorLayer,
} from "../types/editorTypes";
import type { EditorPolygonThemeToken } from "../theme/editorTheme";

type SamplePolygonFixture = {
  id: string;
  name: string;
  center: EditorCoordinate;
  themeToken: EditorPolygonThemeToken;
  selection?: SelectionState;
  validation?: ValidationState;
};

function createPolygonCoordinates([longitude, latitude]: EditorCoordinate) {
  const width = 0.007;
  const height = 0.005;

  return [
    [
      [longitude - width, latitude + height],
      [longitude + width * 0.85, latitude + height * 0.75],
      [longitude + width, latitude - height * 0.2],
      [longitude + width * 0.1, latitude - height],
      [longitude - width, latitude - height * 0.45],
      [longitude - width, latitude + height],
    ] satisfies EditorCoordinate[],
  ];
}

function createPolygonFeature(sample: SamplePolygonFixture): EditorFeature {
  return {
    id: sample.id,
    name: sample.name,
    geometryKind: GeometryKind.Polygon,
    feature: {
      type: "Feature",
      id: sample.id,
      geometry: {
        type: "Polygon",
        coordinates: createPolygonCoordinates(sample.center),
      },
      properties: {
        label: sample.name,
      },
    },
    state: {
      selection: sample.selection ?? SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: sample.validation ?? ValidationState.Valid,
      issues: [],
    },
    style: {
      themeToken: sample.themeToken,
    },
  };
}

function createLayer(
  layer: Pick<EditorLayer, "id" | "name" | "roles" | "features"> & {
    zIndex: number;
    opacity?: number;
  },
): EditorLayer {
  const isEditable = layer.roles.includes(LayerRole.Editable);
  const isBackground = layer.roles.includes(LayerRole.Background);

  return {
    id: layer.id,
    name: layer.name,
    roles: layer.roles,
    geometryKinds: [GeometryKind.Polygon],
    view: {
      visibility: VisibilityState.Visible,
      opacity: layer.opacity ?? 1,
      zIndex: layer.zIndex,
      labelVisible: true,
    },
    behavior: {
      lock: isEditable ? LockState.Unlocked : LockState.Locked,
      editability: isEditable ? EditabilityState.Editable : EditabilityState.Readonly,
      selectable: !isBackground,
      deletable: isEditable,
      draggable: isEditable,
    },
    features: layer.features,
  };
}

export const sampleEditorDocument: EditorDocument = {
  version: 1,
  id: "sample-seoul-editor-document",
  name: "서울 샘플 편집 문서",
  viewport: {
    center: [126.98, 37.57],
    zoom: 12,
  },
  layers: [
    createLayer({
      id: "editable-area-layer",
      name: "편집 대상 권역",
      roles: [LayerRole.Editable],
      zIndex: 30,
      features: [
        createPolygonFeature({
          id: "editable-sample",
          name: "editable",
          center: [126.93, 37.585],
          themeToken: "editable",
        }),
        createPolygonFeature({
          id: "active-sample",
          name: "active",
          center: [126.955, 37.585],
          selection: SelectionState.Active,
          themeToken: "active",
        }),
        createPolygonFeature({
          id: "selected-sample",
          name: "selected",
          center: [126.98, 37.585],
          selection: SelectionState.Selected,
          themeToken: "selected",
        }),
      ],
    }),
    createLayer({
      id: "reference-area-layer",
      name: "참고 권역",
      roles: [LayerRole.Readonly, LayerRole.Reference],
      zIndex: 20,
      features: [
        createPolygonFeature({
          id: "readonly-sample",
          name: "readonly",
          center: [127.005, 37.585],
          themeToken: "readonly",
        }),
        createPolygonFeature({
          id: "reference-sample",
          name: "reference",
          center: [127.03, 37.585],
          themeToken: "reference",
        }),
      ],
    }),
    createLayer({
      id: "background-area-layer",
      name: "배경 권역",
      roles: [LayerRole.Background],
      zIndex: 10,
      opacity: 0.9,
      features: [
        createPolygonFeature({
          id: "background-sample",
          name: "background",
          center: [126.93, 37.555],
          themeToken: "background",
        }),
      ],
    }),
    createLayer({
      id: "validation-area-layer",
      name: "검증 상태 권역",
      roles: [LayerRole.Mask, LayerRole.SnapTarget],
      zIndex: 40,
      features: [
        createPolygonFeature({
          id: "mask-sample",
          name: "mask",
          center: [126.955, 37.555],
          themeToken: "mask",
        }),
        createPolygonFeature({
          id: "snap-sample",
          name: "snap",
          center: [126.98, 37.555],
          themeToken: "snapTarget",
        }),
        createPolygonFeature({
          id: "warning-sample",
          name: "warning",
          center: [127.005, 37.555],
          themeToken: "warning",
          validation: ValidationState.Warning,
        }),
        createPolygonFeature({
          id: "invalid-sample",
          name: "invalid",
          center: [127.03, 37.555],
          themeToken: "invalid",
          validation: ValidationState.Invalid,
        }),
      ],
    }),
  ],
};
