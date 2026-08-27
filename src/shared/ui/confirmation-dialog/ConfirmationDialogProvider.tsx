import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { ConfirmationDialog } from "./ConfirmationDialog";
import {
  confirmationDialogStore,
  EMPTY_CONFIRMATION_DIALOG_SNAPSHOT,
} from "./confirmationDialogStore";

type ConfirmationDialogProviderProps = {
  children: ReactNode;
};

export function ConfirmationDialogProvider({
  children,
}: ConfirmationDialogProviderProps) {
  const snapshot = useSyncExternalStore(
    confirmationDialogStore.subscribe,
    confirmationDialogStore.getSnapshot,
    () => EMPTY_CONFIRMATION_DIALOG_SNAPSHOT,
  );
  const request = snapshot.activeRequest;

  useEffect(
    () => () => {
      confirmationDialogStore.cancelAll();
    },
    [],
  );

  return (
    <>
      {children}
      {request ? (
        <ConfirmationDialog
          key={request.id}
          open
          cancelLabel={request.options.cancelLabel ?? "취소"}
          confirmLabel={request.options.confirmLabel ?? "확인"}
          description={request.options.description}
          initialFocus={request.options.initialFocus ?? "cancel"}
          onCancel={() => confirmationDialogStore.respond(request.id, false)}
          onConfirm={() => confirmationDialogStore.respond(request.id, true)}
          title={request.options.title}
          tone={request.options.tone ?? "default"}
        />
      ) : null}
    </>
  );
}
