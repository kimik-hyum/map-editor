import type { EditorSceneInput } from "./editor-contract.example";
import { inputScene } from "./input-scene.example";
import { createMapEditorHost } from "./map-editor-host.example";

// HTML: <button id="edit">경복궁 편집하기</button><pre id="result"></pre>
// 페이지에서 mountPalaceExample(editButton, resultElement)를 한 번 호출합니다.
export function mountPalaceExample(
  button: HTMLButtonElement,
  result: HTMLElement,
  editorUrl = "https://maps-editor.pages.dev/editor/",
) {
  let scene: EditorSceneInput = structuredClone(inputScene);
  const editor = createMapEditorHost({
    editorUrl,
    getScene: () => scene,
    onSubmit(editedScene) {
      scene = editedScene; // 다음 편집도 방금 저장한 도형으로 시작
      result.textContent = JSON.stringify(scene, null, 2);
      // 여기서 내 지도를 갱신하거나 내 서비스의 저장 API를 호출합니다.
    },
    onCancel() {
      result.textContent = "취소했습니다. 기존 권역을 유지합니다.";
    },
    onError(message) {
      result.textContent = message;
    },
  });
  const open = () => {
    try {
      editor.open();
    } catch (error) {
      result.textContent =
        error instanceof Error ? error.message : "창을 열 수 없습니다.";
    }
  };
  button.addEventListener("click", open);
  return () => {
    // 페이지를 떠날 때 실행
    button.removeEventListener("click", open);
    editor.dispose();
  };
}
