import {
  ArrowRight,
  Blend,
  CircleDot,
  Layers,
  MousePointer2,
  PenTool,
} from "lucide-react";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCard,
  DocsCardGrid,
  DocsCode,
  DocsHero,
  DocsKbd,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsStrong,
  Steps,
} from "./components";

const editingAreas = [
  {
    description: "하나 또는 여러 도형을 고르고 정점이나 도형 전체를 움직입니다.",
    href: "#select-move",
    icon: MousePointer2,
    title: "선택과 이동",
  },
  {
    description: "폴리곤·패스·마커를 새 레이어로 만들고 반경 폴리곤을 추가합니다.",
    href: "#create-shapes",
    icon: PenTool,
    title: "새 도형 만들기",
  },
  {
    description: "겹치는 폴리곤을 병합하거나 빼고, 겹친 면만 남깁니다.",
    href: "#combine",
    icon: Blend,
    title: "폴리곤 연산",
  },
  {
    description: "이름·잠금·표시 순서를 정리하고 결과를 부모창에 반환합니다.",
    href: "#layer-actions",
    icon: Layers,
    title: "레이어와 완료",
  },
];

const selectionSteps = [
  {
    title: "선택 도구에서 도형을 클릭합니다",
    description:
      "지도 도형이나 레이어 행을 클릭하면 그 도형 하나가 선택됩니다. 같은 레이어 행을 다시 누르면 선택이 해제됩니다.",
  },
  {
    title: "여러 도형은 보조키로 추가합니다",
    description:
      "Cmd(macOS) 또는 Ctrl(Windows/Linux)을 누른 채 지도나 레이어 행을 클릭하면 기존 선택을 유지하면서 도형을 추가하거나 뺍니다.",
  },
  {
    title: "도형 전체는 보조키를 누른 채 드래그합니다",
    description:
      "선택한 편집 가능 도형의 몸통을 Cmd/Ctrl과 함께 드래그합니다. 일반 드래그는 지도를 움직일 뿐 geometry를 바꾸지 않습니다.",
  },
];

const drawRows = [
  ["마커", "지도 한 곳을 클릭하면 즉시 완성됩니다."],
  ["패스", "정점 2개 이상에서 ‘패스 완료’ 또는 Enter로 완성합니다."],
  [
    "폴리곤",
    "서로 다른 정점 3개 이상에서 시작점을 다시 클릭하거나 ‘폴리곤 닫기’ 또는 Enter로 완성합니다.",
  ],
] as const;

const shortcutRows = [
  ["실행 취소", "Cmd/Ctrl + Z"],
  ["다시 실행", "Cmd/Ctrl + Shift + Z · Windows에서는 Ctrl + Y도 가능"],
  ["다중 선택", "Cmd/Ctrl + 클릭"],
  ["선택 도형 이동", "Cmd/Ctrl + 몸통 드래그"],
  ["선택 도형 복사·붙여넣기", "Cmd/Ctrl + C · Cmd/Ctrl + V"],
  ["그리기 완료", "패스·폴리곤에서 Enter"],
  ["그리기 취소 확인", "그리기 중 Escape"],
] as const;

// 사용자가 편집기 안에서 도형을 선택·수정·생성하고 부모창으로 반환하는 실제 동작 안내입니다.
export function DocsEditingPage() {
  return (
    <DocsArticle>
      <DocsHero
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            데모에서 따라 하기
          </DocsButton>
        }
        description="기본 선택부터 정점 수정, 새 도형과 반경 생성, 폴리곤 연산, 저장까지 현재 편집기가 지원하는 동작을 실제 순서대로 안내합니다."
        eyebrow="사용자 가이드"
        id="editing-overview"
        title="도형 편집 방법"
      />

      <DocsCardGrid>
        {editingAreas.map((area) => (
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
        description="기본 선택 도구에서는 지도와 레이어 패널이 같은 선택 상태를 공유합니다."
        eyebrow="기본 조작"
        id="select-move"
        title="도형 선택과 전체 이동"
      >
        <Steps items={selectionSteps} />
        <Callout className="mt-6" title="잠긴 도형도 선택할 수 있습니다" tone="note">
          잠금 또는 읽기 전용 도형은 참고 대상으로 선택할 수 있지만 정점 편집과
          이동에서는 제외됩니다. 여러 도형을 선택해 이동할 때도 편집 가능한 도형만
          움직입니다.
        </Callout>
        <DocsList className="mt-6">
          <DocsListItem>
            선택한 도형은 <DocsKbd>Cmd/Ctrl + C</DocsKbd>로 복사하고{" "}
            <DocsKbd>Cmd/Ctrl + V</DocsKbd>로 새 도형에 붙여넣을 수 있습니다. 새 id가
            부여되고 잠금은 해제됩니다.
          </DocsListItem>
          <DocsListItem>
            여러 도형을 함께 복사하면 현재 위아래 표시 순서가 붙여넣은 도형에도
            유지됩니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>

      <DocsSection
        description="선택 도구에서 보이고 잠금 해제된 편집 가능 도형을 정확히 하나 선택하면 정점 편집이 즉시 활성화됩니다."
        eyebrow="형태 수정"
        id="vertices"
        title="정점 추가·이동·삭제"
      >
        <DocsList>
          <DocsListItem>기존 정점을 드래그하면 해당 정점이 이동합니다.</DocsListItem>
          <DocsListItem>
            도형의 선 위에서 <DocsStrong>클릭하여 정점 추가</DocsStrong> 힌트가 보일 때
            클릭하면 새 정점이 들어갑니다.
          </DocsListItem>
          <DocsListItem>
            정점 위에서 <DocsStrong>우클릭하여 정점 삭제</DocsStrong> 힌트가 보일 때
            우클릭하면 정점이 제거됩니다.
          </DocsListItem>
          <DocsListItem>
            다중 선택 상태에서는 정점 핸들이 숨겨집니다. 도형 하나만 남기면 다시
            나타납니다.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="되돌리기 범위" tone="tip">
          정점 이동·추가·삭제와 도형 전체 이동은 각각 한 번의 편집으로 기록됩니다.{" "}
          <DocsKbd>Cmd/Ctrl + Z</DocsKbd>로 되돌릴 수 있습니다.
        </Callout>
      </DocsSection>

      <DocsSection
        description="레이어 패널은 도형 하나당 행 하나를 보여주며, 목록의 맨 위가 지도에서도 가장 앞입니다."
        eyebrow="스택 관리"
        id="layer-actions"
        title="이름·표시·잠금·순서 정리"
      >
        <DocsList>
          <DocsListItem>
            눈 아이콘으로 지도 표시를 켜고 끕니다. 숨겨도 반환 데이터에서 제거되지는
            않습니다.
          </DocsListItem>
          <DocsListItem>
            자물쇠로 편집 가능 여부를 바꿉니다. 잠근 도형은 선택만 가능하고 이동·정점
            편집·이름 변경·삭제는 할 수 없습니다.
          </DocsListItem>
          <DocsListItem>
            연필 아이콘으로 이름을 바꿉니다. 앞뒤 공백을 제외한 1–100자를 입력하고{" "}
            <DocsKbd>Enter</DocsKbd> 또는 체크 버튼으로 저장합니다.
          </DocsListItem>
          <DocsListItem>
            오른쪽 끌기 핸들로 행을 옮겨 표시 순서를 바꿉니다. 키보드는 핸들에 포커스를
            둔 뒤 <DocsKbd>Space</DocsKbd>로 잡고 방향키로 이동한 다음 다시{" "}
            <DocsKbd>Space</DocsKbd>로 놓습니다.
          </DocsListItem>
          <DocsListItem>
            휴지통은 그리기·반경·경계 추가·붙여넣기로 에디터에서 만든 잠금 해제 도형에만
            표시됩니다. 부모창이 전달한 원본에는 삭제 버튼이 없습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>

      <DocsSection
        description="왼쪽 그리기 도구를 누르고 폴리곤·패스·마커 중 하나를 고릅니다. 완성된 도형은 최상단 새 레이어에 추가됩니다."
        eyebrow="추가"
        id="create-shapes"
        title="새 도형 그리기"
      >
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-ink-soft">
              <tr>
                <th className="border-b border-line px-4 py-3 font-black">도형</th>
                <th className="border-b border-line px-4 py-3 font-black">완성 방법</th>
              </tr>
            </thead>
            <tbody>
              {drawRows.map(([shape, completion]) => (
                <tr className="border-b border-line last:border-b-0" key={shape}>
                  <td className="px-4 py-3 font-black text-ink">{shape}</td>
                  <td className="px-4 py-3 text-ink-muted">{completion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocsList className="mt-6">
          <DocsListItem>
            그리는 중에는 <DocsKbd>Cmd/Ctrl + Z</DocsKbd>와 다시 실행이 완성된 scene이
            아니라 현재 스케치의 정점을 먼저 다룹니다.
          </DocsListItem>
          <DocsListItem>
            <DocsKbd>Escape</DocsKbd>를 누르거나 다른 도구·도형으로 바꾸면 지금까지 찍은
            점을 버릴지 확인합니다.
          </DocsListItem>
          <DocsListItem>
            키보드로 그릴 때는 지도에 포커스를 둔 뒤 <DocsKbd>K</DocsKbd>로 조준 모드를
            켜고, 방향키로 중심을 옮긴 다음 <DocsKbd>Space</DocsKbd>로 정점을
            추가합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>

      <DocsSection
        description="마커 좌표를 중심으로 지표면 거리 기준의 원형 Polygon을 새 레이어로 만듭니다."
        eyebrow="거리 도구"
        id="radius"
        title="마커에서 반경 폴리곤 만들기"
      >
        <div className="mb-6 max-w-[680px] rounded-xl border border-brand-line bg-brand-soft/50 p-5">
          <CircleDot aria-hidden className="mb-3 text-brand" size={24} />
          <DocsList>
            <DocsListItem>
              마커를 먼저 선택하고 <DocsStrong>반경</DocsStrong>을 누르면 입력창이 바로
              열립니다.
            </DocsListItem>
            <DocsListItem>
              선택 없이 <DocsStrong>반경</DocsStrong>을 누른 경우 지도나 레이어에서 마커
              한 개를 고르면 입력창이 열립니다. 잠긴 마커도 기준점으로 사용할 수
              있습니다.
            </DocsListItem>
          </DocsList>
        </div>
        <DocsList>
          <DocsListItem>
            입력 범위는 <DocsStrong>0.01–1,000km</DocsStrong>이며 소수점 이하 두
            자리까지 허용합니다.
          </DocsListItem>
          <DocsListItem>
            입력 중에는 지도에 미리보기만 표시됩니다.{" "}
            <DocsStrong>원형 폴리곤 추가</DocsStrong>를 누를 때 새 레이어와 history 한
            단계가 만들어집니다.
          </DocsListItem>
          <DocsListItem>
            생성된 도형 이름은 <DocsCode>반경 1.25 km</DocsCode>처럼 지정되고, 기준
            마커와 입력 거리도 properties에 보존됩니다.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="지원하지 않는 지리 범위" tone="warning">
          현재는 날짜변경선 또는 극점을 지나는 원을 추가할 수 없습니다. 오류가 나타나면
          반경을 줄여 다시 시도하세요.
        </Callout>
      </DocsSection>

      <DocsSection
        description="선택 도구에서 편집 가능한 폴리곤 하나를 선택하면 화면 안의 다른 폴리곤에 연산 버튼이 나타납니다."
        eyebrow="불리언 연산"
        id="combine"
        title="폴리곤 병합·차집합·교집합"
      >
        <DocsList>
          <DocsListItem>
            <DocsStrong>+</DocsStrong> 병합은 선택 도형과 상대 도형을 하나로 합치고 상대
            레이어를 제거합니다.
          </DocsListItem>
          <DocsListItem>
            <DocsStrong>−</DocsStrong> 제거는 선택 도형에서 겹치는 부분을 빼며 상대
            도형은 그대로 둡니다. 실제로 겹칠 때만 버튼이 보입니다.
          </DocsListItem>
          <DocsListItem>
            교집합 버튼은 선택 도형을 두 도형이 겹치는 면으로 바꾸고 상대 도형은 그대로
            둡니다. 이 버튼도 실제로 겹칠 때만 보입니다.
          </DocsListItem>
          <DocsListItem>
            경계 도구에서 행정동·법정동·우편 경계를 고르면 지도에서 경계를 확인할 수
            있습니다. 선택 폴리곤이 없을 때 <DocsStrong>+</DocsStrong>는 경계를 새
            도형으로 추가하고, 선택 폴리곤이 있으면 병합 또는 겹친 부분 제거를
            수행합니다.
          </DocsListItem>
        </DocsList>
        <Callout className="mt-6" title="연산 기준은 선택 도형입니다" tone="note">
          병합을 제외한 제거·교집합은 상대 도형을 바꾸지 않습니다. 결과가 예상과 다르면{" "}
          <DocsKbd>Cmd/Ctrl + Z</DocsKbd>로 한 단계 되돌리세요.
        </Callout>
      </DocsSection>

      <DocsSection
        description="하단 완료 바는 현재 편집 결과를 부모창으로 보내는 마지막 단계입니다."
        eyebrow="반환"
        id="finish"
        title="저장하고 완료하거나 취소하기"
      >
        <DocsList>
          <DocsListItem>
            <DocsStrong>저장하고 완료</DocsStrong>를 누르면 이름·표시 순서·geometry를
            포함한 공개 v2 scene이 부모창에 <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>으로
            전달됩니다.
          </DocsListItem>
          <DocsListItem>
            진행 중인 그리기·반경 입력·경계 연산·이름 변경 또는 유효하지 않은 도형이
            있으면 완료할 수 없습니다. 하단 안내에 따라 먼저 정리합니다.
          </DocsListItem>
          <DocsListItem>
            변경 후 <DocsStrong>취소</DocsStrong>하면 확인을 거쳐{" "}
            <DocsCode>MAP_EDITOR_CANCEL</DocsCode>만 전달하며 scene은 반환하지 않습니다.
          </DocsListItem>
        </DocsList>

        <div className="mt-8 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[660px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-ink-soft">
              <tr>
                <th className="border-b border-line px-4 py-3 font-black">동작</th>
                <th className="border-b border-line px-4 py-3 font-black">키보드</th>
              </tr>
            </thead>
            <tbody>
              {shortcutRows.map(([action, shortcut]) => (
                <tr className="border-b border-line last:border-b-0" key={action}>
                  <td className="px-4 py-3 font-bold text-ink">{action}</td>
                  <td className="px-4 py-3 text-ink-muted">{shortcut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <DocsButton icon={ArrowRight} to="/demo">
            데모에서 편집하기
          </DocsButton>
          <DocsButton to="/integration" variant="secondary">
            부모창 연동 보기
          </DocsButton>
        </div>
      </DocsSection>
    </DocsArticle>
  );
}
