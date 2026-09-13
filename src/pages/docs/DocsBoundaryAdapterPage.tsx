import { Link } from "react-router";
import {
  Callout,
  DocsArticle,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";
import {
  adapterWiringExample,
  boundaryJsonExample,
  customServerExample,
  jsonAdapterExample,
  publicAccessExample,
} from "./content/boundaryAdapterExamples";

export function DocsBoundaryAdapterPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="경계 데이터 어댑터"
        eyebrow="내재화 안내"
        description="자신이 모은 행정동·법정동·커스텀 경계를 JSON이나 별도 서버에서 읽도록 연결합니다. 경계 조회와 인증 정책을 각각 교체하고, 편집기의 공통 데이터 계약을 유지합니다."
      />
      <DocsSection id="boundary" title="데이터 공급자와 접근 정책을 나눕니다">
        <DocsText>
          서비스가 <DocsCode>INIT.scene.features</DocsCode>로 보낸 폴리곤은 바로 편집할
          도형입니다. 이 페이지의 어댑터는 에디터 안에서 조회하고 골라 쓰는 참고 경계를
          공급합니다. 입력 scene에 경계를 넣는 것만으로 경계 선택 메뉴의 데이터가
          바뀌지는 않습니다.
        </DocsText>
        <DocsTable
          className="mt-4"
          label="데이터 흐름과 교체 지점"
          headers={["역할", "현재 구현", "내재화할 때"]}
          rows={[
            {
              key: "transport",
              cells: [
                "데이터 읽기·검증",
                "regionsApi.ts → Supabase regions 함수",
                "JSON·자체 HTTP API를 같은 조회 함수에 연결",
              ],
            },
            {
              key: "access",
              cells: [
                "경계 사용 허용·캐시 범위",
                "useBoundaryAccess → Google 사용자",
                "공개 데이터 또는 자체 인증의 allowed·subject",
              ],
            },
            {
              key: "prompt",
              cells: [
                "도구 진입 시 접근 요청",
                "useBoundaryLogin → Google 팝업",
                "즉시 허용 또는 자신의 로그인 과정",
              ],
            },
            {
              key: "render",
              cells: [
                "표시·채택·편집",
                "TanStack Query → OpenLayers → scene",
                "원래 흐름 유지. 선택한 원본 geometry만 scene에 반영",
              ],
            },
          ]}
        />
        <Callout className="mt-4" tone="note" title="현재 구현과 연결 예제">
          아래 코드는 내재화한 소스에 적용하는 어댑터 예제입니다. 기본 에디터에 자동
          등록되거나 환경 변수만으로 활성화되지 않습니다. 데이터 요청부와 인증 게이트를
          함께 바꾸어야 합니다.
        </Callout>
      </DocsSection>
      <DocsSection id="contract" title="조회 함수가 돌려줘야 하는 데이터">
        <DocsTable
          label="경계 어댑터 계약"
          headers={["기존 함수", "입력", "출력·책임"]}
          rows={[
            {
              key: "kinds",
              cells: [
                "fetchRegionKinds",
                "country, signal",
                "kind·label·level·min_zoom·sort_order·selectable 목록",
              ],
            },
            {
              key: "view",
              cells: [
                "fetchRegionsByView",
                "bbox·zoom·kind·country, signal",
                "FeatureCollection + country·kind·level·truncated",
              ],
            },
            {
              key: "id",
              cells: [
                "fetchRegionById",
                "boundaryId, signal",
                "표시한 Feature.id에 대응하는 원본 Feature 또는 null",
              ],
            },
            {
              key: "code",
              cells: [
                "fetchRegionByCode",
                "kind·code·country, signal",
                "코드로 조회한 원본 또는 null. 편집 채택은 byId 사용",
              ],
            },
            {
              key: "manifest",
              cells: [
                "fetchRegionTileManifest",
                "signal",
                "타일 메타데이터 또는 null. null이면 기존 byView 흐름 사용",
              ],
            },
            {
              key: "tile",
              cells: [
                "fetchRegionsByTile",
                "tile·manifest·zoom·kind, signal",
                "타일을 지원할 때만 메타데이터와 일치하는 경계 응답",
              ],
            },
          ]}
        />
        <DocsList className="mt-4">
          <DocsListItem>
            도형은 GeoJSON Polygon 또는 MultiPolygon이며 좌표는{" "}
            <DocsCode>[경도, 위도]</DocsCode>입니다. 링을 닫고, 서로 다른 정점 3개
            이상을 넣습니다.
          </DocsListItem>
          <DocsListItem>
            <DocsCode>Feature.id</DocsCode>는 전체 경계 데이터에서 유일하고 버전별
            원본을 식별해야 합니다. 화면 bbox마다 새 번호를 붙이거나 같은 ID의 원본을
            도중에 교체하지 마세요.
          </DocsListItem>
          <DocsListItem>
            지도 라벨은 <DocsCode>properties.name</DocsCode>입니다. 예제는{" "}
            <DocsCode>properties.kind</DocsCode>·<DocsCode>code</DocsCode>로
            필터링합니다. 도형의 kind와 종류 카탈로그를 일치시키세요.
          </DocsListItem>
          <DocsListItem>
            같은 조회를 나눠 호출해도 country·kind·level은 일치해야 합니다. 화면 표시용
            좌표를 단순화할 수 있지만, 채택할 때의 byId는 원본을 돌려줘야 합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="json" title="작은 데이터셋을 JSON으로 제공하기">
        <DocsText className="mb-4">
          아래는 실제 행정경계가 아닌 형식 설명용 사각형입니다. 자신의 경계로 바꿔{" "}
          <DocsCode>public/boundaries/regions.json</DocsCode>에 저장하면 같은 origin의{" "}
          <DocsCode>/boundaries/regions.json</DocsCode>으로 읽을 수 있습니다. 파일을
          두는 것에 더해 다음 어댑터 연결이 필요합니다.
        </DocsText>
        <DocsCodeBlock
          code={boundaryJsonExample}
          language="json"
          title="public/boundaries/regions.json 예시"
        />
        <DocsText className="mt-4">
          이 예제는 줌 12부터 행정동을 표시합니다. 법정동이나 자체 권역도 kinds에
          추가하고 해당 kind의 features를 넣으세요. 다른 기본 메뉴가 보이지 않게 하려면
          카탈로그 실패 시 사용하는 <DocsCode>regionKindModel.ts</DocsCode>의 fallback도
          자신의 종류에 맞춥니다.
        </DocsText>
        <details className="mt-4 min-w-0 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            JSON 어댑터 전체 코드
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={jsonAdapterExample}
            language="typescript"
            title="jsonBoundaryAdapter.ts로 복사할 예제"
          />
        </details>
        <DocsText className="mt-4">
          전체 파일을 읽고 bbox와 겹치는 도형을 고르는 작은 데이터셋용 예제입니다.
          도형을 화면 경계로 자르지 않으며 표시와 채택에 같은 원본을 사용합니다. 전국
          단위 데이터는 서버에서 bbox·종류·줌을 처리하고 원본 ID 조회를 분리하세요.
        </DocsText>
      </DocsSection>
      <DocsSection id="connect" title="기존 호출부에 어댑터 연결하기">
        <DocsList>
          <DocsListItem>
            전체 예제를 <DocsCode>features/regions/api/jsonBoundaryAdapter.ts</DocsCode>
            로 복사합니다. 예제의 타입은 현재 API 계약과 맞춰 검사됩니다.
          </DocsListItem>
          <DocsListItem>
            <DocsCode>regionsApi.ts</DocsCode>의 기존 여섯 조회 함수 구현을 아래
            위임으로 교체합니다. 같은 이름의 함수를 중복 선언하지 말고, 기존 타입과{" "}
            <DocsCode>RegionApiError</DocsCode> export는 유지합니다.
          </DocsListItem>
          <DocsListItem>
            Google·Supabase 요청 helper와 호출 코드가 더 이상 쓰이지 않으면 이 어댑터
            경로에서 제거합니다. 두 공급자를 유지하려면 각각 별도 구현에 두고, 이 API
            진입점에서 선택합니다.
          </DocsListItem>
        </DocsList>
        <DocsCodeBlock
          className="mt-4"
          code={adapterWiringExample}
          language="typescript"
          title="regionsApi.ts의 조회 함수 교체"
        />
        <DocsText className="mt-4">
          별도 서버도 같은 함수 계약에 맞춰 응답을 변환하면 됩니다. 자체 인증의 쿠키나
          토큰은 이 서버 어댑터에서 처리하며, Google 토큰을 요구할 필요는 없습니다.
        </DocsText>
        <DocsCodeBlock
          className="mt-4"
          code={customServerExample}
          language="typescript"
          title="자체 서버의 요청부 예시 (응답 검증은 별도)"
        />
      </DocsSection>
      <DocsSection id="access" title="로그인 없이 사용하거나 자체 인증 연결하기">
        <DocsText className="mb-4">
          공개 JSON 배포는 아래처럼 허용 상태와 데이터 범위를 반환할 수 있습니다.{" "}
          <DocsCode>subject</DocsCode>는 인증 토큰이 아니라 Query 캐시를 구분하는
          값이며, 비어 있으면 조회·원본 채택이 실행되지 않습니다.
        </DocsText>
        <DocsCodeBlock
          code={publicAccessExample}
          language="typescript"
          title="공개 데이터용 접근 정책"
        />
        <DocsList className="mt-4">
          <DocsListItem>
            사내 인증을 쓴다면 <DocsCode>allowed</DocsCode>는 실제 로그인·권한에서,{" "}
            <DocsCode>subject</DocsCode>는 사용자·테넌트·데이터 버전에서 정합니다. 변경
            시 이전 범위의 캐시가 섞이지 않게 하세요.
          </DocsListItem>
          <DocsListItem>
            Google UI를 완전히 제거하려면 <DocsCode>AuthSessionButton</DocsCode>과{" "}
            <DocsCode>/auth/callback</DocsCode>을 제거·교체하고, 모든{" "}
            <DocsCode>useAuth</DocsCode> 소비처를 바꾼 뒤{" "}
            <DocsCode>AppProviders</DocsCode>의 기존 <DocsCode>AuthProvider</DocsCode>를
            정리합니다. Provider만 먼저 삭제하면 소비 hook이 오류를 냅니다.
          </DocsListItem>
          <DocsListItem>
            로그인 없는 구성에서도 서비스 메시지의 origin·세션 검증과 geometry 검증은
            유지합니다. 기본 운영 서버의 인증을 끄는 것이 아니라 자신의 데이터 공급자와
            접근 정책을 연결하는 작업입니다.
          </DocsListItem>
          <DocsListItem>
            <DocsCode>VITE_E2E_AUTH_BYPASS</DocsCode>는 테스트 전용입니다. 운영 인증
            선택 스위치로 사용하지 않습니다. 기본 구성을 유지할 때만{" "}
            <Link to="/authentication">Google·Supabase 설정</Link>을 적용하세요.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="verify" title="데이터를 바꾼 뒤 확인할 흐름">
        <DocsList>
          <DocsListItem>
            선택 가능한 종류와 라벨이 자신의 카탈로그에서 표시되는지 확인합니다.
          </DocsListItem>
          <DocsListItem>
            bbox·줌·종류 변경, 데이터 없음, 중단한 요청, 잘못된 JSON 응답을 확인합니다.
          </DocsListItem>
          <DocsListItem>
            낮은 줌에서 manifest null → byView로 이어지고, 예제는 줌 12 이상에서 경계가
            나타나는지 확인합니다.
          </DocsListItem>
          <DocsListItem>
            참고 경계의 추가·합치기·빼기가 같은 ID의 원본을 사용하고 undo가 동작하는지
            확인합니다.
          </DocsListItem>
          <DocsListItem>
            저장 시 선택해 반영한 도형만 전체 scene에 포함되고, 참고 경계 목록이나 인증
            정보는 반환되지 않는지 확인합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
    </DocsArticle>
  );
}
