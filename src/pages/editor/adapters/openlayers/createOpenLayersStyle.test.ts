import { Style } from "ol/style";
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
  type EditorFeature,
  type EditorLayer,
} from "@/pages/editor/types/editorTypes";
import { createOpenLayersStyle, scaleFillAlpha } from "./createOpenLayersStyle";

function createFeature(): EditorFeature {
  return {
    id: "f1",
    name: "도형",
    geometryKind: GeometryKind.Polygon,
    feature: {
      type: "Feature",
      id: "f1",
      geometry: { type: "Polygon", coordinates: [] },
      properties: {},
    },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
    // 원색 보존 검증을 위해 명시 토큰(파랑 editable)을 둔다.
    style: { themeToken: "editable" },
  };
}

function createLayer(): EditorLayer {
  return {
    id: "layer-f1",
    name: "도형",
    roles: [LayerRole.Editable],
    geometryKinds: [GeometryKind.Polygon],
    view: {
      visibility: VisibilityState.Visible,
      opacity: 1,
      zIndex: 10,
      labelVisible: false,
    },
    behavior: {
      lock: LockState.Unlocked,
      editability: EditabilityState.Editable,
      selectable: true,
      deletable: true,
      draggable: true,
    },
    features: [],
  };
}

function strokeColorOf(style: Style): string {
  return String(style.getStroke()?.getColor());
}

describe("createOpenLayersStyle", () => {
  it("기본 상태는 단일 스타일이고 토큰 색을 그대로 쓴다", () => {
    const result = createOpenLayersStyle(createFeature(), createLayer());
    expect(result).toBeInstanceOf(Style);
    expect(strokeColorOf(result as Style)).toBe("#2563eb");
  });

  it("선택은 원래 선 색을 유지하고 굵기만 키운다(색 교체 없음)", () => {
    const base = createOpenLayersStyle(createFeature(), createLayer()) as Style;
    const result = createOpenLayersStyle(createFeature(), createLayer(), {
      selected: true,
    });

    expect(Array.isArray(result)).toBe(true);
    const [, main] = result as Style[];
    expect(strokeColorOf(main)).toBe("#2563eb"); // 원색 유지
    expect(main.getStroke()?.getWidth()).toBe((base.getStroke()?.getWidth() ?? 0) + 2);
  });

  it("선택은 본 스타일 아래에 halo 스트로크를 깐다", () => {
    const result = createOpenLayersStyle(createFeature(), createLayer(), {
      selected: true,
    }) as Style[];

    const [halo, main] = result;
    expect(strokeColorOf(halo)).toContain("rgba(79, 70, 229");
    const haloWidth = halo.getStroke()?.getWidth() ?? 0;
    const mainWidth = main.getStroke()?.getWidth() ?? 0;
    expect(haloWidth).toBeGreaterThan(mainWidth);
    expect(halo.getFill()).toBeNull(); // 글로우는 채움 없음
  });

  it("선택은 채움 불투명도를 키운다", () => {
    const result = createOpenLayersStyle(createFeature(), createLayer(), {
      selected: true,
    }) as Style[];
    const fill = String(result[1].getFill()?.getColor());
    // editable 채움 rgba(..., 0.22) × 2.1 = 0.462
    expect(fill).toContain("0.462");
  });

  it("호버는 채움 불투명도만 키우고 단일 스타일을 유지한다", () => {
    const result = createOpenLayersStyle(createFeature(), createLayer(), {
      hovered: true,
    });
    expect(result).toBeInstanceOf(Style);
    const fill = String((result as Style).getFill()?.getColor());
    // 0.22 × 1.5 = 0.33
    expect(fill).toContain("0.33");
  });
});

describe("scaleFillAlpha", () => {
  it("rgba 알파를 배율로 키우고 1로 캡한다", () => {
    expect(scaleFillAlpha("rgba(10, 20, 30, 0.2)", 2)).toBe("rgba(10, 20, 30, 0.4)");
    expect(scaleFillAlpha("rgba(10, 20, 30, 0.8)", 2)).toBe("rgba(10, 20, 30, 1)");
  });

  it("알파 없는 rgb는 알파 1 기준으로 변환·캡한다", () => {
    expect(scaleFillAlpha("rgb(10, 20, 30)", 0.5)).toBe("rgba(10, 20, 30, 0.5)");
  });

  it("hex 색은 rgba로 변환한다(이미 불투명이면 캡 1)", () => {
    expect(scaleFillAlpha("#2563eb", 2)).toBe("rgba(37, 99, 235, 1)");
    expect(scaleFillAlpha("#2563eb", 0.4)).toBe("rgba(37, 99, 235, 0.4)");
  });

  it("알 수 없는 포맷은 원본을 유지한다", () => {
    expect(scaleFillAlpha("tomato", 2)).toBe("tomato");
  });
});
