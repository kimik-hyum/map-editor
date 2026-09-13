import type { EditorSceneInput } from "./editor-contract.example";
import { createMapEditorHost } from "./map-editor-host.example";

type ServicePageBindings = {
  // 예: https://maps-editor.pages.dev/editor/ 또는 로컬 /editor/
  editorUrl: string;
  openButton: HTMLButtonElement;
  // 창을 열 때 서비스의 현재 데이터를 읽습니다. 입력 예시는 input-scene.example.ts 참고.
  getScene: () => EditorSceneInput;
  // 결과 전체를 다음 편집의 기준 데이터로 보관합니다.
  applyScene: (scene: EditorSceneInput) => void;
  // 사용하는 지도 라이브러리에 맞춰 이 GeoJSON을 반영합니다.
  renderOnMap: (featureCollection: {
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
  editorUrl,
  openButton,
  getScene,
  applyScene,
  renderOnMap,
  showEditorError,
}: ServicePageBindings) {
  const mapEditor = createMapEditorHost({
    editorUrl,
    getScene,
    onSubmit(editedScene) {
      // applyScene에서 getScene이 읽는 상태를 갱신하면 다음 편집도 수정본으로 시작합니다.
      applyScene(editedScene);
      // 서비스 지도의 읽기/갱신 API는 지도 라이브러리에 맞게 연결합니다.
      renderOnMap({
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
      // CANCEL에는 scene이 없습니다. applyScene을 호출하지 않아 기존 데이터를 유지합니다.
    },
    onError: showEditorError,
  });

  const openEditor = () => {
    try {
      mapEditor.open();
    } catch (error) {
      showEditorError(
        error instanceof Error ? error.message : "편집기를 열지 못했습니다.",
      );
    }
  };
  openButton.addEventListener("click", openEditor);

  return () => {
    openButton.removeEventListener("click", openEditor);
    mapEditor.dispose();
  };
}
