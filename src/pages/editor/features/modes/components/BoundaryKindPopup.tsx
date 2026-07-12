import type { RefObject } from "react";
import { useRegionKinds } from "@/pages/editor/features/regions";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  createBoundaryKindOptions,
  fallbackBoundaryKindOptions,
} from "../model/boundaryKindModel";
import { ToolOptionPopup } from "./ToolOptionPopup";

type BoundaryKindPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
};

// 경계 도구의 종류(행정동/법정동/우편번호)를 고르는 팝업입니다. 공용 ToolOptionPopup에 store를 연결합니다.
// 병합·더하기·빼기 같은 처리는 폴리곤 흐름에서 담당합니다.
export function BoundaryKindPopup({
  open,
  onOpenChange,
  anchor,
}: BoundaryKindPopupProps) {
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const setActiveBoundaryKind = useEditorStore((state) => state.setActiveBoundaryKind);
  const { data: kinds, isError, isLoading } = useRegionKinds();
  const usingFallback = !kinds && isError;
  const options = kinds
    ? createBoundaryKindOptions(kinds)
    : usingFallback
      ? fallbackBoundaryKindOptions
      : [];

  return (
    <ToolOptionPopup
      activeId={activeBoundaryKind ?? ""}
      anchor={anchor}
      onOpenChange={onOpenChange}
      onSelect={setActiveBoundaryKind}
      open={open}
      options={options}
      title="경계 종류"
      notice={
        isLoading
          ? "종류 불러오는 중…"
          : isError
            ? usingFallback
              ? "종류를 불러오지 못해 기본 종류를 표시합니다."
              : "종류를 갱신하지 못해 기존 목록을 표시합니다."
            : undefined
      }
    />
  );
}
