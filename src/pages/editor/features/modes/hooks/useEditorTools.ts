import { useEffect, useRef, useState } from "react";
import { useBoundaryAccess } from "@/features/auth";
import { useBoundaryLogin } from "@/pages/editor/features/regions";
import {
  resolveRadiusTarget,
  type RadiusToolController,
} from "@/pages/editor/features/radius";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import {
  boundaryCountries,
  type BoundaryCountryCode,
} from "@/shared/config/boundaryCountries";

// 옵션 탐색과 실제 지도 도구 활성화를 분리합니다. 인증을 취소해도 기존 도구/스케치는 유지합니다.
export function useEditorTools(
  confirmDiscardDraw: () => Promise<boolean>,
  radiusTool: RadiusToolController,
  busy: boolean,
  showSearch: () => void,
) {
  const activeMode = useEditorStore((s) => s.activeMode);
  const sessionId = useEditorStore((s) => s.sessionId);
  const { allowed } = useBoundaryAccess();
  const login = useBoundaryLogin();
  const [inspectedMode, setInspectedMode] = useState(activeMode);
  const [dockOpen, setDockOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 900,
  );
  const previousAllowed = useRef(allowed);
  const requestVersion = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 새 세션은 도구가 같아도 옵션 탐색 상태를 초기화합니다.
  useEffect(() => {
    setInspectedMode(activeMode);
  }, [activeMode, sessionId]);
  useEffect(() => {
    const state = useEditorStore.getState();
    if (
      previousAllowed.current &&
      !allowed &&
      state.activeBoundaryCountry === "KR" &&
      state.activeMode === EditorMode.Boundary
    ) {
      state.setActiveMode(EditorMode.Select);
    }
    previousAllowed.current = allowed;
  }, [allowed]);

  const activate = async (
    next: EditorMode,
    options: { country?: BoundaryCountryCode; kind?: string } = {},
  ) => {
    if (busy) return;
    const version = ++requestVersion.current;
    const context = useEditorStore.getState();
    const country = options.country ?? context.activeBoundaryCountry;
    setInspectedMode(next);
    setDockOpen(true);
    if (next !== EditorMode.Boundary || country === "US") login.cancel();
    if (
      next === EditorMode.Boundary &&
      country === "KR" &&
      !(await login.requestBoundaryAccess())
    )
      return;
    if (
      context.activeMode === EditorMode.Draw &&
      next !== EditorMode.Draw &&
      !(await confirmDiscardDraw())
    ) {
      if (version === requestVersion.current)
        setInspectedMode(useEditorStore.getState().activeMode);
      return;
    }
    const current = useEditorStore.getState();
    if (
      version !== requestVersion.current ||
      current.sessionId !== context.sessionId ||
      current.scene !== context.scene ||
      current.activeMode !== context.activeMode ||
      current.activeBoundaryCountry !== context.activeBoundaryCountry
    )
      return;
    if (
      next === EditorMode.Radius &&
      !resolveRadiusTarget(current.scene, current.selectedFeatureIds).target
    )
      return;
    // 인증/그리기 확인이 끝난 뒤 국가·종류·도구를 한 번에 확정합니다.
    const changedCountry = country !== current.activeBoundaryCountry;
    const kind =
      options.kind !== undefined
        ? options.kind
        : changedCountry
          ? (boundaryCountries.find((item) => item.code === country)?.defaultKind ??
            current.activeBoundaryKind)
          : current.activeBoundaryKind;
    useEditorStore.setState({
      activeMode: next,
      activeBoundaryCountry: country,
      activeBoundaryKind: kind,
    });
    if (changedCountry) {
      const url = new URL(window.location.href);
      url.searchParams.set("country", country);
      window.history.replaceState(window.history.state, "", url);
    }
    if (next === EditorMode.Boundary && country === "KR") showSearch();
    if (next === EditorMode.Radius && context.activeMode === next)
      radiusTool.openInput();
  };
  return {
    activeMode,
    inspectedMode,
    dockOpen,
    setDockOpen,
    login,
    activate,
    changeCountry: (country: BoundaryCountryCode) => {
      if (country !== useEditorStore.getState().activeBoundaryCountry)
        void activate(EditorMode.Boundary, { country });
    },
  };
}
export type EditorTools = ReturnType<typeof useEditorTools>;
