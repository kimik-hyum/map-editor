import { beforeEach, describe, expect, it } from "vitest";
import { BoundaryKind, GeometryKind } from "../types/editorTypes";
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

describe("editorStore - 그리기 도형", () => {
  beforeEach(() => {
    useEditorStore.getState().resetScene();
  });

  it("기본 그리기 도형은 폴리곤이다", () => {
    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Polygon);
  });

  it("setActiveDrawShape로 도형을 바꾼다", () => {
    useEditorStore.getState().setActiveDrawShape(GeometryKind.Point);

    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Point);
  });

  it("resetScene은 그리기 도형을 기본값으로 되돌린다", () => {
    useEditorStore.getState().setActiveDrawShape(GeometryKind.Path);
    useEditorStore.getState().resetScene();

    expect(useEditorStore.getState().activeDrawShape).toBe(GeometryKind.Polygon);
  });
});
