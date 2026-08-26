import {
  EditorMessageType,
  type EditorErrorMessage,
  type EditorInitMessageInput,
  type EditorReadyMessage,
  type EditorSceneInput,
  type EditorValidationIssue,
} from "../types/editorTypes";

// 부모(호스트) 창과 에디터가 주고받는 postMessage 채널의 origin 정책과 메시지 빌더입니다.

const ANY_HTTPS_PARENT_ORIGIN = "*";

// 허용할 부모 origin 목록입니다. 기본은 모든 HTTPS origin이며, 환경 변수로 제한할 수 있습니다.
function getAllowedParentOrigins(): string[] {
  const configured = import.meta.env.VITE_EDITOR_PARENT_ORIGINS;

  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [ANY_HTTPS_PARENT_ORIGIN];
}

function isHttpsOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.origin === origin;
  } catch {
    return false;
  }
}

export function isAllowedParentOrigin(
  origin: string,
  allowedOrigins = getAllowedParentOrigins(),
  editorOrigin = window.location.origin,
): boolean {
  if (origin === "null") {
    return false;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return (
    allowedOrigins.includes(ANY_HTTPS_PARENT_ORIGIN) &&
    (origin === editorOrigin || isHttpsOrigin(origin))
  );
}

// READY는 연결 전이라 부모 origin을 아직 알 수 없습니다. "*"는 geometry나 sessionId가 없는
// bootstrap READY에만 사용하며, 실제 응답은 수신한 정확한 origin으로 전송합니다.
export function resolveReadyTargetOrigins(
  allowedOrigins = getAllowedParentOrigins(),
  editorOrigin = window.location.origin,
): string[] {
  if (allowedOrigins.includes(ANY_HTTPS_PARENT_ORIGIN)) {
    return [ANY_HTTPS_PARENT_ORIGIN];
  }

  return allowedOrigins.length > 0 ? allowedOrigins : [editorOrigin];
}

export function createReadyMessage(): EditorReadyMessage {
  return { type: EditorMessageType.Ready };
}

export function createInitMessage(
  sessionId: string,
  scene: EditorSceneInput,
): EditorInitMessageInput {
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
