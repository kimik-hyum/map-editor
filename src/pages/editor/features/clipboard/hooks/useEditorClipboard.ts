import { useEffect } from "react";
import { useEditorStore } from "../../../state/editorStore";
import { isTextEntryTarget } from "../../../state/isTextEntryTarget";
import {
  collectClipboardInputs,
  parseClipboardPayload,
  serializeClipboardPayload,
} from "../model/clipboardPayload";

// 선택한 도형을 시스템 클립보드로 복사(Ctrl/Cmd+C)하고, 붙여넣어(Ctrl/Cmd+V) 새 도형으로 추가합니다.
// 네이티브 copy/paste 이벤트의 clipboardData를 직접 쓰므로 비동기 권한 요청이 없고,
// 같은 OS 클립보드를 공유하는 다른 에디터 창(심지어 다른 앱)과도 그대로 호환됩니다.
// 변하는 값(scene/선택)은 이벤트 시점에 store 게터로 당겨 읽습니다(어댑터 규약과 동일한 pull 경계).
export function useEditorClipboard(): void {
  const addFeatures = useEditorStore((state) => state.addFeatures);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      // 입력창에서의 복사는 가로채지 않는다.
      if (isTextEntryTarget(event.target) || !event.clipboardData) {
        return;
      }

      const { scene, selectedFeatureIds } = useEditorStore.getState();
      if (!scene || selectedFeatureIds.length === 0) {
        return;
      }

      // 시각 스택(zIndex) 순서로 모아 붙여넣을 때 상대 위·아래 관계를 보존한다(배열 순서가 아님).
      const inputs = collectClipboardInputs(scene, selectedFeatureIds);
      if (inputs.length === 0) {
        return;
      }

      const text = serializeClipboardPayload(inputs);
      event.clipboardData.setData("application/json", text);
      event.clipboardData.setData("text/plain", text);
      event.preventDefault();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isTextEntryTarget(event.target) || !event.clipboardData) {
        return;
      }

      const text =
        event.clipboardData.getData("application/json") ||
        event.clipboardData.getData("text/plain");
      const inputs = parseClipboardPayload(text);
      // 우리 포맷이 아니면 무시하고 네이티브 붙여넣기를 막지 않는다.
      if (!inputs || inputs.length === 0) {
        return;
      }

      event.preventDefault();
      addFeatures(inputs);
    };

    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, [addFeatures]);
}
