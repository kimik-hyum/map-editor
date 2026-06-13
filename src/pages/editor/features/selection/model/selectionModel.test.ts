import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  GeometryKind,
  LockState,
  SelectionState,
  VisibilityState,
  FeatureLifecycle,
  ValidationState,
  type EditorScene,
  type EditorFeature,
  type EditorLayer,
} from "@/pages/editor/types/editorTypes";
import {
  getChangedSelectionIds,
  getSingleEditableEditTargetIds,
  isToggleSelectionModifier,
  resolveSelection,
  toggleFeatureSelection,
} from "./selectionModel";

describe("getChangedSelectionIds", () => {
  it("선택 추가와 해제를 대칭차로 반환한다", () => {
    const previous = new Set(["a", "b"]);
    const next = new Set(["b", "c"]);

    expect(getChangedSelectionIds(previous, next)).toEqual(["a", "c"]);
  });

  it("선택 집합이 같으면 빈 배열을 반환한다", () => {
    const previous = new Set(["a", "b"]);
    const next = new Set(["a", "b"]);

    expect(getChangedSelectionIds(previous, next)).toEqual([]);
  });
});

describe("toggleFeatureSelection", () => {
  it("없는 id는 추가하고 순서를 유지한다", () => {
    expect(toggleFeatureSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("있는 id는 제거한다", () => {
    expect(toggleFeatureSelection(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("isToggleSelectionModifier", () => {
  it("Cmd/Ctrl이면 토글, 아니면 아니다", () => {
    expect(isToggleSelectionModifier({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isToggleSelectionModifier({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(isToggleSelectionModifier({ metaKey: false, ctrlKey: false })).toBe(false);
  });
});

describe("resolveSelection", () => {
  it("일반 클릭: 집은 도형으로 교체", () => {
    expect(resolveSelection(["a", "b"], "c", false)).toEqual(["c"]);
  });

  it("일반 클릭 + 빈 곳: 전체 해제", () => {
    expect(resolveSelection(["a", "b"], null, false)).toEqual([]);
  });

  it("보조키 클릭: 토글 추가/제거", () => {
    expect(resolveSelection(["a"], "b", true)).toEqual(["a", "b"]);
    expect(resolveSelection(["a", "b"], "a", true)).toEqual(["b"]);
  });

  it("보조키 + 빈 곳: 같은 참조를 그대로 반환한다(진짜 no-op)", () => {
    const current = ["a", "b"];
    expect(resolveSelection(current, null, true)).toBe(current);
  });
});

function feature(id: string): EditorFeature {
  return {
    id,
    name: id,
    geometryKind: GeometryKind.Polygon,
    feature: { type: "Feature", id, geometry: { type: "Polygon", coordinates: [] } },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
  };
}

function layer(
  id: string,
  features: EditorFeature[],
  overrides: Partial<EditorLayer> = {},
): EditorLayer {
  return {
    id,
    name: id,
    roles: [],
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

function scene(layers: EditorLayer[]): EditorScene {
  return { version: 1, layers };
}

describe("getSingleEditableEditTargetIds", () => {
  const editableScene = scene([layer("layer-a", [feature("a")])]);

  it("편집 가능 도형 1개 선택이면 그 id를 편집 대상으로 준다", () => {
    expect([...getSingleEditableEditTargetIds(editableScene, new Set(["a"]))]).toEqual([
      "a",
    ]);
  });

  it("2개 이상 선택이면 편집 대상이 비어 있다(다중 = 하이라이트만)", () => {
    const multi = scene([
      layer("layer-a", [feature("a")]),
      layer("layer-b", [feature("b")]),
    ]);
    expect(getSingleEditableEditTargetIds(multi, new Set(["a", "b"])).size).toBe(0);
  });

  it("선택이 없으면 비어 있다", () => {
    expect(getSingleEditableEditTargetIds(editableScene, new Set()).size).toBe(0);
  });

  it("잠긴/읽기 전용 도형 1개 선택이면 비어 있다(선택은 되어도 편집 대상 아님)", () => {
    const locked = scene([
      layer("layer-a", [feature("a")], {
        behavior: {
          lock: LockState.Locked,
          editability: EditabilityState.Readonly,
          selectable: true,
          deletable: false,
          draggable: false,
        },
      }),
    ]);
    expect(getSingleEditableEditTargetIds(locked, new Set(["a"])).size).toBe(0);
  });

  it("숨긴 도형 1개 선택이면 비어 있다", () => {
    const hidden = scene([
      layer("layer-a", [feature("a")], {
        view: {
          visibility: VisibilityState.Hidden,
          opacity: 1,
          zIndex: 10,
          labelVisible: true,
        },
      }),
    ]);
    expect(getSingleEditableEditTargetIds(hidden, new Set(["a"])).size).toBe(0);
  });

  it("scene에 없는 id는 비어 있다", () => {
    expect(
      getSingleEditableEditTargetIds(editableScene, new Set(["missing"])).size,
    ).toBe(0);
  });
});
