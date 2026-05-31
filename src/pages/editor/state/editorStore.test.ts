import { beforeEach, describe, expect, it } from "vitest";
import { BoundaryKind } from "../types/editorTypes";
import { useEditorStore } from "./editorStore";

describe("editorStore - 경계 종류", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
  });

  it("기본 경계 종류는 행정동이다", () => {
    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.AdminDong);
  });

  it("setActiveBoundaryKind로 경계 종류를 바꾼다", () => {
    useEditorStore.getState().setActiveBoundaryKind(BoundaryKind.PostalCode);

    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.PostalCode);
  });

  it("resetScene은 경계 종류를 기본값으로 되돌린다", () => {
    useEditorStore.getState().setActiveBoundaryKind(BoundaryKind.LegalDong);
    useEditorStore.getState().resetScene();

    expect(useEditorStore.getState().activeBoundaryKind).toBe(BoundaryKind.AdminDong);
  });
});
