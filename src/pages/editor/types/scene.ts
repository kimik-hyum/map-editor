import type {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
} from "./enums";
import type { EditorCoordinate, GeoJsonFeature } from "./geometry";
import type { EditorValidationIssue } from "./validation";
import type { EditorPolygonThemeToken } from "../theme/editorTheme";

export type EditorStyle = {
  themeToken?: EditorPolygonThemeToken;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  labelColor?: string;
};

export type EditorFeatureState = {
  selection: SelectionState;
  lifecycle: FeatureLifecycle;
  validation: ValidationState;
  issues: EditorValidationIssue[];
};

export type EditorFeatureBehavior = {
  editability?: EditabilityState;
  selectable?: boolean;
  deletable?: boolean;
  draggable?: boolean;
  vertexEditable?: boolean;
};

export type EditorFeatureViewState = {
  visibility: VisibilityState;
};

export type EditorFeature = {
  id: string;
  name?: string;
  geometryKind: GeometryKind;
  feature: GeoJsonFeature;
  state: EditorFeatureState;
  view?: EditorFeatureViewState;
  behavior?: EditorFeatureBehavior;
  style?: EditorStyle;
};

export type EditorLayerViewState = {
  visibility: VisibilityState;
  opacity: number;
  zIndex: number;
  labelVisible: boolean;
};

export type EditorLayerBehavior = {
  lock: LockState;
  editability: EditabilityState;
  selectable: boolean;
  deletable: boolean;
  draggable: boolean;
};

export type EditorLayerRules = {
  preventSelfIntersection?: boolean;
  preventOverlap?: boolean;
  mustStayInsideLayerId?: string;
  snapEnabled?: boolean;
  snapTargetLayerIds?: string[];
  minAreaSquareMeters?: number;
  maxAreaSquareMeters?: number;
  minLengthMeters?: number;
  maxLengthMeters?: number;
};

export type EditorLayer = {
  id: string;
  name: string;
  roles: LayerRole[];
  geometryKinds: GeometryKind[];
  view: EditorLayerViewState;
  behavior: EditorLayerBehavior;
  rules?: EditorLayerRules;
  style?: EditorStyle;
  features: EditorFeature[];
};

export type EditorViewport = {
  center?: EditorCoordinate;
  zoom?: number;
  fitLayerIds?: string[];
  fitFeatureIds?: string[];
};

export type EditorScene = {
  version: 1;
  id?: string;
  name?: string;
  layers: EditorLayer[];
  viewport?: EditorViewport;
};
