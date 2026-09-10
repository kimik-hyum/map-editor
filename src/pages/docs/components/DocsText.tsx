import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DocsTextVariant = "lead" | "body" | "small";

type DocsTextTone = "soft" | "muted";

type DocsTextProps = {
  children: ReactNode;
  className?: string;
  tone?: DocsTextTone;
  variant?: DocsTextVariant;
};

// 문서 본문 텍스트를 한곳에서 관리합니다.
// variant: lead = 히어로 도입부, body = 일반 본문(기본), small = 카드·보조 설명.
// tone: soft = 진한 본문색, muted = 옅은 본문색. 변형마다 기본 tone이 정해져 있습니다.
const variantClassName: Record<DocsTextVariant, string> = {
  lead: "text-lg leading-[1.7]",
  body: "leading-[1.7]",
  small: "text-sm leading-[1.65]",
};

const toneClassName: Record<DocsTextTone, string> = {
  soft: "text-ink-soft",
  muted: "text-ink-muted",
};

const defaultTone: Record<DocsTextVariant, DocsTextTone> = {
  lead: "soft",
  body: "muted",
  small: "muted",
};

export function DocsText({
  children,
  className,
  tone,
  variant = "body",
}: DocsTextProps) {
  return (
    <p
      className={cn(
        "m-0",
        variantClassName[variant],
        toneClassName[tone ?? defaultTone[variant]],
        className,
      )}
    >
      {children}
    </p>
  );
}
