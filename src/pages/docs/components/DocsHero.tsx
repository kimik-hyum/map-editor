import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { DocsEyebrow } from "./DocsEyebrow";
import { DocsHeading } from "./DocsHeading";
import { DocsText } from "./DocsText";

type DocsHeroProps = {
  actions?: ReactNode;
  aside?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  id?: string;
  title: ReactNode;
};

// 문서 페이지 최상단 히어로. eyebrow → 제목 → 설명 → 액션 순서를 고정해
// 모든 페이지가 같은 리듬으로 시작하게 합니다. aside를 주면 우측 보조 영역이 생깁니다.
export function DocsHero({
  actions,
  aside,
  description,
  eyebrow,
  id,
  title,
}: DocsHeroProps) {
  return (
    <header
      className={cn(
        "scroll-mt-24",
        aside
          ? "grid grid-cols-[minmax(0,1fr)_minmax(260px,340px)] items-start gap-10 max-[860px]:grid-cols-1"
          : undefined,
      )}
      id={id}
    >
      <div>
        {eyebrow ? <DocsEyebrow>{eyebrow}</DocsEyebrow> : null}
        <DocsHeading className="mt-4" level={1}>
          {title}
        </DocsHeading>
        {description ? (
          <DocsText className="mt-5 max-w-[680px]" variant="lead">
            {description}
          </DocsText>
        ) : null}
        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </header>
  );
}
