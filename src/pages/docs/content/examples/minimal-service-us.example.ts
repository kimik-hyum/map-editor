import type { EditorSceneInput } from "./editor-contract.example";
import { createMapEditorHost } from "./map-editor-host.example";

// 서비스 페이지의 버튼과 결과 표시 영역을 연결합니다.
export function mountMinimalExample(
  button: HTMLButtonElement,
  result: HTMLElement,
  editorUrl = "https://maps-editor.pages.dev/en/editor/",
) {
  let scene: EditorSceneInput = {
    version: 2,
    viewport: { center: [-73.975, 40.77], zoom: 15 },
    features: [
      {
        id: "area-1",
        name: "Example area",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-73.978, 40.767],
              [-73.972, 40.767],
              [-73.972, 40.773],
              [-73.978, 40.773],
              [-73.978, 40.767],
            ],
          ],
        },
      },
    ],
  };
  const editor = createMapEditorHost({
    editorUrl,
    getScene: () => scene,
    onSubmit(editedScene) {
      scene = editedScene; // 다음 편집은 이번 편집 결과로 시작합니다.
      result.textContent = JSON.stringify(scene, null, 2);
      // 서버에 저장하려면 여기서 서비스의 저장 기능을 호출합니다.
    },
    onCancel() {
      result.textContent = "편집을 취소했습니다. 기존 편집 데이터를 유지합니다.";
    },
    onError(message) {
      result.textContent = message;
    },
  });
  const openEditor = () => {
    try {
      editor.open();
    } catch (error) {
      result.textContent =
        error instanceof Error ? error.message : "편집 창을 열지 못했습니다.";
    }
  };
  button.addEventListener("click", openEditor);
  return () => {
    // 서비스 페이지를 떠나거나 이 화면을 제거할 때 실행합니다.
    button.removeEventListener("click", openEditor);
    editor.dispose();
  };
}
