import {
  completionMessageSchema,
  type EditorSceneInput,
} from "./editor-contract.example";

const EDITOR_URL = "https://YOUR_EDITOR_DOMAIN/editor";
const EDITOR_WINDOW_NAME = "map-editor-child";
const EDITOR_WINDOW_FEATURES = "width=1280,height=860";

type MapEditorHostOptions = {
  getScene: () => EditorSceneInput;
  onSubmit: (scene: EditorSceneInput) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

export function createMapEditorHost(options: MapEditorHostOptions) {
  const editorUrl = new URL(EDITOR_URL);
  const editorOrigin = editorUrl.origin;
  let editorWindow: Window | null = null;
  let sessionId: string | null = null;

  const closeEditor = () => {
    editorWindow?.close();
    editorWindow = null;
    sessionId = null;
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
      // 같은 팝업이 READY를 다시 보내도 같은 sessionId로 INIT을 재전송합니다.
      sessionId ??= crypto.randomUUID();
      targetWindow.postMessage(
        {
          type: "MAP_EDITOR_INIT",
          sessionId,
          scene: options.getScene(),
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

      if (completion.data.type === "MAP_EDITOR_SUBMIT") {
        options.onSubmit(completion.data.scene);
      } else {
        options.onCancel?.();
      }
      closeEditor();
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
      closeEditor();
      editorWindow = window.open(
        editorUrl.href,
        EDITOR_WINDOW_NAME,
        EDITOR_WINDOW_FEATURES,
      );

      if (!editorWindow) {
        throw new Error("팝업이 차단되었습니다.");
      }
    },
    dispose() {
      window.removeEventListener("message", handleMessage);
      closeEditor();
    },
  };
}
