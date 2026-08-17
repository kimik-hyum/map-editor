import { useSyncExternalStore } from "react";
import {
  confirmationDialogStore,
  EMPTY_CONFIRMATION_DIALOG_SNAPSHOT,
} from "./confirmationDialogStore";

// 전역 모달 위에 지도 힌트 같은 앱 overlay가 남지 않도록 읽기 전용 open 상태를 제공합니다.
export function useConfirmationDialogOpen(): boolean {
  return (
    useSyncExternalStore(
      confirmationDialogStore.subscribe,
      confirmationDialogStore.getSnapshot,
      () => EMPTY_CONFIRMATION_DIALOG_SNAPSHOT,
    ).activeRequest !== null
  );
}
