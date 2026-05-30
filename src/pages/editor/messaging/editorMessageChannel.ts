import {
  EditorMessageType,
  type EditorErrorMessage,
  type EditorInitMessage,
  type EditorReadyMessage,
  type EditorScene,
  type EditorValidationIssue,
} from "../types/editorTypes";

// 부모(호스트) 창과 에디터가 주고받는 postMessage 채널의 origin 정책과 메시지 빌더입니다.

// 허용할 부모 origin 목록입니다. 기본은 동일 origin이며, 환경 변수로 확장할 수 있습니다.
function getAllowedParentOrigins(): string[] {
  const configured = import.meta.env.VITE_EDITOR_PARENT_ORIGINS;

  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [window.location.origin];
}

export function isAllowedParentOrigin(origin: string): boolean {
  return getAllowedParentOrigins().includes(origin);
}

// READY/ERROR를 부모 창에 보낼 때 사용할 대상 origin입니다.
export function resolveParentTargetOrigin(): string {
  return getAllowedParentOrigins()[0] ?? window.location.origin;
}

export function createReadyMessage(sessionId?: string): EditorReadyMessage {
  return { type: EditorMessageType.Ready, sessionId };
}

export function createInitMessage(
  sessionId: string,
  scene: EditorScene,
): EditorInitMessage {
  return { type: EditorMessageType.Init, sessionId, scene };
}

export function createErrorMessage(
  message: string,
  issues?: EditorValidationIssue[],
): EditorErrorMessage {
  return { type: EditorMessageType.Error, message, issues };
}

// 신뢰할 수 없는 데이터에서 메시지 타입만 가볍게 추려냅니다(상세 검증은 스키마가 담당).
export function getMessageType(data: unknown): EditorMessageType | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const type = (data as { type?: unknown }).type;
  const isKnown = Object.values(EditorMessageType).includes(type as EditorMessageType);

  return isKnown ? (type as EditorMessageType) : null;
}
