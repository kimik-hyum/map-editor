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
  messageSchemaExample,
  parentHostExample,
  resultUsageExample,
  inputSceneSource,
  sceneInputExample,
} from "./content/parentIntegrationExamples";

export function DocsIntegrationPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="부모 창 연동"
        eyebrow="postMessage · v2"
        description="부모는 팝업과 영구 저장을, 에디터는 도형 편집을 담당합니다. 일반 편집 연동에 Supabase 키나 로그인 토큰을 전달할 필요는 없습니다."
      />
      <DocsSection id="messages" title="메시지 흐름">
        <DocsText className="mb-4">
          수신기를 먼저 등록하고 사용자 클릭에서 팝업을 엽니다. READY를 받은 뒤 INIT을
          보내고, SUBMIT 또는 CANCEL을 처리합니다.
        </DocsText>
        <DocsTable
          label="메시지 계약"
          headers={["메시지", "방향", "필수 데이터·처리"]}
          rows={[
            {
              key: "ready",
              cells: [
                <DocsCode key="ready">MAP_EDITOR_READY</DocsCode>,
                "에디터 → 부모",
                "데이터 없는 준비 신호. 부모가 INIT으로 응답합니다.",
              ],
            },
            {
              key: "init",
              cells: [
                <DocsCode key="init">MAP_EDITOR_INIT</DocsCode>,
                "부모 → 에디터",
                "sessionId + scene. 새 INIT은 현재 편집·히스토리를 초기화합니다.",
              ],
            },
            {
              key: "submit",
              cells: [
                <DocsCode key="submit">MAP_EDITOR_SUBMIT</DocsCode>,
                "에디터 → 부모",
                "같은 sessionId + 전체 scene. 검증 후 부모 상태에 반영하고 팝업을 닫습니다.",
              ],
            },
            {
              key: "cancel",
              cells: [
                <DocsCode key="cancel">MAP_EDITOR_CANCEL</DocsCode>,
                "에디터 → 부모",
                "같은 sessionId. scene 없이 종료하며 기존 부모 데이터를 유지합니다.",
              ],
            },
            {
              key: "error",
              cells: [
                <DocsCode key="error">MAP_EDITOR_ERROR</DocsCode>,
                "에디터 → 부모",
                "message + 선택적 issues. sessionId가 없을 수 있습니다.",
              ],
            },
          ]}
        />
        <Callout className="mt-4" title="세 가지를 함께 검증하세요" tone="warning">
          <DocsCode>event.source</DocsCode>는 내가 연 팝업,{" "}
          <DocsCode>event.origin</DocsCode>은 미리 정한 에디터 origin이어야 합니다.
          SUBMIT/CANCEL은 발급한 <DocsCode>sessionId</DocsCode>까지 일치해야 합니다.
          INIT에 <DocsCode>targetOrigin="*"</DocsCode>를 사용하지 않습니다.
        </Callout>
      </DocsSection>
      <DocsSection id="scene" title="입력과 출력은 같은 v2 형식">
        <DocsCodeBlock code={sceneInputExample} language="json" title="scene.json" />
        <DocsList className="mt-4">
          <DocsListItem>
            필수는 <DocsCode>version: 2</DocsCode>, <DocsCode>features</DocsCode>, 각
            도형의 <DocsCode>geometry</DocsCode>입니다. 좌표는 WGS84의{" "}
            <DocsCode>[경도, 위도]</DocsCode> 순서입니다.
          </DocsListItem>
          <DocsListItem>
            Point·MultiPoint·LineString·MultiLineString·Polygon·MultiPolygon을
            지원합니다. GeometryCollection은 받지 않습니다.
          </DocsListItem>
          <DocsListItem>
            선택 필드: 도형의 id·name·locked·visible·themeToken·properties, scene의
            id·name·viewport. id를 보내면 중복되지 않아야 합니다.
          </DocsListItem>
          <DocsListItem>
            배열 뒤쪽이 지도 위쪽입니다. 반환값에 내부 layers·selection·history는 없고,
            숨긴 도형은 포함됩니다.
          </DocsListItem>
          <DocsListItem>
            <DocsCode>locked</DocsCode>는 사용자 UI에서 해제할 수 있는 잠금 상태입니다.
            변조 방지나 서버 접근 권한으로 사용하지 마세요.
          </DocsListItem>
        </DocsList>
        <DocsText className="mt-4">
          완료 시 부모가 scene 전체를 교체합니다. 중간 변경 메시지나 자동 저장은
          없습니다. <Link to="/editing#finish">저장 가능 조건</Link>도 확인하세요.
        </DocsText>
      </DocsSection>
      <DocsSection
        id="example"
        title="복사해서 연결하는 예제"
        description="TypeScript + Zod 예제입니다. 아래 네 파일을 같은 폴더에 두고, 기존 부모 화면의 버튼·지도·오류 UI를 연결하세요."
      >
        <DocsText className="mb-4">
          <DocsCode>npm install zod</DocsCode> 후 <DocsCode>bindMapEditor</DocsCode>에
          실제 <DocsCode>editorUrl</DocsCode>과 화면 콜백을 전달합니다. 반환된 정리
          함수를 부모 화면의 unmount 시 호출하세요.
        </DocsText>
        <details className="rounded-lg border border-line bg-white p-4" open>
          <summary className="cursor-pointer font-bold text-ink">
            1. 부모 화면에서 연결하기
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={resultUsageExample}
            language="typescript"
            title="parent-page.example.ts"
          />
        </details>
        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            2. 팝업·메시지 처리
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={parentHostExample}
            language="typescript"
            title="map-editor-host.example.ts"
          />
        </details>
        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            3. 결과 검증 스키마
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={messageSchemaExample}
            language="typescript"
            title="editor-contract.example.ts"
          />
          <DocsText className="mt-4">
            좌표 범위와 링 구조를 검사하는 연동 예제이며 모든 업무 규칙을 대신하지
            않습니다. 부모 서버에서도 면적·위치·식별자와 저장 권한을 검증하세요.
          </DocsText>
        </details>
        <details className="rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            4. 입력 데이터
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={inputSceneSource}
            language="typescript"
            title="input-scene.example.ts"
          />
        </details>
        <Callout className="mt-4" title="팝업 연결을 유지하세요" tone="note">
          <DocsCode>noopener</DocsCode>·<DocsCode>noreferrer</DocsCode>로 연 창이나
          opener를 끊는 호스트 보안 정책은 현재 연결 방식과 맞지 않습니다. iframe 연동이
          아닌 별도 창 방식입니다. Google 로그인은 에디터가 추가 팝업에서 처리하며
          부모는 토큰을 받지 않습니다.
        </Callout>
      </DocsSection>
      <DocsSection id="errors" title="오류 처리">
        <DocsTable
          label="부모 연동 문제 해결"
          headers={["증상", "확인할 것"]}
          rows={[
            {
              key: "popup",
              cells: [
                "창이 열리지 않음",
                "사용자 클릭에서 window.open을 호출하고 팝업 차단 여부를 확인합니다.",
              ],
            },
            {
              key: "ready",
              cells: [
                "READY를 받지 못함",
                "수신기를 먼저 등록했는지, opener가 유지되는지, 에디터 URL·허용 부모 origin이 맞는지 확인합니다.",
              ],
            },
            {
              key: "init",
              cells: [
                "MAP_EDITOR_ERROR",
                "빈 sessionId, 중복 id, 좌표 순서·범위와 v2 형식을 확인합니다. 오류 메시지는 화면에 안전하게 표시합니다.",
              ],
            },
            {
              key: "reset",
              cells: [
                "편집 내용이 초기화됨",
                "같은 창에 새 INIT을 계속 보내고 있지 않은지 확인합니다. INIT은 업데이트 이벤트가 아닙니다.",
              ],
            },
            {
              key: "save",
              cells: [
                "결과를 받았는데 저장되지 않음",
                "SUBMIT 검증 뒤 부모의 저장 API를 호출해야 합니다. 예제는 부모 지도 반영까지만 수행합니다.",
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
