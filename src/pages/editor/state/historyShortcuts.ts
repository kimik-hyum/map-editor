import { useEffect } from "react";
import { isConfirmationDialogOpen } from "@/shared/ui/confirmation-dialog";
import { useEditorStore } from "./editorStore";
import { isTextEntryTarget } from "./isTextEntryTarget";

type ShortcutEventLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
};

type HistoryShortcutOptions = {
  // 진행 중인 도구가 정점 등 자기 로컬 history를 소비했으면 true를 반환합니다.
  onUndoInProgress?: () => boolean;
  onRedoInProgress?: () => boolean;
  // 전역 scene undo가 실제 실행되면 더 오래된 로컬 redo 분기는 시간 순서를 보장하기 위해 버립니다.
  onDiscardInProgressRedo?: () => boolean;
};

// 키 입력을 되돌리기/다시하기 의도로 해석하는 순수 함수입니다(테스트 용이).
export function resolveHistoryShortcut(
  event: ShortcutEventLike,
  confirmationOpen = false,
): "undo" | "redo" | null {
  if (confirmationOpen || isTextEntryTarget(event.target)) {
    return null;
  }

  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }

  // 윈도우 계열의 다시하기 단축키.
  if (key === "y" && event.ctrlKey && !event.metaKey) {
    return "redo";
  }

  return null;
}

// 진행 중 도구의 로컬 history가 전역 scene history보다 우선합니다.
export function useEditorHistoryShortcuts(options: HistoryShortcutOptions = {}): void {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const intent = resolveHistoryShortcut(event, isConfirmationDialogOpen());
      if (!intent) {
        return;
      }

      event.preventDefault();
      if (intent === "undo") {
        if (!options.onUndoInProgress?.()) {
          // 전역 history가 실제로 한 단계 이동할 때만 로컬 redo를 폐기합니다.
          // 전역 past가 비어 있으면 추가 Undo 뒤에도 첫 정점 redo를 유지합니다.
          const editorState = useEditorStore.getState();
          if (editorState.scene && editorState.past.length > 0) {
            options.onDiscardInProgressRedo?.();
            undo();
          }
        }
      } else {
        if (!options.onRedoInProgress?.()) {
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    options.onDiscardInProgressRedo,
    options.onRedoInProgress,
    options.onUndoInProgress,
    undo,
    redo,
  ]);
}
