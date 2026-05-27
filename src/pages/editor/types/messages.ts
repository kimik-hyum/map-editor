import type { EditorMessageType } from "./enums";
import type { EditorDocument } from "./document";
import type { EditorValidationIssue } from "./validation";

export type EditorInitMessage = {
  type: EditorMessageType.Init;
  sessionId: string;
  document: EditorDocument;
};

export type EditorReadyMessage = {
  type: EditorMessageType.Ready;
  sessionId?: string;
};

export type EditorChangeMessage = {
  type: EditorMessageType.Change;
  sessionId: string;
  document: EditorDocument;
  changedFeatureIds: string[];
  changedLayerIds: string[];
};

export type EditorSubmitMessage = {
  type: EditorMessageType.Submit;
  sessionId: string;
  document: EditorDocument;
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
