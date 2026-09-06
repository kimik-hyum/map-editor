import {
  createInitMessage,
  getMessageType,
} from "@/pages/editor/messaging/editorMessageChannel";
import { parseEditorCompletionMessage } from "@/pages/editor/messaging/editorCompletionSchema";
import {
  EditorMessageType,
  type EditorSceneInput,
} from "@/pages/editor/types/editorTypes";

export type EditorHostStatus =
  | "idle"
  | "opening"
  | "connected"
  | "submitted"
  | "cancelled"
  | "closed"
  | "error";

type EditorHostOptions = {
  getScene: () => EditorSceneInput;
  onStatus: (status: EditorHostStatus) => void;
  onError: (message: string | null) => void;
  onSubmit: (scene: EditorSceneInput) => void;
  onOpen: () => void;
};

// 부모 상태와 별개로 팝업 한 회차의 입력·origin·session을 고정합니다.
export function createEditorHost(options: EditorHostOptions) {
  const editorUrl = new URL("/editor/", window.location.href);
  let child: Window | null = null;
  let sessionId: string | null = null;
  let inputSnapshot: EditorSceneInput | null = null;
  let closeTimer: number | null = null;

  const releaseChild = () => {
    if (closeTimer !== null) window.clearInterval(closeTimer);
    closeTimer = null;
    child = null;
    sessionId = null;
    inputSnapshot = null;
  };

  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!child || event.source !== child || event.origin !== editorUrl.origin) return;
    const type = getMessageType(event.data);

    if (type === EditorMessageType.Ready) {
      if (!sessionId || !inputSnapshot) return;
      child.postMessage(createInitMessage(sessionId, inputSnapshot), editorUrl.origin);
      options.onStatus("connected");
      return;
    }

    if (type === EditorMessageType.Error) {
      const data = event.data as { message?: unknown };
      options.onError(
        typeof data.message === "string"
          ? data.message
          : "에디터에서 오류를 반환했습니다.",
      );
      options.onStatus("error");
      return;
    }

    if (type !== EditorMessageType.Submit && type !== EditorMessageType.Cancel) return;
    const data = event.data as { sessionId?: unknown };
    if (!sessionId || data.sessionId !== sessionId) return;
    const message = parseEditorCompletionMessage(event.data);
    if (!message) {
      // 신뢰한 창의 현재 회차만 오류로 표시합니다. 원본과 팝업을 유지해 재시도를 허용합니다.
      options.onError(
        "편집 결과의 데이터 형식이 올바르지 않아 저장하지 못했습니다. 편집창에서 수정 후 다시 저장하세요.",
      );
      options.onStatus("error");
      return;
    }
    const completedChild = child;
    // 후속 메시지·close 타이머가 이미 완료된 회차의 상태를 바꾸지 못하게 먼저 해제합니다.
    releaseChild();
    if (message.type === EditorMessageType.Submit) {
      options.onSubmit(message.scene);
      options.onStatus("submitted");
    } else {
      options.onStatus("cancelled");
    }
    options.onError(null);
    completedChild.close();
  };

  window.addEventListener("message", handleMessage);

  return {
    open() {
      if (child && !child.closed) {
        child.focus();
        return;
      }
      releaseChild();
      const snapshot = structuredClone(options.getScene());
      const nextSessionId = crypto.randomUUID();
      const opened = window.open(
        editorUrl.href,
        "map-editor-child",
        "width=1280,height=860",
      );
      if (!opened) {
        options.onError(
          "팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.",
        );
        options.onStatus("error");
        return;
      }
      child = opened;
      sessionId = nextSessionId;
      inputSnapshot = snapshot;
      options.onOpen();
      options.onError(null);
      options.onStatus("opening");
      closeTimer = window.setInterval(() => {
        if (child?.closed) {
          releaseChild();
          options.onStatus("closed");
        }
      }, 500);
    },
    dispose() {
      window.removeEventListener("message", handleMessage);
      // 부모 페이지를 떠난 뒤 남은 팝업 메시지는 더 이상 수신하지 않습니다.
      // 브라우저 탐색 자체로 편집 팝업을 강제 종료하지는 않습니다.
      releaseChild();
    },
  };
}
