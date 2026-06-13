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
  deriveSelectionTargets,
  getChangedSelectionIds,
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

describe("deriveSelectionTargets", () => {
  const editableScene = scene([layer("layer-a", [feature("a")])]);

  const lockedLayer = (id: string, features: EditorFeature[]) =>
    layer(id, features, {
      behavior: {
        lock: LockState.Locked,
        editability: EditabilityState.Readonly,
        selectable: true,
        deletable: false,
        draggable: false,
      },
    });

  const hiddenLayer = (id: string, features: EditorFeature[]) =>
    layer(id, features, {
      view: {
        visibility: VisibilityState.Hidden,
        opacity: 1,
        zIndex: 10,
        labelVisible: true,
      },
    });

  it("편집 가능 도형 1개 선택이면 정점·이동 대상이 모두 그 id다", () => {
    const targets = deriveSelectionTargets(editableScene, new Set(["a"]));
    expect([...targets.vertexEditTargetIds]).toEqual(["a"]);
    expect([...targets.translateTargetIds]).toEqual(["a"]);
  });

  it("2개 이상 선택이면 정점 대상은 비고 이동 대상은 편집 가능한 전부다", () => {
    const multi = scene([
      layer("layer-a", [feature("a")]),
      layer("layer-b", [feature("b")]),
    ]);
    const targets = deriveSelectionTargets(multi, new Set(["a", "b"]));
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect([...targets.translateTargetIds].sort()).toEqual(["a", "b"]);
  });

  it("다중 선택 중 잠금/숨김 도형은 이동 대상에서도 빠진다", () => {
    const mixed = scene([
      layer("layer-a", [feature("a")]),
      lockedLayer("layer-b", [feature("b")]),
      hiddenLayer("layer-c", [feature("c")]),
    ]);
    const targets = deriveSelectionTargets(mixed, new Set(["a", "b", "c"]));
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect([...targets.translateTargetIds]).toEqual(["a"]);
  });

  it("선택이 없으면 두 집합 모두 비어 있다", () => {
    const targets = deriveSelectionTargets(editableScene, new Set());
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect(targets.translateTargetIds.size).toBe(0);
  });

  it("잠긴/읽기 전용 도형 1개 선택이면 두 집합 모두 비어 있다(선택은 되어도 편집 대상 아님)", () => {
    const locked = scene([lockedLayer("layer-a", [feature("a")])]);
    const targets = deriveSelectionTargets(locked, new Set(["a"]));
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect(targets.translateTargetIds.size).toBe(0);
  });

  it("숨긴 도형 1개 선택이면 두 집합 모두 비어 있다", () => {
    const hidden = scene([hiddenLayer("layer-a", [feature("a")])]);
    const targets = deriveSelectionTargets(hidden, new Set(["a"]));
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect(targets.translateTargetIds.size).toBe(0);
  });

  it("scene에 없는 id는 두 집합 모두 비어 있다", () => {
    const targets = deriveSelectionTargets(editableScene, new Set(["missing"]));
    expect(targets.vertexEditTargetIds.size).toBe(0);
    expect(targets.translateTargetIds.size).toBe(0);
  });
});
