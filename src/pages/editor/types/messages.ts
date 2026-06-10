import type { EditorMessageType } from "./enums";
import type { EditorScene } from "./scene";
import type { EditorSceneInput } from "./sceneInput";
import type { EditorValidationIssue } from "./validation";

// 호스트가 보내는 INIT(검증·normalize 전). 에디터가 받아 EditorScene으로 변환합니다.
export type EditorInitMessageInput = {
  type: EditorMessageType.Init;
  sessionId: string;
  scene: EditorSceneInput;
};

// normalize 완료 후 내부에서 다루는 INIT(scene이 리치 EditorScene).
export type EditorInitMessage = {
  type: EditorMessageType.Init;
  sessionId: string;
  scene: EditorScene;
};

export type EditorReadyMessage = {
  type: EditorMessageType.Ready;
  sessionId?: string;
};

export type EditorChangeMessage = {
  type: EditorMessageType.Change;
  sessionId: string;
  scene: EditorScene;
  changedFeatureIds: string[];
  changedLayerIds: string[];
};

export type EditorSubmitMessage = {
  type: EditorMessageType.Submit;
  sessionId: string;
  scene: EditorScene;
};

export type EditorCancelMessage = {
  type: EditorMessageType.Cancel;
  sessionId: string;
};

export type EditorErrorMessage = {
  type: EditorMessageType.Error;
  sessionId?: string;
  message: string;
  issues?: EditorValidationIssue[];
};

export type EditorMessage =
  | EditorReadyMessage
  | EditorInitMessage
  | EditorChangeMessage
  | EditorSubmitMessage
  | EditorCancelMessage
  | EditorErrorMessage;
