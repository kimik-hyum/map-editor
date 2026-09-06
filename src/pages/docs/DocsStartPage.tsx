import {
  ArrowRight,
  BookOpen,
  type LucideIcon,
  MousePointer2,
  PanelsTopLeft,
  PencilRuler,
  Rocket,
  Send,
} from "lucide-react";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCard,
  DocsCardGrid,
  DocsEyebrow,
  DocsHeading,
  DocsHero,
  DocsSection,
  DocsText,
  Steps,
} from "./components";

const steps = [
  {
    title: "데모 페이지로 이동합니다",
    description:
      "상단 메뉴에서 Demo를 선택하거나 히어로의 ‘데모에서 시작하기’ 버튼을 눌러 데모 페이지로 이동합니다.",
  },
  {
    title: "편집기를 새 창으로 엽니다",
    description:
      "데모 페이지의 ‘편집기 새 창으로 열기’ 버튼을 누르면 지도 편집기가 별도 창으로 열립니다.",
  },
  {
    title: "지도가 나타나면 작업을 시작합니다",
    description:
      "데이터가 준비되면 지도와 레이어 패널이 보입니다. 권역 도형을 확인하고 필요한 부분을 선택해 다듬을 수 있습니다.",
  },
];

type FlowNode = {
  description: string;
  icon: LucideIcon;
  label: string;
};

const flow: FlowNode[] = [
  { description: "여기서 사용법을 읽습니다.", icon: BookOpen, label: "Docs" },
  { description: "편집기를 새 창으로 엽니다.", icon: Rocket, label: "Demo" },
  {
    description: "지도에서 도형을 다듬습니다.",
    icon: PencilRuler,
    label: "Editor",
  },
];

type NextDoc = {
  badge?: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  title: string;
};

const nextDocs: NextDoc[] = [
  {
    description: "부모 서비스 없이 편집기를 바로 띄워 보는 예시 페이지입니다.",
    href: "/demo",
    icon: MousePointer2,
    title: "데모에서 직접 실행",
  },
  {
    description:
      "지도 영역, 레이어 패널, 도구 레일이 화면에서 어떻게 배치되는지 설명합니다.",
    href: "/screen",
    icon: PanelsTopLeft,
    title: "편집기 화면 구성",
  },
  {
    description: "선택·정점 편집·그리기·반경·폴리곤 연산을 단계별로 안내합니다.",
    href: "/editing",
    icon: PencilRuler,
    title: "도형 편집 방법",
  },
  {
    description: "부모 서비스와 scene을 주고받는 postMessage 규약을 정리합니다.",
    href: "/integration",
    icon: Send,
    title: "postMessage 연동",
  },
];

function HeroFlow() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_22px_48px_-30px_rgba(15,118,110,0.5)]">
      <DocsEyebrow>화면 흐름</DocsEyebrow>
      <ul className="m-0 mt-4 flex list-none flex-col p-0">
        {flow.map((node, index) => {
          const Icon = node.icon;
          const isLast = index === flow.length - 1;

          return (
            <li
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3"
              key={node.label}
            >
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
                </span>
                {isLast ? null : (
                  <span aria-hidden="true" className="my-1 w-px flex-1 bg-line" />
                )}
              </div>
              <div className={isLast ? "pt-1.5" : "pb-4 pt-1.5"}>
                <DocsHeading level={3}>{node.label}</DocsHeading>
                <DocsText className="mt-0.5" variant="small">
                  {node.description}
                </DocsText>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 대메뉴 ‘시작하기’ 페이지. 편집기를 여는 흐름과 다음 문서를 안내합니다.
export function DocsStartPage() {
  return (
    <DocsArticle>
      <DocsHero
        actions={
          <>
            <DocsButton icon={ArrowRight} to="/demo">
              데모에서 시작하기
            </DocsButton>
            <DocsButton to="/editor" variant="secondary">
              편집기 미리보기
            </DocsButton>
          </>
        }
        aside={<HeroFlow />}
        description="지도 편집기는 데모 페이지에서 새 창으로 열어 사용합니다. 편집기가 열리면 지도 위에 권역 도형과 레이어 패널이 표시되고, 도형을 확인하거나 경계선을 다듬을 수 있습니다."
        eyebrow="사용자 안내"
        id="start-editor"
        title="지도 편집기 열기"
      />

      <DocsSection
        description="세 단계면 충분합니다. 데모에서 편집기를 열고 바로 작업을 시작하세요."
        eyebrow="시작 단계"
        id="steps"
        title="세 단계로 시작하기"
      >
        <Steps items={steps} />
        <Callout className="mt-6" title="팝업 차단을 확인하세요" tone="warning">
          편집기는 새 창(팝업)으로 열립니다. 창이 뜨지 않으면 브라우저 주소창의 팝업
          차단 아이콘에서 이 사이트를 허용해 주세요.
        </Callout>
      </DocsSection>

      <DocsSection
        description="화면 구성부터 실제 편집, 부모창 연동까지 필요한 안내를 골라 확인합니다."
        eyebrow="더 알아보기"
        id="explore"
        title="다음 문서"
      >
        <DocsCardGrid>
          {nextDocs.map((doc) => (
            <DocsCard
              eyebrow={doc.badge}
              href={doc.href}
              icon={doc.icon}
              key={doc.title}
              title={doc.title}
            >
              {doc.description}
            </DocsCard>
          ))}
        </DocsCardGrid>
      </DocsSection>
    </DocsArticle>
  );
}
