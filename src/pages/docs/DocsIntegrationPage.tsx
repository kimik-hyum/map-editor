import { ArrowRight } from "lucide-react";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsStrong,
  DocsText,
  Steps,
} from "./components";
import {
  messageSchemaExample,
  parentHostExample,
  resultUsageExample,
  sceneInputExample,
} from "./content/parentIntegrationExamples";

const hostSteps = [
  {
    title: "메시지 수신기를 먼저 등록합니다",
    description:
      "부모창은 message 이벤트를 받을 준비를 마친 뒤, 사용자 클릭으로 편집기 URL을 새 창에 엽니다.",
  },
  {
    title: "READY에 INIT으로 응답합니다",
    description:
      "내가 연 팝업과 정확한 origin인지 확인하고, 팝업마다 유지되는 sessionId와 편집할 v2 scene을 전달합니다.",
  },
  {
    title: "완료 메시지를 검증합니다",
    description:
      "SUBMIT 또는 CANCEL의 구조와 sessionId를 확인합니다. 다른 창·origin·세션에서 온 메시지는 무시합니다.",
  },
  {
    title: "결과를 부모 상태에 반영합니다",
    description:
      "SUBMIT의 scene을 다음 편집 기준으로 보관하고 부모 지도·폼에 적용합니다. CANCEL이면 기존 데이터를 유지합니다.",
  },
];

const messageRows = [
  ["MAP_EDITOR_READY", "편집기 → 부모", "연결 준비 완료. geometry나 sessionId 없음"],
  ["MAP_EDITOR_INIT", "부모 → 편집기", "sessionId와 EditorSceneInput v2"],
  ["MAP_EDITOR_SUBMIT", "편집기 → 부모", "같은 sessionId와 편집된 공개 v2 scene"],
  ["MAP_EDITOR_CANCEL", "편집기 → 부모", "같은 sessionId. scene은 반환하지 않음"],
  ["MAP_EDITOR_ERROR", "편집기 → 부모", "검증 실패 메시지와 선택적 issues"],
] as const;

// 부모 애플리케이션이 편집기를 새 창으로 열고 데이터를 왕복시키는 공개 연동 문서입니다.
export function DocsIntegrationPage() {
  return (
    <DocsArticle>
      <DocsHero
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            실제 데모 실행
          </DocsButton>
        }
        description="부모창은 편집기 팝업을 열고, READY 신호를 받은 뒤 편집할 GeoJSON scene을 전달합니다. 사용자가 완료하면 검증된 공개 v2 scene을 돌려받아 부모 화면의 상태로 사용합니다."
        eyebrow="postMessage API"
        id="integration-overview"
        title="부모창 연동"
      />

      <DocsSection
        description="편집기는 geometry를 편집하고 결과를 반환합니다. 팝업 생명주기와 데이터 소유권은 부모창이 관리합니다."
        eyebrow="역할 분리"
        id="host-flow"
        title="부모창이 해야 할 네 가지"
      >
        <Steps items={hostSteps} />
        <Callout className="mt-6" title="두 조건을 항상 같이 확인하세요" tone="warning">
          수신 메시지는 <DocsCode>event.source === editorWindow</DocsCode>와{" "}
          <DocsCode>event.origin === editorOrigin</DocsCode>을 모두 만족해야 합니다.
          INIT과 완료 메시지는 빈 값이 아닌 동일한 <DocsCode>sessionId</DocsCode>로
          연결합니다.
        </Callout>
      </DocsSection>

      <DocsSection
        description="INIT의 scene은 내부 레이어 구조를 알 필요가 없는 공개 형식입니다. 필수 값은 version과 features이며, 각 feature에서는 geometry만 필수입니다."
        eyebrow="입력"
        id="scene-input"
        title="편집할 scene 만들기"
      >
        <DocsCodeBlock
          code={sceneInputExample}
          language="json"
          title="input-scene.json"
        />
        <DocsList className="mt-6">
          <DocsListItem>
            <DocsCode>version</DocsCode>은 현재 <DocsStrong>2</DocsStrong>입니다.
          </DocsListItem>
          <DocsListItem>
            지원 geometry는 Point, MultiPoint, LineString, MultiLineString, Polygon,
            MultiPolygon입니다.
          </DocsListItem>
          <DocsListItem>
            <DocsCode>locked: true</DocsCode>인 도형은 참고용으로 표시되며, 부모가
            잠금을 풀어 전달하기 전까지 수정할 수 없습니다.
          </DocsListItem>
          <DocsListItem>
            features 배열의 뒤쪽 도형이 지도에서 위에 그려집니다. 반환 배열도 이 표시
            순서를 보존합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>

      <DocsSection
        description="postMessage의 event.data는 신뢰할 수 없는 unknown입니다. TypeScript 타입만 단언하지 말고 런타임 스키마를 통과한 값만 사용합니다."
        eyebrow="검증"
        id="runtime-schema"
        title="공개 v2 결과 검증하기"
      >
        <DocsCodeBlock
          code={messageSchemaExample}
          language="typescript"
          title="editor-contract.ts"
        />
        <Callout className="mt-6" title="좌표 도메인 검증" tone="note">
          위 예제는 메시지 구조를 설명하기 위한 최소 스키마입니다. 실제 서비스에서는
          경도 -180~180, 위도 -90~90, Polygon ring 정점 수처럼 부모 도메인에 필요한 좌표
          규칙도 추가하세요.
        </Callout>
      </DocsSection>

      <DocsSection
        description="다음 코드는 특정 UI 프레임워크에 의존하지 않는 브라우저 TypeScript 예제입니다. YOUR_EDITOR_DOMAIN만 실제 배포 주소로 바꿉니다."
        eyebrow="전체 예제"
        id="host-code"
        title="팝업 열기부터 결과 수신까지"
      >
        <DocsCodeBlock
          code={parentHostExample}
          language="typescript"
          title="map-editor-host.ts"
        />
        <Callout
          className="mt-6"
          title="targetOrigin에는 *를 사용하지 않습니다"
          tone="warning"
        >
          READY는 데이터 없는 부트스트랩 신호이지만, 부모가 INIT을 보낼 때는 편집기
          URL에서 계산한 정확한 <DocsCode>editorOrigin</DocsCode>을 사용해야 합니다.
        </Callout>
      </DocsSection>

      <DocsSection
        description="SUBMIT의 scene은 다시 INIT으로 보낼 수 있는 동일한 공개 v2 형식입니다. 내부 레이어·선택·검증 상태는 포함되지 않습니다."
        eyebrow="반환값"
        id="use-result"
        title="받은 결과를 부모에서 사용하기"
      >
        <DocsCodeBlock
          code={resultUsageExample}
          language="typescript"
          title="parent-page.ts"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Callout title="SUBMIT" tone="tip">
            반환 scene 전체를 부모의 편집 초안으로 교체합니다. features를 GeoJSON
            FeatureCollection이나 부모 폼 모델로 변환해 지도에 다시 그릴 수 있습니다.
          </Callout>
          <Callout title="CANCEL" tone="note">
            취소 메시지에는 scene이 없습니다. 부모가 보관하던 기존 scene을 변경하지
            않습니다.
          </Callout>
        </div>
        <DocsText className="mt-5" tone="soft">
          에디터는 부모 서버에 직접 쓰지 않습니다. 영구 저장이 필요하면 SUBMIT을 검증한
          뒤 부모 서비스의 API 호출이나 폼 제출 단계에서 처리합니다.
        </DocsText>
      </DocsSection>

      <DocsSection
        description="현재 공개 연동에서 부모창이 처리할 메시지입니다."
        eyebrow="참조"
        id="message-reference"
        title="메시지 계약"
      >
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-ink-soft">
              <tr>
                <th className="border-b border-line px-4 py-3 font-black">메시지</th>
                <th className="border-b border-line px-4 py-3 font-black">방향</th>
                <th className="border-b border-line px-4 py-3 font-black">내용</th>
              </tr>
            </thead>
            <tbody>
              {messageRows.map(([type, direction, payload]) => (
                <tr className="border-b border-line last:border-b-0" key={type}>
                  <td className="px-4 py-3">
                    <DocsCode>{type}</DocsCode>
                  </td>
                  <td className="px-4 py-3 font-bold text-ink-soft">{direction}</td>
                  <td className="px-4 py-3 text-ink-muted">{payload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocsSection>
    </DocsArticle>
  );
}
