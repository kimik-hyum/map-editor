import { describe, expect, it } from "vitest";
import { serializeSceneOutput } from "../messaging/serializeSceneOutput";
import {
  EditabilityState,
  FeatureLifecycle,
  LockState,
  VisibilityState,
  type EditorFeatureInput,
  type EditorScene,
} from "../types/editorTypes";
import {
  addEmptyLayerToScene,
  deleteEmptyLayerInScene,
  fillEmptyLayerInScene,
  renameEmptyLayerInScene,
} from "./emptyLayerEdits";

const emptyScene: EditorScene = { version: 1, layers: [] };
const marker: EditorFeatureInput = {
  geometry: { type: "Point", coordinates: [127, 37.5] },
};

describe("빈 레이어 편집", () => {
  it("이름·ID 충돌을 피하고 최상단에 빈 레이어를 추가한다", () => {
    const first = addEmptyLayerToScene(emptyScene);
    const renamed = renameEmptyLayerInScene(first.scene, first.layerId, "새 레이어 2");
    const second = addEmptyLayerToScene(renamed);
    expect(second.scene.layers[1]).toMatchObject({
      id: "layer-empty-3",
      name: "새 레이어 3",
      features: [],
      geometryKinds: [],
      view: { zIndex: 20 },
      behavior: { deletable: true, lock: LockState.Unlocked },
    });
    expect(emptyScene.layers).toEqual([]);
    expect(first.scene.layers[0].name).toBe("새 레이어 1");
  });

  it("빈 레이어의 이름·ID·순서·스타일을 유지하며 도형 하나만 채운다", () => {
    const { scene, layerId } = addEmptyLayerToScene(emptyScene);
    const layer = scene.layers[0];
    layer.style = { strokeColor: "#ff0000" };
    layer.view.zIndex = 50;
    const result = fillEmptyLayerInScene(scene, layerId, [marker]);
    expect(result.scene.layers).toHaveLength(1);
    expect(result.scene.layers[0]).toMatchObject({
      id: layerId,
      name: layer.name,
      view: layer.view,
      style: layer.style,
      features: [{ name: layer.name, state: { lifecycle: FeatureLifecycle.Created } }],
    });
    expect(result.addedFeatureIds).toEqual([result.scene.layers[0].features[0].id]);
    expect(scene.layers[0].features).toEqual([]);
    expect(fillEmptyLayerInScene(result.scene, layerId, [marker]).scene).toBe(
      result.scene,
    );
    expect(deleteEmptyLayerInScene(result.scene, layerId)).toBe(result.scene);
  });

  it.each(["locked", "hidden", "readonly", "missing", "multiple"] as const)(
    "%s 대상에는 도형을 넣거나 대체 레이어를 만들지 않는다",
    (reason) => {
      const { scene, layerId } = addEmptyLayerToScene(emptyScene);
      const layer = scene.layers[0];
      if (reason === "locked") layer.behavior.lock = LockState.Locked;
      if (reason === "hidden") layer.view.visibility = VisibilityState.Hidden;
      if (reason === "readonly") layer.behavior.editability = EditabilityState.Readonly;
      const result = fillEmptyLayerInScene(
        scene,
        reason === "missing" ? "missing" : layerId,
        reason === "multiple" ? [marker, marker] : [marker],
      );
      expect(result).toEqual({ scene, addedFeatureIds: [] });
      expect(result.scene).toBe(scene);
    },
  );

  it("잠긴 레이어의 이름 변경·삭제와 빈 이름을 거부한다", () => {
    const { scene, layerId } = addEmptyLayerToScene(emptyScene);
    expect(renameEmptyLayerInScene(scene, layerId, " ")).toBe(scene);
    scene.layers[0].behavior.lock = LockState.Locked;
    expect(renameEmptyLayerInScene(scene, layerId, "수정")).toBe(scene);
    expect(deleteEmptyLayerInScene(scene, layerId)).toBe(scene);
  });

  it("빈 레이어는 공개 출력에서 제외하고, 채운 뒤에는 그 이름으로 반환한다", () => {
    const { scene, layerId } = addEmptyLayerToScene(emptyScene);
    expect(serializeSceneOutput(scene).features).toEqual([]);
    const filled = fillEmptyLayerInScene(scene, layerId, [marker]);
    expect(serializeSceneOutput(filled.scene).features).toMatchObject([
      { name: "새 레이어 1", geometry: marker.geometry },
    ]);
  });
});
