import {
  CircleAlert,
  Info,
  Lightbulb,
  type LucideIcon,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { DocsHeading } from "./DocsHeading";
import { DocsText } from "./DocsText";

type CalloutTone = "note" | "tip" | "warning" | "error";

type CalloutProps = {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  tone?: CalloutTone;
};

const toneStyle: Record<
  CalloutTone,
  { box: string; icon: LucideIcon; iconColor: string }
> = {
  note: {
    box: "border-brand-line bg-brand-soft/70",
    icon: Info,
    iconColor: "text-brand",
  },
  tip: {
    box: "border-emerald-200 bg-emerald-50",
    icon: Lightbulb,
    iconColor: "text-emerald-600",
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    icon: TriangleAlert,
    iconColor: "text-amber-600",
  },
  error: {
    box: "border-rose-200 bg-rose-50",
    icon: CircleAlert,
    iconColor: "text-rose-600",
  },
};

// note·tip·warning 세 가지 톤의 강조 박스. 아이콘과 옅은 배경으로 본문과 구분합니다.
// children은 인라인 콘텐츠 기준이며, 내부에서 DocsText 문단으로 감쌉니다.
export function Callout({ children, className, title, tone = "note" }: CalloutProps) {
  const style = toneStyle[tone];
  const Icon = style.icon;

  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", style.box, className)}>
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 shrink-0", style.iconColor)}
        size={20}
        strokeWidth={2.2}
      />
      <div className="min-w-0">
        {title ? (
          <DocsHeading className="mb-1" level={3}>
            {title}
          </DocsHeading>
        ) : null}
        <DocsText tone="soft">{children}</DocsText>
      </div>
    </div>
  );
}
