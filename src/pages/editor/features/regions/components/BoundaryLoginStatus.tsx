type BoundaryLoginStatusProps = {
  isSigningIn: boolean;
  error: string | null;
  onCancel: () => void;
};

export function BoundaryLoginStatus({
  isSigningIn,
  error,
  onCancel,
}: BoundaryLoginStatusProps) {
  if (!isSigningIn && !error) {
    return null;
  }
  return (
    <div className="fixed left-1/2 top-4 z-[1000] flex max-w-lg -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-xl">
      <p
        className="m-0 text-sm font-semibold text-ink-soft"
        role={error ? "alert" : "status"}
      >
        {error ??
          "로그인 창에서 인증을 완료해주세요. 창을 닫았다면 취소 후 다시 시도할 수 있습니다."}
      </p>
      <button
        className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink"
        onClick={onCancel}
        type="button"
      >
        {isSigningIn ? "로그인 취소" : "닫기"}
      </button>
    </div>
  );
}
