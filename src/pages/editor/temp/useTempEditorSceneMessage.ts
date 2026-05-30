import { useEffect } from "react";
import { useEditorStore } from "../state/editorStore";
import { sampleEditorSceneInitMessage } from "./sampleEditorSceneMessage";

// 실제 postMessage 수신 훅이 생기기 전까지 샘플 init message를 store에 주입합니다.
export function useTempEditorSceneMessage() {
  const scene = useEditorStore((state) => state.scene);
  const initializeFromMessage = useEditorStore((state) => state.initializeFromMessage);

  useEffect(() => {
    if (scene) {
      return;
    }

    initializeFromMessage(sampleEditorSceneInitMessage);
  }, [scene, initializeFromMessage]);
}
