import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  FeatureLifecycle,
  type EditorScene,
  LockState,
  VisibilityState,
} from "./editorTypes";
import {
  canDeleteCreatedFeature,
  canEditLayerVertices,
  canSelectLayer,
} from "./layerAccess";

function sceneWithLayer(state: {
  visibility: VisibilityState;
  editability: EditabilityState;
  lock: LockState;
}): EditorScene {
  return {
    layers: [
      {
        id: "layer-1",
        view: { visibility: state.visibility },
        behavior: { editability: state.editability, lock: state.lock },
        features: [],
      },
    ],
  } as unknown as EditorScene;
}

const editableVisible = {
  visibility: VisibilityState.Visible,
  editability: EditabilityState.Editable,
  lock: LockState.Unlocked,
};

describe("canSelectLayer", () => {
  it("편집 가능 + 잠금 해제면 true", () => {
    expect(canSelectLayer(sceneWithLayer(editableVisible), "layer-1")).toBe(true);
  });

  it("숨김 레이어라도 선택 대상이다(보임은 보지 않음)", () => {
    const hidden = sceneWithLayer({
      ...editableVisible,
      visibility: VisibilityState.Hidden,
    });
    expect(canSelectLayer(hidden, "layer-1")).toBe(true);
  });

  it("잠금/읽기전용이면 false", () => {
    const locked = sceneWithLayer({ ...editableVisible, lock: LockState.Locked });
    const readonly = sceneWithLayer({
      ...editableVisible,
      editability: EditabilityState.Readonly,
    });
    expect(canSelectLayer(locked, "layer-1")).toBe(false);
    expect(canSelectLayer(readonly, "layer-1")).toBe(false);
  });

  it("없는 레이어면 false", () => {
    expect(canSelectLayer(sceneWithLayer(editableVisible), "missing")).toBe(false);
  });
});

describe("canEditLayerVertices", () => {
  it("보임 + 편집 가능 + 잠금 해제면 true", () => {
    expect(canEditLayerVertices(sceneWithLayer(editableVisible), "layer-1")).toBe(true);
  });

  it("숨김/잠금/읽기전용이면 false", () => {
    const hidden = sceneWithLayer({
      ...editableVisible,
      visibility: VisibilityState.Hidden,
    });
    const locked = sceneWithLayer({ ...editableVisible, lock: LockState.Locked });
    const readonly = sceneWithLayer({
      ...editableVisible,
      editability: EditabilityState.Readonly,
    });
    expect(canEditLayerVertices(hidden, "layer-1")).toBe(false);
    expect(canEditLayerVertices(locked, "layer-1")).toBe(false);
    expect(canEditLayerVertices(readonly, "layer-1")).toBe(false);
  });

  it("없는 레이어면 false", () => {
    expect(canEditLayerVertices(sceneWithLayer(editableVisible), "missing")).toBe(
      false,
    );
  });
});

describe("canDeleteCreatedFeature", () => {
  const layer = sceneWithLayer(editableVisible).layers[0];
  const created = {
    state: { lifecycle: FeatureLifecycle.Created },
  } as Parameters<typeof canDeleteCreatedFeature>[1];
  const original = {
    state: { lifecycle: FeatureLifecycle.Clean },
  } as Parameters<typeof canDeleteCreatedFeature>[1];

  it("삭제 권한이 있는 잠금 해제 레이어의 로컬 생성물만 허용한다", () => {
    const deletable = {
      ...layer,
      behavior: { ...layer.behavior, deletable: true },
    };
    expect(canDeleteCreatedFeature(deletable, created)).toBe(true);
    expect(canDeleteCreatedFeature(deletable, original)).toBe(false);
  });

  it("로컬 생성물이어도 잠겼거나 삭제 권한이 없으면 거부한다", () => {
    const locked = {
      ...layer,
      behavior: {
        ...layer.behavior,
        lock: LockState.Locked,
        deletable: false,
      },
    };
    const denied = {
      ...layer,
      behavior: { ...layer.behavior, deletable: false },
    };
    expect(canDeleteCreatedFeature(locked, created)).toBe(false);
    expect(canDeleteCreatedFeature(denied, created)).toBe(false);
  });

  it("원본을 흡수해 feature 수준 삭제가 금지된 생성물은 거부한다", () => {
    const protectedCreated = {
      ...created,
      behavior: { deletable: false },
    };
    const deletable = {
      ...layer,
      behavior: { ...layer.behavior, deletable: true },
    };
    expect(canDeleteCreatedFeature(deletable, protectedCreated)).toBe(false);
  });
});
