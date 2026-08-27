import { ArrowRight, Layers, MapPin, SquareMousePointer } from "lucide-react";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCard,
  DocsCardGrid,
  DocsHero,
  DocsKbd,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsStrong,
} from "./components";

const screenAreas = [
  {
    description: "OSM 지도가 화면 전체를 채우고, 권역 도형이 그 위에 그려집니다.",
    href: "#map-area",
    icon: MapPin,
    title: "지도 영역",
  },
  {
    description: "레이어와 도형 목록을 확인하고 표시 여부를 켜고 끕니다.",
    href: "#layer-panel",
    icon: Layers,
    title: "레이어 패널",
  },
  {
    description: "선택·그리기 같은 활성 도구를 고르는 왼쪽 세로 레일입니다.",
    href: "#tools",
    icon: SquareMousePointer,
    title: "도구 레일",
  },
];

// 대메뉴 ‘화면 구성’ 페이지. 편집기 화면의 세 영역을 차례로 설명합니다.
export function DocsScreenPage() {
  return (
    <DocsArticle>
      <DocsHero
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            데모에서 직접 열어 보기
          </DocsButton>
        }
        description="편집기는 지도 한 화면 위에 패널이 떠 있는 구조입니다. 가운데 지도가 전체를 채우고, 왼쪽 도구 레일과 레이어 패널이 그 위에 겹쳐집니다. 각 영역이 무엇을 하는지 아래에서 차례로 살펴봅니다."
        eyebrow="화면 안내"
        id="overview"
        title="편집기 화면 구성"
      />

      <DocsCardGrid className="sm:grid-cols-3">
        {screenAreas.map((area) => (
          <DocsCard
            href={area.href}
            icon={area.icon}
            key={area.title}
            title={area.title}
          >
            {area.description}
          </DocsCard>
        ))}
      </DocsCardGrid>

      <DocsSection
        description="지도는 화면 전체를 사용하며, 활성 도구에 따라 클릭의 의미가 달라집니다."
        eyebrow="지도"
        id="map-area"
        title="지도 영역"
      >
        <DocsList>
          <DocsListItem>
            OSM 베이스맵 위에 부모 서비스가 전달한 권역 도형이 표시됩니다.
          </DocsListItem>
          <DocsListItem>
            기본 도구는 <DocsStrong>선택</DocsStrong>입니다. 도형을 클릭해 선택하고,
            외곽선의 정점을 끌어 모양을 다듬습니다.
          </DocsListItem>
          <DocsListItem>
            외곽선을 편집할 때는 커서 옆에 힌트가 따라다닙니다 —{" "}
            <DocsStrong>클릭하여 정점 추가</DocsStrong>,{" "}
            <DocsStrong>우클릭하여 정점 삭제</DocsStrong>.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="실수해도 괜찮습니다" tone="tip">
          <DocsKbd>Cmd/Ctrl + Z</DocsKbd>로 되돌리고,{" "}
          <DocsKbd>Cmd/Ctrl + Shift + Z</DocsKbd>로 다시 실행합니다. 도형(geometry)
          변경만 기록되므로 패널 이동이나 표시 토글은 영향을 받지 않습니다.
        </Callout>
      </DocsSection>

      <DocsSection
        description="장면(scene)에 담긴 레이어와 도형을 한눈에 보고 정리하는 패널입니다."
        eyebrow="패널"
        id="layer-panel"
        title="레이어 패널"
      >
        <DocsList>
          <DocsListItem>
            드래그로 옮기고 모서리를 끌어 크기를 조절할 수 있는 플로팅 패널입니다.
          </DocsListItem>
          <DocsListItem>
            <DocsStrong>레이어</DocsStrong> 탭은 레이어 단위 목록을,{" "}
            <DocsStrong>도형</DocsStrong> 탭은 도형 단위 요약을 보여줍니다.
          </DocsListItem>
          <DocsListItem>
            눈 아이콘으로 레이어·도형의 표시 여부를 켜고 끕니다. 가려 둔 항목은 지도에서
            잠시 사라질 뿐 데이터는 그대로 유지됩니다.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="패널이 비어 보인다면" tone="note">
          편집기는 부모 창의 데이터를 기다리는 동안{" "}
          <DocsStrong>“호스트(부모 창)에서 데이터를 기다리는 중…”</DocsStrong>을
          표시합니다. 데모 페이지에서 열면 샘플 scene이 자동으로 전달됩니다.
        </Callout>
      </DocsSection>

      <DocsSection
        description="화면 왼쪽의 세로 레일에서 활성 도구를 고릅니다. 활성 도구가 맵 클릭의 의미를 결정합니다."
        eyebrow="도구"
        id="tools"
        title="도구 레일"
      >
        <DocsList>
          <DocsListItem>
            도구는 한 번에 하나만 활성화되며, 활성 도구가 하이라이트로 표시됩니다.
          </DocsListItem>
          <DocsListItem>
            그리기·경계 도구는 버튼 옆에 하위 옵션 팝업이 열리고, 고른 옵션이 버튼
            아이콘과 이름에 반영됩니다.
          </DocsListItem>
        </DocsList>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <DocsButton icon={ArrowRight} to="/demo">
            데모에서 시작하기
          </DocsButton>
          <DocsButton to="/" variant="secondary">
            시작하기 문서로 돌아가기
          </DocsButton>
        </div>
      </DocsSection>
    </DocsArticle>
  );
}
