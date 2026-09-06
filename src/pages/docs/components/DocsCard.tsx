import { ArrowRight, ExternalLink, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/shared/utils/cn";
import { DocsEyebrow } from "./DocsEyebrow";
import { DocsHeading } from "./DocsHeading";
import { DocsText } from "./DocsText";

type DocsCardProps = {
  children?: ReactNode;
  eyebrow?: string;
  href?: string;
  icon?: LucideIcon;
  title: ReactNode;
};

const cardClassName =
  "group flex flex-col gap-3 rounded-xl border border-line bg-white p-5";

const interactiveClassName =
  "no-underline transition-all hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[0_14px_30px_-20px_rgba(15,118,110,0.55)]";

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

// 아이콘·제목·설명을 담는 카드. href를 주면 카드 전체가 링크가 되고 호버 시 살짝 떠오릅니다.
// 내부 라우트는 Link, #해시는 같은 페이지 섹션 이동(네이티브 앵커), http(s)는 새 탭입니다.
export function DocsCard({
  children,
  eyebrow,
  href,
  icon: Icon,
  title,
}: DocsCardProps) {
  const external = href ? isExternalHref(href) : false;
  const hash = href ? href.startsWith("#") : false;

  const body = (
    <>
      {Icon ? (
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
          <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
        </span>
      ) : null}
      {eyebrow ? <DocsEyebrow line={false}>{eyebrow}</DocsEyebrow> : null}
      <DocsHeading className="flex items-center gap-1.5" level={3}>
        <span>{title}</span>
        {href && !external ? (
          <ArrowRight
            aria-hidden="true"
            className="-translate-x-1 text-brand opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            size={16}
            strokeWidth={2.4}
          />
        ) : null}
        {href && external ? (
          <ExternalLink
            aria-hidden="true"
            className="text-ink-muted transition-colors group-hover:text-brand"
            size={15}
            strokeWidth={2.2}
          />
        ) : null}
      </DocsHeading>
      {children ? <DocsText variant="small">{children}</DocsText> : null}
    </>
  );

  if (href && hash) {
    return (
      <a className={cn(cardClassName, interactiveClassName)} href={href}>
        {body}
      </a>
    );
  }

  if (href && !external) {
    return (
      <Link className={cn(cardClassName, interactiveClassName)} to={href}>
        {body}
      </Link>
    );
  }

  if (href && external) {
    return (
      <a
        className={cn(cardClassName, interactiveClassName)}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {body}
      </a>
    );
  }

  return <div className={cardClassName}>{body}</div>;
}

type DocsCardGridProps = {
  children: ReactNode;
  className?: string;
};

// 카드들을 반응형 그리드로 배치합니다. 기본 1열, sm 이상에서 2열.
export function DocsCardGrid({ children, className }: DocsCardGridProps) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
