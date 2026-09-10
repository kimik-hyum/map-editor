import { useCallback, useEffect, useRef, useState } from "react";
import { sampleSceneInput } from "../fixtures/sampleEditorScene";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { createEditorHost, type EditorHostStatus } from "./createEditorHost";

export type { EditorHostStatus } from "./createEditorHost";

// 부모의 현재 scene이 지도 표시와 다음 편집 회차의 단일 기준입니다.
export function useEditorHost() {
  const [scene, setScene] = useState<EditorSceneInput>(() =>
    structuredClone(sampleSceneInput),
  );
  const sceneRef = useRef(scene);
  const [status, setStatus] = useState<EditorHostStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedScene, setSubmittedScene] = useState<EditorSceneInput | null>(null);
  const hostRef = useRef<ReturnType<typeof createEditorHost> | null>(null);

  useEffect(() => {
    const host = createEditorHost({
      getScene: () => sceneRef.current,
      onStatus: setStatus,
      onError: setErrorMessage,
      onOpen: () => setSubmittedScene(null),
      onSubmit(nextScene) {
        // React 렌더보다 먼저 다시 열더라도 방금 저장한 값을 전달합니다.
        sceneRef.current = nextScene;
        setScene(nextScene);
        setSubmittedScene(nextScene);
      },
    });
    hostRef.current = host;
    return () => {
      hostRef.current = null;
      host.dispose();
    };
  }, []);

  const openEditor = useCallback(() => hostRef.current?.open(), []);
  return { scene, status, errorMessage, submittedScene, openEditor };
}
