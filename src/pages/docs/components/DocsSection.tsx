import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { DocsEyebrow } from "./DocsEyebrow";
import { DocsHeading } from "./DocsHeading";
import { DocsText } from "./DocsText";

type DocsSectionProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  id?: string;
  title?: ReactNode;
};

// 앵커(id)와 제목 묶음을 갖춘 문서 섹션. id는 사이드 메뉴 스크롤 위치와 맞물립니다.
export function DocsSection({
  children,
  className,
  description,
  eyebrow,
  id,
  title,
}: DocsSectionProps) {
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section className={cn("scroll-mt-24", className)} id={id}>
      {hasHeader ? (
        <div className="mb-6 max-w-[680px]">
          {eyebrow ? <DocsEyebrow>{eyebrow}</DocsEyebrow> : null}
          {title ? (
            <DocsHeading className={eyebrow ? "mt-3" : undefined} level={2}>
              {title}
            </DocsHeading>
          ) : null}
          {description ? (
            <DocsText className={title ? "mt-2" : "mt-3"}>{description}</DocsText>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
