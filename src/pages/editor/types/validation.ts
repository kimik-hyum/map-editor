import type { ValidationIssueCode } from "./enums";

export type EditorValidationIssue = {
  code: ValidationIssueCode;
  message?: string;
  featureId?: string;
  layerId?: string;
};
