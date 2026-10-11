import { beforeEach, describe, expect, it } from "vitest";
import { normalizeSceneInput } from "../messaging/normalizeSceneInput";
import { VisibilityState, type EditorFeatureInput } from "../types/editorTypes";
import { useEditorStore } from "./editorStore";

const marker: EditorFeatureInput = {
  geometry: { type: "Point", coordinates: [127, 37.5] },
};
const store = () => useEditorStore.getState();
const activeLayer = () =>
  store().scene?.layers.find((layer) => layer.id === store().activeLayerId);

describe("editorStore - 빈 레이어", () => {
  beforeEach(() => {
    store().resetScene();
    store().setScene(normalizeSceneInput({ version: 2, features: [] }));
  });

  it("생성·도형 채우기·삭제를 각각 undo/redo한다", () => {
    store().addEmptyLayer();
    const id = store().activeLayerId ?? "";
    expect(activeLayer()?.features).toEqual([]);
    expect(store().past).toHaveLength(1);
    store().addFeatures([marker], id);
    expect(store().scene?.layers).toHaveLength(1);
    expect(activeLayer()?.features).toHaveLength(1);
    store().undo();
    expect(activeLayer()?.features).toEqual([]);
    expect(store().selectedFeatureIds).toEqual([]);
    store().redo();
    expect(activeLayer()?.features).toHaveLength(1);
    store().undo();
    store().deleteEmptyLayer(id);
    expect(store().scene?.layers).toEqual([]);
    expect(store().activeLayerId).toBeNull();
    expect(store().future).toEqual([]);
    store().undo();
    expect(store().scene?.layers[0].id).toBe(id);
    store().undo();
    expect(store().scene?.layers).toEqual([]);
    expect(store().dirty).toBe(false);
  });

  it("잠금·숨김 대상은 채우지 않고 잠금 해제 뒤 삭제 권한을 복원한다", () => {
    store().addEmptyLayer();
    const id = store().activeLayerId ?? "";
    store().setLayerLocked(id, true);
    const locked = store().scene;
    store().addFeatures([marker], id);
    store().deleteEmptyLayer(id);
    expect(store().scene).toBe(locked);
    store().setLayerLocked(id, false);
    expect(activeLayer()?.behavior.deletable).toBe(true);
    store().updateLayerView(id, { visibility: VisibilityState.Hidden });
    const hidden = store().scene;
    store().addFeatures([marker], id);
    expect(store().scene).toBe(hidden);
  });

  it("빈 레이어가 선택돼 있어도 붙여넣기는 별도 레이어를 만들고 선택을 옮긴다", () => {
    store().addEmptyLayer();
    const emptyId = store().activeLayerId;
    store().addFeatures([marker]);
    expect(store().scene?.layers).toHaveLength(2);
    expect(store().scene?.layers[0].features).toEqual([]);
    expect(store().activeLayerId).not.toBe(emptyId);
    store().setActiveLayerId(emptyId);
    expect(store().selectedFeatureIds).toEqual([]);
    const pastedLayer = store().scene?.layers[1];
    if (!pastedLayer) throw new Error("붙여넣은 레이어가 없습니다");
    store().setSelectedFeatureIds([pastedLayer.features[0].id]);
    expect(store().activeLayerId).toBe(pastedLayer.id);
  });

  it("이름 편집을 중복으로 열지 않고 undo·새 scene에서 입력 상태를 정리한다", () => {
    store().addEmptyLayer();
    const id = store().activeLayerId ?? "";
    store().beginEmptyLayerRename(id);
    store().addEmptyLayer();
    expect(store().scene?.layers).toHaveLength(1);
    store().renameEmptyLayer(id, "  배송 권역  ");
    store().endFeatureRename();
    expect(activeLayer()?.name).toBe("배송 권역");
    store().undo();
    expect(activeLayer()?.name).toBe("새 레이어 1");
    store().beginEmptyLayerRename(id);
    store().undo();
    expect(store().renamingEmptyLayerId).toBeNull();
    expect(store().activeLayerId).toBeNull();
    store().redo();
    store().beginEmptyLayerRename(id);
    store().setScene(normalizeSceneInput({ version: 2, features: [] }));
    expect(store().renamingEmptyLayerId).toBeNull();
    expect(store().activeLayerId).toBeNull();
  });

  it("원본 도형은 빈 레이어 삭제 API로도 삭제할 수 없다", () => {
    store().setScene(normalizeSceneInput({ version: 2, features: [marker] }));
    const before = store().scene;
    store().deleteEmptyLayer(before?.layers[0].id ?? "");
    expect(store().scene).toBe(before);
    expect(store().past).toEqual([]);
  });
});
