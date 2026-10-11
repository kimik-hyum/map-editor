import { addFeaturesToScene } from "../messaging/normalizeSceneInput";
import {
  canDrawInEmptyLayer,
  canEditEmptyLayer,
  EditabilityState,
  LayerRole,
  LockState,
  normalizeFeatureName,
  VisibilityState,
  type EditorFeatureInput,
  type EditorLayer,
  type EditorScene,
} from "../types/editorTypes";

export function addEmptyLayerToScene(scene: EditorScene) {
  const usedIds = new Set(scene.layers.map((layer) => layer.id));
  const usedNames = new Set(scene.layers.map((layer) => layer.name));
  let index = 1;
  while (usedIds.has(`layer-empty-${index}`) || usedNames.has(`새 레이어 ${index}`)) {
    index += 1;
  }
  const layer: EditorLayer = {
    id: `layer-empty-${index}`,
    name: `새 레이어 ${index}`,
    roles: [LayerRole.Editable],
    geometryKinds: [],
    view: {
      visibility: VisibilityState.Visible,
      opacity: 1,
      zIndex:
        scene.layers.reduce((top, item) => Math.max(top, item.view.zIndex), 0) + 10,
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
  };
  return { scene: { ...scene, layers: [...scene.layers, layer] }, layerId: layer.id };
}

export function renameEmptyLayerInScene(
  scene: EditorScene,
  layerId: string,
  name: string,
) {
  const layer = scene.layers.find((item) => item.id === layerId);
  const normalizedName = normalizeFeatureName(name);
  if (
    !layer ||
    !canEditEmptyLayer(layer) ||
    !normalizedName ||
    layer.name === normalizedName
  ) {
    return scene;
  }
  return {
    ...scene,
    layers: scene.layers.map((item) =>
      item === layer ? { ...item, name: normalizedName } : item,
    ),
  };
}

export function deleteEmptyLayerInScene(scene: EditorScene, layerId: string) {
  const layer = scene.layers.find((item) => item.id === layerId);
  if (!layer || !canEditEmptyLayer(layer) || !layer.behavior.deletable) return scene;
  return { ...scene, layers: scene.layers.filter((item) => item !== layer) };
}

// 지정한 빈 레이어 하나만 채웁니다. 없거나 잠긴 대상에는 새 레이어를 대신 만들지 않습니다.
export function fillEmptyLayerInScene(
  scene: EditorScene,
  layerId: string,
  inputs: ReadonlyArray<EditorFeatureInput>,
) {
  const layer = scene.layers.find((item) => item.id === layerId);
  if (!layer || !canDrawInEmptyLayer(layer) || inputs.length !== 1) {
    return { scene, addedFeatureIds: [] as string[] };
  }
  const added = addFeaturesToScene(scene, [{ ...inputs[0], name: layer.name }]);
  const created = added.scene.layers[added.scene.layers.length - 1];
  return {
    scene: {
      ...scene,
      layers: scene.layers.map((item) =>
        item === layer
          ? {
              ...layer,
              geometryKinds: created.geometryKinds,
              features: created.features,
            }
          : item,
      ),
    },
    addedFeatureIds: added.addedFeatureIds,
  };
}
