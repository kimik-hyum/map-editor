import { Button } from "@base-ui/react/button";

type LayerVisibilityIconProps = {
  isDimmed: boolean;
  isVisible: boolean;
  onToggle: () => void;
};

export function LayerVisibilityIcon({
  isDimmed,
  isVisible,
  onToggle,
}: LayerVisibilityIconProps) {
  const statusLabel = isVisible ? (isDimmed ? "흐리게 표시" : "표시") : "숨김";
  const actionLabel = isVisible ? "도형 숨기기" : "도형 보이기";

  return (
    <Button
      className={
        isVisible
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:border-teal-400 hover:text-teal-700"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-400 transition-colors hover:border-teal-400 hover:text-teal-700"
      }
      aria-label={actionLabel}
      aria-pressed={isVisible}
      title={statusLabel}
      type="button"
      onClick={onToggle}
    >
      {isVisible ? (
        <svg
          aria-hidden="true"
          className={isDimmed ? "h-4 w-4 opacity-50" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4 opacity-60"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
          <path d="M9.9 4.4A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.3 17.3 0 0 1-3.2 4.2" />
          <path d="M6.2 6.2A17.3 17.3 0 0 0 2 12s3.5 8 10 8a10.6 10.6 0 0 0 3.8-.7" />
        </svg>
      )}
    </Button>
  );
}
