// 텍스트 입력 중에는 에디터 단축키(되돌리기·복사/붙여넣기)가 키 입력을 가로채지 않도록 판정합니다.
// 단축키 hook들이 공유합니다(historyShortcuts, useEditorClipboard).
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
