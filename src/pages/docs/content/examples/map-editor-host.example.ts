import {
  completionMessageSchema,
  type EditorSceneInput,
} from "./editor-contract.example";

const EDITOR_WINDOW_NAME = "map-editor-child";
const EDITOR_WINDOW_FEATURES = "width=1280,height=860";

type MapEditorHostOptions = {
  editorUrl: string;
  getScene: () => EditorSceneInput;
  onSubmit: (scene: EditorSceneInput) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

export function createMapEditorHost(options: MapEditorHostOptions) {
  const editorUrl = new URL(options.editorUrl, window.location.href);
  const editorOrigin = editorUrl.origin;
  let editorWindow: Window | null = null;
  let sessionId: string | null = null;
  let initialScene: EditorSceneInput | null = null;

  const closeEditor = () => {
    editorWindow?.close();
    editorWindow = null;
    sessionId = null;
    initialScene = null;
  };

  const handleMessage = (event: MessageEvent<unknown>) => {
    // 반드시 내가 연 창과 배포된 편집기의 정확한 origin을 함께 확인합니다.
    const targetWindow = editorWindow;
    if (
      !targetWindow ||
      event.source !== targetWindow ||
      event.origin !== editorOrigin
    ) {
      return;
    }

    const data = event.data;
    if (
      typeof data !== "object" ||
      data === null ||
      !("type" in data) ||
      typeof data.type !== "string"
    ) {
      return;
    }

    if (data.type === "MAP_EDITOR_READY") {
      // 같은 팝업의 재전송에도 세션과 최초 입력을 일관되게 유지합니다.
      if (!sessionId || !initialScene) return;
      targetWindow.postMessage(
        {
          type: "MAP_EDITOR_INIT",
          sessionId,
          scene: initialScene,
        },
        editorOrigin,
      );
      return;
    }

    const completion = completionMessageSchema.safeParse(data);
    if (completion.success) {
      if (completion.data.sessionId !== sessionId) {
        return;
      }

      closeEditor();
      if (completion.data.type === "MAP_EDITOR_SUBMIT") {
        options.onSubmit(completion.data.scene);
      } else {
        options.onCancel?.();
      }
      return;
    }

    if (data.type === "MAP_EDITOR_ERROR") {
      const message =
        "message" in data && typeof data.message === "string"
          ? data.message
          : "지도 편집기에서 오류가 발생했습니다.";
      options.onError?.(message);
    }
  };

  window.addEventListener("message", handleMessage);

  return {
    open() {
      // 중복 클릭으로 이미 편집 중인 창을 닫거나 데이터를 덮지 않습니다.
      if (editorWindow && !editorWindow.closed) {
        editorWindow.focus();
        return;
      }
      closeEditor();
      initialScene = structuredClone(options.getScene());
      sessionId = crypto.randomUUID();
      editorWindow = window.open(
        editorUrl.href,
        EDITOR_WINDOW_NAME,
        EDITOR_WINDOW_FEATURES,
      );

      if (!editorWindow) {
        closeEditor();
        throw new Error("팝업이 차단되었습니다.");
      }
    },
    dispose() {
      window.removeEventListener("message", handleMessage);
      closeEditor();
    },
  };
}
