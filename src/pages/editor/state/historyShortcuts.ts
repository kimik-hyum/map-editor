import { useEffect } from "react";
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
};

// 키 입력을 되돌리기/다시하기 의도로 해석하는 순수 함수입니다(테스트 용이).
export function resolveHistoryShortcut(
  event: ShortcutEventLike,
): "undo" | "redo" | null {
  if (isTextEntryTarget(event.target)) {
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
      const intent = resolveHistoryShortcut(event);
      if (!intent) {
        return;
      }

      event.preventDefault();
      if (intent === "undo") {
        if (!options.onUndoInProgress?.()) {
          undo();
        }
      } else {
        if (!options.onRedoInProgress?.()) {
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options.onRedoInProgress, options.onUndoInProgress, undo, redo]);
}
