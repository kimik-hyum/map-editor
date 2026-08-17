export type ConfirmationDialogTone = "default" | "danger" | "success";
export type ConfirmationDialogInitialFocus = "cancel" | "confirm";

export type ConfirmationDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationDialogTone;
  initialFocus?: ConfirmationDialogInitialFocus;
};

export type ConfirmationDialogRequest = {
  id: number;
  options: Readonly<ConfirmationDialogOptions>;
};

export type ConfirmationDialogSnapshot = {
  activeRequest: ConfirmationDialogRequest | null;
};

type InternalRequest = ConfirmationDialogRequest & {
  resolve: (confirmed: boolean) => void;
};

type Listener = () => void;

export const EMPTY_CONFIRMATION_DIALOG_SNAPSHOT: ConfirmationDialogSnapshot = {
  activeRequest: null,
};

// 전역 confirm 요청을 순서대로 처리하는 React 비의존 store입니다.
// Promise resolver는 외부 snapshot에 노출하지 않아 UI가 결과를 임의로 보관하지 않게 합니다.
export class ConfirmationDialogStore {
  private activeRequest: InternalRequest | null = null;
  private readonly listeners = new Set<Listener>();
  private nextId = 1;
  private readonly queue: InternalRequest[] = [];
  private snapshot: ConfirmationDialogSnapshot = EMPTY_CONFIRMATION_DIALOG_SNAPSHOT;

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const request: InternalRequest = {
        id: this.nextId,
        options: { ...options },
        resolve,
      };
      this.nextId += 1;
      this.queue.push(request);
      this.promoteNextRequest();
    });
  }

  respond(requestId: number, confirmed: boolean): boolean {
    if (this.activeRequest?.id !== requestId) {
      return false;
    }

    const settled = this.activeRequest;
    this.activeRequest = null;
    this.promoteNextRequest();
    settled.resolve(confirmed);
    return true;
  }

  // Provider가 제거되거나 테스트가 종료될 때 대기 중 Promise를 남기지 않는 안전장치입니다.
  cancelAll(): void {
    const pending = this.activeRequest
      ? [this.activeRequest, ...this.queue]
      : [...this.queue];
    this.activeRequest = null;
    this.queue.length = 0;
    this.publishSnapshot();
    pending.forEach((request) => {
      request.resolve(false);
    });
  }

  private promoteNextRequest(): void {
    if (!this.activeRequest) {
      this.activeRequest = this.queue.shift() ?? null;
    }
    this.publishSnapshot();
  }

  private publishSnapshot(): void {
    this.snapshot = this.activeRequest
      ? {
          activeRequest: {
            id: this.activeRequest.id,
            options: this.activeRequest.options,
          },
        }
      : EMPTY_CONFIRMATION_DIALOG_SNAPSHOT;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

export const confirmationDialogStore = new ConfirmationDialogStore();

// React 컴포넌트뿐 아니라 adapter callback 등 어느 모듈에서도 호출할 수 있는 전역 API입니다.
export function confirmDialog(options: ConfirmationDialogOptions): Promise<boolean> {
  return confirmationDialogStore.confirm(options);
}

export function isConfirmationDialogOpen(): boolean {
  return confirmationDialogStore.getSnapshot().activeRequest !== null;
}

// 화면/세션 교체처럼 기존 요청의 문맥이 사라질 때 활성·대기 확인을 안전하게 취소합니다.
export function cancelAllConfirmationDialogs(): void {
  confirmationDialogStore.cancelAll();
}
