import { useEffect } from "react";
import { useEditorStore } from "../state/editorStore";
import { sampleEditorSceneInitMessage } from "./sampleEditorSceneMessage";

// 단독 실행(부모 창 없음)일 때만 샘플 init message를 store에 주입합니다.
// 부모 창이 있으면 useEditorMessaging의 postMessage 흐름이 scene을 전달하므로 주입하지 않습니다.
export function useTempEditorSceneMessage() {
  const scene = useEditorStore((state) => state.scene);
  const initializeFromMessage = useEditorStore((state) => state.initializeFromMessage);

  useEffect(() => {
    if (window.opener || scene) {
      return;
    }

    initializeFromMessage(sampleEditorSceneInitMessage);
  }, [scene, initializeFromMessage]);
}
