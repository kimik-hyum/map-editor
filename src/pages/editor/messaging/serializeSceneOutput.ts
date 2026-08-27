import {
  FeatureLifecycle,
  LockState,
  VisibilityState,
  type DeepReadonly,
  type EditorFeatureInput,
  type EditorLayer,
  type EditorScene,
  type EditorSceneInput,
} from "../types/editorTypes";

// 내부 1레이어=1도형 모델을 호스트가 이해하는 공개 v2 형식으로 되돌립니다.
// zIndex 오름차순이 곧 그리는 순서이며, 내부 상태·권한·validation 정보는 노출하지 않습니다.
export function serializeSceneOutput(
  scene: DeepReadonly<EditorScene>,
): EditorSceneInput {
  const orderedLayers = scene.layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = left.layer.view.zIndex - right.layer.view.zIndex;
      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    });

  const features = orderedLayers.flatMap(({ layer }) =>
    layer.features
      .filter((feature) => feature.state.lifecycle !== FeatureLifecycle.Deleted)
      .map((feature) => serializeFeature(layer, feature)),
  );

  const viewport = scene.viewport;
  const publicViewport =
    viewport?.center !== undefined || viewport?.zoom !== undefined
      ? {
          center: viewport.center
            ? ([viewport.center[0], viewport.center[1]] as [number, number])
            : undefined,
          zoom: viewport.zoom,
        }
      : undefined;

  return {
    version: 2,
    features,
    ...(scene.id === undefined ? {} : { id: scene.id }),
    ...(scene.name === undefined ? {} : { name: scene.name }),
    ...(publicViewport === undefined ? {} : { viewport: publicViewport }),
  };
}

function serializeFeature(
  layer: DeepReadonly<EditorLayer>,
  feature: DeepReadonly<EditorLayer["features"][number]>,
): EditorFeatureInput {
  const layerVisible = layer.view.visibility !== VisibilityState.Hidden;
  const featureVisible = feature.view?.visibility !== VisibilityState.Hidden;

  return {
    id: feature.id,
    // 공개 경계에서 새 객체로 복사해 내부 readonly snapshot과 반환 payload의 소유권을 분리합니다.
    geometry: structuredClone(
      feature.feature.geometry,
    ) as EditorFeatureInput["geometry"],
    locked: layer.behavior.lock === LockState.Locked,
    visible: layerVisible && featureVisible,
    ...(feature.name === undefined ? {} : { name: feature.name }),
    ...((feature.style?.themeToken ?? layer.style?.themeToken)
      ? { themeToken: feature.style?.themeToken ?? layer.style?.themeToken }
      : {}),
    ...(feature.feature.properties
      ? { properties: structuredClone(feature.feature.properties) }
      : {}),
  };
}
