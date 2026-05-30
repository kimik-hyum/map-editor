import type { EditorMessageType } from "./enums";
import type { EditorScene } from "./scene";
import type { EditorValidationIssue } from "./validation";

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
