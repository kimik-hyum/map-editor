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
import { DocsGyeongbokgungExample } from "./components/DocsGyeongbokgungExample";
import {
  inputSceneSource,
  messageSchemaExample,
  palaceStarterExample,
  parentHostExample,
  resultUsageExample,
} from "./content/parentIntegrationExamples";
import { initMessageExample, submitMessageExample } from "./content/roundtripExamples";

export function DocsIntegrationPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="연동 인터페이스"
        eyebrow="QUICK START · 경복궁 권역·경로·마커 예제"
        description="폴리곤·선·마커를 함께 새 창으로 보내고, 수정된 좌표를 돌려받아 봅시다. 이 페이지가 여러분의 서비스 역할을 합니다. 먼저 실행하고, 아래 코드를 자신의 화면에 연결하세요."
      />
      <DocsSection id="quickstart" title="먼저, 경복궁 권역을 편집해 보세요">
        <ol className="mb-4 grid list-none grid-cols-3 gap-3 p-0 max-[620px]:grid-cols-1">
          <li className="rounded-lg bg-teal-50 p-3 text-sm leading-6">
            <strong className="block text-brand-strong">01 · 새 창 열기</strong>경복궁을
            감싸는 사각형, 예제 경로, 시작 위치 마커를 보냅니다.
          </li>
          <li className="rounded-lg bg-teal-50 p-3 text-sm leading-6">
            <strong className="block text-brand-strong">02 · 도형 편집하기</strong>
            권역·경로의 정점을 옮기거나 마커의 위치를 바꿉니다.
          </li>
          <li className="rounded-lg bg-teal-50 p-3 text-sm leading-6">
            <strong className="block text-brand-strong">03 · 저장 결과 받기</strong>
            완료하면 이 페이지의 지도와 JSON이 바뀝니다.
          </li>
        </ol>
        <DocsGyeongbokgungExample />
        <DocsText className="mt-3">
          도구 위치가 궁금하면{" "}
          <Link to="/editing#screen">실제 화면으로 보는 도구 안내</Link>를 확인하세요.
          취소하면 이 페이지의 권역은 그대로입니다.
        </DocsText>
      </DocsSection>
      <DocsSection id="scene" title="1. 보낼 도형 만들기">
        <DocsText className="mb-4">
          같은 <DocsCode>features</DocsCode> 배열에 권역(Polygon), 경로(LineString),
          위치 마커(Point)를 넣습니다. 사각형은 남서 → 남동 → 북동 → 북서 → 첫 점 순서로
          닫고, 선은 좌표를 차례로 연결하며, 마커는 좌표 한 쌍만 사용합니다.{" "}
          <DocsCode>id</DocsCode>로 반환된 도형을 식별하고,{" "}
          <DocsCode>properties</DocsCode>에 자신의 업무 ID를 보관합니다.
        </DocsText>
        <DocsCodeBlock
          code={inputSceneSource}
          language="typescript"
          title="input-scene.example.ts"
        />
        <DocsText className="mt-3">
          좌표는 WGS84 <DocsCode>[경도, 위도]</DocsCode>입니다. 지도 객체나 경계 코드
          대신 좌표를 보내세요. 처음부터 그리려면{" "}
          <DocsCode>{"{ version: 2, features: [] }"}</DocsCode>로 시작할 수 있습니다.
        </DocsText>
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            입력 필드와 지원 도형
          </summary>
          <DocsTable
            className="mt-3"
            label="scene v2 필드"
            headers={["필드", "역할"]}
            rows={[
              {
                key: "required",
                cells: [
                  "version: 2 · features · geometry",
                  "필수. Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon 지원",
                ],
              },
              {
                key: "identity",
                cells: [
                  "id · name · properties",
                  "선택. 도형 식별자·목록 이름·업무 속성. 제공한 id는 중복 불가",
                ],
              },
              {
                key: "state",
                cells: [
                  "locked · visible · themeToken",
                  "선택. 편집 잠금·표시·스타일. 잠금은 UI에서 해제 가능",
                ],
              },
              {
                key: "scene",
                cells: [
                  "scene.id · name · viewport",
                  "선택. 현재 viewport는 입출력에 보존되며 편집 창의 지도 위치에는 적용되지 않음",
                ],
              },
            ]}
          />
          <DocsText className="mt-3">
            배열 뒤쪽 도형이 위에 그려집니다. 다른 좌표계를 쓰는 서비스는 입력과 결과
            반영 시 좌표 변환이 필요합니다. GeometryCollection은 받지 않습니다.
          </DocsText>
        </details>
      </DocsSection>
      <DocsSection id="example" title="2. 버튼에서 새 창 열기">
        <DocsText className="mb-4">
          아래 예제의 <DocsCode>createMapEditorHost</DocsCode>가 READY/INIT과 결과
          검증을 처리합니다. 별도 배포된 SDK가 아닌, 자신의 서비스에 복사해서 쓰는
          TypeScript 예제입니다. <DocsCode>npm install zod</DocsCode> 후 입력 파일과
          아래 보조 파일을 같은 폴더에 두세요.
        </DocsText>
        <DocsCodeBlock
          code={palaceStarterExample}
          language="typescript"
          title="gyeongbokgung.example.ts"
        />
        <DocsText className="mt-3">
          HTML에 버튼과 결과를 표시할 요소를 만들고{" "}
          <DocsCode>mountPalaceExample(button, result, editorUrl)</DocsCode>을 한 번
          호출하세요. 버튼 클릭이 <DocsCode>open()</DocsCode>을 실행하고, 결과는{" "}
          <DocsCode>onSubmit(editedScene)</DocsCode>으로 받습니다.{" "}
          <DocsCode>scene = editedScene</DocsCode>으로 교체하면 다음 창도 수정된 권역을
          엽니다. 프레임워크에서는 화면 해제 시 반환된 정리 함수를 호출하세요.
        </DocsText>
        <details className="mt-4 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            보조 파일 · 팝업과 메시지 처리
          </summary>
          <DocsCodeBlock
            className="mt-3"
            code={parentHostExample}
            language="typescript"
            title="map-editor-host.example.ts"
          />
        </details>
        <details className="mt-3 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            보조 파일 · 결과 검증과 타입
          </summary>
          <DocsCodeBlock
            className="mt-3"
            code={messageSchemaExample}
            language="typescript"
            title="editor-contract.example.ts"
          />
        </details>
        <details className="mt-3 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            이미 쓰는 지도와 연결하기 · bindMapEditor
          </summary>
          <DocsTable
            className="mt-3"
            label="bindMapEditor 연결 인터페이스"
            headers={["콜백", "서비스에서 연결할 것"]}
            rows={[
              {
                key: "read",
                cells: ["getScene()", "현재 지도에서 편집할 좌표와 속성 읽기"],
              },
              {
                key: "write",
                cells: [
                  "applyScene(scene)",
                  "반환된 결과 전체로 다음 편집의 기준 데이터 갱신",
                ],
              },
              {
                key: "map",
                cells: [
                  "renderOnMap(featureCollection)",
                  "반환 좌표를 사용하는 지도 라이브러리로 변환해 표시",
                ],
              },
              {
                key: "error",
                cells: ["showEditorError(message)", "오류를 화면에 표시"],
              },
            ]}
          />
          <DocsCodeBlock
            className="mt-3"
            code={resultUsageExample}
            language="typescript"
            title="service-page.example.ts"
          />
        </details>
      </DocsSection>
      <DocsSection id="roundtrip" title="3. 저장하면 받는 데이터">
        <DocsText className="mb-4">
          예를 들어 북동쪽 정점을 아래처럼 옮기면 같은 도형 ID·업무 속성과 변경된 좌표를
          받습니다. 이 비교에서는 경로와 마커를 수정하지 않아 기존 좌표로 함께
          돌아옵니다. 아래 비교는 설명용 예시이고, 맨 위 실습의 JSON에는 직접 편집한
          결과가 표시됩니다.
        </DocsText>
        <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <span className="text-xs font-bold text-ink-soft">보낸 북동쪽 정점</span>
            <p className="mb-0 mt-2 font-mono text-sm text-ink">[126.982, 37.5855]</p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <span className="text-xs font-bold text-brand-strong">
              옮긴 뒤 돌려받는 정점
            </span>
            <p className="mb-0 mt-2 font-mono text-sm text-brand-strong">
              [126.984, 37.5865]
            </p>
          </div>
        </div>
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            INIT 전체 메시지
          </summary>
          <DocsCodeBlock
            className="mt-3"
            code={initMessageExample}
            language="json"
            title="보내는 메시지.json"
          />
        </details>
        <details className="mt-3 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            SUBMIT 전체 메시지
          </summary>
          <DocsCodeBlock
            className="mt-3"
            code={submitMessageExample}
            language="json"
            title="완료 후 받는 메시지.json"
          />
        </details>
        <DocsTable
          className="mt-4"
          label="저장 결과 처리"
          headers={["한 일", "받는 결과"]}
          rows={[
            {
              key: "save",
              cells: [
                "저장",
                "같은 sessionId + 최종 scene 전체. 변경분만 덧붙이지 않고 기준 데이터를 교체",
              ],
            },
            {
              key: "state",
              cells: [
                "삭제·숨김",
                "삭제된 도형은 제외. 숨긴 도형은 visible: false로 포함",
              ],
            },
            {
              key: "boundary",
              cells: [
                "그리기·경계 채택",
                "새 ID의 도형 포함. 참고로 보기만 한 행정경계 목록은 제외",
              ],
            },
            {
              key: "cancel",
              cells: [
                "취소",
                "MAP_EDITOR_CANCEL + sessionId. scene 없음. 기존 데이터 유지",
              ],
            },
          ]}
        />
        <DocsText className="mt-3">
          완료 버튼은 결과를 돌려줍니다. 영구 저장은 <DocsCode>onSubmit</DocsCode>에서
          자신의 API로 처리하세요. 중간 변경·자동 저장·내부 레이어·인증 토큰은 전송하지
          않습니다. <Link to="/editing#finish">저장 가능 조건</Link>
        </DocsText>
      </DocsSection>
      <DocsSection id="messages" title="메시지 흐름">
        <div
          className="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-sm leading-8 text-slate-100"
          aria-label="편집 창이 READY를 보내면 서비스가 INIT으로 응답하고, 편집 완료 시 SUBMIT 또는 CANCEL을 받습니다"
          role="img"
        >
          <div>내 페이지 ← READY ← 편집 창</div>
          <div>내 페이지 → INIT(scene, sessionId) → 편집 창</div>
          <div>내 페이지 ← SUBMIT(scene) / CANCEL ← 편집 창</div>
        </div>
        <DocsText className="mt-3">
          예제 helper가 이 순서를 처리합니다. 직접 구현할 때는 메시지 수신기를 먼저
          등록하고 창을 엽니다. <DocsCode>sessionId</DocsCode>는 매 편집 회차의
          식별자이며 로그인 토큰이 아닙니다.
        </DocsText>
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            직접 구현할 때 유지할 조건
          </summary>
          <DocsList className="mt-3">
            <DocsListItem>
              source는 내가 연 창, origin은 미리 정한 editorUrl의 origin인지 확인합니다.
              SUBMIT/CANCEL은 sessionId와 데이터 구조까지 검증합니다.
            </DocsListItem>
            <DocsListItem>
              INIT은 정확한 targetOrigin으로 전송하며 *를 사용하지 않습니다. 같은 팝업의
              READY 재전송에는 같은 입력 스냅샷·sessionId로 응답합니다.
            </DocsListItem>
            <DocsListItem>
              새 INIT은 현재 편집과 히스토리를 초기화합니다. 상태 업데이트처럼 반복해서
              보내지 마세요.
            </DocsListItem>
            <DocsListItem>
              MAP_EDITOR_ERROR는 message와 선택적 issues를 가집니다. 오류 내용을 안전한
              텍스트로 표시하세요.
            </DocsListItem>
          </DocsList>
        </details>
      </DocsSection>
      <DocsSection id="addresses" title="연결 가능한 주소와 조건">
        <DocsText>
          서비스의 <DocsCode>editorUrl</DocsCode>은{" "}
          <DocsCode>https://maps-editor.pages.dev/editor/</DocsCode> 또는 자신이 배포한
          주소로 지정합니다. 이 페이지의 실습은 현재 사이트의{" "}
          <DocsCode>/editor/</DocsCode>를 엽니다.
        </DocsText>
        <DocsList className="mt-3">
          <DocsListItem>
            <strong>HTTPS 사이트는 도메인이 달라도 연동할 수 있습니다.</strong> 예를
            들어 <DocsCode>https://naver.com</DocsCode>에서 우리 에디터를 새 창으로 열고
            데이터를 주고받을 수 있습니다. 기본 설정에서는 별도 도메인 등록이 필요하지
            않습니다.
          </DocsListItem>
          <DocsListItem>
            <strong>HTTP·로컬 개발 주소에는 추가 조건이 있습니다.</strong>{" "}
            <DocsCode>http://localhost:3000</DocsCode>에서 상용 에디터에 연결하려면
            운영자가 그 주소를 별도로 허용해야 합니다. 에디터도 같은
            프로토콜·호스트·포트에서 실행한다면 기본 설정으로 연동할 수 있습니다.
          </DocsListItem>
          <DocsListItem>
            운영자가 특정 사이트만 허용하도록 설정한 에디터는 HTTPS라도 해당 허용 목록에
            있는 사이트에서만 연동할 수 있습니다.
          </DocsListItem>
          <DocsListItem>
            사용자 클릭으로 새 창을 열고 결과를 받을 때까지 원래 페이지를 유지합니다.{" "}
            <DocsCode>noopener</DocsCode>·<DocsCode>noreferrer</DocsCode>로 opener를
            끊지 않습니다.
          </DocsListItem>
          <DocsListItem>
            iframe·file://·null origin은 현재 지원하지 않습니다. 공개 에디터의 경계
            로그인은 에디터가 안내하며 서비스에서 토큰을 전달하지 않습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="standalone" title="주소만 열어 바로 그릴 수는 없나요?">
        <Callout tone="note" title="현재는 연동 모드 · 단독 실행은 검토 중">
          지금 /editor/를 직접 열면 INIT을 기다립니다. 이는 현재의 시작·저장 흐름이 새
          창 연동을 전제로 하기 때문이며, 지도 편집 자체에 호스트가 반드시 필요한 것은
          아닙니다. 이번 문서 변경에서는 이 동작을 유지합니다.
        </Callout>
        <DocsText className="mt-3">
          단독 실행을 지원하려면 ‘새 지도’나 JSON 가져오기로 시작하고, ‘저장’은 결과
          반환 대신 JSON 내보내기 또는 별도 저장 기능으로 연결해야 합니다. 연동 모드와
          단독 모드를 명시적으로 구분하고, 늦게 도착한 INIT이 이미 그린 도형을 덮어쓰지
          않도록 하는 방향이 적절합니다.
        </DocsText>
      </DocsSection>
      <DocsSection id="errors" title="막히면 확인하기">
        <DocsTable
          label="서비스 페이지 연동 문제 해결"
          headers={["증상", "해결 순서"]}
          rows={[
            {
              key: "popup",
              cells: ["새 창이 안 열림", "클릭 이벤트에서 open 호출 → 팝업 차단 확인"],
            },
            {
              key: "ready",
              cells: [
                "데이터를 기다리는 중",
                "이 페이지의 실습 버튼으로 열기 → opener·허용 origin·READY/INIT 확인",
              ],
            },
            {
              key: "geometry",
              cells: [
                "도형을 찾을 수 없음",
                "목록에 이름이 있는지 확인 → 지도 이동·확대. 현재 기본 중심 [126.98, 37.57], 줌 12에서 시작하며 입력 범위로 자동 맞춤하지 않음",
              ],
            },
            {
              key: "init",
              cells: ["입력 오류", "v2 형식·sessionId·ID 중복·경도/위도 순서 확인"],
            },
            {
              key: "persist",
              cells: [
                "결과는 왔지만 DB에 없음",
                "onSubmit에 서비스 저장 API 연결. 실패 시 표시와 재시도는 서비스에서 처리",
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
