import { useEffect } from "react";
import { useEditorStore } from "./editorStore";

type ShortcutEventLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
};

// 텍스트 입력 중에는 되돌리기 단축키를 가로채지 않습니다.
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

// 키 입력을 되돌리기/다시하기 의도로 해석하는 순수 함수입니다(테스트 용이).
// 그리기 도중 마지막 점 취소(OpenLayers Draw `removeLastPoint`) 라우팅은 후속(#12·#46)에서 추가합니다.
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

// Cmd/Ctrl+Z = 되돌리기, +Shift(또는 Ctrl+Y) = 다시하기. 에디터 페이지에서 호출합니다.
export function useEditorHistoryShortcuts(): void {
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
        undo();
      } else {
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
}
