import {
  ArrowRight,
  CheckCircle2,
  Layers,
  MapPin,
  SquareMousePointer,
} from "lucide-react";
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
    description: "도형 스택을 선택·잠금·이름 변경·재정렬하는 플로팅 패널입니다.",
    href: "#layer-panel",
    icon: Layers,
    title: "레이어 패널",
  },
  {
    description: "선택·그리기·경계·반경 중 활성 도구를 고르는 왼쪽 레일입니다.",
    href: "#tools",
    icon: SquareMousePointer,
    title: "도구 레일",
  },
  {
    description: "편집 결과를 부모창으로 반환하거나 작업을 취소하는 하단 바입니다.",
    href: "#completion-bar",
    icon: CheckCircle2,
    title: "완료 바",
  },
];

// 대메뉴 ‘화면 구성’ 페이지. 편집기 화면의 네 영역을 차례로 설명합니다.
export function DocsScreenPage() {
  return (
    <DocsArticle>
      <DocsHero
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            데모에서 직접 열어 보기
          </DocsButton>
        }
        description="편집기는 지도 한 화면 위에 패널이 떠 있는 구조입니다. 가운데 지도가 작업 영역을 채우고, 왼쪽 도구 레일과 레이어 패널이 그 위에 겹쳐집니다. 하단에서는 결과를 저장하거나 취소합니다."
        eyebrow="화면 안내"
        id="overview"
        title="편집기 화면 구성"
      />

      <DocsCardGrid className="sm:grid-cols-2 lg:grid-cols-4">
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
            편집 가능한 도형 한 개가 선택되면 외곽선의 정점을 바로 다듬을 수 있습니다.
          </DocsListItem>
          <DocsListItem>
            외곽선을 편집할 때는 커서 옆에 힌트가 따라다닙니다 —{" "}
            <DocsStrong>클릭하여 정점 추가</DocsStrong>,{" "}
            <DocsStrong>우클릭하여 정점 삭제</DocsStrong>.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="실수해도 괜찮습니다" tone="tip">
          <DocsKbd>Cmd/Ctrl + Z</DocsKbd>로 되돌리고,{" "}
          <DocsKbd>Cmd/Ctrl + Shift + Z</DocsKbd>로 다시 실행합니다. geometry·이름·도형
          추가/삭제·불리언 연산처럼 부모창으로 반환될 변경은 기록되고, 선택·호버·패널
          위치 같은 화면 상태는 기록되지 않습니다.
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
            도형 하나가 행 하나인 평탄한 스택입니다. 목록의 맨 위 도형이 지도에서도 가장
            앞에 그려집니다.
          </DocsListItem>
          <DocsListItem>
            행 본문을 누르면 선택되고, <DocsKbd>Cmd/Ctrl</DocsKbd>을 누른 채 클릭하면
            여러 도형을 추가하거나 뺄 수 있습니다.
          </DocsListItem>
          <DocsListItem>
            눈 아이콘은 표시 여부를, 자물쇠는 편집 가능 여부를 바꿉니다. 잠긴 도형도
            선택은 가능하지만 이동·정점 편집은 할 수 없습니다.
          </DocsListItem>
          <DocsListItem>
            연필로 1–100자 이름을 바꾸고, 끌기 핸들로 표시 순서를 바꿉니다. 휴지통은
            에디터에서 새로 만든 잠금 해제 도형에만 표시됩니다.
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
          <DocsListItem>
            반경 도구는 선택한 마커를 중심으로 거리 입력 팝업을 열어 원형 폴리곤을
            추가합니다.
          </DocsListItem>
        </DocsList>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <DocsButton icon={ArrowRight} to="/editing">
            편집 동작 자세히 보기
          </DocsButton>
        </div>
      </DocsSection>

      <DocsSection
        description="화면 하단의 흰색 고정 영역에서 현재 작업을 부모창으로 반환하거나 취소합니다."
        eyebrow="완료"
        id="completion-bar"
        title="완료 바"
      >
        <DocsList>
          <DocsListItem>
            <DocsStrong>저장하고 완료</DocsStrong>는 현재 공개 v2 scene을 부모창에
            전송합니다.
          </DocsListItem>
          <DocsListItem>
            <DocsStrong>취소</DocsStrong>는 결과 없이 작업을 끝냅니다. 반환할 폴리곤이
            없거나 완료를 막는 진행 중 작업이 있을 때는 왼쪽에 안내가 표시됩니다.
          </DocsListItem>
          <DocsListItem>
            그리기·반경 입력·경계 조회 연산·이름 변경이 진행 중이면 먼저 해당 작업을
            완료하거나 취소해야 합니다.
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
