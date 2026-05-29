import { describe, expect, it } from "vitest";
import { editorDefaultTheme } from "./editorTheme";
import { resolvePolygonStyle, resolvePolygonThemeToken } from "./editorStyleResolver";
import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorFeature,
  type EditorLayer,
} from "../types/editorTypes";

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
    features: [],
    ...overrides,
  };
}

describe("resolvePolygonThemeToken", () => {
  it("feature style token을 가장 먼저 사용한다", () => {
    const feature = createFeature({ style: { themeToken: "selected" } });
    const layer = createLayer({ style: { themeToken: "background" } });

    expect(resolvePolygonThemeToken(feature, layer)).toBe("selected");
  });

  it("검증 오류 상태는 레이어 역할보다 우선한다", () => {
    const feature = createFeature({
      state: {
        selection: SelectionState.None,
        lifecycle: FeatureLifecycle.Clean,
        validation: ValidationState.Invalid,
        issues: [],
      },
    });
    const layer = createLayer({ roles: [LayerRole.Background] });

    expect(resolvePolygonThemeToken(feature, layer)).toBe("invalid");
  });

  it("선택 상태는 레이어 역할보다 우선한다", () => {
    const feature = createFeature({
      state: {
        selection: SelectionState.Active,
        lifecycle: FeatureLifecycle.Clean,
        validation: ValidationState.Valid,
        issues: [],
      },
    });
    const layer = createLayer({ roles: [LayerRole.Readonly] });

    expect(resolvePolygonThemeToken(feature, layer)).toBe("active");
  });

  it("명시 토큰이 없으면 레이어 역할에서 토큰을 결정한다", () => {
    const feature = createFeature();
    const layer = createLayer({ roles: [LayerRole.Reference] });

    expect(resolvePolygonThemeToken(feature, layer)).toBe("reference");
  });
});

describe("resolvePolygonStyle", () => {
  it("결정된 토큰 스타일에 layer와 feature style override를 합친다", () => {
    const feature = createFeature({
      style: {
        strokeColor: "#111111",
      },
    });
    const layer = createLayer({
      roles: [LayerRole.Readonly],
      style: {
        fillColor: "rgba(1, 2, 3, 0.4)",
      },
    });

    expect(resolvePolygonStyle(feature, layer)).toMatchObject({
      ...editorDefaultTheme.polygon.readonly,
      fillColor: "rgba(1, 2, 3, 0.4)",
      strokeColor: "#111111",
    });
  });
});
