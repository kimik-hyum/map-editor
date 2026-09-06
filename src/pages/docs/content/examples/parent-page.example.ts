import type { EditorSceneInput } from "./editor-contract.example";
import { inputScene } from "./input-scene.example";
import { createMapEditorHost } from "./map-editor-host.example";

type ParentPageBindings = {
  openButton: HTMLButtonElement;
  renderOnParentMap: (featureCollection: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      id?: string;
      geometry: EditorSceneInput["features"][number]["geometry"];
      properties: Record<string, unknown>;
    }>;
  }) => void;
  showEditorError: (message: string) => void;
};

export function bindMapEditor({
  openButton,
  renderOnParentMap,
  showEditorError,
}: ParentPageBindings) {
  let currentScene: EditorSceneInput = inputScene;

  const mapEditor = createMapEditorHost({
    getScene: () => currentScene,
    onSubmit(editedScene) {
      // 반환값 전체를 다음 편집의 기준 데이터로 교체합니다.
      currentScene = editedScene;

      // 부모 화면의 지도·폼·상태 관리에는 features를 사용합니다.
      renderOnParentMap({
        type: "FeatureCollection",
        features: editedScene.features.map((feature) => ({
          type: "Feature",
          id: feature.id,
          geometry: feature.geometry,
          properties: {
            ...feature.properties,
            name: feature.name,
            locked: feature.locked,
            visible: feature.visible,
          },
        })),
      });
    },
    onCancel() {
      // CANCEL에는 scene이 없으므로 기존 currentScene을 그대로 유지합니다.
    },
    onError: showEditorError,
  });

  const openEditor = () => mapEditor.open();
  openButton.addEventListener("click", openEditor);

  return () => {
    openButton.removeEventListener("click", openEditor);
    mapEditor.dispose();
  };
}
